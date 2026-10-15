import { continueRender, delayRender, staticFile } from 'remotion'

// Las mismas letras de la campaña de bookeaa: Barlow Condensed (titulares) y Barlow (texto).
export const LETRA = "'Barlow Condensed', sans-serif"
export const TEXTO = "'Barlow', sans-serif"

const fuentes: [string, number, string][] = [
  ['Barlow Condensed', 600, 'barlow-condensed-latin-600-normal.woff2'],
  ['Barlow Condensed', 700, 'barlow-condensed-latin-700-normal.woff2'],
  ['Barlow Condensed', 800, 'barlow-condensed-latin-800-normal.woff2'],
  ['Barlow', 400, 'barlow-latin-400-normal.woff2'],
  ['Barlow', 500, 'barlow-latin-500-normal.woff2'],
  ['Barlow', 600, 'barlow-latin-600-normal.woff2'],
]
if (typeof document !== 'undefined') {
  const espera = delayRender('Cargando fuentes de bookeaa')
  Promise.all(
    fuentes.map(([familia, peso, archivo]) =>
      new FontFace(familia, `url(${staticFile(`fuentes/${archivo}`)})`, { weight: String(peso) })
        .load()
        .then((f) => document.fonts.add(f)),
    ),
  )
    .then(() => continueRender(espera))
    .catch((e) => {
      console.error(e)
      continueRender(espera)
    })
}
