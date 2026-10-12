import { describe, expect, it } from 'vitest'
import { constanteGs, funcionesGs } from './appsScript'

const gs = Object.values(import.meta.glob('../../apps-script/Code.gs', { query: '?raw', import: 'default', eager: true }) as Record<string, string>)[0] ?? ''
type Fn = (...a: any[]) => any

function hoja(filas: unknown[][]) {
  const datos = filas.map((f) => [...f])
  const rango = (r: number, c: number, nr = 1, nc = 1) => ({
    getValues: () => datos.slice(r - 1, r - 1 + nr).map((f) => Array.from({ length: nc }, (_, j) => f[c - 1 + j] ?? '')),
    setValue: (v: unknown) => { datos[r - 1] ??= []; datos[r - 1][c - 1] = v },
    setValues: (v: unknown[][]) => v.forEach((f, i) => { datos[r - 1 + i] = [...f] }),
    setFontWeight: () => rango(r, c, nr, nc),
  })
  return {
    datos,
    getLastRow: () => datos.length,
    getLastColumn: () => Math.max(1, ...datos.map((f) => f.length)),
    getRange: (r: number, c: number, nr?: number, nc?: number) => rango(r, c, nr, nc),
    appendRow: (f: unknown[]) => datos.push([...f]),
    setFrozenRows: () => undefined,
  }
}

const TENANT_HEADERS = constanteGs<string[]>(gs, 'TENANT_HEADERS')
const ymd = (d: Date) => new Date(d.getTime() - 4 * 3600_000).toISOString().slice(0, 10)
const AHORA = Date.UTC(2026, 9, 12, 15)

function maestro() {
  const t = TENANT_HEADERS.map(() => '')
  const fila = (o: Record<string, string>) => TENANT_HEADERS.map((h) => o[h] ?? '')
  const hojas: Record<string, ReturnType<typeof hoja>> = {
    Tenants: hoja([TENANT_HEADERS, fila({ Slug: 'barberia', Nombre: 'Barbería Norte', Activo: 'no', Suspendido_Auto: 'si', Creado: '2026-08-05', Vence: '2026-10-05' })]),
  }
  void t
  const ss = { getSheetByName: (n: string) => hojas[n] ?? null, insertSheet: (n: string) => (hojas[n] = hoja([])) }
  const avisos: string[] = []
  const nombres = ['estadoCobro_', 'diasEntre_', 'sumarMeses_', 'sumarDias_', 'extenderVence_', 'proximoCorte_', 'hojaTenants_', 'filasTenants_', 'escribirTenant_',
    'hojaPagos_', 'hojaCon_', 'objetos_', 'escribirFila_', 'refCoincide_', 'montoCoincide_', 'montoVe_', 'aprobarPago_', 'conciliar_',
    'guardarMovimientos_', 'reportarPago_', 'parsearCorreoBanco_', 'tenantActivo_', 'ymd_', 'normKey_', 'round2_', 'toNumber_', 'limpiarTexto_', 'paraCelda_']
  const fuente = gs.replace(/^const soloDigitos_ = .*$/m, '')
  const f = funcionesGs<Record<string, Fn>>(fuente, nombres, {
    TENANT_HEADERS, PAGOS_HEADERS: constanteGs(gs, 'PAGOS_HEADERS'), PAGOS_NEGOCIO_HEADERS: constanteGs(gs, 'PAGOS_NEGOCIO_HEADERS'),
    MOVIMIENTOS_HEADERS: constanteGs(gs, 'MOVIMIENTOS_HEADERS'), ZONA: 'America/Caracas', DIAS_GRACIA: 3, PRECIO_MENSUAL: 10,
    soloDigitos_: (v: unknown) => String(v ?? '').replace(/\D/g, ''),
    SpreadsheetApp: { getActiveSpreadsheet: () => ss },
    Utilities: { formatDate: (d: Date, _z: string, formato: string) => (formato === 'yyyy-MM-dd' ? ymd(d) : d.toISOString()), getUuid: () => 'abcdef12-3456-7890' },
    limpiarCacheTenants_: () => undefined,
    tasaUsd_: () => 40,
    avisarNegocio_: (slug: string, titulo: string) => avisos.push(`${slug}: ${titulo}`),
    botAvisar_: () => undefined,
  })
  return { f, hojas, avisos }
}

