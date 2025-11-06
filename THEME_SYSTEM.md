# Sistema de Temas Completo

## 🎨 Descripción
El sistema de temas permite cambiar dinámicamente todos los colores de la aplicación (botones, textos, fondos, tablas, inputs) haciendo clic en el botón **ESTILO** ubicado en el header.

## 🌈 Temas Disponibles
1. **Azul Clásico** - Tema profesional con azules
2. **Oscuro** - Tema dark mode con fondo negro
3. **Verde Natura** - Tonos verdes naturales
4. **Púrpura** - Morados vibrantes
5. **Naranja** - Naranjas energéticos
6. **Rojo** - Rojos intensos
7. **Gris** - Tonos grises neutros
8. **Turquesa** - Azules turquesa modernos

## 🔧 Implementación Técnica

### Variables CSS Dinámicas
El tema se aplica mediante variables CSS que se actualizan en tiempo real:

```css
--primary-bg       /* Color principal de botones */
--primary-color    /* Color de texto en botones primarios */
--secondary-bg     /* Color secundario (botones pequeños) */
--app-bg           /* Fondo de la aplicación */
--app-text         /* Color de texto general */
--header-bg        /* Fondo del header */
--ghost-border     /* Bordes de inputs y elementos ghost */
--card-bg          /* Fondo de tarjetas y cards */
```

### Componentes Afectados
- ✅ **Botones**: `.btn-primary`, `.btn-ghost`, `.btn-small`
- ✅ **Inputs**: Todos los inputs, selects y textareas
- ✅ **Tablas**: Headers y filas con hover effects
- ✅ **Cards**: Fondos y bordes adaptativos
- ✅ **Texto**: Headings y párrafos
- ✅ **Header**: Avatar y botones
- ✅ **Body**: Fondo general de toda la app

### Persistencia
El tema seleccionado se guarda en `localStorage` con la key `selectedTheme`, por lo que se mantiene entre sesiones.

## 📱 Uso
1. Haz clic en el botón **ESTILO** junto al email en el header
2. El tema cambiará automáticamente de forma aleatoria
3. Todos los elementos visuales se actualizarán instantáneamente con smooth transitions

## 🎯 Ventajas
- **Experiencia completa**: No solo cambia el header, afecta TODA la interfaz
- **Smooth transitions**: Animaciones suaves de 0.3s en todos los cambios
- **Hover effects**: Los elementos interactivos responden al tema activo
- **Dark mode**: Incluye tema oscuro completamente funcional
- **Responsive**: Funciona perfectamente en móvil y desktop
