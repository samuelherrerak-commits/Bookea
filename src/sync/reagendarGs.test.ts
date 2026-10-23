import { describe, expect, it } from 'vitest'
import { funcionesGs } from './appsScript'

const gs = Object.values(import.meta.glob('../../apps-script/Code.gs', { query: '?raw', import: 'default', eager: true }) as Record<string, string>)[0] ?? ''
type Fn = (...a: any[]) => any

// Hora de Caracas (UTC-4) ↔ Date.
const enCaracas = (ymdHm: string) => new Date(ymdHm.replace(' ', 'T') + ':00-04:00')
const caracas = (d: Date) => new Date(d.getTime() - 4 * 3600_000)
const Utilities = {
  parseDate: (s: string) => enCaracas(s),
  formatDate: (d: Date, _z: string, f: string) =>
    f === 'u' ? String(caracas(d).getUTCDay() || 7) : f === 'HH:mm' ? caracas(d).toISOString().slice(11, 16) : caracas(d).toISOString().slice(0, 10),
}

interface Ev { id: string; ini: Date; fin: Date; titulo: string; desc: string; lugar: string; borrado?: boolean }
/** Un calendario falso con sus eventos. */
function calendario(id: string, eventos: Ev[] = []) {
  const envolver = (e: Ev) => ({
    getId: () => e.id, getStartTime: () => e.ini, getEndTime: () => e.fin, getTitle: () => e.titulo,
    getDescription: () => e.desc, getLocation: () => e.lugar,
    setTime: (a: Date, b: Date) => { e.ini = a; e.fin = b },
    setDescription: (d: string) => { e.desc = d },
    deleteEvent: () => { e.borrado = true },
  })
  return {
    eventos,
    getId: () => id,
    getEvents: (a: Date, b: Date) => eventos.filter((e) => !e.borrado && e.ini < b && e.fin > a).map(envolver),
    createEvent: (titulo: string, ini: Date, fin: Date, o: { location?: string; description?: string }) => {
      const e = { id: `${id}-nuevo${eventos.length}`, ini, fin, titulo, desc: o.description || '', lugar: o.location || '' }
      eventos.push(e)
      return envolver(e)
    },
  }
}
const ev = (id: string, ini: string, fin: string, titulo: string, desc = ''): Ev => ({ id, ini: enCaracas(ini), fin: enCaracas(fin), titulo, desc, lugar: 'Sede Centro' })

// Mañana de "hoy" (2026-10-23, viernes) es sábado 24.
const AHORA = enCaracas('2026-10-23 10:00').getTime()
const HORARIO = [1, 2, 3, 4, 5, 6].map((dia) => ({ dia, inicio: '09:00', fin: '18:00' }))

function montar(opts: { equipo?: boolean } = {}) {
  const reserva = { ID: 'r1', Cliente: 'Pedro Silva', Telefono: '0412', Servicios: 'Corte', Estado: 'Confirmada', Fecha_Cita: '2026-10-24', Hora_Cita: '11:00', Profesional: opts.equipo ? 'Carla' : '', Profesional_ID: opts.equipo ? 'carla' : '' }
  const negocio = calendario('negocio', opts.equipo ? [] : [
    ev('e1', '2026-10-24 11:00', '2026-10-24 11:45', 'Cita: Pedro Silva - Corte', 'Teléfono: 0412\nID: r1'),
    ev('e2', '2026-10-24 13:00', '2026-10-24 14:00', 'Cita: Luis - Barba', 'ID: r2'),
  ])
  const carla = calendario('carla', opts.equipo ? [ev('c1', '2026-10-24 11:00', '2026-10-24 11:45', 'Cita: Pedro Silva - Corte', 'Con: Carla\nID: r1')] : [])
  const andres = calendario('andres', opts.equipo ? [ev('a1', '2026-10-24 15:00', '2026-10-24 16:00', 'Cita: Ana - Tinte', 'ID: r3')] : [])
  const cals: Record<string, ReturnType<typeof calendario>> = { carla, andres }
  const equipo = opts.equipo ? [
    { id: 'carla', nombre: 'Carla', activo: true, calendarioId: 'carla', horario: [] },
    { id: 'andres', nombre: 'Andrés', activo: true, calendarioId: 'andres', horario: [{ dia: 6, inicio: '12:00', fin: '18:00' }] },
  ] : []
  const cambios: Record<string, unknown>[] = []
  const avisos: any[] = []
  const f = funcionesGs<Record<string, Fn>>(gs, [
    'citaParaMover_', 'ocupadoParaMover_', 'problemaHora_', 'destinoReagendar_', 'contextoHoras_', 'tramosDe_', 'horasReagendar_', 'reagendarCita_',
    'ymd_', 'horaTexto_', 'toMinutes_', 'hhmm_', 'toNumber_',
  ], {
    ZONA: 'America/Caracas', Utilities,
    getSheetData_: () => [reserva],
    equipoLeer_: () => equipo,
    calendarioPersona_: (p: { id: string }) => cals[p.id] ?? null,
    getCalendarioTenant_: () => negocio,
    getConfig_: () => ({ intervalo_min: '60' }),
    getHorarios_: () => HORARIO,
    getBloqueos_: () => [{ inicio: enCaracas('2026-10-24 17:00'), fin: enCaracas('2026-10-24 18:00') }],
    LockService: { getScriptLock: () => ({ tryLock: () => true, releaseLock: () => {} }) },
    asegurarColumnas_: () => {},
    actualizarReserva_: (_l: unknown, id: string, c: Record<string, unknown>) => { cambios.push({ id, ...c }) },
    limpiarCacheCatalogo_: () => {},
    ponerAlertas_: () => {},
    recordatoriosDe_: () => [60],
    llamarWorker_: (ruta: string, d: unknown) => { avisos.push({ ruta, d }) },
    console: { warn: () => {}, error: () => {} },
  })
  const libro = { getSheetByName: () => ({}) }
  const tenant = { slug: 'barberia' }
  return {
    negocio, carla, andres, cambios, avisos, reserva,
    horas: (d: Record<string, unknown>) => f.horasReagendar_(libro, tenant, { id: 'r1', ...d }, AHORA),
    mover: (d: Record<string, unknown>) => f.reagendarCita_(libro, tenant, { id: 'r1', ...d }, AHORA),
  }
}

