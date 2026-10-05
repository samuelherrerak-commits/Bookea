// Objetivo de la tarjeta en realidad aumentada (/ar): lo que la cámara reconoce.
//
//   npm run ar:objetivo                     (tarjeta 1 · Sin libreta)
//   node marketing/scripts/ar-objetivo.mjs --tarjeta 3 --ancho 1000
//
// 1. Renderiza el frente de la tarjeta desde marketing/tarjetas/index.html (sin tocarlo),
//    recortado a 90 × 50 mm: el sangrado se va al cortar, así que la cámara nunca lo ve.
// 2. Mide dónde quedó el ícono del logo, para que el personaje salga exactamente de ahí.
// 3. Compila el .mind con el compilador de MindAR (el mismo de la web oficial) en Chromium.
//
// Deja:
//   marketing/ar/objetivo.png   imagen objetivo (también sirve para el compilador web)
//   public/ar/tarjeta.webp      miniatura del frente (pantalla inicial y Plan B)
//   public/ar/tarjeta.json      medidas, posición del logo y colores
//   public/ar/tarjeta.mind      objetivo compilado
//
// Si cambias el frente de la tarjeta, vuelve a correr esto: el .mind viejo ya no lo reconoce.

import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { parseArgs } from 'node:util'
import { chromium } from 'playwright-core'
import { RAIZ, servir } from './servidor.mjs'

const { values: op } = parseArgs({
  options: {
    tarjeta: { type: 'string', default: '1' },
    ancho: { type: 'string', default: '1000' },
  },
})
const TARJETA = Number(op.tarjeta)
const ANCHO = Number(op.ancho)
const CHROMIUM = process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium'
const MM = 96 / 25.4 // px CSS por mm
const SANGRADO = 3
const CORTE = { ancho: 90, alto: 50 }
const MINDAR = '/public/ar/vendor/mind-ar-1.2.5/mindar-image.prod.js'
// Menos puntos que esto en la escala original y el reconocimiento se vuelve inestable.
const PUNTOS_MINIMOS = 80

const AR = join(RAIZ, 'public/ar')
const SALIDA = join(RAIZ, 'marketing/ar')
await mkdir(SALIDA, { recursive: true })

