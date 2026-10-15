/**
 * Ticket de reserva: papel térmico de supermercado (como los cupones de Copa Prosein)
 * que el cliente ve imprimirse y descarga como imagen al reservar. Es un documento
 * NO fiscal; el negocio lo activa o lo apaga en Configuración → Comprobantes.
 *
 * Reglas (para no parecer facturación paralela ante el SENIAT):
 * - nunca se llama "factura" ni tiene "número de control";
 * - lleva la leyenda de documento no fiscal arriba y abajo;
 * - no desglosa IVA ni base imponible: el total va en bruto;
 * - con "Pago en la cita" solo muestra el valor de referencia (EUR/USD): el monto en
 *   bolívares se calcula con la tasa del día de la cita. Con Pago Móvil muestra además
 *   lo que se pagó ese día en Bs y su tasa.
 *
 * Las filas de `filasTicket` las comparten el ticket en pantalla y la imagen PNG.
 */
import type { BusinessConfig, Money } from '../types'

export const LEYENDA_NO_FISCAL = 'DOCUMENTO NO FISCAL - VÁLIDO ÚNICAMENTE COMO COMPROBANTE DE CONTROL INTERNO'

export interface DatosTicket {
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
  /** Color del negocio: tinta del sello. */
  color: string
}

export type FilaTicket =
  | { t: 'marca'; texto: string }
  | { t: 'sub'; texto: string }
  | { t: 'leyenda'; texto: string }
  | { t: 'corte' }
  | { t: 'fila'; a: string; b: string; fuerte?: boolean }
  | { t: 'texto'; texto: string }
  | { t: 'sello'; arriba: string; abajo: string }
  | { t: 'barras'; semilla: string; codigo: string }
  | { t: 'gracias'; texto: string }

/** Si el negocio entrega ticket: lo tiene activo y no factura en modo fiscal. */
export function emiteTicket(config: Pick<BusinessConfig, 'facturacionModo' | 'ticketReserva'>): boolean {
  return config.facturacionModo !== 'fiscal' && config.ticketReserva
}

export function numeroTicket(n: number | null | undefined): string {
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

const dos = (n: number) => String(n).padStart(2, '0')
const fechaEmision = (d: Date) =>
  `${dos(d.getDate())}/${dos(d.getMonth() + 1)}/${d.getFullYear()} ${dos(d.getHours())}:${dos(d.getMinutes())}`

export const referencia = (d: DatosTicket) => `#${d.reservaId.slice(0, 8).toUpperCase()}`

/** Filas del ticket, en orden de impresión. */
export function filasTicket(d: DatosTicket): FilaTicket[] {
  const enReferencia = d.moneda !== 'BS'
  const numero = numeroTicket(d.numero)
  // "Jueves 15 de octubre · 2:00 p. m." → día y hora en renglones separados.
  const [dia, hora] = d.cita.split(' · ')
  const filas: FilaTicket[] = [
    { t: 'marca', texto: d.negocio.toUpperCase() },
    { t: 'sub', texto: 'TICKET DE RESERVA' },
    { t: 'leyenda', texto: LEYENDA_NO_FISCAL },
    { t: 'corte' },
    { t: 'fila', a: 'EMITIDO', b: fechaEmision(d.emitido) },
    { t: 'fila', a: 'REF.', b: referencia(d) },
    { t: 'fila', a: 'CLIENTE', b: d.cliente.toUpperCase() },
    { t: 'fila', a: 'TELÉFONO', b: d.telefono },
    { t: 'corte' },
    { t: 'sello', arriba: 'RESERVA', abajo: numero ? `N° ${numero}` : referencia(d) },
    { t: 'corte' },
    { t: 'fila', a: 'DÍA', b: (dia || d.cita).toUpperCase() },
    ...(hora ? [{ t: 'fila' as const, a: 'HORA', b: hora.toUpperCase() }] : []),
    { t: 'fila', a: 'LUGAR', b: d.lugar.toUpperCase() },
    ...(d.direccion ? [{ t: 'texto' as const, texto: d.direccion }] : []),
    { t: 'corte' },
    ...d.servicios.map((s) => ({ t: 'fila' as const, a: s.nombre.toUpperCase(), b: formatMonto(s.precio, d.moneda) })),
    ...(d.recargo > 0 ? [{ t: 'fila' as const, a: 'RECARGO DOMICILIO', b: formatMonto(d.recargo, d.moneda) }] : []),
    ...(d.descuento > 0
      ? [{ t: 'fila' as const, a: `DESCUENTO${d.cupon ? ` ${d.cupon.toUpperCase()}` : ''}`, b: `−${formatMonto(d.descuento, d.moneda)}` }]
      : []),
    { t: 'corte' },
    { t: 'fila', a: enReferencia ? 'TOTAL (REF.)' : 'TOTAL', b: formatMonto(d.total, d.moneda), fuerte: true },
  ]
  if (d.metodo === 'pago_movil') {
    filas.push({ t: 'fila', a: 'PAGO', b: 'PAGO MÓVIL' })
    if (enReferencia && d.pagadoBs !== null && d.pagadoBs > 0) {
      filas.push({ t: 'fila', a: 'PAGADO', b: formatMonto(d.pagadoBs, 'BS') })
      if (d.tasa) filas.push({ t: 'fila', a: 'TASA BCV', b: decimales.format(d.tasa) })
    }
  } else {
    filas.push({ t: 'fila', a: 'PAGO', b: 'EN LA CITA' })
    if (enReferencia) filas.push({ t: 'texto', texto: 'En bolívares se paga a la tasa BCV del día de la cita.' })
  }
  filas.push(
    { t: 'barras', semilla: d.reservaId, codigo: `RS ${numero || d.reservaId.slice(0, 8).toUpperCase()}` },
    { t: 'gracias', texto: '¡GRACIAS POR SU RESERVA!' },
    { t: 'leyenda', texto: LEYENDA_NO_FISCAL },
  )
  return filas
}

/** Todo el texto del ticket (para la descripción accesible y para revisar que no diga nada fiscal). */
export function textoTicket(d: DatosTicket): string {
  return filasTicket(d)
    .map((f) => {
      switch (f.t) {
        case 'corte': return ''
        case 'fila': return `${f.a}: ${f.b}`
        case 'sello': return `${f.arriba} ${f.abajo}`
        case 'barras': return f.codigo
        default: return f.texto
      }
    })
    .filter(Boolean)
    .join('\n')
}

/**
 * Barras del código de barras decorativo: siempre las mismas para el mismo texto.
 * Devuelve [[x, ancho], ...] en un lienzo de 200 × 40 (lo usan el SVG y la imagen).
 */
export function barras(semilla: string): [number, number][] {
  let x = 2166136261
  for (const c of semilla) x = Math.imul(x ^ c.charCodeAt(0), 16777619)
  const azar = () => {
    x ^= x << 13
    x ^= x >>> 17
    x ^= x << 5
    return (x >>> 0) / 4294967296
  }
  const lista: [number, number][] = [[0, 2], [4, 1]]
  let pos = 8
  while (pos < 190) {
    const ancho = 1 + Math.floor(azar() * 3)
    lista.push([pos, ancho])
    pos += ancho + 1 + Math.floor(azar() * 2.4)
  }
  lista.push([195, 1], [198, 2])
  return lista
}

export function nombreArchivo(d: DatosTicket): string {
  const base = d.negocio.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  return `ticket-${base || 'reserva'}-${numeroTicket(d.numero) || d.reservaId.slice(0, 8).toLowerCase()}.png`
}
