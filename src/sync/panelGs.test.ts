import { describe, expect, it } from 'vitest'
import { funcionesGs } from './appsScript'

const gs = Object.values(import.meta.glob('../../apps-script/Code.gs', { query: '?raw', import: 'default', eager: true }) as Record<string, string>)[0] ?? ''
type Fn = (...a: any[]) => any

const f = funcionesGs<Record<string, Fn>>(gs, ['periodoPanel_', 'resumenPeriodo_', 'finDeMes_', 'inicioDeMes_', 'diaSemana_', 'sumarDias_', 'ymd_', 'toNumber_', 'round2_'], {
  ESTADO_POR_VERIFICAR: 'Pago por verificar', ZONA: 'America/Caracas',
  Utilities: { formatDate: (d: Date) => d.toISOString().slice(0, 10) },
})

const HOY = '2026-10-23' // viernes

describe('Code.gs · panel de Mi negocio', () => {
  it('períodos y el anterior para comparar', () => {
    expect(f.periodoPanel_('hoy', HOY)).toMatchObject({ desde: HOY, hasta: HOY, anterior: { desde: '2026-10-22', hasta: '2026-10-22' } })
    expect(f.periodoPanel_('semana', HOY)).toMatchObject({ desde: '2026-10-19', hasta: '2026-10-25', anterior: { desde: '2026-10-12', hasta: '2026-10-18' } })
    expect(f.periodoPanel_('mes', HOY)).toMatchObject({ desde: '2026-10-01', hasta: '2026-10-31', anterior: { desde: '2026-09-01', hasta: '2026-09-30' } })
    expect(f.periodoPanel_('mes_pasado', HOY)).toMatchObject({ desde: '2026-09-01', hasta: '2026-09-30', anterior: { desde: '2026-08-01', hasta: '2026-08-31' } })
    expect(f.periodoPanel_('30', HOY)).toMatchObject({ desde: '2026-09-24', hasta: HOY })
    expect(f.periodoPanel_('12m', HOY)).toMatchObject({ desde: '2025-11-01', hasta: '2026-10-31', porMes: true, anterior: { desde: '2024-11-01', hasta: '2025-10-31' } })
    expect(f.periodoPanel_('cualquiera', HOY).periodo).toBe('mes')
  })

  it('cuánto hizo: atendido y agendado, por persona, servicio y forma de pago; canceladas aparte', () => {
    const fila = (fecha: string, total: number, persona: string, extra: Record<string, unknown> = {}) => ({
      Fecha_Cita: fecha, Total: total, Profesional: persona, Servicios: 'Corte, Barba', Metodo_Pago: 'Pago en la cita', Estado: 'Confirmada', Telefono: '0412' + fecha, ...extra,
    })
    const r = f.resumenPeriodo_([
      fila('2026-10-02', 20, 'Carla'),
      fila('2026-10-10', 10, 'Andrea', { Metodo_Pago: 'Bolívares (Pago Móvil)', Estado: 'Pago por verificar' }),
      fila('2026-10-28', 30, 'Carla'), // todavía no llega
      fila('2026-10-12', 99, 'Carla', { Estado: 'Cancelada' }),
      fila('2026-09-30', 50, 'Carla'), // otro mes
    ], '2026-10-01', '2026-10-31', HOY, false)
    expect(r).toMatchObject({
      reservas: 3, ingresos: 60, atendidas: 2, ingresosAtendidas: 30, agendadas: 1, ingresosAgendadas: 30,
      porVerificar: 1, ingresosPorVerificar: 10, canceladas: 1, ingresosCancelados: 99, ticket: 20, clientes: 3,
    })
    expect(r.porPersona).toEqual([{ nombre: 'Carla', n: 2, ingresos: 50 }, { nombre: 'Andrea', n: 1, ingresos: 10 }])
    expect(r.porServicio).toEqual([{ nombre: 'Corte', n: 3, ingresos: 30 }, { nombre: 'Barba', n: 3, ingresos: 30 }])
    expect(r.porMetodo[0]).toEqual({ nombre: 'Pago en la cita', n: 2, ingresos: 50 })
    expect(r.serie).toHaveLength(31)
    expect(r.serie.find((d: any) => d.clave === '2026-10-02')).toEqual({ clave: '2026-10-02', n: 1, ingresos: 20 })
  })

  it('en 12 meses la serie va por mes', () => {
    const r = f.resumenPeriodo_([{ Fecha_Cita: '2026-03-05', Total: 15, Estado: 'Confirmada' }], '2025-11-01', '2026-10-31', HOY, true)
    expect(r.serie).toHaveLength(12)
    expect(r.serie[0].clave).toBe('2025-11')
    expect(r.serie.find((m: any) => m.clave === '2026-03')).toEqual({ clave: '2026-03', n: 1, ingresos: 15 })
  })
})
