import { describe, expect, it } from 'vitest'
import { avisoRecordatorio, avisoReserva, avisoResumen, fechaCaracas } from './avisos'
import { manejarPush } from './index'
import { msDeCita } from './tiempo'

const cita = { id: 'r1', cliente: 'Carlos', servicios: 'Corte y barba', fecha: '2026-10-15', hora: '14:00' }

describe('avisos de Mi negocio', () => {
  it('nueva reserva y pago por verificar', () => {
    expect(avisoReserva('barberia', { ...cita, estado: 'Confirmada' })).toEqual({
      titulo: '📅 Nueva reserva',
      cuerpo: 'Carlos · Corte y barba\nJue 15 oct · 2:00 p. m.',
      tag: 'reserva-r1',
      url: '/negocio?n=barberia',
    })
    const pm = avisoReserva('barberia', { ...cita, estado: 'Pago por verificar' })
    expect(pm.titulo).toBe('💸 Pago por verificar')
    expect(pm.cuerpo).toContain('capture')
  })

  it('recordatorio con los minutos que faltan', () => {
    const inicio = msDeCita('2026-10-15', '14:00')
    const n = avisoRecordatorio('barberia', { ...cita, inicio }, inicio - 28 * 60000)
    expect(n.titulo).toBe('⏰ En 28 min: Carlos')
    expect(n.cuerpo).toBe('Corte y barba · 2:00 p. m.')
  })

  it('resumen de la mañana: cuántas y la primera; nada si no hay citas', () => {
    const n = avisoResumen('barberia', [cita, { ...cita, id: 'r2', cliente: 'Ana', hora: '09:30' }])
    expect(n?.titulo).toBe('☀️ Hoy tienes 2 citas')
    expect(n?.cuerpo).toBe('La primera a las 9:30 a. m.: Ana · Corte y barba')
    expect(avisoResumen('barberia', [])).toBeNull()
  })

  it('el día en Caracas cambia a medianoche de Caracas, no de UTC', () => {
    expect(fechaCaracas(Date.UTC(2026, 9, 10, 3, 30))).toBe('2026-10-09') // 11:30 p. m. del 9 en Caracas
    expect(fechaCaracas(Date.UTC(2026, 9, 10, 4, 30))).toBe('2026-10-10')
  })

  it('las rutas /push/* piden el token del bot (menos la clave pública)', async () => {
    const env = { BOT_TOKEN: 'bot_' + 'x'.repeat(40) } as any
    const post = (token: string) => new Request('https://w/push/evento', { method: 'POST', headers: { authorization: 'Bearer ' + token }, body: '{}' })
    expect((await manejarPush(post('malo'), '/push/evento', env)).status).toBe(401)
    expect((await manejarPush(post(env.BOT_TOKEN), '/push/evento', env)).status).toBe(400) // sin negocio
  })
})
