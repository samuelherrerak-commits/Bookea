// Genera las capturas reales de las plantillas que muestra la landing de bookeaa.
//
//   npm run capture:plantillas
//
// Compila la app en modo demo (sin VITE_API_URL: usa los datos de ejemplo de
// src/lib/mock.ts), la sirve con vite preview y abre /u/demo con ?estilo=, ?principal=,
// ?fondo=… para cada combinación. Las capturas quedan en public/landing/.
// Chromium: el del sistema en /opt/pw-browsers, o el que diga CHROMIUM_PATH.

import { spawn } from 'node:child_process'
import { mkdir, readFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { chromium } from 'playwright-core'

const PORT = 4319
const OUT_DIR = 'node_modules/.cache/plantillas-demo'
const CHROMIUM = process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium'

// Una por estilo y tres combinaciones de color del mismo estilo. La landing lee el
// mismo archivo para saber qué captura es cuál, así que se edita en un solo lugar.
const { plantillas: PLANTILLAS, colores: COLORES } = JSON.parse(
  await readFile(new URL('../src/landing/plantillas.json', import.meta.url), 'utf8'),
)

function run(cmd, args, env = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: 'inherit', env: { ...process.env, ...env } })
    child.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} ${args.join(' ')} salió con ${code}`))))
  })
}

async function waitForServer(url, tries = 60) {
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url)
      if (res.ok) return
    } catch {
      /* todavía no levanta */
    }
    await new Promise((r) => setTimeout(r, 250))
  }
  throw new Error(`vite preview no respondió en ${url}`)
}

async function capture(browser, spec, path) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    reducedMotion: 'reduce',
    locale: 'es-VE',
  })
  const page = await context.newPage()
  const qs = new URLSearchParams({
    estilo: spec.estilo,
    marca: spec.marca,
    principal: spec.principal,
    fondo: spec.fondo,
    ...(spec.rubro ? { rubro: spec.rubro } : {}),
  })
  await page.goto(`http://localhost:${PORT}/u/demo?${qs}`, { waitUntil: 'networkidle' })
  // El catálogo demo tarda ~650 ms y las fuentes llegan después: esperamos a ambas.
  await page.waitForSelector('h1')
  // La pastilla "Demo" no existe en la página de un negocio real.
  await page.addStyleTag({ content: '[data-demo-badge]{display:none!important}' })
  await page.evaluate(() => document.fonts.ready)
  await page.waitForTimeout(400)
  await page.screenshot({ path, type: 'jpeg', quality: 82 })
  await context.close()
  console.log('  ✓', path)
}

if (!existsSync(CHROMIUM)) {
  console.error(`No encontré Chromium en ${CHROMIUM}. Define CHROMIUM_PATH.`)
  process.exit(1)
}

// VITE_API_URL vacío en el entorno gana sobre .env: fuerza el modo demo.
await run('npx', ['vite', 'build', '--outDir', OUT_DIR, '--emptyOutDir'], { VITE_API_URL: '' })
const server = spawn('npx', ['vite', 'preview', '--outDir', OUT_DIR, '--port', String(PORT), '--strictPort'], {
  stdio: 'ignore',
})

try {
  await waitForServer(`http://localhost:${PORT}/`)
  await mkdir('public/landing/plantillas', { recursive: true })
  await mkdir('public/landing/colores', { recursive: true })
  const browser = await chromium.launch({ executablePath: CHROMIUM })
  for (const p of PLANTILLAS) await capture(browser, p, `public/landing/plantillas/${p.file}.jpg`)
  for (const c of COLORES) await capture(browser, c, `public/landing/colores/${c.file}.jpg`)
  await browser.close()
} finally {
  server.kill()
}
