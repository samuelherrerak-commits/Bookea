// Identidad de bookeaa, tomada de marketing/video/estilos.css y motor.js:
// solo carbón y blanco, titulares Barlow Condensed 800 en mayúsculas alineados a la
// izquierda, kicker con tracking, y las mismas curvas de animación que los reels.
import type { CSSProperties } from 'react'
import { LETRA } from './fuentes'

export const COLOR = { papel: '#ffffff', carbon: '#0f0f0e', grafito: '#5b5b57', niebla: '#f4f4f2' }
export const MARGEN = 90

export const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v))
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t
/** Progreso 0→1 de una animación que empieza en `a` y dura `d` segundos. */
export const p = (t: number, a: number, d: number) => clamp((t - a) / d)
export const ease = {
  out: (x: number) => 1 - Math.pow(1 - x, 4),
  inOut: (x: number) => (x < 0.5 ? 8 * x * x * x * x : 1 - Math.pow(-2 * x + 2, 4) / 2),
  in: (x: number) => x * x * x,
}
/** Valor animado de `from` a `to` entre a y a+d (ease.out por defecto). */
export const tw = (t: number, a: number, d: number, from: number, to: number, curva = ease.out) => lerp(from, to, curva(p(t, a, d)))

const titular: CSSProperties = { fontFamily: LETRA, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '-0.012em' }
export const TIPO = {
  mega: { ...titular, fontSize: 196, lineHeight: 0.86 },
  grande: { ...titular, fontSize: 132, lineHeight: 0.9 },
  medio: { ...titular, fontSize: 88, lineHeight: 0.94 },
  reloj: { ...titular, fontSize: 330, lineHeight: 0.8, letterSpacing: '-0.02em' },
  kicker: { fontFamily: LETRA, fontWeight: 600, fontSize: 38, lineHeight: 1, letterSpacing: '0.16em', textTransform: 'uppercase', opacity: 0.6 },
} satisfies Record<string, CSSProperties>

/** Parte un titular en líneas de ~`ancho` caracteres (los titulares de la marca van en 2–4 líneas). */
export function enLineas(texto: string, ancho: number) {
  const out: string[] = []
  for (const palabra of texto.split(/\s+/)) {
    const ult = out[out.length - 1]
    // Un punto cierra la línea: "TU LINK. / TUS CLIENTES." como en los reels.
    if (ult && !/[.?!]$/.test(ult) && (ult + ' ' + palabra).length <= ancho) out[out.length - 1] = ult + ' ' + palabra
    else out.push(palabra)
  }
  return out
}

/** Borde de ola de las transiciones de la marca (máscara SVG). */
export const OLA =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1080 160' preserveAspectRatio='none'%3E%3Cpath d='M0 110C160 70 280 18 460 22c200 5 280 90 480 92 70 0 110-12 140-22v68H0z'/%3E%3C/svg%3E\")"
