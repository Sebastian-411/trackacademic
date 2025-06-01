const mongoose = require('mongoose');

const studentPlanSchema = new mongoose.Schema({
    student: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    originalPlan: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'EvaluationPlan',
        required: true
    },
    subjectCode: String,
    semester: String,
    groupNumber: String,
    professor: String,
    activities: [{
        name: String,
        description: String,
        percentage: Number,
        grade: {
            type: Number,
            default: null
        },
        completed: {
            type: Boolean,
            default: false
        },
        dueDate: Date
    }],
    currentGrade: {
        type: Number,
        default: 0
    },
    progress: {
        type: Number,
        default: 0
    },
    lastUpdated: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Método para calcular la nota actual
studentPlanSchema.methods.calculateCurrentGrade = function() {
    let totalGrade = 0;
    let totalPercentage = 0;
    let completedPercentage = 0;

    this.activities.forEach(activity => {
        if (activity.grade !== null) {
            totalGrade += (activity.grade * activity.percentage) / 100;
            completedPercentage += activity.percentage;
        }
        totalPercentage += activity.percentage;
    });

    this.currentGrade = totalGrade;
    this.progress = (completedPercentage / totalPercentage) * 100;
    return this.currentGrade;
};

// Método para crear un plan de estudiante desde una plantilla
studentPlanSchema.statics.createFromTemplate = async function(templateId, studentId) {
    const EvaluationPlan = mongoose.model('EvaluationPlan');
    const template = await EvaluationPlan.findById(templateId);
    
    if (!template) {
        throw new Error('Plantilla no encontrada');
    }

    // Verificar si ya existe un plan para este estudiante y plantilla
    const existingPlan = await this.findOne({
        student: studentId,
        originalPlan: templateId
    });

    if (existingPlan) {
        return existingPlan;
    }

    // Crear nuevo plan
    return await this.create({
        student: studentId,
        originalPlan: templateId,
        subjectCode: template.subjectCode,
        semester: template.semester,
        groupNumber: template.groupNumber,
        professor: template.professor,
        activities: template.activities.map(act => ({
            name: act.name,
            description: act.description,
            percentage: act.percentage,
            dueDate: act.dueDate
        }))
    });
};

const StudentPlan = mongoose.model('StudentPlan', studentPlanSchema);
module.exports = StudentPlan; 