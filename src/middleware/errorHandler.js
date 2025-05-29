const logger = require('../utils/logger');

const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log del error
  logger.error('Error en la aplicación:', {
    error: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  // Error de validación de Mongoose
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message).join(', ');
    error = {
      statusCode: 400,
      message: `Error de validación: ${message}`
    };
  }

  // Error de cast de Mongoose (ID inválido)
  if (err.name === 'CastError') {
    const message = 'Recurso no encontrado - ID inválido';
    error = {
      statusCode: 404,
      message
    };
  }

  // Error de clave duplicada de Mongoose
  if (err.code === 11000) {
    const message = 'Recurso duplicado - ya existe un registro con esos datos';
    error = {
      statusCode: 400,
      message
    };
  }

  // Error de JWT
  if (err.name === 'JsonWebTokenError') {
    const message = 'Token no válido';
    error = {
      statusCode: 401,
      message
    };
  }

  // Error de JWT expirado
  if (err.name === 'TokenExpiredError') {
    const message = 'Token expirado';
    error = {
      statusCode: 401,
      message
    };
  }

  // Error de Supabase
  if (err.message && err.message.includes('supabase')) {
    error = {
      statusCode: 500,
      message: 'Error en la base de datos'
    };
  }

  res.status(error.statusCode || 500).json({
    success: false,
    error: error.message || 'Error interno del servidor',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

module.exports = { errorHandler }; 