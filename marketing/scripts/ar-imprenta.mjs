// Archivos para la imprenta de una tarjeta con realidad aumentada.
//
//   npm run ar:imprenta -- --experiencia ar1
//
// Deja en marketing/<experiencia>/:
//   bookeaa-<exp>-qr.svg / .pdf      el QR solo, vectorial: 100 % negro, margen de 4 módulos
//   bookeaa-<exp>-tarjeta.pdf        la tarjeta (frente y dorso, 96 × 56 mm con 3 mm de sangrado)
//   bookeaa-<exp>-frente.png         las dos caras a 600 dpi con sangrado, por si piden imagen
//   bookeaa-<exp>-dorso.png
//   bookeaa-<exp>-vista.png          las dos caras recortadas, para revisar antes de mandar
//
// La tarjeta sale de marketing/tarjetas/index.html sin modificarlo: aquí solo se reemplaza el
// QR del dorso (que abría bookeaa.com) por uno que abre la experiencia, y se quitan del frente
// los elementos que la experiencia no lleva. El frente es la imagen que reconoce la cámara
// (public/<exp>/tarjeta.mind): si cambia, hay que correr ar:objetivo.

import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import qrcode from 'qrcode-generator'
import { chromium } from 'playwright-core'
import { servir } from './servidor.mjs'
import { experienciaDeArgs } from './ar-experiencias.mjs'

const EXP = experienciaDeArgs()
const URL_AR = EXP.url
const TARJETA = EXP.tarjeta
const QUITAR = EXP.quitar ?? []
const LADO_MM = 30 // el QR de las tarjetas mide 30 mm con su margen
const CHROMIUM = process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium'
const MM = 96 / 25.4
const DPI = 600
const SALIDA = EXP.marketing
const archivo = (nombre) => join(SALIDA, `bookeaa-${EXP.id}-${nombre}`)

/** QR vectorial: un solo <path> con las filas unidas, módulos 100 % negros y margen blanco. */
export function qrSvg(ladoMm, { estilo = '', url = URL_AR } = {}) {
  // Q: soporta hasta 25 % de daño (una mancha, un doblez) y con esta URL sigue en 29 × 29 módulos
  const qr = qrcode(0, 'Q')
  qr.addData(url)
  qr.make()
  const n = qr.getModuleCount()
  const total = n + 8
  let d = ''
  for (let f = 0; f < n; f++) {
    for (let c = 0; c < n; c++) {
      if (!qr.isDark(f, c)) continue
      let largo = 1
      while (c + largo < n && qr.isDark(f, c + largo)) largo++
      d += `M${c + 4} ${f + 4}h${largo}v1h-${largo}z`
      c += largo - 1
    }
  }
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${ladoMm}mm" height="${ladoMm}mm" viewBox="0 0 ${total} ${total}" shape-rendering="crispEdges"${estilo ? ` style="${estilo}"` : ''}>` +
    `<title>${url}</title><rect width="${total}" height="${total}" fill="#ffffff"/><path d="${d}" fill="#000000"/></svg>`
  )
}

await mkdir(SALIDA, { recursive: true })
const svg = qrSvg(LADO_MM)
await writeFile(archivo('qr.svg'), svg + '\n')

const { url, cerrar } = await servir()
const browser = await chromium.launch({ executablePath: CHROMIUM })
try {
  // QR solo en PDF (algunas imprentas no aceptan SVG)
  const solo = await browser.newPage()
  await solo.setContent(`<style>@page{size:${LADO_MM}mm ${LADO_MM}mm;margin:0}body{margin:0}svg{display:block}</style>${svg}`)
  await solo.pdf({ path: archivo('qr.pdf'), width: `${LADO_MM}mm`, height: `${LADO_MM}mm`, printBackground: true, preferCSSPageSize: true })
  await solo.close()

  const base = `${url}/marketing/tarjetas/index.html`
  // QR nuevo en el dorso y, en el frente, fuera lo que esta experiencia no lleva
  const cambiarQr = (page) =>
    page.evaluate(
      ({ nuevo, quitar }) => {
        for (const sel of quitar) document.querySelectorAll(sel).forEach((n) => n.remove())
        const viejos = document.querySelectorAll('.qr svg')
        for (const v of viejos) {
          const lado = v.style.width
          v.outerHTML = nuevo.replace('<svg ', `<svg style="display:block;width:${lado};height:${lado}" `)
        }
        return viejos.length
      },
      { nuevo: svg, quitar: QUITAR },
    )

  // tarjeta para la imprenta: 2 páginas (frente y dorso) vectoriales
  const pdf = await browser.newPage()
  await pdf.goto(`${base}?t=${TARJETA}`, { waitUntil: 'networkidle' })
  await pdf.evaluate(() => window.listo)
  if (!(await cambiarQr(pdf))) throw new Error('No encontré el QR de la tarjeta')
  await pdf.pdf({ path: archivo('tarjeta.pdf'), width: '96mm', height: '56mm', printBackground: true, preferCSSPageSize: true })
  await pdf.close()

  // las dos caras en PNG a 600 dpi, con sangrado
  const png = await browser.newPage({ viewport: { width: Math.ceil(96 * MM), height: Math.ceil(56 * MM) }, deviceScaleFactor: DPI / 96 })
  for (const cara of ['frente', 'dorso']) {
    await png.goto(`${base}?t=${TARJETA}&cara=${cara}`, { waitUntil: 'networkidle' })
    await png.evaluate(() => window.listo)
    await cambiarQr(png)
    await png.locator('.cara').screenshot({ path: archivo(`${cara}.png`) })
  }
  await png.close()

  // vista previa: la fila de la tarjeta 1 de la página de propuestas, ya con el QR nuevo
  const vista = await browser.newPage({ viewport: { width: 1000, height: 600 }, deviceScaleFactor: 2 })
  await vista.goto(base, { waitUntil: 'networkidle' })
  await vista.evaluate(() => window.listo)
  const fila = vista.locator('.fila').nth(TARJETA - 1)
  await fila.evaluate(
    (el, { nuevo, quitar, ruta }) => {
      for (const sel of quitar) el.querySelectorAll(sel).forEach((n) => n.remove())
      const v = el.querySelector('.qr svg')
      v.outerHTML = nuevo.replace('<svg ', `<svg style="display:block;width:${v.style.width};height:${v.style.height}" `)
      el.querySelector('h2').innerHTML = `Tarjeta AR<small>El QR del dorso abre ${ruta}. El frente es el que reconoce la cámara.</small>`
    },
    { nuevo: svg, quitar: QUITAR, ruta: new URL(URL_AR).pathname },
  )
  await fila.screenshot({ path: archivo('vista.png') })
  await vista.close()
} finally {
  await browser.close()
  cerrar()
}
console.log(`  ✓ QR → ${URL_AR}`)
console.log(`  ✓ marketing/${EXP.id}/bookeaa-${EXP.id}-{qr.svg,qr.pdf,tarjeta.pdf,frente.png,dorso.png,vista.png}`)
