/**
 * OAuth 2.1 del conector de Claude (MCP), para que solo un administrador de bookeaa lo use.
 *
 *   /.well-known/oauth-protected-resource   qué servidor autoriza el /mcp
 *   /.well-known/oauth-authorization-server cómo pedir permiso
 *   POST /register                          registro dinámico (claude.ai se registra solo)
 *   GET  /authorize                         guarda el pedido y manda a bookeaa.com/conectar
 *   GET  /oauth/pedido?id=                  quién pide permiso (lo muestra la página)
 *   POST /oauth/aprobar                     la página manda la sesión de la central y la decisión
 *   POST /token                             código + PKCE → token (y refresh token)
 *                                           refresh token → token nuevo (rota el refresh)
 *
 * El permiso se da entrando con Google en bookeaa.com/conectar, igual que en la central: el
 * Apps Script comprueba que el correo esté en dueno_admins. El token guarda esa sesión.
 * Para que la conexión no se caiga, cada vez que se entrega un token se pide una sesión nueva
 * (op 'renovar', otros 30 días), Claude recibe un refresh token, y el cron renueva las
 * sesiones que están por vencer aunque Claude no se use en días.
 */
import type { EnvApps } from './apps'

export type EnvConector = EnvApps & { DB: D1Database; SITIO_URL?: string }

export interface Acceso {
  sesion: string
  email: string
}

const enc = new TextEncoder()
const MIN = 60_000
const DIA = 24 * 60 * MIN
/** Lo que dura cada token de acceso (o menos, si la sesión vence antes). */
const VIDA_TOKEN = 7 * DIA
/** Lo que dura un refresh token sin usarse (cada uso entrega otro). */
const VIDA_RENOVACION = 180 * DIA

export const sitio = (env: { SITIO_URL?: string }) => (env.SITIO_URL || 'https://www.bookeaa.com').replace(/\/+$/, '')

function b64u(bytes: ArrayBuffer | Uint8Array): string {
  const u = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)
  let s = ''
  for (const b of u) s += String.fromCharCode(b)
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export const azar = (n = 32) => b64u(crypto.getRandomValues(new Uint8Array(n)))
export const sha256 = async (texto: string) => b64u(await crypto.subtle.digest('SHA-256', enc.encode(texto)))

function json(datos: unknown, status = 200, extra: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(datos), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...extra } })
}

/** CORS: los metadatos y /register son públicos; /oauth/* solo desde bookeaa.com. */
function cors(req: Request, env: EnvConector, soloSitio: boolean): Record<string, string> {
  const origen = req.headers.get('origin') || ''
  const permitidos = [sitio(env), 'https://www.bookeaa.com', 'https://bookeaa.com']
  if (soloSitio && !permitidos.includes(origen)) return {}
  return {
    'Access-Control-Allow-Origin': soloSitio ? origen : '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, Mcp-Protocol-Version',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  }
}

export function metadatosRecurso(origen: string) {
  return { resource: `${origen}/mcp`, authorization_servers: [origen], bearer_methods_supported: ['header'], resource_name: 'bookeaa' }
}

export function metadatosServidor(origen: string) {
  return {
    issuer: origen,
    authorization_endpoint: `${origen}/authorize`,
    token_endpoint: `${origen}/token`,
    registration_endpoint: `${origen}/register`,
    response_types_supported: ['code'],
    grant_types_supported: ['authorization_code', 'refresh_token'],
    code_challenge_methods_supported: ['S256'],
    token_endpoint_auth_methods_supported: ['none'],
    scopes_supported: ['bookeaa'],
  }
}

/** Solo https, o http a la propia computadora (para probar). Sin fragmento. */
export function redireccionValida(uri: string): boolean {
  try {
    const u = new URL(uri)
    if (u.hash) return false
    return u.protocol === 'https:' || (u.protocol === 'http:' && (u.hostname === 'localhost' || u.hostname === '127.0.0.1'))
  } catch {
    return false
  }
}

/** Llama al Apps Script maestro (accion central o dueno) con la sesión del administrador. */
export async function appsScript(env: EnvApps, datos: Record<string, unknown>): Promise<any> {
  const r = await fetch(env.APPS_SCRIPT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(datos),
    redirect: 'follow',
  })
  const crudo = await r.text()
  try {
    return JSON.parse(crudo)
  } catch {
    const titulo = crudo.match(/<title>([^<]*)<\/title>/i)?.[1]?.trim()
    throw new Error(`El Apps Script respondió ${r.status} sin JSON${titulo ? ` (${titulo})` : ''}`)
  }
}

