/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { avisar, avisoPrueba, nuevaReserva, repasar, suscribir } from './avisos'
import { msDeCita } from './tiempo'

/** D1 sobre SQLite en memoria, con las migraciones reales. */
function d1() {
  const db = new DatabaseSync(':memory:')
  for (const f of ['0001_inicial.sql', '0002_avisos.sql', '0003_conector.sql', '0004_equipo.sql']) db.exec(readFileSync(new URL(`../migrations/${f}`, import.meta.url), 'utf8'))
  const preparar = (sql: string, args: unknown[] = []) => ({
    bind: (...a: unknown[]) => preparar(sql, a),
    run: async () => (db.prepare(sql).run(...(args as any[])), { success: true }),
    first: async () => db.prepare(sql).get(...(args as any[])) ?? null,
    all: async () => ({ results: db.prepare(sql).all(...(args as any[])) }),
  })
  return { prepare: (sql: string) => preparar(sql), batch: async (l: any[]) => Promise.all(l.map((p) => p.run())) } as unknown as D1Database
}

// Claves de un navegador de verdad (RFC 8291): el cifrado corre completo.
const llaves = { p256dh: 'BCVxsr7N_eNgVRqvHtD0zTZsEc6-VV-JvLexhqUzORcxaOzi6-AYWXvTBHm4bjyPjs7Vd8pZGH6SRpkNtoIAiw4', auth: 'BTBZMqHH6r4Tts7J_aSIgg' }
const tel = (quien: string) => ({ endpoint: `https://push.ejemplo/${quien}`, keys: llaves })

let db: D1Database
let enviados: string[]
let agenda: Record<string, unknown[]> = {}

beforeEach(async () => {
  db = d1()
  enviados = []
  vi.stubGlobal('fetch', vi.fn(async (url: string | URL | Request) => {
    const u = String(url instanceof Request ? url.url : url)
    if (u.startsWith('https://push.ejemplo/')) {
      enviados.push(u.split('/').pop()!)
      return new Response(null, { status: 201 })
    }
    return Response.json({ agenda })
  }))
  await suscribir(db, 'spa-sol', 'duena@gmail.com', tel('duena'), 1)
  await suscribir(db, 'spa-sol', 'carla@gmail.com', tel('carla'), 1, 'carla')
  await suscribir(db, 'spa-sol', 'andrea@gmail.com', tel('andrea'), 1, 'andrea')
})
afterEach(() => vi.unstubAllGlobals())

const cita = { id: 'r1', cliente: 'Ana', servicios: 'Corte', fecha: '2026-10-23', hora: '10:00', estado: 'Confirmada' }

describe('avisos de bookeaa team', () => {
  it('la reserva le llega a quien atiende y al administrador, no al resto del equipo', async () => {
    await nuevaReserva(db, 'spa-sol', { ...cita, profesionalId: 'carla' })
    expect(enviados.sort()).toEqual(['carla', 'duena'])
  })

  it('sin equipo (o "Cualquiera" sin asignar) le llega a todos', async () => {
    await nuevaReserva(db, 'spa-sol', cita)
    expect(enviados.sort()).toEqual(['andrea', 'carla', 'duena'])
  })

  it('el aviso de prueba va solo a quien lo pidió; los de cobro, solo al administrador', async () => {
    await avisar(db, 'spa-sol', avisoPrueba('spa-sol'), { persona: 'andrea', exacto: true })
    expect(enviados).toEqual(['andrea'])
    enviados = []
    await avisar(db, 'spa-sol', avisoPrueba('spa-sol'), { persona: '', exacto: true })
    expect(enviados).toEqual(['duena'])
  })

  it('el recordatorio va a quien atiende y al administrador', async () => {
    const inicio = msDeCita('2026-10-23', '10:00')
    await nuevaReserva(db, 'spa-sol', { ...cita, profesionalId: 'andrea' })
    enviados = []
    await repasar({ DB: db, APPS_SCRIPT_URL: 'https://script', BOT_TOKEN: 't' }, inicio - 20 * 60000)
    expect(enviados.sort()).toEqual(['andrea', 'duena'])
  })

  it('resumen de la mañana: el administrador ve el día completo y cada quien el suyo', async () => {
    agenda = { 'spa-sol': [{ ...cita, profesionalId: 'carla' }, { ...cita, id: 'r2', hora: '11:00', profesionalId: 'carla' }, { ...cita, id: 'r3', hora: '15:00', profesionalId: 'andrea' }] }
    const cuerpos: Record<string, number> = {}
    // Las 7:30 a. m. de ese día en Caracas.
    await repasar({ DB: db, APPS_SCRIPT_URL: 'https://script', BOT_TOKEN: 't' }, msDeCita('2026-10-23', '07:30'))
    for (const e of enviados) cuerpos[e] = (cuerpos[e] ?? 0) + 1
    expect(cuerpos).toEqual({ duena: 1, carla: 1, andrea: 1 })
  })
})
