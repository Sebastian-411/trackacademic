const express = require('express');
const { authenticate, checkEvaluationPlanAccess } = require('../middleware/auth');
const Comment = require('../models/Comment');
const EvaluationPlan = require('../models/EvaluationPlan');
const logger = require('../utils/logger');

const router = express.Router();

// GET /api/comments/plan/:planId - Obtener comentarios de un plan de evaluación
router.get('/plan/:planId', authenticate, checkEvaluationPlanAccess, async (req, res) => {
  try {
    const { planId } = req.params;
    const {
      status = 'active',
      type,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      page = 1,
      limit = 20
    } = req.query;

    const options = {
      status,
      type,
      sortBy,
      sortOrder: sortOrder === 'desc' ? -1 : 1,
      limit: parseInt(limit),
      skip: (parseInt(page) - 1) * parseInt(limit)
    };

    const comments = await Comment.findByEvaluationPlan(planId, options);
    const total = await Comment.countDocuments({ 
      evaluationPlanId: planId,
      ...(status !== 'all' && { status })
    });

    res.status(200).json({
      success: true,
      data: comments,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    logger.error('Error obteniendo comentarios:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

// POST /api/comments - Crear nuevo comentario
router.post('/', authenticate, async (req, res) => {
  try {
    const {
      evaluationPlanId,
      content,
      type = 'feedback',
      priority = 'medium',
      tags = []
    } = req.body;

    if (!evaluationPlanId || !content) {
      return res.status(400).json({
        success: false,
        error: 'Plan de evaluación y contenido son requeridos'
      });
    }

    // Verificar que el plan de evaluación existe
    const plan = await EvaluationPlan.findById(evaluationPlanId);
    if (!plan) {
      return res.status(404).json({
        success: false,
        error: 'Plan de evaluación no encontrado'
      });
    }

    // Verificar acceso al plan
    if (req.user.role === 'student' && !plan.isApproved) {
      return res.status(403).json({
        success: false,
        error: 'No puedes comentar en un plan no aprobado'
      });
    }

    const commentData = {
      evaluationPlanId,
      userId: req.user.id,
      content: content.trim(),
      type,
      priority,
      tags: tags.map(tag => tag.toLowerCase().trim()),
      metadata: {
        userRole: req.user.role
      }
    };

    const comment = new Comment(commentData);
    await comment.save();

    logger.info('Comentario creado:', {
      commentId: comment._id,
      userId: req.user.id,
      planId: evaluationPlanId,
      type
    });

    res.status(201).json({
      success: true,
      message: 'Comentario creado exitosamente',
      data: comment
    });
  } catch (error) {
    logger.error('Error creando comentario:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

// GET /api/comments/:id - Obtener comentario específico
router.get('/:id', authenticate, async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id)
      .populate('evaluationPlanId', 'semester subjectCode groupNumber professorId isApproved');

    if (!comment) {
      return res.status(404).json({
        success: false,
        error: 'Comentario no encontrado'
      });
    }

    // Verificar acceso al plan de evaluación del comentario
    const plan = comment.evaluationPlanId;
    if (req.user.role === 'student' && !plan.isApproved) {
      return res.status(403).json({
        success: false,
        error: 'No tienes acceso a este comentario'
      });
    }

    if (req.user.role === 'professor' && plan.professorId !== req.user.id && !plan.isApproved) {
      return res.status(403).json({
        success: false,
        error: 'No tienes acceso a este comentario'
      });
    }

    res.status(200).json({
      success: true,
      data: comment
    });
  } catch (error) {
    logger.error('Error obteniendo comentario:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

// PUT /api/comments/:id - Editar comentario
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { content } = req.body;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'El contenido del comentario es requerido'
      });
    }

    const comment = await Comment.findById(req.params.id);

    if (!comment) {
      return res.status(404).json({
        success: false,
        error: 'Comentario no encontrado'
      });
    }

    // Solo el autor puede editar el comentario
    if (comment.userId !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Solo puedes editar tus propios comentarios'
      });
    }

    await comment.editContent(content.trim(), req.user.id);

    logger.info('Comentario editado:', {
      commentId: comment._id,
      userId: req.user.id
    });

    res.status(200).json({
      success: true,
      message: 'Comentario editado exitosamente',
      data: comment
    });
  } catch (error) {
    logger.error('Error editando comentario:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Error interno del servidor'
    });
  }
});

// DELETE /api/comments/:id - Eliminar comentario
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);

    if (!comment) {
      return res.status(404).json({
        success: false,
        error: 'Comentario no encontrado'
      });
    }

    // Solo el autor o admin pueden eliminar
    if (comment.userId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'No tienes permisos para eliminar este comentario'
      });
    }

    await Comment.findByIdAndDelete(req.params.id);

    logger.info('Comentario eliminado:', {
      commentId: req.params.id,
      userId: req.user.id
    });

    res.status(200).json({
      success: true,
      message: 'Comentario eliminado exitosamente'
    });
  } catch (error) {
    logger.error('Error eliminando comentario:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

// POST /api/comments/:id/like - Dar/quitar like a comentario
router.post('/:id/like', authenticate, async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);

    if (!comment) {
      return res.status(404).json({
        success: false,
        error: 'Comentario no encontrado'
      });
    }

    // Verificar si el usuario ya dio like
    const existingLike = comment.likes.find(like => like.userId === req.user.id);

    if (existingLike) {
      // Quitar like
      await comment.removeLike(req.user.id);
      logger.info('Like removido:', { commentId: comment._id, userId: req.user.id });
      
      res.status(200).json({
        success: true,
        message: 'Like removido exitosamente',
        data: { liked: false, likesCount: comment.likesCount }
      });
    } else {
      // Agregar like
      await comment.addLike(req.user.id);
      logger.info('Like agregado:', { commentId: comment._id, userId: req.user.id });
      
      res.status(200).json({
        success: true,
        message: 'Like agregado exitosamente',
        data: { liked: true, likesCount: comment.likesCount }
      });
    }
  } catch (error) {
    logger.error('Error en like/unlike:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Error interno del servidor'
    });
  }
});