/** Vencimiento (ms) de una sesión de la central: "correo|vence|firma". */
export function venceSesion(sesion: string): number {
  return Number(String(sesion).split('|')[1]) || 0
}

function textoError(mensaje: string, status = 400) {
  return new Response(`bookeaa · ${mensaje}`, { status, headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
}

/** Atiende las rutas de OAuth. null si la ruta no es de OAuth. */
export async function manejarOAuth(req: Request, url: URL, env: EnvConector, ahora = Date.now()): Promise<Response | null> {
  const ruta = url.pathname
  const origen = url.origin
  const esSitio = ruta.startsWith('/oauth/')
  const esOAuth = esSitio || ruta.startsWith('/.well-known/oauth-') || ['/register', '/authorize', '/token'].includes(ruta)
  if (!esOAuth) return null
  const h = cors(req, env, esSitio)
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: h })

  if (ruta.startsWith('/.well-known/oauth-protected-resource')) return json(metadatosRecurso(origen), 200, h)
  if (ruta.startsWith('/.well-known/oauth-authorization-server')) return json(metadatosServidor(origen), 200, h)

  if (ruta === '/register' && req.method === 'POST') {
    const b = (await req.json().catch(() => null)) as any
    const uris: string[] = Array.isArray(b?.redirect_uris) ? b.redirect_uris.map(String) : []
    if (!uris.length || uris.length > 5 || !uris.every(redireccionValida)) {
      return json({ error: 'invalid_redirect_uri', error_description: 'redirect_uris: de 1 a 5 direcciones https.' }, 400, h)
    }
    const id = azar(18)
    const nombre = String(b?.client_name || '').slice(0, 80)
    await env.DB.prepare('INSERT INTO oauth_clientes (id, nombre, redirecciones, creado) VALUES (?, ?, ?, ?)').bind(id, nombre, JSON.stringify(uris), ahora).run()
    return json({
      client_id: id, client_name: nombre, redirect_uris: uris, client_id_issued_at: Math.floor(ahora / 1000),
      token_endpoint_auth_method: 'none', grant_types: ['authorization_code', 'refresh_token'], response_types: ['code'],
    }, 201, h)
  }

  if (ruta === '/authorize' && req.method === 'GET') {
    const p = url.searchParams
    const cliente = await env.DB.prepare('SELECT nombre, redirecciones FROM oauth_clientes WHERE id = ?').bind(p.get('client_id') || '').first<{ nombre: string; redirecciones: string }>()
    if (!cliente) return textoError('cliente desconocido. Vuelve a agregar el conector.')
    const redireccion = p.get('redirect_uri') || ''
    if (!(JSON.parse(cliente.redirecciones) as string[]).includes(redireccion)) return textoError('redirect_uri no registrada.')
    const volver = (error: string) => {
      const u = new URL(redireccion)
      u.searchParams.set('error', error)
      if (p.get('state')) u.searchParams.set('state', p.get('state')!)
      return Response.redirect(u.toString(), 302)
    }
    if (p.get('response_type') !== 'code') return volver('unsupported_response_type')
    const reto = p.get('code_challenge') || ''
    if (p.get('code_challenge_method') !== 'S256' || !/^[A-Za-z0-9_-]{43,128}$/.test(reto)) return volver('invalid_request')
    const id = azar(18)
    // Limpieza de pedidos viejos (sin cron aparte).
    await env.DB.prepare('DELETE FROM oauth_pedidos WHERE expira < ?').bind(ahora).run()
    await env.DB.prepare('INSERT INTO oauth_pedidos (id, cliente, redireccion, estado, reto, expira) VALUES (?, ?, ?, ?, ?, ?)')
      .bind(id, p.get('client_id'), redireccion, p.get('state') || '', reto, ahora + 15 * MIN).run()
    const destino = new URL(`${sitio(env)}/conectar`)
    destino.searchParams.set('pedido', id)
    return Response.redirect(destino.toString(), 302)
  }

  if (ruta === '/oauth/pedido' && req.method === 'GET') {
    const pedido = await env.DB.prepare('SELECT p.redireccion, c.nombre FROM oauth_pedidos p JOIN oauth_clientes c ON c.id = p.cliente WHERE p.id = ? AND p.expira > ?')
      .bind(url.searchParams.get('id') || '', ahora).first<{ redireccion: string; nombre: string }>()
    if (!pedido) return json({ error: 'El pedido venció. Vuelve a conectar desde Claude.' }, 404, h)
    return json({ cliente: pedido.nombre || 'Una aplicación', destino: new URL(pedido.redireccion).host }, 200, h)
  }

  if (ruta === '/oauth/aprobar' && req.method === 'POST') {
    if (!h['Access-Control-Allow-Origin']) return json({ error: 'Origen no permitido' }, 403)
    const b = (await req.json().catch(() => null)) as any
    const pedido = await env.DB.prepare('SELECT * FROM oauth_pedidos WHERE id = ? AND expira > ?').bind(String(b?.pedido || ''), ahora)
      .first<{ id: string; cliente: string; redireccion: string; estado: string; reto: string }>()
    if (!pedido) return json({ error: 'El pedido venció. Vuelve a conectar desde Claude.' }, 404, h)
    const vuelta = new URL(pedido.redireccion)
    if (pedido.estado) vuelta.searchParams.set('state', pedido.estado)
    if (b?.aprobar !== true) {
      await env.DB.prepare('DELETE FROM oauth_pedidos WHERE id = ?').bind(pedido.id).run()
      vuelta.searchParams.set('error', 'access_denied')
      return json({ redirect: vuelta.toString() }, 200, h)
    }
    const sesion = String(b?.sesion || '')
    // El Apps Script dice si la sesión es válida y de un administrador (dueno_admins).
    const yo = await appsScript(env, { accion: 'central', op: 'yo', sesion }).catch((e) => ({ error: 'servidor', mensaje: (e as Error).message }))
    if (yo.error || !yo.email) return json({ error: yo.mensaje || 'No eres administrador de bookeaa.' }, 403, h)
    const codigo = azar(32)
    await env.DB.batch([
      env.DB.prepare('DELETE FROM oauth_pedidos WHERE id = ?').bind(pedido.id),
      env.DB.prepare('DELETE FROM oauth_codigos WHERE expira < ?').bind(ahora),
      env.DB.prepare('INSERT INTO oauth_codigos (hash, cliente, redireccion, reto, sesion, email, expira) VALUES (?, ?, ?, ?, ?, ?, ?)')
        .bind(await sha256(codigo), pedido.cliente, pedido.redireccion, pedido.reto, sesion, String(yo.email), ahora + 10 * MIN),
    ])
    vuelta.searchParams.set('code', codigo)
    return json({ redirect: vuelta.toString() }, 200, h)
  }

  if (ruta === '/token' && req.method === 'POST') {
    const f = await req.formData().catch(() => null)
    const campo = (k: string) => String(f?.get(k) ?? '')
    const malo = (descripcion: string, error = 'invalid_grant') => json({ error, error_description: descripcion }, 400, h)
    const tipo = campo('grant_type')

    if (tipo === 'refresh_token') {
      const hash = await sha256(campo('refresh_token'))
      const r = await env.DB.prepare('SELECT * FROM oauth_renovaciones WHERE hash = ?').bind(hash)
        .first<{ cliente: string; sesion: string; email: string; expira: number }>()
      if (!r || r.expira < ahora) return malo('Vuelve a conectar bookeaa.')
      if (campo('client_id') && r.cliente !== campo('client_id')) return malo('El refresh token es de otro cliente.')
      const nueva = await renovarSesion(env, r.sesion, ahora)
      if (nueva === 'error') return json({ error: 'temporarily_unavailable', error_description: 'El Apps Script no respondió. Intenta de nuevo.' }, 503, h)
      // De un solo uso: se rota en cada renovación.
      await env.DB.prepare('DELETE FROM oauth_renovaciones WHERE hash = ?').bind(hash).run()
      if (!nueva) return malo('La sesión de la central venció o ya no eres administrador. Vuelve a conectar bookeaa.')
      return json(await emitir(env, r.cliente, nueva.sesion, nueva.email, ahora), 200, h)
    }

    if (tipo !== 'authorization_code') return malo('Solo authorization_code o refresh_token.', 'unsupported_grant_type')
    const hash = await sha256(campo('code'))
    const c = await env.DB.prepare('SELECT * FROM oauth_codigos WHERE hash = ?').bind(hash)
      .first<{ cliente: string; redireccion: string; reto: string; sesion: string; email: string; expira: number }>()
    // De un solo uso: se borra aunque falle lo demás.
    await env.DB.prepare('DELETE FROM oauth_codigos WHERE hash = ?').bind(hash).run()
    if (!c || c.expira < ahora) return malo('Código inválido o vencido.')
    if (c.cliente !== campo('client_id') || c.redireccion !== campo('redirect_uri')) return malo('El código es de otro cliente.')
    if ((await sha256(campo('code_verifier'))) !== c.reto) return malo('PKCE no coincide.')
    // La sesión que trajo la página puede tener días: se cambia por una de 30 días.
    const nueva = await renovarSesion(env, c.sesion, ahora)
    if (nueva === 'error') return json({ error: 'temporarily_unavailable', error_description: 'El Apps Script no respondió. Intenta de nuevo.' }, 503, h)
    if (!nueva) return malo('La sesión de la central venció o ya no eres administrador.')
    return json(await emitir(env, c.cliente, nueva.sesion, nueva.email, ahora), 200, h)
  }

  return json({ error: 'No encontrado' }, 404, h)
}

