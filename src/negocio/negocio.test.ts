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
