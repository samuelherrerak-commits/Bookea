/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import worker from './index'
import { HERRAMIENTAS, slugDe } from './mcp'
import { redireccionValida, sha256 } from './oauth'

/** D1 sobre SQLite en memoria, con las migraciones reales. */
function d1() {
  const db = new DatabaseSync(':memory:')
  for (const f of ['0001_inicial.sql', '0002_avisos.sql', '0003_conector.sql']) db.exec(readFileSync(new URL(`../migrations/${f}`, import.meta.url), 'utf8'))
  const preparar = (sql: string, args: unknown[] = []) => ({
    bind: (...a: unknown[]) => preparar(sql, a),
    run: async () => (db.prepare(sql).run(...(args as any[])), { success: true }),
    first: async () => db.prepare(sql).get(...(args as any[])) ?? null,
    all: async () => ({ results: db.prepare(sql).all(...(args as any[])) }),
  })
  return { prepare: (sql: string) => preparar(sql), batch: async (l: any[]) => Promise.all(l.map((p) => p.run())), crudo: db }
}

const SITIO = 'https://www.bookeaa.com'
const W = 'https://bookeaa-bot.ejemplo.workers.dev'
const VUELTA = 'https://claude.ai/api/mcp/auth_callback'
const SESION = `admin@gmail.com|${Date.now() + 20 * 86400_000}|firma`
let env: any
let apps: ReturnType<typeof vi.fn>

const pedir = (ruta: string, init: RequestInit = {}) => worker.fetch(new Request(W + ruta, init), env, {} as any)
const pkce = async () => {
  const verificador = 'v'.repeat(50)
  return { verificador, reto: await sha256(verificador) }
}

beforeEach(() => {
  env = { DB: d1(), APPS_SCRIPT_URL: 'https://script.google.com/macros/s/x/exec', BOT_TOKEN: 't' }
  apps = vi.fn(async (_url: string, init: RequestInit) => {
    const d = JSON.parse(String(init.body))
    if (d.sesion !== SESION) return Response.json({ error: 'sesion', mensaje: 'Tu sesión venció.' })
    if (d.op === 'yo') return Response.json({ email: 'admin@gmail.com', conector: W + '/bandeja' })
    if (d.op === 'resumen') return Response.json({ hoy: '2026-10-22', precio: 10, totales: { activos: 1 }, negocios: [{ slug: 'barberia-norte', nombre: 'Barbería Norte', estado: 'activo', vence: '2026-11-05', dias: 14, email: 'a@gmail.com', telefono: '', creado: '2026-09-05', ultimoPago: '2026-10-05', notas: '' }, { slug: 'spa-sol', nombre: 'Spa Sol', estado: 'prueba' }], prospectos: [] })
    if (d.op === 'crear') return Response.json({ ok: true, slug: d.slug, hoja: 'https://docs.google.com/x' })
    if (d.op === 'guardar') return Response.json({ ok: false, errores: ['Deja al menos una sede activa.'] })
    return Response.json({ ok: true, eco: d })
  })
  vi.stubGlobal('fetch', apps)
})
afterEach(() => vi.unstubAllGlobals())

/** Registro → authorize → aprobar → token, como lo hace claude.ai. */
async function conectar() {
  const reg = await (await pedir('/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ client_name: 'Claude', redirect_uris: [VUELTA] }) })).json() as any
  const { verificador, reto } = await pkce()
  const auth = await pedir(`/authorize?response_type=code&client_id=${reg.client_id}&redirect_uri=${encodeURIComponent(VUELTA)}&state=abc&code_challenge=${reto}&code_challenge_method=S256&resource=${encodeURIComponent(W + '/mcp')}`)
  expect(auth.status).toBe(302)
  const destino = new URL(auth.headers.get('location')!)
  expect(destino.origin + destino.pathname).toBe(`${SITIO}/conectar`)
  const pedido = destino.searchParams.get('pedido')!
  const info = await (await pedir(`/oauth/pedido?id=${pedido}`, { headers: { Origin: SITIO } })).json() as any
  expect(info).toEqual({ cliente: 'Claude', destino: 'claude.ai' })
  const aprob = await (await pedir('/oauth/aprobar', { method: 'POST', headers: { Origin: SITIO, 'Content-Type': 'application/json' }, body: JSON.stringify({ pedido, sesion: SESION, aprobar: true }) })).json() as any
  const vuelta = new URL(aprob.redirect)
  expect(vuelta.origin + vuelta.pathname).toBe(VUELTA)
  expect(vuelta.searchParams.get('state')).toBe('abc')
  const code = vuelta.searchParams.get('code')!
  const form = (v: string) => new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri: VUELTA, client_id: reg.client_id, code_verifier: v })
  const tok = await pedir('/token', { method: 'POST', body: form(verificador) })
  expect(tok.status).toBe(200)
  const t = await tok.json() as any
  // El código es de un solo uso.
  expect((await pedir('/token', { method: 'POST', body: form(verificador) })).status).toBe(400)
  return { token: t.access_token as string, t, reg, verificador, reto }
}

