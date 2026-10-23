import { describe, expect, it } from 'vitest'
import { DEFAULT_CONFIG, normalizeEquipo } from './normalize'
import type { Catalog, Profesional } from '../types'
import { CUALQUIERA } from '../types'
import { agendaCualquiera, agendaDe, agendaPersona, aptos, buscarPersona, hace, iniciales, serviciosDelCarrito } from './equipo'
import { buildWhatsAppMessage } from './whatsapp'

// Lunes 5 de octubre de 2026, 7:00 a. m. en Caracas.
const AHORA = new Date('2026-10-05T11:00:00Z')
const r = (dia: string, a: string, b: string) => ({ inicio: new Date(`${dia}T${a}:00-04:00`), fin: new Date(`${dia}T${b}:00-04:00`) })

const config = {
  ...DEFAULT_CONFIG,
  // Lunes a sábado de 9:00 a 13:00, cada hora.
  horario: [[], [[540, 780]], [[540, 780]], [[540, 780]], [[540, 780]], [[540, 780]], [[540, 780]]] as Array<Array<[number, number]>>,
  intervaloMin: 60,
  diasAnticipacion: 3,
  anticipacionMinHoras: 0,
  zonaHoraria: 'America/Caracas',
}

const carla: Profesional = { id: 'carla', nombre: 'Carla Méndez', foto: '', cargo: 'Directora', servicios: [], horario: null }
const andrea: Profesional = { id: 'andrea', nombre: 'Andrea Rojas', foto: '', cargo: '', servicios: ['S1', 'A1'], horario: null }
// Sofía solo trabaja los lunes de 11:00 a 13:00.
const sofia: Profesional = { id: 'sofia', nombre: 'Sofía Pérez', foto: '', cargo: '', servicios: [], horario: [[], [[660, 780]], [], [], [], [], []] }

const catalog: Catalog = {
  servicios: [],
  promociones: [{ id: 'P1', nombre: 'Mani + Pedi', servicioIds: ['S1', 'S2'], precio: 20 }],
  config,
  tasa: null,
  // El local cierra el lunes a las 12: ocupa a todos.
  citas: [r('2026-10-05', '12:00', '13:00')],
  equipo: {
    modo: 'servicio',
    cualquiera: true,
    personas: [carla, andrea, sofia],
    citas: { carla: [r('2026-10-05', '09:00', '11:00')], andrea: [r('2026-10-05', '10:00', '12:00')], sofia: [] },
  },
}

const libres = (dias: ReturnType<typeof agendaPersona>, fecha: string) =>
  dias.find((d) => d.fecha === fecha)?.slots.filter((s) => s.estado === 'libre').map((s) => s.hora) ?? []

