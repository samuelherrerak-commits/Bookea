const env = import.meta.env

/**
 * URL del Apps Script maestro que atiende a TODOS los negocios.
 * Igual para todos los tenant: el slug se elige en la URL (/u/mariana).
 */
export const API_URL: string = (env.VITE_API_URL ?? '').trim()
/** Viaja en cada petición, así que no es secreto; solo que no vive en el repo. Se fija en Render. */
export const API_TOKEN: string = (env.VITE_API_TOKEN ?? '').trim()
/** Solo para la demo (datos de prueba). Un negocio real usa su clave `whatsapp`, sin respaldo. */
export const DEFAULT_WHATSAPP: string = (env.VITE_WHATSAPP ?? '').replace(/\D/g, '') || '584122516390'
/** Contacto de bookeaa (landing): a dónde llegan las consultas y los pedidos de prueba gratis. */
export const BOOKEAA_WHATSAPP: string = (env.VITE_BOOKEAA_WHATSAPP ?? '').replace(/\D/g, '') || '584220298203'
/**
 * Worker del bot, donde vive el conector de Claude (/mcp y su OAuth). La página /conectar lo
 * toma del Apps Script (bot_bandeja_url); esta es la dirección de respaldo si allá falta.
 * Es fija a propósito: la página le manda la sesión de la central y no puede ir a otro lado.
 */
export const CONECTOR_URL: string = (env.VITE_CONECTOR_URL ?? '').trim().replace(/\/+$/, '') || 'https://bookeaa-bot.samuelherrera-k.workers.dev'
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

/** ID de cliente OAuth (Web) de Google Cloud para "Entrar con Google" en /negocio. Se fija en Render. */
export const GOOGLE_CLIENT_ID: string = (env.VITE_GOOGLE_CLIENT_ID ?? '').trim()
