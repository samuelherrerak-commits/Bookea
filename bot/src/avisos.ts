/**
 * Avisos de "Mi negocio": notificaciones Web Push al dueño de cada negocio.
 *  - Nueva reserva (y "Pago por verificar" si fue con Pago Móvil): apenas el Apps Script avisa.
 *  - Recordatorio unos 30 minutos antes de cada cita (cron cada 5 minutos).
 *  - Resumen de la mañana a las 7:00 con las citas del día (el Apps Script manda la agenda).
 */
import { diaCorto, enCaracas, horaLegible, msDeCita } from './tiempo'
import { crearClavesVapid, enviarPush, type ClavesVapid, type Suscripcion } from './webpush'

export type EnvAvisos = { DB: D1Database; APPS_SCRIPT_URL: string; BOT_TOKEN: string }

export const CONTACTO = 'mailto:hola@bookeaa.com'
export const MINUTOS_RECORDATORIO = 30
export const HORA_RESUMEN = 7

export interface CitaAviso {
  id: string
  cliente: string
  servicios: string
  fecha: string
  hora: string
  estado?: string
}

export interface Notificacion {
  titulo: string
  cuerpo: string
  /** Agrupa: una notificación con el mismo tag reemplaza a la anterior. */
  tag: string
  url: string
}

const urlNegocio = (slug: string) => `/negocio?n=${encodeURIComponent(slug)}`

export function avisoReserva(slug: string, c: CitaAviso): Notificacion {
  const porVerificar = /verificar/i.test(c.estado || '')
  return {
    titulo: porVerificar ? '💸 Pago por verificar' : '📅 Nueva reserva',
    cuerpo: `${c.cliente} · ${c.servicios}\n${diaCorto(c.fecha)} · ${horaLegible(c.hora)}${porVerificar ? '\nRevisa el capture del Pago Móvil.' : ''}`,
    tag: `reserva-${c.id}`,
    url: urlNegocio(slug),
  }
}

export function avisoRecordatorio(slug: string, c: { id: string; cliente: string; servicios: string; inicio: number }, ahora: number): Notificacion {
  const min = Math.max(1, Math.round((c.inicio - ahora) / 60000))
  const { minutos } = enCaracas(c.inicio)
  const hora = `${String(Math.floor(minutos / 60)).padStart(2, '0')}:${String(minutos % 60).padStart(2, '0')}`
  return {
    titulo: `⏰ En ${min} min: ${c.cliente}`,
    cuerpo: `${c.servicios} · ${horaLegible(hora)}`,
    tag: `recordatorio-${c.id}`,
    url: urlNegocio(slug),
  }
}

export function avisoResumen(slug: string, citas: CitaAviso[]): Notificacion | null {
  if (!citas.length) return null
  const primera = [...citas].sort((a, b) => a.hora.localeCompare(b.hora))[0]
  return {
    titulo: citas.length === 1 ? '☀️ Hoy tienes 1 cita' : `☀️ Hoy tienes ${citas.length} citas`,
    cuerpo: `La primera a las ${horaLegible(primera.hora)}: ${primera.cliente} · ${primera.servicios}`,
    tag: `resumen-${primera.fecha}`,
    url: urlNegocio(slug),
  }
}

/** "2026-10-09" de un instante, en Caracas. */
export function fechaCaracas(ms: number): string {
  return new Date(ms - 4 * 3600_000).toISOString().slice(0, 10)
}

// ---------- D1 ----------

export async function clavesVapid(db: D1Database): Promise<ClavesVapid> {
  const fila = await db.prepare("SELECT valor FROM ajustes WHERE clave = 'vapid'").first<{ valor: string }>()
  if (fila) return JSON.parse(fila.valor) as ClavesVapid
  const nuevas = await crearClavesVapid()
  // Si dos pedidos llegan a la vez, gana el primero y ambos leen el mismo.
  await db.prepare("INSERT OR IGNORE INTO ajustes (clave, valor) VALUES ('vapid', ?)").bind(JSON.stringify(nuevas)).run()
  const guardada = await db.prepare("SELECT valor FROM ajustes WHERE clave = 'vapid'").first<{ valor: string }>()
  return JSON.parse(guardada!.valor) as ClavesVapid
}

