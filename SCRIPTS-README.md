# 📋 Documentación de Scripts

Este documento describe todos los scripts disponibles en el proyecto Sociedad-TPV y cómo utilizarlos.

---

## 🚀 Scripts de NPM

Ejecutar con `npm run <script>`

### `npm start`
**Uso:** Desarrollo local  
**Descripción:** Inicia el servidor de desarrollo de React en `http://localhost:3000`. Incluye hot-reload automático cuando modificas archivos.

### `npm run build`
**Uso:** Despliegue a producción  
**Descripción:** Compila la aplicación React para producción en la carpeta `/build` y genera el Service Worker para PWA usando `generate-sw.js`.

### `npm test`
**Uso:** Testing  
**Descripción:** Ejecuta los tests del proyecto en modo interactivo.

---

## 🛠️ Scripts Utilitarios

### 1. **generate-sw.js**
**Uso:** `node generate-sw.js` (ejecutado automáticamente en `npm run build`)  
**Descripción:** Genera el Service Worker para la PWA usando Workbox.  
**Funcionalidad:**
- Cachea recursos estáticos (HTML, JS, CSS, imágenes)
- Configura estrategias de caché para imágenes y fuentes
- Habilita offline support
- Importa handlers personalizados desde `sw-handler.js`

**Dependencias:** `workbox-build`

---

### 2. **clear-data.js** ✅ RECOMENDADO
**Uso:** `node clear-data.js [colecciones]`  
**Descripción:** Borra datos específicos de Firestore de forma selectiva.  
⚠️ **ADVERTENCIA:** Acción irreversible.

**Ejemplos:**
```powershell
# Borra todo excepto usuarios
node clear-data.js all

# Borra solo inscripciones de eventos
node clear-data.js eventRegistrations

# Borra múltiples colecciones
node clear-data.js eventRegistrations eventConfigs expenses

# Borra solo productos
node clear-data.js products

# Borra solo gastos/tickets TPV
node clear-data.js expenses
```

**Colecciones disponibles:**
- `eventRegistrations` - Inscripciones a eventos (cumpleaños mes, fiestas, etc.)
- `eventConfigs` - Configuraciones de eventos (fechas de cenas, etc.)
- `expenses` - Gastos/tickets del TPV
- `products` - Catálogo de productos
- `all` - Todas las anteriores (NO borra usuarios)

**Características:**
- Espera 3 segundos antes de ejecutar (puedes cancelar con Ctrl+C)
- Muestra advertencias claras
- Muestra progreso durante el borrado
- NUNCA borra usuarios

**Dependencias:** `firebase-admin`  
**Requiere:** Archivo `serviceAccounkey.json` con credenciales de Firebase Admin SDK

---

### 3. **clear-gastos-admin.js**
**Uso:** `node clear-gastos-admin.js`  
**Descripción:** Borra TODOS los documentos de la colección `expenses` usando Firebase Admin SDK.  
⚠️ **ADVERTENCIA:** Acción irreversible. Solo usar antes de pasar a producción.

**Características:**
- Usa Firebase Admin SDK con permisos totales
- Muestra progreso del borrado (cada 10 documentos)
- Confirmación con espera de 3 segundos
- Manejo de errores robusto

**Dependencias:** `firebase-admin`  
**Requiere:** Archivo `serviceAccounkey.json` con credenciales de Firebase Admin SDK

**Flujo:**
1. Muestra advertencia de seguridad
2. Espera 3 segundos
3. Conecta a Firestore con Admin SDK
4. Cuenta documentos en colección `expenses`
5. Borra uno por uno mostrando progreso
6. Confirma total de documentos eliminados

**Nota:** Para uso general, se recomienda usar `clear-data.js expenses` que es más flexible.

---

### 4. **clear-gastos.js** ⚠️ DEPRECADO
**Uso:** `node clear-gastos.js`  
**Descripción:** Script antiguo para borrar gastos usando Firebase Client SDK.  
**Estado:** No funciona correctamente por falta de permisos de autenticación.  
**Alternativa:** Usar `clear-gastos-admin.js` o `clear-data.js expenses`

---

## 🔑 Credenciales de Firebase Admin

Los scripts `clear-data.js`, `clear-gastos-admin.js` y cualquier otro que use Firebase Admin SDK requieren el archivo de credenciales.

