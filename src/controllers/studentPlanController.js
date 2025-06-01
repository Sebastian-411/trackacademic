const StudentPlan = require('../models/StudentPlan');
const EvaluationPlan = require('../models/EvaluationPlan');

exports.getMyPlans = async (req, res) => {
    try {
        const plans = await StudentPlan.find({ student: req.user._id })
            .sort({ lastUpdated: -1 });

        res.json({
            success: true,
            plans: plans
        });
    } catch (error) {
        console.error('Error al obtener planes:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener los planes'
        });
    }
};

exports.savePlan = async (req, res) => {
    try {
        const { templateId } = req.params;
        const studentPlan = await StudentPlan.createFromTemplate(templateId, req.user._id);

        res.json({
            success: true,
            plan: studentPlan
        });
    } catch (error) {
        console.error('Error al guardar plan:', error);
        res.status(500).json({
            success: false,
            message: 'Error al guardar el plan'
        });
    }
};

exports.updateGrades = async (req, res) => {
    try {
        const { planId } = req.params;
        const { activities } = req.body;

        const plan = await StudentPlan.findOne({
            _id: planId,
            student: req.user._id
        });

        if (!plan) {
            return res.status(404).json({
                success: false,
                message: 'Plan no encontrado'
            });
        }

        // Actualizar las notas de las actividades
        activities.forEach(updatedActivity => {
            const activity = plan.activities.id(updatedActivity._id);
            if (activity) {
                activity.grade = updatedActivity.grade;
                activity.completed = updatedActivity.grade !== null;
            }
        });

        // Calcular la nota actual y el progreso
        plan.calculateCurrentGrade();
        plan.lastUpdated = Date.now();

        await plan.save();

        res.json({
            success: true,
            plan: plan
        });
    } catch (error) {
        console.error('Error al actualizar notas:', error);
        res.status(500).json({
            success: false,
            message: 'Error al actualizar las notas'
        });
    }
};

exports.deletePlan = async (req, res) => {
    try {
        const { planId } = req.params;
        
        const result = await StudentPlan.deleteOne({
            _id: planId,
            student: req.user._id
        });

        if (result.deletedCount === 0) {
            return res.status(404).json({
                success: false,
                message: 'Plan no encontrado'
            });
        }

        res.json({
            success: true,
            message: 'Plan eliminado correctamente'
        });
    } catch (error) {
        console.error('Error al eliminar plan:', error);
        res.status(500).json({
            success: false,
            message: 'Error al eliminar el plan'
        });
    }
};

exports.getPlanDetails = async (req, res) => {
    try {
        const { planId } = req.params;
        
        const plan = await StudentPlan.findOne({
            _id: planId,
            student: req.user._id
        }).populate('originalPlan');

        if (!plan) {
            return res.status(404).json({
                success: false,
                message: 'Plan no encontrado'
            });
        }

        res.json({
            success: true,
            plan: plan
        });
    } catch (error) {
        console.error('Error al obtener detalles del plan:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener detalles del plan'
        });
    }
}; 