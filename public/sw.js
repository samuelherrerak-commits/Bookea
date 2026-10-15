// Service worker de bookeaa: hace que la página se pueda instalar como app (Android)
// y muestra los avisos de "Mi negocio" (Web Push). No guarda nada en caché (sin
// evento fetch): la página siempre se pide a la red.
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()))

self.addEventListener('push', (event) => {
  let d = {}
  try {
    d = event.data ? event.data.json() : {}
  } catch (_) {
    d = { titulo: 'bookeaa', cuerpo: event.data ? event.data.text() : '' }
  }
  event.waitUntil(
    self.registration.showNotification(d.titulo || 'bookeaa', {
      body: d.cuerpo || '',
      tag: d.tag || undefined,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      data: { url: d.url || '/negocio' },
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = new URL((event.notification.data && event.notification.data.url) || '/negocio', self.location.origin).href
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((ventanas) => {
      for (const v of ventanas) {
        if (new URL(v.url).pathname.startsWith('/negocio') && 'focus' in v) {
          v.postMessage({ tipo: 'recargar' })
          return v.focus()
        }
      }
      return self.clients.openWindow(url)
    }),
  )
})
