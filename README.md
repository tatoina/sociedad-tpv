```markdown
# Sociedad - TPV (React + Firebase)

Aplicación mínima para gestionar consumos en una sociedad:
- Registro / Login (nombre, apellidos, fecha de nacimiento, teléfono, email y password)
- TPV: dar de alta gastos (cerveza, refresco, cubata, ...)
- Listados: filtrar consumos por fechas (desde / hasta)
- Cada usuario ve sus consumos; admin@admin.es puede ver todos y exportar a CSV

Requisitos
- Node 18+
- Proyecto de Firebase (Authentication y Firestore)

Instalación
1. Clona o copia este proyecto.
2. Crea un proyecto en Firebase, habilita Email/Password en Authentication y crea una base de Firestore.
3. Copia `.env.example` a `.env` y completa las variables con tu configuración de Firebase.
4. Instala dependencias:
   npm install
5. Levanta la app en desarrollo:
   npm run dev

Notas sobre Firebase
- Al registrarse, se crea en Firestore una colección `users` con los datos del perfil.
- Los consumos se guardan en la colección `expenses`.
- Si quieres que admin no dependa solo del email, puedes añadir/editar isAdmin manualmente en el doc de `users`.

Reglas de ejemplo (firestore.rules)
- Incluido en el archivo firestore.rules en este repo. Ajusta según tu modelo y seguridad.

Posibles mejoras futuras
- Poner roles explícitos (isAdmin) desde un panel seguro.
- Añadir validaciones y tipos en frontend.
- Mejor UI/UX, categorías dinámicas, edición/eliminación de gastos.
```