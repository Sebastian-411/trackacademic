const mongoose = require('mongoose');

const replySchema = new mongoose.Schema({
  userId: {
    type: String,
    required: [true, 'El ID del usuario es requerido'],
    trim: true
  },
  content: {
    type: String,
    required: [true, 'El contenido de la respuesta es requerido'],
    trim: true,
    maxlength: [1000, 'La respuesta no puede exceder 1000 caracteres']
  },
  isEdited: {
    type: Boolean,
    default: false
  },
  editedAt: {
    type: Date
  }
}, {
  timestamps: true
});

const commentSchema = new mongoose.Schema({
  evaluationPlanId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'EvaluationPlan',
    required: [true, 'El ID del plan de evaluación es requerido']
  },
  userId: {
    type: String,
    required: [true, 'El ID del usuario es requerido'],
    trim: true
  },
  content: {
    type: String,
    required: [true, 'El contenido del comentario es requerido'],
    trim: true,
    maxlength: [2000, 'El comentario no puede exceder 2000 caracteres']
  },
  type: {
    type: String,
    enum: ['suggestion', 'question', 'clarification', 'feedback', 'issue'],
    default: 'feedback'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  status: {
    type: String,
    enum: ['active', 'resolved', 'closed'],
    default: 'active'
  },
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  replies: {
    type: [replySchema],
    default: []
  },
  likes: [{
    userId: {
      type: String,
      required: true
    },
    likedAt: {
      type: Date,
      default: Date.now
    }
  }],
  isEdited: {
    type: Boolean,
    default: false
  },
  editedAt: {
    type: Date
  },
  resolvedBy: {
    type: String,
    trim: true
  },
  resolvedAt: {
    type: Date
  },
  metadata: {
    semester: String,
    subjectCode: String,
    groupNumber: Number,
    userRole: {
      type: String,
      enum: ['student', 'professor', 'coordinator', 'admin']
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Índices para mejorar rendimiento
commentSchema.index({ evaluationPlanId: 1, createdAt: -1 });
commentSchema.index({ userId: 1, createdAt: -1 });
commentSchema.index({ type: 1, status: 1 });
commentSchema.index({ 'metadata.semester': 1, 'metadata.subjectCode': 1 });
commentSchema.index({ tags: 1 });

// Virtual para contar likes
commentSchema.virtual('likesCount').get(function() {
  return this.likes ? this.likes.length : 0;
});

// Virtual para contar respuestas
commentSchema.virtual('repliesCount').get(function() {
  return this.replies ? this.replies.length : 0;
});

// Virtual para verificar si el comentario es reciente (últimas 24 horas)
commentSchema.virtual('isRecent').get(function() {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  return this.createdAt > oneDayAgo;
});

// Método estático para obtener comentarios por plan de evaluación
commentSchema.statics.findByEvaluationPlan = function(evaluationPlanId, options = {}) {
  const {
    status = 'active',
    type = null,
    sortBy = 'createdAt',
    sortOrder = -1,
    limit = 50,
    skip = 0
  } = options;

  const query = { evaluationPlanId };
  
  if (status !== 'all') {
    query.status = status;
  }
  
  if (type) {
    query.type = type;
  }

  return this.find(query)
    .sort({ [sortBy]: sortOrder })
    .limit(limit)
    .skip(skip)
    .populate('evaluationPlanId', 'semester subjectCode groupNumber');
};

// Método estático para obtener estadísticas de comentarios
commentSchema.statics.getCommentStatistics = function(evaluationPlanId) {
  return this.aggregate([
    { $match: { evaluationPlanId: new mongoose.Types.ObjectId(evaluationPlanId) } },
    {
      $group: {
        _id: '$type',
        count: { $sum: 1 },
        activeCount: {
          $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
        },
        resolvedCount: {
          $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] }
        },
        averageReplies: { $avg: { $size: '$replies' } },
        totalLikes: { $sum: { $size: '$likes' } }
      }
    },
    {
      $group: {
        _id: null,
        totalComments: { $sum: '$count' },
        totalActive: { $sum: '$activeCount' },
        totalResolved: { $sum: '$resolvedCount' },
        totalLikes: { $sum: '$totalLikes' },
        byType: {
          $push: {
            type: '$_id',
            count: '$count',
            activeCount: '$activeCount',
            resolvedCount: '$resolvedCount',
            averageReplies: '$averageReplies'
          }
        }
      }
    }
  ]);
};

// Método de instancia para agregar like
commentSchema.methods.addLike = function(userId) {
  // Verificar si el usuario ya dio like
  const existingLike = this.likes.find(like => like.userId === userId);
  
  if (existingLike) {
    throw new Error('El usuario ya ha dado like a este comentario');
  }
  
  this.likes.push({ userId, likedAt: new Date() });
  return this.save();
};

// Método de instancia para quitar like
commentSchema.methods.removeLike = function(userId) {
  this.likes = this.likes.filter(like => like.userId !== userId);
  return this.save();
};

// Método de instancia para agregar respuesta
commentSchema.methods.addReply = function(replyData) {
  this.replies.push({
    ...replyData,
    createdAt: new Date(),
    updatedAt: new Date()
  });
  return this.save();
};

// Método de instancia para editar respuesta
commentSchema.methods.editReply = function(replyId, newContent, userId) {
  const reply = this.replies.id(replyId);
  
  if (!reply) {
    throw new Error('Respuesta no encontrada');
  }
  
  if (reply.userId !== userId) {
    throw new Error('No autorizado para editar esta respuesta');
  }
  
  reply.content = newContent;
  reply.isEdited = true;
  reply.editedAt = new Date();
  reply.updatedAt = new Date();
  
  return this.save();
};

// Método de instancia para eliminar respuesta
commentSchema.methods.removeReply = function(replyId, userId) {
  const reply = this.replies.id(replyId);
  
  if (!reply) {
    throw new Error('Respuesta no encontrada');
  }
  
  if (reply.userId !== userId) {
    throw new Error('No autorizado para eliminar esta respuesta');
  }
  
  this.replies.pull(replyId);
  return this.save();
};

// Método de instancia para resolver comentario
commentSchema.methods.resolve = function(resolvedBy) {
  this.status = 'resolved';
  this.resolvedBy = resolvedBy;
  this.resolvedAt = new Date();
  return this.save();
};

// Método de instancia para editar comentario
commentSchema.methods.editContent = function(newContent, userId) {
  if (this.userId !== userId) {
    throw new Error('No autorizado para editar este comentario');
  }
  
  this.content = newContent;
  this.isEdited = true;
  this.editedAt = new Date();
  return this.save();
};

// Middleware pre-save para actualizar metadata
commentSchema.pre('save', async function(next) {
  if (this.isNew && this.evaluationPlanId) {
    try {
      const EvaluationPlan = mongoose.model('EvaluationPlan');
      const plan = await EvaluationPlan.findById(this.evaluationPlanId);
      
      if (plan) {
        this.metadata = {
          ...this.metadata,
          semester: plan.semester,
          subjectCode: plan.subjectCode,
          groupNumber: plan.groupNumber
        };
      }
    } catch (error) {
      console.error('Error actualizando metadata del comentario:', error);
    }
  }
  next();
});

module.exports = mongoose.model('Comment', commentSchema); 