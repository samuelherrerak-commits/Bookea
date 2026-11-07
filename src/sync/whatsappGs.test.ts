import { describe, expect, it } from 'vitest'
import { funcionesGs } from './appsScript'

const gs = Object.values(import.meta.glob('../../apps-script/Code.gs', { query: '?raw', import: 'default', eager: true }) as Record<string, string>)[0] ?? ''

describe('Code.gs · WhatsApp del negocio nuevo (alta desde la central)', () => {
  const f = funcionesGs<{ whatsappDe_: (t: unknown) => string }>(gs, ['whatsappDe_'], {})

  it('el teléfono del alta queda listo para wa.me', () => {
    expect(f.whatsappDe_('0412 555 1234')).toBe('584125551234')
    expect(f.whatsappDe_('412-555-1234')).toBe('584125551234')
    expect(f.whatsappDe_('+58 412 555 1234')).toBe('584125551234')
    expect(f.whatsappDe_('+57 300 123 4567')).toBe('573001234567')
  })

  it('sin teléfono (o uno que no lo es) no guarda nada', () => {
    expect(f.whatsappDe_('')).toBe('')
    expect(f.whatsappDe_(undefined)).toBe('')
    expect(f.whatsappDe_('12345')).toBe('')
  })
})
