/**
 * Bot de WhatsApp de bookeaa (Cloudflare Worker).
 *   GET  /webhook   verificación de Meta
 *   POST /webhook   mensajes entrantes (firmados con el App Secret)
 *   /bandeja        bandeja web para atender los chats
 *   /push/*         avisos de "Mi negocio" (Web Push): los llama el Apps Script
 *   cron            recordatorios y resumen de la mañana (cada 5 minutos)
 */
import { serviciosAppsScript, type EnvApps } from './apps'
import { clavesVapid, nuevaReserva, quitar, repasar, suscribir } from './avisos'
import { manejarBandeja } from './bandeja'
import { guardarConversacion, guardarMensaje, leerConversacion, nueva, sumarUso } from './db'
import { firmaMetaValida } from './firma'
import { procesar } from './flujo'
import { cuerpoMensaje, enviar, marcarLeido, mensajesDelWebhook, textoDeSalida, type Recibido } from './whatsapp'
import type { Servicios } from './tipos'

export type Env = EnvApps & {
  DB: D1Database
  APP_SECRET: string
  VERIFY_TOKEN: string
  BANDEJA_CLAVE: string
}

export default {
  async fetch(req: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(req.url)
    if (url.pathname === '/webhook') {
      if (req.method === 'GET') return verificar(url, env)
      if (req.method === 'POST') return recibir(req, env, ctx)
      return new Response('Método no permitido', { status: 405 })
    }
    if (url.pathname === '/bandeja' || url.pathname.startsWith('/bandeja/')) return manejarBandeja(req, env)
    if (url.pathname.startsWith('/push/')) return manejarPush(req, url.pathname, env)
    if (url.pathname === '/favicon.ico') return new Response(null, { status: 204 })
    if (url.pathname === '/') return Response.redirect(`${url.origin}/bandeja`, 302)
    return new Response('No encontrado', { status: 404 })
  },

  async scheduled(_evento: ScheduledController, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(repasar(env, Date.now()))
  },
}

function json(datos: unknown, status = 200): Response {
  return new Response(JSON.stringify(datos), { status, headers: { 'Content-Type': 'application/json' } })
}

/** Compara sin filtrar por tiempo cuántos caracteres coinciden. */
function iguales(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let d = 0
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return d === 0
}

/**
 * Avisos de "Mi negocio". La clave pública es pública; lo demás solo lo llama el
 * Apps Script con el token del bot (él ya comprobó la sesión del dueño).
 */
export async function manejarPush(req: Request, ruta: string, env: Env): Promise<Response> {
  if (ruta === '/push/clave' && req.method === 'GET') return json({ clave: (await clavesVapid(env.DB)).publica })
  if (req.method !== 'POST') return json({ error: 'Método no permitido' }, 405)
  const token = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '')
  if (!env.BOT_TOKEN || !iguales(token, env.BOT_TOKEN)) return json({ error: 'No autorizado' }, 401)
  const cuerpo = (await req.json().catch(() => null)) as any
  const slug = String(cuerpo?.slug || '')
  if (!/^[a-z0-9-]{1,40}$/.test(slug)) return json({ error: 'Negocio inválido' }, 400)
  try {
    if (ruta === '/push/suscribir') await suscribir(env.DB, slug, String(cuerpo.email || ''), cuerpo.suscripcion || {}, Date.now())
    else if (ruta === '/push/quitar') await quitar(env.DB, String(cuerpo.suscripcion?.endpoint || ''))
    else if (ruta === '/push/evento' && cuerpo.tipo === 'reserva') await nuevaReserva(env.DB, slug, cuerpo.cita || {})
    else return json({ error: 'No encontrado' }, 404)
  } catch (err) {
    return json({ error: String((err as Error).message) }, 400)
  }
  return json({ ok: true })
}