const rpc = (token: string, cuerpo: unknown) => pedir('/mcp', { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(cuerpo) })

describe('conector de Claude · OAuth', () => {
  it('publica los metadatos y pide autorización en /mcp', async () => {
    const recurso = await (await pedir('/.well-known/oauth-protected-resource/mcp')).json() as any
    expect(recurso).toMatchObject({ resource: `${W}/mcp`, authorization_servers: [W] })
    const servidor = await (await pedir('/.well-known/oauth-authorization-server')).json() as any
    expect(servidor).toMatchObject({ authorization_endpoint: `${W}/authorize`, token_endpoint: `${W}/token`, registration_endpoint: `${W}/register`, code_challenge_methods_supported: ['S256'] })
    const r = await pedir('/mcp', { method: 'POST', body: '{}' })
    expect(r.status).toBe(401)
    expect(r.headers.get('www-authenticate')).toContain(`resource_metadata="${W}/.well-known/oauth-protected-resource"`)
  })

  it('flujo completo: el token vale hasta que vence la sesión de la central y no se guarda en claro', async () => {
    const { token, t } = await conectar()
    expect(t.token_type).toBe('Bearer')
    expect(t.expires_in).toBeGreaterThan(19 * 86400)
    expect(t.expires_in).toBeLessThanOrEqual(20 * 86400)
    const filas = env.DB.crudo.prepare('SELECT hash, sesion FROM oauth_tokens').all() as any[]
    expect(filas).toHaveLength(1)
    expect(filas[0].hash).not.toBe(token)
  })

  it('rechaza PKCE equivocado, redirect no registrada, otro origen y a quien no es administrador', async () => {
    const reg = await (await pedir('/register', { method: 'POST', body: JSON.stringify({ redirect_uris: [VUELTA] }) })).json() as any
    const { reto } = await pkce()
    expect((await pedir(`/authorize?response_type=code&client_id=${reg.client_id}&redirect_uri=${encodeURIComponent('https://malo.com/cb')}&code_challenge=${reto}&code_challenge_method=S256`)).status).toBe(400)
    const sinPkce = await pedir(`/authorize?response_type=code&client_id=${reg.client_id}&redirect_uri=${encodeURIComponent(VUELTA)}&state=s`)
    expect(new URL(sinPkce.headers.get('location')!).searchParams.get('error')).toBe('invalid_request')
    const auth = await pedir(`/authorize?response_type=code&client_id=${reg.client_id}&redirect_uri=${encodeURIComponent(VUELTA)}&code_challenge=${reto}&code_challenge_method=S256`)
    const pedido = new URL(auth.headers.get('location')!).searchParams.get('pedido')!
    const aprobar = (origen: string, sesion: string) => pedir('/oauth/aprobar', { method: 'POST', headers: { Origin: origen }, body: JSON.stringify({ pedido, sesion, aprobar: true }) })
    expect((await aprobar('https://malo.com', SESION)).status).toBe(403)
    expect((await aprobar(SITIO, 'otra|1|x')).status).toBe(403)
    const code = new URL(((await (await aprobar(SITIO, SESION)).json()) as any).redirect).searchParams.get('code')!
    const r = await pedir('/token', { method: 'POST', body: new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri: VUELTA, client_id: reg.client_id, code_verifier: 'x'.repeat(50) }) })
    expect(r.status).toBe(400)
    expect(((await r.json()) as any).error).toBe('invalid_grant')
  })

  it('cancelar vuelve a Claude con access_denied', async () => {
    const reg = await (await pedir('/register', { method: 'POST', body: JSON.stringify({ redirect_uris: [VUELTA] }) })).json() as any
    const { reto } = await pkce()
    const auth = await pedir(`/authorize?response_type=code&client_id=${reg.client_id}&redirect_uri=${encodeURIComponent(VUELTA)}&state=z&code_challenge=${reto}&code_challenge_method=S256`)
    const pedido = new URL(auth.headers.get('location')!).searchParams.get('pedido')!
    const r = await (await pedir('/oauth/aprobar', { method: 'POST', headers: { Origin: SITIO }, body: JSON.stringify({ pedido, aprobar: false }) })).json() as any
    const u = new URL(r.redirect)
    expect(u.searchParams.get('error')).toBe('access_denied')
    expect(u.searchParams.get('state')).toBe('z')
  })

  it('solo acepta redirecciones https o de la propia computadora', () => {
    expect(redireccionValida(VUELTA)).toBe(true)
    expect(redireccionValida('http://localhost:6274/oauth/callback')).toBe(true)
    expect(redireccionValida('http://claude.ai/cb')).toBe(false)
    expect(redireccionValida('javascript:alert(1)')).toBe(false)
  })
})

