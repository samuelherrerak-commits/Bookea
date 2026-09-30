import type { Caption } from '@remotion/captions'

/** Un tramo del video original que se queda (en segundos del original). */
export type Segmento = {
  desde: number
  hasta: number
  /** Cambio de tema: persiana negra + golpe al entrar. */
  bloque?: boolean
  /** Clip de apoyo (ruta dentro de public/) que tapa la cámara mientras sigue la voz. */
  broll?: string
}

/** Texto grande de énfasis en pantalla (segundos del video final). */
/** `t` en segundos del video final, o `ts` en segundos del ORIGINAL (se remapea con los cortes). */
export type Enfasis = { t?: number; ts?: number; texto: string; dur?: number; kicker?: string }

/** Un teléfono con una captura real de la app (public/flujo/…). */
export type Telefono = { img: string; ancho?: number; x: number; y: number; rot?: number; en?: number }

/**
 * Escena de marca a pantalla completa (como los reels de marketing/video): tapa la cámara
 * mientras sigue la voz. Tiempos `desde`/`hasta`/`en` en segundos del video ORIGINAL.
 */
export type Escena = {
  desde: number
  hasta: number
  fondo: 'negro' | 'blanco'
  entrada?: 'ola' | 'lado' | 'corte'
  kicker?: string
  titulo: string[]
  /** Segundo (original) en que entra cada línea del título; si no, escalonadas. */
  tiempos?: number[]
  estilo?: 'mega' | 'grande' | 'medio'
  tamano?: number
  texto?: string
  textoEn?: number
  /** Link que se escribe solo: bookeaa.com/u/<link>. */
  link?: string
  pastilla?: string
  telefonos?: Telefono[]
}

export type Edicion = {
  /** Video de la cámara, ruta dentro de public/ (p. ej. "entrada/2026-10-05.mp4"). */
  video: string
  segmentos: Segmento[]
  /** Subtítulos con tiempos del video ORIGINAL; se remapean según los cortes. */
  captions: Caption[]
  /** Frase gancho: tarjeta negra de los primeros 1,6 s. */
  gancho?: string
  /** Texto pequeño encima del gancho (la serie), p. ej. "Diario del fundador". */
  serie?: string
  enfasis?: Enfasis[]
  escenas?: Escena[]
  /** Pistas generadas por scripts/editar.mjs (rutas dentro de public/). */
  musica?: string
  efectos?: string
  volumenMusica?: number
  /** Tarjeta final con el logo. */
  cierre?: boolean
}

export const FPS = 30
export const CIERRE_S = 2.5
