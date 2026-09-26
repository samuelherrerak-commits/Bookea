import { describe, expect, it } from 'vitest'
import { expirado, mmss, pctRestante, segundosRestantes, urgente } from './hold'

const AHORA = 1_757_000_000_000

describe('segundosRestantes', () => {
  it('devuelve los segundos que faltan', () => {
    expect(segundosRestantes(AHORA + 90_000, AHORA)).toBe(90)
    expect(segundosRestantes(AHORA + 30_000, AHORA)).toBe(30)
  })

  it('redondea hacia arriba para no quedarse en 0 antes de tiempo', () => {
    // Quedan 1.2 s: se muestra 2, porque un 0 prematuro hace creer que expiró.
    expect(segundosRestantes(AHORA + 1_200, AHORA)).toBe(2)
    expect(segundosRestantes(AHORA + 999, AHORA)).toBe(1)
  })

  it('nunca baja de cero', () => {
    expect(segundosRestantes(AHORA - 5_000, AHORA)).toBe(0)
    expect(segundosRestantes(AHORA - 500_000, AHORA)).toBe(0)
  })
})

describe('expirado', () => {
  it('expira justo en el límite', () => {
    expect(expirado(AHORA, AHORA)).toBe(true)
    expect(expirado(AHORA + 1, AHORA)).toBe(false)
  })
})

describe('mmss', () => {
  it('formatea minutos y segundos', () => {
    expect(mmss(90)).toBe('1:30')
    expect(mmss(5)).toBe('0:05')
    expect(mmss(60)).toBe('1:00')
  })

  it('no deja valores raros si recibe negativos', () => {
    expect(mmss(-10)).toBe('0:00')
  })
})

describe('pctRestante', () => {
  it('baja de 100 a 0 conforme pasa el tiempo', () => {
    expect(pctRestante(90, 90)).toBe(100)
    expect(pctRestante(45, 90)).toBe(50)
    expect(pctRestante(0, 90)).toBe(0)
  })

  it('se queda dentro de 0-100 aunque le pasen números raros', () => {
    expect(pctRestante(120, 90)).toBe(100)
    expect(pctRestante(-5, 90)).toBe(0)
    expect(pctRestante(10, 0)).toBe(0)
  })
})

describe('urgente', () => {
  it('avisa en los últimos 30 segundos', () => {
    expect(urgente(31)).toBe(false)
    expect(urgente(30)).toBe(true)
    expect(urgente(0)).toBe(true)
  })
})
