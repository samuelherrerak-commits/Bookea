import { API_TOKEN, API_URL, DEMO_MODE } from '../config'
import type { Catalog, Coupon, ReservationPayload, ReservationResult } from '../types'
import { writeCatalogCache } from './catalogCache'
import { ApiError } from './errors'
import type { ApiErrorCode } from './errors'
import { mockFetchData, mockSubmitReservation, mockValidateCoupon } from './mock'
import { normalizeCatalog, str, toNumber } from './normalize'
import type { Row } from './normalize'
import { normalizeSlug, slugFromLocation } from './tenant'

export { ApiError, API_TOKEN, DEMO_MODE }

const TIMEOUT_MS = 20_000

/** undefined = todavía no se ha resuelto; null = esta app no tiene tenant. */
let shopSlug: string | null | undefined

/** Negocio activo: el que se fijó a mano o, si no, el de la URL (/u/mariana o ?shop=). */
function currentSlug(): string | null {
  if (shopSlug === undefined) {
    shopSlug = typeof window === 'undefined' ? null : slugFromLocation()
  }
  return shopSlug
}

/** Fija el negocio a mano (landing embebida, pruebas). `null` vuelve a leer la URL. */
export function setShopSlug(slug: string | null): void {
  shopSlug = slug === null ? undefined : normalizeSlug(slug)
}

export function getShopSlug(): string | null {
  return currentSlug()
}

function apiUrl(params: Record<string, string> = {}): URL {
  const url = new URL(API_URL)
  url.searchParams.set('token', API_TOKEN)
  const slug = currentSlug()
  if (slug) url.searchParams.set('shop', slug)
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value)
  return url
}

function toErrorCode(error: unknown): ApiErrorCode {
  const code = str(error)
  if (code === 'no_autorizado' || code === 'cupo_ocupado' || code === 'cupon_invalido' || code === 'datos_invalidos') {
    return code
  }
  return 'desconocido'
}

async function request(input: URL, init?: RequestInit): Promise<Row> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)

  let response: Response
  try {
    response = await fetch(input.toString(), { ...init, signal: controller.signal, redirect: 'follow' })
  } catch {
    throw new ApiError('red', 'No pudimos conectar. Revisa tu conexión e inténtalo de nuevo.')
  } finally {
    clearTimeout(timer)
  }

  let data: unknown
  try {
    data = await response.json()
  } catch {
    throw new ApiError('desconocido', 'El servidor devolvió una respuesta inesperada.')
  }

  const row: Row = data && typeof data === 'object' ? (data as Row) : {}
  if (str(row.error)) {
    throw new ApiError(toErrorCode(row.error), str(row.mensaje) || 'No se pudo completar la operación.')
  }
  return row
}

// ---------- API pública ----------

/**
 * Catálogo, promociones, configuración, tasa BCV y ocupación del calendario.
 *
 * `fresh: true` salta la caché de 5 min del servidor y le vuelve a preguntar al
 * calendario. Es lo que usa la pantalla de agenda para no mostrar cupos viejos.
 */
export async function fetchData(options: { fresh?: boolean } = {}): Promise<Catalog> {
  if (DEMO_MODE) return mockFetchData()
  const raw = await request(apiUrl(options.fresh ? { fresh: '1' } : {}))
  writeCatalogCache(getShopSlug(), raw)
  return normalizeCatalog(raw)
}

/** Valida un cupón en el servidor (la lista de cupones nunca llega al navegador). */
export async function validateCoupon(codigo: string): Promise<Coupon> {
  const code = codigo.trim().toUpperCase()
  if (!code) throw new ApiError('cupon_invalido', 'Escribe el código del cupón.')
  if (DEMO_MODE) return mockValidateCoupon(code)

  const data = await request(apiUrl({ action: 'cupon', codigo: code }))
  if (!data.valido) {
    throw new ApiError('cupon_invalido', str(data.mensaje) || 'Este cupón no existe o ya se agotó.')
  }
  return {
    codigo: str(data.codigo) || code,
    porcentaje: toNumber(data.porcentaje),
    monto: toNumber(data.monto),
  }
}

/** Envía la reserva. Se usa `text/plain` para que el navegador no haga preflight CORS. */
export async function submitReservation(payload: ReservationPayload): Promise<ReservationResult> {
  if (DEMO_MODE) return mockSubmitReservation(payload)

  const data = await request(apiUrl(), {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ token: API_TOKEN, shop: currentSlug(), ...payload }),
  })

  if (!data.success) {
    throw new ApiError('desconocido', str(data.mensaje) || 'No se pudo guardar la reserva.')
  }
  return {
    id: str(data.id),
    total: toNumber(data.total, payload.total),
    totalBs: data.totalBs === null || data.totalBs === undefined ? null : toNumber(data.totalBs),
    tasa: data.tasa === null || data.tasa === undefined ? null : toNumber(data.tasa),
    comprobanteUrl: str(data.comprobanteUrl) || null,
  }
}
