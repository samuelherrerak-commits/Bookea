import { describe, expect, it } from 'vitest'
import { contrast, derivarAcento, derivarNeutros, ensureContrast, hexToRgb, isDark, luminance, mix, rgbToHex } from './color'

describe('conversiones', () => {
  it('ida y vuelta de hex, con o sin # y en formato corto', () => {
    expect(rgbToHex(hexToRgb('#1f6f5c'))).toBe('#1F6F5C')
    expect(rgbToHex(hexToRgb('abc'))).toBe('#AABBCC')
    expect(mix('#000000', '#FFFFFF', 0.5)).toBe('#808080')
  })
})

describe('derivarAcento', () => {
  const casos = ['#F2C94C', '#E5B8C1', '#1F6F5C', '#FF5A36', '#8FA8C8']

  it('el tono de acento siempre se lee sobre fondo claro (≥ 4.5:1)', () => {
    for (const c of casos) expect(contrast(derivarAcento(c, '#FFFFFF').deep, '#FFFFFF')).toBeGreaterThanOrEqual(4.5)
  })

  it('y también sobre fondo oscuro', () => {
    for (const c of casos) expect(contrast(derivarAcento(c, '#111111').deep, '#111111')).toBeGreaterThanOrEqual(4.5)
  })

  it('un color que ya se lee no se toca', () => {
    expect(derivarAcento('#1F6F5C', '#FFFFFF').deep).toBe('#1F6F5C')
  })
})

describe('derivarNeutros', () => {
  for (const fondo of ['#FFFFFF', '#FDFBF7', '#F4EFE6', '#111111', '#1E2A3A', '#3A2E2A']) {
    it(`texto y texto secundario legibles sobre ${fondo}`, () => {
      const n = derivarNeutros(fondo)
      expect(contrast(n.ink, n.bg)).toBeGreaterThanOrEqual(7)
      expect(contrast(n.muted, n.bg)).toBeGreaterThanOrEqual(4.5)
      expect(isDark(n.ink)).toBe(!isDark(fondo))
    })
  }

  it('ensureContrast empuja hacia el lado correcto', () => {
    const sobreBlanco = ensureContrast('#F2C94C', '#FFFFFF')
    const sobreNegro = ensureContrast('#1F2A44', '#000000')
    expect(contrast(sobreBlanco, '#FFFFFF')).toBeGreaterThanOrEqual(4.5)
    expect(luminance(sobreBlanco)).toBeLessThan(luminance('#F2C94C'))
    expect(contrast(sobreNegro, '#000000')).toBeGreaterThanOrEqual(4.5)
    expect(luminance(sobreNegro)).toBeGreaterThan(luminance('#1F2A44'))
  })
})