describe('bookeaa team · con quién', () => {
  it('quién hace qué: sin lista hace todo; con promociones cuentan sus servicios', () => {
    expect(serviciosDelCarrito({ servicios: ['A1'], promos: ['P1'] }, catalog)).toEqual(['A1', 'S1', 'S2'])
    expect(hace(andrea, ['S1', 'A1'])).toBe(true)
    expect(hace(andrea, ['S1', 'S2'])).toBe(false)
    expect(aptos(catalog.equipo!, ['S2']).map((p) => p.id)).toEqual(['carla', 'sofia'])
  })

  it('el link ?con= encuentra por id, por nombre completo o por el primer nombre, sin tildes', () => {
    expect(buscarPersona(catalog.equipo, 'carla')?.id).toBe('carla')
    expect(buscarPersona(catalog.equipo, 'Sofía Pérez')?.id).toBe('sofia')
    expect(buscarPersona(catalog.equipo, 'SOFIA')?.id).toBe('sofia')
    expect(buscarPersona(catalog.equipo, 'nadie')).toBeNull()
    expect(buscarPersona(null, 'carla')).toBeNull()
  })

  it('cada persona ve su calendario, su horario y lo que ocupa a todos', () => {
    expect(libres(agendaPersona(catalog, carla, 60, AHORA), '2026-10-05')).toEqual(['11:00'])
    expect(libres(agendaPersona(catalog, andrea, 60, AHORA), '2026-10-05')).toEqual(['09:00'])
    expect(libres(agendaPersona(catalog, sofia, 60, AHORA), '2026-10-05')).toEqual(['11:00'])
    // Sofía no trabaja el martes: ese día no aparece en su agenda.
    expect(agendaPersona(catalog, sofia, 60, AHORA).map((d) => d.fecha)).toEqual(['2026-10-05'])
  })

  it('"Cualquiera": una hora está libre si alguien que hace el servicio la tiene libre', () => {
    const lunes = libres(agendaCualquiera(catalog, [carla, andrea, sofia], 60, AHORA), '2026-10-05')
    expect(lunes).toEqual(['09:00', '11:00'])
    // Para S2 Andrea no cuenta: a las 9 no hay nadie.
    expect(libres(agendaDe(catalog, CUALQUIERA, ['S2'], 60, AHORA), '2026-10-05')).toEqual(['11:00'])
    expect(agendaDe(catalog, null, [], 60, AHORA)).toEqual([])
  })

  it('sin equipo la agenda es la del negocio, como siempre', () => {
    const sinEquipo = { ...catalog, equipo: null }
    expect(libres(agendaDe(sinEquipo, null, [], 60, AHORA), '2026-10-05')).toEqual(['09:00', '10:00', '11:00'])
  })

  it('iniciales para la foto que falta', () => {
    expect(iniciales('Carla Méndez')).toBe('CM')
    expect(iniciales('Sofía')).toBe('S')
  })

  it('lee el equipo del servidor: modo, "Cualquiera" y la ocupación de cada uno', () => {
    const e = normalizeEquipo(
      [{ id: 'carla', nombre: 'Carla', servicios: ['S1'], horarios: [{ dia: 1, inicio: '09:00', fin: '12:00' }], foto: 'http://x' }, { id: '', nombre: 'Sin id' }],
      { carla: [{ inicio: '2026-10-05T13:00:00Z', fin: '2026-10-05T14:00:00Z' }] },
      { equipo_modo: 'Persona', equipo_cualquiera: 'no' },
    )!
    expect(e.modo).toBe('persona')
    expect(e.cualquiera).toBe(false)
    expect(e.personas).toHaveLength(1)
    expect(e.personas[0].foto).toBe('') // solo https
    expect(e.personas[0].horario?.[1]).toEqual([[540, 720]])
    expect(e.citas.carla).toHaveLength(1)
    expect(normalizeEquipo([], {}, {})).toBeNull()
    expect(normalizeEquipo(undefined, undefined, undefined)).toBeNull()
  })

  it('el mensaje de WhatsApp dice con quién, aunque la plantilla no lo tenga', () => {
    const base = {
      customer: { nombre: 'Ana', telefono: '04121234567' },
      schedule: { fecha: '2026-10-05', hora: '11:00' },
      summary: { lines: [], duracionMin: 60, total: 10, totalBs: null, recargo: 0, recargoPct: 0, descuento: 0 } as never,
      coupon: null,
      payment: { metodo: 'lugar' } as const,
      modalidad: 'local' as const,
      lugar: { titulo: 'En el salón', sede: null },
      tasa: null,
    }
    const msg = buildWhatsAppMessage({ ...base, plantilla: 'Hola\n⏰ {hora}\nFin', profesional: 'Carla Méndez' })
    expect(msg).toBe('Hola\n⏰ 11:00 a. m.\n💁 Con: Carla Méndez\nFin')
    expect(buildWhatsAppMessage({ ...base, plantilla: 'Con {profesional} a las {hora}', profesional: 'Carla' })).toBe('Con Carla a las 11:00 a. m.')
    expect(buildWhatsAppMessage({ ...base, plantilla: 'Hola\n⏰ {hora}' })).toBe('Hola\n⏰ 11:00 a. m.')
  })
})
