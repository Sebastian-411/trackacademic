const StudentPlan = require('../models/StudentPlan');
const EvaluationPlan = require('../models/EvaluationPlan');

/**
 * @swagger
 * /api/my-plans:
 *   get:
 *     summary: Obtener planes personales del estudiante
 *     description: Obtiene todos los planes de evaluación guardados por el estudiante autenticado, ordenados por fecha de última actualización
 *     tags: [Planes de Estudiantes]
 *     security:
 *       - SessionAuth: []
 *     responses:
 *       200:
 *         description: Lista de planes obtenida exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 plans:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/StudentPlan'
 *                   description: Lista de planes del estudiante
 *             example:
 *               success: true
 *               plans:
 *                 - _id: "64f8b1234567890abcdef789"
 *                   student: "user_123456789"
 *                   subjectCode: "MATH101"
 *                   semester: "2024-1"
 *                   groupNumber: 1
 *                   currentGrade: 3.8
 *                   progress: 75
 *                   lastUpdated: "2024-02-15T16:20:00.000Z"
 *                 - _id: "64f8b1234567890abcdef790"
 *                   student: "user_123456789"
 *                   subjectCode: "PHYS201"
 *                   semester: "2024-1"
 *                   groupNumber: 2
 *                   currentGrade: 4.2
 *                   progress: 60
 *                   lastUpdated: "2024-02-10T14:30:00.000Z"
 *       401:
 *         description: Usuario no autenticado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
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

/**
 * @swagger
 * /api/evaluation-plans/{templateId}/save:
 *   post:
 *     summary: Guardar un plan como personal
 *     description: Crea una copia personal de un plan de evaluación para el estudiante, basado en un template existente
 *     tags: [Planes de Estudiantes]
 *     security:
 *       - SessionAuth: []
 *     parameters:
 *       - in: path
 *         name: templateId
 *         required: true
 *         schema:
 *           type: string
 *           pattern: ^[0-9a-fA-F]{24}$
 *         description: ID del plan de evaluación template a copiar
 *         example: "64f8b1234567890abcdef456"
 *     responses:
 *       201:
 *         description: Plan personal creado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 plan:
 *                   $ref: '#/components/schemas/StudentPlan'
 *             example:
 *               success: true
 *               plan:
 *                 _id: "64f8b1234567890abcdef789"
 *                 student: "user_123456789"
 *                 evaluationPlanId: "64f8b1234567890abcdef456"
 *                 subjectCode: "MATH101"
 *                 semester: "2024-1"
 *                 groupNumber: 1
 *                 activities: []
 *                 currentGrade: 0
 *                 progress: 0
 *                 isComplete: false
 *       400:
 *         description: Template no válido o ya existe un plan para este estudiante
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Template no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Usuario no autenticado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
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

/**
 * @swagger
 * /api/student-plans/{planId}/grades:
 *   put:
 *     summary: Actualizar calificaciones de actividades
 *     description: Actualiza las calificaciones de las actividades en un plan personal del estudiante y recalcula la nota actual
 *     tags: [Planes de Estudiantes]
 *     security:
 *       - SessionAuth: []
 *     parameters:
 *       - in: path
 *         name: planId
 *         required: true
 *         schema:
 *           type: string
 *           pattern: ^[0-9a-fA-F]{24}$
 *         description: ID del plan personal del estudiante
 *         example: "64f8b1234567890abcdef789"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - activities
 *             properties:
 *               activities:
 *                 type: array
 *                 description: Lista de actividades con calificaciones actualizadas
 *                 items:
 *                   type: object
 *                   required:
 *                     - _id
 *                   properties:
 *                     _id:
 *                       type: string
 *                       description: ID único de la actividad
 *                       example: "64f8b1234567890abcdef123"
 *                     grade:
 *                       type: number
 *                       minimum: 0
 *                       maximum: 5
 *                       description: Calificación obtenida en la actividad
 *                       example: 4.2
 *           example:
 *             activities:
 *               - _id: "64f8b1234567890abcdef123"
 *                 grade: 4.2
 *               - _id: "64f8b1234567890abcdef124"
 *                 grade: 3.8
 *               - _id: "64f8b1234567890abcdef125"
 *                 grade: null
 *     responses:
 *       200:
 *         description: Calificaciones actualizadas exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 plan:
 *                   $ref: '#/components/schemas/StudentPlan'
 *             example:
 *               success: true
 *               plan:
 *                 _id: "64f8b1234567890abcdef789"
 *                 student: "user_123456789"
 *                 subjectCode: "MATH101"
 *                 currentGrade: 4.0
 *                 progress: 66.67
 *                 lastUpdated: "2024-02-16T10:30:00.000Z"
 *       400:
 *         description: Datos de entrada inválidos
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: No es propietario del plan
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Plan no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Usuario no autenticado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
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

/**
 * @swagger
 * /api/my-plans/{planId}:
 *   delete:
 *     summary: Eliminar un plan personal
 *     description: Elimina permanentemente un plan personal del estudiante. Solo el propietario puede eliminar su plan
 *     tags: [Planes de Estudiantes]
 *     security:
 *       - SessionAuth: []
 *     parameters:
 *       - in: path
 *         name: planId
 *         required: true
 *         schema:
 *           type: string
 *           pattern: ^[0-9a-fA-F]{24}$
 *         description: ID del plan personal a eliminar
 *         example: "64f8b1234567890abcdef789"
 *     responses:
 *       200:
 *         description: Plan eliminado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Plan eliminado correctamente"
 *       403:
 *         description: No es propietario del plan
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Plan no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Usuario no autenticado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
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

/**
 * @swagger
 * /api/student-plans/{planId}:
 *   get:
 *     summary: Obtener detalles de un plan personal
 *     description: Obtiene los detalles completos de un plan personal del estudiante, incluyendo el plan original relacionado
 *     tags: [Planes de Estudiantes]
 *     security:
 *       - SessionAuth: []
 *     parameters:
 *       - in: path
 *         name: planId
 *         required: true
 *         schema:
 *           type: string
 *           pattern: ^[0-9a-fA-F]{24}$
 *         description: ID del plan personal del estudiante
 *         example: "64f8b1234567890abcdef789"
 *     responses:
 *       200:
 *         description: Detalles del plan obtenidos exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 plan:
 *                   allOf:
 *                     - $ref: '#/components/schemas/StudentPlan'
 *                     - type: object
 *                       properties:
 *                         originalPlan:
 *                           $ref: '#/components/schemas/EvaluationPlan'
 *             example:
 *               success: true
 *               plan:
 *                 _id: "64f8b1234567890abcdef789"
 *                 student: "user_123456789"
 *                 subjectCode: "MATH101"
 *                 semester: "2024-1"
 *                 groupNumber: 1
 *                 currentGrade: 3.8
 *                 progress: 75
 *                 isComplete: false
 *                 originalPlan:
 *                   _id: "64f8b1234567890abcdef456"
 *                   subjectCode: "MATH101"
 *                   subjectName: "Cálculo Diferencial"
 *                   professor: "Dr. María García"
 *                   activities: []
 *       403:
 *         description: No es propietario del plan
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Plan no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Usuario no autenticado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
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