const { supabase } = require('../config/database');
const logger = require('../utils/logger');

// Verificar token de autenticación
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Token de autenticación requerido'
      });
    }
    
    const token = authHeader.split(' ')[1];
    
    // Verificar el token con Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      logger.warn('Token inválido:', { error: error?.message, token: token.substring(0, 20) + '...' });
      return res.status(401).json({
        success: false,
        error: 'Token inválido o expirado'
      });
    }
    
    // Obtener información adicional del usuario desde la base de datos
    const { data: userProfile, error: profileError } = await supabase
      .from('employees')
      .select(`
        id,
        first_name,
        last_name,
        email,
        employee_type,
        faculty_code,
        campus_code,
        faculties:faculty_code (
          name,
          location
        )
      `)
      .eq('id', user.id)
      .single();
    
    if (profileError) {
      logger.warn('Usuario no encontrado en empleados:', { userId: user.id, error: profileError.message });
      
      // Si no es empleado, asumir que es estudiante
      req.user = {
        id: user.id,
        email: user.email,
        role: 'student',
        employeeType: null,
        facultyCode: null,
        campusCode: null
      };
    } else {
      // Determinar rol basado en employee_type
      let role = 'student';
      if (userProfile.employee_type === 'Profesor') {
        role = 'professor';
      } else if (userProfile.employee_type === 'Coordinador') {
        role = 'coordinator';
      } else if (userProfile.employee_type === 'Administrador') {
        role = 'admin';
      }
      
      req.user = {
        id: user.id,
        email: user.email,
        firstName: userProfile.first_name,
        lastName: userProfile.last_name,
        role: role,
        employeeType: userProfile.employee_type,
        facultyCode: userProfile.faculty_code,
        campusCode: userProfile.campus_code,
        faculty: userProfile.faculties
      };
    }
    
    logger.info('Usuario autenticado:', { 
      userId: req.user.id, 
      role: req.user.role, 
      email: req.user.email 
    });
    
    next();
  } catch (error) {
    logger.error('Error en autenticación:', error);
    return res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
};

// Middleware para verificar roles específicos
const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Usuario no autenticado'
      });
    }
    
    if (!allowedRoles.includes(req.user.role)) {
      logger.warn('Acceso denegado por rol:', { 
        userId: req.user.id, 
        userRole: req.user.role, 
        allowedRoles 
      });
      
      return res.status(403).json({
        success: false,
        error: 'No tienes permisos para acceder a este recurso'
      });
    }
    
    next();
  };
};

// Middleware para verificar si el usuario puede acceder a recursos de una facultad específica
const checkFacultyAccess = async (req, res, next) => {
  try {
    const { facultyCode } = req.params;
    
    if (!facultyCode) {
      return next();
    }
    
    // Administradores tienen acceso a todo
    if (req.user.role === 'admin') {
      return next();
    }
    
    // Verificar si el usuario pertenece a la facultad
    if (req.user.facultyCode && req.user.facultyCode.toString() === facultyCode) {
      return next();
    }
    
    logger.warn('Acceso denegado a facultad:', { 
      userId: req.user.id, 
      userFaculty: req.user.facultyCode, 
      requestedFaculty: facultyCode 
    });
    
    return res.status(403).json({
      success: false,
      error: 'No tienes permisos para acceder a los datos de esta facultad'
    });
  } catch (error) {
    logger.error('Error verificando acceso a facultad:', error);
    return res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
};

// Middleware para verificar si el usuario puede acceder a un plan de evaluación
const checkEvaluationPlanAccess = async (req, res, next) => {
  try {
    const { planId } = req.params;
    
    if (!planId) {
      return next();
    }
    
    const EvaluationPlan = require('../models/EvaluationPlan');
    const plan = await EvaluationPlan.findById(planId);
    
    if (!plan) {
      return res.status(404).json({
        success: false,
        error: 'Plan de evaluación no encontrado'
      });
    }
    
    // Administradores tienen acceso total
    if (req.user.role === 'admin') {
      return next();
    }
    
    // Profesores pueden acceder a sus propios planes
    if (req.user.role === 'professor' && plan.professorId === req.user.id) {
      return next();
    }
    
    // Coordinadores pueden acceder a planes de su facultad
    if (req.user.role === 'coordinator') {
      // Verificar si el profesor del plan pertenece a la misma facultad
      const { data: professorData } = await supabase
        .from('employees')
        .select('faculty_code')
        .eq('id', plan.professorId)
        .single();
      
      if (professorData && professorData.faculty_code === req.user.facultyCode) {
        return next();
      }
    }
    
    // Estudiantes pueden acceder a cualquier plan (con advertencias en la UI)
    if (req.user.role === 'student') {
      return next();
    }
    
    logger.warn('Acceso denegado a plan de evaluación:', { 
      userId: req.user.id, 
      userRole: req.user.role, 
      planId, 
      planProfessorId: plan.professorId 
    });
    
    return res.status(403).json({
      success: false,
      error: 'No tienes permisos para acceder a este plan de evaluación'
    });
  } catch (error) {
    logger.error('Error verificando acceso a plan de evaluación:', error);
    return res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
};

// Middleware para verificar ownership de recurso
const checkOwnership = (resourceUserIdField = 'userId') => {
  return (req, res, next) => {
    const resourceUserId = req.body[resourceUserIdField] || req.params[resourceUserIdField];
    
    // Administradores pueden acceder a cualquier recurso
    if (req.user.role === 'admin') {
      return next();
    }
    
    // Verificar si el usuario es el propietario del recurso
    if (resourceUserId && resourceUserId === req.user.id) {
      return next();
    }
    
    logger.warn('Acceso denegado por ownership:', { 
      userId: req.user.id, 
      resourceUserId, 
      field: resourceUserIdField 
    });
    
    return res.status(403).json({
      success: false,
      error: 'No tienes permisos para acceder a este recurso'
    });
  };
};

// Middleware opcional de autenticación (no falla si no hay token)
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }
    
    const token = authHeader.split(' ')[1];
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (!error && user) {
      // Obtener información del usuario si el token es válido
      const { data: userProfile } = await supabase
        .from('employees')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (userProfile) {
        let role = 'student';
        if (userProfile.employee_type === 'Profesor') role = 'professor';
        else if (userProfile.employee_type === 'Coordinador') role = 'coordinator';
        else if (userProfile.employee_type === 'Administrador') role = 'admin';
        
        req.user = {
          id: user.id,
          email: user.email,
          firstName: userProfile.first_name,
          lastName: userProfile.last_name,
          role: role,
          employeeType: userProfile.employee_type,
          facultyCode: userProfile.faculty_code,
          campusCode: userProfile.campus_code
        };
      } else {
        req.user = {
          id: user.id,
          email: user.email,
          role: 'student'
        };
      }
    }
    
    next();
  } catch (error) {
    // En caso de error, simplemente continuar sin usuario autenticado
    next();
  }
};

module.exports = {
  authenticate,
  authorize,
  checkFacultyAccess,
  checkEvaluationPlanAccess,
  checkOwnership,
  optionalAuth
}; 