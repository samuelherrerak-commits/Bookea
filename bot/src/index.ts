/**
 * Bot de WhatsApp de bookeaa (Cloudflare Worker).
 *   GET  /webhook   verificación de Meta
 *   POST /webhook   mensajes entrantes (firmados con el App Secret)
 *   /bandeja        bandeja web para atender los chats
 */
import { serviciosAppsScript, type EnvApps } from './apps'
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
    if (url.pathname === '/favicon.ico') return new Response(null, { status: 204 })
    if (url.pathname === '/') return Response.redirect(`${url.origin}/bandeja`, 302)
    return new Response('No encontrado', { status: 404 })
  },
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

/** Un mensaje entrante: se guarda, pasa por el flujo y se envían las respuestas. */
export async function atender(env: Env, m: Recibido, servicios: Servicios, ahora: number) {
  const nuevo = await guardarMensaje(env.DB, {
    telefono: m.de, sentido: 'in', autor: 'cliente', tipo: m.entrada.tipo, texto: m.resumen, mediaId: m.mediaId, wamid: m.wamid, creado: m.ms || ahora,
  })
  if (!nuevo) return // Meta reintentó un webhook que ya se atendió

  const previa = (await leerConversacion(env.DB, m.de)) || nueva(m.de, m.nombre)
  if (m.nombre) previa.nombre = m.nombre
  await marcarLeido(env, m.wamid)

  const { conv, salidas } = await procesar(previa, m.entrada, ahora, servicios)
  conv.ultimoEntrante = ahora

  let ultimo = m.resumen
  for (const s of salidas) {
    const wamid = await enviar(env, cuerpoMensaje(m.de, s))
    const texto = textoDeSalida(s)
    await guardarMensaje(env.DB, { telefono: m.de, sentido: 'out', autor: 'bot', tipo: s.tipo, texto, wamid, creado: Date.now() })
    await sumarUso(env.DB, ahora, 'servicio')
    ultimo = texto
  }
  await guardarConversacion(env.DB, conv, { ultimoMensaje: ahora, resumen: ultimo.slice(0, 140), sinLeer: conv.modo === 'humano' ? 'sumar' : undefined })
}
