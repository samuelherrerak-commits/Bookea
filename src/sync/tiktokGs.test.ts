import { describe, expect, it } from 'vitest'
import { constanteGs, funcionesGs } from './appsScript'

const gs = Object.values(import.meta.glob('../../apps-script/Code.gs', { query: '?raw', import: 'default', eager: true }) as Record<string, string>)[0] ?? ''
type Fn = (...a: any[]) => any

const AHORA = Date.UTC(2026, 9, 15, 17)
const respuesta = (codigo: number, cuerpo: unknown, bytes = [1, 2, 3]) => ({
  getResponseCode: () => codigo,
  getContentText: () => JSON.stringify(cuerpo),
  getBlob: () => ({ getBytes: () => bytes }),
})

function entorno(respuestas: ((url: string, o: any) => any)[], props: Record<string, string> = {}) {
  const guardado: Record<string, string> = { tiktok_client_key: 'KEY12345', tiktok_client_secret: 'SECRET12345', ...props }
  const llamadas: { url: string; o: any }[] = []
  const cache: Record<string, string> = {}
  let i = 0
  const publicaciones = [
    { id: 'V1', tipo: 'video-mg', media: 'https://res.cloudinary.com/x/v.mp4', estado: 'aprobado' },
    { id: 'C1', tipo: 'carrusel', media: 'https://res.cloudinary.com/x/1.jpg', estado: 'aprobado' },
    { id: 'V2', tipo: 'video-voz', media: '', estado: 'aprobado' },
  ]
  const guardadas: any[] = []
  const f = funcionesGs<Record<string, Fn>>(gs, [
    'tiktokProp_', 'tiktokEstado_', 'tiktokUrl_', 'tiktokPost_', 'tiktokGuardarTokens_', 'tiktokFormToken_', 'tiktokConectar_', 'tiktokDesconectar_', 'tiktokToken_', 'tiktokEnviar_',
    'enlacesMedia_', 'limpiarTexto_',
  ], {
    TIKTOK_REDIRECT: 'https://bookeaa.com/central', TIKTOK_SCOPES: constanteGs(gs, 'TIKTOK_SCOPES'), TIKTOK_API: constanteGs(gs, 'TIKTOK_API'), TIKTOK_MAX_BYTES: constanteGs(gs, 'TIKTOK_MAX_BYTES'),
    ZONA: 'America/Caracas',
    Utilities: { getUuid: () => 'ab-cd-ef-12', formatDate: () => '2026-10-15 13:00' },
    PropertiesService: { getScriptProperties: () => ({ getProperty: (k: string) => guardado[k] ?? null, setProperty: (k: string, v: string) => { guardado[k] = v }, deleteProperty: (k: string) => { delete guardado[k] } }) },
    CacheService: { getScriptCache: () => ({ put: (k: string, v: string) => { cache[k] = v }, get: (k: string) => cache[k] ?? null, remove: (k: string) => { delete cache[k] } }) },
    UrlFetchApp: { fetch: (url: string, o: any) => { llamadas.push({ url, o }); return respuestas[i++](url, o) } },
    marketingCentral_: () => ({ publicaciones }),
    marketingGuardar_: (c: any) => { guardadas.push(c); return { ok: true } },
  })
  return { f, guardado, llamadas, cache, guardadas }
}

