const mongoose = require('mongoose');

const studentGradeSchema = new mongoose.Schema({
  studentId: {
    type: String,
    required: [true, 'El ID del estudiante es requerido'],
    trim: true
  },
  evaluationPlanId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'EvaluationPlan',
    required: [true, 'El ID del plan de evaluación es requerido']
  },
  subjectCode: {
    type: String,
    required: [true, 'El código de la materia es requerido'],
    uppercase: true,
    trim: true
  },
  semester: {
    type: String,
    required: [true, 'El semestre es requerido'],
    trim: true
  },
  groupNumber: {
    type: Number,
    required: [true, 'El número de grupo es requerido']
  },
  activities: [{
    name: {
      type: String,
      required: true,
      trim: true
    },
    percentage: {
      type: Number,
      required: true,
      min: 0,
      max: 100
    },
    score: {
      type: Number,
      min: 0,
      max: 5,
      default: null
    },
    maxScore: {
      type: Number,
      default: 5
    },
    submittedAt: {
      type: Date,
      default: null
    },
    notes: {
      type: String,
      trim: true
    }
  }],
  currentGrade: {
    type: Number,
    min: 0,
    max: 5,
    default: 0
  },
  finalGrade: {
    type: Number,
    min: 0,
    max: 5,
    default: null
  },
  isComplete: {
    type: Boolean,
    default: false
  },
  academicYear: {
    type: String,
    default: function() {
      return new Date().getFullYear().toString();
    }
  },
  status: {
    type: String,
    enum: ['in_progress', 'completed', 'failed', 'withdrawn'],
    default: 'in_progress'
  },
  metadata: {
    lastCalculation: Date,
    totalActivities: Number,
    completedActivities: Number,
    pendingActivities: Number
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Índices para mejorar rendimiento
studentGradeSchema.index({ studentId: 1, semester: 1 });
studentGradeSchema.index({ studentId: 1, subjectCode: 1, semester: 1 });
studentGradeSchema.index({ evaluationPlanId: 1 });
studentGradeSchema.index({ semester: 1, academicYear: 1 });

// Virtual para calcular el progreso
studentGradeSchema.virtual('progress').get(function() {
  if (!this.activities || this.activities.length === 0) return 0;
  
  const completedActivities = this.activities.filter(activity => 
    activity.score !== null && activity.score !== undefined
  ).length;
  
  return Math.round((completedActivities / this.activities.length) * 100);
});

// Virtual para calcular contribución total
studentGradeSchema.virtual('totalContribution').get(function() {
  if (!this.activities || this.activities.length === 0) return 0;
  
  return this.activities.reduce((total, activity) => {
    if (activity.score !== null && activity.score !== undefined) {
      return total + ((activity.score / activity.maxScore) * activity.percentage / 100 * 5);
    }
    return total;
  }, 0);
});

// Método para calcular la nota actual
studentGradeSchema.methods.calculateCurrentGrade = function() {
  const totalContribution = this.totalContribution;
  this.currentGrade = Math.round(totalContribution * 100) / 100;
  
  // Verificar si está completo
  const completedActivities = this.activities.filter(activity => 
    activity.score !== null && activity.score !== undefined
  ).length;
  
  this.isComplete = completedActivities === this.activities.length;
  
  if (this.isComplete) {
    this.finalGrade = this.currentGrade;
    this.status = this.finalGrade >= 3.0 ? 'completed' : 'failed';
  }
  
  // Actualizar metadata
  this.metadata = {
    lastCalculation: new Date(),
    totalActivities: this.activities.length,
    completedActivities: completedActivities,
    pendingActivities: this.activities.length - completedActivities
  };
  
  return this.currentGrade;
};

// Método para agregar o actualizar una nota
studentGradeSchema.methods.updateActivityScore = function(activityName, score, notes = '') {
  const activity = this.activities.find(a => a.name === activityName);
  
  if (!activity) {
    throw new Error(`Actividad "${activityName}" no encontrada`);
  }
  
  if (score < 0 || score > activity.maxScore) {
    throw new Error(`La nota debe estar entre 0 y ${activity.maxScore}`);
  }
  
  activity.score = score;
  activity.submittedAt = new Date();
  activity.notes = notes;
  
  this.calculateCurrentGrade();
  return this;
};

// Método para eliminar una nota
studentGradeSchema.methods.removeActivityScore = function(activityName) {
  const activity = this.activities.find(a => a.name === activityName);
  
  if (!activity) {
    throw new Error(`Actividad "${activityName}" no encontrada`);
  }
  
  activity.score = null;
  activity.submittedAt = null;
  activity.notes = '';
  
  this.calculateCurrentGrade();
  return this;
};

// Método estático para obtener consolidado por semestre
studentGradeSchema.statics.getSemesterSummary = async function(studentId, semester) {
  const grades = await this.find({ studentId, semester }).populate('evaluationPlanId');
  
  const summary = {
    semester,
    totalSubjects: grades.length,
    completedSubjects: grades.filter(g => g.isComplete).length,
    inProgressSubjects: grades.filter(g => !g.isComplete).length,
    averageGrade: 0,
    passedSubjects: 0,
    failedSubjects: 0,
    totalCredits: 0,
    earnedCredits: 0,
    subjects: []
  };
  
  let totalGradePoints = 0;
  let totalSubjectsWithGrades = 0;
  
  for (const grade of grades) {
    const subjectSummary = {
      subjectCode: grade.subjectCode,
      groupNumber: grade.groupNumber,
      currentGrade: grade.currentGrade,
      finalGrade: grade.finalGrade,
      progress: grade.progress,
      status: grade.status,
      isComplete: grade.isComplete
    };
    
    if (grade.currentGrade > 0) {
      totalGradePoints += grade.currentGrade;
      totalSubjectsWithGrades++;
    }
    
    if (grade.isComplete) {
      if (grade.finalGrade >= 3.0) {
        summary.passedSubjects++;
      } else {
        summary.failedSubjects++;
      }
    }
    
    summary.subjects.push(subjectSummary);
  }
  
  if (totalSubjectsWithGrades > 0) {
    summary.averageGrade = Math.round((totalGradePoints / totalSubjectsWithGrades) * 100) / 100;
  }
  
  return summary;
};

// Middleware pre-save para calcular automáticamente
studentGradeSchema.pre('save', function(next) {
  if (this.isModified('activities')) {
    this.calculateCurrentGrade();
  }
  next();
});

module.exports = mongoose.model('StudentGrade', studentGradeSchema); 