import { describe, expect, it } from 'vitest'
import { elegirPlantilla, PLANTILLAS_MENSAJE, renderMensaje, VARIABLES_MENSAJE } from './mensajes'

describe('renderMensaje', () => {
  it('reemplaza variables y borra las líneas cuyas variables quedaron vacías', () => {
    const texto = 'Hola {nombre}\n🎟️ {cupon}\nTotal: {total}'
    expect(renderMensaje(texto, { nombre: 'Ana', cupon: '', total: '10 €' })).toBe('Hola Ana\nTotal: 10 €')
  })

  it('una línea se queda si al menos una de sus variables tiene valor', () => {
    expect(renderMensaje('{cupon} · {total}', { cupon: '', total: '5 €' })).toBe('· 5 €')
  })

  it('las líneas sin variables y las variables desconocidas se respetan', () => {
    expect(renderMensaje('Gracias\n{nombre} {desconocida}', { nombre: 'Ana' })).toBe('Gracias\nAna {desconocida}')
  })

  it('no deja más de una línea en blanco seguida ni espacios al borde', () => {
    expect(renderMensaje('\nA\n\n{cupon}\n\nB\n', { cupon: '' })).toBe('A\n\nB')
  })

  it('las 3 plantillas solo usan variables conocidas', () => {
    expect(PLANTILLAS_MENSAJE.map((p) => p.nombre)).toEqual(['Cálida', 'Formal', 'Breve'])
    for (const p of PLANTILLAS_MENSAJE) {
      for (const [, v] of p.texto.matchAll(/\{([a-z_]+)\}/g)) expect(VARIABLES_MENSAJE).toContain(v)
    }
  })
})

describe('elegirPlantilla', () => {
  const hoja = [
    { nombre: 'Cálida', texto: 'A' },
    { nombre: 'Mi versión', texto: 'B' },
  ]
  it('encuentra por nombre sin tildes ni mayúsculas', () => {
    expect(elegirPlantilla(hoja, 'calida').texto).toBe('A')
    expect(elegirPlantilla(hoja, ' MI VERSIÓN ').texto).toBe('B')
  })
  it('si el nombre no existe usa la primera de la hoja; sin hoja, la Cálida de siempre', () => {
    expect(elegirPlantilla(hoja, 'otra').texto).toBe('A')
    expect(elegirPlantilla([], 'Formal').nombre).toBe('Formal')
    expect(elegirPlantilla([], '').nombre).toBe('Cálida')
  })
})
