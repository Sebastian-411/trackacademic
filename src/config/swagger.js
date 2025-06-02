/**
 * TRACKADEMIC - CONFIGURACIÓN DE SWAGGER
 * 
 * Configuración completa de Swagger para documentar toda la API
 * del sistema de gestión de notas académicas Trackademic.
 */

const swaggerJSDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

// Configuración básica de Swagger
const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'Trackademic API',
    version: '1.0.0',
    description: `
# 🎓 Trackademic - API de Gestión de Notas Académicas

Sistema inteligente para gestionar notas académicas y optimizar el rendimiento estudiantil.

## Características principales:
- 📊 **Gestión de Planes de Evaluación**: Crear, editar y administrar planes de evaluación
- 📈 **Seguimiento de Calificaciones**: Registro y seguimiento de notas estudiantiles
- 🎯 **Proyecciones Inteligentes**: Cálculo automático de notas necesarias
- 📱 **API RESTful**: Endpoints completos para integración
- 🔐 **Autenticación Segura**: Sistema de autenticación con Supabase
- 📋 **Reportes Detallados**: Generación de reportes académicos

## Autenticación
La API utiliza autenticación basada en sesiones. Los usuarios deben iniciar sesión 
a través de los endpoints de autenticación antes de acceder a recursos protegidos.

## Roles de Usuario
- **student**: Estudiante con acceso a sus propios planes y calificaciones
- **professor**: Profesor con acceso a administrar planes de evaluación
- **coordinator**: Coordinador con acceso administrativo
- **admin**: Administrador con acceso completo al sistema

## Estados de Respuesta
- **200**: Operación exitosa
- **201**: Recurso creado exitosamente
- **400**: Error en la solicitud (datos inválidos)
- **401**: No autenticado
- **403**: Sin permisos suficientes
- **404**: Recurso no encontrado
- **500**: Error interno del servidor
`,
    contact: {
      name: 'Equipo Trackademic',
      email: 'support@trackademic.com',
      url: 'https://trackademic.com'
    },
    license: {
      name: 'MIT',
      url: 'https://opensource.org/licenses/MIT'
    }
  },
  servers: [
    {
      url: 'http://localhost:3000',
      description: 'Servidor de Desarrollo'
    },
    {
      url: 'https://trackademic.com',
      description: 'Servidor de Producción'
    }
  ],
  components: {
    securitySchemes: {
      SessionAuth: {
        type: 'apiKey',
        in: 'cookie',
        name: 'connect.sid',
        description: 'Autenticación basada en sesiones'
      }
    },
    schemas: {
      // Esquema de Usuario
      User: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            description: 'ID único del usuario',
            example: 'user_123456789'
          },
          email: {
            type: 'string',
            format: 'email',
            description: 'Correo electrónico del usuario',
            example: 'estudiante@universidad.edu'
          },
          firstName: {
            type: 'string',
            description: 'Nombre del usuario',
            example: 'Juan'
          },
          lastName: {
            type: 'string',
            description: 'Apellido del usuario',
            example: 'Pérez'
          },
          role: {
            type: 'string',
            enum: ['student', 'professor', 'coordinator', 'admin'],
            description: 'Rol del usuario en el sistema',
            example: 'student'
          },
          facultyCode: {
            type: 'string',
            description: 'Código de la facultad (para profesores)',
            example: 'FAC001'
          }
        },
        required: ['id', 'email', 'firstName', 'lastName', 'role']
      },
      
      // Esquema de Actividad
      Activity: {
        type: 'object',
        properties: {
          _id: {
            type: 'string',
            description: 'ID único de la actividad',
            example: '64f8b1234567890abcdef123'
          },
          name: {
            type: 'string',
            description: 'Nombre de la actividad',
            example: 'Examen Parcial 1'
          },
          description: {
            type: 'string',
            description: 'Descripción detallada de la actividad',
            example: 'Examen sobre los temas 1-5 del curso'
          },
          percentage: {
            type: 'number',
            minimum: 0,
            maximum: 100,
            description: 'Porcentaje de la actividad en la nota final',
            example: 25
          },
          dueDate: {
            type: 'string',
            format: 'date-time',
            description: 'Fecha límite de entrega',
            example: '2024-03-15T23:59:59.000Z'
          },
          grade: {
            type: 'number',
            minimum: 0,
            maximum: 5,
            description: 'Nota obtenida (solo para estudiantes)',
            example: 4.2
          },
          completed: {
            type: 'boolean',
            description: 'Indica si la actividad está completada',
            example: true
          }
        },
        required: ['name', 'percentage']
      },
      
      // Esquema de Plan de Evaluación
      EvaluationPlan: {
        type: 'object',
        properties: {
          _id: {
            type: 'string',
            description: 'ID único del plan',
            example: '64f8b1234567890abcdef456'
          },
          subjectCode: {
            type: 'string',
            description: 'Código de la materia',
            example: 'MATH101'
          },
          subjectName: {
            type: 'string',
            description: 'Nombre de la materia',
            example: 'Cálculo Diferencial'
          },
          semester: {
            type: 'string',
            description: 'Semestre académico',
            example: '2024-1'
          },
          groupNumber: {
            type: 'number',
            description: 'Número del grupo',
            example: 1
          },
          versionName: {
            type: 'string',
            description: 'Nombre de la versión del plan',
            example: 'Plan Principal'
          },
          professor: {
            type: 'string',
            description: 'Nombre del profesor',
            example: 'Dr. María García'
          },
          activities: {
            type: 'array',
            items: { $ref: '#/components/schemas/Activity' },
            description: 'Lista de actividades del plan'
          },
          isApproved: {
            type: 'boolean',
            description: 'Indica si el plan está aprobado',
            example: true
          },
          isMainVersion: {
            type: 'boolean',
            description: 'Indica si es la versión principal',
            example: true
          },
          usageCount: {
            type: 'number',
            description: 'Número de veces que se ha usado el plan',
            example: 15
          },
          createdAt: {
            type: 'string',
            format: 'date-time',
            description: 'Fecha de creación',
            example: '2024-01-15T10:30:00.000Z'
          },
          updatedAt: {
            type: 'string',
            format: 'date-time',
            description: 'Fecha de última actualización',
            example: '2024-02-10T14:45:00.000Z'
          }
        },
        required: ['subjectCode', 'semester', 'groupNumber', 'activities']
      },
      
      // Esquema de Plan de Estudiante
      StudentPlan: {
        type: 'object',
        properties: {
          _id: {
            type: 'string',
            description: 'ID único del plan del estudiante',
            example: '64f8b1234567890abcdef789'
          },
          student: {
            type: 'string',
            description: 'ID del estudiante',
            example: 'user_123456789'
          },
          evaluationPlanId: {
            $ref: '#/components/schemas/EvaluationPlan'
          },
          subjectCode: {
            type: 'string',
            description: 'Código de la materia',
            example: 'MATH101'
          },
          semester: {
            type: 'string',
            description: 'Semestre académico',
            example: '2024-1'
          },
          groupNumber: {
            type: 'number',
            description: 'Número del grupo',
            example: 1
          },
          activities: {
            type: 'array',
            items: { $ref: '#/components/schemas/Activity' },
            description: 'Actividades con calificaciones del estudiante'
          },
          currentGrade: {
            type: 'number',
            minimum: 0,
            maximum: 5,
            description: 'Nota actual calculada',
            example: 3.8
          },
          finalGrade: {
            type: 'number',
            minimum: 0,
            maximum: 5,
            description: 'Nota final (si todas las actividades están completadas)',
            example: 4.2
          },
          progress: {
            type: 'number',
            minimum: 0,
            maximum: 100,
            description: 'Porcentaje de progreso completado',
            example: 75
          },
          isComplete: {
            type: 'boolean',
            description: 'Indica si todas las actividades están completadas',
            example: false
          },
          lastUpdated: {
            type: 'string',
            format: 'date-time',
            description: 'Fecha de última actualización',
            example: '2024-02-15T16:20:00.000Z'
          }
        },
        required: ['student', 'evaluationPlanId', 'subjectCode', 'semester', 'groupNumber']
      },
      
      // Esquema de Estadísticas
      PlanStats: {
        type: 'object',
        properties: {
          totalStudents: {
            type: 'number',
            description: 'Total de estudiantes usando el plan',
            example: 25
          },
          averageGrade: {
            type: 'number',
            description: 'Promedio de calificaciones',
            example: 3.7
          },
          completedPlans: {
            type: 'number',
            description: 'Número de planes completados',
            example: 12
          }
        }
      },
      
      // Esquemas de Respuesta
      SuccessResponse: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            example: true
          },
          message: {
            type: 'string',
            example: 'Operación realizada exitosamente'
          }
        }
      },
      
      ErrorResponse: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            example: false
          },
          message: {
            type: 'string',
            example: 'Descripción del error'
          },
          error: {
            type: 'string',
            example: 'Detalles técnicos del error'
          }
        }
      },
      
      // Esquema de Entrada para Login
      LoginRequest: {
        type: 'object',
        properties: {
          email: {
            type: 'string',
            format: 'email',
            description: 'Correo electrónico del usuario',
            example: 'usuario@universidad.edu'
          },
          password: {
            type: 'string',
            description: 'Contraseña del usuario',
            example: 'miPassword123'
          }
        },
        required: ['email', 'password']
      },
      
      // Esquema de Entrada para Registro
      RegisterRequest: {
        type: 'object',
        properties: {
          email: {
            type: 'string',
            format: 'email',
            description: 'Correo electrónico del usuario',
            example: 'nuevo@universidad.edu'
          },
          password: {
            type: 'string',
            description: 'Contraseña del usuario',
            minLength: 6,
            example: 'miPassword123'
          },
          firstName: {
            type: 'string',
            description: 'Nombre del usuario',
            example: 'Ana'
          },
          lastName: {
            type: 'string',
            description: 'Apellido del usuario',
            example: 'López'
          }
        },
        required: ['email', 'password', 'firstName', 'lastName']
      }
    }
  },
  security: [
    {
      SessionAuth: []
    }
  ],
  tags: [
    {
      name: 'Autenticación',
      description: 'Endpoints para registro, login y logout'
    },
    {
      name: 'Planes de Evaluación',
      description: 'Gestión de planes de evaluación (profesores)'
    },
    {
      name: 'Planes de Estudiantes',
      description: 'Gestión de planes personales de estudiantes'
    },
    {
      name: 'Calificaciones',
      description: 'Gestión de calificaciones y notas'
    },
    {
      name: 'Reportes',
      description: 'Generación de reportes académicos'
    },
    {
      name: 'Dashboard',
      description: 'Información del panel principal'
    },
    {
      name: 'Comentarios',
      description: 'Sistema de comentarios en planes'
    }
  ]
};

