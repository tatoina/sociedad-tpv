/**
 * SCRIPT PELIGROSO - BORRAR TODOS LOS GASTOS
 * 
 * Este script elimina TODOS los documentos de la colección "gastos" en Firestore.
 * Solo debe ejecutarse ANTES de pasar a producción para limpiar datos de prueba.
 * 
 * ADVERTENCIA: Esta acción NO se puede deshacer.
 * 
 * Para ejecutar:
 * node clear-gastos.js
 */

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, deleteDoc, doc } = require('firebase/firestore');

// Configuración de Firebase (debe coincidir con src/firebase.js)
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY || "TU_API_KEY_AQUI",
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || "TU_AUTH_DOMAIN_AQUI",
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || "TU_PROJECT_ID_AQUI",
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || "TU_STORAGE_BUCKET_AQUI",
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || "TU_MESSAGING_SENDER_ID_AQUI",
  appId: process.env.REACT_APP_FIREBASE_APP_ID || "TU_APP_ID_AQUI"
};

async function clearAllGastos() {
  try {
    console.log('⚠️  ADVERTENCIA: Este script borrará TODOS los gastos de Firestore');
    console.log('⚠️  Esta acción NO se puede deshacer');
    console.log('');
    console.log('Iniciando Firebase...');
    
    // Inicializar Firebase
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);
    
    console.log('Conectado a Firestore');
    console.log('');
    console.log('Obteniendo todos los gastos...');
    
    // Obtener todos los documentos de la colección "gastos"
    const gastosSnapshot = await getDocs(collection(db, 'gastos'));
    
    const totalGastos = gastosSnapshot.size;
    
    if (totalGastos === 0) {
      console.log('✅ No hay gastos para borrar');
      process.exit(0);
    }
    
    console.log(`📊 Se encontraron ${totalGastos} gastos`);
    console.log('');
    console.log('Iniciando borrado...');
    
    let deleted = 0;
    const batchSize = 10;
    
    // Borrar documentos en lotes
    for (const gastoDocs of gastosSnapshot.docs) {
      await deleteDoc(doc(db, 'gastos', gastoDocs.id));
      deleted++;
      
      // Mostrar progreso cada 10 documentos
      if (deleted % batchSize === 0 || deleted === totalGastos) {
        console.log(`Borrados: ${deleted}/${totalGastos} (${Math.round(deleted/totalGastos*100)}%)`);
      }
    }
    
    console.log('');
    console.log(`✅ Borrado completado: ${deleted} gastos eliminados`);
    console.log('');
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error al borrar gastos:', error);
    console.error(error.message);
    process.exit(1);
  }
}

// Confirmación de seguridad
console.log('');
console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║                    ⚠️  ADVERTENCIA ⚠️                      ║');
console.log('║                                                            ║');
console.log('║  Este script borrará TODOS los gastos de la base de datos ║');
console.log('║  Esta acción es IRREVERSIBLE                              ║');
console.log('║                                                            ║');
console.log('║  Solo ejecutar ANTES de pasar a producción                ║');
console.log('╚════════════════════════════════════════════════════════════╝');
console.log('');

// Esperar 3 segundos antes de ejecutar
console.log('Iniciando en 3 segundos...');
setTimeout(() => {
  console.log('Ejecutando...');
  console.log('');
  clearAllGastos();
}, 3000);