function verificar(url: URL, env: Env): Response {
  const p = url.searchParams
  if (p.get('hub.mode') === 'subscribe' && env.VERIFY_TOKEN && p.get('hub.verify_token') === env.VERIFY_TOKEN) {
    return new Response(p.get('hub.challenge') || '', { status: 200 })
  }
  return new Response('Prohibido', { status: 403 })
}

async function recibir(req: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  const cuerpo = await req.arrayBuffer()
  if (!(await firmaMetaValida(env.APP_SECRET, cuerpo, req.headers.get('x-hub-signature-256')))) {
    return new Response('Firma inválida', { status: 401 })
  }
  let json: unknown
  try {
    json = JSON.parse(new TextDecoder().decode(cuerpo))
  } catch {
    return new Response('ok')
  }
  // Meta espera un 200 rápido; lo demás sigue después de responder.
  ctx.waitUntil(atenderTodos(env, mensajesDelWebhook(json), serviciosAppsScript(env)))
  return new Response('ok')
}

export async function atenderTodos(env: Env, recibidos: Recibido[], servicios: Servicios, ahora = () => Date.now()) {
  for (const m of recibidos) {
    try {
      await atender(env, m, servicios, ahora())
    } catch (err) {
      console.error('Error atendiendo', m.wamid, err)
    }
  }
}

/** Envuelve los servicios para anotar por qué falló una llamada (excepción o resultado sin éxito). */
export function conNotas(s: Servicios, notas: string[]): Servicios {
  const envuelto = {} as Record<string, unknown>
  for (const [nombre, fn] of Object.entries(s) as [string, (...a: unknown[]) => Promise<any>][]) {
    envuelto[nombre] = async (...args: unknown[]) => {
      try {
        const r = await fn.apply(s, args)
        if (r && r.ok === false && r.motivo === 'error') notas.push(`No se pudo ${nombre}: ${r.mensaje || 'Apps Script no dio el motivo (¿publicaste la versión nueva de Code.gs?)'}`)
        return r
      } catch (err) {
        notas.push(`No se pudo ${nombre}: ${(err as Error).message}`)
        throw err
      }
    }
  }
  return envuelto as unknown as Servicios
}

/** Un mensaje entrante: se guarda, pasa por el flujo y se envían las respuestas. */
export async function atender(env: Env, m: Recibido, servicios: Servicios, ahora: number) {
  const nuevo = await guardarMensaje(env.DB, {
    telefono: m.de, sentido: 'in', autor: 'cliente', tipo: m.entrada.tipo, texto: m.resumen, mediaId: m.mediaId, wamid: m.wamid, creado: m.ms || ahora,
  })
  if (!nuevo) return // Meta reintentó un webhook que ya se atendió

  const previa = (await leerConversacion(env.DB, m.de)) || nueva(m.de, m.nombre)
  if (m.nombre) previa.nombre = m.nombre
  await marcarLeido(env, m.wamid)

  const notas: string[] = []
  const { conv, salidas } = await procesar(previa, m.entrada, ahora, conNotas(servicios, notas))
  conv.ultimoEntrante = ahora

  let ultimo = m.resumen
  for (const s of salidas) {
    const wamid = await enviar(env, cuerpoMensaje(m.de, s))
    const texto = textoDeSalida(s)
    await guardarMensaje(env.DB, { telefono: m.de, sentido: 'out', autor: 'bot', tipo: s.tipo, texto, wamid, creado: Date.now() })
    await sumarUso(env.DB, ahora, 'servicio')
    ultimo = texto
  }
  // Lo que falló en Apps Script queda como nota interna en el chat: solo se ve en la bandeja.
  for (const n of notas) await guardarMensaje(env.DB, { telefono: m.de, sentido: 'out', autor: 'sistema', tipo: 'nota', texto: n, creado: Date.now() })
  await guardarConversacion(env.DB, conv, { ultimoMensaje: ahora, resumen: ultimo.slice(0, 140), sinLeer: conv.modo === 'humano' ? 'sumar' : undefined })
}
