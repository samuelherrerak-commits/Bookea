import type { Caption } from '@remotion/captions'

/** Un tramo del video original que se queda (en segundos del original). */
export type Segmento = {
  desde: number
  hasta: number
  /** Cambio de tema: destello + whoosh al entrar. */
  bloque?: boolean
  /** Clip de apoyo (ruta dentro de public/) que tapa la cámara mientras sigue la voz. */
  broll?: string
}

/** Texto grande de énfasis en pantalla (segundos del video final). */
export type Enfasis = { t: number; texto: string; dur?: number }

export type Edicion = {
  /** Video de la cámara, ruta dentro de public/ (p. ej. "entrada/2026-10-05.mp4"). */
  video: string
  segmentos: Segmento[]
  /** Subtítulos con tiempos del video ORIGINAL; se remapean según los cortes. */
  captions: Caption[]
  /** Frase gancho de los primeros segundos. */
  gancho?: string
  enfasis?: Enfasis[]
  /** Pistas generadas por scripts/editar.mjs (rutas dentro de public/). */
  musica?: string
  efectos?: string
  volumenMusica?: number
  /** Tarjeta final con el logo. */
  cierre?: boolean
}

export const FPS = 30
export const CIERRE_S = 2
