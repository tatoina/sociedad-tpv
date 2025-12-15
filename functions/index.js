const functions = require('firebase-functions');
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');

admin.initializeApp();

// Configuración del transportador de email
// IMPORTANTE: Debes configurar las variables de entorno en Firebase
// firebase functions:config:set gmail.email="tu-email@gmail.com" gmail.password="tu-app-password"
const getEmailTransporter = () => {
  const gmailEmail = functions.config().gmail?.email;
  const gmailPassword = functions.config().gmail?.password;

  if (!gmailEmail || !gmailPassword) {
    console.error('Configuración de email no encontrada. Configura con: firebase functions:config:set gmail.email="xxx" gmail.password="xxx"');
    return null;
  }

  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: gmailEmail,
      pass: gmailPassword
    }
  });
};

// Función para notificar cuando se establece la fecha de cena
exports.notificarFechaCena = functions.https.onCall(async (data, context) => {
  // Verificar que el usuario esté autenticado
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Usuario no autenticado');
  }

  const { eventType, fechaCena } = data;

  if (!eventType || !fechaCena) {
    throw new functions.https.HttpsError('invalid-argument', 'Faltan parámetros requeridos');
  }

  try {
    // Obtener todos los usuarios
    const usersSnapshot = await admin.firestore().collection('users').get();
    const users = usersSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // Filtrar usuarios que tengan email
    const usersWithEmail = users.filter(user => user.email);

    console.log(`Enviando emails a ${usersWithEmail.length} usuarios`);

    // Configurar transporter
    const transporter = getEmailTransporter();
    
    if (!transporter) {
      throw new functions.https.HttpsError('failed-precondition', 'Configuración de email no disponible');
    }

    // Parsear fecha para formato legible
    let fechaFormateada = fechaCena;
    if (fechaCena.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const date = new Date(fechaCena + 'T00:00:00');
      const dia = date.getDate();
      const mes = date.getMonth() + 1;
      const año = date.getFullYear();
      const dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
      const diaSemana = dias[date.getDay()];
      fechaFormateada = `${diaSemana} ${dia}/${mes}/${año}`;
    }

    // Preparar email
    const emailPromises = usersWithEmail.map(async (user) => {
      const mailOptions = {
        from: functions.config().gmail.email,
        to: user.email,
        subject: '📅 Nueva fecha de cena - Cumpleaños del Mes',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body {
                font-family: Arial, sans-serif;
                line-height: 1.6;
                color: #333;
              }
              .container {
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
                background-color: #f9f9f9;
              }
              .header {
                background: linear-gradient(135deg, #1976d2 0%, #1565c0 100%);
                color: white;
                padding: 30px 20px;
                text-align: center;
                border-radius: 8px 8px 0 0;
              }
              .content {
                background: white;
                padding: 30px;
                border-radius: 0 0 8px 8px;
              }
              .fecha-box {
                background: #dbeafe;
                border: 2px solid #3b82f6;
                border-radius: 8px;
                padding: 20px;
                margin: 20px 0;
                text-align: center;
              }
              .fecha-box .label {
                font-size: 14px;
                font-weight: 700;
                color: #1e40af;
                margin-bottom: 8px;
              }
              .fecha-box .fecha {
                font-size: 24px;
                font-weight: 700;
                color: #1e3a8a;
              }
              .button {
                display: inline-block;
                padding: 15px 30px;
                background: #1976d2;
                color: white;
                text-decoration: none;
                border-radius: 8px;
                font-weight: 600;
                margin-top: 20px;
              }
              .footer {
                text-align: center;
                margin-top: 20px;
                font-size: 12px;
                color: #666;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1 style="margin: 0;">🎉 Sociedad TPV</h1>
                <p style="margin: 10px 0 0 0;">Nueva fecha de cena establecida</p>
              </div>
              <div class="content">
                <p>Hola <strong>${user.name || user.email}</strong>,</p>
                
                <p>Te informamos que ya se ha establecido la fecha para la próxima <strong>Cena de Cumpleaños del Mes</strong>:</p>
                
                <div class="fecha-box">
                  <div class="label">📅 FECHA DE LA CENA:</div>
                  <div class="fecha">${fechaFormateada}</div>
                </div>
                
                <p>Ya puedes realizar tu inscripción accediendo a la aplicación.</p>
                
                <div style="text-align: center;">
                  <a href="https://sociedad-tpv.web.app" class="button">
                    Ir a la aplicación
                  </a>
                </div>
                
                <p style="margin-top: 30px;">¡Te esperamos!</p>
              </div>
              <div class="footer">
                <p>Este es un email automático, por favor no respondas a este mensaje.</p>
              </div>
            </div>
          </body>
          </html>
        `
      };

      try {
        await transporter.sendMail(mailOptions);
        console.log(`Email enviado a ${user.email}`);
        return { success: true, email: user.email };
      } catch (error) {
        console.error(`Error enviando email a ${user.email}:`, error);
        return { success: false, email: user.email, error: error.message };
      }
    });

    const results = await Promise.allSettled(emailPromises);
    const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
    const failed = results.length - successful;

    return {
      success: true,
      message: `Emails enviados: ${successful} exitosos, ${failed} fallidos`,
      successful,
      failed
    };

  } catch (error) {
    console.error('Error en notificarFechaCena:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});
