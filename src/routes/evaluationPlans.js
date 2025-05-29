const express = require('express');
const { authenticate, authorize, checkEvaluationPlanAccess } = require('../middleware/auth');
const EvaluationPlan = require('../models/EvaluationPlan');
const { supabase } = require('../config/database');
const logger = require('../utils/logger');

const router = express.Router();

// GET /api/evaluation-plans - Obtener todos los planes de evaluación
router.get('/', authenticate, async (req, res) => {
  try {
    const {
      semester,
      subjectCode,
      professorId,
      approved,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const query = { isActive: true };
    
    // Filtros básicos
    if (semester) query.semester = semester;
    if (subjectCode) query.subjectCode = subjectCode.toUpperCase();
    if (professorId) query.professorId = professorId;
    if (approved !== undefined) query.isApproved = approved === 'true';
    
    // Control de acceso por rol
    if (req.user.role === 'student') {
      query.isApproved = true; // Estudiantes solo ven planes aprobados
    } else if (req.user.role === 'professor') {
      // Profesores ven sus propios planes y los aprobados
      const professorQuery = {
        $or: [
          { professorId: req.user.id },
          { isApproved: true }
        ]
      };
      Object.assign(query, professorQuery);
    } else if (req.user.role === 'coordinator') {
      // Coordinadores ven planes de su facultad
      const { data: facultyProfessors } = await supabase
        .from('employees')
        .select('id')
        .eq('faculty_code', req.user.facultyCode)
        .eq('employee_type', 'Profesor');
      
      if (facultyProfessors) {
        const professorIds = facultyProfessors.map(p => p.id);
        query.professorId = { $in: professorIds };
      }
    }
    // Administradores ven todo (sin filtro adicional)

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortDirection = sortOrder === 'desc' ? -1 : 1;

    const plans = await EvaluationPlan.find(query)
      .sort({ [sortBy]: sortDirection })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const total = await EvaluationPlan.countDocuments(query);

    // Enriquecer con información de materia y profesor
    const enrichedPlans = await Promise.all(
      plans.map(async (plan) => {
        const [subjectInfo, professorInfo] = await Promise.all([
          supabase
            .from('subjects')
            .select('name')
            .eq('code', plan.subjectCode)
            .single(),
          supabase
            .from('employees')
            .select('first_name, last_name, email')
            .eq('id', plan.professorId)
            .single()
        ]);

        return {
          ...plan,
          subjectName: subjectInfo.data?.name || plan.subjectCode,
          professorName: professorInfo.data 
            ? `${professorInfo.data.first_name} ${professorInfo.data.last_name}`
            : 'Profesor no encontrado'
        };
      })
    );

    res.status(200).json({
      success: true,
      data: enrichedPlans,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    logger.error('Error obteniendo planes de evaluación:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

// GET /api/evaluation-plans/:id - Obtener un plan específico
router.get('/:id', authenticate, checkEvaluationPlanAccess, async (req, res) => {
  try {
    const plan = await EvaluationPlan.findById(req.params.id);
    
    if (!plan) {
      return res.status(404).json({
        success: false,
        error: 'Plan de evaluación no encontrado'
      });
    }

    // Enriquecer con información adicional
    const [subjectInfo, professorInfo] = await Promise.all([
      supabase
        .from('subjects')
        .select('name, programs:program_code (name)')
        .eq('code', plan.subjectCode)
        .single(),
      supabase
        .from('employees')
        .select(`
          first_name, 
          last_name, 
          email,
          faculties:faculty_code (name)
        `)
        .eq('id', plan.professorId)
        .single()
    ]);

    const enrichedPlan = {
      ...plan.toObject(),
      subjectName: subjectInfo.data?.name || plan.subjectCode,
      programName: subjectInfo.data?.programs?.name,
      professorName: professorInfo.data 
        ? `${professorInfo.data.first_name} ${professorInfo.data.last_name}`
        : 'Profesor no encontrado',
      professorEmail: professorInfo.data?.email,
      facultyName: professorInfo.data?.faculties?.name
    };

    res.status(200).json({
      success: true,
      data: enrichedPlan
    });
  } catch (error) {
    logger.error('Error obteniendo plan de evaluación:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

// POST /api/evaluation-plans - Crear nuevo plan de evaluación
router.post('/', authenticate, async (req, res) => {
  try {
    const {
      semester,
      subjectCode,
      groupNumber,
      professorId,
      activities
    } = req.body;

    // Validaciones
    if (!semester || !subjectCode || !groupNumber || !professorId || !activities) {
      return res.status(400).json({
        success: false,
        error: 'Todos los campos son requeridos'
      });
    }

    if (!Array.isArray(activities) || activities.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Debe incluir al menos una actividad'
      });
    }

    // Verificar que la suma de porcentajes sea 100%
    const totalPercentage = activities.reduce((sum, activity) => sum + activity.percentage, 0);
    if (Math.abs(totalPercentage - 100) > 0.01) {
      return res.status(400).json({
        success: false,
        error: 'La suma de los porcentajes debe ser exactamente 100%'
      });
    }

    // Verificar que el profesor existe y puede crear el plan
    if (req.user.role === 'professor' && professorId !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Solo puedes crear planes para tus propias materias'
      });
    }

    // Verificar que la materia y grupo existen
    const [subjectExists, groupExists] = await Promise.all([
      supabase
        .from('subjects')
        .select('code')
        .eq('code', subjectCode.toUpperCase())
        .single(),
      supabase
        .from('groups')
        .select('*')
        .eq('subject_code', subjectCode.toUpperCase())
        .eq('number', groupNumber)
        .eq('semester', semester)
        .eq('professor_id', professorId)
        .single()
    ]);

    if (subjectExists.error) {
      return res.status(400).json({
        success: false,
        error: 'La materia especificada no existe'
      });
    }

    if (groupExists.error) {
      return res.status(400).json({
        success: false,
        error: 'El grupo especificado no existe o no corresponde al profesor'
      });
    }

    // Crear el plan
    const planData = {
      semester,
      subjectCode: subjectCode.toUpperCase(),
      groupNumber,
      professorId,
      activities,
      createdBy: req.user.id,
      isApproved: req.user.role === 'admin' // Admins pueden auto-aprobar
    };

    const plan = new EvaluationPlan(planData);
    await plan.save();

    logger.info('Plan de evaluación creado:', {
      planId: plan._id,
      createdBy: req.user.id,
      semester,
      subjectCode,
      groupNumber
    });

    res.status(201).json({
      success: true,
      message: 'Plan de evaluación creado exitosamente',
      data: plan
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        error: 'Ya existe un plan de evaluación para esta materia, grupo y semestre'
      });
    }

    logger.error('Error creando plan de evaluación:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

// PUT /api/evaluation-plans/:id - Actualizar plan de evaluación
router.put('/:id', authenticate, checkEvaluationPlanAccess, async (req, res) => {
  try {
    const plan = await EvaluationPlan.findById(req.params.id);
    
    if (!plan) {
      return res.status(404).json({
        success: false,
        error: 'Plan de evaluación no encontrado'
      });
    }

    // Solo el creador, el profesor de la materia o un admin pueden modificar
    if (req.user.role !== 'admin' && 
        plan.createdBy !== req.user.id && 
        plan.professorId !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'No tienes permisos para modificar este plan'
      });
    }

    const { activities, ...otherUpdates } = req.body;

    // Si se actualizan actividades, validar porcentajes
    if (activities) {
      if (!Array.isArray(activities) || activities.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Debe incluir al menos una actividad'
        });
      }

      const totalPercentage = activities.reduce((sum, activity) => sum + activity.percentage, 0);
      if (Math.abs(totalPercentage - 100) > 0.01) {
        return res.status(400).json({
          success: false,
          error: 'La suma de los porcentajes debe ser exactamente 100%'
        });
      }
    }

    // Actualizar campos permitidos
    const allowedUpdates = ['activities', 'metadata'];
    const updates = {};
    
    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    // Si el plan ya estaba aprobado y se modificó, requiere nueva aprobación
    if (plan.isApproved && (activities || otherUpdates.activities)) {
      updates.isApproved = false;
      updates.approvedBy = null;
      updates.approvedAt = null;
    }

    Object.assign(plan, updates);
    await plan.save();

    logger.info('Plan de evaluación actualizado:', {
      planId: plan._id,
      updatedBy: req.user.id
    });

    res.status(200).json({
      success: true,
      message: 'Plan de evaluación actualizado exitosamente',
      data: plan
    });
  } catch (error) {
    logger.error('Error actualizando plan de evaluación:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

// DELETE /api/evaluation-plans/:id - Eliminar plan de evaluación
router.delete('/:id', authenticate, checkEvaluationPlanAccess, async (req, res) => {
  try {
    const plan = await EvaluationPlan.findById(req.params.id);
    
    if (!plan) {
      return res.status(404).json({
        success: false,
        error: 'Plan de evaluación no encontrado'
      });
    }

    // Solo el creador o un admin pueden eliminar
    if (req.user.role !== 'admin' && plan.createdBy !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'No tienes permisos para eliminar este plan'
      });
    }

    // Soft delete
    plan.isActive = false;
    await plan.save();

    logger.info('Plan de evaluación eliminado:', {
      planId: plan._id,
      deletedBy: req.user.id
    });

    res.status(200).json({
      success: true,
      message: 'Plan de evaluación eliminado exitosamente'
    });
  } catch (error) {
    logger.error('Error eliminando plan de evaluación:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

// POST /api/evaluation-plans/:id/approve - Aprobar plan de evaluación
router.post('/:id/approve', authenticate, authorize('coordinator', 'admin'), async (req, res) => {
  try {
    const plan = await EvaluationPlan.findById(req.params.id);
    
    if (!plan) {
      return res.status(404).json({
        success: false,
        error: 'Plan de evaluación no encontrado'
      });
    }

    if (plan.isApproved) {
      return res.status(400).json({
        success: false,
        error: 'El plan ya está aprobado'
      });
    }

    await plan.approve(req.user.id);

    logger.info('Plan de evaluación aprobado:', {
      planId: plan._id,
      approvedBy: req.user.id
    });

    res.status(200).json({
      success: true,
      message: 'Plan de evaluación aprobado exitosamente',
      data: plan
    });
  } catch (error) {
    logger.error('Error aprobando plan de evaluación:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

module.exports = router; 