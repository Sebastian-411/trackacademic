const express = require('express');
const { supabase } = require('../config/database');
const EvaluationPlan = require('../models/EvaluationPlan');
const Grade = require('../models/Grade');
const Comment = require('../models/Comment');
const logger = require('../utils/logger');

const router = express.Router();

// Middleware para verificar autenticación en sesión
const requireAuth = (req, res, next) => {
  if (!req.session.user) {
    return res.redirect('/login');
  }
  next();
};

// Middleware para verificar roles
const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.session.user || !allowedRoles.includes(req.session.user.role)) {
      return res.status(403).render('error', {
        title: 'Acceso Denegado',
        error: {
          status: 403,
          message: 'No tienes permisos para acceder a esta página.'
        }
      });
    }
    next();
  };
};

// Página de inicio (landing)
router.get('/', (req, res) => {
  if (req.session.user) {
    return res.redirect('/dashboard');
  }
  
  res.render('index', {
    title: 'Trackademic - Gestión de Notas Académicas',
    user: null
  });
});

// Página de login
router.get('/login', (req, res) => {
  if (req.session.user) {
    return res.redirect('/dashboard');
  }
  
  res.render('auth/login', {
    title: 'Iniciar Sesión - Trackademic',
    error: req.query.error || null
  });
});

// Página de registro
router.get('/register', (req, res) => {
  if (req.session.user) {
    return res.redirect('/dashboard');
  }
  
  res.render('auth/register', {
    title: 'Registro - Trackademic',
    error: req.query.error || null
  });
});

// Procesar login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Autenticar con Supabase
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    
    if (error) {
      return res.redirect('/login?error=' + encodeURIComponent('Credenciales inválidas'));
    }
    
    // Obtener información del usuario
    const { data: userProfile } = await supabase
      .from('employees')
      .select(`
        id, first_name, last_name, email, employee_type, faculty_code,
        faculties:faculty_code (name)
      `)
      .eq('id', data.user.id)
      .single();
    
    let userInfo = {
      id: data.user.id,
      email: data.user.email,
      role: 'student',
      token: data.session.access_token
    };
    
    if (userProfile) {
      let role = 'student';
      if (userProfile.employee_type === 'Profesor') role = 'professor';
      else if (userProfile.employee_type === 'Coordinador') role = 'coordinator';
      else if (userProfile.employee_type === 'Administrador') role = 'admin';
      
      userInfo = {
        ...userInfo,
        firstName: userProfile.first_name,
        lastName: userProfile.last_name,
        role: role,
        employeeType: userProfile.employee_type,
        facultyCode: userProfile.faculty_code,
        facultyName: userProfile.faculties?.name
      };
    }
    
    req.session.user = userInfo;
    logger.info('Login web exitoso:', { userId: userInfo.id, email: userInfo.email });
    
    res.redirect('/dashboard');
  } catch (error) {
    logger.error('Error en login web:', error);
    res.redirect('/login?error=' + encodeURIComponent('Error interno del servidor'));
  }
});

// Procesar registro
router.post('/register', async (req, res) => {
  try {
    const { email, password, firstName, lastName } = req.body;
    
    if (!email || !password || !firstName || !lastName) {
      return res.redirect('/register?error=' + encodeURIComponent('Todos los campos son requeridos'));
    }
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: firstName,
          last_name: lastName,
          role: 'student'
        }
      }
    });
    
    if (error) {
      return res.redirect('/register?error=' + encodeURIComponent(error.message));
    }
    
    const userInfo = {
      id: data.user.id,
      email: data.user.email,
      firstName,
      lastName,
      role: 'student',
      token: data.session?.access_token
    };
    
    if (data.session) {
      req.session.user = userInfo;
      res.redirect('/dashboard');
    } else {
      res.redirect('/login?success=' + encodeURIComponent('Registro exitoso. Verifica tu email.'));
    }
  } catch (error) {
    logger.error('Error en registro web:', error);
    res.redirect('/register?error=' + encodeURIComponent('Error interno del servidor'));
  }
});

// Logout
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      logger.error('Error en logout:', err);
    }
    res.redirect('/');
  });
});

// Dashboard principal
router.get('/dashboard', requireAuth, async (req, res) => {
  try {
    const user = req.session.user;
    let dashboardData = { user };
    
    if (user.role === 'student') {
      // Dashboard de estudiante
      const grades = await Grade.find({ userId: user.id })
        .populate('evaluationPlanId', 'subjectCode semester activities')
        .sort({ updatedAt: -1 });
      
      const recentGrades = grades.slice(0, 5);
      
      // Estadísticas básicas
      const stats = {
        totalSubjects: grades.length,
        completedSubjects: grades.filter(g => g.isComplete).length,
        averageGrade: 0,
        pendingActivities: 0,
        passedSubjects: 0,
        failedSubjects: 0,
        inProgressSubjects: 0
      };
      
      const completedGrades = grades.filter(g => g.isComplete && g.finalGrade);
      if (completedGrades.length > 0) {
        stats.averageGrade = parseFloat(
          (completedGrades.reduce((sum, g) => sum + g.finalGrade, 0) / completedGrades.length).toFixed(2)
        );
        stats.passedSubjects = completedGrades.filter(g => g.finalGrade >= 3.0).length;
        stats.failedSubjects = completedGrades.filter(g => g.finalGrade < 3.0).length;
      }
      
      stats.inProgressSubjects = grades.length - completedGrades.length;
      
      // Calcular actividades pendientes
      grades.forEach(grade => {
        if (grade.activities) {
          const pending = grade.activities.filter(a => a.score === null || a.score === undefined).length;
          stats.pendingActivities += pending;
        }
      });
      
      // Próximas actividades (simulado)
      let upcomingActivities = [];
      grades.forEach(grade => {
        if (grade.evaluationPlanId && grade.evaluationPlanId.activities) {
          grade.evaluationPlanId.activities.forEach(activity => {
            const userActivity = grade.activities.find(a => a.name === activity.name);
            if (!userActivity || userActivity.score === null) {
              upcomingActivities.push({
                name: activity.name,
                type: activity.type,
                percentage: activity.percentage,
                dueDate: activity.dueDate,
                subjectCode: grade.subjectCode
              });
            }
          });
        }
      });
      
      upcomingActivities = upcomingActivities.slice(0, 10);
      
      dashboardData = { 
        ...dashboardData, 
        recentGrades,
        totalSubjects: stats.totalSubjects,
        completedSubjects: stats.completedSubjects,
        averageGrade: stats.averageGrade,
        pendingActivities: stats.pendingActivities,
        passedSubjects: stats.passedSubjects,
        failedSubjects: stats.failedSubjects,
        inProgressSubjects: stats.inProgressSubjects,
        upcomingActivities
      };
      
      // Enriquecer con nombres de materias
      const enrichedGrades = await Promise.all(
        recentGrades.map(async (grade) => {
          const subjectInfo = await supabase
            .from('subjects')
            .select('name')
            .eq('code', grade.subjectCode)
            .single();
          
          return {
            ...grade.toObject(),
            subjectName: subjectInfo.data?.name || grade.subjectCode
          };
        })
      );
      
      dashboardData.recentGrades = enrichedGrades;
      
      return res.render('dashboard/student', {
        title: 'Mi Dashboard - Trackademic',
        ...dashboardData
      });
      
    } else if (user.role === 'professor') {
      // Dashboard de profesor
      const plans = await EvaluationPlan.find({ 
        professorId: user.id, 
        isActive: true 
      }).limit(5).sort({ updatedAt: -1 });
      
      const stats = {
        totalPlans: plans.length,
        approvedPlans: plans.filter(p => p.isApproved).length,
        pendingPlans: plans.filter(p => !p.isApproved).length
      };
      
      dashboardData = { ...dashboardData, plans, stats };
      
    } else if (user.role === 'coordinator') {
      // Dashboard de coordinador
      const { data: facultyProfessors } = await supabase
        .from('employees')
        .select('id')
        .eq('faculty_code', user.facultyCode)
        .eq('employee_type', 'Profesor');
      
      const professorIds = facultyProfessors?.map(p => p.id) || [];
      
      const plans = await EvaluationPlan.find({
        professorId: { $in: professorIds },
        isActive: true
      }).limit(10).sort({ updatedAt: -1 });
      
      const stats = {
        totalPlans: plans.length,
        approvedPlans: plans.filter(p => p.isApproved).length,
        pendingApproval: plans.filter(p => !p.isApproved).length
      };
      
      dashboardData = { ...dashboardData, plans, stats };
    }
    
    res.render('dashboard/index', {
      title: 'Dashboard - Trackademic',
      ...dashboardData
    });
  } catch (error) {
    logger.error('Error en dashboard:', error);
    res.render('error', {
      title: 'Error',
      error: { status: 500, message: 'Error interno del servidor' },
      user: req.session.user
    });
  }
});