describe('Code.gs · reagendar una cita desde Mi negocio', () => {
  it('horas libres: dentro del horario, sin la cita misma, sin otras citas ni bloqueos', () => {
    const m = montar()
    const r = m.horas({ fecha: '2026-10-24' })
    expect(r.duracion).toBe(45)
    // Cada 60 min y dura 45: 11:00 (ella misma) sirve, 13:00 está ocupada y 17:00 bloqueada.
    expect(r.horas).toEqual(['09:00', '10:00', '11:00', '12:00', '14:00', '15:00', '16:00'])
    expect(m.horas({ fecha: '2026-10-25' })).toMatchObject({ horas: [], trabaja: false }) // domingo
  })

  it('mueve el evento y la fila, y avisa con la hora de antes', () => {
    const m = montar()
    const r = m.mover({ fecha: '2026-10-26', hora: '15:00' })
    expect(r).toMatchObject({ ok: true, forzada: false, cita: { id: 'r1', fecha: '2026-10-26', hora: '15:00', antes: { fecha: '2026-10-24', hora: '11:00' } } })
    const e = m.negocio.eventos[0]
    expect([e.ini, e.fin]).toEqual([enCaracas('2026-10-26 15:00'), enCaracas('2026-10-26 15:45')])
    expect(e.desc).toBe('Teléfono: 0412\nID: r1\nReagendada: antes 2026-10-24 11:00')
    expect(m.cambios).toEqual([{ id: 'r1', Fecha_Cita: '2026-10-26', Hora_Cita: '15:00', Reagendada: "'2026-10-24 11:00" }])
    expect(m.avisos).toEqual([{ ruta: '/push/evento', d: expect.objectContaining({ tipo: 'reagendada', slug: 'barberia' }) }])
  })

  it('si choca o queda fuera del horario avisa y no la mueve; con forzar, sí', () => {
    const m = montar()
    expect(m.mover({ fecha: '2026-10-24', hora: '13:30' })).toMatchObject({ ok: false, motivo: 'ocupada', puedeForzar: true, mensaje: 'A esa hora ya hay algo en la agenda: Cita: Luis - Barba.' })
    expect(m.mover({ fecha: '2026-10-24', hora: '19:00' })).toMatchObject({ ok: false, motivo: 'fuera' })
    expect(m.cambios).toEqual([])
    expect(m.mover({ fecha: '2026-10-24', hora: '19:00', forzar: true })).toMatchObject({ ok: true, forzada: true })
  })

  it('nunca a una hora que ya pasó, ni una cita cancelada', () => {
    const m = montar()
    expect(m.mover({ fecha: '2026-10-23', hora: '08:00', forzar: true })).toMatchObject({ ok: false, motivo: 'pasada' })
    m.reserva.Estado = 'Cancelada'
    expect(m.mover({ fecha: '2026-10-26', hora: '15:00' })).toEqual({ error: 'datos_invalidos', mensaje: 'Esa cita está cancelada.' })
  })

  it('con equipo: pasársela a otra persona la saca de un calendario y la pone en el otro', () => {
    const m = montar({ equipo: true })
    // Andrés trabaja el sábado de 12 a 18 y tiene una cita a las 15.
    expect(m.horas({ fecha: '2026-10-24', persona: 'andres' }).horas).toEqual(['12:00', '13:00', '14:00', '16:00'])
    const r = m.mover({ fecha: '2026-10-24', hora: '13:00', persona: 'andres' })
    expect(r).toMatchObject({ ok: true, cita: { profesional: 'Andrés', profesionalId: 'andres' } })
    expect(m.carla.eventos[0].borrado).toBe(true)
    const nuevo = m.andres.eventos[1]
    expect(nuevo).toMatchObject({ titulo: 'Cita: Pedro Silva - Corte', lugar: 'Sede Centro', ini: enCaracas('2026-10-24 13:00'), fin: enCaracas('2026-10-24 13:45') })
    expect(nuevo.desc).toBe('Con: Andrés\nID: r1\nReagendada: antes 2026-10-24 11:00')
    expect(m.cambios[0]).toMatchObject({ Profesional: 'Andrés', Profesional_ID: 'andres' })
    expect(m.mover({ fecha: '2026-10-24', hora: '13:00', persona: 'nadie' })).toEqual({ error: 'datos_invalidos', mensaje: 'Esa persona no está activa en el equipo.' })
  })
})
