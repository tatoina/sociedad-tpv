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
