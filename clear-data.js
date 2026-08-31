/**
 * SCRIPT PARA BORRAR DATOS DE FIRESTORE
 * 
 * Este script elimina documentos de colecciones específicas en Firestore.
 * Útil durante el desarrollo para limpiar datos de prueba.
 * 
 * ADVERTENCIA: Esta acción NO se puede deshacer.
 * 
 * Uso:
 * node clear-data.js [colecciones]
 * 
 * Ejemplos:
 * node clear-data.js all                          # Borra todo (eventos, configuraciones, usuarios NO)
 * node clear-data.js eventRegistrations          # Borra solo inscripciones de eventos
 * node clear-data.js eventRegistrations eventConfigs  # Borra inscripciones y configs
 * node clear-data.js expenses                    # Borra gastos
 * 
 * Colecciones disponibles:
 * - eventRegistrations (inscripciones de eventos)
 * - eventConfigs (configuración de eventos)
 * - expenses (gastos)
 * - products (productos)
 * - all (todas las anteriores, NO borra usuarios)
 */

const admin = require('firebase-admin');

// Configuración de Firebase Admin
const projectId = process.env.REACT_APP_FIREBASE_PROJECT_ID || "abaigar-7ef70";

// Colecciones disponibles para borrar
const AVAILABLE_COLLECTIONS = {
  eventRegistrations: 'Inscripciones de eventos',
  eventConfigs: 'Configuración de eventos',
  expenses: 'Gastos',
  products: 'Productos'
};

async function clearCollection(db, collectionName) {
  console.log(`\n📦 Procesando colección: ${collectionName}...`);
  
  try {
    const snapshot = await db.collection(collectionName).get();
    const total = snapshot.size;
    
    if (total === 0) {
      console.log(`   ✅ No hay documentos en ${collectionName}`);
      return 0;
    }
    
    console.log(`   🔍 Encontrados ${total} documentos`);
    console.log(`   🗑️  Borrando...`);
    
    let deleted = 0;
    const deletePromises = [];
    
    snapshot.docs.forEach(docSnapshot => {
      deletePromises.push(
        db.collection(collectionName).doc(docSnapshot.id).delete()
          .then(() => {
            deleted++;
            if (deleted % 10 === 0 || deleted === total) {
              process.stdout.write(`\r   Progreso: ${deleted}/${total}`);
            }
          })
      );
    });
    
    await Promise.all(deletePromises);
    console.log(`\n   ✅ ${deleted} documentos eliminados de ${collectionName}`);
    return deleted;
    
  } catch (error) {
    console.error(`   ❌ Error en ${collectionName}:`, error.message);
    return 0;
  }
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('❌ Error: Debes especificar qué colecciones borrar\n');
    console.log('Uso: node clear-data.js [colecciones]\n');
    console.log('Colecciones disponibles:');
    Object.entries(AVAILABLE_COLLECTIONS).forEach(([key, name]) => {
      console.log(`  - ${key}: ${name}`);
    });
    console.log('  - all: Todas las colecciones (excepto usuarios)\n');
    console.log('Ejemplos:');
    console.log('  node clear-data.js eventRegistrations');
    console.log('  node clear-data.js eventRegistrations eventConfigs');
    console.log('  node clear-data.js all');
    process.exit(1);
  }
  
  let collectionsToDelete = [];
  
  if (args.includes('all')) {
    collectionsToDelete = Object.keys(AVAILABLE_COLLECTIONS);
  } else {
    collectionsToDelete = args.filter(arg => AVAILABLE_COLLECTIONS[arg]);
    
    const invalid = args.filter(arg => !AVAILABLE_COLLECTIONS[arg] && arg !== 'all');
    if (invalid.length > 0) {
      console.log(`❌ Colecciones no válidas: ${invalid.join(', ')}\n`);
      process.exit(1);
    }
  }
  
  console.log('⚠️  ═══════════════════════════════════════════════════════════');
  console.log('⚠️  ADVERTENCIA: Este script borrará datos de Firestore');
  console.log('⚠️  Esta acción NO se puede deshacer');
  console.log('⚠️  ═══════════════════════════════════════════════════════════\n');
  console.log('Colecciones a borrar:');
  collectionsToDelete.forEach(col => {
    console.log(`  - ${col}: ${AVAILABLE_COLLECTIONS[col]}`);
  });
  console.log('');
  
  // Esperar 3 segundos para que el usuario pueda cancelar
  console.log('⏳ Esperando 3 segundos... (Ctrl+C para cancelar)');
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  try {
    console.log('\n🔥 Iniciando Firebase Admin...');
    
    // Inicializar Firebase Admin con credenciales de aplicación predeterminadas
    if (!admin.apps.length) {
      admin.initializeApp({
        projectId: projectId
      });
    }
    
    const db = admin.firestore();
    console.log('✅ Conectado a Firestore\n');
    
    let totalDeleted = 0;
    
    for (const collectionName of collectionsToDelete) {
      const deleted = await clearCollection(db, collectionName);
      totalDeleted += deleted;
    }
    
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log(`✅ Proceso completado: ${totalDeleted} documentos eliminados en total`);
    console.log('═══════════════════════════════════════════════════════════\n');
    
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ Error fatal:', error.message);
    console.error(error);
    process.exit(1);
  }
}

// Ejecutar
main();
