const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const Grade = require('../models/Grade');
const EvaluationPlan = require('../models/EvaluationPlan');
const Comment = require('../models/Comment');
const { supabase } = require('../config/database');
const logger = require('../utils/logger');

const router = express.Router();

// GET /api/reports/student-performance/:userId - Informe de rendimiento estudiantil
router.get('/student-performance/:userId', authenticate, async (req, res) => {
  try {
    const { userId } = req.params;
    const { semester, academicYear } = req.query;

    // Verificar permisos
    if (userId !== req.user.id && !['coordinator', 'admin'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'No tienes permisos para ver este informe'
      });
    }

    // Construir filtros
    const gradeQuery = { userId };
    if (semester) gradeQuery.semester = semester;
    if (academicYear) gradeQuery.academicYear = academicYear;

    // Obtener calificaciones del estudiante
    const grades = await Grade.find(gradeQuery)
      .populate('evaluationPlanId', 'activities professorId metadata')
      .sort({ semester: -1, subjectCode: 1 });

    // Calcular estadísticas generales
    const completedSubjects = grades.filter(g => g.isComplete);
    const pendingSubjects = grades.filter(g => !g.isComplete);
    
    const stats = {
      totalSubjects: grades.length,
      completedSubjects: completedSubjects.length,
      pendingSubjects: pendingSubjects.length,
      averageGrade: 0,
      highestGrade: 0,
      lowestGrade: 5,
      passedSubjects: 0,
      failedSubjects: 0,
      projectedAverage: 0
    };

    if (completedSubjects.length > 0) {
      const finalGrades = completedSubjects.map(g => g.finalGrade);
      stats.averageGrade = parseFloat((finalGrades.reduce((sum, g) => sum + g, 0) / finalGrades.length).toFixed(2));
      stats.highestGrade = Math.max(...finalGrades);
      stats.lowestGrade = Math.min(...finalGrades);
      stats.passedSubjects = finalGrades.filter(g => g >= 3.0).length;
      stats.failedSubjects = finalGrades.filter(g => g < 3.0).length;
    }

    // Calcular promedio proyectado incluyendo materias pendientes
    if (grades.length > 0) {
      const allProjectedGrades = grades.map(g => g.projectedGrade || g.targetGrade || 3.0);
      stats.projectedAverage = parseFloat((allProjectedGrades.reduce((sum, g) => sum + g, 0) / allProjectedGrades.length).toFixed(2));
    }

    // Análisis por semestre
    const semesterAnalysis = {};
    grades.forEach(grade => {
      if (!semesterAnalysis[grade.semester]) {
        semesterAnalysis[grade.semester] = {
          totalSubjects: 0,
          completedSubjects: 0,
          averageGrade: 0,
          passedSubjects: 0,
          grades: []
        };
      }
      
      const semData = semesterAnalysis[grade.semester];
      semData.totalSubjects++;
      
      if (grade.isComplete) {
        semData.completedSubjects++;
        semData.grades.push(grade.finalGrade);
        if (grade.finalGrade >= 3.0) semData.passedSubjects++;
      }
    });

    // Calcular promedios por semestre
    Object.keys(semesterAnalysis).forEach(semester => {
      const semData = semesterAnalysis[semester];
      if (semData.grades.length > 0) {
        semData.averageGrade = parseFloat((semData.grades.reduce((sum, g) => sum + g, 0) / semData.grades.length).toFixed(2));
      }
    });

    // Materias con mayor dificultad (promedio proyectado < 3.0)
    const strugglingSubjects = grades.filter(g => 
      !g.isComplete && (g.projectedGrade < 3.0 || g.currentWeightedGrade < 3.0)
    );

    // Recomendaciones
    const recommendations = [];
    
    if (strugglingSubjects.length > 0) {
      recommendations.push({
        type: 'warning',
        title: 'Materias en riesgo',
        message: `Tienes ${strugglingSubjects.length} materia(s) con riesgo de pérdida. Revisa tus calificaciones objetivo.`,
        subjects: strugglingSubjects.map(g => g.subjectCode)
      });
    }

    if (stats.averageGrade > 0 && stats.averageGrade < 3.5) {
      recommendations.push({
        type: 'info',
        title: 'Mejora tu rendimiento',
        message: 'Tu promedio actual está por debajo de 3.5. Considera dedicar más tiempo de estudio.',
        action: 'Aumentar calificaciones objetivo'
      });
    }

    if (stats.averageGrade >= 4.0) {
      recommendations.push({
        type: 'success',
        title: 'Excelente rendimiento',
        message: '¡Felicitaciones! Mantienes un promedio excelente.',
        action: 'Continúa con el buen trabajo'
      });
    }

    const report = {
      studentInfo: {
        userId,
        semester: semester || 'Todos',
        academicYear: academicYear || 'Todos'
      },
      generalStats: stats,
      semesterAnalysis,
      strugglingSubjects: strugglingSubjects.map(g => ({
        subjectCode: g.subjectCode,
        currentGrade: g.currentWeightedGrade,
        projectedGrade: g.projectedGrade,
        requiredGrade: g.requiredGradeForTarget,
        completedPercentage: g.completedPercentage
      })),
      recommendations,
      detailedGrades: grades.map(g => ({
        subjectCode: g.subjectCode,
        semester: g.semester,
        currentGrade: g.currentWeightedGrade,
        finalGrade: g.finalGrade,
        targetGrade: g.targetGrade,
        projectedGrade: g.projectedGrade,
        completedPercentage: g.completedPercentage,
        isComplete: g.isComplete
      }))
    };

    res.status(200).json({
      success: true,
      data: report
    });
  } catch (error) {
    logger.error('Error generando informe de rendimiento:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

// GET /api/reports/subject-analytics/:subjectCode - Analíticas de materia
router.get('/subject-analytics/:subjectCode', authenticate, authorize('professor', 'coordinator', 'admin'), async (req, res) => {
  try {
    const { subjectCode } = req.params;
    const { semester } = req.query;

    // Obtener estadísticas de calificaciones
    const gradeStats = await Grade.getSubjectStatistics(subjectCode, semester);
    
    // Obtener planes de evaluación de la materia
    const plans = await EvaluationPlan.find({
      subjectCode: subjectCode.toUpperCase(),
      ...(semester && { semester }),
      isActive: true
    }).sort({ semester: -1 });

    // Obtener distribución de calificaciones
    const grades = await Grade.find({
      subjectCode: subjectCode.toUpperCase(),
      ...(semester && { semester }),
      isComplete: true
    });

    // Calcular distribución por rangos
    const gradeDistribution = {
      excellent: 0, // 4.5 - 5.0
      good: 0,      // 3.5 - 4.4
      acceptable: 0, // 3.0 - 3.4
      failed: 0     // < 3.0
    };

    grades.forEach(grade => {
      const finalGrade = grade.finalGrade;
      if (finalGrade >= 4.5) gradeDistribution.excellent++;
      else if (finalGrade >= 3.5) gradeDistribution.good++;
      else if (finalGrade >= 3.0) gradeDistribution.acceptable++;
      else gradeDistribution.failed++;
    });

    // Análisis de actividades más difíciles
    const activityAnalysis = {};
    grades.forEach(grade => {
      grade.activityGrades.forEach(activityGrade => {
        const activityName = activityGrade.activityName;
        if (!activityAnalysis[activityName]) {
          activityAnalysis[activityName] = {
            totalGrades: 0,
            averageGrade: 0,
            grades: []
          };
        }
        activityAnalysis[activityName].grades.push(activityGrade.grade);
      });
    });

    // Calcular promedios de actividades
    Object.keys(activityAnalysis).forEach(activityName => {
      const activity = activityAnalysis[activityName];
      activity.totalGrades = activity.grades.length;
      if (activity.grades.length > 0) {
        activity.averageGrade = parseFloat((activity.grades.reduce((sum, g) => sum + g, 0) / activity.grades.length).toFixed(2));
      }
    });

    // Ordenar actividades por dificultad (menor promedio = más difícil)
    const activitiesByDifficulty = Object.entries(activityAnalysis)
      .sort(([,a], [,b]) => a.averageGrade - b.averageGrade)
      .map(([name, data]) => ({
        name,
        averageGrade: data.averageGrade,
        totalGrades: data.totalGrades
      }));

    // Tendencias por semestre
    const semesterTrends = await Grade.aggregate([
      {
        $match: {
          subjectCode: subjectCode.toUpperCase(),
          isComplete: true
        }
      },
      {
        $group: {
          _id: '$semester',
          averageGrade: { $avg: '$finalGrade' },
          totalStudents: { $sum: 1 },
          passedStudents: {
            $sum: { $cond: [{ $gte: ['$finalGrade', 3.0] }, 1, 0] }
          }
        }
      },
      {
        $addFields: {
          passRate: {
            $multiply: [
              { $divide: ['$passedStudents', '$totalStudents'] },
              100
            ]
          }
        }
      },
      { $sort: { _id: -1 } }
    ]);

    const analytics = {
      subjectInfo: {
        code: subjectCode.toUpperCase(),
        semester: semester || 'Todos los semestres',
        totalPlans: plans.length,
        approvedPlans: plans.filter(p => p.isApproved).length
      },
      overallStats: gradeStats[0] || {
        averageGrade: 0,
        maxGrade: 0,
        minGrade: 0,
        totalStudents: 0,
        passedStudents: 0,
        passRate: 0
      },
      gradeDistribution,
      activitiesByDifficulty: activitiesByDifficulty.slice(0, 10), // Top 10 más difíciles
      semesterTrends,
      evaluationPlans: plans.map(plan => ({
        id: plan._id,
        semester: plan.semester,
        groupNumber: plan.groupNumber,
        professorId: plan.professorId,
        isApproved: plan.isApproved,
        totalActivities: plan.activities.length,
        createdAt: plan.createdAt
      }))
    };

    res.status(200).json({
      success: true,
      data: analytics
    });
  } catch (error) {
    logger.error('Error generando analíticas de materia:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

// GET /api/reports/faculty-dashboard/:facultyCode - Dashboard de facultad
router.get('/faculty-dashboard/:facultyCode', authenticate, authorize('coordinator', 'admin'), async (req, res) => {
  try {
    const { facultyCode } = req.params;
    const { semester } = req.query;

    // Verificar acceso a facultad
    if (req.user.role === 'coordinator' && req.user.facultyCode.toString() !== facultyCode) {
      return res.status(403).json({
        success: false,
        error: 'No tienes acceso a los datos de esta facultad'
      });
    }

    // Obtener profesores de la facultad
    const { data: professors, error: profError } = await supabase
      .from('employees')
      .select('id, first_name, last_name')
      .eq('faculty_code', facultyCode)
      .eq('employee_type', 'Profesor');

    if (profError) {
      throw new Error('Error obteniendo profesores de la facultad');
    }

    const professorIds = professors.map(p => p.id);

    // Obtener planes de evaluación de la facultad
    const planQuery = {
      professorId: { $in: professorIds },
      isActive: true
    };
    
    if (semester) {
      planQuery.semester = semester;
    }

    const plans = await EvaluationPlan.find(planQuery);

    // Estadísticas de planes
    const planStats = {
      total: plans.length,
      approved: plans.filter(p => p.isApproved).length,
      pending: plans.filter(p => !p.isApproved).length,
      byProfessor: {}
    };

    // Agrupar planes por profesor
    plans.forEach(plan => {
      if (!planStats.byProfessor[plan.professorId]) {
        planStats.byProfessor[plan.professorId] = {
          total: 0,
          approved: 0,
          pending: 0
        };
      }
      
      planStats.byProfessor[plan.professorId].total++;
      if (plan.isApproved) {
        planStats.byProfessor[plan.professorId].approved++;
      } else {
        planStats.byProfessor[plan.professorId].pending++;
      }
    });

    // Obtener comentarios de la facultad
    const planIds = plans.map(p => p._id);
    const comments = await Comment.find({
      evaluationPlanId: { $in: planIds },
      status: 'active'
    });

    const commentStats = {
      total: comments.length,
      byType: {},
      recent: comments.filter(c => c.isRecent).length
    };

    comments.forEach(comment => {
      commentStats.byType[comment.type] = (commentStats.byType[comment.type] || 0) + 1;
    });

    // Obtener materias de la facultad
    const { data: subjects, error: subjectError } = await supabase
      .from('subjects')
      .select(`
        code, 
        name,
        programs!inner (
          areas!inner (
            faculty_code
          )
        )
      `)
      .eq('programs.areas.faculty_code', facultyCode);

    if (subjectError) {
      throw new Error('Error obteniendo materias de la facultad');
    }

    // Resumen de profesores
    const professorSummary = professors.map(prof => {
      const profStats = planStats.byProfessor[prof.id] || { total: 0, approved: 0, pending: 0 };
      return {
        id: prof.id,
        name: `${prof.first_name} ${prof.last_name}`,
        plansTotal: profStats.total,
        plansApproved: profStats.approved,
        plansPending: profStats.pending
      };
    }).sort((a, b) => b.plansTotal - a.plansTotal);

    // Actividad reciente
    const recentPlans = plans
      .filter(p => new Date() - new Date(p.createdAt) < 7 * 24 * 60 * 60 * 1000) // Últimos 7 días
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const dashboard = {
      facultyInfo: {
        code: facultyCode,
        semester: semester || 'Todos los semestres',
        totalProfessors: professors.length,
        totalSubjects: subjects.length
      },
      planStatistics: planStats,
      commentStatistics: commentStats,
      professorSummary,
      recentActivity: {
        newPlans: recentPlans.length,
        newComments: comments.filter(c => c.isRecent).length
      },
      topSubjects: subjects.slice(0, 10).map(s => ({
        code: s.code,
        name: s.name
      }))
    };

    res.status(200).json({
      success: true,
      data: dashboard
    });
  } catch (error) {
    logger.error('Error generando dashboard de facultad:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

// GET /api/reports/grade-projections - Proyecciones de calificaciones
router.get('/grade-projections', authenticate, async (req, res) => {
  try {
    const { semester, subjectCode } = req.query;
    
    const query = { userId: req.user.id };
    if (semester) query.semester = semester;
    if (subjectCode) query.subjectCode = subjectCode.toUpperCase();

    const grades = await Grade.find(query)
      .populate('evaluationPlanId', 'subjectCode activities')
      .sort({ semester: -1, subjectCode: 1 });

    const projections = grades.map(grade => {
      const remainingActivities = [];
      
      if (grade.evaluationPlanId && grade.evaluationPlanId.activities) {
        grade.evaluationPlanId.activities.forEach(activity => {
          const hasGrade = grade.activityGrades.some(ag => 
            ag.activityId.toString() === activity._id.toString()
          );
          
          if (!hasGrade) {
            remainingActivities.push({
              id: activity._id,
              name: activity.name,
              percentage: activity.percentage,
              description: activity.description
            });
          }
        });
      }

      // Calcular diferentes escenarios
      const scenarios = [];
      
      if (grade.remainingPercentage > 0) {
        // Escenario con calificación objetivo
        const targetScenario = (grade.currentWeightedGrade * (grade.completedPercentage / 100)) + 
                              (grade.targetGrade * (grade.remainingPercentage / 100));
        
        scenarios.push({
          name: `Escenario objetivo (${grade.targetGrade})`,
          finalGrade: Math.max(0, Math.min(5, parseFloat(targetScenario.toFixed(2)))),
          requiredGrade: grade.requiredGradeForTarget,
          achievable: grade.requiredGradeForTarget <= 5.0
        });

        // Escenario conservador (3.0 en restantes)
        const conservativeScenario = (grade.currentWeightedGrade * (grade.completedPercentage / 100)) + 
                                   (3.0 * (grade.remainingPercentage / 100));
        
        scenarios.push({
          name: 'Escenario conservador (3.0)',
          finalGrade: Math.max(0, Math.min(5, parseFloat(conservativeScenario.toFixed(2)))),
          requiredGrade: 3.0,
          achievable: true
        });

        // Escenario optimista (5.0 en restantes)
        const optimisticScenario = (grade.currentWeightedGrade * (grade.completedPercentage / 100)) + 
                                 (5.0 * (grade.remainingPercentage / 100));
        
        scenarios.push({
          name: 'Escenario optimista (5.0)',
          finalGrade: Math.max(0, Math.min(5, parseFloat(optimisticScenario.toFixed(2)))),
          requiredGrade: 5.0,
          achievable: true
        });
      }

      return {
        subjectCode: grade.subjectCode,
        semester: grade.semester,
        currentStatus: {
          currentGrade: grade.currentWeightedGrade,
          completedPercentage: grade.completedPercentage,
          remainingPercentage: grade.remainingPercentage,
          targetGrade: grade.targetGrade,
          isComplete: grade.isComplete,
          finalGrade: grade.finalGrade
        },
        remainingActivities,
        scenarios,
        recommendations: generateRecommendations(grade, scenarios)
      };
    });

    res.status(200).json({
      success: true,
      data: projections
    });
  } catch (error) {
    logger.error('Error generando proyecciones:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

// Función auxiliar para generar recomendaciones
function generateRecommendations(grade, scenarios) {
  const recommendations = [];

  if (grade.isComplete) {
    if (grade.finalGrade >= 4.0) {
      recommendations.push({
        type: 'success',
        message: '¡Excelente trabajo! Has completado la materia con una calificación destacada.'
      });
    } else if (grade.finalGrade >= 3.0) {
      recommendations.push({
        type: 'info',
        message: 'Has aprobado la materia. ¡Felicitaciones!'
      });
    } else {
      recommendations.push({
        type: 'warning',
        message: 'No has alcanzado la nota mínima para aprobar. Revisa las opciones de recuperación.'
      });
    }
    return recommendations;
  }

  if (grade.remainingPercentage > 0) {
    const targetScenario = scenarios.find(s => s.name.includes('objetivo'));
    
    if (targetScenario && !targetScenario.achievable) {
      recommendations.push({
        type: 'warning',
        message: `Tu calificación objetivo (${grade.targetGrade}) no es alcanzable. Considera ajustarla.`,
        action: 'Reducir calificación objetivo'
      });
    }

    if (grade.currentWeightedGrade < 3.0 && grade.completedPercentage > 50) {
      recommendations.push({
        type: 'danger',
        message: 'Tu promedio actual está por debajo de 3.0 y has completado más del 50%. Enfócate en las actividades restantes.',
        action: 'Priorizar estudio'
      });
    }

    if (grade.completedPercentage < 30) {
      recommendations.push({
        type: 'info',
        message: 'Aún estás en las primeras actividades. Es un buen momento para establecer buenos hábitos de estudio.',
        action: 'Mantener consistencia'
      });
    }

    const conservativeScenario = scenarios.find(s => s.name.includes('conservador'));
    if (conservativeScenario && conservativeScenario.finalGrade >= 3.5) {
      recommendations.push({
        type: 'success',
        message: 'Vas por buen camino. Incluso con calificaciones conservadoras puedes obtener un buen resultado.',
        action: 'Mantener el ritmo'
      });
    }
  }

  return recommendations;
}

module.exports = router; 