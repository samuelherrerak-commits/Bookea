/** Fechas en hora de Caracas (UTC−4 todo el año, sin horario de verano). */
const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']
const DIAS_CORTOS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
const DESFASE = -4 * 60 * 60 * 1000

/** Día de la semana (0 = domingo) y minutos del día en Caracas. */
export function enCaracas(ms: number): { dia: number; minutos: number } {
  const d = new Date(ms + DESFASE)
  return { dia: d.getUTCDay(), minutos: d.getUTCHours() * 60 + d.getUTCMinutes() }
}

function partes(fecha: string) {
  const [a, m, d] = fecha.split('-').map(Number)
  const dia = new Date(Date.UTC(a, m - 1, d)).getUTCDay()
  return { a, m, d, dia }
}

/** "09:30" → "9:30 a. m." */
export function horaLegible(hora: string): string {
  const [h, m] = hora.split(':').map(Number)
  const sufijo = h < 12 ? 'a. m.' : 'p. m.'
  const h12 = h % 12 === 0 ? 12 : h % 12
  return `${h12}:${String(m).padStart(2, '0')} ${sufijo}`
}

/** "2026-10-03" → "Sáb 3 oct" (cabe en una fila de lista). */
export function diaCorto(fecha: string): string {
  const { m, d, dia } = partes(fecha)
  return `${DIAS_CORTOS[dia]} ${d} ${MESES[m - 1].slice(0, 3)}`
}

/** "2026-10-03" → "sábado 3 de octubre" */
export function diaLargo(fecha: string): string {
  const { m, d, dia } = partes(fecha)
  return `${DIAS[dia]} ${d} de ${MESES[m - 1]}`
}

/** Fecha y hora de inicio como ms (para saber si la cita ya pasó). */
export function msDeCita(fecha: string, hora: string): number {
  const { a, m, d } = partes(fecha)
  const [h, min] = hora.split(':').map(Number)
  return Date.UTC(a, m - 1, d, h, min) - DESFASE
}
