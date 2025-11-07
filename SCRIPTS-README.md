# Scripts de limpieza

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
