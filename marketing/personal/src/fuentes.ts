import { continueRender, delayRender, staticFile } from 'remotion'

// Barlow Condensed: la misma letra gruesa de la campaña de bookeaa.
export const LETRA = "'Barlow Condensed', sans-serif"

const pesos = [700, 800]
if (typeof document !== 'undefined') {
  const espera = delayRender('Cargando Barlow Condensed')
  Promise.all(
    pesos.map((p) =>
      new FontFace('Barlow Condensed', `url(${staticFile(`fuentes/barlow-condensed-latin-${p}-normal.woff2`)})`, {
        weight: String(p),
      })
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
