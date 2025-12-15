# Configuración de Email para Cloud Functions

## Pasos para configurar el envío de emails:

### 1. Habilitar Cloud Functions en Firebase
Asegúrate de tener un plan **Blaze** (de pago) en Firebase, ya que Cloud Functions requiere este plan.

### 2. Configurar credenciales de Gmail

#### Opción A: Usar Gmail (Recomendado para desarrollo)

1. **Crear una contraseña de aplicación en Gmail:**
   - Ve a tu cuenta de Google: https://myaccount.google.com/
   - Ve a "Seguridad" → "Verificación en dos pasos" (debes activarla si no la tienes)
   - Ve a "Contraseñas de aplicaciones"
   - Genera una nueva contraseña para "Correo" y "Otros (nombre personalizado: Firebase)"
   - Copia la contraseña generada (16 caracteres)

2. **Configurar las variables de entorno en Firebase:**
   ```bash
   firebase functions:config:set gmail.email="tu-email@gmail.com"
   firebase functions:config:set gmail.password="tu-contraseña-de-aplicacion"
   ```

3. **Verificar la configuración:**
   ```bash
   firebase functions:config:get
   ```

#### Opción B: Usar SendGrid u otro servicio
Si prefieres usar SendGrid u otro servicio de email, modifica el archivo `functions/index.js` con las credenciales apropiadas.

### 3. Desplegar las funciones

```bash
# Desde la raíz del proyecto
npm run build
firebase deploy
```

Esto desplegará:
- El hosting (React app)
- Las Cloud Functions
- Las reglas de Firestore

### 4. Probar el envío de emails

Una vez configurado, cuando se establezca una nueva fecha de cena desde la aplicación:
1. Se guardará la fecha en Firestore
2. Se borrarán las inscripciones existentes
3. Se enviará automáticamente un email a todos los usuarios registrados

### Notas importantes:

- **Gmail tiene límites de envío:** Máx 500 emails/día para cuentas personales, 2000/día para Google Workspace
- **Para producción:** Se recomienda usar servicios como SendGrid, Mailgun, o AWS SES
- **Firestore debe tener usuarios con campo `email`** para que funcione el envío
- Los emails se envían de forma asíncrona para no bloquear la interfaz

### Troubleshooting:

Si los emails no se envían, revisa los logs:
```bash
firebase functions:log
```

O desde la consola de Firebase:
https://console.firebase.google.com/project/sociedad-tpv/functions/logs
