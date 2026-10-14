import { describe, expect, it } from 'vitest'
import { slugDe, telefonoWa } from './api'
import { sumarMeses } from './CentralApp'

describe('central', () => {
  it('el link sale del nombre como lo acepta crearTenant', () => {
    expect(slugDe('Barbería El Corte')).toBe('barberia-el-corte')
    expect(slugDe('  Uñas & Spa  María!! ')).toBe('unas-spa-maria')
    expect(slugDe('x'.repeat(50))).toHaveLength(32)
  })
  it('meses igual que el Apps Script (fin de mes)', () => {
    expect(sumarMeses('2026-01-31', 1)).toBe('2026-02-28')
    expect(sumarMeses('2026-10-12', 2)).toBe('2026-12-12')
  })
  it('teléfono a wa.me', () => {
    expect(telefonoWa('0412-555 1234')).toBe('584125551234')
  })
})