describe('conector de Claude · MCP', () => {
  it('initialize, tools/list y notificaciones', async () => {
    const { token } = await conectar()
    const ini = await (await rpc(token, { jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'test', version: '1' } } })).json() as any
    expect(ini.result.protocolVersion).toBe('2025-06-18')
    expect(ini.result.serverInfo.name).toBe('bookeaa')
    expect((await rpc(token, { jsonrpc: '2.0', method: 'notifications/initialized' })).status).toBe(202)
    const lista = await (await rpc(token, { jsonrpc: '2.0', id: 2, method: 'tools/list' })).json() as any
    expect(lista.result.tools.map((t: any) => t.name)).toEqual(HERRAMIENTAS.map((h) => h.name))
    for (const t of lista.result.tools) expect(t.inputSchema.type).toBe('object')
  })

  it('las herramientas llaman al Apps Script con la sesión del administrador', async () => {
    const { token } = await conectar()
    const llamar = async (name: string, args: unknown) => ((await (await rpc(token, { jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name, arguments: args } })).json()) as any).result
    const lista = await llamar('listar_negocios', { estado: 'prueba' })
    expect(lista.structuredContent.negocios.map((n: any) => n.slug)).toEqual(['spa-sol'])
    const crear = await llamar('crear_negocio', { nombre: 'Veterinaria Patitas', email: 'yo@gmail.com' })
    expect(crear.isError).toBeUndefined()
    const enviado = JSON.parse(String(apps.mock.calls.at(-1)![1].body))
    expect(enviado).toMatchObject({ accion: 'central', op: 'crear', slug: 'veterinaria-patitas', diasPrueba: 30, sesion: SESION })
    await llamar('suspender_negocio', { slug: 'spa-sol', suspender: true })
    expect(JSON.parse(String(apps.mock.calls.at(-1)![1].body))).toMatchObject({ op: 'activo', slug: 'spa-sol', activo: false })
    await llamar('ver_citas', { slug: 'spa-sol' })
    expect(JSON.parse(String(apps.mock.calls.at(-1)![1].body))).toMatchObject({ accion: 'dueno', op: 'citas', dias: 14 })
    const mal = await llamar('guardar_configuracion', { slug: 'spa-sol', seccion: 'lugar', datos: { sedes: [] } })
    expect(mal.isError).toBe(true)
    expect(mal.content[0].text).toContain('Deja al menos una sede activa.')
  })

  it('si la sesión de la central venció, borra el token y pide volver a conectar', async () => {
    const { token } = await conectar()
    apps.mockImplementationOnce(async () => Response.json({ error: 'sesion', mensaje: 'Tu sesión venció.' }))
    const r = await rpc(token, { jsonrpc: '2.0', id: 9, method: 'tools/call', params: { name: 'ver_cobros', arguments: {} } })
    expect(r.status).toBe(401)
    expect((await rpc(token, { jsonrpc: '2.0', id: 10, method: 'ping' })).status).toBe(401)
  })

  it('el link sale del nombre como en la central', () => {
    expect(slugDe('Estudio Luz Peluquería')).toBe('estudio-luz-peluqueria')
    expect(slugDe('  Consultorio Odontológico Díaz ')).toBe('consultorio-odontologico-diaz')
  })
})
