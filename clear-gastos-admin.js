/**
 * SCRIPT PELIGROSO - BORRAR TODOS LOS GASTOS (CON ADMIN SDK)
 * 
 * Este script elimina TODOS los documentos de la colección "expenses" en Firestore.
 * Solo debe ejecutarse ANTES de pasar a producción para limpiar datos de prueba.
 * 
 * ADVERTENCIA: Esta acción NO se puede deshacer.
 * 
 * Para ejecutar:
 * 1. Obtén el archivo serviceAccountKey.json de Firebase Console:
 *    https://console.firebase.google.com/project/abaigar-7ef70/settings/serviceaccounts/adminsdk
 * 2. Colócalo en la raíz del proyecto
 * 3. Ejecuta: node clear-gastos-admin.js
 */

const admin = require('firebase-admin');
const fs = require('fs');

// Intentar cargar el service account
let serviceAccount;
try {
  serviceAccount = JSON.parse(fs.readFileSync('./serviceAccounkey.json', 'utf8'));
} catch (error) {
  console.error('❌ Error: No se encontró el archivo serviceAccounkey.json');
  console.error('');
  console.error('Para obtener este archivo:');
  console.error('1. Ve a: https://console.firebase.google.com/project/abaigar-7ef70/settings/serviceaccounts/adminsdk');
  console.error('2. Haz clic en "Generar nueva clave privada"');
  console.error('3. Guarda el archivo como serviceAccounkey.json en la raíz del proyecto');
  console.error('');
  process.exit(1);
}

async function clearAllGastos() {
  try {
    console.log('⚠️  ADVERTENCIA: Este script borrará TODOS los gastos de Firestore');
    console.log('⚠️  Esta acción NO se puede deshacer');
    console.log('');
    console.log('Iniciando Firebase Admin SDK...');
    
    // Inicializar Firebase Admin
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: 'abaigar-7ef70'
    });
    
    const db = admin.firestore();
    
    console.log('Conectado a Firestore');
    console.log('');
    console.log('Obteniendo todos los gastos...');
    
    // Obtener todos los documentos de la colección "expenses"
    const gastosSnapshot = await db.collection('expenses').get();
    
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
      await db.collection('expenses').doc(gastoDocs.id).delete();
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
