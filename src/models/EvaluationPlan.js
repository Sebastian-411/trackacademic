const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'El nombre de la actividad es requerido'],
    trim: true,
    maxlength: [100, 'El nombre de la actividad no puede exceder 100 caracteres']
  },
  percentage: {
    type: Number,
    required: [true, 'El porcentaje de la actividad es requerido'],
    min: [0, 'El porcentaje no puede ser negativo'],
    max: [100, 'El porcentaje no puede exceder 100%']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'La descripción no puede exceder 500 caracteres']
  },
  dueDate: {
    type: Date
  },
  isCompleted: {
    type: Boolean,
    default: false
  }
}, { _id: true });

const evaluationPlanSchema = new mongoose.Schema({
  semester: {
    type: String,
    required: [true, 'El semestre es requerido'],
    trim: true,
    match: [/^\d{4}-[12]$/, 'Formato de semestre inválido (ejemplo: 2023-1)']
  },
  subjectCode: {
    type: String,
    required: [true, 'El código de la materia es requerido'],
    trim: true,
    uppercase: true,
    maxlength: [10, 'El código de la materia no puede exceder 10 caracteres']
  },
  groupNumber: {
    type: Number,
    required: [true, 'El número de grupo es requerido'],
    min: [1, 'El número de grupo debe ser mayor a 0']
  },
  professorId: {
    type: String,
    required: [true, 'El ID del profesor es requerido'],
    trim: true
  },
  activities: {
    type: [activitySchema],
    required: [true, 'Al menos una actividad es requerida'],
    validate: {
      validator: function(activities) {
        const totalPercentage = activities.reduce((sum, activity) => sum + activity.percentage, 0);
        return Math.abs(totalPercentage - 100) < 0.01; // Tolerancia para errores de punto flotante
      },
      message: 'La suma de los porcentajes debe ser exactamente 100%'
    }
  },
  createdBy: {
    type: String,
    required: [true, 'El creador del plan es requerido'],
    trim: true
  },
  isApproved: {
    type: Boolean,
    default: true
  },
  approvedBy: {
    type: String,
    trim: true
  },
  approvedAt: {
    type: Date
  },
  isActive: {
    type: Boolean,
    default: true
  },
  academicYear: {
    type: String,
    required: [true, 'El año académico es requerido'],
    match: [/^\d{4}$/, 'Formato de año académico inválido (ejemplo: 2023)']
  },
  // Campos para el sistema de versiones
  versionName: {
    type: String,
    trim: true,
    maxlength: [100, 'El nombre de la versión no puede exceder 100 caracteres'],
    default: 'Plan Principal'
  },
  parentPlanId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'EvaluationPlan',
    default: null
  },
  isMainVersion: {
    type: Boolean,
    default: false
  },
  usageCount: {
    type: Number,
    default: 0,
    min: [0, 'El contador de uso no puede ser negativo']
  },
  metadata: {
    faculty: String,
    program: String,
    campus: String
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Índices compuestos para mejorar rendimiento
// Solo el plan principal debe ser único por curso
evaluationPlanSchema.index(
  { semester: 1, subjectCode: 1, groupNumber: 1, isMainVersion: 1 }, 
  { 
    unique: true, 
    partialFilterExpression: { isMainVersion: true } 
  }
);
evaluationPlanSchema.index({ semester: 1, subjectCode: 1, groupNumber: 1 });
evaluationPlanSchema.index({ professorId: 1, semester: 1 });
evaluationPlanSchema.index({ createdBy: 1 });
evaluationPlanSchema.index({ isApproved: 1, isActive: 1 });
evaluationPlanSchema.index({ parentPlanId: 1 });
evaluationPlanSchema.index({ usageCount: -1 });

// Virtual para obtener el total de actividades
evaluationPlanSchema.virtual('totalActivities').get(function() {
  return this.activities.length;
});

// Virtual para verificar si está completo
evaluationPlanSchema.virtual('isComplete').get(function() {
  return this.activities.every(activity => activity.isCompleted);
});

// Middleware pre-save para calcular año académico automáticamente
evaluationPlanSchema.pre('save', function(next) {
  if (this.semester && !this.academicYear) {
    this.academicYear = this.semester.split('-')[0];
  }
  next();
});

// Método estático para buscar planes por profesor
evaluationPlanSchema.statics.findByProfessor = function(professorId, semester = null) {
  const query = { professorId, isActive: true };
  if (semester) {
    query.semester = semester;
  }
  return this.find(query).sort({ semester: -1, subjectCode: 1 });
};

// Método estático para buscar planes por materia
evaluationPlanSchema.statics.findBySubject = function(subjectCode, semester = null) {
  const query = { subjectCode, isActive: true, isApproved: true };
  if (semester) {
    query.semester = semester;
  }
  return this.find(query).sort({ semester: -1, groupNumber: 1 });
};

// Método de instancia para aprobar plan
evaluationPlanSchema.methods.approve = function(approvedBy) {
  this.isApproved = true;
  this.approvedBy = approvedBy;
  this.approvedAt = new Date();
  return this.save();
};

// Método de instancia para incrementar contador de uso
evaluationPlanSchema.methods.incrementUsage = function() {
  this.usageCount += 1;
  return this.save();
};

// Método estático para obtener todas las versiones de un curso
evaluationPlanSchema.statics.findAllVersionsByCourse = function(subjectCode, semester, groupNumber) {
  return this.find({
    subjectCode,
    semester,
    groupNumber,
    isActive: true
  }).sort({ isMainVersion: -1, usageCount: -1, createdAt: 1 });
};

// Método estático para encontrar o crear el plan principal
evaluationPlanSchema.statics.findOrCreateMainVersion = async function(subjectCode, semester, groupNumber, professorId) {
  let mainPlan = await this.findOne({
    subjectCode,
    semester,
    groupNumber,
    isMainVersion: true,
    isActive: true
  });

  if (!mainPlan) {
    // Si no existe plan principal, el primer plan creado se convierte en principal
    mainPlan = await this.findOne({
      subjectCode,
      semester,
      groupNumber,
      isActive: true
    }).sort({ createdAt: 1 });

    if (mainPlan) {
      mainPlan.isMainVersion = true;
      mainPlan.versionName = 'Plan Principal';
      await mainPlan.save();
    }
  }

  return mainPlan;
};

// Método estático para crear una nueva versión
evaluationPlanSchema.statics.createVersion = async function(baseData, versionName = null, parentPlanId = null) {
  const newVersion = new this({
    ...baseData,
    versionName: versionName || `Versión ${new Date().toLocaleDateString('es-ES')}`,
    parentPlanId,
    isMainVersion: false,
    isApproved: true,  // Auto-aprobar todas las versiones
    usageCount: 0
  });

  return newVersion.save();
};

module.exports = mongoose.model('EvaluationPlan', evaluationPlanSchema); 