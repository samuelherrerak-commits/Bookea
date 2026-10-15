import type { Coupon, Customer, Modalidad, Payment, Schedule, Tasa } from '../types'
import { BRAND } from '../config'
import { capitalize, formatBs, formatDuration, formatEUR, formatLongDate, formatTime12 } from './format'
import type { LugarElegido } from './lugar'
import { PLANTILLAS_MENSAJE, renderMensaje, type VariablesMensaje } from './mensajes'
import type { OrderSummary } from './pricing'

export interface WhatsAppInput {
  negocio?: string
  customer: Pick<Customer, 'nombre' | 'telefono'>
  schedule: Schedule
  summary: OrderSummary
  coupon: Coupon | null
  payment: Payment
  modalidad: Modalidad
  lugar: LugarElegido
  /** Texto de la plantilla elegida en la hoja. Sin ella, la "Cálida". */
  plantilla?: string
  tasa: Tasa | null
  reservaId?: string
  /** Número del ticket de reserva (no fiscal), si se emitió. */
  recibo?: number | null
  comprobanteUrl?: string | null
  calendarUrl?: string | null
}

/** Los valores de cada {variable}. Vacío = la línea que la usa desaparece del mensaje. */
export function variablesMensaje(input: WhatsAppInput): VariablesMensaje {
  const { customer, schedule, summary, coupon, payment, modalidad, lugar, tasa, reservaId, recibo, comprobanteUrl, calendarUrl } =
    input
  const domicilio = modalidad === 'domicilio'
  const pagoMovil = payment.metodo === 'pago_movil'

  let pago = 'En la cita'
  if (pagoMovil) {
    pago = summary.totalBs !== null ? `Pago Móvil, ${formatBs(summary.totalBs)}` : 'Pago Móvil'
    if (tasa) pago += ` (tasa BCV ${formatBs(tasa.valor)})`
  }

  return {
    negocio: input.negocio || BRAND,
    nombre: customer.nombre.trim(),
    telefono: customer.telefono.trim(),
    fecha: capitalize(formatLongDate(schedule.fecha)),
    hora: formatTime12(schedule.hora),
    duracion: formatDuration(summary.duracionMin),
    servicios: summary.lines.map((l) => `• ${l.nombre} — ${formatEUR(l.precio, true)}`).join('\n'),
    lugar:
      domicilio && summary.recargo > 0
        ? `${lugar.titulo} (+${summary.recargoPct} %: ${formatEUR(summary.recargo, true)})`
        : lugar.titulo,
    direccion: domicilio
      ? 'Te envío mi ubicación por aquí 👇'
      : [lugar.sede?.direccion, lugar.sede?.mapsUrl].filter(Boolean).join(' · '),
    cupon: coupon && summary.descuento > 0 ? `Cupón ${coupon.codigo}: −${formatEUR(summary.descuento, true)}` : '',
    total: formatEUR(summary.total, true),
    pago,
    comprobante: pagoMovil ? comprobanteUrl || 'adjunto en la reserva' : '',
    calendario: calendarUrl ?? '',
    reserva: reservaId
      ? `#${reservaId.slice(0, 8).toUpperCase()}${recibo ? ` · ticket N.º ${String(recibo).padStart(6, '0')}` : ''}`
      : '',
  }
}

/** El mensaje que el cliente envía al negocio al terminar la reserva, con la plantilla elegida. */
export function buildWhatsAppMessage(input: WhatsAppInput): string {
  return renderMensaje(input.plantilla?.trim() || PLANTILLAS_MENSAJE[0].texto, variablesMensaje(input))
}

export function buildWhatsAppUrl(numero: string, message: string): string {
  return `https://wa.me/${numero.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`
}