describe('Code.gs · cobros', () => {
  it('lee montos venezolanos y compara referencias recortadas', () => {
    const { f } = maestro()
    expect(f.montoVe_('1.234,56')).toBe(1234.56)
    expect(f.montoVe_('Bs. 400,00')).toBe(400)
    expect(f.montoVe_('400.00')).toBe(400)
    expect(f.refCoincide_('000123456789', '456789')).toBe(true)
    expect(f.refCoincide_('6789', '123456789')).toBe(true)
    expect(f.refCoincide_('123', '0123')).toBe(false) // menos de 4 dígitos no alcanza
    expect(f.montoCoincide_(400.3, 400)).toBe(true)
    expect(f.montoCoincide_(380, 400)).toBe(false)
  })

  it('entiende avisos de Pago Móvil recibido (correo o SMS del banco) y descarta los enviados', () => {
    const { f } = maestro()
    expect(f.parsearCorreoBanco_('BDV: Recibiste un PagoMovil de 04121234567 por Bs. 1.234,56 Ref: 012345678 el 12/10/26 a las 10:15')).toEqual({ monto: 1234.56, referencia: '012345678', fecha: '2026-10-12' })
    expect(f.parsearCorreoBanco_('Notificación: Usted ha recibido un pago móvil. Monto: 400,00 Bs. Número de referencia: 7788990011. Fecha: 11/10/2026')).toEqual({ monto: 400, referencia: '7788990011', fecha: '2026-10-11' })
    expect(f.parsearCorreoBanco_('Has enviado un PagoMovil por Bs. 100,00 Ref: 123456')).toBeNull()
    expect(f.parsearCorreoBanco_('Bienvenido a BDVenlínea')).toBeNull()
  })

  it('reporte del negocio + estado de cuenta → se aprueba solo, extiende el corte y reactiva', () => {
    const { f, hojas, avisos } = maestro()
    const tenant = { slug: 'barberia', nombre: 'Barbería Norte' }
    const r = f.reportarPago_(tenant, 'ana@gmail.com', { fecha: '2026-10-11', banco: 'Banesco', telefono: '0412-555-1234', referencia: '000987654321', montoBs: '400,00', meses: 1 }, AHORA)
    expect(r).toEqual({ ok: true, id: 'PABCDEF1234', estado: 'Por verificar' }) // todavía no está en el banco
    expect(f.reportarPago_(tenant, 'ana@gmail.com', { fecha: '2026-10-11', banco: 'Banesco', telefono: '04125551234', referencia: '987654321', montoBs: 400, meses: 1 }, AHORA).mensaje).toBe('Ese pago ya está reportado.')

    // Llega el estado de cuenta: un movimiento ajeno y el del pago (referencia recortada a 6 dígitos).
    expect(f.guardarMovimientos_([
      { fecha: '2026-10-11', referencia: '111222', monto: '50,00', descripcion: 'otro' },
      { fecha: '11/10/2026', referencia: '654321', monto: '400,00', descripcion: 'PAGO MOVIL' },
    ], 'estado de cuenta', AHORA)).toBe(2)
    expect(f.guardarMovimientos_([{ fecha: '2026-10-11', referencia: '654321', monto: 400 }], 'estado de cuenta', AHORA)).toBe(0) // sin repetir
    expect(f.conciliar_(AHORA).aprobados).toEqual(['PABCDEF1234'])

    const h = hojas.Tenants.datos[0] as string[]
    const fila = hojas.Tenants.datos[1]
    expect(fila[h.indexOf('Vence')]).toBe('2026-11-05') // corte anclado al día 5
    expect(fila[h.indexOf('Activo')]).toBe('si') // la había suspendido el cobro: se reactiva
    expect(fila[h.indexOf('Suspendido_Auto')]).toBe('')
    const p = hojas.PagosNegocio.datos[1] as unknown[]
    expect(p[12]).toBe('Aprobado')
    expect(p[13]).toBe('Estado de cuenta')
    expect(hojas.MovimientosBanco.datos[2][7]).toBe('PABCDEF1234')
    expect(avisos).toEqual(['barberia: ✅ Pago aprobado'])
  })

  it('valida el reporte del negocio', () => {
    const { f } = maestro()
    const e = f.reportarPago_({ slug: 'barberia', nombre: 'B' }, 'a@gmail.com', { fecha: '2026-11-01', referencia: '12', telefono: '0412', montoBs: '', banco: '' }, AHORA)
    expect(e.error).toBe('datos_invalidos')
    expect(e.mensaje).toMatch(/fecha/)
    expect(e.mensaje).toMatch(/referencia/)
  })

  it('próximo corte desde la fecha de ingreso', () => {
    const { f } = maestro()
    expect(f.proximoCorte_('2026-08-05', '2026-10-12')).toBe('2026-11-05')
    expect(f.proximoCorte_('2026-08-31', '2026-10-01')).toBe('2026-10-31')
    expect(f.proximoCorte_('2026-10-12', '2026-10-12')).toBe('2026-11-12') // el primer mes es gratis
  })
})
