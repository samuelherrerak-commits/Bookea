import { describe, expect, it } from 'vitest'
import { hoyCaracas } from './api'
import { telefonoWa } from './NegocioApp'

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
