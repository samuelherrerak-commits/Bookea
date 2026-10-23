import { describe, expect, it } from 'vitest'
import { constanteGs, funcionesGs } from './appsScript'

const gs = Object.values(import.meta.glob('../../apps-script/Code.gs', { query: '?raw', import: 'default', eager: true }) as Record<string, string>)[0] ?? ''
type Fn = (...a: any[]) => any

const ev = (a: string, b: string) => ({ getStartTime: () => new Date(a), getEndTime: () => new Date(b) })
/** Calendarios falsos por id: lista de eventos [inicio, fin] en hora de Caracas. */
function calendarios(eventos: Record<string, Array<[string, string]>>) {
  return {
    getCalendarById: (id: string) =>
      id in eventos
        ? { id, getEvents: () => eventos[id].map(([a, b]) => ev(`${a}-04:00`, `${b}-04:00`)) }
        : null,
  }
}
const caracas = (d: Date) => new Date(d.getTime() - 4 * 3600_000)
const Utilities = {
  formatDate: (d: Date, _z: string, f: string) => (f === 'u' ? String(caracas(d).getUTCDay() || 7) : caracas(d).toISOString().slice(0, 10)),
}

function cargar(eventos: Record<string, Array<[string, string]>> = {}) {
  return funcionesGs<Record<string, Fn>>(gs, [
    'parsearHorarioEquipo_', 'horarioEquipoTexto_', 'haceServicios_', 'idPersona_', 'equipoValidar_', 'asignarPersona_', 'calendarioPersona_',
    'parseDia_', 'toMinutes_', 'hhmm_', 'normKey_', 'slug_',
  ], {
    DIAS_CORTOS_EQUIPO: constanteGs(gs, 'DIAS_CORTOS_EQUIPO'), MAX_EQUIPO: 30, ZONA: 'America/Caracas',
    CalendarApp: calendarios(eventos), Utilities,
  })
}

