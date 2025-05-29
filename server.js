const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');
const cookieParser = require('cookie-parser');
const session = require('express-session');
require('dotenv').config();

const { connectMongoDB } = require('./src/config/database');
const logger = require('./src/utils/logger');
const { errorHandler } = require('./src/middleware/errorHandler');
const swaggerSetup = require('./src/config/swagger');

// Importar rutas API
const authRoutes = require('./src/routes/auth');
const evaluationPlanRoutes = require('./src/routes/evaluationPlans');
const gradeRoutes = require('./src/routes/grades');
const academicRoutes = require('./src/routes/academic');
const reportRoutes = require('./src/routes/reports');
const commentRoutes = require('./src/routes/comments');

// Importar rutas de vistas
const webRoutes = require('./src/routes/web');

const app = express();
const PORT = process.env.PORT || 3000;

// Configurar motor de plantillas EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'src/views'));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutos
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: {
    error: 'Demasiadas solicitudes desde esta IP, intenta de nuevo más tarde.'
  }
});

// Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com", "https://fonts.googleapis.com"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdn.jsdelivr.net"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
    },
  },
}));
app.use(cors());
app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) }}));
app.use(limiter);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Configurar sesiones
app.use(session({
  secret: process.env.SESSION_SECRET || 'trackademic-session-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000 // 24 horas
  }
}));

// Servir archivos estáticos
app.use(express.static(path.join(__dirname, 'public')));

// Configurar Swagger
swaggerSetup(app);

// Rutas de la aplicación web
app.use('/', webRoutes);

// Rutas API
app.use('/api/auth', authRoutes);
app.use('/api/evaluation-plans', evaluationPlanRoutes);
app.use('/api/grades', gradeRoutes);
app.use('/api/academic', academicRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/comments', commentRoutes);

// Ruta de health check
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV
  });
});

// Manejo de rutas no encontradas
app.use('*', (req, res) => {
  // Si es una ruta de API, devolver JSON
  if (req.originalUrl.startsWith('/api/')) {
    res.status(404).json({
      error: 'Ruta no encontrada',
      message: `La ruta ${req.originalUrl} no existe en este servidor.`
    });
  } else {
    // Si es una ruta web, renderizar página 404
    res.status(404).render('error', {
      title: 'Página no encontrada',
      error: {
        status: 404,
        message: 'La página que buscas no existe.'
      }
    });
  }
});

// Middleware de manejo de errores
app.use(errorHandler);

// Conectar a MongoDB y iniciar servidor
async function startServer() {
  try {
    await connectMongoDB();
    logger.info('Conectado exitosamente a MongoDB');
    
    app.listen(PORT, () => {
      logger.info(`Servidor corriendo en puerto ${PORT}`);
      logger.info(`Aplicación web disponible en http://localhost:${PORT}`);
      logger.info(`Documentación Swagger disponible en http://localhost:${PORT}/api-docs`);
    });
  } catch (error) {
    logger.error('Error al iniciar el servidor:', error);
    process.exit(1);
  }
}

// Manejo graceful de cierre
process.on('SIGTERM', () => {
  logger.info('Recibida señal SIGTERM, cerrando servidor...');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('Recibida señal SIGINT, cerrando servidor...');
  process.exit(0);
});

startServer(); 