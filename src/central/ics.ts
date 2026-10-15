import type { Publicacion } from './api'

/**
 * Calendario (.ics) con una alarma a la hora de cada publicación, para que el teléfono avise
 * cuándo subir el video a TikTok. La hora de la cola es de Caracas (UTC−4 todo el año).
 */

const DESFASE_CARACAS_H = 4

const dosd = (n: number) => String(n).padStart(2, '0')

const msUtc = (fecha: string, hora: string) => {
  const [a, m, d] = fecha.split('-').map(Number)
  const [h, min] = hora.split(':').map(Number)
  return Date.UTC(a, m - 1, d, h + DESFASE_CARACAS_H, min)
}
const formato = (ms: number) => {
  const t = new Date(ms)
  return `${t.getUTCFullYear()}${dosd(t.getUTCMonth() + 1)}${dosd(t.getUTCDate())}T${dosd(t.getUTCHours())}${dosd(t.getUTCMinutes())}00Z`
}

/** yyyy-MM-dd + HH:mm de Caracas → "yyyyMMddTHHmmssZ" en UTC. */
export const aUtcIcs = (fecha: string, hora: string, sumarMin = 0) => formato(msUtc(fecha, hora) + sumarMin * 60_000)

/** Escapa un texto para un campo ICS (RFC 5545). */
export const textoIcs = (s: string) => s.replace(/\\/g, '\\\\').replace(/;/g, '\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n')

/** Líneas de más de 75 bytes se parten con CRLF + espacio. */
function plegar(linea: string): string {
  const partes: string[] = []
  let resto = linea
  while (new TextEncoder().encode(resto).length > 75) {
    let corte = 74
    while (new TextEncoder().encode(resto.slice(0, corte)).length > 74) corte--
    if (/[\ud800-\udbff]/.test(resto[corte - 1] ?? '')) corte-- // no partir un emoji a la mitad
    partes.push(resto.slice(0, corte))
    resto = ' ' + resto.slice(corte)
  }
  partes.push(resto)
  return partes.join('\r\n')
}

/** Pendientes de subir (borrador o aprobado) de la plataforma indicada, desde `desde` (yyyy-MM-dd). */
export const paraAlarmas = (lista: Publicacion[], plataforma: string, desde: string) =>
  lista.filter((p) => (p.estado === 'borrador' || p.estado === 'aprobado') && p.fecha >= desde && !!p.hora && p.plataforma.toLowerCase().includes(plataforma.toLowerCase()))

export function crearIcs(lista: Publicacion[], titulo = 'bookeaa · subir a TikTok', ahoraMs = Date.now()): string {
  const sello = new Date(ahoraMs).toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z'
  const eventos = lista.flatMap((p) => {
    const inicio = aUtcIcs(p.fecha, p.hora)
    const fin = aUtcIcs(p.fecha, p.hora, 15)
    const links = p.media.trim()
    const descripcion = [`${p.titulo}`, '', p.caption.trim(), p.hashtags.trim(), links ? `\nVideo: ${links.split(/\s+/)[0]}` : ''].filter((x) => x !== undefined).join('\n').trim()
    return [
      'BEGIN:VEVENT',
      `UID:${p.id}@bookeaa.com`,
      `DTSTAMP:${sello}`,
      `DTSTART:${inicio}`,
      `DTEND:${fin}`,
      `SUMMARY:${textoIcs('Subir a TikTok: ' + p.titulo)}`,
      `DESCRIPTION:${textoIcs(descripcion)}`,
      'BEGIN:VALARM',
      'ACTION:DISPLAY',
      `DESCRIPTION:${textoIcs('Subir a TikTok: ' + p.titulo)}`,
      'TRIGGER:PT0M',
      'END:VALARM',
      'END:VEVENT',
    ].map(plegar)
  })
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//bookeaa//Central//ES', 'CALSCALE:GREGORIAN', `X-WR-CALNAME:${textoIcs(titulo)}`, ...eventos, 'END:VCALENDAR'].join('\r\n') + '\r\n'
}