describe('Code.gs · TikTok (borradores)', () => {
  it('sin claves no hay URL de conexión; con claves arma la autorización con state atado al correo', () => {
    const sin = entorno([], { tiktok_client_key: '', tiktok_client_secret: '' })
    expect(sin.f.tiktokUrl_('yo@gmail.com').error).toBe('sin_claves')
    const { f, cache } = entorno([])
    const { url } = f.tiktokUrl_('yo@gmail.com')
    expect(url).toContain('https://www.tiktok.com/v2/auth/authorize/?client_key=KEY12345')
    expect(url).toContain('scope=user.info.basic%2Cvideo.upload')
    expect(url).toContain('redirect_uri=https%3A%2F%2Fbookeaa.com%2Fcentral')
    expect(url).toContain('state=abcdef12')
    expect(cache.tt_abcdef12).toBe('yo@gmail.com')
    expect(url).not.toContain('SECRET')
  })

  it('estado: da una pista de la clave en uso, sin mostrarla entera, y detecta el sandbox', () => {
    const prod = entorno([], { tiktok_client_key: 'awa9sk36vafewy4l' }).f.tiktokEstado_()
    expect(prod).toMatchObject({ configurado: true, conectado: false, pista: 'awa9…wy4l', sandbox: false, redirect: 'https://bookeaa.com/central' })
    expect(JSON.stringify(prod)).not.toContain('sk36vafe')
    expect(entorno([], { tiktok_client_key: 'sbawabcdefgh1234' }).f.tiktokEstado_().sandbox).toBe(true)
    expect(entorno([], { tiktok_client_key: '', tiktok_client_secret: '' }).f.tiktokEstado_()).toMatchObject({ configurado: false, pista: '' })
  })

  it('conectar: exige el state del mismo correo, canjea el código y guarda tokens y nombre', () => {
    const { f, guardado, llamadas, cache } = entorno([
      () => respuesta(200, { access_token: 'AT', expires_in: 86400, refresh_token: 'RT', refresh_expires_in: 31536000, open_id: 'OID', scope: 'user.info.basic,video.upload' }),
      () => respuesta(200, { data: { user: { display_name: 'Samuel' } } }),
    ])
    expect(f.tiktokConectar_({ code: 'C', state: 'nope' }, 'yo@gmail.com', AHORA).error).toBe('estado_invalido')
    cache.tt_ok = 'yo@gmail.com'
    expect(f.tiktokConectar_({ code: 'C', state: 'ok' }, 'otro@gmail.com', AHORA).error).toBe('estado_invalido')
    expect(f.tiktokConectar_({ code: 'C', state: 'ok' }, 'yo@gmail.com', AHORA)).toEqual({ ok: true, usuario: 'Samuel' })
    expect(llamadas[0].url).toBe('https://open.tiktokapis.com/v2/oauth/token/')
    expect(llamadas[0].o.payload).toMatchObject({ grant_type: 'authorization_code', code: 'C', redirect_uri: 'https://bookeaa.com/central', client_key: 'KEY12345' })
    expect(llamadas[1].o.headers.Authorization).toBe('Bearer AT')
    expect(guardado).toMatchObject({ tiktok_access: 'AT', tiktok_refresh: 'RT', tiktok_usuario: 'Samuel' })
    expect(cache.tt_ok).toBeUndefined() // el state sirve una sola vez
    expect(f.tiktokEstado_()).toMatchObject({ configurado: true, conectado: true, usuario: 'Samuel' })
  })

  it('conectar: sin el permiso video.upload no se conecta', () => {
    const { f, cache, guardado } = entorno([() => respuesta(200, { access_token: 'AT', refresh_token: 'RT', scope: 'user.info.basic' })])
    cache.tt_ok = 'yo@gmail.com'
    expect(f.tiktokConectar_({ code: 'C', state: 'ok' }, 'yo@gmail.com', AHORA).error).toBe('tiktok')
    expect(guardado.tiktok_refresh).toBeUndefined()
  })

  it('token: usa el vigente y renueva con el refresh cuando falta poco', () => {
    const vigente = entorno([], { tiktok_access: 'AT', tiktok_access_exp: String(AHORA + 3600_000), tiktok_refresh: 'RT', tiktok_refresh_exp: String(AHORA + 1e9) })
    expect(vigente.f.tiktokToken_(AHORA)).toBe('AT')
    expect(vigente.llamadas).toHaveLength(0)
    const vence = entorno([() => respuesta(200, { access_token: 'AT2', expires_in: 86400, refresh_token: 'RT2', refresh_expires_in: 31536000 })], { tiktok_access: 'AT', tiktok_access_exp: String(AHORA + 60_000), tiktok_refresh: 'RT', tiktok_refresh_exp: String(AHORA + 1e9) })
    expect(vence.f.tiktokToken_(AHORA)).toBe('AT2')
    expect(vence.llamadas[0].o.payload).toMatchObject({ grant_type: 'refresh_token', refresh_token: 'RT' })
    expect(vence.guardado.tiktok_refresh).toBe('RT2')
    const caducado = entorno([], { tiktok_refresh: 'RT', tiktok_refresh_exp: String(AHORA - 1) })
    expect(caducado.f.tiktokToken_(AHORA)).toBeNull()
  })

  it('enviar: pide el envío, sube el archivo en un bloque con Content-Range y deja una nota', () => {
    const conectado = { tiktok_access: 'AT', tiktok_access_exp: String(AHORA + 3600_000), tiktok_refresh: 'RT', tiktok_refresh_exp: String(AHORA + 1e9), tiktok_usuario: 'Samuel' }
    const { f, llamadas, guardadas } = entorno([
      () => respuesta(200, {}, [10, 20, 30, 40, 50]), // descarga del video
      () => respuesta(200, { data: { publish_id: 'P1', upload_url: 'https://upload.tiktok/x?y=1' }, error: { code: 'ok' } }),
      () => respuesta(201, {}),
    ], conectado)
    expect(f.tiktokEnviar_({ id: 'V1' }, AHORA)).toEqual({ ok: true, publishId: 'P1', usuario: 'Samuel' })
    expect(llamadas[1].url).toBe('https://open.tiktokapis.com/v2/post/publish/inbox/video/init/')
    expect(llamadas[1].o.headers.Authorization).toBe('Bearer AT')
    expect(JSON.parse(llamadas[1].o.payload)).toEqual({ source_info: { source: 'FILE_UPLOAD', video_size: 5, chunk_size: 5, total_chunk_count: 1 } })
    expect(llamadas[2].url).toBe('https://upload.tiktok/x?y=1')
    expect(llamadas[2].o).toMatchObject({ method: 'put', contentType: 'video/mp4' })
    expect(llamadas[2].o.headers['Content-Range']).toBe('bytes 0-4/5')
    expect(guardadas[0].notas).toContain('En borradores de TikTok')
  })

  it('enviar: rechaza carruseles, videos sin link, sin conexión y errores de TikTok', () => {
    const conectado = { tiktok_access: 'AT', tiktok_access_exp: String(AHORA + 3600_000), tiktok_refresh: 'RT', tiktok_refresh_exp: String(AHORA + 1e9) }
    expect(entorno([], conectado).f.tiktokEnviar_({ id: 'C1' }, AHORA).error).toBe('datos_invalidos')
    expect(entorno([], conectado).f.tiktokEnviar_({ id: 'V2' }, AHORA).error).toBe('datos_invalidos')
    expect(entorno([], conectado).f.tiktokEnviar_({ id: 'X' }, AHORA).error).toBe('no_existe')
    expect(entorno([]).f.tiktokEnviar_({ id: 'V1' }, AHORA).error).toBe('sin_conexion')
    const malo = entorno([() => respuesta(200, {}), () => respuesta(403, { error: { code: 'spam_risk_too_many_pending_share', message: 'Too many pending' } })], conectado)
    const r = malo.f.tiktokEnviar_({ id: 'V1' }, AHORA)
    expect(r.error).toBe('tiktok')
    expect(r.mensaje).toContain('Too many pending')
    expect(malo.llamadas).toHaveLength(2) // no intenta subir el archivo
  })
})