// Gestión de planes de evaluación
router.get('/evaluation-plans', requireAuth, async (req, res) => {
  try {
    const user = req.session.user;
    const { page = 1, semester, approved } = req.query;
    const limit = 10;
    const skip = (parseInt(page) - 1) * limit;
    
    let query = { isActive: true };
    
    // Filtros por rol
    if (user.role === 'student') {
      query.isApproved = true;
    } else if (user.role === 'professor') {
      query.$or = [
        { professorId: user.id },
        { isApproved: true }
      ];
    } else if (user.role === 'coordinator') {
      const { data: facultyProfessors } = await supabase
        .from('employees')
        .select('id')
        .eq('faculty_code', user.facultyCode)
        .eq('employee_type', 'Profesor');
      
      const professorIds = facultyProfessors?.map(p => p.id) || [];
      query.professorId = { $in: professorIds };
    }
    
    // Filtros adicionales
    if (semester) query.semester = semester;
    if (approved !== undefined) query.isApproved = approved === 'true';
    
    const plans = await EvaluationPlan.find(query)
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit);
    
    const total = await EvaluationPlan.countDocuments(query);
    
    // Obtener información adicional de materias y profesores
    const enrichedPlans = await Promise.all(
      plans.map(async (plan) => {
        const [subjectInfo, professorInfo] = await Promise.all([
          supabase.from('subjects').select('name').eq('code', plan.subjectCode).single(),
          supabase.from('employees').select('first_name, last_name').eq('id', plan.professorId).single()
        ]);
        
        return {
          ...plan.toObject(),
          subjectName: subjectInfo.data?.name || plan.subjectCode,
          professorName: professorInfo.data 
            ? `${professorInfo.data.first_name} ${professorInfo.data.last_name}`
            : 'Profesor no encontrado'
        };
      })
    );
    
    res.render('evaluation-plans/index', {
      title: 'Planes de Evaluación - Trackademic',
      user,
      plans: enrichedPlans,
      pagination: {
        page: parseInt(page),
        pages: Math.ceil(total / limit),
        total
      },
      filters: { semester, approved }
    });
  } catch (error) {
    logger.error('Error en planes de evaluación:', error);
    res.render('error', {
      title: 'Error',
      error: { status: 500, message: 'Error interno del servidor' }
    });
  }
});

// Ver plan específico
router.get('/evaluation-plans/:id', requireAuth, async (req, res) => {
  try {
    const plan = await EvaluationPlan.findById(req.params.id);
    
    if (!plan) {
      return res.render('error', {
        title: 'Plan no encontrado',
        error: { status: 404, message: 'El plan de evaluación no existe.' },
        user: req.session.user
      });
    }
    
    // Verificar acceso
    const user = req.session.user;
    if (user.role === 'student' && !plan.isApproved) {
      return res.render('error', {
        title: 'Acceso Denegado',
        error: { status: 403, message: 'No puedes ver este plan ya que aún no está aprobado.' },
        user
      });
    }
    
    // Obtener comentarios del plan
    const comments = await Comment.find({
      evaluationPlanId: plan._id,
      status: 'active'
    }).sort({ createdAt: -1 }).limit(20);
    
    // Información adicional
    const [subjectInfo, professorInfo] = await Promise.all([
      supabase.from('subjects').select('name').eq('code', plan.subjectCode).single(),
      supabase.from('employees').select('first_name, last_name, email').eq('id', plan.professorId).single()
    ]);
    
    res.render('evaluation-plans/detail', {
      title: `Plan de ${plan.subjectCode} - Trackademic`,
      user,
      plan: {
        ...plan.toObject(),
        subjectName: subjectInfo.data?.name || plan.subjectCode,
        professorName: professorInfo.data 
          ? `${professorInfo.data.first_name} ${professorInfo.data.last_name}`
          : 'Profesor no encontrado',
        professorEmail: professorInfo.data?.email
      },
      comments
    });
  } catch (error) {
    logger.error('Error viendo plan:', error);
    res.render('error', {
      title: 'Error',
      error: { status: 500, message: 'Error interno del servidor' },
      user: req.session.user
    });
  }
});

