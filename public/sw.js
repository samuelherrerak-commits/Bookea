// Service worker mínimo: hace que la página se pueda instalar como app en Android.
// No guarda nada en caché (sin evento fetch): la página siempre se pide a la red.
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()))
