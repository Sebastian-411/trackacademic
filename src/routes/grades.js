const express = require('express');
const { authenticate, checkOwnership } = require('../middleware/auth');
const Grade = require('../models/Grade');
const EvaluationPlan = require('../models/EvaluationPlan');
const { supabase } = require('../config/database');
const logger = require('../utils/logger');

const router = express.Router();

// GET /api/grades - Obtener calificaciones del usuario
router.get('/', authenticate, async (req, res) => {
  try {
    const {
      semester,
      subjectCode,
      completed,
      page = 1,
      limit = 20
    } = req.query;

    const query = { userId: req.user.id };
    
    if (semester) query.semester = semester;
    if (subjectCode) query.subjectCode = subjectCode.toUpperCase();
    if (completed !== undefined) query.isComplete = completed === 'true';

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const grades = await Grade.find(query)
      .populate('evaluationPlanId', 'activities professorId metadata')
      .sort({ semester: -1, subjectCode: 1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const total = await Grade.countDocuments(query);

    // Enriquecer con información de materia y profesor
    const enrichedGrades = await Promise.all(
      grades.map(async (grade) => {
        const [subjectInfo, professorInfo] = await Promise.all([
          supabase
            .from('subjects')
            .select('name')
            .eq('code', grade.subjectCode)
            .single(),
          supabase
            .from('employees')
            .select('first_name, last_name')
            .eq('id', grade.evaluationPlanId?.professorId)
            .single()
        ]);

        return {
          ...grade,
          subjectName: subjectInfo.data?.name || grade.subjectCode,
          professorName: professorInfo.data 
            ? `${professorInfo.data.first_name} ${professorInfo.data.last_name}`
            : 'Profesor no encontrado'
        };
      })
    );

    res.status(200).json({
      success: true,
      data: enrichedGrades,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    logger.error('Error obteniendo calificaciones:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

// GET /api/grades/semester/:semester - Obtener resumen de calificaciones por semestre
router.get('/semester/:semester', authenticate, async (req, res) => {
  try {
    const { semester } = req.params;
    
    const grades = await Grade.findByUserAndSemester(req.user.id, semester);
    
    // Calcular estadísticas del semestre
    const stats = {
      totalSubjects: grades.length,
      completedSubjects: grades.filter(g => g.isComplete).length,
      pendingSubjects: grades.filter(g => !g.isComplete).length,
      averageGrade: 0,
      totalCredits: 0, // Esto requeriría información adicional de las materias
      passingSubjects: grades.filter(g => g.finalGrade >= 3.0).length,
      failingSubjects: grades.filter(g => g.finalGrade < 3.0 && g.isComplete).length
    };

    const completedGrades = grades.filter(g => g.isComplete && g.finalGrade);
    if (completedGrades.length > 0) {
      stats.averageGrade = parseFloat(
        (completedGrades.reduce((sum, g) => sum + g.finalGrade, 0) / completedGrades.length).toFixed(2)
      );
    }

    res.status(200).json({
      success: true,
      data: grades,
      statistics: stats
    });
  } catch (error) {
    logger.error('Error obteniendo calificaciones del semestre:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

// GET /api/grades/:id - Obtener calificación específica
router.get('/:id', authenticate, async (req, res) => {
  try {
    const grade = await Grade.findById(req.params.id)
      .populate('evaluationPlanId');
    
    if (!grade) {
      return res.status(404).json({
        success: false,
        error: 'Calificación no encontrada'
      });
    }

    // Verificar que el usuario sea el propietario
    if (grade.userId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'No tienes permisos para ver esta calificación'
      });
    }

    res.status(200).json({
      success: true,
      data: grade
    });
  } catch (error) {
    logger.error('Error obteniendo calificación:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

// POST /api/grades - Crear nueva entrada de calificaciones
router.post('/', authenticate, async (req, res) => {
  try {
    const {
      evaluationPlanId,
      targetGrade = 3.0
    } = req.body;

    if (!evaluationPlanId) {
      return res.status(400).json({
        success: false,
        error: 'ID del plan de evaluación es requerido'
      });
    }

    // Verificar que el plan de evaluación existe y está aprobado
    const plan = await EvaluationPlan.findById(evaluationPlanId);
    if (!plan) {
      return res.status(404).json({
        success: false,
        error: 'Plan de evaluación no encontrado'
      });
    }

    if (!plan.isApproved) {
      return res.status(400).json({
        success: false,
        error: 'El plan de evaluación debe estar aprobado'
      });
    }

    // Verificar que no existe ya una entrada para este usuario y plan
    const existingGrade = await Grade.findOne({
      userId: req.user.id,
      evaluationPlanId
    });

    if (existingGrade) {
      return res.status(400).json({
        success: false,
        error: 'Ya tienes una entrada de calificaciones para este plan'
      });
    }

    // Crear nueva entrada de calificaciones
    const gradeData = {
      userId: req.user.id,
      evaluationPlanId,
      semester: plan.semester,
      subjectCode: plan.subjectCode,
      groupNumber: plan.groupNumber,
      targetGrade: parseFloat(targetGrade),
      metadata: {
        studentName: req.user.firstName && req.user.lastName 
          ? `${req.user.firstName} ${req.user.lastName}` 
          : null,
        studentEmail: req.user.email,
        faculty: req.user.faculty?.name,
        program: plan.metadata?.program
      }
    };

    const grade = new Grade(gradeData);
    await grade.save();

    logger.info('Entrada de calificaciones creada:', {
      gradeId: grade._id,
      userId: req.user.id,
      evaluationPlanId,
      semester: plan.semester,
      subjectCode: plan.subjectCode
    });

    res.status(201).json({
      success: true,
      message: 'Entrada de calificaciones creada exitosamente',
      data: grade
    });
  } catch (error) {
    logger.error('Error creando entrada de calificaciones:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

// POST /api/grades/:id/activities - Agregar/actualizar calificación de actividad
router.post('/:id/activities', authenticate, async (req, res) => {
  try {
    const {
      activityId,
      activityName,
      grade: activityGrade,
      maxGrade = 5.0,
      percentage,
      notes
    } = req.body;

    if (!activityId || !activityName || activityGrade === undefined || !percentage) {
      return res.status(400).json({
        success: false,
        error: 'Todos los campos de la actividad son requeridos'
      });
    }

    if (activityGrade < 0 || activityGrade > maxGrade) {
      return res.status(400).json({
        success: false,
        error: `La calificación debe estar entre 0 y ${maxGrade}`
      });
    }

    const gradeRecord = await Grade.findById(req.params.id);
    
    if (!gradeRecord) {
      return res.status(404).json({
        success: false,
        error: 'Registro de calificaciones no encontrado'
      });
    }

    // Verificar que el usuario sea el propietario
    if (gradeRecord.userId !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'No tienes permisos para modificar este registro'
      });
    }

    // Verificar que la actividad pertenece al plan de evaluación
    const plan = await EvaluationPlan.findById(gradeRecord.evaluationPlanId);
    const activity = plan.activities.find(a => a._id.toString() === activityId);
    
    if (!activity) {
      return res.status(400).json({
        success: false,
        error: 'La actividad no pertenece a este plan de evaluación'
      });
    }

    await gradeRecord.addActivityGrade({
      activityId,
      activityName,
      grade: parseFloat(activityGrade),
      maxGrade: parseFloat(maxGrade),
      percentage: parseFloat(percentage),
      notes
    });

    logger.info('Calificación de actividad agregada:', {
      gradeId: gradeRecord._id,
      userId: req.user.id,
      activityId,
      grade: activityGrade
    });

    res.status(200).json({
      success: true,
      message: 'Calificación de actividad agregada exitosamente',
      data: gradeRecord
    });
  } catch (error) {
    logger.error('Error agregando calificación de actividad:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

// DELETE /api/grades/:id/activities/:activityId - Eliminar calificación de actividad
router.delete('/:id/activities/:activityId', authenticate, async (req, res) => {
  try {
    const { id, activityId } = req.params;
    
    const gradeRecord = await Grade.findById(id);
    
    if (!gradeRecord) {
      return res.status(404).json({
        success: false,
        error: 'Registro de calificaciones no encontrado'
      });
    }

    // Verificar que el usuario sea el propietario
    if (gradeRecord.userId !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'No tienes permisos para modificar este registro'
      });
    }

    await gradeRecord.removeActivityGrade(activityId);

    logger.info('Calificación de actividad eliminada:', {
      gradeId: gradeRecord._id,
      userId: req.user.id,
      activityId
    });

    res.status(200).json({
      success: true,
      message: 'Calificación de actividad eliminada exitosamente',
      data: gradeRecord
    });
  } catch (error) {
    logger.error('Error eliminando calificación de actividad:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

// PUT /api/grades/:id/target - Actualizar calificación objetivo
router.put('/:id/target', authenticate, async (req, res) => {
  try {
    const { targetGrade } = req.body;
    
    if (targetGrade === undefined || targetGrade < 0 || targetGrade > 5) {
      return res.status(400).json({
        success: false,
        error: 'La calificación objetivo debe estar entre 0 y 5'
      });
    }

    const gradeRecord = await Grade.findById(req.params.id);
    
    if (!gradeRecord) {
      return res.status(404).json({
        success: false,
        error: 'Registro de calificaciones no encontrado'
      });
    }

    // Verificar que el usuario sea el propietario
    if (gradeRecord.userId !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'No tienes permisos para modificar este registro'
      });
    }

    gradeRecord.targetGrade = parseFloat(targetGrade);
    await gradeRecord.save();

    logger.info('Calificación objetivo actualizada:', {
      gradeId: gradeRecord._id,
      userId: req.user.id,
      targetGrade
    });

    res.status(200).json({
      success: true,
      message: 'Calificación objetivo actualizada exitosamente',
      data: gradeRecord
    });
  } catch (error) {
    logger.error('Error actualizando calificación objetivo:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

// DELETE /api/grades/:id - Eliminar registro de calificaciones
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const gradeRecord = await Grade.findById(req.params.id);
    
    if (!gradeRecord) {
      return res.status(404).json({
        success: false,
        error: 'Registro de calificaciones no encontrado'
      });
    }

    // Verificar que el usuario sea el propietario
    if (gradeRecord.userId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'No tienes permisos para eliminar este registro'
      });
    }

    await Grade.findByIdAndDelete(req.params.id);

    logger.info('Registro de calificaciones eliminado:', {
      gradeId: req.params.id,
      userId: req.user.id
    });

    res.status(200).json({
      success: true,
      message: 'Registro de calificaciones eliminado exitosamente'
    });
  } catch (error) {
    logger.error('Error eliminando registro de calificaciones:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

// GET /api/grades/:id/projections - Obtener proyecciones de calificación
router.get('/:id/projections', authenticate, async (req, res) => {
  try {
    const gradeRecord = await Grade.findById(req.params.id)
      .populate('evaluationPlanId');
    
    if (!gradeRecord) {
      return res.status(404).json({
        success: false,
        error: 'Registro de calificaciones no encontrado'
      });
    }

    // Verificar que el usuario sea el propietario
    if (gradeRecord.userId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'No tienes permisos para ver este registro'
      });
    }

    // Calcular diferentes escenarios
    const scenarios = [];
    
    // Escenario pesimista (nota mínima aprobatoria en lo restante)
    if (gradeRecord.remainingPercentage > 0) {
      const pesimisticGrade = (gradeRecord.currentWeightedGrade * (gradeRecord.completedPercentage / 100)) + 
                              (3.0 * (gradeRecord.remainingPercentage / 100));
      scenarios.push({
        name: 'Pesimista (3.0 en restantes)',
        finalGrade: Math.max(0, Math.min(5, parseFloat(pesimisticGrade.toFixed(2)))),
        requiredGrade: 3.0
      });
    }

    // Escenario realista (nota promedio actual en lo restante)
    if (gradeRecord.remainingPercentage > 0 && gradeRecord.currentWeightedGrade > 0) {
      const realisticGrade = (gradeRecord.currentWeightedGrade * (gradeRecord.completedPercentage / 100)) + 
                             (gradeRecord.currentWeightedGrade * (gradeRecord.remainingPercentage / 100));
      scenarios.push({
        name: 'Realista (promedio actual)',
        finalGrade: Math.max(0, Math.min(5, parseFloat(realisticGrade.toFixed(2)))),
        requiredGrade: gradeRecord.currentWeightedGrade
      });
    }

    // Escenario optimista (nota máxima en lo restante)
    if (gradeRecord.remainingPercentage > 0) {
      const optimisticGrade = (gradeRecord.currentWeightedGrade * (gradeRecord.completedPercentage / 100)) + 
                              (5.0 * (gradeRecord.remainingPercentage / 100));
      scenarios.push({
        name: 'Optimista (5.0 en restantes)',
        finalGrade: Math.max(0, Math.min(5, parseFloat(optimisticGrade.toFixed(2)))),
        requiredGrade: 5.0
      });
    }

    const projections = {
      currentGrade: gradeRecord.currentWeightedGrade,
      completedPercentage: gradeRecord.completedPercentage,
      remainingPercentage: gradeRecord.remainingPercentage,
      targetGrade: gradeRecord.targetGrade,
      requiredGradeForTarget: gradeRecord.requiredGradeForTarget,
      scenarios
    };

    res.status(200).json({
      success: true,
      data: projections
    });
  } catch (error) {
    logger.error('Error calculando proyecciones:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

module.exports = router; 