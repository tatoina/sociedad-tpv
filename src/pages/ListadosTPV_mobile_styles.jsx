// Estilos responsivos para ListadosTPV
export const mobileStyles = `
<style>
  @media (max-width: 768px) {
    /* Ocultar tabla en móvil */
    .desktop-table {
      display: none !important;
    }
    
    /* Hacer que las tarjetas móviles sean responsivas */
    .mobile-card {
      margin-bottom: 12px;
      padding: 12px;
    }
    
    .mobile-card-header {
      font-size: 13px;
    }
    
    .mobile-card-total {
      font-size: 16px;
    }
  }
  
  @media (min-width: 769px) {
    /* Ocultar vista móvil en desktop */
    .mobile-view {
      display: none !important;
    }
  }
</style>
`;
