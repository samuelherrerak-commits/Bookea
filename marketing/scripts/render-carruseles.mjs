// Renderiza los carruseles de Instagram a JPG (1080×1350).
//
//   node marketing/scripts/render-carruseles.mjs        → los 7
//   node marketing/scripts/render-carruseles.mjs 2 5    → solo el 2 y el 5
//
// Deja marketing/salida/carruseles/carrusel-N/NN.jpg, listos para subir en orden.

import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { chromium } from 'playwright-core'
import { RAIZ, servir } from './servidor.mjs'

const CHROMIUM = process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium'
const pedidos = process.argv.slice(2).map(Number)

const { url, cerrar } = await servir()
const browser = await chromium.launch({ executablePath: CHROMIUM })
try {
  const page = await browser.newPage({ viewport: { width: 1080, height: 1350 } })
  page.on('pageerror', (e) => console.error('  error en la página:', e.message))
  await page.goto(`${url}/marketing/carruseles/index.html?c=1&s=1`)
  const carruseles = await page.evaluate(() => CARRUSELES.map((c) => ({ id: c.id, n: c.laminas.length })))
  for (const { id, n } of carruseles) {
    if (pedidos.length && !pedidos.includes(id)) continue
    const dir = join(RAIZ, `marketing/salida/carruseles/carrusel-${id}`)
    await mkdir(dir, { recursive: true })
    for (let s = 1; s <= n; s++) {
      await page.goto(`${url}/marketing/carruseles/index.html?c=${id}&s=${s}`, { waitUntil: 'networkidle' })
      await page.evaluate(() => window.listo)
      await page.locator('.lamina').screenshot({ path: join(dir, `${String(s).padStart(2, '0')}.jpg`), type: 'jpeg', quality: 92 })
    }
    console.log(`  ✓ carrusel ${id}: ${n} láminas`)
  }
} finally {
  await browser.close()
  cerrar()
}