// Mis calificaciones (solo estudiantes)
router.get('/grades', requireAuth, requireRole('student'), async (req, res) => {
  try {
    const user = req.session.user;
    const { semester } = req.query;
    
    let query = { userId: user.id };
    if (semester) query.semester = semester;
    
    const grades = await Grade.find(query)
      .populate('evaluationPlanId', 'subjectCode activities professorId')
      .sort({ semester: -1, subjectCode: 1 });
    
    // Enriquecer con información de materias
    const enrichedGrades = await Promise.all(
      grades.map(async (grade) => {
        const subjectInfo = await supabase
          .from('subjects')
          .select('name')
          .eq('code', grade.subjectCode)
          .single();
        
        return {
          ...grade.toObject(),
          subjectName: subjectInfo.data?.name || grade.subjectCode
        };
      })
    );
    
    // Estadísticas
    const stats = {
      totalSubjects: grades.length,
      completedSubjects: grades.filter(g => g.isComplete).length,
      averageGrade: 0
    };
    
    const completedGrades = grades.filter(g => g.isComplete && g.finalGrade);
    if (completedGrades.length > 0) {
      stats.averageGrade = parseFloat(
        (completedGrades.reduce((sum, g) => sum + g.finalGrade, 0) / completedGrades.length).toFixed(2)
      );
    }
    
    res.render('grades/index', {
      title: 'Mis Calificaciones - Trackademic',
      user,
      grades: enrichedGrades,
      stats,
      selectedSemester: semester
    });
  } catch (error) {
    logger.error('Error en calificaciones:', error);
    res.render('error', {
      title: 'Error',
      error: { status: 500, message: 'Error interno del servidor' }
    });
  }
});

// Ver calificación específica
router.get('/grades/:id', requireAuth, async (req, res) => {
  try {
    const grade = await Grade.findById(req.params.id)
      .populate('evaluationPlanId');
    
    if (!grade) {
      return res.render('error', {
        title: 'Calificación no encontrada',
        error: { status: 404, message: 'La calificación no existe.' },
        user: req.session.user
      });
    }
    
    const user = req.session.user;
    if (grade.userId !== user.id && user.role !== 'admin') {
      return res.render('error', {
        title: 'Acceso Denegado',
        error: { status: 403, message: 'No puedes ver esta calificación.' },
        user: req.session.user
      });
    }
    
    // Información de la materia
    const subjectInfo = await supabase
      .from('subjects')
      .select('name')
      .eq('code', grade.subjectCode)
      .single();
    
    res.render('grades/detail', {
      title: `Calificaciones de ${grade.subjectCode} - Trackademic`,
      user,
      grade: {
        ...grade.toObject(),
        subjectName: subjectInfo.data?.name || grade.subjectCode
      }
    });
  } catch (error) {
    logger.error('Error viendo calificación:', error);
    res.render('error', {
      title: 'Error',
      error: { status: 500, message: 'Error interno del servidor' },
      user: req.session.user
    });
  }
});

// Informes (estudiantes)
router.get('/reports', requireAuth, requireRole('student'), async (req, res) => {
  try {
    const user = req.session.user;
    
    res.render('reports/student', {
      title: 'Mis Informes - Trackademic',
      user
    });
  } catch (error) {
    logger.error('Error en informes:', error);
    res.render('error', {
      title: 'Error',
      error: { status: 500, message: 'Error interno del servidor' }
    });
  }
});

// Panel de administración (coordinadores y admin)
router.get('/admin', requireAuth, requireRole('coordinator', 'admin'), async (req, res) => {
  try {
    const user = req.session.user;
    
    res.render('admin/index', {
      title: 'Panel de Administración - Trackademic',
      user
    });
  } catch (error) {
    logger.error('Error en admin:', error);
    res.render('error', {
      title: 'Error',
      error: { status: 500, message: 'Error interno del servidor' }
    });
  }
});

// Ruta para búsqueda de cursos
router.get('/courses/search', requireAuth, async (req, res) => {
  try {
    const { search = '', professor = '', semester = '', page = 1 } = req.query;
    const limit = 10;
    const offset = (page - 1) * limit;

    // Obtener todas las materias (SUBJECTS)
    let subjectsQuery = supabase
      .from('subjects')
      .select('code, name, program_code');

    // Filtro por nombre/código de materia
    if (search.trim()) {
      subjectsQuery = subjectsQuery.or(`name.ilike.%${search}%,code.ilike.%${search}%`);
    }

    const { data: subjects, error: subjectsError } = await subjectsQuery;

    if (subjectsError) {
      console.error('Error al buscar materias:', subjectsError);
      return res.status(500).render('error', {
        title: 'Error - Trackademic',
        message: 'Error al buscar materias',
        error: { status: 500, message: subjectsError.message }
      });
    }

    if (!subjects || subjects.length === 0) {
      return res.render('courses/search', {
        user: req.session.user,
        subjects: [],
        searchParams: { search, professor, semester },
        pagination: { currentPage: parseInt(page), hasNext: false, hasPrev: false },
        semesters: [],
        title: 'Búsqueda de Cursos'
      });
    }

    // Obtener todos los grupos (GROUPS) para las materias encontradas
    const subjectCodes = subjects.map(s => s.code);
    let groupsQuery = supabase
      .from('groups')
      .select('number, semester, subject_code, professor_id')
      .in('subject_code', subjectCodes);

    // Filtro por semestre
    if (semester.trim()) {
      groupsQuery = groupsQuery.eq('semester', semester);
    }

    const { data: groups, error: groupsError } = await groupsQuery;

    if (groupsError) {
      console.error('Error al buscar grupos:', groupsError);
      return res.status(500).render('error', {
        title: 'Error - Trackademic',
        message: 'Error al buscar grupos',
        error: { status: 500, message: groupsError.message }
      });
    }

    // Obtener información de profesores si hay grupos
    let professors = [];
    if (groups && groups.length > 0) {
      const professorIds = [...new Set(groups.map(g => g.professor_id).filter(Boolean))];
      
      if (professorIds.length > 0) {
        const { data: professorsData, error: professorsError } = await supabase
          .from('employees')
          .select('id, first_name, last_name, email')
          .in('id', professorIds);

        if (!professorsError && professorsData) {
          professors = professorsData;
        }
      }
    }

    // Combinar los datos manualmente
    let combinedResults = [];
    
    subjects.forEach(subject => {
      // Encontrar grupos para esta materia
      const subjectGroups = groups ? groups.filter(group => group.subject_code === subject.code) : [];
      
      subjectGroups.forEach(group => {
        // Encontrar el profesor para este grupo
        const professorInfo = professors.find(p => p.id === group.professor_id);
        
        // Filtrar por profesor si se especifica
        if (professor.trim() && professorInfo) {
          const professorMatch = 
            professorInfo.first_name.toLowerCase().includes(professor.toLowerCase()) ||
            professorInfo.last_name.toLowerCase().includes(professor.toLowerCase());
          
          if (!professorMatch) return;
        } else if (professor.trim() && !professorInfo) {
          return; // Filtro de profesor activo pero no hay profesor para este grupo
        }
        
        combinedResults.push({
          ...subject,
          groups: [{
            ...group,
            employees: professorInfo
          }]
        });
      });
    });

    // Aplicar paginación
    const totalResults = combinedResults.length;
    const paginatedResults = combinedResults.slice(offset, offset + limit);

    // Obtener semestres disponibles para el filtro
    const { data: allSemesters } = await supabase
      .from('groups')
      .select('semester')
      .order('semester', { ascending: false });

    const uniqueSemesters = [...new Set(allSemesters?.map(s => s.semester) || [])];

    res.render('courses/search', {
      user: req.session.user,
      subjects: paginatedResults,
      searchParams: { search, professor, semester },
      pagination: {
        currentPage: parseInt(page),
        hasNext: totalResults > offset + limit,
        hasPrev: page > 1
      },
      semesters: uniqueSemesters,
      title: 'Búsqueda de Cursos'
    });

  } catch (error) {
    console.error('Error en búsqueda de cursos:', error);
    res.status(500).render('error', {
      title: 'Error - Trackademic',
      message: 'Error al buscar cursos',
      error: { status: 500, stack: error.stack }
    });
  }
});