/**
 * Sesión de la central renovada (op 'renovar'): la nueva, null si ya no vale (venció o el
 * correo salió de dueno_admins) o 'error' si el Apps Script no respondió. Con un Code.gs
 * anterior a 'renovar', se queda la misma mientras no venza.
 */
export async function renovarSesion(env: EnvApps, sesion: string, ahora = Date.now()): Promise<{ sesion: string; email: string } | null | 'error'> {
  let r: any
  try {
    r = await appsScript(env, { accion: 'central', op: 'renovar', sesion })
  } catch {
    return 'error'
  }
  if (r?.sesion && r?.email) return { sesion: String(r.sesion), email: String(r.email) }
  if (r?.error === 'sesion' || r?.error === 'no_autorizado') return null
  const email = String(sesion).split('|')[0]
  return venceSesion(sesion) > ahora && email ? { sesion, email } : null
}

/** Token de acceso + refresh token nuevos para esa sesión. */
async function emitir(env: EnvConector, cliente: string, sesion: string, email: string, ahora: number) {
  const token = azar(32)
  const renovacion = azar(32)
  const expira = Math.min(venceSesion(sesion) || ahora + VIDA_TOKEN, ahora + VIDA_TOKEN)
  await env.DB.batch([
    env.DB.prepare('DELETE FROM oauth_tokens WHERE expira < ?').bind(ahora),
    env.DB.prepare('DELETE FROM oauth_renovaciones WHERE expira < ?').bind(ahora),
    env.DB.prepare('INSERT INTO oauth_tokens (hash, cliente, sesion, email, creado, expira) VALUES (?, ?, ?, ?, ?, ?)')
      .bind(await sha256(token), cliente, sesion, email, ahora, expira),
    env.DB.prepare('INSERT INTO oauth_renovaciones (hash, cliente, sesion, email, creado, expira) VALUES (?, ?, ?, ?, ?, ?)')
      .bind(await sha256(renovacion), cliente, sesion, email, ahora, ahora + VIDA_RENOVACION),
  ])
  return { access_token: token, token_type: 'Bearer', expires_in: Math.max(60, Math.floor((expira - ahora) / 1000)), refresh_token: renovacion, scope: 'bookeaa' }
}

