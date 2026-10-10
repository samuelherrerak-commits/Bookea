/**
 * Vista previa en vivo de la página del negocio dentro de "Mi negocio → Configurar".
 *
 * El configurador abre /u/<slug>?vista=1 en un iframe (mismo origen) y le manda por
 * postMessage el borrador: claves de Configuracion, logo y servicios. Esta página los
 * aplica encima del catálogo real sin guardar nada. En vista previa no se puede pasar
 * del catálogo (no se reserva de verdad desde el editor).
 */
import { useEffect, useState } from 'react'
import type { Catalog } from '../types'
import { normalizeConfig, normalizeServices } from './normalize'

export const MENSAJE_VISTA = 'bookeaa-vista'
export const VISTA_LISTA = 'bookeaa-vista-lista'

export interface Borrador {
  config?: Record<string, string>
  /** data URL del logo subido; '' = sin logo subido. */
  logo?: string
  servicios?: { id: string; nombre: string; precio: number; duracion: number; categoria: string; adicional: boolean }[]
}

export function esVistaPrevia(): boolean {
  if (typeof window === 'undefined') return false
  return new URLSearchParams(location.search).get('vista') === '1' && window.parent !== window
}

/** El catálogo con el borrador encima: solo lo que se edita en el configurador. */
export function aplicarBorrador(catalog: Catalog, b: Borrador): Catalog {
  let config = catalog.config
  if (b.config) {
    const n = normalizeConfig(b.config, undefined, { logo: b.logo })
    config = {
      ...config,
      marca: n.marca,
      nombreNegocio: n.nombreNegocio,
      heroTitulo: n.heroTitulo,
      heroSubtitulo: n.heroSubtitulo,
      tema: n.tema,
      logoUrl: b.logo !== undefined || b.config.logo_url !== undefined ? n.logoUrl : config.logoUrl,
    }
  }
  const servicios = b.servicios
    ? normalizeServices(
        b.servicios
          .filter((s) => s.nombre.trim())
          .map((s) => ({ ID: s.id, Nombre: s.nombre, Precio: s.precio, Duracion_Min: s.duracion, Tipo: s.adicional ? 'Adicional' : s.categoria })),
      )
    : catalog.servicios
  return { ...catalog, config, servicios }
}

/** En vista previa, el borrador que manda el configurador (null fuera de la vista previa). */
export function useBorradorVista(): Borrador | null {
  const [borrador, setBorrador] = useState<Borrador | null>(null)
  useEffect(() => {
    if (!esVistaPrevia()) return
    const alMensaje = (e: MessageEvent) => {
      if (e.origin !== location.origin || e.source !== window.parent) return
      if (e.data?.tipo === MENSAJE_VISTA) setBorrador(e.data.borrador as Borrador)
    }
    window.addEventListener('message', alMensaje)
    window.parent.postMessage({ tipo: VISTA_LISTA }, location.origin)
    return () => window.removeEventListener('message', alMensaje)
  }, [])
  return borrador
}
