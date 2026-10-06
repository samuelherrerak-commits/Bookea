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
    // Página nueva al terminar una oración o un tramo, para no mezclar frases de dos cortes.
    const finTramo = c.endMs / 1000 >= s.hasta - 0.05
    salida.push({
      ...c,
      pageBreakAfter: c.pageBreakAfter || finTramo || /[.?!]$/.test(c.text.trim()),
      startMs: mover(c.startMs),
      endMs: mover(c.endMs),
      timestampMs: c.timestampMs == null ? null : mover(c.timestampMs),
    })
  }
  // El último de cada tramo también corta la página aunque su tiempo no llegue al final.
  for (let k = 0; k < salida.length - 1; k++) {
    if (salida[k + 1].startMs - salida[k].endMs > 250) salida[k].pageBreakAfter = true
  }
  return salida
}

/** Segundo del video original → segundo del video final (si cae en un corte, el inicio del tramo siguiente). */
export function aSalida(t: number, segmentos: Segmento[]) {
  const ini = inicios(segmentos)
  // Los tramos pueden ir en otro orden que el original (p. ej. mover una toma al inicio).
  const dentro = segmentos.findIndex((s) => t >= s.desde && t < s.hasta)
  if (dentro >= 0) return ini[dentro] + t - segmentos[dentro].desde
  // Justo en el final de un tramo (p. ej. `hasta` de una escena): el final de ese tramo.
  const fin = segmentos.findIndex((s) => Math.abs(t - s.hasta) < 0.05)
  if (fin >= 0) return ini[fin] + duracionSegmento(segmentos[fin])
  for (let i = 0; i < segmentos.length; i++) {
    const s = segmentos[i]
    if (t < s.desde) return ini[i]
  }
  return ini.length ? ini[ini.length - 1] + duracionSegmento(segmentos[segmentos.length - 1]) : 0
}
