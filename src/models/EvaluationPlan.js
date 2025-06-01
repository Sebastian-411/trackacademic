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
    campus: String,
    comments: {
      type: Number,
      default: 0
    }
  },
  // ID único para evitar conflictos - SIEMPRE requerido
  versionId: {
    type: String,
    required: true,
    unique: true,
    default: function() {
      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substr(2, 8);
      return `${this.subjectCode || 'COURSE'}_${this.semester || 'SEMESTER'}_${this.groupNumber || 1}_${timestamp}_${randomId}`;
    }
  },
  createdTimestamp: {
    type: Number,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Índices compuestos para mejorar rendimiento
// Solo el plan principal debe ser único por curso
evaluationPlanSchema.index(
  { semester: 1, subjectCode: 1, groupNumber: 1 }, 
  { sparse: true }
);

// Índice único para el plan principal
evaluationPlanSchema.index(
  { semester: 1, subjectCode: 1, groupNumber: 1, isMainVersion: 1 }, 
  { 
    unique: true,
    partialFilterExpression: { isMainVersion: true }
  }
);

// Otros índices para optimización
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

// Middleware pre-save para calcular año académico automáticamente y generar versionId
evaluationPlanSchema.pre('save', function(next) {
  // Calcular año académico
  if (this.semester && !this.academicYear) {
    this.academicYear = this.semester.split('-')[0];
  }
  
  // Generar versionId único si no existe
  if (!this.versionId) {
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substr(2, 8);
    this.versionId = `${this.subjectCode}_${this.semester}_${this.groupNumber}_${timestamp}_${randomId}`;
  }
  
  // Asegurar que createdTimestamp esté establecido
  if (!this.createdTimestamp) {
    this.createdTimestamp = Date.now();
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

// Método estático para encontrar o crear el plan principal
evaluationPlanSchema.statics.findOrCreateMainVersion = async function(subjectCode, semester, groupNumber) {
  try {
    // Buscar todos los planes activos para este curso
    const plans = await this.find({
      subjectCode,
      semester,
      groupNumber,
      isActive: true
    });

    if (!plans || plans.length === 0) {
      return null;
    }

    // Añadir logging para depuración
    console.log('Planes antes de ordenar:', plans.map(p => ({
      id: p._id,
      usos: p.usageCount,
      comentarios: p.metadata?.comments || 0,
      fecha: p.createdAt
    })));

    // Ordenar los planes según los criterios
    plans.sort((a, b) => {
      // Asegurar que los valores sean números
      const aUsos = Number(a.usageCount || 0);
      const bUsos = Number(b.usageCount || 0);
      const aComentarios = Number(a.metadata?.comments || 0);
      const bComentarios = Number(b.metadata?.comments || 0);

      // Comparar por usos
      if (bUsos !== aUsos) {
        return bUsos - aUsos;
      }
      
      // Si hay empate en usos, comparar por comentarios
      if (bComentarios !== aComentarios) {
        return bComentarios - aComentarios;
      }
      
      // Si hay empate en comentarios, el más antiguo gana
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });

    // Logging después de ordenar
    console.log('Planes después de ordenar:', plans.map(p => ({
      id: p._id,
      usos: p.usageCount,
      comentarios: p.metadata?.comments || 0,
      fecha: p.createdAt,
      esPrincipal: p.isMainVersion
    })));

    // El primer plan después del ordenamiento debería ser el principal
    const shouldBeMain = plans[0];
    
    // Actualizar todos los planes para asegurar que solo uno sea principal
    await this.updateMany(
      {
        subjectCode,
        semester,
        groupNumber,
        isActive: true
      },
      {
        $set: { 
          isMainVersion: false,
          versionName: 'Versión Alternativa'
        }
      }
    );

    // Establecer el nuevo plan principal
    await this.findByIdAndUpdate(shouldBeMain._id, {
      $set: { 
        isMainVersion: true,
        versionName: 'Plan Principal'
      }
    }, { new: true });

    return shouldBeMain;
  } catch (error) {
    console.error('Error al actualizar plan principal:', error);
    throw error;
  }
};

// Método para incrementar el contador de uso y actualizar plan principal
evaluationPlanSchema.methods.incrementUsage = async function() {
  try {
    // Incrementar el contador
    this.usageCount = (this.usageCount || 0) + 1;
    await this.save();

    // Verificar y actualizar el plan principal
    await this.constructor.findOrCreateMainVersion(
      this.subjectCode,
      this.semester,
      this.groupNumber
    );

    // Recargar el documento para obtener el estado actualizado
    await this.populate('parentPlanId');
    return this;
  } catch (error) {
    console.error('Error al incrementar uso:', error);
    throw error;
  }
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

// Método estático para crear una nueva versión
evaluationPlanSchema.statics.createVersion = async function(baseData, versionName = null, parentPlanId = null) {
  // Asegurarse de que metadata.comments esté inicializado
  const metadata = {
    ...(baseData.metadata || {}),
    comments: 0  // Inicializar comentarios en 0
  };

  const newVersion = new this({
    ...baseData,
    metadata,
    versionName: versionName || `Versión ${new Date().toLocaleDateString('es-ES')}`,
    parentPlanId,
    isMainVersion: false,
    isApproved: true,  // Auto-aprobar todas las versiones
    usageCount: 0
  });

  return await newVersion.save();
};

// Método para incrementar comentarios
evaluationPlanSchema.methods.incrementComments = async function() {
  try {
    // Asegurarse de que metadata existe
    if (!this.metadata) {
      this.metadata = {};
    }
    // Incrementar el contador de comentarios
    this.metadata.comments = (this.metadata.comments || 0) + 1;
    await this.save();

    // Verificar y actualizar el plan principal
    await this.constructor.findOrCreateMainVersion(
      this.subjectCode,
      this.semester,
      this.groupNumber
    );

    return this;
  } catch (error) {
    console.error('Error al incrementar comentarios:', error);
    throw error;
  }
};

module.exports = mongoose.model('EvaluationPlan', evaluationPlanSchema); 