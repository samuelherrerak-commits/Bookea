import { describe, expect, it } from 'vitest'
import { eleccionValida, lugarElegido, opcionesLugar } from './lugar'

const sede = (nombre: string, direccion = '') => ({ id: nombre.toLowerCase().replace(/ /g, '-'), nombre, direccion, mapsUrl: '' })
const cfg = (sedes: ReturnType<typeof sede>[], permiteDomicilio: boolean) => ({
  lugar: { tipo: 'consultorio', etiqueta: 'el consultorio', sedes },
  permiteDomicilio,
  domicilio: { recargoPct: 20, minutosExtra: 15 },
})

describe('opcionesLugar', () => {
  it('una sede sin domicilio: una sola opción, "En el consultorio"', () => {
    const o = opcionesLugar(cfg([sede('El consultorio', 'Av. 1')], false))
    expect(o).toHaveLength(1)
    expect(o[0]).toMatchObject({ modalidad: 'local', titulo: 'En el consultorio', detalle: 'Av. 1' })
  })

  it('varias sedes y domicilio: una por sede con su nombre, más domicilio con recargo', () => {
    const o = opcionesLugar(cfg([sede('Sede Centro'), sede('Sede Norte')], true))
    expect(o.map((x) => x.titulo)).toEqual(['Sede Centro', 'Sede Norte', 'A domicilio'])
    expect(o[2].detalle).toBe('+20 % · +15 min')
  })
})

describe('lugarElegido y eleccionValida', () => {
  const c = cfg([sede('Sede Centro'), sede('Sede Norte')], false)
  it('describe la sede elegida', () => {
    expect(lugarElegido(c, 'local', 'sede-norte').titulo).toBe('En Sede Norte')
    expect(lugarElegido(c, 'domicilio', null).titulo).toBe('A domicilio')
  })
  it('una elección vieja deja de valer si la sede o el domicilio ya no existen', () => {
    expect(eleccionValida(c, 'local', 'sede-norte')).toBe(true)
    expect(eleccionValida(c, 'local', 'sede-sur')).toBe(false)
    expect(eleccionValida(c, 'domicilio', null)).toBe(false)
    expect(eleccionValida(c, null, null)).toBe(false)
  })
})
