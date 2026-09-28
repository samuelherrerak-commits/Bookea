/**
 * Colores derivados de dos elecciones del negocio: el color principal y el fondo.
 * Todo es puro (sin DOM) para poder probarlo; theme.ts lo convierte en variables CSS.
 */

type RGB = [number, number, number]

const HEX_RE = /^#?(?:[0-9a-f]{3}|[0-9a-f]{6})$/i

export function isHex(value: string): boolean {
  return HEX_RE.test(value.trim())
}

export function hexToRgb(hex: string): RGB {
  let h = hex.trim().replace('#', '')
  if (h.length === 3) h = h.replace(/./g, (c) => c + c)
  const n = parseInt(h, 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

export function rgbToHex([r, g, b]: RGB): string {
  const to = (v: number) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, '0')
  return `#${to(r)}${to(g)}${to(b)}`.toUpperCase()
}

/** Mezcla `a` con `b`; `t` = 0 devuelve `a`, 1 devuelve `b`. */
export function mix(a: string, b: string, t: number): string {
  const x = hexToRgb(a)
  const y = hexToRgb(b)
  return rgbToHex([x[0] + (y[0] - x[0]) * t, x[1] + (y[1] - x[1]) * t, x[2] + (y[2] - x[2]) * t])
}

/** Luminancia relativa WCAG 2.x. */
export function luminance(hex: string): number {
  const lin = hexToRgb(hex).map((v) => {
    const c = v / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2]
}

export function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((m, n) => n - m)
  return (hi + 0.05) / (lo + 0.05)
}

/** Umbral práctico: por debajo de esto el texto oscuro ya no se lee bien encima. */
export function isDark(hex: string): boolean {
  return luminance(hex) < 0.18
}

/**
 * Empuja `color` hacia negro (fondo claro) o hacia blanco (fondo oscuro) hasta que
 * alcance `min` de contraste contra `fondo`. Conserva el tono todo lo posible.
 */
export function ensureContrast(color: string, fondo: string, min = 4.5): string {
  if (contrast(color, fondo) >= min) return color.toUpperCase()
  const hacia = isDark(fondo) ? '#FFFFFF' : '#000000'
  for (let t = 0.05; t <= 1; t += 0.05) {
    const c = mix(color, hacia, t)
    if (contrast(c, fondo) >= min) return c
  }
  return hacia
}

export interface Acento {
  base: string
  soft: string
  deep: string
}

/**
 * Del color principal salen los tres tonos que usa la app:
 * base (botones y chips), soft (fondos suaves) y deep (texto de acento legible).
 */
export function derivarAcento(principal: string, fondo = '#FDFBF7'): Acento {
  const base = rgbToHex(hexToRgb(principal))
  const soft = mix(base, fondo, isDark(fondo) ? 0.78 : 0.86)
  const deep = ensureContrast(base, fondo, 4.5)
  return { base, soft, deep }
}

export interface Neutros {
  bg: string
  surface: string
  sand: string
  line: string
  ink: string
  muted: string
}

/**
 * Del color de fondo salen las superficies y los textos. Si el fondo es oscuro el
 * texto pasa a claro solo; muted se ajusta hasta leerse (≥ 4.5:1) sobre el fondo.
 */
export function derivarNeutros(fondo: string): Neutros {
  const bg = rgbToHex(hexToRgb(fondo))
  const dark = isDark(bg)
  // La tinta toma un poco del tono del fondo: un negro puro sobre crema se ve "pegado".
  const ink = dark ? mix('#FFFFFF', bg, 0.06) : mix('#1A1816', bg, 0.08)
  return {
    bg,
    surface: dark ? mix(bg, '#FFFFFF', 0.07) : mix(bg, '#FFFFFF', 0.7),
    sand: dark ? mix(bg, '#FFFFFF', 0.1) : mix(bg, ink, 0.05),
    line: dark ? mix(bg, '#FFFFFF', 0.16) : mix(bg, ink, 0.1),
    ink,
    muted: ensureContrast(mix(ink, bg, 0.42), bg, 4.5),
  }
}