// Ruta para ver planes de evaluación de un curso específico
router.get('/courses/:subjectCode/:semester/:groupNumber/evaluation-plans', requireAuth, async (req, res) => {
  try {
    const { subjectCode, semester, groupNumber } = req.params;

    // Obtener información del curso desde Supabase usando el esquema correcto
    const { data: courseInfo, error: courseError } = await supabase
      .from('subjects')
      .select('code, name, program_code')
      .eq('code', subjectCode)
      .single();

    if (courseError || !courseInfo) {
      return res.status(404).render('error', {
        title: 'Error - Trackademic',
        message: 'Curso no encontrado',
        error: { status: 404 }
      });
    }

    // Obtener información del grupo específico
    const { data: groupInfo, error: groupError } = await supabase
      .from('groups')
      .select('number, semester, subject_code, professor_id')
      .eq('subject_code', subjectCode)
      .eq('semester', semester)
      .eq('number', parseInt(groupNumber))
      .single();

    if (groupError || !groupInfo) {
      return res.status(404).render('error', {
        title: 'Error - Trackademic',
        message: 'Grupo no encontrado',
        error: { status: 404 }
      });
    }

    // Obtener información del profesor si existe
    let professorInfo = null;
    if (groupInfo.professor_id) {
      const { data: professor, error: professorError } = await supabase
        .from('employees')
        .select('id, first_name, last_name, email')
        .eq('id', groupInfo.professor_id)
        .single();

      if (!professorError && professor) {
        professorInfo = professor;
      }
    }

    // Obtener planes de evaluación desde MongoDB
    const EvaluationPlan = require('../models/EvaluationPlan');
    const evaluationPlans = await EvaluationPlan.find({
      subjectCode: subjectCode.toUpperCase(),
      semester: semester,
      groupNumber: parseInt(groupNumber),
      isActive: true
    }).sort({ createdAt: -1 });

    res.render('courses/evaluation-plans', {
      user: req.session.user,
      course: {
        ...courseInfo,
        semester,
        groupNumber: parseInt(groupNumber),
        professor: professorInfo,
        offering: groupInfo
      },
      evaluationPlans,
      title: `Planes de Evaluación - ${courseInfo.name}`
    });

  } catch (error) {
    console.error('Error al obtener planes de evaluación:', error);
    res.status(500).render('error', {
      title: 'Error - Trackademic',
      message: 'Error al cargar planes de evaluación',
      error: { status: 500, stack: error.stack }
    });
  }
});

// Ruta para crear un nuevo plan de evaluación
router.post('/courses/:subjectCode/:semester/:groupNumber/evaluation-plans', requireAuth, async (req, res) => {
  try {
    const { subjectCode, semester, groupNumber } = req.params;
    const { activities } = req.body;

    // Validar que los porcentajes sumen 100%
    const totalPercentage = activities.reduce((sum, activity) => sum + parseFloat(activity.percentage), 0);
    if (Math.abs(totalPercentage - 100) > 0.01) {
      return res.status(400).json({
        success: false,
        message: 'Los porcentajes deben sumar exactamente 100%'
      });
    }

    // Verificar que el usuario tenga permisos (profesor, coordinador, admin o estudiante)
    if (!['professor', 'coordinator', 'admin', 'student'].includes(req.session.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para crear planes de evaluación'
      });
    }

    // Crear el plan de evaluación
    const EvaluationPlan = require('../models/EvaluationPlan');
    const newPlan = new EvaluationPlan({
      semester,
      subjectCode: subjectCode.toUpperCase(),
      groupNumber: parseInt(groupNumber),
      professorId: req.session.user.id,
      activities: activities.map(activity => ({
        name: activity.name,
        percentage: parseFloat(activity.percentage),
        description: activity.description || '',
        dueDate: activity.dueDate ? new Date(activity.dueDate) : null
      })),
      createdBy: req.session.user.id,
      isApproved: req.session.user.role === 'admin' // Auto-aprobar si es admin
    });

    await newPlan.save();

    res.json({
      success: true,
      message: 'Plan de evaluación creado exitosamente',
      planId: newPlan._id
    });

  } catch (error) {
    console.error('Error al crear plan de evaluación:', error);
    res.status(500).json({
      success: false,
      message: 'Error al crear el plan de evaluación'
    });
  }
});

// Ruta para ver un plan de evaluación específico con calculadora de notas
router.get('/evaluation-plans/:planId', requireAuth, async (req, res) => {
  try {
    const { planId } = req.params;

    const EvaluationPlan = require('../models/EvaluationPlan');
    const plan = await EvaluationPlan.findById(planId);

    if (!plan) {
      return res.status(404).render('error', {
        title: 'Error - Trackademic',
        message: 'Plan de evaluación no encontrado',
        error: { status: 404 }
      });
    }

    // Obtener información del curso usando el esquema correcto
    const { data: courseInfo } = await supabase
      .from('subjects')
      .select('code, name, program_code')
      .eq('code', plan.subjectCode)
      .single();

    // Obtener información del grupo específico
    const { data: groupInfo } = await supabase
      .from('groups')
      .select('number, semester, subject_code, professor_id')
      .eq('subject_code', plan.subjectCode)
      .eq('semester', plan.semester)
      .eq('number', plan.groupNumber)
      .single();

    // Obtener información del profesor si existe
    let professorInfo = null;
    if (groupInfo?.professor_id) {
      const { data: professor } = await supabase
        .from('employees')
        .select('first_name, last_name')
        .eq('id', groupInfo.professor_id)
        .single();
      
      if (professor) {
        professorInfo = professor;
      }
    }

    // Obtener comentarios del plan
    const Comment = require('../models/Comment');
    const comments = await Comment.find({
      targetType: 'evaluation_plan',
      targetId: planId
    }).sort({ createdAt: -1 });

    res.render('evaluation-plans/detail', {
      user: req.session.user,
      plan,
      course: {
        ...courseInfo,
        groups: groupInfo ? [{
          ...groupInfo,
          employees: professorInfo
        }] : []
      },
      comments,
      title: `Plan de Evaluación - ${plan.subjectCode}`
    });

  } catch (error) {
    console.error('Error al obtener plan de evaluación:', error);
    res.status(500).render('error', {
      title: 'Error - Trackademic',
      message: 'Error al cargar el plan de evaluación',
      error: { status: 500, stack: error.stack }
    });
  }
});

