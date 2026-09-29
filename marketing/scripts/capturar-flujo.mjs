// Capturas reales del flujo de reserva para los videos y carruseles de la campaña.
//
//   node marketing/scripts/capturar-flujo.mjs
//
// Igual que scripts/capture-plantillas.mjs: compila la app en modo demo, la sirve y
// recorre una reserva completa de "Barbería Norte". Deja las capturas en
// marketing/assets/flujo/ (390×844 @2x, JPEG).

import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { mkdir } from 'node:fs/promises'
import { chromium } from 'playwright-core'

const PORT = 4320
const OUT_DIR = 'node_modules/.cache/marketing-demo'
const DESTINO = 'marketing/assets/flujo'
const CHROMIUM = process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium'

const NEGOCIO = new URLSearchParams({
  estilo: 'moderno',
  marca: 'Barbería Norte',
  principal: '#2F5BEA',
  fondo: '#F7F8FA',
  rubro: 'barberia',
  lugar: 'barberia',
  domicilio: 'si',
  sedes: '2',
  titulo: 'Tu corte, cuando quieras',
  subtitulo: 'Elige tu servicio, escoge la hora y confirma por WhatsApp.',
})

function run(cmd, args, env = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: 'inherit', env: { ...process.env, ...env } })
    child.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} salió con ${code}`))))
  })
}

async function esperar(url) {
  for (let i = 0; i < 80; i++) {
    try {
      if ((await fetch(url)).ok) return
    } catch {
      /* todavía no */
    }
    await new Promise((r) => setTimeout(r, 250))
  }
  throw new Error('vite preview no respondió')
}

await run('npx', ['vite', 'build', '--outDir', OUT_DIR, '--emptyOutDir'], { VITE_API_URL: '' })
const server = spawn('npx', ['vite', 'preview', '--outDir', OUT_DIR, '--port', String(PORT), '--strictPort'], { stdio: 'ignore' })

try {
  await esperar(`http://localhost:${PORT}/`)
  await mkdir(DESTINO, { recursive: true })
  const browser = await chromium.launch({ executablePath: CHROMIUM })
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, reducedMotion: 'reduce', locale: 'es-VE' })
  const page = await ctx.newPage()
  await page.route(/wa\.me/, (r) => r.fulfill({ body: '' }))
  const foto = async (nombre) => {
    await page.addStyleTag({ content: '[data-demo-badge]{display:none!important}' })
    await page.waitForTimeout(500)
    await page.screenshot({ path: `${DESTINO}/${nombre}.jpg`, type: 'jpeg', quality: 86 })
    console.log('  ✓', nombre)
  }

  await page.goto(`http://localhost:${PORT}/u/demo?${NEGOCIO}`, { waitUntil: 'networkidle' })
  await page.waitForSelector('h1')
  await page.evaluate(() => document.fonts.ready)
  await foto('1-inicio')

  // Servicios: se baja hasta la lista y se eligen dos.
  const servicios = page.locator('button[aria-pressed]')
  await page.getByText('Cortes', { exact: true }).first().scrollIntoViewIfNeeded()
  await page.evaluate(() => window.scrollBy(0, -80))
  await servicios.filter({ hasText: 'Corte y barba' }).first().click()
  await foto('2-servicios')

  await page.getByRole('button', { name: /Ver mi orden/ }).click()
  await page.waitForTimeout(600)
  await page.getByRole('radio', { name: /Sede Centro/ }).click()
  await foto('3-lugar')

  await page.getByRole('button', { name: /Elegir fecha y hora/ }).click()
  await page.waitForTimeout(1200)
  const dias = page.locator('[aria-label="Día de la cita"] button:not([disabled])')
  if ((await dias.count()) > 1) await dias.nth(1).click()
  await page.waitForTimeout(400)
  const horas = page.locator('[aria-label="Hora de la cita"] [role=radio]:not([disabled])')
  await horas.nth(Math.min(3, (await horas.count()) - 1)).click()
  await foto('4-agenda')

  await page.getByRole('button', { name: /Continuar al pago/ }).click()
  await page.waitForTimeout(600)
  await page.getByLabel(/nombre/i).first().fill('Carlos Méndez')
  await page.getByLabel(/tel/i).first().fill('0412 555 1234')
  await page.getByText('Pago en la cita').first().click()
  await page.evaluate(() => window.scrollTo(0, 0))
  await foto('5-pago')

  await page.getByRole('button', { name: /Reservar ·/ }).click()
  await page.waitForTimeout(1500)
  await foto('6-listo')

  await browser.close()
} finally {
  server.kill()
}
