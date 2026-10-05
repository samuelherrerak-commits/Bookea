// Archivos para la imprenta de la tarjeta con realidad aumentada (tarjeta 1 · Sin libreta).
//
//   npm run ar:imprenta
//
// Deja en marketing/ar/:
//   qr-bookeaa-ar.svg / .pdf     el QR solo, vectorial: 100 % negro, margen de 4 módulos
//   bookeaa-tarjeta-ar.pdf       la tarjeta (frente y dorso, 96 × 56 mm con 3 mm de sangrado)
//   tarjeta-ar-frente.png        las dos caras a 600 dpi con sangrado, por si piden imagen
//   tarjeta-ar-dorso.png
//   tarjeta-ar-vista.png         las dos caras recortadas, para revisar antes de mandar
//
// La tarjeta sale de marketing/tarjetas/index.html sin modificarlo: aquí solo se reemplaza el
// QR del dorso (que abría bookeaa.com) por uno que abre la experiencia en /ar/. El frente no
// cambia: es la imagen que reconoce la cámara (public/ar/tarjeta.mind).

import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import qrcode from 'qrcode-generator'
import { chromium } from 'playwright-core'
import { RAIZ, servir } from './servidor.mjs'

export const URL_AR = 'https://www.bookeaa.com/ar/'
const TARJETA = 1
const LADO_MM = 30 // el QR de la tarjeta 1 mide 30 mm con su margen
const CHROMIUM = process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium'
const MM = 96 / 25.4
const DPI = 600
const SALIDA = join(RAIZ, 'marketing/ar')

/** QR vectorial: un solo <path> con las filas unidas, módulos 100 % negros y margen blanco. */
export function qrSvg(ladoMm, { estilo = '' } = {}) {
  // Q: soporta hasta 25 % de daño (una mancha, un doblez) y con esta URL sigue en 29 × 29 módulos
  const qr = qrcode(0, 'Q')
  qr.addData(URL_AR)
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
    `<title>${URL_AR}</title><rect width="${total}" height="${total}" fill="#ffffff"/><path d="${d}" fill="#000000"/></svg>`
  )
}

await mkdir(SALIDA, { recursive: true })
const svg = qrSvg(LADO_MM)
await writeFile(join(SALIDA, 'qr-bookeaa-ar.svg'), svg + '\n')

const { url, cerrar } = await servir()
const browser = await chromium.launch({ executablePath: CHROMIUM })
try {
  // QR solo en PDF (algunas imprentas no aceptan SVG)
  const solo = await browser.newPage()
  await solo.setContent(`<style>@page{size:${LADO_MM}mm ${LADO_MM}mm;margin:0}body{margin:0}svg{display:block}</style>${svg}`)
  await solo.pdf({ path: join(SALIDA, 'qr-bookeaa-ar.pdf'), width: `${LADO_MM}mm`, height: `${LADO_MM}mm`, printBackground: true, preferCSSPageSize: true })
  await solo.close()

  const base = `${url}/marketing/tarjetas/index.html`
  const cambiarQr = (page) =>
    page.evaluate((nuevo) => {
      const viejos = document.querySelectorAll('.qr svg')
      if (!viejos.length) throw new Error('No encontré el QR de la tarjeta')
      for (const v of viejos) {
        const lado = v.style.width
        v.outerHTML = nuevo.replace('<svg ', `<svg style="display:block;width:${lado};height:${lado}" `)
      }
    }, svg)

  // tarjeta para la imprenta: 2 páginas (frente y dorso) vectoriales
  const pdf = await browser.newPage()
  await pdf.goto(`${base}?t=${TARJETA}`, { waitUntil: 'networkidle' })
  await pdf.evaluate(() => window.listo)
  await cambiarQr(pdf)
  await pdf.pdf({ path: join(SALIDA, 'bookeaa-tarjeta-ar.pdf'), width: '96mm', height: '56mm', printBackground: true, preferCSSPageSize: true })
  await pdf.close()

  // las dos caras en PNG a 600 dpi, con sangrado
  const png = await browser.newPage({ viewport: { width: Math.ceil(96 * MM), height: Math.ceil(56 * MM) }, deviceScaleFactor: DPI / 96 })
  for (const cara of ['frente', 'dorso']) {
    await png.goto(`${base}?t=${TARJETA}&cara=${cara}`, { waitUntil: 'networkidle' })
    await png.evaluate(() => window.listo)
    if (cara === 'dorso') await cambiarQr(png)
    await png.locator('.cara').screenshot({ path: join(SALIDA, `tarjeta-ar-${cara}.png`) })
  }
  await png.close()

  // vista previa: la fila de la tarjeta 1 de la página de propuestas, ya con el QR nuevo
  const vista = await browser.newPage({ viewport: { width: 1000, height: 600 }, deviceScaleFactor: 2 })
  await vista.goto(base, { waitUntil: 'networkidle' })
  await vista.evaluate(() => window.listo)
  const fila = vista.locator('.fila').nth(TARJETA - 1)
  await fila.evaluate((el, nuevo) => {
    const v = el.querySelector('.qr svg')
    v.outerHTML = nuevo.replace('<svg ', `<svg style="display:block;width:${v.style.width};height:${v.style.height}" `)
    el.querySelector('h2').innerHTML = 'Tarjeta AR<small>El QR del dorso abre la experiencia en /ar/. El frente es el que reconoce la cámara.</small>'
  }, svg)
  await fila.screenshot({ path: join(SALIDA, 'tarjeta-ar-vista.png') })
  await vista.close()
} finally {
  await browser.close()
  cerrar()
}
console.log(`  ✓ QR → ${URL_AR}`)
console.log('  ✓ marketing/ar/: qr-bookeaa-ar.svg · qr-bookeaa-ar.pdf · bookeaa-tarjeta-ar.pdf · tarjeta-ar-frente.png · tarjeta-ar-dorso.png · tarjeta-ar-vista.png')
