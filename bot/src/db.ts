/** Lectura y escritura en D1. */
import type { Cita, Conversacion, Etiqueta } from './tipos'

type Fila = {
  telefono: string; nombre: string; paso: string; datos: string; modo: string; etiqueta: string
  cita: string | null; ultimo_entrante: number | null; ultimo_mensaje: number; resumen: string; sin_leer: number
}

export function nueva(telefono: string, nombre = ''): Conversacion {
  return { telefono, nombre, paso: 'inicio', datos: {}, modo: 'bot', etiqueta: '', cita: null, ultimoEntrante: null }
}

function desdeFila(f: Fila): Conversacion {
  return {
    telefono: f.telefono,
    nombre: f.nombre,
    paso: f.paso as Conversacion['paso'],
    datos: JSON.parse(f.datos || '{}'),
    modo: f.modo === 'humano' ? 'humano' : 'bot',
    etiqueta: f.etiqueta as Etiqueta,
    cita: f.cita ? (JSON.parse(f.cita) as Cita) : null,
    ultimoEntrante: f.ultimo_entrante,
  }
}

export async function leerConversacion(db: D1Database, telefono: string): Promise<Conversacion | null> {
  const f = await db.prepare('SELECT * FROM conversaciones WHERE telefono = ?').bind(telefono).first<Fila>()
  return f ? desdeFila(f) : null
}

export async function guardarConversacion(db: D1Database, c: Conversacion, extra: { ultimoMensaje: number; resumen?: string; sinLeer?: 'sumar' | 'cero' }) {
  const sinLeer = extra.sinLeer === 'sumar' ? 'sin_leer + 1' : extra.sinLeer === 'cero' ? '0' : 'sin_leer'
  await db.prepare(
    `INSERT INTO conversaciones (telefono, nombre, paso, datos, modo, etiqueta, cita, ultimo_entrante, ultimo_mensaje, resumen, sin_leer)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, COALESCE(?10, ''), ${extra.sinLeer === 'sumar' ? 1 : 0})
     ON CONFLICT (telefono) DO UPDATE SET nombre = ?2, paso = ?3, datos = ?4, modo = ?5, etiqueta = ?6, cita = ?7,
       ultimo_entrante = ?8, ultimo_mensaje = ?9, resumen = COALESCE(?10, resumen), sin_leer = ${sinLeer}`,
  ).bind(
    c.telefono, c.nombre, c.paso, JSON.stringify(c.datos), c.modo, c.etiqueta, c.cita ? JSON.stringify(c.cita) : null,
    c.ultimoEntrante, extra.ultimoMensaje, extra.resumen ?? null,
  ).run()
}

/** Guarda un mensaje. Devuelve false si el wamid ya estaba (Meta reintenta los webhooks). */
export async function guardarMensaje(db: D1Database, m: {
  telefono: string; sentido: 'in' | 'out'; autor: 'cliente' | 'bot' | 'equipo' | 'sistema'; tipo: string; texto: string; mediaId?: string; wamid?: string; creado: number
}): Promise<boolean> {
  const r = await db.prepare(
    'INSERT OR IGNORE INTO mensajes (telefono, sentido, autor, tipo, texto, media_id, wamid, creado) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
  ).bind(m.telefono, m.sentido, m.autor, m.tipo, m.texto, m.mediaId ?? null, m.wamid || null, m.creado).run()
  return (r.meta.changes ?? 0) > 0
}

export const mesDe = (ms: number) => new Date(ms - 4 * 3600_000).toISOString().slice(0, 7)

export async function sumarUso(db: D1Database, ahora: number, campo: 'servicio' | 'plantillas', n = 1) {
  await db.prepare(`INSERT INTO uso (mes, ${campo}) VALUES (?, ?) ON CONFLICT (mes) DO UPDATE SET ${campo} = ${campo} + ?`)
    .bind(mesDe(ahora), n, n).run()
}

export async function usoDelMes(db: D1Database, ahora: number) {
  return (await db.prepare('SELECT servicio, plantillas FROM uso WHERE mes = ?').bind(mesDe(ahora)).first<{ servicio: number; plantillas: number }>()) ||
    { servicio: 0, plantillas: 0 }
}

export async function listarChats(db: D1Database, etiqueta: string) {
  const sql = `SELECT telefono, nombre, modo, etiqueta, ultimo_entrante, ultimo_mensaje, resumen, sin_leer, cita FROM conversaciones
    ${etiqueta ? 'WHERE etiqueta = ?' : ''} ORDER BY ultimo_mensaje DESC LIMIT 200`
  const q = db.prepare(sql)
  return (await (etiqueta ? q.bind(etiqueta) : q).all()).results
}

export async function mensajesDe(db: D1Database, telefono: string) {
  return (await db.prepare(
    'SELECT * FROM (SELECT id, sentido, autor, tipo, texto, media_id, creado FROM mensajes WHERE telefono = ? ORDER BY id DESC LIMIT 300) ORDER BY id',
  ).bind(telefono).all()).results
}

// --- Intentos de entrada a la bandeja: 5 fallos en 15 min bloquean esa IP 15 min ---
const VENTANA = 15 * 60 * 1000
export async function bloqueado(db: D1Database, ip: string, ahora: number): Promise<boolean> {
  const f = await db.prepare('SELECT fallos, desde FROM intentos WHERE ip = ?').bind(ip).first<{ fallos: number; desde: number }>()
  return !!f && f.fallos >= 5 && ahora - f.desde < VENTANA
}
export async function registrarFallo(db: D1Database, ip: string, ahora: number) {
  await db.prepare(
    `INSERT INTO intentos (ip, fallos, desde) VALUES (?1, 1, ?2)
     ON CONFLICT (ip) DO UPDATE SET fallos = CASE WHEN ?2 - desde > ${VENTANA} THEN 1 ELSE fallos + 1 END,
       desde = CASE WHEN ?2 - desde > ${VENTANA} THEN ?2 ELSE desde END`,
  ).bind(ip, ahora).run()
}
export async function limpiarFallos(db: D1Database, ip: string) {
  await db.prepare('DELETE FROM intentos WHERE ip = ?').bind(ip).run()
}
