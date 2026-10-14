import type * as api from './api'

/** Etiqueta y colores de cada estado de cobro (lista, detalle, tabla y panel). */
export const ETIQUETA: Record<api.EstadoCobro, { texto: string; clase: string; color: string }> = {
  activo: { texto: 'Activo', clase: 'bg-ok/15 text-ok', color: '#5e8a6a' },
  prueba: { texto: 'En prueba', clase: 'bg-sand text-ink', color: '#a99f92' },
  pendiente: { texto: 'Por cobrar', clase: 'bg-danger/12 text-danger', color: '#d29433' },
  vencido: { texto: 'Vencido', clase: 'bg-danger text-white', color: '#b4533f' },
  suspendido: { texto: 'Suspendido', clase: 'bg-ink/10 text-muted', color: '#4a4540' },
  sin_fecha: { texto: 'Sin fecha', clase: 'bg-sand text-muted', color: '#ddd5c9' },
}

export const fechaCorta = (ymd: string) => {
  if (!ymd) return ''
  const [a, m, d] = ymd.split('-').map(Number)
  return `${d} ${['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'][m - 1]}${a !== new Date().getFullYear() ? ` ${a}` : ''}`
}

export function textoVence(n: Pick<api.Negocio, 'dias' | 'vence' | 'estado'>) {
  if (n.dias === null) return 'Sin fecha de pago'
  if (n.dias < 0) return `Venció hace ${-n.dias} ${n.dias === -1 ? 'día' : 'días'} (${fechaCorta(n.vence)})`
  if (n.dias === 0) return 'Vence hoy'
  return `${n.estado === 'prueba' ? 'Prueba hasta' : 'Pagado hasta'} el ${fechaCorta(n.vence)} · ${n.dias} ${n.dias === 1 ? 'día' : 'días'}`
}

/** "hace 3 días" desde una fecha yyyy-MM-dd ('' si no hay). */
export function haceDias(ymd: string, hoy: string): string {
  if (!ymd) return ''
  const d = Math.round((Date.parse(hoy) - Date.parse(ymd)) / 86400_000)
  if (d < 0) return `en ${-d} ${d === -1 ? 'día' : 'días'}`
  if (d === 0) return 'hoy'
  if (d === 1) return 'ayer'
  return `hace ${d} días`
}
