/**
 * Script para crear el usuario administrador inicial.
 * Ejecutar desde la carpeta functions: node ../create-admin-user.js
 */
const admin = require('./functions/node_modules/firebase-admin');
const fs = require('fs');
const path = require('path');

const serviceAccount = JSON.parse(fs.readFileSync(path.join(__dirname, 'serviceAccounkey.json'), 'utf8'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'abaigar-7ef70'
});

async function createAdminUser() {
  const email = 'admin@admin.es';
  const password = '123456';

  try {
    // Intentar crear el usuario
    const userRecord = await admin.auth().createUser({
      email,
      password,
      displayName: 'Admin',
      emailVerified: true
    });

    console.log('✅ Usuario admin creado:', userRecord.uid);

    // Guardar en Firestore con rol admin
    await admin.firestore().collection('users').doc(userRecord.uid).set({
      email,
      nombre: 'Admin',
      rol: 'admin',
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log('✅ Documento en Firestore creado con rol admin');

  } catch (error) {
    if (error.code === 'auth/email-already-exists') {
      console.log('⚠️  El usuario ya existe, actualizando contraseña...');
      const existing = await admin.auth().getUserByEmail(email);
      await admin.auth().updateUser(existing.uid, { password });
      console.log('✅ Contraseña actualizada');

      // Asegurar que tiene rol admin en Firestore
      await admin.firestore().collection('users').doc(existing.uid).set({
        email,
        nombre: 'Admin',
        rol: 'admin',
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
      console.log('✅ Documento Firestore actualizado con rol admin');
    } else {
      console.error('❌ Error:', error.message);
    }
  }

  process.exit(0);
}

createAdminUser();
