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

function entorno(respuestas: ((url: string, o: any) => any)[], props: Record<string, string> = {}, extra?: any[]) {
  const guardado: Record<string, string> = { tiktok_client_key: 'KEY12345', tiktok_client_secret: 'SECRET12345', ...props }
  const llamadas: { url: string; o: any }[] = []
  const cache: Record<string, string> = {}
  let i = 0
  const publicaciones: any[] = extra ?? [
    { id: 'V1', tipo: 'video-mg', media: 'https://res.cloudinary.com/x/v.mp4', estado: 'aprobado', titulo: 'V1', caption: '', hashtags: '', notas: '' },
    { id: 'C1', tipo: 'carrusel', media: 'https://res.cloudinary.com/x/v1/carrusel-16-01.jpg https://res.cloudinary.com/x/v1/carrusel-16-02.jpg', estado: 'aprobado', titulo: 'La libreta', caption: 'Hola', hashtags: '#bookeaa', notas: '' },
    { id: 'V2', tipo: 'video-voz', media: '', estado: 'aprobado', titulo: 'V2', caption: '', hashtags: '', notas: '' },
  ]
  const guardadas: any[] = []
  const f = funcionesGs<Record<string, Fn>>(gs, [
    'tiktokProp_', 'tiktokEstado_', 'tiktokUrl_', 'tiktokPost_', 'tiktokGuardarTokens_', 'tiktokFormToken_', 'tiktokConectar_', 'tiktokDesconectar_', 'tiktokToken_', 'tiktokEnviar_', 'fotosTikTok_', 'tiktokNota_', 'tiktokAutomatico_',
    'enlacesMedia_',
  ], {
    TIKTOK_REDIRECT: 'https://bookeaa.com/central', TIKTOK_SCOPES: constanteGs(gs, 'TIKTOK_SCOPES'), TIKTOK_API: constanteGs(gs, 'TIKTOK_API'), TIKTOK_MAX_BYTES: constanteGs(gs, 'TIKTOK_MAX_BYTES'), TIKTOK_FOTOS_BASE: constanteGs(gs, 'TIKTOK_FOTOS_BASE'), TIKTOK_NOTA: constanteGs(gs, 'TIKTOK_NOTA'),
    ZONA: 'America/Caracas',
    Utilities: { getUuid: () => 'ab-cd-ef-12', formatDate: (d: Date, _z: string, fmt: string) => (fmt === 'yyyy-MM-dd' ? d.toISOString().slice(0, 10) : fmt === 'HH:mm' ? d.toISOString().slice(11, 16) : '2026-10-15 13:00') },
    PropertiesService: { getScriptProperties: () => ({ getProperty: (k: string) => guardado[k] ?? null, setProperty: (k: string, v: string) => { guardado[k] = v }, deleteProperty: (k: string) => { delete guardado[k] } }) },
    CacheService: { getScriptCache: () => ({ put: (k: string, v: string) => { cache[k] = v }, get: (k: string) => cache[k] ?? null, remove: (k: string) => { delete cache[k] } }) },
    UrlFetchApp: { fetch: (url: string, o: any) => { llamadas.push({ url, o }); return respuestas[i++](url, o) } },
    marketingCentral_: () => ({ publicaciones }),
    marketingGuardar_: (c: any) => { guardadas.push(c); return { ok: true } },
    limpiarTexto_: (v: unknown, n: number) => String(v ?? '').slice(0, n),
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

  it('enviar: rechaza videos sin link, sin conexión y errores de TikTok', () => {
    const conectado = { tiktok_access: 'AT', tiktok_access_exp: String(AHORA + 3600_000), tiktok_refresh: 'RT', tiktok_refresh_exp: String(AHORA + 1e9) }
    expect(entorno([], conectado).f.tiktokEnviar_({ id: 'V2' }, AHORA).error).toBe('datos_invalidos')
    expect(entorno([], conectado).f.tiktokEnviar_({ id: 'X' }, AHORA).error).toBe('no_existe')
    expect(entorno([]).f.tiktokEnviar_({ id: 'V1' }, AHORA).error).toBe('sin_conexion')
    const malo = entorno([() => respuesta(200, {}), () => respuesta(403, { error: { code: 'spam_risk_too_many_pending_share', message: 'Too many pending' } })], conectado)
    const r = malo.f.tiktokEnviar_({ id: 'V1' }, AHORA)
    expect(r.error).toBe('tiktok')
    expect(r.mensaje).toContain('Too many pending')
    expect(malo.llamadas).toHaveLength(2) // no intenta subir el archivo
  })

  const conectadoTt = { tiktok_access: 'AT', tiktok_access_exp: String(AHORA + 3600_000), tiktok_refresh: 'RT', tiktok_refresh_exp: String(AHORA + 1e9), tiktok_usuario: 'Samuel' }

  it('enviar carrusel: manda las láminas como fotos desde bookeaa.com/fotos-tiktok', () => {
    const { f, llamadas, guardadas } = entorno([() => respuesta(200, { data: { publish_id: 'F1' }, error: { code: 'ok' } })], conectadoTt)
    expect(f.tiktokEnviar_({ id: 'C1' }, AHORA)).toEqual({ ok: true, publishId: 'F1', usuario: 'Samuel' })
    expect(llamadas).toHaveLength(1)
    expect(llamadas[0].url).toBe('https://open.tiktokapis.com/v2/post/publish/content/init/')
    const cuerpo = JSON.parse(llamadas[0].o.payload)
    expect(cuerpo).toMatchObject({
      post_mode: 'MEDIA_UPLOAD', media_type: 'PHOTO',
      source_info: { source: 'PULL_FROM_URL', photo_cover_index: 0, photo_images: ['https://bookeaa.com/fotos-tiktok/carrusel-16-01.jpg', 'https://bookeaa.com/fotos-tiktok/carrusel-16-02.jpg'] },
    })
    expect(cuerpo.post_info).toEqual({ title: 'La libreta', description: 'Hola\n\n#bookeaa' })
    expect(guardadas[0].notas).toContain('En borradores de TikTok')
  })

  it('enviar carrusel: explica cuando el dominio no está verificado', () => {
    const { f } = entorno([() => respuesta(403, { error: { code: 'url_ownership_unverified', message: 'x' } })], conectadoTt)
    expect(f.tiktokEnviar_({ id: 'C1' }, AHORA).mensaje).toContain('verificar bookeaa.com')
  })

  it('automático: envía lo de hoy que toca, no repite y anota los errores sin reintentar', () => {
    const base = { titulo: 'T', caption: '', hashtags: '' }
    const pubs = [
      { ...base, id: 'HOY-APROBADO', tipo: 'carrusel', fecha: '2026-10-15', hora: '08:00', estado: 'aprobado', media: 'https://c/a-01.jpg', notas: '' },
      { ...base, id: 'HOY-PUBLICADO', tipo: 'carrusel', fecha: '2026-10-15', hora: '09:00', estado: 'publicado', media: 'https://c/b-01.jpg', notas: '' },
      { ...base, id: 'YA-ENVIADO', tipo: 'carrusel', fecha: '2026-10-15', hora: '09:30', estado: 'aprobado', media: 'https://c/c-01.jpg', notas: 'En borradores de TikTok (2026-10-15 09:35)' },
      { ...base, id: 'MAS-TARDE', tipo: 'carrusel', fecha: '2026-10-15', hora: '23:00', estado: 'aprobado', media: 'https://c/d-01.jpg', notas: '' },
      { ...base, id: 'BORRADOR', tipo: 'carrusel', fecha: '2026-10-15', hora: '08:00', estado: 'borrador', media: 'https://c/e-01.jpg', notas: '' },
      { ...base, id: 'AYER-PUBLICADO', tipo: 'carrusel', fecha: '2026-10-14', hora: '08:00', estado: 'publicado', media: 'https://c/f-01.jpg', notas: '' },
      { ...base, id: 'SIN-LINK', tipo: 'video-mg', fecha: '2026-10-15', hora: '08:00', estado: 'aprobado', media: '', notas: '' },
      { ...base, id: 'CAMPANA', tipo: 'campana', fecha: '2026-10-15', hora: '08:00', estado: 'aprobado', media: 'https://c/g.jpg', notas: '' },
    ]
    const ok = (id: string) => () => respuesta(200, { data: { publish_id: id }, error: { code: 'ok' } })
    const e1 = entorno([ok('P1'), ok('P2')], conectadoTt, pubs)
    expect(e1.f.tiktokAutomatico_(AHORA)).toEqual({ ok: true, enviadas: ['HOY-APROBADO', 'HOY-PUBLICADO'], errores: {} })
    const falla = entorno([() => respuesta(400, { error: { code: 'invalid_param', message: 'Foto no válida' } }), ok('P3')], conectadoTt, pubs)
    const r = falla.f.tiktokAutomatico_(AHORA)
    expect(r.enviadas).toEqual(['HOY-PUBLICADO'])
    expect(r.errores['HOY-APROBADO']).toContain('Foto no válida')
    expect(falla.guardadas.some((g: any) => /^Error TikTok/.test(g.notas))).toBe(true)
    const lleno = entorno([() => respuesta(403, { error: { code: 'spam_risk_too_many_pending_share', message: 'Too many pending' } })], conectadoTt, pubs)
    expect(lleno.f.tiktokAutomatico_(AHORA)).toEqual({ ok: true, enviadas: [], errores: {} })
    expect(lleno.guardadas).toHaveLength(0) // sin marca: se reintenta en la siguiente ronda
    expect(entorno([], {}, pubs).f.tiktokAutomatico_(AHORA)).toEqual({ ok: true, enviadas: [], errores: {}, motivo: 'sin_conexion' })
  })
})
