import { describe, expect, it } from 'vitest'
import { funcionesGs } from './appsScript'

const gs = Object.values(import.meta.glob('../../apps-script/Code.gs', { query: '?raw', import: 'default', eager: true }) as Record<string, string>)[0] ?? ''
type Fn = (...a: any[]) => any

const HOY = '2026-11-12'
const AHORA = Date.parse(`${HOY}T15:00:00Z`)

let n = 0
/** Una fila de Reservaciones como la deja la página. */
const fila = (cliente: string, telefono: string, fecha: string, extra: Record<string, unknown> = {}) => ({
  ID: `r${++n}`, Cliente: cliente, Telefono: telefono, Servicios: 'Ajuste preventivo', Total: 20, Fecha_Cita: fecha, Hora_Cita: '10:00',
  Metodo_Pago: 'Pago en la cita', Estado: 'Confirmada', Profesional: 'Mecánico 1', ...extra,
})

function cargar(filas: Record<string, unknown>[]) {
  return funcionesGs<Record<string, Fn>>(gs, [
    'crmNegocio_', 'clientesDe_', 'claveCliente_', 'masRepetidos_', 'citasEntre_', 'diasEntre_', 'round2_', 'normKey_', 'ymd_', 'horaTexto_', 'toNumber_',
  ], {
    CRM_DIAS_INACTIVO: 120, CRM_VISITAS_FRECUENTE: 3, ZONA: 'America/Caracas',
    Utilities: { formatDate: () => HOY },
    openTenant_: () => ({}),
    getConfig_: () => ({ moneda: 'EUR' }),
    normalizarMoneda_: (m: string) => m,
    getSheetData_: () => filas,
  })
}

describe('Code.gs · CRM de Mi negocio', () => {
  // Pedro: viene cada ~30 días, 4 visitas (frecuente). Ana: 2 visitas con 46 días entre ellas y la última hace 84 (por volver).
  // Luis: una sola hace 200 días (inactivo). Sofía: primera cita la semana que viene (nueva).
  const filas = [
    fila('Pedro Silva', '0412-555-1111', '2026-08-14'),
    fila('Pedro Silva', '0412-555-1111', '2026-09-13', { Profesional: 'Mecánico 2' }),
    fila('Pedro S.', '+58 412 555 1111', '2026-10-14', { Servicios: 'Revisión general', Total: 10 }),
    fila('Pedro Silva', '04125551111', '2026-11-10'),
    fila('Pedro Silva', '04125551111', '2026-11-11', { Estado: 'Cancelada' }),
    fila('Ana Pérez', '04245550000', '2026-07-05'),
    fila('Ana Pérez', '04245550000', '2026-08-20', { Total: 25, Servicios: 'Ajuste preventivo motos 250cc' }),
    fila('Luis Rojas', '04165552222', '2026-04-26'),
    fila('Sofía Díaz', '04145553333', '2026-11-19', { Estado: 'Pago por verificar' }),
    fila('Sin teléfono', '', '2026-11-01'),
  ]
  const f = cargar(filas)

  it('agrupa por teléfono aunque se escriba distinto y calcula visitas, gasto y frecuencia', () => {
    const r = f.crmNegocio_('clientes', {}, {}, AHORA)
    const pedro = r.clientes.find((c: any) => c.clave === '4125551111')
    expect(pedro).toMatchObject({
      nombre: 'Pedro Silva', visitas: 4, canceladas: 1, gastado: 70, primera: '2026-08-14', ultima: '2026-11-10', cadaDias: 29, sinVenir: 2,
      frecuente: true, segmento: 'frecuente', persona: 'Mecánico 1', proxima: '',
    })
    expect(pedro.servicios).toEqual([{ nombre: 'Ajuste preventivo', n: 3 }, { nombre: 'Revisión general', n: 1 }])
    // El más fiel va primero.
    expect(r.clientes[0].clave).toBe('4125551111')
  })

  it('segmentos: por volver, inactivo y nuevo; sin teléfono, por el nombre', () => {
    const r = f.crmNegocio_('clientes', {}, {}, AHORA)
    const seg = Object.fromEntries(r.clientes.map((c: any) => [c.nombre, c.segmento]))
    expect(seg).toMatchObject({ 'Ana Pérez': 'por_volver', 'Luis Rojas': 'inactivo', 'Sofía Díaz': 'nuevo', 'Sin teléfono': 'nuevo' })
    expect(r.clientes.find((c: any) => c.nombre === 'Sofía Díaz')).toMatchObject({ visitas: 0, proxima: '2026-11-19 10:00' })
    expect(r.clientes.find((c: any) => c.nombre === 'Sin teléfono').clave).toBe('n:sintelefono')
    expect(r.totales).toEqual({ clientes: 5, frecuentes: 1, nuevos: 2, porVolver: 1, inactivos: 1, regresan: 50 })
    expect(r.moneda).toBe('EUR')
  })

  it('ficha de un cliente: su resumen y todas sus citas, la más nueva primero', () => {
    const r = f.crmNegocio_('cliente', {}, { cliente: '4125551111' }, AHORA)
    expect(r.cliente.nombre).toBe('Pedro Silva')
    expect(r.citas.map((c: any) => c.fecha)).toEqual(['2026-11-11', '2026-11-10', '2026-10-14', '2026-09-13', '2026-08-14'])
    expect(r.citas[0].estado).toBe('Cancelada')
    expect(f.crmNegocio_('cliente', {}, { cliente: 'nadie' }, AHORA)).toEqual({ error: 'no_existe', mensaje: 'No encontramos ese cliente.' })
  })

  it('historial: las citas de un mes (todas, también canceladas) y hasta dónde se puede navegar', () => {
    const r = f.crmNegocio_('historial', {}, { mes: '2026-11' }, AHORA)
    expect(r.citas.map((c: any) => c.fecha)).toEqual(['2026-11-19', '2026-11-11', '2026-11-10', '2026-11-01'])
    expect(r).toMatchObject({ mes: '2026-11', primerMes: '2026-04', ultimoMes: '2026-11' })
    expect(f.crmNegocio_('historial', {}, {}, AHORA).mes).toBe('2026-11')
    expect(f.crmNegocio_('historial', {}, { mes: '2026-06' }, AHORA).citas).toEqual([])
  })
})