// POST /api/comments/:id/replies - Agregar respuesta a comentario
router.post('/:id/replies', authenticate, async (req, res) => {
  try {
    const { content } = req.body;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'El contenido de la respuesta es requerido'
      });
    }

    const comment = await Comment.findById(req.params.id);

    if (!comment) {
      return res.status(404).json({
        success: false,
        error: 'Comentario no encontrado'
      });
    }

    const replyData = {
      userId: req.user.id,
      content: content.trim()
    };

    await comment.addReply(replyData);

    logger.info('Respuesta agregada:', {
      commentId: comment._id,
      userId: req.user.id
    });

    res.status(201).json({
      success: true,
      message: 'Respuesta agregada exitosamente',
      data: comment
    });
  } catch (error) {
    logger.error('Error agregando respuesta:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

// PUT /api/comments/:id/replies/:replyId - Editar respuesta
router.put('/:id/replies/:replyId', authenticate, async (req, res) => {
  try {
    const { content } = req.body;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'El contenido de la respuesta es requerido'
      });
    }

    const comment = await Comment.findById(req.params.id);

    if (!comment) {
      return res.status(404).json({
        success: false,
        error: 'Comentario no encontrado'
      });
    }

    await comment.editReply(req.params.replyId, content.trim(), req.user.id);

    logger.info('Respuesta editada:', {
      commentId: comment._id,
      replyId: req.params.replyId,
      userId: req.user.id
    });

    res.status(200).json({
      success: true,
      message: 'Respuesta editada exitosamente',
      data: comment
    });
  } catch (error) {
    logger.error('Error editando respuesta:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Error interno del servidor'
    });
  }
});

// DELETE /api/comments/:id/replies/:replyId - Eliminar respuesta
router.delete('/:id/replies/:replyId', authenticate, async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);

    if (!comment) {
      return res.status(404).json({
        success: false,
        error: 'Comentario no encontrado'
      });
    }

    await comment.removeReply(req.params.replyId, req.user.id);

    logger.info('Respuesta eliminada:', {
      commentId: comment._id,
      replyId: req.params.replyId,
      userId: req.user.id
    });

    res.status(200).json({
      success: true,
      message: 'Respuesta eliminada exitosamente',
      data: comment
    });
  } catch (error) {
    logger.error('Error eliminando respuesta:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Error interno del servidor'
    });
  }
});

// POST /api/comments/:id/resolve - Resolver comentario (coordinadores/admin)
router.post('/:id/resolve', authenticate, async (req, res) => {
  try {
    if (!['coordinator', 'admin'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Solo coordinadores y administradores pueden resolver comentarios'
      });
    }

    const comment = await Comment.findById(req.params.id);

    if (!comment) {
      return res.status(404).json({
        success: false,
        error: 'Comentario no encontrado'
      });
    }

    if (comment.status === 'resolved') {
      return res.status(400).json({
        success: false,
        error: 'El comentario ya está resuelto'
      });
    }

    await comment.resolve(req.user.id);

    logger.info('Comentario resuelto:', {
      commentId: comment._id,
      resolvedBy: req.user.id
    });

    res.status(200).json({
      success: true,
      message: 'Comentario resuelto exitosamente',
      data: comment
    });
  } catch (error) {
    logger.error('Error resolviendo comentario:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

// GET /api/comments/plan/:planId/statistics - Obtener estadísticas de comentarios
router.get('/plan/:planId/statistics', authenticate, checkEvaluationPlanAccess, async (req, res) => {
  try {
    const { planId } = req.params;
    
    const statistics = await Comment.getCommentStatistics(planId);

    res.status(200).json({
      success: true,
      data: statistics.length > 0 ? statistics[0] : {
        totalComments: 0,
        totalActive: 0,
        totalResolved: 0,
        totalLikes: 0,
        byType: []
      }
    });
  } catch (error) {
    logger.error('Error obteniendo estadísticas de comentarios:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

// GET /api/comments/user/:userId - Obtener comentarios del usuario
router.get('/user/:userId', authenticate, async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Solo el propio usuario o admin pueden ver comentarios de usuario
    if (userId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'No tienes permisos para ver los comentarios de este usuario'
      });
    }

    const {
      status = 'active',
      page = 1,
      limit = 20
    } = req.query;

    const query = { userId };
    if (status !== 'all') {
      query.status = status;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const comments = await Comment.find(query)
      .populate('evaluationPlanId', 'semester subjectCode groupNumber')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Comment.countDocuments(query);

    res.status(200).json({
      success: true,
      data: comments,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    logger.error('Error obteniendo comentarios del usuario:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

module.exports = router; 