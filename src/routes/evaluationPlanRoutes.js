const express = require('express');
const router = express.Router();
const evaluationPlanController = require('../controllers/evaluationPlanController');
const { isAuthenticated } = require('../middleware/auth');

// Solo requerimos autenticación
router.use(isAuthenticated);

// Ver un plan específico
router.get('/:planId', evaluationPlanController.viewPlan);

// Formulario de edición
router.get('/:planId/edit', evaluationPlanController.renderEditForm);

// Actualizar plan
router.post('/:planId/update', evaluationPlanController.updateTemplate);

// Obtener estadísticas del plan
router.get('/:planId/stats', evaluationPlanController.getTemplateWithStats);

module.exports = router; 