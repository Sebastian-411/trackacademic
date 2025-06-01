const EvaluationPlan = require('../models/EvaluationPlan');
const StudentPlan = require('../models/StudentPlan');

// Ver un plan específico
exports.viewPlan = async (req, res) => {
    try {
        const { planId } = req.params;
        const plan = await EvaluationPlan.findById(planId);

        if (!plan) {
            req.flash('error', 'Plan no encontrado');
            return res.redirect('/dashboard');
        }

        res.render('evaluation-plan/view', {
            plan: plan,
            user: req.user
        });
    } catch (error) {
        console.error('Error al cargar plan:', error);
        req.flash('error', 'Error al cargar el plan');
        res.redirect('/dashboard');
    }
};

// Renderizar formulario de edición
exports.renderEditForm = async (req, res) => {
    try {
        const { planId } = req.params;
        const plan = await EvaluationPlan.findById(planId);

        if (!plan) {
            req.flash('error', 'Plan no encontrado');
            return res.redirect('/dashboard');
        }

        res.render('evaluation-plan/edit', {
            plan: plan,
            user: req.user
        });
    } catch (error) {
        console.error('Error al cargar formulario de edición:', error);
        req.flash('error', 'Error al cargar el formulario');
        res.redirect('/dashboard');
    }
};

// Actualizar plan
exports.updateTemplate = async (req, res) => {
    try {
        const { planId } = req.params;
        const { activities, subjectCode, semester, groupNumber } = req.body;

        const plan = await EvaluationPlan.findById(planId);

        if (!plan) {
            return res.status(404).json({
                success: false,
                message: 'Plan no encontrado'
            });
        }

        // Actualizar datos básicos
        plan.subjectCode = subjectCode;
        plan.semester = semester;
        plan.groupNumber = groupNumber;

        // Actualizar actividades
        plan.activities = activities.map(activity => ({
            name: activity.name,
            description: activity.description,
            percentage: activity.percentage,
            dueDate: activity.dueDate
        }));

        await plan.save();

        // Contar estudiantes afectados
        const studentsWithPlan = await StudentPlan.countDocuments({
            originalPlan: planId
        });

        res.json({
            success: true,
            message: 'Plan actualizado correctamente',
            affectedStudents: studentsWithPlan
        });
    } catch (error) {
        console.error('Error al actualizar plan:', error);
        res.status(500).json({
            success: false,
            message: 'Error al actualizar el plan'
        });
    }
};

// Obtener estadísticas
exports.getTemplateWithStats = async (req, res) => {
    try {
        const { planId } = req.params;
        const plan = await EvaluationPlan.findById(planId);

        if (!plan) {
            return res.status(404).json({
                success: false,
                message: 'Plan no encontrado'
            });
        }

        // Obtener estadísticas
        const stats = await StudentPlan.aggregate([
            {
                $match: { originalPlan: plan._id }
            },
            {
                $group: {
                    _id: null,
                    totalStudents: { $sum: 1 },
                    averageGrade: { $avg: '$currentGrade' },
                    completedPlans: {
                        $sum: {
                            $cond: [{ $eq: ['$progress', 100] }, 1, 0]
                        }
                    }
                }
            }
        ]);

        res.json({
            success: true,
            plan: plan,
            stats: stats[0] || {
                totalStudents: 0,
                averageGrade: 0,
                completedPlans: 0
            }
        });
    } catch (error) {
        console.error('Error al obtener estadísticas:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener estadísticas'
        });
    }
}; 