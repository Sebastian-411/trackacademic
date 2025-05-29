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
    default: false
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
evaluationPlanSchema.index({ semester: 1, subjectCode: 1, groupNumber: 1 }, { unique: true });
evaluationPlanSchema.index({ professorId: 1, semester: 1 });
evaluationPlanSchema.index({ createdBy: 1 });
evaluationPlanSchema.index({ isApproved: 1, isActive: 1 });

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

module.exports = mongoose.model('EvaluationPlan', evaluationPlanSchema); 