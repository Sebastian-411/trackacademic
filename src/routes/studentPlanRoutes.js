const express = require('express');
const router = express.Router();
const studentPlanController = require('../controllers/studentPlanController');
const { isAuthenticated, isStudent } = require('../middleware/auth');

// Middleware para verificar que el usuario es un estudiante
router.use(isAuthenticated, isStudent);

// Obtener todos los planes del estudiante
router.get('/my-plans', studentPlanController.getMyPlans);

// Guardar un nuevo plan desde una plantilla
router.post('/save-plan/:templateId', studentPlanController.savePlan);

// Actualizar notas de un plan
router.put('/update-grades/:planId', studentPlanController.updateGrades);

// Eliminar un plan
router.delete('/my-plans/:planId', studentPlanController.deletePlan);

// Obtener detalles de un plan específico
router.get('/my-plans/:planId', studentPlanController.getPlanDetails);

module.exports = router; 