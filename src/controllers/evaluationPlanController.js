const EvaluationPlan = require('../models/EvaluationPlan');
const StudentPlan = require('../models/StudentPlan');

/**
 * @swagger
 * /evaluation-plans/{planId}:
 *   get:
 *     summary: Ver un plan de evaluación específico
 *     description: Obtiene los detalles completos de un plan de evaluación específico por su ID
 *     tags: [Planes de Evaluación]
 *     security:
 *       - SessionAuth: []
 *     parameters:
 *       - in: path
 *         name: planId
 *         required: true
 *         schema:
 *           type: string
 *           pattern: ^[0-9a-fA-F]{24}$
 *         description: ID único del plan de evaluación (ObjectId de MongoDB)
 *         example: "64f8b1234567890abcdef456"
 *     responses:
 *       200:
 *         description: Plan de evaluación obtenido exitosamente
 *         content:
 *           text/html:
 *             schema:
 *               type: string
 *               description: Página HTML renderizada con el plan
 *       404:
 *         description: Plan no encontrado
 *         content:
 *           text/html:
 *             schema:
 *               type: string
 *               description: Redirección al dashboard con mensaje de error
 *       401:
 *         description: Usuario no autenticado
 *         content:
 *           text/html:
 *             schema:
 *               type: string
 *               description: Redirección a la página de login
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           text/html:
 *             schema:
 *               type: string
 *               description: Redirección al dashboard con mensaje de error
 */
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

/**
 * @swagger
 * /evaluation-plans/{planId}/edit:
 *   get:
 *     summary: Renderizar formulario de edición de plan
 *     description: Muestra el formulario para editar un plan de evaluación existente. Solo accesible para profesores y administradores
 *     tags: [Planes de Evaluación]
 *     security:
 *       - SessionAuth: []
 *     parameters:
 *       - in: path
 *         name: planId
 *         required: true
 *         schema:
 *           type: string
 *           pattern: ^[0-9a-fA-F]{24}$
 *         description: ID único del plan de evaluación
 *         example: "64f8b1234567890abcdef456"
 *     responses:
 *       200:
 *         description: Formulario de edición cargado exitosamente
 *         content:
 *           text/html:
 *             schema:
 *               type: string
 *               description: Página HTML con formulario de edición
 *       403:
 *         description: Sin permisos para editar el plan
 *         content:
 *           text/html:
 *             schema:
 *               type: string
 *               description: Página de error de permisos
 *       404:
 *         description: Plan no encontrado
 *         content:
 *           text/html:
 *             schema:
 *               type: string
 *               description: Redirección al dashboard con mensaje de error
 *       401:
 *         description: Usuario no autenticado
 *       500:
 *         description: Error interno del servidor
 */
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

/**
 * @swagger
 * /api/evaluation-plans/{planId}:
 *   put:
 *     summary: Actualizar un plan de evaluación
 *     description: Actualiza los datos de un plan de evaluación existente, incluyendo actividades y información básica
 *     tags: [Planes de Evaluación]
 *     security:
 *       - SessionAuth: []
 *     parameters:
 *       - in: path
 *         name: planId
 *         required: true
 *         schema:
 *           type: string
 *           pattern: ^[0-9a-fA-F]{24}$
 *         description: ID único del plan de evaluación
 *         example: "64f8b1234567890abcdef456"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - subjectCode
 *               - semester
 *               - groupNumber
 *               - activities
 *             properties:
 *               subjectCode:
 *                 type: string
 *                 description: Código de la materia
 *                 example: "MATH101"
 *               semester:
 *                 type: string
 *                 description: Semestre académico
 *                 example: "2024-1"
 *               groupNumber:
 *                 type: number
 *                 description: Número del grupo
 *                 example: 1
 *               activities:
 *                 type: array
 *                 description: Lista de actividades del plan
 *                 items:
 *                   type: object
 *                   required:
 *                     - name
 *                     - percentage
 *                   properties:
 *                     name:
 *                       type: string
 *                       description: Nombre de la actividad
 *                       example: "Examen Parcial 1"
 *                     description:
 *                       type: string
 *                       description: Descripción de la actividad
 *                       example: "Examen sobre los temas 1-5 del curso"
 *                     percentage:
 *                       type: number
 *                       minimum: 0
 *                       maximum: 100
 *                       description: Porcentaje de la actividad en la nota final
 *                       example: 25
 *                     dueDate:
 *                       type: string
 *                       format: date-time
 *                       description: Fecha límite de entrega
 *                       example: "2024-03-15T23:59:59.000Z"
 *           example:
 *             subjectCode: "MATH101"
 *             semester: "2024-1"
 *             groupNumber: 1
 *             activities:
 *               - name: "Examen Parcial 1"
 *                 description: "Primer examen parcial del curso"
 *                 percentage: 25
 *                 dueDate: "2024-03-15T23:59:59.000Z"
 *               - name: "Proyecto Final"
 *                 description: "Proyecto integrador del curso"
 *                 percentage: 35
 *                 dueDate: "2024-05-20T23:59:59.000Z"
 *     responses:
 *       200:
 *         description: Plan actualizado exitosamente
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
 *                   example: "Plan actualizado correctamente"
 *                 affectedStudents:
 *                   type: number
 *                   description: Número de estudiantes que usan este plan
 *                   example: 15
 *       400:
 *         description: Datos de entrada inválidos
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Sin permisos para actualizar el plan
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

/**
 * @swagger
 * /api/evaluation-plans/{planId}/stats:
 *   get:
 *     summary: Obtener estadísticas de un plan de evaluación
 *     description: Obtiene estadísticas detalladas sobre el uso y rendimiento de un plan de evaluación específico
 *     tags: [Planes de Evaluación]
 *     security:
 *       - SessionAuth: []
 *     parameters:
 *       - in: path
 *         name: planId
 *         required: true
 *         schema:
 *           type: string
 *           pattern: ^[0-9a-fA-F]{24}$
 *         description: ID único del plan de evaluación
 *         example: "64f8b1234567890abcdef456"
 *     responses:
 *       200:
 *         description: Estadísticas obtenidas exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 plan:
 *                   $ref: '#/components/schemas/EvaluationPlan'
 *                 stats:
 *                   type: object
 *                   properties:
 *                     totalStudents:
 *                       type: number
 *                       description: Total de estudiantes usando el plan
 *                       example: 25
 *                     averageGrade:
 *                       type: number
 *                       description: Promedio de calificaciones de todos los estudiantes
 *                       example: 3.7
 *                     completedPlans:
 *                       type: number
 *                       description: Número de estudiantes que han completado todas las actividades
 *                       example: 12
 *           example:
 *             success: true
 *             plan:
 *               _id: "64f8b1234567890abcdef456"
 *               subjectCode: "MATH101"
 *               semester: "2024-1"
 *               groupNumber: 1
 *               activities: []
 *               isApproved: true
 *             stats:
 *               totalStudents: 25
 *               averageGrade: 3.7
 *               completedPlans: 12
 *       404:
 *         description: Plan no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Sin permisos para ver las estadísticas
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