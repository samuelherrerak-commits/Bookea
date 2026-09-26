import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { clearCatalogCache, readCatalogCache, writeCatalogCache } from './catalogCache'
import { DEFAULT_CONFIG } from './normalize'
import type { Row } from './normalize'

const SLUG = 'samuel-herrera'

function fakeLocalStorage(): Storage {
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

/** Payload mínimo que normalizeCatalog convierte en un Catalog con la config dada. */
function payload(over: Row = {}): Row {
  return {
    servicios: [],
    promociones: [],
    horarios: [],
    config: { marca: 'Samuel Herrera', nombre_negocio: 'Samuel Herrera', tema_base: '#123456' },
    tasa: 40,
    moneda: 'USD',
    ...over,
  }
}

describe('catalogCache', () => {
  beforeEach(() => {
    ;(globalThis as { localStorage?: Storage }).localStorage = fakeLocalStorage()
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
    delete (globalThis as { localStorage?: Storage }).localStorage
  })

  it('devuelve null si no hay nada guardado', () => {
    expect(readCatalogCache(SLUG)).toBeNull()
  })

  it('guarda y devuelve el catálogo normalizado', () => {
    writeCatalogCache(SLUG, payload())
    const cached = readCatalogCache(SLUG)
    expect(cached?.config.marca).toBe('Samuel Herrera')
    expect(cached?.config.tema.base).toBe('#123456')
  })

  it('separa el caché por negocio', () => {
    writeCatalogCache('negocio-a', payload({ config: { nombre_negocio: 'Negocio A' } }))
    writeCatalogCache('negocio-b', payload({ config: { nombre_negocio: 'Negocio B' } }))
    expect(readCatalogCache('negocio-a')?.config.nombreNegocio).toBe('Negocio A')
    expect(readCatalogCache('negocio-b')?.config.nombreNegocio).toBe('Negocio B')
  })

  it('sigue vigente a los 29 minutos y vence a los 31', () => {
    writeCatalogCache(SLUG, payload())

    vi.advanceTimersByTime(29 * 60 * 1000)
    expect(readCatalogCache(SLUG)).not.toBeNull()

    vi.advanceTimersByTime(2 * 60 * 1000)
    expect(readCatalogCache(SLUG)).toBeNull()
  })

  it('borra la entrada vencida para no dejarla ocupando espacio', () => {
    writeCatalogCache(SLUG, payload())
    vi.advanceTimersByTime(31 * 60 * 1000)
    readCatalogCache(SLUG)
    expect((globalThis as { localStorage: Storage }).localStorage.length).toBe(0)
  })

  it('sobrevive a datos corruptos sin romper la app', () => {
    const ls = (globalThis as { localStorage: Storage }).localStorage
    ls.setItem(`catalogo:v1:${SLUG}`, '{no es json')
    expect(readCatalogCache(SLUG)).toBeNull()

    ls.setItem(`catalogo:v1:${SLUG}`, JSON.stringify({ t: 'nope' }))
    expect(readCatalogCache(SLUG)).toBeNull()

    ls.setItem(`catalogo:v1:${SLUG}`, JSON.stringify({ t: Date.now() }))
    expect(readCatalogCache(SLUG)).toBeNull() // sin payload no hay nada que normalizar

    ls.setItem(`catalogo:v1:${SLUG}`, JSON.stringify({ t: Date.now(), payload: payload() }))
    expect(readCatalogCache(SLUG)).not.toBeNull()
  })

  it('normaliza al leer, no guarda la forma ya normalizada', () => {
    // Si guardáramos el Catalog, un cambio futuro en el normalizador no se aplicaría
    // al caché. Guardando el Row crudo, siempre pasa por normalizeCatalog.
    writeCatalogCache(SLUG, { config: { tema_base: '#abcdef' } })
    expect(readCatalogCache(SLUG)?.config.nombreNegocio).toBe(DEFAULT_CONFIG.nombreNegocio)
  })

  it('clearCatalogCache borra solo el negocio indicado', () => {
    writeCatalogCache('negocio-a', payload())
    writeCatalogCache('negocio-b', payload())
    clearCatalogCache('negocio-a')
    expect(readCatalogCache('negocio-a')).toBeNull()
    expect(readCatalogCache('negocio-b')).not.toBeNull()
  })
})