const { url, cerrar } = await servir()
// TensorFlow.js necesita WebGL: en headless lo da SwiftShader (por CPU, más lento pero igual).
const browser = await chromium.launch({
  executablePath: CHROMIUM,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
})
try {
  // Se renderiza con más resolución de la necesaria y se recorta en un canvas: el recorte de
  // Playwright redondea a píxeles enteros y correría el objetivo unas décimas de mm.
  const DPR = 4
  const page = await browser.newPage({
    viewport: { width: Math.ceil((CORTE.ancho + 2 * SANGRADO) * MM), height: Math.ceil((CORTE.alto + 2 * SANGRADO) * MM) },
    deviceScaleFactor: DPR,
  })
  page.on('console', (m) => {
    if (m.type() === 'error') console.error('  [chromium]', m.text())
    else if (m.text().startsWith('progreso')) console.log(`    ${m.text()}`)
  })
  await page.goto(`${url}/marketing/tarjetas/index.html?t=${TARJETA}&cara=frente`, { waitUntil: 'networkidle' })
  await page.evaluate(() => window.listo)

  // 1. Imagen objetivo: la cara sin el sangrado, a ANCHO px y con la proporción exacta de 90 × 50.
  const cara = await page.locator('.cara').screenshot()
  const png = Buffer.from(
    await page.evaluate(
      async ({ b64, px, SANGRADO, CORTE, ANCHO }) => {
        const img = new Image()
        img.src = `data:image/png;base64,${b64}`
        await img.decode()
        const lienzo = document.createElement('canvas')
        lienzo.width = ANCHO
        lienzo.height = Math.round((ANCHO * CORTE.alto) / CORTE.ancho)
        const ctx = lienzo.getContext('2d')
        ctx.imageSmoothingQuality = 'high'
        ctx.drawImage(img, SANGRADO * px, SANGRADO * px, CORTE.ancho * px, CORTE.alto * px, 0, 0, lienzo.width, lienzo.height)
        return lienzo.toDataURL('image/png').split(',')[1]
      },
      { b64: cara.toString('base64'), px: MM * DPR, SANGRADO, CORTE, ANCHO },
    ),
    'base64',
  )
  await writeFile(join(SALIDA, 'objetivo.png'), png)

  // 2. Dónde está el ícono (el <svg> de 32 × 32 del logo) y de qué colores es.
  const medida = await page.evaluate(
    ({ MM, SANGRADO }) => {
      const cara = document.querySelector('.cara')
      const svg = cara.querySelector('.logo svg')
      if (!svg) throw new Error('Esta tarjeta no tiene el logo en el frente')
      const c = cara.getBoundingClientRect()
      const r = svg.getBoundingClientRect()
      const hex = (color) => {
        const m = color.match(/\d+(\.\d+)?/g)
        if (!m || color.startsWith('#')) return color
        return '#' + m.slice(0, 3).map((v) => Number(v).toString(16).padStart(2, '0')).join('')
      }
      const redondo = (v) => Math.round(v * 1000) / 1000
      return {
        fondo: hex(getComputedStyle(cara).backgroundColor),
        logo: {
          x: redondo((r.left - c.left) / MM - SANGRADO),
          y: redondo((r.top - c.top) / MM - SANGRADO),
          lado: redondo(r.width / MM),
          cuerpo: svg.querySelector('rect').getAttribute('fill'),
          calado: svg.querySelector('path[fill="none"]').getAttribute('stroke'),
        },
      }
    },
    { MM, SANGRADO },
  )

  // 3. Miniatura en WebP y compilación del .mind, las dos en el navegador.
  console.log('  Compilando el objetivo con MindAR (en headless tarda 1–3 minutos)…')
  const t0 = Date.now()
  const resultado = await page.evaluate(
    async ({ b64, MINDAR }) => {
      const img = new Image()
      img.src = `data:image/png;base64,${b64}`
      await img.decode()

      const lienzo = document.createElement('canvas')
      lienzo.width = 900
      lienzo.height = Math.round((900 * img.height) / img.width)
      lienzo.getContext('2d').drawImage(img, 0, 0, lienzo.width, lienzo.height)
      const webp = lienzo.toDataURL('image/webp', 0.86).split(',')[1]

      const { Compiler } = await import(MINDAR)
      const compilador = new Compiler()
      let ultimo = -10
      const datos = await compilador.compileImageTargets([img], (p) => {
        if (p - ultimo >= 10) {
          ultimo = p
          console.log(`progreso ${Math.round(p)}%`)
        }
      })
      const bytes = compilador.exportData()
      let bin = ''
      for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
      return {
        mind: btoa(bin),
        webp,
        imagen: { ancho: img.width, alto: img.height },
        puntos: datos[0].matchingData.map((d) => d.maximaPoints.length + d.minimaPoints.length),
        seguimiento: datos[0].trackingData.map((d) => d.points.length),
      }
    },
    { b64: png.toString('base64'), MINDAR },
  )
  const mind = Buffer.from(resultado.mind, 'base64')
  await writeFile(join(AR, 'tarjeta.mind'), mind)
  await writeFile(join(AR, 'tarjeta.webp'), Buffer.from(resultado.webp, 'base64'))

  const config = {
    version: 1,
    tarjeta: TARJETA,
    ancho: CORTE.ancho,
    alto: CORTE.alto,
    fondo: medida.fondo,
    // mm desde la esquina superior izquierda de la tarjeta cortada; el ícono de 32 × 32 ocupa ese cuadrado.
    logo: medida.logo,
    imagen: resultado.imagen,
    mind: { puntos: resultado.puntos, seguimiento: resultado.seguimiento },
  }
  await writeFile(join(AR, 'tarjeta.json'), JSON.stringify(config, null, 2) + '\n')

  const original = resultado.puntos[0]
  console.log(`  ✓ tarjeta.mind (${(mind.length / 1024).toFixed(0)} KB) en ${((Date.now() - t0) / 1000).toFixed(0)} s`)
  console.log(`    puntos por escala: ${resultado.puntos.join(' · ')}  (seguimiento: ${resultado.seguimiento.join(' · ')})`)
  console.log(`  ✓ logo en x=${medida.logo.x} y=${medida.logo.y} mm, lado ${medida.logo.lado} mm`)
  console.log('  ✓ marketing/ar/objetivo.png · public/ar/tarjeta.webp · public/ar/tarjeta.json')
  if (original < PUNTOS_MINIMOS) {
    console.warn(`  ⚠ Solo ${original} puntos en la escala original: el diseño tiene poco detalle y el reconocimiento será inestable.`)
  }
} finally {
  await browser.close()
  cerrar()
}