/**
 * Lo corre el cron: renueva las sesiones de los refresh tokens que vencen en menos de 5 días,
 * así la conexión sigue viva aunque Claude no se use por semanas.
 */
export async function mantenerConexiones(env: EnvConector, ahora = Date.now()) {
  const { results } = await env.DB.prepare('SELECT hash, sesion FROM oauth_renovaciones WHERE expira > ?').bind(ahora).all<{ hash: string; sesion: string }>()
  for (const r of results) {
    if (venceSesion(r.sesion) > ahora + 5 * DIA) continue
    const nueva = await renovarSesion(env, r.sesion, ahora)
    if (nueva === 'error') continue
    if (!nueva) await env.DB.prepare('DELETE FROM oauth_renovaciones WHERE hash = ?').bind(r.hash).run()
    else if (nueva.sesion !== r.sesion) await env.DB.prepare('UPDATE oauth_renovaciones SET sesion = ?, email = ? WHERE hash = ?').bind(nueva.sesion, nueva.email, r.hash).run()
  }
}

/** El acceso de un "Authorization: Bearer …", o null si no hay o venció. */
export async function acceso(req: Request, env: EnvConector, ahora = Date.now()): Promise<Acceso | null> {
  const token = (req.headers.get('authorization') || '').match(/^Bearer\s+(\S+)$/i)?.[1]
  if (!token) return null
  const fila = await env.DB.prepare('SELECT sesion, email FROM oauth_tokens WHERE hash = ? AND expira > ?').bind(await sha256(token), ahora).first<Acceso>()
  return fila ?? null
}

/** Borra el token (la sesión de la central venció o se cambió el secreto). */
export async function revocar(req: Request, env: EnvConector) {
  const token = (req.headers.get('authorization') || '').match(/^Bearer\s+(\S+)$/i)?.[1]
  if (token) await env.DB.prepare('DELETE FROM oauth_tokens WHERE hash = ?').bind(await sha256(token)).run()
}
