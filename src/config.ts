const env = import.meta.env

/**
 * URL del Apps Script maestro que atiende a TODOS los negocios.
 * Igual para todos los tenant: el slug se elige en la URL (/u/mariana).
 */
export const API_URL: string = (env.VITE_API_URL ?? '').trim()
export const API_TOKEN: string = (env.VITE_API_TOKEN ?? '').trim() || 'Bookeav1.1.1'
/** Solo respaldo: la hoja de cada negocio manda en su clave `whatsapp`. */
export const DEFAULT_WHATSAPP: string = (env.VITE_WHATSAPP ?? '').replace(/\D/g, '') || '584122516390'
/** Contacto de bookeaa (landing): a dónde llegan las consultas y los pedidos de prueba gratis. */
export const BOOKEAA_WHATSAPP: string = (env.VITE_BOOKEAA_WHATSAPP ?? '').replace(/\D/g, '') || '584120298203'
/** Solo respaldo: la hoja de cada negocio manda en su clave `marca`. */
export const BRAND: string = (env.VITE_BRAND ?? '').trim() || 'Mi Negocio'
/** Negocio al que entra quien abre la raíz del sitio, sin /u/<slug> en la URL. */
export const DEFAULT_SHOP: string = (env.VITE_DEFAULT_SHOP ?? '').trim() || 'samuel-herrera'

/** Sin URL de Apps Script la app usa datos de ejemplo (demo local). */
export const DEMO_MODE = API_URL === ''

export const METODO_LABEL = {
  lugar: 'Pago en la cita',
  pago_movil: 'Bolívares (Pago Móvil)',
} as const
