import { describe, expect, it } from 'vitest'
import { normalizeSlug, shopPath, slugToNombre } from './tenant'

describe('shopPath', () => {
  it('arma la ruta /u/<slug> que es la que lee la app', () => {
    expect(shopPath('samuel-herrera')).toBe('/u/samuel-herrera')
  })

  it('normaliza lo que venga de VITE_DEFAULT_SHOP', () => {
    expect(shopPath('  Samuel-Herrera  ')).toBe('/u/samuel-herrera')
    expect(shopPath('SALON')).toBe('/u/salon')
  })

  it('devuelve null si el slug no sirve, para no redirigir a una ruta rota', () => {
    expect(shopPath('')).toBeNull()
    expect(shopPath('   ')).toBeNull()
    expect(shopPath('---')).toBeNull()
    expect(shopPath('-salon-')).toBeNull()
    expect(shopPath('salon de belleza')).toBeNull()
    expect(shopPath('ñandú')).toBeNull()
    // normalizeSlug no vuelve a mirar el largo en su rama de respaldo, asi que
    // el limite de 40 se comprueba aca.
    expect(shopPath('a'.repeat(41))).toBeNull()
  })
})

describe('normalizeSlug', () => {
  it('deja pasar los slugs bien formados', () => {
    expect(normalizeSlug('samuel-herrera')).toBe('samuel-herrera')
    expect(normalizeSlug('  Salon  ')).toBe('salon')
  })

  it('rechaza lo que no puede ser ruta', () => {
    expect(normalizeSlug('salon/bella')).toBeNull()
    expect(normalizeSlug('ñandú')).toBeNull()
    expect(normalizeSlug('')).toBeNull()
  })

  // Documenta una rareza que se hereda de la app original: un slug con guiones
  // al borde pasa el filtro porque SLUG_RE los admite como caracter valido. No se
  // cambia porque decide que negocios resuelven; shopPath es quien lo descarta.
  it('admite guiones al borde, cosa que shopPath descarta', () => {
    expect(normalizeSlug('-salon-')).toBe('-salon-')
  })
})

describe('slugToNombre', () => {
  it('parte el slug para mostrarlo como nombre', () => {
    expect(slugToNombre('samuel-herrera')).toBe('Samuel Herrera')
    expect(slugToNombre('salon')).toBe('Salon')
  })
})
