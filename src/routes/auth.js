const express = require('express');
const { supabase, supabaseAdmin } = require('../config/database');
const { authenticate } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

// POST /api/auth/login - Iniciar sesión
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email y contraseña son requeridos'
      });
    }
    
    // Autenticar con Supabase
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    
    if (error) {
      logger.warn('Fallo en login:', { email, error: error.message });
      return res.status(401).json({
        success: false,
        error: 'Credenciales inválidas'
      });
    }
    
    // Obtener información del usuario desde la base de datos
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
      .eq('id', data.user.id)
      .single();
    
    let userInfo = {
      id: data.user.id,
      email: data.user.email,
      role: 'student'
    };
    
    if (!profileError && userProfile) {
      // Determinar rol basado en employee_type
      let role = 'student';
      if (userProfile.employee_type === 'Profesor') {
        role = 'professor';
      } else if (userProfile.employee_type === 'Coordinador') {
        role = 'coordinator';
      } else if (userProfile.employee_type === 'Administrador') {
        role = 'admin';
      }
      
      userInfo = {
        id: data.user.id,
        email: data.user.email,
        firstName: userProfile.first_name,
        lastName: userProfile.last_name,
        role: role,
        employeeType: userProfile.employee_type,
        facultyCode: userProfile.faculty_code,
        campusCode: userProfile.campus_code,
        faculty: userProfile.faculties
      };
    }
    
    logger.info('Login exitoso:', { userId: userInfo.id, email: userInfo.email, role: userInfo.role });
    
    res.status(200).json({
      success: true,
      message: 'Login exitoso',
      user: userInfo,
      token: data.session.access_token
    });
  } catch (error) {
    logger.error('Error en login:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

// POST /api/auth/register - Registrar nuevo usuario (solo estudiantes)
router.post('/register', async (req, res) => {
  try {
    const { email, password, firstName, lastName } = req.body;
    
    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({
        success: false,
        error: 'Todos los campos son requeridos'
      });
    }
    
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'La contraseña debe tener al menos 6 caracteres'
      });
    }
    
    // Registrar usuario en Supabase Auth
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
      logger.warn('Error en registro:', { email, error: error.message });
      
      if (error.message.includes('already registered')) {
        return res.status(400).json({
          success: false,
          error: 'Este email ya está registrado'
        });
      }
      
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }
    
    const userInfo = {
      id: data.user.id,
      email: data.user.email,
      firstName,
      lastName,
      role: 'student'
    };
    
    logger.info('Registro exitoso:', { userId: userInfo.id, email: userInfo.email });
    
    res.status(201).json({
      success: true,
      message: 'Usuario registrado exitosamente. Verifica tu email para activar la cuenta.',
      user: userInfo,
      token: data.session?.access_token || null
    });
  } catch (error) {
    logger.error('Error en registro:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

// POST /api/auth/logout - Cerrar sesión
router.post('/logout', authenticate, async (req, res) => {
  try {
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      logger.warn('Error en logout:', { userId: req.user.id, error: error.message });
    }
    
    logger.info('Logout exitoso:', { userId: req.user.id });
    
    res.status(200).json({
      success: true,
      message: 'Sesión cerrada exitosamente'
    });
  } catch (error) {
    logger.error('Error en logout:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

// GET /api/auth/profile - Obtener perfil del usuario autenticado
router.get('/profile', authenticate, async (req, res) => {
  try {
    res.status(200).json({
      success: true,
      user: req.user
    });
  } catch (error) {
    logger.error('Error obteniendo perfil:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

// POST /api/auth/forgot-password - Solicitar reset de contraseña
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email es requerido'
      });
    }
    
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password`
    });
    
    if (error) {
      logger.warn('Error enviando reset de contraseña:', { email, error: error.message });
      return res.status(400).json({
        success: false,
        error: 'Error enviando email de reset'
      });
    }
    
    logger.info('Reset de contraseña solicitado:', { email });
    
    res.status(200).json({
      success: true,
      message: 'Se ha enviado un email con instrucciones para resetear tu contraseña'
    });
  } catch (error) {
    logger.error('Error en forgot-password:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

// POST /api/auth/update-password - Actualizar contraseña
router.post('/update-password', authenticate, async (req, res) => {
  try {
    const { newPassword } = req.body;
    
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'La nueva contraseña debe tener al menos 6 caracteres'
      });
    }
    
    const { error } = await supabase.auth.updateUser({
      password: newPassword
    });
    
    if (error) {
      logger.warn('Error actualizando contraseña:', { userId: req.user.id, error: error.message });
      return res.status(400).json({
        success: false,
        error: 'Error actualizando contraseña'
      });
    }
    
    logger.info('Contraseña actualizada:', { userId: req.user.id });
    
    res.status(200).json({
      success: true,
      message: 'Contraseña actualizada exitosamente'
    });
  } catch (error) {
    logger.error('Error actualizando contraseña:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

module.exports = router; 