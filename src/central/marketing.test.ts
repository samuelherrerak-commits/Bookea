import { describe, expect, it } from 'vitest'
import type { Publicacion } from './api'
import { atrasada, mesAnterior, mesSiguiente, ordenar, porDia, semanasDelMes, textoParaPublicar } from './marketing'

const pub = (id: string, fecha: string, hora: string, estado: Publicacion['estado'] = 'borrador'): Publicacion => ({
  id, fecha, hora, tipo: 'carrusel', titulo: id, plataforma: '', caption: 'Hola', hashtags: '#a #b', media: '', estado, publicadoEn: '', notas: '',
})

describe('marketing en central', () => {
  it('ordena por fecha y hora y agrupa por día', () => {
    const l = ordenar([pub('c', '2026-10-16', '08:00'), pub('b', '2026-10-15', '20:30'), pub('a', '2026-10-15', '08:00')])
    expect(l.map((p) => p.id)).toEqual(['a', 'b', 'c'])
    expect(porDia(l).map((g) => [g.fecha, g.items.length])).toEqual([['2026-10-15', 2], ['2026-10-16', 1]])
  })
  it('octubre de 2026 empieza en jueves y se muestra de lunes a domingo', () => {
    const s = semanasDelMes('2026-10')
    expect(s[0][0]).toBe('2026-09-28')
    expect(s[0][3]).toBe('2026-10-01')
    expect(s.at(-1)!.at(-1)).toBe('2026-11-01')
    expect(s.every((w) => w.length === 7)).toBe(true)
  })
  it('cambia de mes sin saltarse el cambio de año', () => {
    expect(mesSiguiente('2026-12')).toBe('2027-01')
    expect(mesAnterior('2027-01')).toBe('2026-12')
  })
  it('texto para publicar junta caption y hashtags', () => {
    expect(textoParaPublicar(pub('x', '2026-10-15', '08:00'))).toBe('Hola\n\n#a #b')
  })
  it('atrasada: ayer sin publicar sí, publicado no, hoy más tarde no', () => {
    expect(atrasada(pub('x', '2026-10-14', '08:00'), '2026-10-15')).toBe(true)
    expect(atrasada(pub('x', '2026-10-14', '08:00', 'publicado'), '2026-10-15')).toBe(false)
    expect(atrasada(pub('x', '2026-10-15', '20:30'), '2026-10-15', '13:00')).toBe(false)
    expect(atrasada(pub('x', '2026-10-15', '08:00'), '2026-10-15', '13:00')).toBe(true)
  })
})
