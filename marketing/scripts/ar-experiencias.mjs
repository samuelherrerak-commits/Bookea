// Las experiencias de realidad aumentada del sitio. Cada una vive en public/<nombre>/ (la
// página), reconoce el frente de una tarjeta y tiene sus archivos de imprenta en
// marketing/<nombre>/. Las librerías y fuentes compartidas están en public/ar-comun/.
//
// Los scripts ar-*.mjs reciben --experiencia <nombre> (por defecto, la más nueva).

import { join } from 'node:path'
import { RAIZ } from './servidor.mjs'

export const EXPERIENCIAS = {
  // La primera animación: el logo despierta sobre la tarjeta 1 ("Tu agenda, sin libreta").
  ar1: { tarjeta: 1, url: 'https://www.bookeaa.com/ar1/', nombre: 'Primera animación · tarjeta 1 (Sin libreta)' },
  // La agenda malvada rompe la tarjeta 2 y bookee la vence. El frente va sin las esquinas.
  ar2: { tarjeta: 2, quitar: ['.esq'], url: 'https://www.bookeaa.com/ar2/', nombre: 'La agenda malvada · tarjeta 2' },
}

export const POR_DEFECTO = Object.keys(EXPERIENCIAS).at(-1)

export function experiencia(nombre = POR_DEFECTO) {
  const def = EXPERIENCIAS[nombre]
  if (!def) throw new Error(`No existe la experiencia "${nombre}". Hay: ${Object.keys(EXPERIENCIAS).join(', ')}`)
  return {
    id: nombre,
    ...def,
    publico: join(RAIZ, 'public', nombre),
    marketing: join(RAIZ, 'marketing', nombre),
    salida: join(RAIZ, 'marketing/salida', nombre),
  }
}

/** Lee --experiencia de la línea de comandos. */
export function experienciaDeArgs(argv = process.argv.slice(2)) {
  const i = argv.indexOf('--experiencia')
  return experiencia(i >= 0 ? argv[i + 1] : undefined)
}

export const COMUN = join(RAIZ, 'public/ar-comun')
export const MINDAR_WEB = '/public/ar-comun/vendor/mind-ar-1.2.5/mindar-image.prod.js'
