import type { Catalog } from '../types'
import type { Row } from './normalize'
import { normalizeCatalog } from './normalize'

/**
 * Caché del catálogo en localStorage para que la vuelta al catálogo pinte el
 * negocio real en el primer frame, sin esqueleto ni destello de color.
 *
 * Guarda el payload CRUDO del servidor, no el catálogo normalizado: al leerlo
 * siempre pasa por normalizeCatalog, así que un cambio en el normalizador no
 * deja datos con la forma de una versión vieja.
 *
 * TTL generoso (30 min) porque no arriesga los importes: el servidor recalcula
 * el total desde la hoja al reservar y rechaza lo que no cuadra. La ocupación
 * sí se refresca aparte al entrar a la agenda (refresh con fresh=1).
 */
const TTL_MS = 30 * 60 * 1000
const PREFIX = 'catalogo:v1:'

type Entry = { t: number; payload: Row }

function storageKey(slug: string | null): string {
  return PREFIX + (slug ?? 'sin-tenant')
}

function store(): Storage | null {
  // globalThis === window en el navegador, y permite inyectar un storage falso en tests.
  try {
    return (globalThis as { localStorage?: Storage }).localStorage ?? null
  } catch {
    return null // modo privado o almacenamiento bloqueado
  }
}

/** Catálogo cacheado y todavía vigente, ya normalizado. null si no hay o venció. */
export function readCatalogCache(slug: string | null): Catalog | null {
  const ls = store()
  if (!ls) return null
  try {
    const raw = ls.getItem(storageKey(slug))
    if (!raw) return null
    const entry = JSON.parse(raw) as Entry
    if (!entry || typeof entry.t !== 'number' || !entry.payload) return null
    if (Date.now() - entry.t > TTL_MS) {
      ls.removeItem(storageKey(slug))
      return null
    }
    return normalizeCatalog(entry.payload)
  } catch {
    return null
  }
}

export function writeCatalogCache(slug: string | null, payload: Row): void {
  const ls = store()
  if (!ls) return
  try {
    const entry: Entry = { t: Date.now(), payload }
    ls.setItem(storageKey(slug), JSON.stringify(entry))
  } catch {
    /* cuota llena o almacenamiento bloqueado: la app sigue sin caché */
  }
}

export function clearCatalogCache(slug: string | null): void {
  const ls = store()
  if (!ls) return
  try {
    ls.removeItem(storageKey(slug))
  } catch {
    /* nada que hacer */
  }
}
