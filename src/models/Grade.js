const mongoose = require('mongoose');

const activityGradeSchema = new mongoose.Schema({
  activityId: {
    type: mongoose.Schema.Types.ObjectId,
    required: [true, 'El ID de la actividad es requerido']
  },
  activityName: {
    type: String,
    required: [true, 'El nombre de la actividad es requerido'],
    trim: true
  },
  grade: {
    type: Number,
    required: [true, 'La calificación es requerida'],
    min: [0, 'La calificación no puede ser negativa'],
    max: [5, 'La calificación no puede exceder 5.0']
  },
  maxGrade: {
    type: Number,
    default: 5.0,
    min: [1, 'La calificación máxima debe ser al menos 1'],
    max: [5, 'La calificación máxima no puede exceder 5.0']
  },
  percentage: {
    type: Number,
    required: [true, 'El porcentaje de la actividad es requerido'],
    min: [0, 'El porcentaje no puede ser negativo'],
    max: [100, 'El porcentaje no puede exceder 100%']
  },
  dateGraded: {
    type: Date,
    default: Date.now
  },
  notes: {
    type: String,
    trim: true,
    maxlength: [500, 'Las notas no pueden exceder 500 caracteres']
  }
}, { _id: true });

const gradeSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: [true, 'El ID del usuario es requerido'],
    trim: true
  },
  evaluationPlanId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'EvaluationPlan',
    required: [true, 'El ID del plan de evaluación es requerido']
  },
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
    uppercase: true
  },
  groupNumber: {
    type: Number,
    required: [true, 'El número de grupo es requerido'],
    min: [1, 'El número de grupo debe ser mayor a 0']
  },
  activityGrades: {
    type: [activityGradeSchema],
    default: []
  },
  finalGrade: {
    type: Number,
    min: [0, 'La calificación final no puede ser negativa'],
    max: [5, 'La calificación final no puede exceder 5.0']
  },
  projectedGrade: {
    type: Number,
    min: [0, 'La calificación proyectada no puede ser negativa'],
    max: [5, 'La calificación proyectada no puede exceder 5.0']
  },
  targetGrade: {
    type: Number,
    min: [0, 'La calificación objetivo no puede ser negativa'],
    max: [5, 'La calificación objetivo no puede exceder 5.0'],
    default: 3.0
  },
  isComplete: {
    type: Boolean,
    default: false
  },
  academicYear: {
    type: String,
    required: [true, 'El año académico es requerido'],
    match: [/^\d{4}$/, 'Formato de año académico inválido (ejemplo: 2023)']
  },
  metadata: {
    studentName: String,
    studentEmail: String,
    faculty: String,
    program: String
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Índices compuestos para mejorar rendimiento
gradeSchema.index({ userId: 1, semester: 1 });
gradeSchema.index({ userId: 1, evaluationPlanId: 1 }, { unique: true });
gradeSchema.index({ semester: 1, subjectCode: 1 });
gradeSchema.index({ academicYear: 1, userId: 1 });

// Virtual para calcular el progreso completado
gradeSchema.virtual('completedPercentage').get(function() {
  if (!this.activityGrades || this.activityGrades.length === 0) return 0;
  
  const completedPercentage = this.activityGrades.reduce((sum, activityGrade) => {
    return sum + activityGrade.percentage;
  }, 0);
  
  return Math.min(completedPercentage, 100);
});

// Virtual para calcular el porcentaje restante
gradeSchema.virtual('remainingPercentage').get(function() {
  return 100 - this.completedPercentage;
});

// Virtual para calcular la calificación actual ponderada
gradeSchema.virtual('currentWeightedGrade').get(function() {
  if (!this.activityGrades || this.activityGrades.length === 0) return 0;
  
  const weightedSum = this.activityGrades.reduce((sum, activityGrade) => {
    const normalizedGrade = (activityGrade.grade / activityGrade.maxGrade) * 5;
    return sum + (normalizedGrade * activityGrade.percentage / 100);
  }, 0);
  
  return parseFloat(weightedSum.toFixed(2));
});

// Virtual para calcular qué nota necesita en las actividades restantes
gradeSchema.virtual('requiredGradeForTarget').get(function() {
  const remaining = this.remainingPercentage;
  if (remaining <= 0) return 0;
  
  const currentPoints = this.currentWeightedGrade * (this.completedPercentage / 100) * 5;
  const targetPoints = this.targetGrade * 5;
  const remainingPoints = targetPoints - currentPoints;
  
  const requiredGrade = (remainingPoints / (remaining / 100)) / 5;
  return Math.max(0, Math.min(5, parseFloat(requiredGrade.toFixed(2))));
});

// Middleware pre-save para calcular campos automáticamente
gradeSchema.pre('save', function(next) {
  // Calcular año académico
  if (this.semester && !this.academicYear) {
    this.academicYear = this.semester.split('-')[0];
  }
  
  // Calcular calificación final si todas las actividades están completadas
  if (this.completedPercentage >= 100) {
    this.finalGrade = this.currentWeightedGrade;
    this.isComplete = true;
  }
  
  // Calcular calificación proyectada
  if (this.remainingPercentage > 0 && this.targetGrade) {
    this.projectedGrade = this.targetGrade;
  } else {
    this.projectedGrade = this.currentWeightedGrade;
  }
  
  next();
});

// Método estático para obtener notas por usuario y semestre
gradeSchema.statics.findByUserAndSemester = function(userId, semester) {
  return this.find({ userId, semester })
    .populate('evaluationPlanId', 'subjectCode groupNumber professorId activities')
    .sort({ subjectCode: 1 });
};

// Método estático para obtener estadísticas por materia
gradeSchema.statics.getSubjectStatistics = function(subjectCode, semester) {
  return this.aggregate([
    {
      $match: { subjectCode, semester, isComplete: true }
    },
    {
      $group: {
        _id: '$subjectCode',
        averageGrade: { $avg: '$finalGrade' },
        maxGrade: { $max: '$finalGrade' },
        minGrade: { $min: '$finalGrade' },
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
    }
  ]);
};

// Método de instancia para agregar calificación de actividad
gradeSchema.methods.addActivityGrade = function(activityData) {
  // Verificar si ya existe una calificación para esta actividad
  const existingIndex = this.activityGrades.findIndex(
    ag => ag.activityId.toString() === activityData.activityId.toString()
  );
  
  if (existingIndex >= 0) {
    // Actualizar calificación existente
    this.activityGrades[existingIndex] = {
      ...this.activityGrades[existingIndex].toObject(),
      ...activityData,
      dateGraded: new Date()
    };
  } else {
    // Agregar nueva calificación
    this.activityGrades.push({
      ...activityData,
      dateGraded: new Date()
    });
  }
  
  return this.save();
};

// Método de instancia para eliminar calificación de actividad
gradeSchema.methods.removeActivityGrade = function(activityId) {
  this.activityGrades = this.activityGrades.filter(
    ag => ag.activityId.toString() !== activityId.toString()
  );
  return this.save();
};

module.exports = mongoose.model('Grade', gradeSchema); 