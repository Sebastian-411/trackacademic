const swaggerJSDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Trackademic API',
      version: '1.0.0',
      description: 'API para la gestión de notas y planes de evaluación académicos',
      contact: {
        name: 'Equipo Trackademic',
        email: 'support@trackademic.com'
      }
    },
    servers: [
      {
        url: process.env.NODE_ENV === 'production' 
          ? 'https://api.trackademic.com' 
          : `http://localhost:${process.env.PORT || 3000}`,
        description: process.env.NODE_ENV === 'production' ? 'Servidor de Producción' : 'Servidor de Desarrollo'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false
            },
            error: {
              type: 'string',
              example: 'Mensaje de error'
            }
          }
        },
        Success: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true
            },
            message: {
              type: 'string',
              example: 'Operación exitosa'
            }
          }
        },
        EvaluationPlan: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
              example: '64f8b123abc456789def0123'
            },
            semester: {
              type: 'string',
              example: '2023-2'
            },
            subjectCode: {
              type: 'string',
              example: 'BD001'
            },
            groupNumber: {
              type: 'integer',
              example: 1
            },
            professorId: {
              type: 'string',
              example: '123456789012345'
            },
            activities: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: {
                    type: 'string',
                    example: 'Primera evaluación'
                  },
                  percentage: {
                    type: 'number',
                    example: 10
                  },
                  description: {
                    type: 'string',
                    example: 'Evaluación teórica del primer parcial'
                  }
                }
              }
            },
            createdBy: {
              type: 'string',
              example: 'user123'
            },
            isApproved: {
              type: 'boolean',
              example: true
            },
            createdAt: {
              type: 'string',
              format: 'date-time'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time'
            }
          }
        },
        Grade: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
              example: '64f8b123abc456789def0456'
            },
            userId: {
              type: 'string',
              example: 'user123'
            },
            evaluationPlanId: {
              type: 'string',
              example: '64f8b123abc456789def0123'
            },
            activityGrades: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  activityName: {
                    type: 'string',
                    example: 'Primera evaluación'
                  },
                  grade: {
                    type: 'number',
                    example: 4.2
                  },
                  maxGrade: {
                    type: 'number',
                    example: 5.0
                  }
                }
              }
            },
            finalGrade: {
              type: 'number',
              example: 4.1
            },
            semester: {
              type: 'string',
              example: '2023-2'
            },
            createdAt: {
              type: 'string',
              format: 'date-time'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time'
            }
          }
        }
      }
    },
    security: [
      {
        bearerAuth: []
      }
    ]
  },
  apis: ['./src/routes/*.js'], // Archivos que contienen anotaciones OpenAPI
};

const specs = swaggerJSDoc(options);

const swaggerSetup = (app) => {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, {
    explorer: true,
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'Trackademic API Documentation'
  }));
};

module.exports = swaggerSetup; 