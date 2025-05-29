const mongoose = require('mongoose');
const { createClient } = require('@supabase/supabase-js');
const logger = require('../utils/logger');

// Configuración de MongoDB
const connectMongoDB = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/trackademic';
    
    await mongoose.connect(mongoUri);
    
    logger.info('Conectado exitosamente a MongoDB');
  } catch (error) {
    logger.error('Error conectando a MongoDB:', error);
    throw error;
  }
};

// Configuración de Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Variables de entorno de Supabase no están configuradas');
}

// Cliente público de Supabase
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Cliente de servicio de Supabase (para operaciones administrativas)
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// Función para verificar la conexión a Supabase
const testSupabaseConnection = async () => {
  try {
    const { data, error } = await supabase
      .from('faculties')
      .select('*')
      .limit(1);
    
    if (error) {
      logger.error('Error conectando a Supabase:', error);
      return false;
    }
    
    logger.info('Conectado exitosamente a Supabase');
    return true;
  } catch (error) {
    logger.error('Error verificando conexión a Supabase:', error);
    return false;
  }
};

module.exports = {
  connectMongoDB,
  supabase,
  supabaseAdmin,
  testSupabaseConnection
}; 