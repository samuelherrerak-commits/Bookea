import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { clearReservaId, getReservaId } from './reservaId'

function fakeStorage(): Storage {
  const data = new Map<string, string>()
  return {
    get length() {
      return data.size
    },
    clear: () => data.clear(),
    getItem: (k: string) => data.get(k) ?? null,
    key: (i: number) => [...data.keys()][i] ?? null,
    removeItem: (k: string) => void data.delete(k),
    setItem: (k: string, v: string) => void data.set(k, v),
  }
}

describe('reservaId', () => {
  beforeEach(() => {
    ;(globalThis as { sessionStorage?: Storage }).sessionStorage = fakeStorage()
  })
  afterEach(() => {
    delete (globalThis as { sessionStorage?: Storage }).sessionStorage
  })

  // Es lo que hace seguro reintentar: el mismo intento tiene que seguir enviando
  // el mismo id, o el servidor lo tomaría por una reserva nueva y rechazaría el
  // reintento con "ocupado".
  it('devuelve siempre el mismo id dentro de un mismo intento', () => {
    const primero = getReservaId()
    expect(getReservaId()).toBe(primero)
    expect(getReservaId()).toBe(primero)
  })

  it('limpiar sin un id previo no rompe', () => {
    expect(() => clearReservaId()).not.toThrow()
    // Y el id siguiente sigue siendo utilizable.
    expect(getReservaId()).toBeTruthy()
  })

  it('arranca un id nuevo después de confirmar', () => {
    const primero = getReservaId()
    clearReservaId()
    expect(getReservaId()).not.toBe(primero)
  })

  it('no rompe si el navegador bloquea el almacenamiento', () => {
    ;(globalThis as { sessionStorage?: Storage }).sessionStorage = undefined
    const id = getReservaId()
    expect(id).toBeTruthy()
    expect(() => clearReservaId()).not.toThrow()
  })
})