// Ruta para agregar comentario a un plan de evaluación
router.post('/evaluation-plans/:planId/comments', requireAuth, async (req, res) => {
  try {
    const { planId } = req.params;
    const { content } = req.body;

    const Comment = require('../models/Comment');
    const newComment = new Comment({
      targetType: 'evaluation_plan',
      targetId: planId,
      content: content,
      authorId: req.session.user.id,
      authorName: `${req.session.user.firstName} ${req.session.user.lastName}`
    });

    await newComment.save();

    res.json({
      success: true,
      message: 'Comentario agregado exitosamente',
      comment: newComment
    });

  } catch (error) {
    console.error('Error al agregar comentario:', error);
    res.status(500).json({
      success: false,
      message: 'Error al agregar el comentario'
    });
  }
});

// Ruta para reportes
router.get('/reports', requireAuth, async (req, res) => {
  try {
    const userRole = req.session.user.role;

    switch (userRole) {
      case 'student':
        return res.render('reports/student', {
          user: req.session.user,
          title: 'Mis Reportes'
        });
      case 'professor':
        return res.render('reports/professor', {
          user: req.session.user,
          title: 'Reportes de Profesor'
        });
      case 'coordinator':
      case 'admin':
        return res.render('reports/admin', {
          user: req.session.user,
          title: 'Reportes Administrativos'
        });
      default:
        return res.status(403).render('error', {
          title: 'Error - Trackademic',
          message: 'No tienes permisos para acceder a los reportes',
          error: { status: 403 }
        });
    }
  } catch (error) {
    console.error('Error al cargar reportes:', error);
    res.status(500).render('error', {
      title: 'Error - Trackademic',
      message: 'Error al cargar los reportes',
      error: { status: 500, stack: error.stack }
    });
  }
});

// API Routes para reportes
router.post('/api/reports/generate', requireAuth, async (req, res) => {
  try {
    const { type, studentId, parameters } = req.body;

    // Verificar permisos
    if (req.session.user.role === 'student' && req.session.user.id !== studentId) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para generar reportes de otros estudiantes'
      });
    }

    const Report = require('../models/Report');
    
    // Crear el reporte
    const report = new Report({
      type,
      title: getReportTitle(type),
      description: getReportDescription(type),
      studentId,
      generatedBy: req.session.user.id,
      status: 'processing',
      parameters: parameters || {}
    });

    await report.save();

    // Generar el reporte de forma asíncrona
    generateReportData(report._id, type, studentId, parameters);

    res.json({
      success: true,
      message: 'Reporte creado exitosamente. Se procesará en unos momentos.',
      reportId: report._id
    });

  } catch (error) {
    console.error('Error al generar reporte:', error);
    res.status(500).json({
      success: false,
      message: 'Error al generar el reporte'
    });
  }
});

router.get('/api/reports/student/:studentId', requireAuth, async (req, res) => {
  try {
    const { studentId } = req.params;

    // Verificar permisos
    if (req.session.user.role === 'student' && req.session.user.id !== studentId) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para ver reportes de otros estudiantes'
      });
    }

    const Report = require('../models/Report');
    const reports = await Report.findByStudent(studentId);

    res.json({
      success: true,
      reports
    });

  } catch (error) {
    console.error('Error al obtener reportes:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener los reportes'
    });
  }
});

router.get('/api/reports/:reportId/content', requireAuth, async (req, res) => {
  try {
    const { reportId } = req.params;

    const Report = require('../models/Report');
    const report = await Report.findById(reportId);

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Reporte no encontrado'
      });
    }

    // Verificar permisos
    if (req.session.user.role === 'student' && req.session.user.id !== report.studentId) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para ver este reporte'
      });
    }

    if (report.status !== 'completed') {
      return res.status(400).json({
        success: false,
        message: 'El reporte aún no está listo'
      });
    }

    res.json({
      success: true,
      content: report.content.html || generateReportHTML(report)
    });

  } catch (error) {
    console.error('Error al obtener contenido del reporte:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener el contenido del reporte'
    });
  }
});

