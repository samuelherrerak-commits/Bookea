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

function maestro() {
  const hojas: Record<string, ReturnType<typeof hoja>> = {}
  const ss = { getSheetByName: (n: string) => hojas[n] ?? null, insertSheet: (n: string) => (hojas[n] = hoja()) }
  const f = funcionesGs<Record<string, Fn>>(gs, [
    'hojaCon_', 'objetos_', 'escribirFila_', 'hojaMarketing_', 'publicacionDe_', 'marketingCentral_', 'marketingImportar_', 'marketingGuardar_',
    'ymd_', 'limpiarTexto_', 'paraCelda_',
  ], {
    MARKETING_HEADERS: constanteGs(gs, 'MARKETING_HEADERS'), MARKETING_ESTADOS: constanteGs(gs, 'MARKETING_ESTADOS'), ZONA: 'America/Caracas',
    SpreadsheetApp: { getActiveSpreadsheet: () => ss },
    Utilities: { formatDate: (d: Date) => d.toISOString().slice(0, 16).replace('T', ' ') },
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
    expect(f.marketingImportar_({ filas: [fila('A'), fila('B', { fecha: '2026-10-16' })] })).toEqual({ ok: true, agregadas: 2 })
    expect(f.marketingImportar_({ filas: [fila('A', { titulo: 'otro' }), fila('C')] })).toEqual({ ok: true, agregadas: 1 })
    expect(hojas.Marketing.datos.length).toBe(4) // encabezado + 3
    const l = f.marketingCentral_().publicaciones
    expect(l.map((p: any) => p.id)).toEqual(['A', 'B', 'C'])
    expect(l[0]).toMatchObject({ titulo: 'La libreta', fecha: '2026-10-15', hora: '08:00', estado: 'borrador' })
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
})
