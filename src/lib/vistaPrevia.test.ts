import { describe, expect, it } from 'vitest'
import { normalizeCatalog } from './normalize'
import { aplicarBorrador } from './vistaPrevia'

const base = normalizeCatalog({
  config: { marca: 'Viejo', hero_titulo: 'Hola', paleta: 'Rosa Clásico', whatsapp: '584121234567' },
  servicios: [{ ID: 'corte', Nombre: 'Corte', Precio: 10, Duracion_Min: 30, Tipo: 'Cabello' }],
})

describe('vista previa del configurador', () => {
  it('pone el borrador encima sin tocar lo que no se edita', () => {
    const v = aplicarBorrador(base, {
      config: { marca: 'Barbería Norte', hero_titulo: 'Tu corte, cuando quieras', paleta: 'Bosque', color_principal: '#7FA894' },
      logo: '',
    })
    expect(v.config.marca).toBe('Barbería Norte')
    expect(v.config.heroTitulo).toBe('Tu corte, cuando quieras')
    expect(v.config.tema.base.toUpperCase()).toBe('#7FA894')
    expect(v.config.whatsapp).toBe(base.config.whatsapp)
    expect(v.servicios).toBe(base.servicios)
  })

  it('servicios del borrador: adicionales y categorías como en la hoja', () => {
    const v = aplicarBorrador(base, { servicios: [
      { id: '', nombre: 'Barba', precio: 8, duracion: 20, categoria: 'Barba', adicional: false },
      { id: '', nombre: 'Lavado', precio: 3, duracion: 10, categoria: '', adicional: true },
      { id: '', nombre: '  ', precio: 1, duracion: 10, categoria: '', adicional: false },
    ] })
    expect(v.servicios.map((s) => [s.nombre, s.tipo, s.categoria])).toEqual([['Barba', 'base', 'Barba'], ['Lavado', 'adicional', 'Servicios']])
    expect(v.config).toBe(base.config)
  })
})
