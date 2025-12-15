# Scripts de limpieza

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
