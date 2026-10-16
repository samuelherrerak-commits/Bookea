// Renderiza los carruseles de Instagram a JPG (1080×1350).
//
//   node marketing/scripts/render-carruseles.mjs        → todos (1-7 octubre, 8-15 noviembre)
//   node marketing/scripts/render-carruseles.mjs 2 5    → solo el 2 y el 5
//
// Deja marketing/salida/carruseles/carrusel-N/NN.jpg, listos para subir en orden.
// Con --tiktok (solo de los carruseles 16 en adelante) copia además cada lámina a public/fotos-tiktok/carrusel-N-NN.jpg:
// TikTok solo baja fotos de un dominio verificado (bookeaa.com), y Central las pide de ahí con el mismo nombre que en Cloudinary.

import { copyFile, mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { chromium } from 'playwright-core'
import { RAIZ, servir } from './servidor.mjs'

const CHROMIUM = process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium'
const args = process.argv.slice(2)
const paraTikTok = args.includes('--tiktok')
const pedidos = args.filter((a) => !a.startsWith('--')).map(Number)

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
      const archivo = join(dir, `${String(s).padStart(2, '0')}.jpg`)
      await page.locator('.lamina').screenshot({ path: archivo, type: 'jpeg', quality: 92 })
      if (paraTikTok) {
        await mkdir(join(RAIZ, 'public/fotos-tiktok'), { recursive: true })
        await copyFile(archivo, join(RAIZ, 'public/fotos-tiktok', `carrusel-${id}-${String(s).padStart(2, '0')}.jpg`))
      }
    }
    console.log(`  ✓ carrusel ${id}: ${n} láminas`)
  }
} finally {
  await browser.close()
  cerrar()
}
