const functions = require('firebase-functions');
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');
const XLSX = require('xlsx');

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

    // Filtrar usuarios que tengan email y excluir admin@admin.es
    const usersWithEmail = users.filter(user => user.email && user.email !== 'admin@admin.es');

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

    // Preparar email - Enviar con delay para evitar rate limiting de Gmail
    const results = [];
    
    for (let i = 0; i < usersWithEmail.length; i++) {
      const user = usersWithEmail[i];
      
      // Agregar delay de 300ms entre emails para evitar rate limiting
      if (i > 0) {
        await new Promise(resolve => setTimeout(resolve, 300));
      }
      
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
        results.push({ status: 'fulfilled', value: { success: true, email: user.email } });
      } catch (error) {
        console.error(`Error enviando email a ${user.email}:`, error);
        results.push({ status: 'rejected', value: { success: false, email: user.email, error: error.message } });
      }
    }

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

// Función para notificar a todos cuando alguien se inscribe a un evento
exports.notificarInscripcionEvento = functions.https.onCall(async (data, context) => {
  console.log('🔔 notificarInscripcionEvento iniciada');
  console.log('Data recibida:', data);
  console.log('Context auth:', context.auth ? 'Usuario autenticado' : 'Usuario NO autenticado');
  
  // Verificar que el usuario esté autenticado
  if (!context.auth) {
    console.error('❌ Usuario no autenticado');
    throw new functions.https.HttpsError('unauthenticated', 'Usuario no autenticado');
  }

  const { eventType, userName, userEmail } = data;

  if (!eventType || !userName) {
    console.error('❌ Faltan parámetros:', { eventType, userName });
    throw new functions.https.HttpsError('invalid-argument', 'Faltan parámetros requeridos');
  }

  try {
    console.log(`📧 Preparando notificación para evento: ${eventType}, usuario: ${userName}`);
    
    // Obtener todos los usuarios
    const usersSnapshot = await admin.firestore().collection('users').get();
    const users = usersSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // Filtrar usuarios que tengan email y excluir admin@admin.es
    const usersWithEmail = users.filter(user => user.email && user.email !== 'admin@admin.es');

    console.log(`✅ Encontrados ${usersWithEmail.length} usuarios con email`);

    // Configurar transporter
    const transporter = getEmailTransporter();
    
    if (!transporter) {
      console.error('❌ No se pudo configurar el transporter de email');
      throw new functions.https.HttpsError('failed-precondition', 'Configuración de email no disponible');
    }

    console.log('✅ Transporter configurado correctamente');

    // Preparar email
    const emailPromises = usersWithEmail.map(async (user) => {
      const mailOptions = {
        from: functions.config().gmail.email,
        to: user.email,
        subject: `📝 Nueva inscripción: ${eventType}`,
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
                background: linear-gradient(135deg, #10b981 0%, #059669 100%);
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
              .event-box {
                background: #d1fae5;
                border: 2px solid #10b981;
                border-radius: 8px;
                padding: 20px;
                margin: 20px 0;
                text-align: center;
              }
              .event-box .icon {
                font-size: 48px;
                margin-bottom: 10px;
              }
              .event-box .title {
                font-size: 20px;
                font-weight: 700;
                color: #065f46;
                margin-bottom: 15px;
              }
              .event-box .user {
                font-size: 18px;
                font-weight: 600;
                color: #047857;
              }
              .button {
                display: inline-block;
                padding: 15px 30px;
                background: #10b981;
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
                <p style="margin: 10px 0 0 0;">Nueva inscripción a evento</p>
              </div>
              <div class="content">
                <p>Hola <strong>${user.name || user.email}</strong>,</p>
                
                <div class="event-box">
                  <div class="icon">✓</div>
                  <div class="title">Mesa reservada</div>
                  <div class="user">Inscrito a: ${eventType}</div>
                  <div style="margin-top: 15px; color: #047857;">
                    Por: <strong>${userName}</strong>
                  </div>
                </div>
                
                <p>Puedes ver todos los detalles y gestionar tus inscripciones accediendo a la aplicación.</p>
                
                <div style="text-align: center;">
                  <a href="https://sociedad-tpv.web.app" class="button">
                    Ir a la aplicación
                  </a>
                </div>
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

    console.log(`📊 Resultado: ${successful} exitosos, ${failed} fallidos`);

    return {
      success: true,
      message: `Emails enviados: ${successful} exitosos, ${failed} fallidos`,
      successful,
      failed
    };

  } catch (error) {
    console.error('❌ Error en notificarInscripcionEvento:', error);
    console.error('Stack trace:', error.stack);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

// Función programada para generar automáticamente el resumen mensual el día 1 de cada mes
exports.generarResumenMensualAutomatico = functions.pubsub
  .schedule('1 0 1 * *') // Se ejecuta el día 1 de cada mes a las 00:01
  .timeZone('Europe/Madrid')
  .onRun(async (context) => {
    console.log('Iniciando generación automática de resumen mensual...');

    try {
      const db = admin.firestore();
      const storage = admin.storage().bucket();

      // Calcular el mes anterior
      const ahora = new Date();
      ahora.setDate(1); // Primer día del mes actual
      ahora.setMonth(ahora.getMonth() - 1); // Retroceder un mes
      
      const mesAnterior = ahora.getMonth() + 1; // Enero = 1
      const anioAnterior = ahora.getFullYear();
      
      const mesFormateado = mesAnterior.toString().padStart(2, '0');
      const nombreMes = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
                         'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'][mesAnterior - 1];

      console.log(`Generando resumen para ${nombreMes} ${anioAnterior}`);

      // Calcular rango de fechas del mes anterior
      const primerDia = new Date(anioAnterior, mesAnterior - 1, 1);
      const ultimoDia = new Date(anioAnterior, mesAnterior, 0, 23, 59, 59);

      // Obtener todos los gastos del mes anterior desde la colección 'expenses'
      const gastosSnapshot = await db.collection('expenses')
        .where('date', '>=', primerDia)
        .where('date', '<=', ultimoDia)
        .get();

      if (gastosSnapshot.empty) {
        console.log('No hay gastos para el mes anterior');
        return null;
      }

      const gastos = gastosSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      console.log(`Encontrados ${gastos.length} gastos`);

      // Obtener información de usuarios para obtener nombres
      const usersSnapshot = await db.collection('users').get();
      const usersMap = {};
      usersSnapshot.docs.forEach(doc => {
        usersMap[doc.id] = doc.data().name || doc.data().email || 'Sin nombre';
      });

      // Agrupar gastos por socio
      const gastosPorSocio = {};
      let totalGeneralTPV = 0;
      let totalGeneralSociedad = 0;
      let totalAsistentes = 0;

      gastos.forEach(gasto => {
        const socioId = gasto.uid;
        const socioNombre = usersMap[socioId] || 'Socio Desconocido';

        if (!gastosPorSocio[socioId]) {
          gastosPorSocio[socioId] = {
            nombre: socioNombre,
            tpv: 0,
            sociedad: 0,
            total: 0,
            asistentes: 0
          };
        }

        // Calcular monto del gasto basado en productLines
        let monto = 0;
        if (gasto.productLines && Array.isArray(gasto.productLines)) {
          gasto.productLines.forEach(line => {
            const qty = Number(line.qty || 1);
            const price = Number(line.price || 0);
            monto += qty * price;
          });
        } else {
          monto = Number(gasto.amount) || 0;
        }
        
        if (gasto.category === 'sociedad') {
          gastosPorSocio[socioId].sociedad += monto;
          totalGeneralSociedad += monto;
          // Sumar asistentes
          const attendees = Number(gasto.attendees || 0);
          gastosPorSocio[socioId].asistentes += attendees;
          totalAsistentes += attendees;
        } else {
          gastosPorSocio[socioId].tpv += monto;
          totalGeneralTPV += monto;
        }
        
        gastosPorSocio[socioId].total += monto;
      });

      const totalGeneral = totalGeneralTPV + totalGeneralSociedad;

      // Preparar datos para Excel - Formato simple
      const sociosArray = Object.entries(gastosPorSocio)
        .sort((a, b) => b[1].total - a[1].total)
        .map(([_, datos]) => ({
          'Socio': datos.nombre,
          'Gasto Personal': parseFloat(datos.tpv.toFixed(2)),
          'Gasto Común': parseFloat(datos.sociedad.toFixed(2)),
          'Total': parseFloat(datos.total.toFixed(2))
        }));

      // Agregar línea en blanco y totales
      const excelData = [
        ...sociosArray,
        {},
        {
          'Socio': 'TOTAL',
          'Gasto Personal': parseFloat(totalGeneralTPV.toFixed(2)),
          'Gasto Común': parseFloat(totalGeneralSociedad.toFixed(2)),
          'Total': parseFloat(totalGeneral.toFixed(2))
        }
      ];

      // Generar Excel
      const ws = XLSX.utils.json_to_sheet(excelData, { skipHeader: false });
      
      // Ajustar ancho de columnas
      ws['!cols'] = [
        { wch: 30 }, // Socio
        { wch: 15 }, // Gasto Personal
        { wch: 15 }, // Gasto Común
        { wch: 15 }  // Total
      ];
      
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Resumen Mensual');
      
      // Generar buffer
      const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' });

      // Crear nombre de archivo y ruta
      const nombreArchivo = `resumen_${mesFormateado}-${anioAnterior}.xlsx`;
      const rutaStorage = `resumen-mensual/${anioAnterior}/${nombreArchivo}`;

      // Subir a Firebase Storage
      const buffer = Buffer.from(excelBuffer);
      const file = storage.file(rutaStorage);
      
      await file.save(buffer, {
        metadata: {
          contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          metadata: {
            generadoAutomaticamente: 'true',
            mes: mesFormateado,
            anio: anioAnterior.toString(),
            fechaGeneracion: new Date().toISOString()
          }
        }
      });

      // Hacer el archivo público y obtener URL
      await file.makePublic();
      const url = `https://storage.googleapis.com/${storage.name}/${rutaStorage}`;

      console.log(`Archivo subido exitosamente: ${rutaStorage}`);

      // Guardar registro en Firestore (reemplaza localStorage del frontend)
      await db.collection('historial-resumenes').add({
        fecha: new Date(),
        nombreArchivo: nombreArchivo,
        mes: nombreMes,
        anio: anioAnterior,
        totalTPV: totalGeneralTPV,
        totalSociedad: totalGeneralSociedad,
        totalGeneral: totalGeneral,
        url: url,
        tipo: 'automatico',
        rutaStorage: rutaStorage,
        cantidadGastos: gastos.length,
        cantidadSocios: Object.keys(gastosPorSocio).length
      });

      console.log('Resumen mensual generado y guardado exitosamente');

      // Enviar emails a todos los usuarios notificando la generación
      try {
        const usersSnapshot = await db.collection('users').get();
        const users = usersSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        const usersWithEmail = users.filter(user => user.email && user.email !== 'admin@admin.es');
        console.log(`Enviando notificación a ${usersWithEmail.length} usuarios`);

        const transporter = getEmailTransporter();
        
        if (transporter) {
          const emailPromises = usersWithEmail.map(async (user) => {
            const mailOptions = {
              from: functions.config().gmail.email,
              to: user.email,
              subject: '💰 Resumen de Gastos Mensual Generado - Sociedad TPV',
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
                      background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%);
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
                    .info-box {
                      background: #eff6ff;
                      border-left: 4px solid #3b82f6;
                      padding: 15px;
                      margin: 20px 0;
                    }
                    .info-box h3 {
                      margin-top: 0;
                      color: #1e40af;
                    }
                    .button {
                      display: inline-block;
                      padding: 15px 30px;
                      background: #2563eb;
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
                    .amount {
                      font-size: 20px;
                      font-weight: bold;
                      color: #1e40af;
                    }
                  </style>
                </head>
                <body>
                  <div class="container">
                    <div class="header">
                      <h1 style="margin: 0;">💰 Sociedad TPV</h1>
                      <p style="margin: 10px 0 0 0;">Resumen de Gastos Mensuales</p>
                    </div>
                    <div class="content">
                      <p>Estimado/a <strong>${user.name || user.email}</strong>,</p>
                      
                      <p>Le informamos que el resumen de gastos correspondiente al mes de <strong>${nombreMes} ${anioAnterior}</strong> ha sido generado y está disponible para su consulta.</p>
                      
                      <div class="info-box">
                        <h3>📊 Resumen General</h3>
                        <p><strong>Mes:</strong> ${nombreMes} ${anioAnterior}</p>
                        <p><strong>Total Gastos TPV:</strong> <span class="amount">${totalGeneralTPV.toFixed(2)} €</span></p>
                        <p><strong>Total Gastos Sociedad:</strong> <span class="amount">${totalGeneralSociedad.toFixed(2)} €</span></p>
                        <p><strong>Total General:</strong> <span class="amount">${totalGeneral.toFixed(2)} €</span></p>
                      </div>
                      
                      <p><strong>Información importante:</strong></p>
                      <ul>
                        <li>Los gastos correspondientes serán procesados y cargados mediante domiciliación bancaria.</li>
                        <li>Puede consultar el detalle de sus gastos personales accediendo a la aplicación.</li>
                        <li>El resumen completo está disponible en el apartado de "Listados TPV".</li>
                      </ul>
                      
                      <p>Para cualquier duda o aclaración sobre sus gastos, por favor contacte con la administración.</p>
                      
                      <div style="text-align: center;">
                        <a href="https://sociedad-tpv.web.app" class="button">
                          Acceder a la aplicación
                        </a>
                      </div>
                      
                      <p style="margin-top: 30px;">Atentamente,<br><strong>Administración Sociedad TPV</strong></p>
                    </div>
                    <div class="footer">
                      <p>Este es un email automático, por favor no responda a este mensaje.</p>
                      <p>Si necesita asistencia, contacte con la administración.</p>
                    </div>
                  </div>
                </body>
                </html>
              `
            };

            try {
              await transporter.sendMail(mailOptions);
              console.log(`Email de notificación enviado a ${user.email}`);
              return { success: true, email: user.email };
            } catch (error) {
              console.error(`Error enviando email a ${user.email}:`, error);
              return { success: false, email: user.email, error: error.message };
            }
          });

          const emailResults = await Promise.allSettled(emailPromises);
          const successful = emailResults.filter(r => r.status === 'fulfilled' && r.value.success).length;
          console.log(`Emails enviados: ${successful}/${usersWithEmail.length}`);
        } else {
          console.warn('Configuración de email no disponible, no se enviarán notificaciones');
        }
      } catch (emailError) {
        console.error('Error enviando emails de notificación:', emailError);
        // No lanzar el error para que no falle toda la función
      }
      
      return {
        success: true,
        archivo: nombreArchivo,
        ruta: rutaStorage,
        url: url
      };

    } catch (error) {
      console.error('Error generando resumen mensual automático:', error);
      throw error;
    }
  });

// Función para enviar sugerencias por email
exports.enviarSugerencia = functions.https.onCall(async (data, context) => {
  // Verificar que el usuario esté autenticado
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Usuario no autenticado');
  }

  const { userName, userEmail, suggestionText } = data;

  if (!suggestionText || !suggestionText.trim()) {
    throw new functions.https.HttpsError('invalid-argument', 'La sugerencia no puede estar vacía');
  }

  try {
    const transporter = getEmailTransporter();
    
    if (!transporter) {
      throw new functions.https.HttpsError('failed-precondition', 'Configuración de email no disponible');
    }

    const mailOptions = {
      from: functions.config().gmail.email,
      to: 'inaviciba@gmail.com',
      replyTo: userEmail || functions.config().gmail.email,
      subject: `💡 Sugerencia TPV App - ${userName || 'Usuario'}`,
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
              border-radius: 10px 10px 0 0;
            }
            .content {
              background-color: white;
              padding: 30px;
              border-radius: 0 0 10px 10px;
              box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            .info-box {
              background-color: #e3f2fd;
              border-left: 4px solid #1976d2;
              padding: 15px;
              margin: 20px 0;
              border-radius: 4px;
            }
            .suggestion-box {
              background-color: #f5f5f5;
              padding: 20px;
              border-radius: 8px;
              margin: 20px 0;
              border: 1px solid #e0e0e0;
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
              <h1 style="margin: 0; font-size: 28px;">💡 Nueva Sugerencia</h1>
              <p style="margin: 10px 0 0 0; opacity: 0.9;">TPV App - Sociedad</p>
            </div>
            <div class="content">
              <h2 style="color: #1976d2; margin-top: 0;">Información del Usuario</h2>
              <div class="info-box">
                <p style="margin: 5px 0;"><strong>Nombre:</strong> ${userName || 'No proporcionado'}</p>
                <p style="margin: 5px 0;"><strong>Email:</strong> ${userEmail || 'No proporcionado'}</p>
                <p style="margin: 5px 0;"><strong>Fecha:</strong> ${new Date().toLocaleString('es-ES', { 
                  dateStyle: 'full', 
                  timeStyle: 'short' 
                })}</p>
              </div>
              
              <h2 style="color: #1976d2;">Sugerencia</h2>
              <div class="suggestion-box">
                <p style="margin: 0; white-space: pre-wrap; font-size: 15px; line-height: 1.6;">${suggestionText}</p>
              </div>
              
              <div class="footer">
                <p>Este email fue generado automáticamente por TPV App</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log(`Sugerencia enviada de ${userName} (${userEmail})`);

    return { 
      success: true, 
      message: 'Sugerencia enviada correctamente' 
    };

  } catch (error) {
    console.error('Error enviando sugerencia:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

// Función para notificar reserva de mesa
exports.notificarReservaMesa = functions.https.onCall(async (data, context) => {
  // Verificar que el usuario esté autenticado
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Usuario no autenticado');
  }

  const { userName, userEmail, fecha, hora, comensales, observaciones } = data;

  if (!userName) {
    throw new functions.https.HttpsError('invalid-argument', 'Faltan parámetros requeridos');
  }

  try {
    // Obtener todos los usuarios
    const usersSnapshot = await admin.firestore().collection('users').get();
    const users = usersSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // Filtrar usuarios que tengan email y excluir admin@admin.es
    const usersWithEmail = users.filter(user => user.email && user.email !== 'admin@admin.es');

    console.log(`Enviando emails a ${usersWithEmail.length} usuarios sobre reserva de ${userName}`);

    const transporter = getEmailTransporter();
    
    if (!transporter) {
      throw new functions.https.HttpsError('failed-precondition', 'Configuración de email no disponible');
    }

    // Formatear fecha
    let fechaFormateada = fecha;
    if (fecha && fecha.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const date = new Date(fecha + 'T00:00:00');
      const dia = date.getDate();
      const mes = date.getMonth() + 1;
      const año = date.getFullYear();
      const dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
      const diaSemana = dias[date.getDay()];
      fechaFormateada = `${diaSemana} ${dia}/${mes}/${año}`;
    }

    // Preparar emails
    const emailPromises = usersWithEmail.map(async (user) => {
      const mailOptions = {
        from: functions.config().gmail.email,
        to: user.email,
        subject: `🍽️ Nueva Reserva de Mesa - ${userName}`,
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
                background: linear-gradient(135deg, #10b981 0%, #059669 100%);
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
              .reservation-box {
                background: #d1fae5;
                border: 2px solid #10b981;
                border-radius: 8px;
                padding: 20px;
                margin: 20px 0;
                text-align: center;
              }
              .detail-row {
                display: flex;
                justify-content: space-between;
                padding: 10px 0;
                border-bottom: 1px solid #e5e7eb;
              }
              .detail-label {
                font-weight: 600;
                color: #374151;
              }
              .detail-value {
                color: #059669;
                font-weight: 500;
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
                <h1 style="margin: 0;">🍽️ Sociedad TPV</h1>
                <p style="margin: 10px 0 0 0;">Nueva Reserva de Mesa</p>
              </div>
              <div class="content">
                <div class="reservation-box">
                  <div style="font-size: 48px; margin-bottom: 10px;">✓</div>
                  <div style="font-size: 20px; font-weight: 700; color: #065f46;">Mesa Reservada</div>
                  <div style="margin-top: 15px; font-size: 18px; font-weight: 600; color: #047857;">
                    ${userName}
                  </div>
                </div>
                
                <div style="margin-top: 20px;">
                  ${fecha ? `
                    <div class="detail-row">
                      <span class="detail-label">📅 Fecha:</span>
                      <span class="detail-value">${fechaFormateada}</span>
                    </div>
                  ` : ''}
                  ${hora ? `
                    <div class="detail-row">
                      <span class="detail-label">🕐 Hora:</span>
                      <span class="detail-value">${hora}</span>
                    </div>
                  ` : ''}
                  ${comensales ? `
                    <div class="detail-row">
                      <span class="detail-label">👥 Comensales:</span>
                      <span class="detail-value">${comensales}</span>
                    </div>
                  ` : ''}
                  ${observaciones ? `
                    <div style="margin-top: 20px; padding: 15px; background: #f3f4f6; border-radius: 8px;">
                      <div class="detail-label" style="margin-bottom: 8px;">📝 Observaciones:</div>
                      <div style="color: #374151;">${observaciones}</div>
                    </div>
                  ` : ''}
                </div>
                
                <div style="text-align: center; margin-top: 30px;">
                  <a href="https://sociedad-tpv.web.app" style="display: inline-block; padding: 15px 30px; background: #10b981; color: white; text-decoration: none; border-radius: 8px; font-weight: 600;">
                    Ver en la Aplicación
                  </a>
                </div>
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

    console.log(`Emails enviados: ${successful} exitosos, ${failed} fallidos`);

    return {
      success: true,
      message: `Emails enviados: ${successful} exitosos, ${failed} fallidos`,
      successful,
      failed
    };

  } catch (error) {
    console.error('Error en notificarReservaMesa:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

// Función para notificar inscripción a eventos
exports.notificarInscripcionEventoGeneral = functions.https.onCall(async (data, context) => {
  // Verificar que el usuario esté autenticado
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Usuario no autenticado');
  }

  const { userName, userEmail, eventType, adultos, ninos, decimos, fecha, diaSemana } = data;

  if (!userName || !eventType) {
    throw new functions.https.HttpsError('invalid-argument', 'Faltan parámetros requeridos');
  }

  try {
    // Obtener todos los usuarios
    const usersSnapshot = await admin.firestore().collection('users').get();
    const users = usersSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // Filtrar usuarios que tengan email y excluir admin@admin.es
    const usersWithEmail = users.filter(user => user.email && user.email !== 'admin@admin.es');

    console.log(`Enviando emails a ${usersWithEmail.length} usuarios sobre inscripción de ${userName} a ${eventType}`);

    const transporter = getEmailTransporter();
    
    if (!transporter) {
      throw new functions.https.HttpsError('failed-precondition', 'Configuración de email no disponible');
    }

    // Formatear fecha si existe
    let fechaFormateada = fecha;
    if (fecha && fecha.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const date = new Date(fecha + 'T00:00:00');
      const dia = date.getDate();
      const mes = date.getMonth() + 1;
      const año = date.getFullYear();
      const dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
      const diaSemanaCalculado = dias[date.getDay()];
      fechaFormateada = `${diaSemanaCalculado} ${dia}/${mes}/${año}`;
    }

    // Determinar emoji según el evento
    let emoji = '🎉';
    let color = '#1976d2';
    let colorSecundario = '#1565c0';
    switch(eventType) {
      case 'CUMPLEAÑOS MES':
        emoji = '🎂';
        color = '#f59e0b';
        colorSecundario = '#d97706';
        break;
      case 'FIESTAS DE ESTELLA':
        emoji = '🎊';
        color = '#8b5cf6';
        colorSecundario = '#7c3aed';
        break;
      case 'FERIAS':
        emoji = '🎪';
        color = '#ec4899';
        colorSecundario = '#db2777';
        break;
      case 'LOTERIA NAVIDAD':
        emoji = '🎟️';
        color = '#10b981';
        colorSecundario = '#059669';
        break;
      case 'COTILLON DE REYES':
        emoji = '👑';
        color = '#6366f1';
        colorSecundario = '#4f46e5';
        break;
    }

    // Preparar emails
    const emailPromises = usersWithEmail.map(async (user) => {
      const mailOptions = {
        from: functions.config().gmail.email,
        to: user.email,
        subject: `${emoji} Nueva Inscripción - ${eventType}`,
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
                background: linear-gradient(135deg, ${color} 0%, ${colorSecundario} 100%);
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
              .event-box {
                background: #e0f2fe;
                border: 2px solid ${color};
                border-radius: 8px;
                padding: 20px;
                margin: 20px 0;
                text-align: center;
              }
              .detail-row {
                display: flex;
                justify-content: space-between;
                padding: 10px 0;
                border-bottom: 1px solid #e5e7eb;
              }
              .detail-label {
                font-weight: 600;
                color: #374151;
              }
              .detail-value {
                color: ${color};
                font-weight: 500;
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
                <h1 style="margin: 0;">${emoji} Sociedad TPV</h1>
                <p style="margin: 10px 0 0 0;">Nueva Inscripción</p>
              </div>
              <div class="content">
                <div class="event-box">
                  <div style="font-size: 48px; margin-bottom: 10px;">✓</div>
                  <div style="font-size: 20px; font-weight: 700; color: ${colorSecundario};">${eventType}</div>
                  <div style="margin-top: 15px; font-size: 18px; font-weight: 600; color: ${color};">
                    ${userName}
                  </div>
                </div>
                
                <div style="margin-top: 20px;">
                  ${(adultos !== undefined || ninos !== undefined) ? `
                    ${adultos !== undefined ? `
                      <div class="detail-row">
                        <span class="detail-label">👥 Adultos:</span>
                        <span class="detail-value">${adultos}</span>
                      </div>
                    ` : ''}
                    ${ninos !== undefined ? `
                      <div class="detail-row">
                        <span class="detail-label">👶 Niños:</span>
                        <span class="detail-value">${ninos}</span>
                      </div>
                    ` : ''}
                    ${(adultos !== undefined && ninos !== undefined) ? `
                      <div class="detail-row">
                        <span class="detail-label">📊 Total:</span>
                        <span class="detail-value" style="font-weight: 700;">${adultos + ninos}</span>
                      </div>
                    ` : ''}
                  ` : ''}
                  ${decimos !== undefined ? `
                    <div class="detail-row">
                      <span class="detail-label">🎟️ Décimos:</span>
                      <span class="detail-value">${decimos}</span>
                    </div>
                  ` : ''}
                  ${fecha && fechaFormateada ? `
                    <div class="detail-row">
                      <span class="detail-label">📅 Fecha:</span>
                      <span class="detail-value">${fechaFormateada}${diaSemana ? ` (${diaSemana})` : ''}</span>
                    </div>
                  ` : ''}
                </div>
                
                <div style="text-align: center; margin-top: 30px;">
                  <a href="https://sociedad-tpv.web.app" style="display: inline-block; padding: 15px 30px; background: ${color}; color: white; text-decoration: none; border-radius: 8px; font-weight: 600;">
                    Ver en la Aplicación
                  </a>
                </div>
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

    console.log(`Emails enviados: ${successful} exitosos, ${failed} fallidos`);

    return {
      success: true,
      message: `Emails enviados: ${successful} exitosos, ${failed} fallidos`,
      successful,
      failed
    };

  } catch (error) {
    console.error('Error en notificarInscripcionEventoGeneral:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

// Función para borrar todas las inscripciones de un evento
exports.borrarInscripcionesEvento = functions.https.onCall(async (data, context) => {
  // Verificar que el usuario esté autenticado
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Usuario no autenticado');
  }

  const { eventType, password } = data;

  if (!eventType || !password) {
    throw new functions.https.HttpsError('invalid-argument', 'Faltan parámetros requeridos');
  }

  // Verificar contraseña
  if (password !== '123456') {
    throw new functions.https.HttpsError('permission-denied', 'Contraseña incorrecta');
  }

  try {
    // Obtener todas las inscripciones del evento
    const snapshot = await admin.firestore()
      .collection('eventRegistrations')
      .where('eventType', '==', eventType)
      .get();

    if (snapshot.empty) {
      return {
        success: true,
        message: 'No hay inscripciones para borrar',
        deleted: 0
      };
    }

    // Borrar en lotes (máximo 500 por batch)
    const batchSize = 500;
    const batches = [];
    let batch = admin.firestore().batch();
    let count = 0;

    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
      count++;

      if (count === batchSize) {
        batches.push(batch.commit());
        batch = admin.firestore().batch();
        count = 0;
      }
    });

    // Commit del último batch si tiene documentos
    if (count > 0) {
      batches.push(batch.commit());
    }

    await Promise.all(batches);

    console.log(`Borradas ${snapshot.size} inscripciones de ${eventType} por usuario ${context.auth.uid}`);

    return {
      success: true,
      message: `Se borraron ${snapshot.size} inscripciones`,
      deleted: snapshot.size
    };

  } catch (error) {
    console.error('Error en borrarInscripcionesEvento:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});
