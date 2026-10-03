import { describe, expect, it, vi } from 'vitest'
import { constanteGs, funcionesGs } from './appsScript'

const gs = Object.values(import.meta.glob('../../apps-script/Code.gs', { query: '?raw', import: 'default', eager: true }) as Record<string, string>)[0] ?? ''
const CFG = constanteGs<Record<string, string>>(gs, 'BOT_DEFAULTS')
const BASICAS = ['minutosDe_', 'hhmm_', 'msCaracas_', 'horasDelDia_', 'diasCandidatos_', 'horasLibres_', 'botDuracion_', 'botDisponibilidad_', 'botLibre_']

type Fn = (...a: any[]) => any
const f = funcionesGs<Record<string, Fn>>(gs, BASICAS)
// Jueves 1-oct-2026, 3:00 p. m. en Caracas.
const AHORA = Date.UTC(2026, 9, 1, 19)

/** Calendario falso: eventos [inicio, fin] en ms. */
const calendario = (eventos: [number, number, string?][]) => ({
  getId: () => 'cal',
  getEvents: () => eventos.map(([a, b, id]) => ({ getStartTime: () => new Date(a), getEndTime: () => new Date(b), getId: () => (id || 'x') + '@google.com' })),
})

describe('Code.gs · horas para la cita de afiliación', () => {
  it('arma las horas de cada día según la duración', () => {
    expect(f.horasDelDia_('08:00', '17:00', 90)).toEqual(['08:00', '09:30', '11:00', '12:30', '14:00', '15:30'])
    expect(f.horasDelDia_('09:00', '17:00', 60)).toHaveLength(8)
    expect(f.horasDelDia_('x', '17:00', 60)).toEqual([])
  })

  it('presencial solo sábados; Meet solo de lunes a viernes', () => {
    expect(f.diasCandidatos_('presencial', AHORA, CFG)).toEqual(['2026-10-03', '2026-10-10', '2026-10-17', '2026-10-24'])
    const meet = f.diasCandidatos_('meet', AHORA, CFG) as string[]
    expect(meet).toHaveLength(8)
    expect(meet[0]).toBe('2026-10-01')
    for (const d of meet) expect([1, 2, 3, 4, 5]).toContain(new Date(d + 'T12:00:00Z').getUTCDay())
  })

  it('respeta lo ocupado en el calendario y la anticipación mínima', () => {
    const ocupado = f.msCaracas_('2026-10-03', '09:00')
    const dias = f.botDisponibilidad_('presencial', AHORA, CFG, calendario([[ocupado, ocupado + 3600e3]])) as { fecha: string; horas: string[] }[]
    // El evento de 9:00 a 10:00 tapa 08:00–09:30 y 09:30–11:00.
    expect(dias[0]).toEqual({ fecha: '2026-10-03', horas: ['11:00', '12:30', '14:00', '15:30'] })
    // Hoy jueves a las 3 p. m. con 12 h de anticipación: no queda nada hoy; mañana desde las 9.
    const meet = f.botDisponibilidad_('meet', AHORA, CFG, calendario([])) as { fecha: string; horas: string[] }[]
    expect(meet[0].fecha).toBe('2026-10-02')
    expect(meet[0].horas[0]).toBe('09:00')
  })

  it('al reprogramar, el evento propio no cuenta como ocupado', () => {
    const ini = f.msCaracas_('2026-10-03', '08:00')
    const cal = calendario([[ini, ini + 90 * 60e3, 'propio']])
    expect(f.botLibre_('presencial', '2026-10-03', '08:00', AHORA, CFG, cal)).toBe(false)
    expect(f.botLibre_('presencial', '2026-10-03', '08:00', AHORA, CFG, cal, 'propio')).toBe(true)
  })
})

describe('Code.gs · rama del bot en doPost', () => {
  const props = (p: Record<string, string>) => ({ getScriptProperties: () => ({ getProperty: (k: string) => p[k] ?? null, getProperties: () => p }) })
  const conToken = (token: string, extra: Record<string, unknown> = {}) =>
    funcionesGs<{ atenderBot_: Fn }>(gs, ['atenderBot_', 'botConfig_', ...BASICAS, 'botTexto_', 'paraCelda_'], {
      PropertiesService: props({ bot_token: token }),
      BOT_DEFAULTS: CFG,
      limite_: () => false,
      calendarioAfiliaciones_: () => calendario([]),
      ...extra,
    })

  it('rechaza sin el token del bot (el público de la web no sirve)', () => {
    const { atenderBot_ } = conToken('bot_' + 'a'.repeat(40))
    expect(atenderBot_({ token: 'bk_tokenpublico' }, AHORA)).toEqual({ error: 'no_autorizado' })
    expect(atenderBot_({}, AHORA)).toEqual({ error: 'no_autorizado' })
    const corto = conToken('bot_corto').atenderBot_
    expect(corto({ token: 'bot_corto', op: 'disponibilidad' }, AHORA)).toEqual({ error: 'no_autorizado' })
  })

  it('con el token devuelve la disponibilidad', () => {
    const token = 'bot_' + 'a'.repeat(40)
    const { atenderBot_ } = conToken(token)
    const r = atenderBot_({ token, op: 'disponibilidad', modalidad: 'presencial' }, AHORA)
    expect(r.dias).toHaveLength(4)
    expect(r.dias[0].horas).toHaveLength(6)
  })

  it('agendar rechaza una hora ocupada sin crear el evento', () => {
    const ocupado = f.msCaracas_('2026-10-03', '08:00')
    const insert = vi.fn()
    // botAgendar_ con sus dependencias reales y el Calendar avanzado falso
    const { botAgendar_ } = funcionesGs<{ botAgendar_: Fn }>(gs, ['botAgendar_', ...BASICAS, 'botTexto_', 'paraCelda_', 'botCita_'], {
      LockService: { getScriptLock: () => ({ tryLock: () => true, releaseLock: () => undefined }) },
      calendarioAfiliaciones_: () => calendario([[ocupado, ocupado + 60e3]]),
      Calendar: { Events: { insert } },
      ZONA: 'America/Caracas',
    })
    const af = { negocio: 'X', correo: 'x@gmail.com', modalidad: 'presencial', direccion: 'Calle 1', fecha: '2026-10-03', hora: '08:00' }
    expect(botAgendar_({ af }, { telefono: '58412', nombre: '' }, AHORA, CFG)).toEqual({ ok: false, motivo: 'ocupado' })
    expect(insert).not.toHaveBeenCalled()
    expect(botAgendar_({ af: { ...af, correo: 'malo' } }, { telefono: '58412', nombre: '' }, AHORA, CFG)).toEqual({ ok: false, motivo: 'error' })
  })
})
