import { describe, expect, it } from 'vitest'
import { constanteGs, funcionesGs } from './appsScript'

const leer = (ruta: string) => Object.values(import.meta.glob(['../../apps-script/Code.gs', '../../apps-script/cliente/Configurador.gs'], { query: '?raw', import: 'default', eager: true }) as Record<string, string>).find((t) => t.includes(ruta)) ?? ''
const gs = leer('CLAVES_DUENO')
const cliente = leer('CLAVES_POR_SECCION =')
type Fn = (...a: any[]) => any

/** Hoja falsa: una matriz de valores con la parte de la API de Sheets que se usa. */
function hoja(filas: unknown[][]) {
  const datos = filas.map((f) => [...f])
  const rango = (r: number, c: number, nr = 1, nc = 1) => ({
    getValues: () => datos.slice(r - 1, r - 1 + nr).map((f) => Array.from({ length: nc }, (_, j) => f[c - 1 + j] ?? '')),
    getDisplayValues: () => datos.slice(r - 1, r - 1 + nr).map((f) => Array.from({ length: nc }, (_, j) => String(f[c - 1 + j] ?? ''))),
    setValues: (v: unknown[][]) => v.forEach((f, i) => { datos[r - 1 + i] ??= []; f.forEach((x, j) => (datos[r - 1 + i][c - 1 + j] = x)) }),
    setValue: (v: unknown) => { datos[r - 1] ??= []; datos[r - 1][c - 1] = v },
    clearContent: () => { for (let i = 0; i < nr; i++) for (let j = 0; j < nc; j++) if (datos[r - 1 + i]) datos[r - 1 + i][c - 1 + j] = '' },
    insertCheckboxes: () => undefined,
    setNumberFormat: () => undefined,
  })
  return {
    datos,
    getLastRow: () => { let n = datos.length; while (n > 0 && datos[n - 1].every((x) => x === '' || x == null)) n--; return n },
    getRange: (a: number | string, c?: number, nr?: number, nc?: number) => (typeof a === 'string' ? rango(1, 1) : rango(a, c!, nr, nc)),
    getDataRange: () => rango(1, 1, datos.length, Math.max(...datos.map((f) => f.length))),
    appendRow: (f: unknown[]) => datos.push(f),
  }
}

function negocio() {
  const hojas: Record<string, ReturnType<typeof hoja>> = {
    Configuracion: hoja([['Clave', 'Valor'], ['marca', 'Viejo'], ['moneda', 'EUR']]),
    Servicios: hoja([['ID', 'Nombre', 'Precio', 'Duracion_Min', 'Tipo'], ['corte', 'Corte', 10, 30, 'Cabello']]),
    Bloqueos: hoja([['Fecha', 'Hora_Inicio', 'Hora_Fin', 'Motivo'], ['2026-10-01', '', '', 'Pasado'], ['2026-10-20', '', '', 'Viejo']]),
    Horarios: hoja([['Dia', 'Hora_Inicio', 'Hora_Fin']]),
  }
  return { hojas, ss: { getSheetByName: (n: string) => hojas[n] ?? null, insertSheet: (n: string) => (hojas[n] = hoja([[]])) } }
}

const AHORA = Date.UTC(2026, 9, 9, 15)
const NOMBRES = ['duenoGuardar_', 'duenoValidar_', 'duenoLeerConfig_', 'cfgFilas_', 'cfgHora_', 'cfgActiva_', 'cfgAlertas_', 'cfgReemplazar_', 'cfgHoja_',
  'setConfigKey_', 'normKey_', 'limpiarTexto_', 'paraCelda_', 'round2_', 'toNumber_', 'toMinutes_', 'ymd_', 'getConfig_']
const cargar = (extra: Record<string, unknown> = {}) => {
  let limpiado = ''
  const f = funcionesGs<Record<string, Fn>>(gs, NOMBRES, {
    CLAVES_DUENO: constanteGs(gs, 'CLAVES_DUENO'), TABLAS_DUENO: constanteGs(gs, 'TABLAS_DUENO'), MAX_SERVICIOS: 120,
    DIAS_SEMANA: constanteGs(gs, 'DIAS_SEMANA'), SHEETS: [], ZONA: 'America/Caracas',
    LockService: { getScriptLock: () => ({ tryLock: () => true, releaseLock: () => undefined }) },
    SpreadsheetApp: { flush: () => undefined },
    Utilities: { formatDate: (d: Date) => new Date(d.getTime() - 4 * 3600_000).toISOString().slice(0, 10) },
    limpiarCacheCatalogo_: (s: string) => (limpiado = s),
    leerLogoHoja_: () => '', logoValido_: (v: string) => v.startsWith('data:image/png'),
    ...extra,
  })
  return { f, limpiado: () => limpiado }
}

