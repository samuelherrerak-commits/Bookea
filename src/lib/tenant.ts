/**
 * Identifica el negocio desde la URL: /u/:slug con respaldo a ?shop=.
 * La ruta /u/ es la oficial, pero aceptamos ?shop= por compatibilidad.
 */
const SLUG_RE = /^[a-z0-9-]{1,40}$/

export function normalizeSlug(raw: string): string | null {
  const slug = raw.trim().toLowerCase()
  return SLUG_RE.test(slug) ? slug : /^[a-z0-9-]+$/.test(slug) ? slug.replace(/^-+|-+$/g, '') || null : null
}

export function slugFromLocation(): string | null {
  const path = window.location.pathname
  const m = /^\/u\/([^/]+)\/?$/.exec(path)
  if (m) return normalizeSlug(m[1])
  const query = new URLSearchParams(window.location.search).get('shop')
  if (query) return normalizeSlug(query)
  return null
}

/** "mariana-nails" · "ByMariaNails" → "Mariana Nails". */
export function slugToNombre(slug: string): string {
  return slug
    .split('-')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

/**
 * Ruta pública de un negocio, o null si el slug no sirve.
 * Render reescribe cualquier ruta sin archivo a index.html, así que quien abre
 * la raíz del dominio sí descarga la app: solo falta mandarlo a /u/<slug>, que
 * es lo que lee slugFromLocation. Sin esto se pediría el catálogo sin negocio.
 */
export function shopPath(slug: string): string | null {
  const s = normalizeSlug(slug)
  // normalizeSlug devuelve tal cual lo que tiene hasta 40 caracteres de [a-z0-9-],
  // guiones incluidos, y su rama de respaldo no vuelve a mirar el largo. Como acá
  // lo que importa es no redirigir a una ruta que el backend va a rechazar, se
  // valida el destino final: un VITE_DEFAULT_SHOP mal puesto da null.
  if (!s || !SLUG_RE.test(s) || s.startsWith('-') || s.endsWith('-')) return null
  return `/u/${s}`
}