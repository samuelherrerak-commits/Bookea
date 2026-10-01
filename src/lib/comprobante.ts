/**
 * Comprobante de cita: documento NO fiscal que el cliente descarga al reservar.
 *
 * Reglas (para no parecer facturación paralela ante el SENIAT):
 * - nunca se llama "factura" ni tiene "número de control";
 * - lleva la leyenda de documento no fiscal arriba y abajo;
 * - no desglosa IVA ni base imponible: el total va en bruto;
 * - con "Pago en la cita" solo muestra el valor de referencia (EUR/USD): el monto en
 *   bolívares se calcula con la tasa del día de la cita. Con Pago Móvil muestra además
 *   lo que se pagó ese día en Bs y su tasa.
 */
import type { Money } from '../types'

export const LEYENDA_NO_FISCAL = 'DOCUMENTO NO FISCAL - VÁLIDO ÚNICAMENTE COMO COMPROBANTE DE CONTROL INTERNO'

export interface DatosComprobante {
  negocio: string
  /** Correlativo del negocio (Recibo_N). null si el servidor no lo asignó. */
  numero: number | null
  /** Id de la reserva; se muestra corto como referencia. */
  reservaId: string
  emitido: Date
  cliente: string
  telefono: string
  /** "Miércoles 30 de septiembre · 2:00 p. m." */
  cita: string
  /** "En Sede Centro" o "A domicilio". */
  lugar: string
  direccion: string
  servicios: { nombre: string; precio: number }[]
  /** Recargo por domicilio, en la moneda del negocio. */
  recargo: number
  descuento: number
  cupon: string
  total: number
  moneda: Money
  metodo: 'lugar' | 'pago_movil'
  /** Solo con Pago Móvil: lo pagado en Bs y la tasa usada. */
  pagadoBs: number | null
  tasa: number | null
  /** Color principal del negocio para el título. */
  color: string
}

export type Linea = { etiqueta: string; valor: string; fuerte?: boolean }

export function numeroRecibo(n: number | null | undefined): string {
  return n && n > 0 ? String(Math.floor(n)).padStart(6, '0') : ''
}

const decimales = new Intl.NumberFormat('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

/** Monto en la moneda del negocio: "18,00 €", "$18,00" o "Bs. 18,00". */
export function formatMonto(valor: number, moneda: Money): string {
  const n = decimales.format(valor)
  if (moneda === 'USD') return `$${n}`
  if (moneda === 'BS') return `Bs. ${n}`
  return `${n} €`
}

const fechaEmision = (d: Date) =>
  `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()} ` +
  `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`

/** Los datos de la cabecera del comprobante. */
export function cabeceraComprobante(d: DatosComprobante): Linea[] {
  return [
    ...(numeroRecibo(d.numero) ? [{ etiqueta: 'Comprobante N.º', valor: numeroRecibo(d.numero), fuerte: true }] : []),
    { etiqueta: 'Emitido', valor: fechaEmision(d.emitido) },
    { etiqueta: 'Referencia', valor: `#${d.reservaId.slice(0, 8).toUpperCase()}` },
    { etiqueta: 'Cliente', valor: d.cliente },
    { etiqueta: 'Teléfono', valor: d.telefono },
    { etiqueta: 'Cita', valor: d.cita },
    { etiqueta: 'Lugar', valor: d.direccion ? `${d.lugar} · ${d.direccion}` : d.lugar },
  ]
}

/** Servicios con su precio, y el recargo y el descuento si los hay. */
export function detalleComprobante(d: DatosComprobante): Linea[] {
  return [
    ...d.servicios.map((s) => ({ etiqueta: s.nombre, valor: formatMonto(s.precio, d.moneda) })),
    ...(d.recargo > 0 ? [{ etiqueta: 'Recargo a domicilio', valor: formatMonto(d.recargo, d.moneda) }] : []),
    ...(d.descuento > 0 ? [{ etiqueta: `Descuento${d.cupon ? ` (${d.cupon})` : ''}`, valor: `−${formatMonto(d.descuento, d.moneda)}` }] : []),
  ]
}

/** Total en bruto (sin IVA ni base imponible) y cómo se paga. */
export function totalesComprobante(d: DatosComprobante): Linea[] {
  const referencia = d.moneda !== 'BS'
  const filas: Linea[] = [
    { etiqueta: referencia ? 'Total (referencia)' : 'Total', valor: formatMonto(d.total, d.moneda), fuerte: true },
  ]
  if (d.metodo === 'pago_movil') {
    filas.push({ etiqueta: 'Forma de pago', valor: 'Pago Móvil' })
    if (referencia && d.pagadoBs !== null && d.pagadoBs > 0) {
      filas.push({
        etiqueta: 'Pagado',
        valor: `${formatMonto(d.pagadoBs, 'BS')}${d.tasa ? ` · tasa BCV ${decimales.format(d.tasa)}` : ''}`,
      })
    }
  } else {
    filas.push({ etiqueta: 'Forma de pago', valor: 'En la cita' })
    if (referencia) filas.push({ etiqueta: 'Nota', valor: 'En bolívares se paga a la tasa BCV del día de la cita.' })
  }
  return filas
}

/** Todo el texto del comprobante (para el PDF y para revisar que no diga nada fiscal). */
export function textoComprobante(d: DatosComprobante): string {
  return [LEYENDA_NO_FISCAL, 'COMPROBANTE DE CITA', d.negocio,
    ...[...cabeceraComprobante(d), ...detalleComprobante(d), ...totalesComprobante(d)].map((l) => `${l.etiqueta}: ${l.valor}`),
    LEYENDA_NO_FISCAL].join('\n')
}

export function nombreArchivo(d: DatosComprobante): string {
  const base = d.negocio.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  return `comprobante-${base || 'cita'}-${numeroRecibo(d.numero) || d.reservaId.slice(0, 8).toLowerCase()}.pdf`
}