describe('Code.gs · configuración desde Mi negocio', () => {
  it('las claves por sección son las mismas que la ventana de la hoja', () => {
    expect(constanteGs(gs, 'CLAVES_DUENO')).toEqual(constanteGs(cliente, 'CLAVES_POR_SECCION'))
  })

  it('guarda servicios: adicional, categoría y precio; limpia la caché de la página', () => {
    const { ss, hojas } = negocio()
    const { f, limpiado } = cargar()
    const r = f.duenoGuardar_(ss, { slug: 'barberia' }, 'servicios', { servicios: [
      { id: 'corte', nombre: 'Corte', precio: 12.5, duracion: 30, categoria: 'Cabello', adicional: false },
      { nombre: 'Lavado', precio: 3, duracion: 10, adicional: true },
      { nombre: '=HYPERLINK("x")', precio: 1, duracion: 15 },
    ] }, AHORA)
    expect(r.ok).toBe(true)
    expect(hojas.Servicios.datos.slice(1, 4)).toEqual([
      ['corte', 'Corte', 12.5, 30, 'Cabello'],
      ['', 'Lavado', 3, 10, 'Adicional'],
      ['', `'=HYPERLINK("x")`, 1, 15, ''],
    ])
    expect(limpiado()).toBe('barberia')
    expect(r.datos.servicios[1]).toMatchObject({ nombre: 'Lavado', adicional: true, categoria: '' })
  })

  it('rechaza servicios sin nombre, repetidos o sin ninguno principal', () => {
    const { f } = cargar()
    expect(f.duenoValidar_('servicios', { servicios: [{ nombre: 'Lavado', precio: 3, duracion: 10, adicional: true }] })).toContain('Deja al menos un servicio principal (que no sea adicional).')
    const e = f.duenoValidar_('servicios', { servicios: [{ nombre: 'Corte', precio: 1, duracion: 30 }, { nombre: 'corte', precio: 1, duracion: 2 }, { nombre: '', precio: 1, duracion: 30 }] })
    expect(e).toEqual(expect.arrayContaining(['"corte" está repetido.', 'corte: la duración va de 5 a 720 minutos.', 'Hay un servicio sin nombre.']))
  })

  it('días libres: reemplaza de hoy en adelante y conserva los pasados', () => {
    const { ss, hojas } = negocio()
    const { f } = cargar()
    const r = f.duenoGuardar_(ss, { slug: 'b' }, 'bloqueos', { bloqueos: [
      { fecha: '2026-10-24', inicio: '', fin: '', motivo: 'Viaje' },
      { fecha: '2026-10-12', inicio: '13:00', fin: '15:00', motivo: 'Médico' },
    ] }, AHORA)
    expect(r.ok).toBe(true)
    expect(hojas.Bloqueos.datos.slice(1, 4)).toEqual([
      ['2026-10-01', '', '', 'Pasado'],
      ['2026-10-24', '', '', 'Viaje'],
      ['2026-10-12', '13:00', '15:00', 'Médico'],
    ])
    expect(f.duenoValidar_('bloqueos', { bloqueos: [{ fecha: '2026-10-12', inicio: '15:00', fin: '13:00' }] })).toHaveLength(1)
  })

  it('solo escribe las claves de la sección y valida como la ventana', () => {
    const { ss, hojas } = negocio()
    const { f } = cargar()
    expect(f.duenoGuardar_(ss, { slug: 'b' }, 'marca', { config: { marca: 'Barbería Norte', moneda: 'USD' } }, AHORA).ok).toBe(true)
    expect(hojas.Configuracion.datos).toEqual([['Clave', 'Valor'], ['marca', 'Barbería Norte'], ['moneda', 'EUR']])
    expect(f.duenoGuardar_(ss, { slug: 'b' }, 'pagos', { config: { whatsapp: '0412' } }, AHORA).errores[0]).toMatch(/código de país/)
    expect(f.duenoGuardar_(ss, { slug: 'b' }, 'nada', {}, AHORA).ok).toBe(false)
  })

  it('horario: un renglón por tramo, de lunes a domingo, y los días sin tramo cerrados', () => {
    const { ss, hojas } = negocio()
    const { f } = cargar()
    expect(f.duenoGuardar_(ss, { slug: 'b' }, 'horario', { config: {}, horarios: [
      { dia: 'Lunes', inicio: '9:00', fin: '13:00' }, { dia: 'Lunes', inicio: '14:00', fin: '18:00' }, { dia: 'Sábado', inicio: '09:00', fin: '12:00' },
    ] }, AHORA).ok).toBe(true)
    expect(hojas.Horarios.datos.slice(1, 10)).toEqual([
      ['Lunes', '09:00', '13:00'], ['Lunes', '14:00', '18:00'], ['Martes', '', ''], ['Miércoles', '', ''], ['Jueves', '', ''],
      ['Viernes', '', ''], ['Sábado', '09:00', '12:00'], ['Domingo', '', ''],
    ].slice(0, 9))
    expect(f.duenoValidar_('horario', { config: {}, horarios: [{ dia: 'Lunes', inicio: '18:00', fin: '09:00' }] })).toHaveLength(1)
  })
})