router.get('/api/reports/:reportId/download', requireAuth, async (req, res) => {
  try {
    const { reportId } = req.params;

    const Report = require('../models/Report');
    const report = await Report.findById(reportId);

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Reporte no encontrado'
      });
    }

    // Verificar permisos
    if (req.session.user.role === 'student' && req.session.user.id !== report.studentId) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para descargar este reporte'
      });
    }

    if (report.status !== 'completed') {
      return res.status(400).json({
        success: false,
        message: 'El reporte aún no está listo'
      });
    }

    // Generar PDF (simulado)
    const pdfBuffer = await generateReportPDF(report);
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="reporte_${report.type}_${reportId}.pdf"`);
    res.send(pdfBuffer);

  } catch (error) {
    console.error('Error al descargar reporte:', error);
    res.status(500).json({
      success: false,
      message: 'Error al descargar el reporte'
    });
  }
});

// Funciones auxiliares para reportes
function getReportTitle(type) {
  switch (type) {
    case 'performance': return 'Reporte de Rendimiento Académico';
    case 'grades': return 'Reporte de Calificaciones';
    case 'projections': return 'Reporte de Proyecciones';
    default: return 'Reporte Académico';
  }
}

function getReportDescription(type) {
  switch (type) {
    case 'performance': return 'Análisis completo del rendimiento académico por semestre y materia';
    case 'grades': return 'Detalle de todas las calificaciones organizadas por materia';
    case 'projections': return 'Proyecciones de notas finales y recomendaciones';
    default: return 'Reporte académico personalizado';
  }
}

async function generateReportData(reportId, type, studentId, parameters) {
  try {
    const startTime = Date.now();
    const Report = require('../models/Report');
    const Grade = require('../models/Grade');
    
    const report = await Report.findById(reportId);
    if (!report) return;

    // Obtener datos del estudiante desde Supabase
    const { data: studentInfo } = await supabase
      .from('students')
      .select('*')
      .eq('user_id', studentId)
      .single();

    // Obtener calificaciones desde MongoDB
    const grades = await Grade.find({ studentId });

    let reportData = {};
    
    switch (type) {
      case 'performance':
        reportData = await generatePerformanceReport(studentId, grades, parameters);
        break;
      case 'grades':
        reportData = await generateGradesReport(studentId, grades, parameters);
        break;
      case 'projections':
        reportData = await generateProjectionsReport(studentId, grades, parameters);
        break;
    }

    // Generar contenido HTML
    const htmlContent = generateReportHTML({
      ...report.toObject(),
      data: reportData,
      studentInfo
    });

    const generationTime = Date.now() - startTime;

    await report.markCompleted({
      html: htmlContent,
      text: stripHtml(htmlContent)
    });

    report.data = reportData;
    report.metadata.generationTime = generationTime;
    report.metadata.dataSourcesUsed = ['supabase', 'mongodb'];
    await report.save();

  } catch (error) {
    console.error('Error generando datos del reporte:', error);
    const Report = require('../models/Report');
    const report = await Report.findById(reportId);
    if (report) {
      await report.markFailed(error.message);
    }
  }
}

async function generatePerformanceReport(studentId, grades, parameters) {
  const summary = {
    totalSubjects: grades.length,
    averageGrade: grades.reduce((sum, g) => sum + (g.finalGrade || g.currentGrade || 0), 0) / grades.length || 0,
    passedSubjects: grades.filter(g => (g.finalGrade || g.currentGrade || 0) >= 3.0).length,
    failedSubjects: grades.filter(g => g.isComplete && (g.finalGrade || 0) < 3.0).length,
    inProgressSubjects: grades.filter(g => !g.isComplete).length
  };

  const subjects = grades.map(grade => ({
    code: grade.subjectCode,
    name: grade.subjectName || grade.subjectCode,
    semester: grade.semester,
    currentGrade: grade.currentGrade || 0,
    finalGrade: grade.finalGrade,
    status: grade.isComplete ? (grade.finalGrade >= 3.0 ? 'passed' : 'failed') : 'in_progress',
    activities: grade.activities || []
  }));

  const trends = generateTrendsData(grades);
  const comparisons = await generateComparisons(studentId, grades);

  return {
    summary,
    subjects,
    trends,
    comparisons
  };
}

async function generateGradesReport(studentId, grades, parameters) {
  const groupedBySubject = grades.reduce((acc, grade) => {
    if (!acc[grade.subjectCode]) {
      acc[grade.subjectCode] = {
        code: grade.subjectCode,
        name: grade.subjectName || grade.subjectCode,
        grades: []
      };
    }
    acc[grade.subjectCode].grades.push(grade);
    return acc;
  }, {});

  return {
    summary: {
      totalSubjects: Object.keys(groupedBySubject).length,
      totalGrades: grades.reduce((sum, g) => sum + (g.activities?.length || 0), 0),
      averageGrade: grades.reduce((sum, g) => sum + (g.finalGrade || g.currentGrade || 0), 0) / grades.length || 0
    },
    subjectGroups: Object.values(groupedBySubject),
    detailedGrades: grades
  };
}

async function generateProjectionsReport(studentId, grades, parameters) {
  const targetGrade = parameters.targetGrade || 3.0;
  
  const projections = grades
    .filter(grade => !grade.isComplete)
    .map(grade => {
      const currentGrade = grade.currentGrade || 0;
      const completedActivities = grade.activities?.filter(a => a.score !== null) || [];
      const pendingActivities = grade.activities?.filter(a => a.score === null) || [];
      
      if (pendingActivities.length === 0) {
        return {
          subjectCode: grade.subjectCode,
          currentGrade,
          projectedGrade: currentGrade,
          minimumRequired: 0,
          recommendations: ['Ya tienes todas las actividades completadas']
        };
      }

      const currentContribution = completedActivities.reduce((sum, activity) => {
        return sum + ((activity.score / activity.maxScore) * 5 * activity.percentage / 100);
      }, 0);

      const remainingPercentage = pendingActivities.reduce((sum, a) => sum + a.percentage, 0);
      const neededContribution = targetGrade - currentContribution;
      const requiredAverage = (neededContribution * 100) / remainingPercentage;

      const recommendations = [];
      if (requiredAverage <= 0) {
        recommendations.push('Ya has alcanzado la nota objetivo');
      } else if (requiredAverage <= 3.0) {
        recommendations.push('Mantén un rendimiento regular en las actividades restantes');
      } else if (requiredAverage <= 4.0) {
        recommendations.push('Necesitas un buen rendimiento en las actividades restantes');
      } else if (requiredAverage <= 5.0) {
        recommendations.push('Requiere excelente rendimiento en todas las actividades restantes');
      } else {
        recommendations.push('La nota objetivo no es alcanzable con las notas actuales');
      }

      return {
        subjectCode: grade.subjectCode,
        currentGrade,
        projectedGrade: Math.min(5.0, currentGrade + (requiredAverage * remainingPercentage / 100)),
        minimumRequired: Math.max(0, requiredAverage),
        recommendations
      };
    });

  return {
    targetGrade,
    projections,
    summary: {
      achievableSubjects: projections.filter(p => p.minimumRequired <= 5.0).length,
      challengingSubjects: projections.filter(p => p.minimumRequired > 4.0 && p.minimumRequired <= 5.0).length,
      impossibleSubjects: projections.filter(p => p.minimumRequired > 5.0).length
    }
  };
}

function generateTrendsData(grades) {
  // Agrupar por semestre
  const bySemester = grades.reduce((acc, grade) => {
    if (!acc[grade.semester]) {
      acc[grade.semester] = [];
    }
    acc[grade.semester].push(grade);
    return acc;
  }, {});

  return Object.entries(bySemester).map(([semester, semesterGrades]) => ({
    period: semester,
    average: semesterGrades.reduce((sum, g) => sum + (g.finalGrade || g.currentGrade || 0), 0) / semesterGrades.length || 0,
    subjects: semesterGrades.length
  })).sort((a, b) => a.period.localeCompare(b.period));
}

async function generateComparisons(studentId, grades) {
  // Simulamos comparaciones (en una implementación real, consultarías datos estadísticos)
  return {
    previousSemester: 3.2,
    classAverage: 3.5,
    percentile: 75
  };
}

function generateReportHTML(report) {
  const { type, data, studentInfo } = report;
  
  let html = `
    <div class="report-container">
      <div class="report-header">
        <h1>${report.title}</h1>
        <p class="text-muted">Generado el ${new Date(report.createdAt).toLocaleDateString('es-ES')}</p>
        ${studentInfo ? `<p><strong>Estudiante:</strong> ${studentInfo.first_name} ${studentInfo.last_name}</p>` : ''}
      </div>
  `;

  if (data?.summary) {
    html += `
      <div class="report-section">
        <h2>Resumen Ejecutivo</h2>
        <div class="summary-grid">
          <div class="summary-item">
            <strong>Total de Materias:</strong> ${data.summary.totalSubjects || 0}
          </div>
          <div class="summary-item">
            <strong>Promedio General:</strong> ${(data.summary.averageGrade || 0).toFixed(2)}
          </div>
          <div class="summary-item">
            <strong>Materias Aprobadas:</strong> ${data.summary.passedSubjects || 0}
          </div>
          <div class="summary-item">
            <strong>Materias en Progreso:</strong> ${data.summary.inProgressSubjects || 0}
          </div>
        </div>
      </div>
    `;
  }

  if (type === 'performance' && data?.trends) {
    html += `
      <div class="report-section">
        <h2>Tendencias por Semestre</h2>
        <table class="table">
          <thead>
            <tr>
              <th>Semestre</th>
              <th>Promedio</th>
              <th>Materias</th>
            </tr>
          </thead>
          <tbody>
            ${data.trends.map(trend => `
              <tr>
                <td>${trend.period}</td>
                <td>${trend.average.toFixed(2)}</td>
                <td>${trend.subjects}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  if (type === 'projections' && data?.projections) {
    html += `
      <div class="report-section">
        <h2>Proyecciones de Notas</h2>
        <table class="table">
          <thead>
            <tr>
              <th>Materia</th>
              <th>Nota Actual</th>
              <th>Nota Proyectada</th>
              <th>Mínimo Requerido</th>
            </tr>
          </thead>
          <tbody>
            ${data.projections.map(proj => `
              <tr>
                <td>${proj.subjectCode}</td>
                <td>${proj.currentGrade.toFixed(2)}</td>
                <td>${proj.projectedGrade.toFixed(2)}</td>
                <td>${proj.minimumRequired.toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  html += `</div>`;
  
  return html;
}

function stripHtml(html) {
  return html.replace(/<[^>]*>/g, '');
}

async function generateReportPDF(report) {
  // Simulamos la generación de PDF
  // En una implementación real, usarías una librería como puppeteer o jsPDF
  const pdfContent = Buffer.from(`PDF Report: ${report.title}\nGenerated: ${new Date().toISOString()}\n\n${stripHtml(report.content.html || '')}`);
  return pdfContent;
}

// === RUTAS PARA GESTIÓN DE NOTAS DE ESTUDIANTES ===

// Página principal de mis materias del semestre
router.get('/my-courses', requireAuth, requireRole('student'), async (req, res) => {
  try {
    const { semester } = req.query;
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth();
    const defaultSemester = semester || `${currentYear}-${currentMonth < 6 ? '1' : '2'}`;
    
    const StudentGrade = require('../models/StudentGrade');
    
    // Obtener las materias del estudiante para el semestre
    const studentGrades = await StudentGrade.find({
      studentId: req.session.user.id,
      semester: defaultSemester
    }).populate('evaluationPlanId');
    
    // Obtener información adicional de materias desde Supabase
    const enrichedGrades = await Promise.all(
      studentGrades.map(async (grade) => {
        const { data: subjectInfo } = await supabase
          .from('subjects')
          .select('name, program_code')
          .eq('code', grade.subjectCode)
          .single();
        
        const { data: groupInfo } = await supabase
          .from('groups')
          .select('professor_id')
          .eq('subject_code', grade.subjectCode)
          .eq('semester', grade.semester)
          .eq('number', grade.groupNumber)
          .single();
        
        let professorInfo = null;
        if (groupInfo?.professor_id) {
          const { data: professor } = await supabase
            .from('employees')
            .select('first_name, last_name')
            .eq('id', groupInfo.professor_id)
            .single();
          professorInfo = professor;
        }
        
        return {
          ...grade.toObject(),
          subjectName: subjectInfo?.name || grade.subjectCode,
          programCode: subjectInfo?.program_code,
          professor: professorInfo
        };
      })
    );
    
    // Obtener semestres disponibles
    const { data: availableSemesters } = await supabase
      .from('groups')
      .select('semester')
      .order('semester', { ascending: false });
    
    const uniqueSemesters = [...new Set(availableSemesters?.map(s => s.semester) || [])];
    
    res.render('student/my-courses', {
      title: 'Mis Materias - Trackademic',
      user: req.session.user,
      courses: enrichedGrades,
      selectedSemester: defaultSemester,
      semesters: uniqueSemesters
    });
    
  } catch (error) {
    console.error('Error al cargar mis materias:', error);
    res.status(500).render('error', {
      title: 'Error - Trackademic',
      message: 'Error al cargar tus materias',
      error: { status: 500, stack: error.stack }
    });
  }
});

// Página para ingresar notas en un plan específico
router.get('/my-courses/:planId/grades', requireAuth, requireRole('student'), async (req, res) => {
  try {
    const { planId } = req.params;
    const StudentGrade = require('../models/StudentGrade');
    const EvaluationPlan = require('../models/EvaluationPlan');
    
    // Verificar si el estudiante ya tiene notas registradas para este plan
    let studentGrade = await StudentGrade.findOne({
      studentId: req.session.user.id,
      evaluationPlanId: planId
    }).populate('evaluationPlanId');
    
    // Si no existe, obtener el plan y crear el registro inicial
    if (!studentGrade) {
      const evaluationPlan = await EvaluationPlan.findById(planId);
      
      if (!evaluationPlan) {
        return res.status(404).render('error', {
          title: 'Error - Trackademic',
          message: 'Plan de evaluación no encontrado',
          error: { status: 404 }
        });
      }
      
      // Crear registro inicial de notas
      studentGrade = new StudentGrade({
        studentId: req.session.user.id,
        evaluationPlanId: planId,
        subjectCode: evaluationPlan.subjectCode,
        semester: evaluationPlan.semester,
        groupNumber: evaluationPlan.groupNumber,
        activities: evaluationPlan.activities.map(activity => ({
          name: activity.name,
          percentage: activity.percentage,
          score: null,
          maxScore: 5
        }))
      });
      
      await studentGrade.save();
      await studentGrade.populate('evaluationPlanId');
    }
    
    // Obtener información adicional del curso
    const { data: subjectInfo } = await supabase
      .from('subjects')
      .select('name, program_code')
      .eq('code', studentGrade.subjectCode)
      .single();
    
    res.render('student/grade-entry', {
      title: `Notas - ${studentGrade.subjectCode} - Trackademic`,
      user: req.session.user,
      studentGrade,
      subjectName: subjectInfo?.name || studentGrade.subjectCode
    });
    
  } catch (error) {
    console.error('Error al cargar página de notas:', error);
    res.status(500).render('error', {
      title: 'Error - Trackademic',
      message: 'Error al cargar la página de notas',
      error: { status: 500, stack: error.stack }
    });
  }
});

// API para actualizar una nota específica
router.post('/api/my-grades/:gradeId/activity/:activityName', requireAuth, requireRole('student'), async (req, res) => {
  try {
    const { gradeId, activityName } = req.params;
    const { score, notes } = req.body;
    
    const StudentGrade = require('../models/StudentGrade');
    const studentGrade = await StudentGrade.findOne({
      _id: gradeId,
      studentId: req.session.user.id
    });
    
    if (!studentGrade) {
      return res.status(404).json({
        success: false,
        message: 'Registro de notas no encontrado'
      });
    }
    
    const parsedScore = parseFloat(score);
    if (isNaN(parsedScore)) {
      return res.status(400).json({
        success: false,
        message: 'La nota debe ser un número válido'
      });
    }
    
    studentGrade.updateActivityScore(activityName, parsedScore, notes || '');
    await studentGrade.save();
    
    res.json({
      success: true,
      message: 'Nota actualizada exitosamente',
      currentGrade: studentGrade.currentGrade,
      progress: studentGrade.progress,
      isComplete: studentGrade.isComplete
    });
    
  } catch (error) {
    console.error('Error al actualizar nota:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error al actualizar la nota'
    });
  }
});

// API para eliminar una nota específica
router.delete('/api/my-grades/:gradeId/activity/:activityName', requireAuth, requireRole('student'), async (req, res) => {
  try {
    const { gradeId, activityName } = req.params;
    
    const StudentGrade = require('../models/StudentGrade');
    const studentGrade = await StudentGrade.findOne({
      _id: gradeId,
      studentId: req.session.user.id
    });
    
    if (!studentGrade) {
      return res.status(404).json({
        success: false,
        message: 'Registro de notas no encontrado'
      });
    }
    
    studentGrade.removeActivityScore(activityName);
    await studentGrade.save();
    
    res.json({
      success: true,
      message: 'Nota eliminada exitosamente',
      currentGrade: studentGrade.currentGrade,
      progress: studentGrade.progress,
      isComplete: studentGrade.isComplete
    });
    
  } catch (error) {
    console.error('Error al eliminar nota:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error al eliminar la nota'
    });
  }
});

// Página de consolidado por semestre
router.get('/my-semester-summary', requireAuth, requireRole('student'), async (req, res) => {
  try {
    const { semester } = req.query;
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth();
    const defaultSemester = semester || `${currentYear}-${currentMonth < 6 ? '1' : '2'}`;
    
    const StudentGrade = require('../models/StudentGrade');
    const summary = await StudentGrade.getSemesterSummary(req.session.user.id, defaultSemester);
    
    // Enriquecer con información de materias
    const enrichedSubjects = await Promise.all(
      summary.subjects.map(async (subject) => {
        const { data: subjectInfo } = await supabase
          .from('subjects')
          .select('name, program_code')
          .eq('code', subject.subjectCode)
          .single();
        
        return {
          ...subject,
          subjectName: subjectInfo?.name || subject.subjectCode,
          programCode: subjectInfo?.program_code
        };
      })
    );
    
    summary.subjects = enrichedSubjects;
    
    // Obtener semestres disponibles
    const { data: availableSemesters } = await supabase
      .from('groups')
      .select('semester')
      .order('semester', { ascending: false });
    
    const uniqueSemesters = [...new Set(availableSemesters?.map(s => s.semester) || [])];
    
    res.render('student/semester-summary', {
      title: `Consolidado ${defaultSemester} - Trackademic`,
      user: req.session.user,
      summary,
      selectedSemester: defaultSemester,
      semesters: uniqueSemesters
    });
    
  } catch (error) {
    console.error('Error al cargar consolidado:', error);
    res.status(500).render('error', {
      title: 'Error - Trackademic',
      message: 'Error al cargar el consolidado del semestre',
      error: { status: 500, stack: error.stack }
    });
  }
});

// Ruta para agregar materia desde catálogo existente
router.post('/api/my-courses/add-from-catalog', requireAuth, requireRole('student'), async (req, res) => {
  try {
    const { evaluationPlanId } = req.body;
    
    const EvaluationPlan = require('../models/EvaluationPlan');
    const StudentGrade = require('../models/StudentGrade');
    
    const evaluationPlan = await EvaluationPlan.findById(evaluationPlanId);
    
    if (!evaluationPlan) {
      return res.status(404).json({
        success: false,
        message: 'Plan de evaluación no encontrado'
      });
    }
    
    // Verificar si el estudiante ya tiene este curso agregado
    const existingGrade = await StudentGrade.findOne({
      studentId: req.session.user.id,
      evaluationPlanId: evaluationPlanId
    });
    
    if (existingGrade) {
      return res.status(400).json({
        success: false,
        message: 'Ya tienes esta materia agregada'
      });
    }
    
    // Crear registro de notas para el estudiante
    const studentGrade = new StudentGrade({
      studentId: req.session.user.id,
      evaluationPlanId: evaluationPlanId,
      subjectCode: evaluationPlan.subjectCode,
      semester: evaluationPlan.semester,
      groupNumber: evaluationPlan.groupNumber,
      activities: evaluationPlan.activities.map(activity => ({
        name: activity.name,
        percentage: activity.percentage,
        score: null,
        maxScore: 5
      }))
    });
    
    await studentGrade.save();
    
    res.json({
      success: true,
      message: 'Materia agregada exitosamente',
      gradeId: studentGrade._id
    });
    
  } catch (error) {
    console.error('Error al agregar materia:', error);
    res.status(500).json({
      success: false,
      message: 'Error al agregar la materia'
    });
  }
});

// Crear plan de evaluación (página específica)
router.get('/create-evaluation-plan', requireAuth, async (req, res) => {
  try {
    const user = req.session.user;
    
    // Verificar que el usuario tenga permisos para crear planes
    if (!['professor', 'coordinator', 'admin', 'student'].includes(user.role)) {
      return res.render('error', {
        title: 'Acceso Denegado',
        error: { status: 403, message: 'No tienes permisos para crear planes de evaluación.' },
        user
      });
    }
    
    // Obtener semestres y materias disponibles
    const { data: subjects } = await supabase
      .from('subjects')
      .select('code, name')
      .order('code');
    
    // Obtener grupos si es profesor
    let groups = [];
    if (user.role === 'professor') {
      const { data: professorGroups } = await supabase
        .from('groups')
        .select('subject_code, semester, number')
        .eq('professor_id', user.id);
      groups = professorGroups || [];
    }
    
    res.render('evaluation-plans/create', {
      title: 'Crear Plan de Evaluación - Trackademic',
      user,
      subjects: subjects || [],
      groups
    });
  } catch (error) {
    logger.error('Error al cargar formulario de creación:', error);
    res.render('error', {
      title: 'Error',
      error: { status: 500, message: 'Error interno del servidor' },
      user: req.session.user
    });
  }
});

module.exports = router; 