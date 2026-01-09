// Manejador personalizado para el service worker
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Interceptar fetch para asegurar que siempre se sirva HTML en rutas de navegación
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Si es una navegación (no un recurso), servir index.html
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          // Verificar que la respuesta sea HTML
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('text/html')) {
            return response;
          }
          // Si no es HTML, forzar a cargar index.html
          return caches.match('/index.html') || fetch('/index.html');
        })
        .catch(() => {
          // Si falla, intentar servir desde caché
          return caches.match('/index.html') || caches.match('/');
        })
    );
  }
});
