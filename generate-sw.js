// Requiere instalar workbox-build: npm install --save-dev workbox-build
const { generateSW } = require('workbox-build');

generateSW({
  globDirectory: 'build',
  globPatterns: [
    '**/*.{html,js,css,png,svg,json,ico}'
  ],
  swDest: 'build/service-worker.js',
  clientsClaim: true,
  skipWaiting: true,
  importScripts: ['./sw-handler.js'],
  runtimeCaching: [
    {
      urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/,
      handler: 'CacheFirst',
      options: {
        cacheName: 'images-cache',
        expiration: {
          maxEntries: 60,
          maxAgeSeconds: 30 * 24 * 60 * 60 // 30 days
        }
      }
    },
    {
      urlPattern: /^https:\/\/fonts\.googleapis\.com/,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'google-fonts-stylesheets',
      }
    },
    {
      urlPattern: /^https:\/\/fonts\.gstatic\.com/,
      handler: 'CacheFirst',
      options: {
        cacheName: 'google-fonts-webfonts',
        expiration: {
          maxEntries: 30,
          maxAgeSeconds: 365 * 24 * 60 * 60
        }
      }
    }
  ]
}).then(({count, size, warnings}) => {
  if (warnings && warnings.length) {
    console.warn('Workbox warnings:', warnings);
  }
  console.log(`Se generó service-worker.js, precacheados ${count} archivos, ${size} bytes totales.`);
}).catch(err => {
  console.error('Error generando service worker:', err);
});