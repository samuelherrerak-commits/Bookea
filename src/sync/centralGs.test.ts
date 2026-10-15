import { describe, expect, it } from 'vitest'
import { constanteGs, funcionesGs } from './appsScript'

const gs = Object.values(import.meta.glob('../../apps-script/Code.gs', { query: '?raw', import: 'default', eager: true }) as Record<string, string>)[0] ?? ''
type Fn = (...a: any[]) => any

function hoja(filas: unknown[][]) {
  const datos = filas.map((f) => [...f])
  const rango = (r: number, c: number, nr = 1, nc = 1) => ({
    getValues: () => datos.slice(r - 1, r - 1 + nr).map((f) => Array.from({ length: nc }, (_, j) => f[c - 1 + j] ?? '')),
    setValue: (v: unknown) => { datos[r - 1] ??= []; datos[r - 1][c - 1] = v },
    setFontWeight: () => rango(r, c, nr, nc),
  })
  return {
    datos,
    getLastRow: () => datos.length,
    getLastColumn: () => Math.max(...datos.map((f) => f.length)),
    getRange: (r: number, c: number, nr?: number, nc?: number) => rango(r, c, nr, nc),
    appendRow: (f: unknown[]) => datos.push(f),
    setFrozenRows: () => undefined,
  }
}

const TENANT_HEADERS = constanteGs<string[]>(gs, 'TENANT_HEADERS')
const ymd = (d: Date) => new Date(d.getTime() - 4 * 3600_000).toISOString().slice(0, 10)
const AHORA = Date.UTC(2026, 9, 12, 15) // 12 oct 2026

function maestro() {
  const tenants = hoja([
    TENANT_HEADERS.slice(0, 9),
    ['barberia', 'Barbería Norte', 'ss1', '', '', 't', 'si', 'ana@gmail.com', '2026-09-01'],
    ['spa', 'Spa Sol', 'ss2', '', '', 't', 'si', 'eva@gmail.com', '2026-10-01'],
    ['cerrado', 'Cerrado', 'ss3', '', '', 't', 'no', '', '2026-01-01'],
  ])
  const hojas: Record<string, ReturnType<typeof hoja>> = { Tenants: tenants }
  const ss = { getSheetByName: (n: string) => hojas[n] ?? null, insertSheet: (n: string) => (hojas[n] = hoja([])) }
  const f = funcionesGs<Record<string, Fn>>(gs, [
    'estadoCobro_', 'diasEntre_', 'sumarMeses_', 'sumarDias_', 'hojaTenants_', 'filasTenants_', 'escribirTenant_', 'negocioCentral_',
    'hojaPagos_', 'pagosRecientes_', 'registrarPagoCentral_', 'extenderVence_', 'tenantActivo_', 'ymd_', 'normKey_', 'round2_', 'toNumber_', 'limpiarTexto_', 'paraCelda_',
  ], {
    TENANT_HEADERS, PAGOS_HEADERS: constanteGs(gs, 'PAGOS_HEADERS'), ZONA: 'America/Caracas', DIAS_GRACIA: 3,
    SpreadsheetApp: { getActiveSpreadsheet: () => ss },
    Utilities: { formatDate: (d: Date, _z: string, formato: string) => (formato === 'yyyy-MM-dd' ? ymd(d) : d.toISOString()) },
    limpiarCacheTenants_: () => undefined,
  })
  return { f, hojas }
}