// Opciones para swagger-jsdoc
const options = {
  definition: swaggerDefinition,
  apis: [
    './src/routes/*.js',
    './src/controllers/*.js',
    './src/models/*.js'
  ]
};

// Crear especificación de Swagger
const swaggerSpec = swaggerJSDoc(options);

// Configuración personalizada de Swagger UI
const swaggerUiOptions = {
  explorer: true,
  swaggerOptions: {
    docExpansion: 'none',
    filter: true,
    showRequestDuration: true,
    tryItOutEnabled: true,
    requestSnippetsEnabled: true,
    tagsSorter: 'alpha',
    operationsSorter: 'alpha'
  },
  customCss: `
    .swagger-ui .topbar { display: none; }
    .swagger-ui .info { margin: 50px 0; }
    .swagger-ui .info .title { color: #2563eb; }
    .swagger-ui .scheme-container { background: #f8fafc; padding: 15px; border-radius: 8px; }
  `,
  customSiteTitle: 'Trackademic API Documentation',
  customfavIcon: '/favicon.ico'
};

/**
 * Función para configurar Swagger en la aplicación Express
 * @param {import('express').Application} app - Instancia de la aplicación Express
 */
function setupSwagger(app) {
  // Endpoint para servir la especificación JSON
  app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });

  // Configurar Swagger UI
  app.use('/api-docs', swaggerUi.serve);
  app.get('/api-docs', swaggerUi.setup(swaggerSpec, swaggerUiOptions));

  // Endpoint de información de la API
  app.get('/api-info', (req, res) => {
    res.json({
      name: 'Trackademic API',
      version: '1.0.0',
      description: 'Sistema de gestión de notas académicas',
      documentation: '/api-docs',
      specification: '/api-docs.json',
      endpoints: {
        authentication: [
          'POST /login - Iniciar sesión',
          'POST /register - Registrar usuario',
          'POST /logout - Cerrar sesión'
        ],
        evaluationPlans: [
          'GET /evaluation-plans/{id} - Ver plan',
          'PUT /api/evaluation-plans/{id} - Actualizar plan',
          'GET /api/evaluation-plans/{id}/stats - Estadísticas'
        ],
        studentPlans: [
          'GET /api/my-plans - Obtener planes del estudiante',
          'POST /api/evaluation-plans/{id}/save - Guardar plan',
          'PUT /api/student-plans/{id}/grades - Actualizar calificaciones',
          'DELETE /api/my-plans/{id} - Eliminar plan'
        ]
      }
    });
  });
}

module.exports = setupSwagger; 