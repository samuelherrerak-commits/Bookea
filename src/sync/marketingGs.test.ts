import { describe, expect, it } from 'vitest'
import { constanteGs, funcionesGs } from './appsScript'

const gs = Object.values(import.meta.glob('../../apps-script/Code.gs', { query: '?raw', import: 'default', eager: true }) as Record<string, string>)[0] ?? ''
type Fn = (...a: any[]) => any

/** Hoja de pruebas con lo que usa la pestaña Marketing: setValues, setValue y formato de texto. */
function hoja() {
  const datos: unknown[][] = []
  const rango = (r: number, c: number, nr = 1, nc = 1) => ({
    getValues: () => datos.slice(r - 1, r - 1 + nr).map((f) => Array.from({ length: nc }, (_, j) => f[c - 1 + j] ?? '')),
    setValue: (v: unknown) => { (datos[r - 1] ??= [])[c - 1] = v },
    setValues: (m: unknown[][]) => m.forEach((fila, i) => fila.forEach((v, j) => { (datos[r - 1 + i] ??= [])[c - 1 + j] = v })),
    setFontWeight: () => undefined,
    setNumberFormat: () => undefined,
  })
  return {
    datos,
    getLastRow: () => datos.length,
    getMaxRows: () => 1000,
    getRange: rango,
    appendRow: (f: unknown[]) => datos.push(f),
    setFrozenRows: () => undefined,
  }
}

function maestro(webhook: string | null = null, fetchHook?: (url: string, o: any) => { getResponseCode: () => number }) {
  const hojas: Record<string, ReturnType<typeof hoja>> = {}
  const ss = { getSheetByName: (n: string) => hojas[n] ?? null, insertSheet: (n: string) => (hojas[n] = hoja()) }
  const f = funcionesGs<Record<string, Fn>>(gs, [
    'hojaCon_', 'objetos_', 'escribirFila_', 'hojaMarketing_', 'publicacionDe_', 'marketingCentral_', 'marketingImportar_', 'marketingGuardar_',
    'ymd_', 'limpiarTexto_', 'paraCelda_', 'enlacesMedia_', 'atenderMake_', 'publicacionesVencidas_', 'piezaParaMake_', 'makeEnviarPendientes_',
  ], {
    MAKE_NOTA: constanteGs(gs, 'MAKE_NOTA'),
    MARKETING_HEADERS: constanteGs(gs, 'MARKETING_HEADERS'), MARKETING_ESTADOS: constanteGs(gs, 'MARKETING_ESTADOS'), ZONA: 'America/Caracas',
    SpreadsheetApp: { getActiveSpreadsheet: () => ss },
    Utilities: { formatDate: (d: Date, _z: string, fmt: string) => (fmt === 'yyyy-MM-dd' ? d.toISOString().slice(0, 10) : fmt === 'HH:mm' ? d.toISOString().slice(11, 16) : d.toISOString().slice(0, 16).replace('T', ' ')) },
    PropertiesService: { getScriptProperties: () => ({ getProperty: (k: string) => (k === 'make_token' ? 'make_' + 'x'.repeat(30) : k === 'make_webhook' ? webhook : null) }) },
    UrlFetchApp: { fetch: (u: string, o: any) => fetchHook!(u, o) },
    LockService: { getScriptLock: () => ({ tryLock: () => true, releaseLock: () => undefined }) },
  })
  return { f, hojas }
}

const fila = (id: string, extra: Record<string, unknown> = {}) => ({
  id, fecha: '2026-10-15', hora: '08:00', tipo: 'video-mg', titulo: 'La libreta', plataforma: 'TikTok + Reels', caption: 'Hola', hashtags: '#bookeaa', media: '', estado: 'borrador', notas: '', ...extra,
})

