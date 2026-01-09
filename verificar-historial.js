const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccounkey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function verificarHistorial() {
  try {
    console.log('Verificando colección historial-resumenes...\n');
    
    const snapshot = await db.collection('historial-resumenes')
      .orderBy('fecha', 'desc')
      .limit(10)
      .get();
    
    if (snapshot.empty) {
      console.log('⚠️  La colección está vacía');
      return;
    }
    
    console.log(`✅ Encontrados ${snapshot.size} documentos:\n`);
    
    snapshot.forEach(doc => {
      const data = doc.data();
      console.log('─────────────────────────────────────');
      console.log(`ID: ${doc.id}`);
      console.log('TODOS LOS CAMPOS:', JSON.stringify(data, null, 2));
      console.log('');
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    process.exit(0);
  }
}

verificarHistorial();