export async function suscribir(db: D1Database, slug: string, email: string, s: { endpoint?: string; keys?: { p256dh?: string; auth?: string } }, ahora: number) {
  if (!s.endpoint || !/^https:\/\//.test(s.endpoint) || !s.keys?.p256dh || !s.keys?.auth) throw new Error('Suscripción inválida')
  await db.prepare(
    `INSERT INTO push_suscripciones (endpoint, slug, email, p256dh, auth, creado) VALUES (?1, ?2, ?3, ?4, ?5, ?6)
     ON CONFLICT (endpoint) DO UPDATE SET slug = ?2, email = ?3, p256dh = ?4, auth = ?5`,
  ).bind(s.endpoint, slug, email, s.keys.p256dh, s.keys.auth, ahora).run()
}

export async function quitar(db: D1Database, endpoint: string) {
  await db.prepare('DELETE FROM push_suscripciones WHERE endpoint = ?').bind(endpoint).run()
}

async function guardarCita(db: D1Database, slug: string, c: CitaAviso) {
  if (!c.id || !/^\d{4}-\d{2}-\d{2}$/.test(c.fecha) || !/^\d{2}:\d{2}$/.test(c.hora)) return
  await db.prepare(
    `INSERT INTO push_citas (slug, id, inicio, cliente, servicios) VALUES (?1, ?2, ?3, ?4, ?5)
     ON CONFLICT (slug, id) DO UPDATE SET recordada = CASE WHEN inicio = ?3 THEN recordada ELSE 0 END,
       inicio = ?3, cliente = ?4, servicios = ?5`,
  ).bind(slug, c.id, msDeCita(c.fecha, c.hora), c.cliente.slice(0, 80), c.servicios.slice(0, 200)).run()
}

/** Manda una notificación a todos los equipos de un negocio y borra los que ya no existen. */
export async function avisar(db: D1Database, slug: string, n: Notificacion): Promise<number> {
  const { results } = await db.prepare('SELECT endpoint, p256dh, auth FROM push_suscripciones WHERE slug = ?').bind(slug).all<Suscripcion>()
  if (!results.length) return 0
  const claves = await clavesVapid(db)
  let enviadas = 0
  for (const s of results) {
    try {
      const r = await enviarPush(s, n, claves, CONTACTO)
      if (r === 'ok') enviadas++
      else if (r === 'vencida') await quitar(db, s.endpoint)
    } catch (err) {
      console.warn('Push a', slug, err)
    }
  }
  return enviadas
}

/** Una reserva nueva que avisa el Apps Script. */
export async function nuevaReserva(db: D1Database, slug: string, c: CitaAviso) {
  await guardarCita(db, slug, c)
  await avisar(db, slug, avisoReserva(slug, c))
}

/** Lo que corre el cron cada 5 minutos. */
export async function repasar(env: EnvAvisos, ahora: number) {
  // Recordatorios: citas que empiezan en los próximos 30 minutos y no se avisaron.
  const { results: proximas } = await env.DB.prepare(
    'SELECT slug, id, cliente, servicios, inicio FROM push_citas WHERE recordada = 0 AND inicio > ?1 AND inicio <= ?2',
  ).bind(ahora, ahora + MINUTOS_RECORDATORIO * 60000 + 60000).all<{ slug: string; id: string; cliente: string; servicios: string; inicio: number }>()
  for (const c of proximas) {
    await env.DB.prepare('UPDATE push_citas SET recordada = 1 WHERE slug = ? AND id = ?').bind(c.slug, c.id).run()
    await avisar(env.DB, c.slug, avisoRecordatorio(c.slug, c, ahora))
  }

  // Resumen de la mañana: desde las 7:00 hasta el mediodía, una vez por día y negocio.
  const { minutos } = enCaracas(ahora)
  if (minutos >= HORA_RESUMEN * 60 && minutos < 12 * 60) await resumenDelDia(env, ahora)

  await env.DB.prepare('DELETE FROM push_citas WHERE inicio < ?').bind(ahora - 2 * 86400_000).run()
}

async function resumenDelDia(env: EnvAvisos, ahora: number) {
  const hoy = fechaCaracas(ahora)
  const { results } = await env.DB.prepare(
    `SELECT DISTINCT s.slug FROM push_suscripciones s
     LEFT JOIN push_resumenes r ON r.slug = s.slug AND r.dia = ?1 WHERE r.slug IS NULL`,
  ).bind(hoy).all<{ slug: string }>()
  const slugs = results.map((r) => r.slug)
  if (!slugs.length) return
  const agenda = await agendaDeHoy(env, slugs, hoy)
  if (!agenda) return // Apps Script no respondió: se reintenta en el próximo repaso
  for (const slug of slugs) {
    await env.DB.prepare('INSERT OR IGNORE INTO push_resumenes (slug, dia) VALUES (?, ?)').bind(slug, hoy).run()
    const citas = agenda[slug] || []
    // La agenda del día manda: lo cancelado o movido en la hoja deja de recordarse.
    await env.DB.prepare('DELETE FROM push_citas WHERE slug = ?1 AND inicio >= ?2 AND inicio < ?3')
      .bind(slug, msDeCita(hoy, '00:00'), msDeCita(hoy, '00:00') + 86400_000).run()
    for (const c of citas) await guardarCita(env.DB, slug, c)
    const n = avisoResumen(slug, citas.filter((c) => msDeCita(c.fecha, c.hora) > ahora))
    if (n) await avisar(env.DB, slug, n)
  }
}

async function agendaDeHoy(env: EnvAvisos, slugs: string[], fecha: string): Promise<Record<string, CitaAviso[]> | null> {
  try {
    const r = await fetch(env.APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ accion: 'bot', token: env.BOT_TOKEN, op: 'agenda', slugs, fecha }),
      redirect: 'follow',
    })
    const json = (await r.json()) as { agenda?: Record<string, CitaAviso[]> }
    return json.agenda ?? null
  } catch (err) {
    console.warn('Agenda del día', err)
    return null
  }
}
