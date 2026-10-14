import { describe, expect, it } from 'vitest'
import { funcionesGs } from './appsScript'

const gs = Object.values(import.meta.glob('../../apps-script/Code.gs', { query: '?raw', import: 'default', eager: true }) as Record<string, string>)[0] ?? ''
type Fn = (...a: any[]) => any

const f = funcionesGs<Record<string, Fn>>(gs, [
  'ultimosMeses_', 'diaSemana_', 'sumarConteo_', 'rankingConteo_', 'estadisticasReservas_', 'sumarDias_', 'ymd_', 'horaTexto_', 'toNumber_', 'round2_',
], {
  METRICAS_MESES: 12, DIAS_SEMANA_CORTO: ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'], ZONA: 'America/Caracas',
  Utilities: { formatDate: (d: Date) => d.toISOString().slice(0, 10) },
})

const fila = (fecha: string, hora: string, cliente: string, tel: string, servicios: string, total: number, estado = 'Confirmada', extra: Record<string, unknown> = {}) => ({
  ID: Math.random().toString(36), Fecha_Solicitud: fecha, Cliente: cliente, Telefono: tel, Servicios: servicios, Total: total,
  Fecha_Cita: fecha, Hora_Cita: hora, Metodo_Pago: 'Pago Móvil', Cupon: 'N/A', Estado: estado, Modalidad: 'En la barbería', ...extra,
})

describe('Code.gs · métricas de la central', () => {
  it('últimos 12 meses y día de la semana', () => {
    const m = f.ultimosMeses_('2026-10-14', 12)
    expect(m[0]).toBe('2025-11')
    expect(m.at(-1)).toBe('2026-10')
    expect(m).toHaveLength(12)
    expect(f.diaSemana_('2026-10-14')).toBe(3) // miércoles
  })

  it('cuenta reservas por mes, últimos 30 días, clientes y recurrentes; las canceladas aparte', () => {
    const filas = [
      fila('2026-10-10', '10:00', 'Ana', '0412-111.2233', 'Corte, Barba', 20),
      fila('2026-10-12', '15:30', 'Ana', '584121112233', 'Corte', 10, 'Confirmada', { Cupon: 'BIENVENIDA' }),
      fila('2026-09-20', '10:00', 'Luis', '04245556677', 'Corte', 10),
      fila('2026-09-01', '11:00', 'Eva', '04140000000', 'Barba', 8, 'Cancelada'),
      fila('2026-10-20', '09:00', 'Eva', '04140000000', 'Corte', 10, 'Pago por verificar'),
      fila('2025-01-10', '09:00', 'Viejo', '04160000000', 'Corte', 10), // fuera de los 12 meses
    ]
    const e = f.estadisticasReservas_(filas, '2026-10-14', true)
    expect(e.porMes.at(-1)).toBe(3) // 10, 12 y 20 de octubre
    expect(e.porMes.at(-2)).toBe(1)
    expect(e.canceladasMes.at(-2)).toBe(1)
    expect(e.ingresosMes.at(-1)).toBe(40)
    expect(e.total).toBe(5)
    expect(e.canceladas).toBe(1)
    expect(e.ultimos30).toBe(3) // 20 sep, 10 y 12 oct
    expect(e.proximas).toBe(1)
    expect(e.ultimaSolicitud).toBe('2026-10-20')
    expect(e.clientes).toBe(4) // Ana (mismo número con distinto formato), Luis, Eva, Viejo
    expect(e.recurrentes).toBe(1)
    expect(e.conCupon).toBe(1)
    expect(e.servicios[0]).toEqual({ nombre: 'Corte', n: 5, ingresos: 50 })
    expect(e.servicios[1]).toEqual({ nombre: 'Barba', n: 1, ingresos: 10 })
    expect(e.estados.map((x: { nombre: string }) => x.nombre)).toContain('Cancelada')
    expect(e.horas.desde).toBe(9)
    expect(e.horas.hasta).toBe(15)
    expect(e.horas.mapa[6][10 - 9]).toBe(1) // sábado 10 oct a las 10
    expect(e.clientesNuevosMes.at(-1)).toBe(2) // Ana y Eva: su cita cancelada de septiembre no cuenta como visita
  })

  it('sin reservas no falla', () => {
    const e = f.estadisticasReservas_([], '2026-10-14', true)
    expect(e.total).toBe(0)
    expect(e.ticket).toBe(0)
    expect(e.horas.mapa).toHaveLength(7)
  })
})
