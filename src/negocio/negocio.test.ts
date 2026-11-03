import { describe, expect, it } from 'vitest'
import { hoyCaracas } from './api'
import { telefonoWa } from './NegocioApp'
import { seccionesDe } from './Configurar'
import { mensajeCancelada, mensajeReagendada } from './Reagendar'

describe('Mi negocio', () => {
  it('teléfono venezolano a formato de wa.me', () => {
    expect(telefonoWa('0412 555 1234')).toBe('584125551234')
    expect(telefonoWa('+58 412-555-1234')).toBe('584125551234')
  })

  it('el día de hoy es el de Caracas', () => {
    expect(hoyCaracas(Date.UTC(2026, 9, 10, 2))).toBe('2026-10-09') // 10:00 p. m. del 9 en Caracas
    expect(hoyCaracas(Date.UTC(2026, 9, 10, 12))).toBe('2026-10-10')
  })
})

describe('QR del negocio', () => {
  it('el link es siempre la página del negocio', async () => {
    const { linkDelNegocio, matrizQr, coloresQr } = await import('./qr')
    expect(linkDelNegocio('barberia-norte', 'https://www.bookeaa.com')).toBe('https://www.bookeaa.com/u/barberia-norte')
    expect(matrizQr('https://www.bookeaa.com/u/barberia-norte').getModuleCount()).toBeGreaterThanOrEqual(25)
    // Los módulos siempre oscuros sobre blanco, aunque el color del negocio sea claro.
    const c = coloresQr({ color_principal: '#F6E6E9', color_fondo: '', paleta: '' }, 'marca')
    expect(c.tarjeta).toBe('#FFFFFF')
    expect(c.modulos).not.toBe('#F6E6E9')
  })
})

describe('reagendar: el mensaje para el cliente', () => {
  it('con su nombre, el día, la hora y con quién', () => {
    expect(mensajeReagendada({ cliente: 'Pedro Silva', negocio: 'Barbería Norte', servicios: 'Corte', fecha: '2026-10-24', hora: '13:00', persona: 'Andrés Rojas' }))
      .toBe('Hola Pedro, te escribimos de Barbería Norte. Tu cita de Corte quedó para el sábado 24 de octubre a las 1:00 p. m. con Andrés. ¿Te queda bien?')
    expect(mensajeReagendada({ cliente: '', negocio: 'Spa', servicios: 'Masaje', fecha: '2026-10-26', hora: '09:00' }))
      .toBe('Hola, te escribimos de Spa. Tu cita de Masaje quedó para el lunes 26 de octubre a las 9:00 a. m. ¿Te queda bien?')
  })
})

describe('Configurar: Equipo solo con bookeaa team', () => {
  it('un negocio individual no ve la sección Equipo; uno team sí', () => {
    const ids = (plan?: 'individual' | 'team') =>
      seccionesDe({ equipo: plan ? { plan, activo: false, modo: 'servicio', cualquiera: true, personas: [] } : undefined }).map((s) => s.id)
    expect(ids()).not.toContain('equipo')
    expect(ids('individual')).not.toContain('equipo')
    expect(ids('team')).toContain('equipo')
    expect(ids('team')).toHaveLength(ids('individual').length + 1)
  })
})

describe('cancelar: el mensaje para el cliente', () => {
  it('con el día, la hora y el link para reservar otra', () => {
    expect(mensajeCancelada({ cliente: 'Ana Pérez', negocio: 'Spa Sol', servicios: 'Masaje', fecha: '2026-11-05', hora: '15:00', link: 'https://www.bookeaa.com/u/spa-sol' }))
      .toBe('Hola Ana, te escribimos de Spa Sol. Tu cita de Masaje del jueves 5 de noviembre a las 3:00 p. m. quedó cancelada. Cuando quieras, puedes reservar otra aquí: https://www.bookeaa.com/u/spa-sol')
  })
})
