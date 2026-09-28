import { DEFAULT_SHOP, DEFAULT_WHATSAPP } from '../config'
import { buildWhatsAppUrl } from '../lib/whatsapp'
import { shopPath } from '../lib/tenant'

/** Todavía no hay registro de cuentas: la prueba se pide por WhatsApp y el alta es a mano. */
export const TRIAL_MESSAGE = 'Hola, quiero probar bookeaa 1 mes gratis. Mi negocio es: '

export function trialWhatsappUrl(numero: string = DEFAULT_WHATSAPP): string {
  return buildWhatsAppUrl(numero, TRIAL_MESSAGE)
}

/** Agenda real para mostrar; si VITE_DEFAULT_SHOP no sirve, el botón se oculta. */
export const DEMO_PATH: string | null = shopPath(DEFAULT_SHOP)
