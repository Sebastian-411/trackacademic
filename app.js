const express = require('express');
const session = require('express-session');
const path = require('path');
const compression = require('compression');
const helmet = require('helmet');
const MongoStore = require('connect-mongo');

// Configuración de Swagger
const { swaggerSpec, swaggerUi, swaggerUiOptions } = require('./src/config/swagger');

require('dotenv').config();

const app = express();

// Configuración de seguridad con CSP relajado para Swagger
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdn.jsdelivr.net"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://cdn.jsdelivr.net"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdn.jsdelivr.net"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      connectSrc: ["'self'", "https://api.trackademic.com"]
    }
  }
}));

// Compresión
app.use(compression());

// Middleware para parsear JSON y URL encoded
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Configuración de sesiones
app.use(session({
  secret: process.env.SESSION_SECRET || 'trackademic-secret-key',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGODB_URI || 'mongodb://localhost:27017/trackademic'
  }),
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 horas
  }
}));

// Configuración de vistas
app.set('views', path.join(__dirname, 'src/views'));
app.set('view engine', 'ejs');

// Archivos estáticos
app.use(express.static(path.join(__dirname, 'public')));

// Middleware para hacer el usuario disponible en las vistas
app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  next();
});

// ================================================================
// CONFIGURACIÓN DE SWAGGER
// ================================================================

/**
 * Configuración completa de Swagger UI para documentar la API de Trackademic
 * 
 * Endpoints disponibles:
 * - /api-docs: Interfaz de Swagger UI
 * - /api-docs.json: Especificación OpenAPI en formato JSON
 */

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

// ================================================================

// Rutas
const webRoutes = require('./src/routes/web');
app.use('/', webRoutes);

// Manejo de errores 404
app.use('*', (req, res) => {
  res.status(404).render('error', {
    title: 'Página no encontrada',
    error: {
      status: 404,
      message: 'La página que buscas no existe.'
    }
  });
});

// Manejo de errores generales
app.use((err, req, res, next) => {
  console.error('Error:', err);
  
  const status = err.status || 500;
  const message = status === 500 ? 'Error interno del servidor' : err.message;
  
  res.status(status).render('error', {
    title: 'Error',
    error: {
      status,
      message
    }
  });
});

// Iniciar servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`
🎓 Trackademic Server iniciado exitosamente

📋 Información del servidor:
   Puerto: ${PORT}
   Entorno: ${process.env.NODE_ENV || 'development'}
   URL: http://localhost:${PORT}

📚 Documentación API:
   Swagger UI: http://localhost:${PORT}/api-docs
   Especificación: http://localhost:${PORT}/api-docs.json
   Info API: http://localhost:${PORT}/api-info

🔧 Endpoints principales:
   🏠 Home: http://localhost:${PORT}
   🔐 Login: http://localhost:${PORT}/login
   📊 Dashboard: http://localhost:${PORT}/dashboard

✨ Estado: Listo para recibir conexiones
  `);
}); 