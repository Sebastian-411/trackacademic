const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  type: {
    type: String,
    required: [true, 'El tipo de reporte es requerido'],
    enum: ['performance', 'grades', 'projections', 'administrative', 'custom'],
    trim: true
  },
  title: {
    type: String,
    required: [true, 'El título del reporte es requerido'],
    trim: true,
    maxlength: [200, 'El título no puede exceder 200 caracteres']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'La descripción no puede exceder 500 caracteres']
  },
  studentId: {
    type: String,
    required: [true, 'El ID del estudiante es requerido'],
    trim: true
  },
  generatedBy: {
    type: String,
    required: [true, 'El generador del reporte es requerido'],
    trim: true
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending'
  },
  parameters: {
    semester: String,
    subjectCode: String,
    startDate: Date,
    endDate: Date,
    includeComparisons: Boolean,
    includeGraphs: Boolean,
    includeDetails: Boolean,
    groupBySubject: Boolean,
    targetGrade: Number,
    includeRecommendations: Boolean,
    projectionMonths: Number,
    filters: mongoose.Schema.Types.Mixed
  },
  data: {
    // Almacena los datos del reporte como objeto flexible
    summary: {
      totalSubjects: Number,
      averageGrade: Number,
      passedSubjects: Number,
      failedSubjects: Number,
      inProgressSubjects: Number
    },
    subjects: [{
      code: String,
      name: String,
      semester: String,
      currentGrade: Number,
      finalGrade: Number,
      status: String,
      activities: [{
        name: String,
        percentage: Number,
        score: Number,
        maxScore: Number,
        date: Date
      }]
    }],
    trends: [{
      period: String,
      average: Number,
      subjects: Number
    }],
    projections: [{
      subjectCode: String,
      currentGrade: Number,
      projectedGrade: Number,
      minimumRequired: Number,
      recommendations: [String]
    }],
    comparisons: {
      previousSemester: Number,
      classAverage: Number,
      percentile: Number
    },
    rawData: mongoose.Schema.Types.Mixed
  },
  content: {
    html: String,
    text: String,
    charts: [{
      type: String,
      data: mongoose.Schema.Types.Mixed,
      options: mongoose.Schema.Types.Mixed
    }]
  },
  summary: {
    type: String,
    trim: true,
    maxlength: [1000, 'El resumen no puede exceder 1000 caracteres']
  },
  fileInfo: {
    fileName: String,
    fileSize: Number,
    fileType: String,
    filePath: String,
    downloadUrl: String
  },
  metadata: {
    generationTime: Number, // tiempo en ms
    dataSourcesUsed: [String],
    processingSteps: [String],
    version: {
      type: String,
      default: '1.0'
    }
  },
  isPublic: {
    type: Boolean,
    default: false
  },
  sharedWith: [{
    userId: String,
    userType: String,
    permissions: {
      canView: { type: Boolean, default: true },
      canDownload: { type: Boolean, default: false },
      canEdit: { type: Boolean, default: false }
    },
    sharedAt: {
      type: Date,
      default: Date.now
    }
  }],
  tags: [String],
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Índices para mejorar rendimiento
reportSchema.index({ studentId: 1, type: 1 });
reportSchema.index({ generatedBy: 1, createdAt: -1 });
reportSchema.index({ status: 1, priority: 1 });
reportSchema.index({ 'parameters.semester': 1 });
reportSchema.index({ tags: 1 });

// Virtual para obtener el tamaño legible del archivo
reportSchema.virtual('fileSizeFormatted').get(function() {
  if (!this.fileInfo?.fileSize) return 'N/A';
  
  const bytes = this.fileInfo.fileSize;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  if (bytes === 0) return '0 Bytes';
  
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
});

// Virtual para obtener el tiempo de generación formateado
reportSchema.virtual('generationTimeFormatted').get(function() {
  if (!this.metadata?.generationTime) return 'N/A';
  
  const ms = this.metadata.generationTime;
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}min`;
});

// Método estático para buscar reportes por estudiante
reportSchema.statics.findByStudent = function(studentId, options = {}) {
  const query = { studentId };
  
  if (options.type) query.type = options.type;
  if (options.status) query.status = options.status;
  if (options.semester) query['parameters.semester'] = options.semester;
  
  return this.find(query)
    .sort({ createdAt: -1 })
    .limit(options.limit || 50);
};

// Método estático para buscar reportes por generador
reportSchema.statics.findByGenerator = function(generatedBy, options = {}) {
  const query = { generatedBy };
  
  if (options.type) query.type = options.type;
  if (options.status) query.status = options.status;
  
  return this.find(query)
    .sort({ createdAt: -1 })
    .limit(options.limit || 100);
};

// Método de instancia para marcar como completado
reportSchema.methods.markCompleted = function(content, fileInfo = null) {
  this.status = 'completed';
  this.content = content;
  if (fileInfo) this.fileInfo = fileInfo;
  return this.save();
};

// Método de instancia para marcar como fallido
reportSchema.methods.markFailed = function(error) {
  this.status = 'failed';
  this.metadata.error = error;
  return this.save();
};

// Middleware pre-save para generar resumen automático
reportSchema.pre('save', function(next) {
  if (this.isModified('data') && this.data.summary && !this.summary) {
    const { summary } = this.data;
    this.summary = `Reporte de ${this.type} - ${summary.totalSubjects || 0} materias, ` +
                  `promedio ${summary.averageGrade || 0}, ${summary.passedSubjects || 0} aprobadas`;
  }
  next();
});

module.exports = mongoose.model('Report', reportSchema); 