const mongoose = require('mongoose');
require('dotenv').config();

async function cleanupDocuments() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Conectado a MongoDB');

    const collection = mongoose.connection.collection('evaluationplans');
    
    // Encontrar documentos con versionId nulo
    const docsWithNullVersionId = await collection.find({ versionId: null }).toArray();
    console.log(`Encontrados ${docsWithNullVersionId.length} documentos con versionId nulo`);

    // Actualizar cada documento con un nuevo versionId
    for (const doc of docsWithNullVersionId) {
      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substr(2, 8);
      const newVersionId = `${doc.subjectCode || 'COURSE'}_${doc.semester || 'SEMESTER'}_${doc.groupNumber || 1}_${timestamp}_${randomId}`;
      
      await collection.updateOne(
        { _id: doc._id },
        { 
          $set: { 
            versionId: newVersionId,
            createdTimestamp: timestamp
          }
        }
      );
    }

    console.log('Documentos actualizados correctamente');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Desconectado de MongoDB');
  }
}

cleanupDocuments(); 