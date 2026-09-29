// Renderiza las historias de noviembre a JPG (1080×1920).
//
//   node marketing/scripts/render-historias.mjs        → las 20
//   node marketing/scripts/render-historias.mjs 3 8    → solo esas
//
// Deja marketing/salida/historias/historia-NN.jpg. Las de "nuevo reel" usan la portada
// de cada video, así que conviene renderizar los videos antes.

import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { chromium } from 'playwright-core'
import { RAIZ, servir } from './servidor.mjs'

const CHROMIUM = process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium'
const pedidos = process.argv.slice(2).map(Number)

const { url, cerrar } = await servir()
const browser = await chromium.launch({ executablePath: CHROMIUM })
try {
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } })
  page.on('pageerror', (e) => console.error('  error en la página:', e.message))
  await page.goto(`${url}/marketing/historias/index.html?s=1`)
  const ids = await page.evaluate(() => HISTORIAS.map((s) => s.id))
  const dir = join(RAIZ, 'marketing/salida/historias')
  await mkdir(dir, { recursive: true })
  for (const id of ids) {
    if (pedidos.length && !pedidos.includes(id)) continue
    await page.goto(`${url}/marketing/historias/index.html?s=${id}`, { waitUntil: 'networkidle' })
    await page.evaluate(() => window.listo)
    await page.locator('.historia').screenshot({ path: join(dir, `historia-${String(id).padStart(2, '0')}.jpg`), type: 'jpeg', quality: 92 })
  }
  console.log(`  ✓ ${pedidos.length || ids.length} historias`)
} finally {
  await browser.close()
  cerrar()
}