describe('Code.gs · bookeaa team', () => {
  const f = cargar()

  it('el horario de cada persona se escribe y se lee igual', () => {
    const h = f.parsearHorarioEquipo_('lun 09:00-13:00, Sábado 9:00-14:00; mar 14:00-18:00')
    expect(h).toEqual([
      { dia: 1, inicio: '09:00', fin: '13:00' },
      { dia: 6, inicio: '09:00', fin: '14:00' },
      { dia: 2, inicio: '14:00', fin: '18:00' },
    ])
    expect(f.horarioEquipoTexto_(h)).toBe('lun 09:00-13:00, mar 14:00-18:00, sáb 09:00-14:00')
    expect(f.parsearHorarioEquipo_('')).toEqual([])
    expect(f.parsearHorarioEquipo_('lunes 18:00-09:00')).toBeNull()
    expect(f.parsearHorarioEquipo_('cualquier cosa')).toBeNull()
  })

  it('servicios: sin lista hace todos; ids sin importar mayúsculas', () => {
    expect(f.haceServicios_({ servicios: [] }, ['S1', 'S9'])).toBe(true)
    expect(f.haceServicios_({ servicios: ['s1', 'A1'] }, ['S1'])).toBe(true)
    expect(f.haceServicios_({ servicios: ['S1'] }, ['S1', 'S2'])).toBe(false)
  })

  it('el id (y link) sale del nombre y no se repite', () => {
    expect(f.idPersona_('Carla Pérez', [])).toBe('carla-perez')
    expect(f.idPersona_('Carla Pérez', ['carla-perez'])).toBe('carla-perez-2')
  })

  it('valida el equipo antes de guardarlo', () => {
    const ok = { nombre: 'Carla', email: 'carla@gmail.com', horarios: [{ dia: 'Lunes', inicio: '09:00', fin: '18:00' }] }
    expect(f.equipoValidar_({ config: { equipo_activo: 'si', equipo_modo: 'ambos' }, equipo: [ok] })).toEqual([])
    const errores = f.equipoValidar_({
      config: { equipo_modo: 'otro' },
      equipo: [ok, { nombre: 'Ana', email: 'CARLA@gmail.com' }, { nombre: 'Luis', email: 'x' }, { nombre: '', email: 'a@b.co' }, { nombre: 'Eva', email: 'eva@gmail.com', foto: 'http://x', horarios: [{ dia: 'lunes', inicio: '18:00', fin: '09:00' }] }],
    })
    expect(errores).toEqual([
      'Modo: servicio, persona o ambos.',
      'Ana: ese correo ya está en el equipo.',
      'Luis: escribe su Gmail.',
      'Cada persona necesita su nombre.',
      'Eva: la foto tiene que ser un enlace https://',
      'Eva: revisa su horario (lunes).',
    ])
    expect(f.equipoValidar_({ config: { equipo_activo: 'si' }, equipo: [{ ...ok, activo: false }] })).toContain('Para activar el equipo agrega al menos una persona activa.')
  })

  describe('a quién se le agenda la cita', () => {
    // Lunes 5 de octubre de 2026 de 10:00 a 11:00 en Caracas.
    const inicio = new Date('2026-10-05T10:00:00-04:00')
    const fin = new Date('2026-10-05T11:00:00-04:00')
    const negocio = [{ dia: 1, inicio: '09:00', fin: '18:00' }]
    const carla = { id: 'carla', nombre: 'Carla', calendarioId: 'c1', servicios: [], horario: [] }
    const andrea = { id: 'andrea', nombre: 'Andrea', calendarioId: 'c2', servicios: ['S1'], horario: [] }
    const sofia = { id: 'sofia', nombre: 'Sofía', calendarioId: 'c3', servicios: [], horario: [{ dia: 1, inicio: '14:00', fin: '18:00' }] }
    const g = cargar({
      c1: [['2026-10-05T09:00', '2026-10-05T09:30'], ['2026-10-05T15:00', '2026-10-05T16:00']],
      c2: [],
      c3: [],
    })
    const asignar = (pedida: string, cualquiera: boolean, ids: string[], equipo = [carla, andrea, sofia]) =>
      g.asignarPersona_(equipo, pedida, cualquiera, ids, inicio, fin, '2026-10-05', 600, 660, negocio)

    it('la persona pedida, si está libre y hace el servicio', () => {
      expect(asignar('carla', true, ['S1']).persona.id).toBe('carla')
      expect(asignar('andrea', true, ['S2'])).toEqual({ error: 'datos_invalidos', mensaje: 'Esa persona no hace estos servicios. Elige otra.' })
      // Sofía no trabaja a esa hora.
      expect(asignar('sofia', true, ['S1'])).toEqual({ error: 'cupo_ocupado', mensaje: 'Ese horario de Sofía acaba de ocuparse.' })
    })

    it('"Cualquiera": la libre con menos citas ese día; sin "Cualquiera" hay que elegir', () => {
      expect(asignar('*', true, ['S1']).persona.id).toBe('andrea') // Carla ya tiene 2 citas ese día
      expect(asignar('*', true, ['S2']).persona.id).toBe('carla') // Andrea no hace S2 y Sofía no está
      expect(asignar('*', false, ['S1']).error).toBe('datos_invalidos')
    })

    it('si choca con su calendario, está ocupada', () => {
      const h = cargar({ c1: [['2026-10-05T10:30', '2026-10-05T11:30']] })
      expect(h.asignarPersona_([carla], 'carla', true, [], inicio, fin, '2026-10-05', 600, 660, negocio).error).toBe('cupo_ocupado')
      expect(h.asignarPersona_([carla], '*', true, [], inicio, fin, '2026-10-05', 600, 660, negocio)).toEqual({ error: 'cupo_ocupado', mensaje: 'Ese horario acaba de ocuparse.' })
    })
  })
})
