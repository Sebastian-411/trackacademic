const mongoose = require('mongoose');
const { supabase } = require('../src/config/database');
require('dotenv').config();

// Conectar a MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

const EvaluationPlan = require('../src/models/EvaluationPlan');

async function migrateSubjectNames() {
  try {
    console.log('🔄 Iniciando migración de nombres de materias...');
    
    // Obtener todos los planes que no tienen subjectName
    const plansWithoutSubjectName = await EvaluationPlan.find({
      $or: [
        { subjectName: { $exists: false } },
        { subjectName: null },
        { subjectName: '' }
      ]
    });

    console.log(`📊 Encontrados ${plansWithoutSubjectName.length} planes sin nombre de materia`);

    if (plansWithoutSubjectName.length === 0) {
      console.log('✅ No hay planes que necesiten actualización');
      return;
    }

    // Obtener todos los códigos únicos de materias
    const uniqueSubjectCodes = [...new Set(plansWithoutSubjectName.map(plan => plan.subjectCode))];
    console.log(`📚 Consultando información de ${uniqueSubjectCodes.length} materias únicas...`);

    // Consultar nombres de materias desde Supabase
    const subjectNamesMap = new Map();
    
    for (const subjectCode of uniqueSubjectCodes) {
      try {
        const { data: subjectInfo } = await supabase
          .from('subjects')
          .select('name')
          .eq('code', subjectCode)
          .single();
        
        if (subjectInfo?.name) {
          subjectNamesMap.set(subjectCode, subjectInfo.name);
          console.log(`✓ ${subjectCode}: ${subjectInfo.name}`);
        } else {
          console.log(`⚠️  ${subjectCode}: No se encontró nombre`);
        }
      } catch (error) {
        console.log(`❌ ${subjectCode}: Error al consultar - ${error.message}`);
      }
    }

    console.log(`📝 Actualizando ${plansWithoutSubjectName.length} planes...`);

    // Actualizar planes uno por uno
    let updatedCount = 0;
    let errorCount = 0;

    for (const plan of plansWithoutSubjectName) {
      try {
        const subjectName = subjectNamesMap.get(plan.subjectCode);
        
        if (subjectName) {
          plan.subjectName = subjectName;
          await plan.save();
          updatedCount++;
          
          if (updatedCount % 10 === 0) {
            console.log(`📊 Progreso: ${updatedCount}/${plansWithoutSubjectName.length} planes actualizados`);
          }
        } else {
          console.log(`⚠️  Plan ${plan._id}: No se pudo obtener nombre para ${plan.subjectCode}`);
        }
      } catch (error) {
        console.error(`❌ Error actualizando plan ${plan._id}:`, error.message);
        errorCount++;
      }
    }

    console.log('\n🎉 Migración completada!');
    console.log(`✅ Planes actualizados: ${updatedCount}`);
    console.log(`❌ Errores: ${errorCount}`);
    console.log(`📊 Total procesados: ${updatedCount + errorCount}`);

  } catch (error) {
    console.error('💥 Error en la migración:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Desconectado de MongoDB');
  }
}

// Ejecutar migración
migrateSubjectNames(); 