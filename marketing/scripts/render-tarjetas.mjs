// Tarjetas de presentación de bookeaa (90 × 50 mm, con 3 mm de sangrado: 96 × 56 mm).
//
//   node marketing/scripts/render-tarjetas.mjs
//
// Deja en marketing/salida/tarjetas/:
//   bookeaa-tarjeta-N.pdf    2 páginas (frente y dorso), vectorial: el que va a la imprenta
//   tarjeta-N-frente.png / tarjeta-N-dorso.png   600 dpi con sangrado, por si piden imagen
//   propuestas.png           las 3 propuestas recortadas a 90 × 50, para elegir

import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { chromium } from 'playwright-core'
import { RAIZ, servir } from './servidor.mjs'

const CHROMIUM = process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium'
const SALIDA = join(RAIZ, 'marketing/salida/tarjetas')
const MM = 96 / 25.4 // px CSS por mm
const DPI = 600

await mkdir(SALIDA, { recursive: true })
const { url, cerrar } = await servir()
const browser = await chromium.launch({ executablePath: CHROMIUM })
try {
  const base = `${url}/marketing/tarjetas/index.html`
  for (const t of [1, 2, 3]) {
    const pdf = await browser.newPage()
    await pdf.goto(`${base}?t=${t}`, { waitUntil: 'networkidle' })
    await pdf.evaluate(() => window.listo)
    await pdf.pdf({ path: join(SALIDA, `bookeaa-tarjeta-${t}.pdf`), width: '96mm', height: '56mm', printBackground: true, preferCSSPageSize: true })
    await pdf.close()

    const png = await browser.newPage({ viewport: { width: Math.ceil(96 * MM), height: Math.ceil(56 * MM) }, deviceScaleFactor: DPI / 96 })
    for (const cara of ['frente', 'dorso']) {
      await png.goto(`${base}?t=${t}&cara=${cara}`, { waitUntil: 'networkidle' })
      await png.evaluate(() => window.listo)
      await png.locator('.cara').screenshot({ path: join(SALIDA, `tarjeta-${t}-${cara}.png`) })
    }
    await png.close()
    console.log(`  ✓ tarjeta ${t}`)
  }
  const vista = await browser.newPage({ viewport: { width: 1000, height: 1400 }, deviceScaleFactor: 2 })
  await vista.goto(base, { waitUntil: 'networkidle' })
  await vista.evaluate(() => window.listo)
  await vista.locator('#raiz').screenshot({ path: join(SALIDA, 'propuestas.png') })
  console.log('  ✓ propuestas.png')
} finally {
  await browser.close()
  cerrar()
}