### Obtener credenciales:
1. Ve a [Firebase Console - Service Accounts](https://console.firebase.google.com/project/sociedad-tpv/settings/serviceaccounts/adminsdk)
2. Haz clic en **"Generar nueva clave privada"**
3. Guarda el archivo como `serviceAccounkey.json` en la raíz del proyecto
4. ⚠️ **IMPORTANTE:** Este archivo contiene claves privadas. Está en `.gitignore` y NO debe subirse a Git.

---

## 📁 Estructura de Scripts

```
Sociedad-TPV/
├── generate-sw.js          # Generación de Service Worker (PWA)
├── clear-data.js           # Limpieza selectiva de colecciones ✅ RECOMENDADO
├── clear-gastos-admin.js   # Limpieza de gastos con Admin SDK ✅ FUNCIONAL
├── clear-gastos.js         # Script antiguo ⚠️ DEPRECADO
└── package.json            # Scripts de NPM (start, build, test)
```

---

## 🎯 Recomendaciones de Uso

### Durante Desarrollo:
```powershell
npm start                              # Servidor de desarrollo
node clear-data.js eventRegistrations  # Limpiar inscripciones de prueba
node clear-data.js expenses            # Limpiar gastos de prueba
```

### Antes de Producción:
```powershell
node clear-gastos-admin.js  # Limpiar todos los gastos de prueba
# O alternativamente:
node clear-data.js all      # Reset completo (excepto usuarios)

npm run build               # Compilar para producción
firebase deploy             # Desplegar
```

### Mantenimiento:
```powershell
node clear-data.js all      # Reset completo (excepto usuarios)
```

---

## ⚙️ Variables de Entorno

Los scripts de Firebase Admin pueden usar estas variables:
- `REACT_APP_FIREBASE_PROJECT_ID` - ID del proyecto (default: "sociedad-tpv")

---

## 🔗 Enlaces Útiles

- [Firebase Console - Proyecto](https://console.firebase.google.com/project/sociedad-tpv)
- [Firebase Console - Firestore](https://console.firebase.google.com/project/sociedad-tpv/firestore)
- [Firebase Console - Service Accounts](https://console.firebase.google.com/project/sociedad-tpv/settings/serviceaccounts/adminsdk)
- [Aplicación Desplegada](https://sociedad-tpv.web.app)

---

**Última actualización:** 15 de diciembre de 2025

## 🧹 clear-data.js - Borrar datos de desarrollo

**ADVERTENCIA**: Este script elimina datos de Firestore de forma IRREVERSIBLE.

### Uso:

```powershell
# Borrar inscripciones de eventos
node clear-data.js eventRegistrations

# Borrar configuraciones de eventos
node clear-data.js eventConfigs

# Borrar gastos
node clear-data.js expenses

# Borrar productos
node clear-data.js products

# Borrar múltiples colecciones
node clear-data.js eventRegistrations eventConfigs

# Borrar todo (excepto usuarios)
node clear-data.js all
```

### Colecciones disponibles:
- `eventRegistrations`: Inscripciones de eventos (CUMPLEAÑOS MES, FIESTAS, etc.)
- `eventConfigs`: Configuración de eventos (fechas de cenas, etc.)
- `expenses`: Gastos/tickets del TPV
- `products`: Productos del catálogo
- `all`: Todas las anteriores (NO borra usuarios)

### Seguridad:
- Espera 3 segundos antes de ejecutar (puedes cancelar con Ctrl+C)
- Muestra advertencias claras
- Muestra progreso durante el borrado
- NUNCA borra usuarios

---

## ⚠️ clear-gastos.js - Borrar todos los gastos

**ADVERTENCIA**: Este script elimina TODOS los gastos de Firestore de forma IRREVERSIBLE.

### Uso:

```powershell
node clear-gastos.js
```

### Cuándo usar:
- **SOLO antes de pasar a producción** para limpiar datos de prueba
- Crear backup si es necesario antes de ejecutar

### Qué hace:
1. Se conecta a Firestore
2. Obtiene todos los documentos de la colección "gastos"
3. Los borra uno por uno mostrando el progreso
4. Muestra confirmación final con el número de gastos eliminados

### Seguridad:
- Espera 3 segundos antes de ejecutar
- Muestra advertencias claras
- Muestra progreso durante el borrado
- Requiere las variables de entorno de Firebase o configuración manual

### Notas:
- El script usa las mismas credenciales de Firebase que la app
- Lee las variables de entorno del archivo .env si existe
- NO se ejecuta automáticamente, debes ejecutarlo manualmente
- NO está incluido en el build de producción