describe('Code.gs · Marketing de central', () => {
  it('crea la pestaña, importa una sola vez y no pisa lo que ya existe', () => {
    const { f, hojas } = maestro()
    expect(f.marketingCentral_()).toEqual({ publicaciones: [] })
    expect(f.marketingImportar_({ filas: [fila('A'), fila('B', { fecha: '2026-10-16' })] })).toEqual({ ok: true, agregadas: 2, completadas: 0 })
    expect(f.marketingImportar_({ filas: [fila('A', { titulo: 'otro' }), fila('C')] })).toEqual({ ok: true, agregadas: 1, completadas: 0 })
    expect(hojas.Marketing.datos.length).toBe(4) // encabezado + 3
    const l = f.marketingCentral_().publicaciones
    expect(l.map((p: any) => p.id)).toEqual(['A', 'B', 'C'])
    expect(l[0]).toMatchObject({ titulo: 'La libreta', fecha: '2026-10-15', hora: '08:00', estado: 'borrador' })
  })

  it('al volver a importar solo rellena el link vacío de lo que no se ha publicado', () => {
    const { f } = maestro()
    f.marketingImportar_({ filas: [fila('A'), fila('B'), fila('C', { media: 'https://x/c.mp4' })] })
    f.marketingGuardar_({ id: 'B', estado: 'publicado' }, 'a@b.c', Date.now())
    const r = f.marketingImportar_({ filas: [fila('A', { media: 'https://x/a.mp4', titulo: 'otro' }), fila('B', { media: 'https://x/b.mp4' }), fila('C', { media: 'https://x/nuevo.mp4' })] })
    expect(r).toEqual({ ok: true, agregadas: 0, completadas: 1 })
    const l = f.marketingCentral_().publicaciones
    expect(l.map((p: any) => p.media)).toEqual(['https://x/a.mp4', '', 'https://x/c.mp4'])
    expect(l[0].titulo).toBe('La libreta')
  })

  it('descarta filas sin id o con fecha mala, y neutraliza fórmulas', () => {
    const { f } = maestro()
    expect(f.marketingImportar_({ filas: [fila(''), fila('X', { fecha: 'mañana' }), fila('F', { caption: '=IMPORTXML("x")' })] }).agregadas).toBe(1)
    expect(f.marketingCentral_().publicaciones[0].caption).toBe('\'=IMPORTXML("x")')
  })

  it('guarda estado, fecha y texto; al publicar deja quién y cuándo, y al volver a borrador lo borra', () => {
    const { f } = maestro()
    f.marketingImportar_({ filas: [fila('A')] })
    const ahora = Date.UTC(2026, 9, 15, 17)
    expect(f.marketingGuardar_({ id: 'A', estado: 'aprobado', hora: '9:30', caption: 'Nuevo' }, 'yo@gmail.com', ahora)).toEqual({ ok: true })
    expect(f.marketingCentral_().publicaciones[0]).toMatchObject({ estado: 'aprobado', hora: '09:30', caption: 'Nuevo' })
    f.marketingGuardar_({ id: 'A', estado: 'publicado' }, 'yo@gmail.com', ahora)
    expect(f.marketingCentral_().publicaciones[0].publicadoEn).toContain('yo@gmail.com')
    f.marketingGuardar_({ id: 'A', estado: 'borrador' }, 'yo@gmail.com', ahora)
    expect(f.marketingCentral_().publicaciones[0].publicadoEn).toBe('')
  })

  it('rechaza estado, fecha u hora inválidos y publicaciones que no existen', () => {
    const { f } = maestro()
    f.marketingImportar_({ filas: [fila('A')] })
    expect(f.marketingGuardar_({ id: 'A', estado: 'listo' }, 'y', 0).error).toBe('datos_invalidos')
    expect(f.marketingGuardar_({ id: 'A', fecha: 'x' }, 'y', 0).error).toBe('datos_invalidos')
    expect(f.marketingGuardar_({ id: 'A', hora: '25' }, 'y', 0).error).toBe('datos_invalidos')
    expect(f.marketingGuardar_({ id: 'Z', estado: 'aprobado' }, 'y', 0).error).toBe('no_existe')
  })

  it('Make: solo recibe lo aprobado, ya vencido y con link; el token es obligatorio', () => {
    const { f } = maestro()
    const T = 'make_' + 'x'.repeat(30)
    const ahora = Date.UTC(2026, 9, 15, 17) // 17:00 UTC
    const urls = 'https://res.cloudinary.com/x/1.jpg https://res.cloudinary.com/x/2.jpg'
    f.marketingImportar_({ filas: [
      fila('listo-carrusel', { tipo: 'carrusel', hora: '10:00', media: urls, estado: 'aprobado' }),
      fila('listo-video', { hora: '12:00', media: 'https://res.cloudinary.com/x/v.mp4', estado: 'aprobado' }),
      fila('futuro', { hora: '23:00', media: urls, estado: 'aprobado' }),
      fila('sin-link', { estado: 'aprobado' }),
      fila('borrador', { media: urls }),
      fila('drive', { media: 'http://drive.google.com/x', estado: 'aprobado' }),
    ] })
    expect(f.atenderMake_({ op: 'pendientes', token: 'malo' }, ahora)).toEqual({ error: 'no_autorizado' })
    const r = f.atenderMake_({ op: 'pendientes', token: T }, ahora).publicaciones
    expect(r.map((p: any) => p.id)).toEqual(['listo-carrusel', 'listo-video'])
    expect(r[0]).toMatchObject({ esCarrusel: true, video_url: '', caption: 'Hola\n\n#bookeaa' })
    expect(r[0].archivos).toEqual([{ media_type: 'IMAGE', image_url: 'https://res.cloudinary.com/x/1.jpg' }, { media_type: 'IMAGE', image_url: 'https://res.cloudinary.com/x/2.jpg' }])
    expect(r[1]).toMatchObject({ esCarrusel: false, video_url: 'https://res.cloudinary.com/x/v.mp4', archivos: [] })
  })

  it('Make: confirma publicado, o devuelve a borrador con el error', () => {
    const { f } = maestro()
    const T = 'make_' + 'x'.repeat(30)
    const ahora = Date.UTC(2026, 9, 15, 17)
    f.marketingImportar_({ filas: [fila('A', { estado: 'aprobado' }), fila('B', { estado: 'aprobado' })] })
    expect(f.atenderMake_({ op: 'publicado', token: T, id: 'A', ok: true, post: '1789' }, ahora)).toEqual({ ok: true })
    f.atenderMake_({ op: 'publicado', token: T, id: 'B', ok: false, error: 'Media URL no accesible' }, ahora)
    const l = f.marketingCentral_().publicaciones
    expect(l[0]).toMatchObject({ estado: 'publicado' })
    expect(l[0].publicadoEn).toContain('Make')
    expect(l[1]).toMatchObject({ estado: 'borrador' })
    expect(l[1].notas).toContain('Media URL no accesible')
  })

  it('programador: manda a Make cada pieza vencida una sola vez y deja la marca; aprobar de nuevo permite reenviar', () => {
    const llamadas: { url: string; cuerpo: any }[] = []
    const { f } = maestro('https://hook.eu1.make.com/abc123', (url, o) => { llamadas.push({ url, cuerpo: JSON.parse(o.payload) }); return { getResponseCode: () => 200 } })
    const ahora = Date.UTC(2026, 9, 15, 17)
    f.marketingImportar_({ filas: [
      fila('A', { hora: '10:00', media: 'https://res.cloudinary.com/x/v.mp4', estado: 'aprobado' }),
      fila('B', { tipo: 'carrusel', hora: '11:00', media: 'https://res.cloudinary.com/x/1.jpg https://res.cloudinary.com/x/2.jpg', estado: 'aprobado' }),
      fila('FUTURO', { hora: '23:00', media: 'https://res.cloudinary.com/x/v.mp4', estado: 'aprobado' }),
      fila('BORRADOR', { media: 'https://res.cloudinary.com/x/v.mp4' }),
    ] })
    expect(f.makeEnviarPendientes_(ahora)).toEqual({ enviadas: ['A', 'B'], errores: {} })
    expect(llamadas.map((l) => l.url)).toEqual(['https://hook.eu1.make.com/abc123', 'https://hook.eu1.make.com/abc123'])
    expect(llamadas[0].cuerpo).toMatchObject({ token: 'make_' + 'x'.repeat(30), id: 'A', esCarrusel: false, video_url: 'https://res.cloudinary.com/x/v.mp4' })
    expect(llamadas[1].cuerpo.archivos).toHaveLength(2)
    const l = f.marketingCentral_().publicaciones
    expect(l[0].notas).toContain('Enviado a Make')
    expect(f.makeEnviarPendientes_(ahora)).toEqual({ enviadas: [], errores: {} }) // no repite
    f.marketingGuardar_({ id: 'A', estado: 'aprobado' }, 'a@b.c', ahora)
    expect(f.marketingCentral_().publicaciones[0].notas).not.toContain('Enviado a Make')
    expect(f.makeEnviarPendientes_(ahora).enviadas).toEqual(['A'])
  })

  it('programador: sin webhook no hace nada y un HTTP malo no deja marca (se reintenta)', () => {
    const sin = maestro(null, () => { throw new Error('no debe llamar') })
    expect(sin.f.makeEnviarPendientes_(Date.UTC(2026, 9, 15, 17))).toEqual({ enviadas: [], errores: {}, motivo: 'sin_webhook' })
    const { f } = maestro('https://hook.eu1.make.com/abc123', () => ({ getResponseCode: () => 500 }))
    f.marketingImportar_({ filas: [fila('A', { hora: '10:00', media: 'https://res.cloudinary.com/x/v.mp4', estado: 'aprobado' })] })
    expect(f.makeEnviarPendientes_(Date.UTC(2026, 9, 15, 17))).toEqual({ enviadas: [], errores: { A: 'HTTP 500' } })
    expect(f.marketingCentral_().publicaciones[0].notas).toBe('')
  })
})
