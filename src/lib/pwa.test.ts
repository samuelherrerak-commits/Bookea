import { describe, expect, it } from 'vitest'
import { manifestDe } from './pwa'

describe('app en la pantalla de inicio', () => {
  it('el manifest del negocio abre en su página, con su nombre y a pantalla completa', () => {
    const m = manifestDe({ nombre: 'Barbería Norte del Este', ruta: '/u/barberia-norte', color: '#FDFBF7' }, 'https://www.bookeaa.com')
    expect(m.start_url).toBe('https://www.bookeaa.com/u/barberia-norte')
    expect(m.id).toBe(m.start_url)
    expect(m.display).toBe('standalone')
    expect(m.name).toBe('Barbería Norte del Este')
    expect(m.short_name.length).toBeLessThanOrEqual(14)
    expect(m.icons.every((i) => i.src.startsWith('https://www.bookeaa.com/icon-'))).toBe(true)
  })
})