describe('Code.gs · central de bookeaa', () => {
  it('estado de cobro: prueba, activo, pendiente, suspendido y sin fecha', () => {
    const { f } = maestro()
    const hoy = '2026-10-12'
    expect(f.estadoCobro_({ activo: 'si', vence: '2026-10-30', ultimoPago: '' }, hoy)).toBe('prueba')
    expect(f.estadoCobro_({ activo: 'si', vence: '2026-10-30', ultimoPago: '2026-09-30' }, hoy)).toBe('activo')
    expect(f.estadoCobro_({ activo: 'si', vence: '2026-10-11', ultimoPago: '2026-09-11' }, hoy)).toBe('pendiente') // 1 día de gracia
    expect(f.estadoCobro_({ activo: 'si', vence: '2026-10-09', ultimoPago: '2026-09-09' }, hoy)).toBe('pendiente') // 3: último día
    expect(f.estadoCobro_({ activo: 'si', vence: '2026-10-08', ultimoPago: '2026-09-08' }, hoy)).toBe('vencido')
    expect(f.estadoCobro_({ activo: 'si', vence: '2026-10-12', ultimoPago: '' }, hoy)).toBe('prueba') // vence hoy: todavía vale
    expect(f.estadoCobro_({ activo: 'no', vence: '2026-12-01', ultimoPago: '' }, hoy)).toBe('suspendido')
    expect(f.estadoCobro_({ activo: 'si', vence: '', ultimoPago: '' }, hoy)).toBe('sin_fecha')
  })

  it('sumar meses respeta el fin de mes', () => {
    const { f } = maestro()
    expect(f.sumarMeses_('2026-01-31', 1)).toBe('2026-02-28')
    expect(f.sumarMeses_('2026-10-12', 1)).toBe('2026-11-12')
    expect(f.sumarMeses_('2026-12-15', 3)).toBe('2027-03-15')
  })

  it('el corte queda anclado al mismo día aunque pague tarde; si venció hace meses salta al próximo', () => {
    const { f } = maestro()
    expect(f.extenderVence_('2026-10-05', 1, '2026-10-12')).toBe('2026-11-05') // pagó 7 días tarde: sigue el 5
    expect(f.extenderVence_('2026-06-05', 1, '2026-10-12')).toBe('2026-11-05') // meses atrás: próximo corte futuro
    expect(f.extenderVence_('', 1, '2026-10-12')).toBe('2026-11-12')
    expect(f.extenderVence_('2026-01-31', 1, '2026-01-20')).toBe('2026-02-28')
  })

  it('pago: agrega las columnas que falten, extiende desde el vencimiento o desde hoy, y reactiva', () => {
    const { f, hojas } = maestro()
    // Vencido (sin fecha) → desde hoy.
    const r = f.registrarPagoCentral_({ slug: 'barberia', meses: 1, monto: '10', metodo: 'Pago Móvil', referencia: '0123' }, 'yo@gmail.com', AHORA)
    expect(r).toEqual({ ok: true, vence: '2026-11-12' })
    const h = hojas.Tenants.datos[0] as string[]
    const fila = hojas.Tenants.datos[1]
    expect(fila[h.indexOf('Vence')]).toBe('2026-11-12')
    expect(fila[h.indexOf('Ultimo_Pago')]).toBe('2026-10-12')
    // Al día → se suma al vencimiento, no a hoy (no pierde días por pagar antes).
    expect(f.registrarPagoCentral_({ slug: 'barberia', meses: 2, monto: 20 }, 'yo@gmail.com', AHORA).vence).toBe('2027-01-12')
    expect(hojas.Pagos.datos.length).toBe(3)
    expect(hojas.Pagos.datos[1].slice(1, 7)).toEqual(['barberia', 'Barbería Norte', 10, 1, 'Pago Móvil', '0123'])
    // Un negocio suspendido que paga se reactiva.
    f.registrarPagoCentral_({ slug: 'cerrado', meses: 1, monto: 10 }, 'yo@gmail.com', AHORA)
    expect(hojas.Tenants.datos[3][h.indexOf('Activo')]).toBe('si')
    expect(f.registrarPagoCentral_({ slug: 'nadie', meses: 1, monto: 10 }, 'yo@gmail.com', AHORA).error).toBe('no_existe')
  })

  it('la lista trae días al vencimiento y el enlace a la hoja', () => {
    const { f } = maestro()
    const filas = f.filasTenants_()
    const n = f.negocioCentral_({ ...filas[1], Vence: '2026-10-15' }, '2026-10-12')
    expect(n).toMatchObject({ slug: 'spa', estado: 'prueba', dias: 3, hoja: 'https://docs.google.com/spreadsheets/d/ss2/edit', activo: true })
  })
})
