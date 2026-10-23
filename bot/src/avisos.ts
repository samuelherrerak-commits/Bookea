/**
 * Avisos de "Mi negocio": notificaciones Web Push al dueño de cada negocio.
 *  - Nueva reserva (y "Pago por verificar" si fue con Pago Móvil): apenas el Apps Script avisa.
 *  - Recordatorio unos 30 minutos antes de cada cita (cron cada 5 minutos).
 *  - Resumen de la mañana a las 7:00 con las citas del día (el Apps Script manda la agenda).
 *
 * bookeaa team: cada teléfono guarda de quién es (persona). El administrador (persona '')
 * recibe todo; cada persona del equipo, solo lo de sus citas y su propio resumen.
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
  /** bookeaa team: id de quien atiende ('' = sin equipo). */
  profesionalId?: string
}

/**
 * A quién va un aviso:
 *  - null: a todos los teléfonos del negocio;
 *  - { persona }: al administrador y a esa persona (una cita suya);
 *  - { persona, exacto: true }: solo a esa persona ('' = solo al administrador).
 */
export type Alcance = { persona: string; exacto?: boolean } | null

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

/** Una cita movida desde Mi negocio: la hora nueva (y la de antes). */
export function avisoReagendada(slug: string, c: CitaAviso & { antes?: { fecha?: string; hora?: string } }): Notificacion {
  const antes = c.antes?.fecha && c.antes?.hora ? `\nAntes: ${diaCorto(c.antes.fecha)} · ${horaLegible(c.antes.hora)}` : ''
  return {
    titulo: '🔁 Cita reagendada',
    cuerpo: `${c.cliente} · ${c.servicios}\nAhora: ${diaCorto(c.fecha)} · ${horaLegible(c.hora)}${antes}`,
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

export async function suscribir(db: D1Database, slug: string, email: string, s: { endpoint?: string; keys?: { p256dh?: string; auth?: string } }, ahora: number, persona = '') {
  if (!s.endpoint || !/^https:\/\//.test(s.endpoint) || !s.keys?.p256dh || !s.keys?.auth) throw new Error('Suscripción inválida')
  await db.prepare(
    `INSERT INTO push_suscripciones (endpoint, slug, email, p256dh, auth, creado, persona) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
     ON CONFLICT (endpoint) DO UPDATE SET slug = ?2, email = ?3, p256dh = ?4, auth = ?5, persona = ?7`,
  ).bind(s.endpoint, slug, email, s.keys.p256dh, s.keys.auth, ahora, persona).run()
}

export async function quitar(db: D1Database, endpoint: string) {
  await db.prepare('DELETE FROM push_suscripciones WHERE endpoint = ?').bind(endpoint).run()
}

async function guardarCita(db: D1Database, slug: string, c: CitaAviso) {
  if (!c.id || !/^\d{4}-\d{2}-\d{2}$/.test(c.fecha) || !/^\d{2}:\d{2}$/.test(c.hora)) return
  await db.prepare(
    `INSERT INTO push_citas (slug, id, inicio, cliente, servicios, persona) VALUES (?1, ?2, ?3, ?4, ?5, ?6)
     ON CONFLICT (slug, id) DO UPDATE SET recordada = CASE WHEN inicio = ?3 THEN recordada ELSE 0 END,
       inicio = ?3, cliente = ?4, servicios = ?5, persona = ?6`,
  ).bind(slug, c.id, msDeCita(c.fecha, c.hora), c.cliente.slice(0, 80), c.servicios.slice(0, 200), c.profesionalId || '').run()
}

/** Manda una notificación a todos los equipos de un negocio y borra los que ya no existen. */
export interface Envio {
  equipos: number
  enviadas: number
  /** Qué respondió el servicio de avisos cuando falló (para el aviso de prueba). */
  fallos: string[]
}

export async function avisar(db: D1Database, slug: string, n: Notificacion, alcance: Alcance = null): Promise<Envio> {
  const consulta = !alcance
    ? db.prepare('SELECT endpoint, p256dh, auth FROM push_suscripciones WHERE slug = ?').bind(slug)
    : alcance.exacto
      ? db.prepare('SELECT endpoint, p256dh, auth FROM push_suscripciones WHERE slug = ? AND persona = ?').bind(slug, alcance.persona)
      : db.prepare("SELECT endpoint, p256dh, auth FROM push_suscripciones WHERE slug = ? AND (persona = '' OR persona = ?)").bind(slug, alcance.persona)
  const { results } = await consulta.all<Suscripcion>()
  const envio: Envio = { equipos: results.length, enviadas: 0, fallos: [] }
  if (!results.length) return envio
  const claves = await clavesVapid(db)
  for (const s of results) {
    const servicio = new URL(s.endpoint).hostname
    try {
      const r = await enviarPush(s, n, claves, CONTACTO)
      if (r.estado === 'ok') envio.enviadas++
      else {
        envio.fallos.push(`${servicio}: ${r.codigo}${r.detalle ? ` ${r.detalle}` : ''}`)
        if (r.estado === 'vencida') await quitar(db, s.endpoint)
      }
    } catch (err) {
      envio.fallos.push(`${servicio}: ${(err as Error).message}`)
      console.warn('Push a', slug, err)
    }
  }
  return envio
}

export const avisoPrueba = (slug: string): Notificacion => ({
  titulo: '🔔 Aviso de prueba',
  cuerpo: 'Si ves esto, los avisos de bookeaa funcionan en este teléfono.',
  tag: 'prueba',
  url: urlNegocio(slug),
})

/** Una reserva nueva que avisa el Apps Script. */
export async function nuevaReserva(db: D1Database, slug: string, c: CitaAviso) {
  await guardarCita(db, slug, c)
  await avisar(db, slug, avisoReserva(slug, c), c.profesionalId ? { persona: c.profesionalId } : null)
}

/** Cita movida: el recordatorio pasa a la hora nueva y avisa a quien la atiende (y al administrador). */
export async function citaReagendada(db: D1Database, slug: string, c: CitaAviso & { antes?: { fecha?: string; hora?: string } }) {
  await guardarCita(db, slug, c)
  await avisar(db, slug, avisoReagendada(slug, c), c.profesionalId ? { persona: c.profesionalId } : null)
}

/** Lo que corre el cron cada 5 minutos. */
export async function repasar(env: EnvAvisos, ahora: number) {
  // Recordatorios: citas que empiezan en los próximos 30 minutos y no se avisaron.
  const { results: proximas } = await env.DB.prepare(
    'SELECT slug, id, cliente, servicios, inicio, persona FROM push_citas WHERE recordada = 0 AND inicio > ?1 AND inicio <= ?2',
  ).bind(ahora, ahora + MINUTOS_RECORDATORIO * 60000 + 60000).all<{ slug: string; id: string; cliente: string; servicios: string; inicio: number; persona: string }>()
  for (const c of proximas) {
    await env.DB.prepare('UPDATE push_citas SET recordada = 1 WHERE slug = ? AND id = ?').bind(c.slug, c.id).run()
    await avisar(env.DB, c.slug, avisoRecordatorio(c.slug, c, ahora), c.persona ? { persona: c.persona } : null)
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
    const pendientes = citas.filter((c) => msDeCita(c.fecha, c.hora) > ahora)
    // El administrador ve el día completo; cada persona del equipo, el suyo.
    const n = avisoResumen(slug, pendientes)
    if (n) await avisar(env.DB, slug, n, { persona: '', exacto: true })
    const { results: personas } = await env.DB.prepare("SELECT DISTINCT persona FROM push_suscripciones WHERE slug = ? AND persona != ''").bind(slug).all<{ persona: string }>()
    for (const { persona } of personas) {
      const suyo = avisoResumen(slug, pendientes.filter((c) => c.profesionalId === persona))
      if (suyo) await avisar(env.DB, slug, suyo, { persona, exacto: true })
    }
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
