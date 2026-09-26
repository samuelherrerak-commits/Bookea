import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchData, getShopSlug } from '../lib/api'
import { readCatalogCache } from '../lib/catalogCache'
import type { Catalog } from '../types'

type CatalogState =
  | { status: 'loading'; catalog: null; error: null }
  | { status: 'ready'; catalog: Catalog; error: null }
  | { status: 'error'; catalog: null; error: string }

/** Lo que había en localStorage al abrir la página, si sigue vigente. */
function cachedCatalog(): Catalog | null {
  return readCatalogCache(getShopSlug())
}

export function useCatalog() {
  // Sin caché arranca en loading y se ve el esqueleto neutro. Con caché arranca
  // en ready: el negocio se ve de inmediato y la red solo revalida por detrás.
  const [state, setState] = useState<CatalogState>(() => {
    const catalog = cachedCatalog()
    return catalog ? { status: 'ready', catalog, error: null } : { status: 'loading', catalog: null, error: null }
  })
  const hayCache = useRef(state.status === 'ready')
  // StrictMode monta dos veces en dev: sin esto salen dos peticiones en paralelo.
  const pidio = useRef(false)

  const load = useCallback(async () => {
    setState({ status: 'loading', catalog: null, error: null })
    try {
      const catalog = await fetchData()
      hayCache.current = true
      setState({ status: 'ready', catalog, error: null })
    } catch (e) {
      setState({ status: 'error', catalog: null, error: e instanceof Error ? e.message : 'Error desconocido' })
    }
  }, [])

  /**
   * Vuelve a pedir la ocupación sin sacar lo que ya se ve.
   * `fresh` salta la caché de 5 min del servidor: entra al elegir hora, que es
   * donde un cupo obsoleto sí haría daño.
   */
  const refresh = useCallback(async (options: { fresh?: boolean } = {}) => {
    try {
      const catalog = await fetchData(options)
      setState({ status: 'ready', catalog, error: null })
    } catch {
      /* se mantiene lo que ya había */
    }
  }, [])

  useEffect(() => {
    if (pidio.current) return
    pidio.current = true
    if (!hayCache.current) {
      void load() // sin caché: loading → ready, o loading → error
      return
    }
    // Con caché: revalidación silenciosa, sin volver a loading. Si falla, se
    // mantiene lo que ya se está viendo.
    void (async () => {
      try {
        const catalog = await fetchData()
        setState({ status: 'ready', catalog, error: null })
      } catch {
        /* nos quedamos con la caché */
      }
    })()
  }, [load])

  return { ...state, retry: load, refresh }
}
