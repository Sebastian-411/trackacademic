const mongoose = require('mongoose');
require('dotenv').config();

async function fixIndexes() {
  try {
    // Conectar a MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Conectado a MongoDB');

    // Obtener la colección
    const collection = mongoose.connection.collection('evaluationplans');

    // Eliminar todos los índices excepto _id
    await collection.dropIndexes();
    console.log('Índices eliminados');

    // Recrear los índices correctos
    await collection.createIndex(
      { semester: 1, subjectCode: 1, groupNumber: 1 },
      { sparse: true }
    );

    await collection.createIndex(
      { semester: 1, subjectCode: 1, groupNumber: 1, isMainVersion: 1 },
      { 
        unique: true,
        partialFilterExpression: { isMainVersion: true }
      }
    );

    await collection.createIndex({ professorId: 1, semester: 1 });
    await collection.createIndex({ createdBy: 1 });
    await collection.createIndex({ isApproved: 1, isActive: 1 });
    await collection.createIndex({ parentPlanId: 1 });
    await collection.createIndex({ usageCount: -1 });
    await collection.createIndex({ versionId: 1 }, { unique: true });

    console.log('Índices recreados correctamente');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Desconectado de MongoDB');
  }
}

fixIndexes(); 