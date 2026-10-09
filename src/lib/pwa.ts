/**
 * "Agregar a inicio": que la página abra como app (pantalla completa, sin la barra
 * de Safari o Chrome) y que abra en la página desde donde se agregó.
 *
 * index.html trae un manifest fijo de bookeaa (start_url "/"). En la página de un
 * negocio se cambia por uno propio con su nombre y su /u/<slug>: si no, el ícono
 * abriría la raíz del dominio y no el negocio. Va como data: URL porque el sitio es
 * estático (Render) y no puede servir un manifest distinto por negocio.
 */
export interface DatosApp {
  nombre: string
  /** Ruta donde abre la app, por ejemplo /u/barberia-norte. */
  ruta: string
  color: string
}

export function manifestDe({ nombre, ruta, color }: DatosApp, origen: string) {
  const abs = (p: string) => new URL(p, origen).toString()
  return {
    id: abs(ruta),
    name: nombre,
    short_name: nombre.length > 14 ? nombre.slice(0, 14).trim() : nombre,
    lang: 'es',
    start_url: abs(ruta),
    scope: abs('/'),
    display: 'standalone',
    background_color: color,
    theme_color: color,
    icons: [
      { src: abs('/icon-192.png'), sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: abs('/icon-512.png'), sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: abs('/icon-512.png'), sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}

function meta(nombre: string, valor: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[name="${nombre}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.name = nombre
    document.head.appendChild(el)
  }
  el.content = valor
}

/** Deja la página lista para instalarse como la app de `datos`. */
export function prepararApp(datos: DatosApp): void {
  if (typeof document === 'undefined') return
  let link = document.head.querySelector<HTMLLinkElement>('link[rel="manifest"]')
  if (!link) {
    link = document.createElement('link')
    link.rel = 'manifest'
    document.head.appendChild(link)
  }
  link.href = 'data:application/manifest+json,' + encodeURIComponent(JSON.stringify(manifestDe(datos, location.origin)))
  meta('apple-mobile-web-app-title', datos.nombre)
}

/** Registra el service worker (Android lo pide para instalar). Sin él la página sigue igual. */
export function registrarServiceWorker(): void {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator) || !import.meta.env.PROD) return
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}), { once: true })
}
