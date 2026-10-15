// Renderiza las historias a JPG (1080×1920).
//
//   node marketing/scripts/render-historias.mjs            → las 20 de noviembre
//   node marketing/scripts/render-historias.mjs 3 8        → solo esas
//   node marketing/scripts/render-historias.mjs --octubre  → los 9 tríos de octubre (27)
//
// Deja marketing/salida/historias/historia-NN.jpg (u historias-octubre/). Las de
// "nuevo reel" usan la portada de cada video, así que conviene renderizar los videos antes.

import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { chromium } from 'playwright-core'
import { RAIZ, servir } from './servidor.mjs'

const CHROMIUM = process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium'
const octubre = process.argv.includes('--octubre')
const pedidos = process.argv.slice(2).filter((a) => !a.startsWith('--')).map(Number)
const PAGINA = octubre ? 'octubre.html' : 'index.html'
const DATOS = octubre ? 'HISTORIAS_OCTUBRE' : 'HISTORIAS'

const { url, cerrar } = await servir()
const browser = await chromium.launch({ executablePath: CHROMIUM })
try {
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } })
  page.on('pageerror', (e) => console.error('  error en la página:', e.message))
  await page.goto(`${url}/marketing/historias/${PAGINA}?s=1`)
  const ids = await page.evaluate((d) => window[d].map((s) => s.id), DATOS)
  const dir = join(RAIZ, octubre ? 'marketing/salida/historias-octubre' : 'marketing/salida/historias')
  await mkdir(dir, { recursive: true })
  for (const id of ids) {
    if (pedidos.length && !pedidos.includes(id)) continue
    await page.goto(`${url}/marketing/historias/${PAGINA}?s=${id}`, { waitUntil: 'networkidle' })
    await page.evaluate(() => window.listo)
    await page.locator('.historia').screenshot({ path: join(dir, `historia-${String(id).padStart(2, '0')}.jpg`), type: 'jpeg', quality: 92 })
  }
  console.log(`  ✓ ${pedidos.length || ids.length} historias`)
} finally {
  await browser.close()
  cerrar()
}
