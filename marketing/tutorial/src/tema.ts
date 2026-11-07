// Tema único del tutorial: colores, curvas, resortes y medidas. Ningún componente
// escribe un color o una curva a mano. Identidad de bookeaa (bookeaa.com y los reels):
// blanco y carbón, Barlow Condensed 800 en mayúsculas para los títulos, Barlow para el texto.
import { Easing } from 'remotion'
import { LETRA, TEXTO } from './fuentes'

export const tema = {
  color: {
    papel: '#ffffff',
    niebla: '#f4f4f2',
    raya: '#e3e3df',
    carbon: '#0f0f0e',
    grafito: '#5b5b57',
    // El único color de acento: lo que hay que tocar o mirar. Uno solo por cuadro.
    senal: '#ff5b2e',
    senalSuave: 'rgba(255, 91, 46, 0.18)',
  },
  letra: { titulo: LETRA, texto: TEXTO },
  ease: {
    out: Easing.bezier(0.16, 1, 0.3, 1),
    inOut: Easing.bezier(0.83, 0, 0.17, 1),
    in: Easing.bezier(0.7, 0, 0.84, 0),
  },
  resorte: {
    agil: { damping: 14, stiffness: 160, mass: 0.6 },
    suave: { damping: 20, stiffness: 90, mass: 1 },
    rebote: { damping: 11, stiffness: 170, mass: 0.7 },
  },
  // Medidas del cuadro (1080×1920) y del teléfono.
  ancho: 1080,
  alto: 1920,
  margen: 70,
  telefono: { ancho: 620, arriba: 545, borde: 14, barra: 40 },
} as const

/** Interpolación con curva y sin salirse del rango (nunca lineal). */
export const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const
