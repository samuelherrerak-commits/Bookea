// Identidad de bookeaa: logos y piezas para Instagram y WhatsApp Business.
//
//   node marketing/scripts/render-marca.mjs
//
// Deja en marketing/salida/marca/:
//   logo/        PNG transparentes (logos e ícono), SVG del ícono y PDF vectorial de cada logo
//   instagram/   perfil.png, destacadas/ (portadas + SVG del ícono) e historias/ (una por destacada)
//   whatsapp/    perfil.png, portada.png, catalogo/ y los QR con el mensaje ya escrito
//   bookeaa-marca.zip   todo junto

import { execFileSync } from 'node:child_process'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { chromium } from 'playwright-core'
import { RAIZ, servir } from './servidor.mjs'

const CHROMIUM = process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium'
const SALIDA = join(RAIZ, 'marketing/salida/marca')

/** id de la pieza → archivo de salida. */
function destino(id) {
  if (id.startsWith('logo-') || id.startsWith('icono-')) return `logo/bookeaa-${id}.png`
  if (id === 'ig-perfil') return 'instagram/perfil.png'
  if (id.startsWith('destacada-')) return `instagram/destacadas/${id.slice(10)}.png`
  if (id.startsWith('historia-')) return `instagram/historias/${id.slice(9)}.png`
  if (id === 'wa-perfil') return 'whatsapp/perfil.png'
  if (id === 'wa-portada') return 'whatsapp/portada.png'
  if (id.startsWith('catalogo-')) return `whatsapp/catalogo/${id.slice(9)}.png`
  if (id.startsWith('qr-')) return `whatsapp/${id}.png`
  throw new Error('Pieza sin destino: ' + id)
}

await rm(SALIDA, { recursive: true, force: true })
const { url, cerrar } = await servir()
const browser = await chromium.launch({ executablePath: CHROMIUM })
try {
  const base = `${url}/marketing/marca/piezas.html`
  const indice = await browser.newPage()
  await indice.goto(base, { waitUntil: 'networkidle' })
  const ids = await indice.evaluate(() => window.PIEZAS_IDS)
  const svgs = await indice.evaluate(() => window.SVGS)
  await indice.close()

  const page = await browser.newPage({ viewport: { width: 2000, height: 2000 } })
  for (const id of ids) {
    await page.goto(`${base}?p=${id}`, { waitUntil: 'networkidle' })
    await page.evaluate(() => window.listo)
    const archivo = join(SALIDA, destino(id))
    await mkdir(dirname(archivo), { recursive: true })
    await page.locator('.pieza').screenshot({ path: archivo, omitBackground: true })

    // Los logos también en PDF vectorial (con la fuente incrustada), para imprenta.
    if (id.startsWith('logo-') || id.startsWith('icono-')) {
      const caja = await page.locator('.pieza').boundingBox()
      await page.pdf({ path: archivo.replace(/\.png$/, '.pdf'), width: `${caja.width}px`, height: `${caja.height}px`, printBackground: false, pageRanges: '1' })
    }
  }
  for (const [id, svg] of Object.entries(svgs)) {
    const archivo = id.startsWith('icono-') ? join(SALIDA, `logo/bookeaa-${id}.svg`) : join(SALIDA, `instagram/destacadas/${id.slice(10)}.svg`)
    await writeFile(archivo, svg)
  }
  console.log(`  ✓ ${ids.length} piezas`)

  // Los textos del kit también como .md, para tenerlos fuera de la página.
  const kit = await browser.newPage()
  await kit.goto(`${url}/marketing/kit/index.html`, { waitUntil: 'networkidle' })
  const md = await kit.evaluate(() => {
    const T = window.TEXTOS
    const aMd = (titulo, lista) => [`# ${titulo}`, ''].concat(lista.map((t) => {
      if (t.seccion) return `## ${t.seccion}\n`
      return [`### ${t.atajo ? '/' + t.atajo + ' · ' : ''}${t.titulo}`, t.donde ? `_${t.donde}_` : '', t.texto ? '```\n' + t.texto + '\n```' : '', t.nota || '', ''].filter(Boolean).join('\n\n')
    })).join('\n')
    return { ig: aMd('Instagram · @' + window.Marca.INSTAGRAM, T.INSTAGRAM), wa: aMd('WhatsApp Business · ' + window.Marca.WHATSAPP_VISIBLE, T.WHATSAPP) }
  })
  await kit.close()
  await writeFile(join(SALIDA, 'textos-instagram.md'), md.ig + '\n')
  await writeFile(join(SALIDA, 'configuracion-whatsapp.md'), md.wa + '\n')
  console.log('  ✓ textos .md')
} finally {
  await browser.close()
  cerrar()
}

execFileSync('zip', ['-qr', 'bookeaa-marca.zip', 'logo', 'instagram', 'whatsapp', 'textos-instagram.md', 'configuracion-whatsapp.md'], { cwd: SALIDA })
console.log('  ✓ bookeaa-marca.zip')
