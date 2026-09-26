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