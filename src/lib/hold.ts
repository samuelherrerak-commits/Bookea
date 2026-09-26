/**
 * Aritmética de la hora apartada (el "hold").
 *
 * Va aparte del hook y del componente a propósito: son funciones puras, sin
 * React ni reloj, y se pueden probar. El hook las usa para el tick y el
 * componente para pintar la barra.
 */

/** Segundos que quedan; 0 ya venció. Se recalcula desde `expira` en cada tick. */
export function segundosRestantes(expira: number, ahora: number = Date.now()): number {
  return Math.max(0, Math.ceil((expira - ahora) / 1000))
}

/** ¿Ya se agotó el tiempo para confirmar? */
export function expirado(expira: number, ahora: number = Date.now()): boolean {
  return expira <= ahora
}

/** "1:30" o "09". El reloj siempre se ve con dos dígitos. */
export function mmss(segundos: number): string {
  const s = Math.max(0, Math.floor(segundos))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

/** Porcentaje que le queda a la barra, entre 0 y 100. */
export function pctRestante(restantesSeg: number, totalSeg: number): number {
  if (totalSeg <= 0) return 0
  return Math.max(0, Math.min(100, (restantesSeg / totalSeg) * 100))
}

/** De aquí en adelante la barra pasa a color de advertencia. */
export const UMBRAL_URGENTE_SEG = 30

export function urgente(restantesSeg: number): boolean {
  return restantesSeg <= UMBRAL_URGENTE_SEG
}
