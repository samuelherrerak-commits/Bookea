import { describe, expect, it } from 'vitest'
import type { Publicacion } from './api'
import { aUtcIcs, crearIcs, paraAlarmas, textoIcs } from './ics'

const pub = (id: string, fecha: string, hora: string, extra: Partial<Publicacion> = {}): Publicacion => ({
  id, fecha, hora, tipo: 'video-mg', titulo: 'La libreta', plataforma: 'TikTok + Reels', caption: 'Hola, mundo; ok', hashtags: '#bookeaa', media: 'https://res.cloudinary.com/x/v.mp4', estado: 'borrador', publicadoEn: '', notas: '', ...extra,
})

describe('alarmas (.ics)', () => {
  it('Caracas es UTC−4: 08:00 → 12:00Z y 20:30 → 00:30Z del día siguiente', () => {
    expect(aUtcIcs('2026-10-15', '08:00')).toBe('20261015T120000Z')
    expect(aUtcIcs('2026-10-15', '20:30')).toBe('20261016T003000Z')
  })
  it('el fin (15 min después) cruza la medianoche sin romper la fecha', () => {
    expect(aUtcIcs('2026-10-15', '19:50', 15)).toBe('20261015T240500Z'.replace('T2405', 'T0005').replace('20261015', '20261016'))
  })
  it('no parte un emoji al doblar una línea larga', () => {
    const ics = crearIcs([pub('a', '2026-10-15', '08:00', { caption: 'a'.repeat(60) + '📅'.repeat(30) })])
    expect(ics).not.toContain('\uFFFD')
    expect(ics.replace(/\r\n /g, '')).toContain('📅'.repeat(30))
  })
  it('escapa comas, punto y coma y saltos de línea', () => {
    expect(textoIcs('a, b; c\nd')).toBe('a\\, b\; c\\nd')
  })
  it('solo pendientes de TikTok desde la fecha', () => {
    const l = paraAlarmas([
      pub('a', '2026-10-15', '08:00'),
      pub('b', '2026-10-15', '19:00', { plataforma: 'Instagram (marca)' }),
      pub('c', '2026-10-14', '08:00'),
      pub('d', '2026-10-16', '08:00', { estado: 'publicado' }),
      pub('e', '2026-10-16', '13:00', { estado: 'aprobado' }),
    ], 'TikTok', '2026-10-15')
    expect(l.map((p) => p.id)).toEqual(['a', 'e'])
  })
  it('crea un calendario válido con una alarma por evento y líneas de hasta 75 bytes', () => {
    const ics = crearIcs([pub('a', '2026-10-15', '08:00', { caption: 'x'.repeat(300) }), pub('e', '2026-10-16', '13:00')], 't', Date.UTC(2026, 9, 15))
    expect(ics.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true)
    expect(ics.trimEnd().endsWith('END:VCALENDAR')).toBe(true)
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(2)
    expect(ics.match(/BEGIN:VALARM/g)).toHaveLength(2)
    expect(ics).toContain('DTSTART:20261015T120000Z')
    expect(ics).toContain('DTEND:20261015T121500Z')
    expect(ics).toContain('UID:a@bookeaa.com')
    for (const linea of ics.split('\r\n')) expect(new TextEncoder().encode(linea).length).toBeLessThanOrEqual(75)
  })
})
