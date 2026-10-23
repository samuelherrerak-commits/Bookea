import { BOOKEAA_WHATSAPP, DEFAULT_SHOP } from '../config'
import { buildWhatsAppUrl } from '../lib/whatsapp'
import { shopPath } from '../lib/tenant'

/** Todavía no hay registro de cuentas: la prueba se pide por WhatsApp y el alta es a mano. */
export const TRIAL_MESSAGE = 'Hola, quiero probar bookeaa 1 mes gratis. Mi negocio es: '

export function trialWhatsappUrl(numero: string = BOOKEAA_WHATSAPP): string {
  return buildWhatsAppUrl(numero, TRIAL_MESSAGE)
}

/** Agenda real para mostrar; si VITE_DEFAULT_SHOP no sirve, el botón se oculta. */
export const DEMO_PATH: string | null = shopPath(DEFAULT_SHOP)

/** bookeaa team: el pedido también va por WhatsApp. */
export const TEAM_MESSAGE = 'Hola, quiero bookeaa team para mi negocio. Somos ___ personas atendiendo. Mi negocio es: '

export function teamWhatsappUrl(numero: string = BOOKEAA_WHATSAPP): string {
  return buildWhatsAppUrl(numero, TEAM_MESSAGE)
}

/** Lo que paga bookeaa team al mes: $25 hasta 5 personas y $5 por cada persona más. */
export function precioTeam(personas: number): number {
  return 25 + Math.max(0, Math.round(personas) - 5) * 5
}
