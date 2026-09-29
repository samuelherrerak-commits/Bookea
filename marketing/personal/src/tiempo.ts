import type { Caption } from '@remotion/captions'
import { CIERRE_S, type Edicion, type Segmento } from './tipos'

export const duracionSegmento = (s: Segmento) => Math.max(0, s.hasta - s.desde)

/** Segundo del video final en el que empieza cada segmento. */
export function inicios(segmentos: Segmento[]) {
  const r: number[] = []
  let t = 0
  for (const s of segmentos) {
    r.push(t)
    t += duracionSegmento(s)
  }
  return r
}

export function duracionTotal(e: Edicion) {
  const cortes = e.segmentos.reduce((a, s) => a + duracionSegmento(s), 0)
  return cortes + (e.cierre ? CIERRE_S : 0)
}

/** Pasa los subtítulos del tiempo original al tiempo editado; los que caen en un corte se descartan. */
export function remapearCaptions(captions: Caption[], segmentos: Segmento[]): Caption[] {
  const ini = inicios(segmentos)
  const salida: Caption[] = []
  for (const c of captions) {
    const medio = (c.startMs + c.endMs) / 2000
    const i = segmentos.findIndex((s) => medio >= s.desde && medio < s.hasta)
    if (i < 0) continue
    const s = segmentos[i]
    const mover = (ms: number) =>
      Math.round((ini[i] + Math.min(Math.max(ms / 1000, s.desde), s.hasta) - s.desde) * 1000)
    salida.push({
      ...c,
      startMs: mover(c.startMs),
      endMs: mover(c.endMs),
      timestampMs: c.timestampMs == null ? null : mover(c.timestampMs),
    })
  }
  return salida
}
