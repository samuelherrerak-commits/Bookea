// Prueba de punta a punta de /ar sin teléfono: una cámara falsa con la tarjeta.
//
//   npm run ar:verificar
//
// 1. Arma un video sintético: fondo de mesa, la tarjeta (marketing/ar/objetivo.png) en
//    perspectiva que se mueve un poco, sale de cuadro y vuelve.
// 2. Abre /ar en Chromium con ese video como cámara y toca "Ver en realidad aumentada".
// 3. Comprueba que MindAR la reconoce, que la animación avanza, que se pausa y muestra
//    "Apunta a la tarjeta" al perderla y que retoma al volver. Luego prueba el Plan B con el
//    permiso de cámara negado y mide el peso de /ar.
//
// Las capturas quedan en marketing/salida/ar/ (no se suben al repo). En headless WebGL corre
// por CPU (SwiftShader): los FPS de aquí no dicen nada del teléfono, pero el flujo es el real.

import { execFileSync } from 'node:child_process'
import { brotliCompressSync, constants } from 'node:zlib'
import { mkdir, readdir, readFile, rm, stat } from 'node:fs/promises'
import { join, relative } from 'node:path'
import { chromium } from 'playwright-core'
import { RAIZ } from './servidor.mjs'
import { PUBLICO, servirPublico } from './ar-servidor.mjs'

const CHROMIUM = process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium'
const SALIDA = join(RAIZ, 'marketing/salida/ar')
const CUADROS = join(SALIDA, 'cuadros')
const VIDEO = join(SALIDA, 'camara-falsa.y4m')
const FPS = 10
const DURACION = 14 // s del video (Chromium lo repite en bucle)
const GPU = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']

const fallas = []
const ok = (cond, msg) => {
  console.log(`  ${cond ? '✓' : '✗'} ${msg}`)
  if (!cond) fallas.push(msg)
}

await rm(CUADROS, { recursive: true, force: true })
await mkdir(CUADROS, { recursive: true })

// ── 1. video sintético ──
console.log('Armando la cámara falsa…')
{
  const tarjeta = (await readFile(join(RAIZ, 'marketing/ar/objetivo.png'))).toString('base64')
  const browser = await chromium.launch({ executablePath: CHROMIUM })
  // vertical, como entrega la cámara un teléfono en la mano
  const page = await browser.newPage({ viewport: { width: 480, height: 640 } })
  await page.setContent(`<style>
    body{margin:0;width:480px;height:640px;overflow:hidden;perspective:700px;
      background:radial-gradient(circle at 30% 20%,#b9a58a,#8c7558 70%);}
    body::before{content:'';position:absolute;inset:0;opacity:.35;
      background:repeating-linear-gradient(8deg,transparent 0 22px,rgb(60 40 20 / .25) 22px 24px);}
    img{position:absolute;left:50%;top:58%;width:330px;margin:-92px 0 0 -165px;border-radius:3px;
      box-shadow:0 18px 30px rgb(0 0 0 / .35);}
  </style><img src="data:image/png;base64,${tarjeta}">`)
  const n = FPS * DURACION
  for (let i = 0; i < n; i++) {
    const t = i / FPS
    // 0–1 s sin tarjeta · 1–7 s se mueve un poco · 7–8,5 s sale de cuadro · 8,5–14 s vuelve
    let x = 0
    if (t < 1) x = -900
    else if (t >= 7 && t < 8.5) x = -900 * Math.min(1, (t - 7) / 0.6)
    else if (t >= 8.5 && t < 9.1) x = -900 * (1 - (t - 8.5) / 0.6)
    const rx = 22 + 6 * Math.sin(t * 1.3)
    const ry = 9 * Math.sin(t * 0.9)
    const rz = 4 * Math.sin(t * 0.7)
    const y = 8 * Math.sin(t * 1.1)
    await page.evaluate(
      ([x, y, rx, ry, rz]) => {
        document.querySelector('img').style.transform = `translate(${x}px, ${y}px) rotateX(${rx}deg) rotateY(${ry}deg) rotateZ(${rz}deg)`
      },
      [x, y, rx, ry, rz],
    )
    await page.screenshot({ path: join(CUADROS, `${String(i).padStart(4, '0')}.png`) })
  }
  await browser.close()
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(FPS), '-i', join(CUADROS, '%04d.png'), '-pix_fmt', 'yuv420p', VIDEO])
  await rm(CUADROS, { recursive: true, force: true })
  console.log(`  ✓ ${relative(RAIZ, VIDEO)} (${DURACION} s a ${FPS} fps)`)
}

const { url, cerrar } = await servirPublico()
try {
  // ── 2 y 3. AR con la cámara falsa ──
  console.log('Modo AR con la cámara falsa…')
  const browser = await chromium.launch({
    executablePath: CHROMIUM,
    args: [...GPU, '--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', `--use-file-for-fake-video-capture=${VIDEO}`, '--autoplay-policy=no-user-gesture-required'],
  })
  const page = await browser.newPage({ viewport: { width: 390, height: 780 }, deviceScaleFactor: 2 })
  const errores = []
  page.on('pageerror', (e) => errores.push(e.message))
  page.on('console', (m) => m.type() === 'error' && errores.push(m.text()))
  await page.goto(`${url}/ar/?debug`, { waitUntil: 'networkidle' })
  await page.screenshot({ path: join(SALIDA, '1-inicio.png') })
  await page.click('#ver-ar')
  await page.waitForFunction(() => window.__ar.pantalla === 'ar' || window.__ar.modo === 'planb', null, { timeout: 90000 })
  ok(await page.evaluate(() => window.__ar.modo === 'ar'), 'se abrió la cámara y arrancó MindAR')
  await page.screenshot({ path: join(SALIDA, '2-apunta.png') })

  const esperar = (rastreo, ms) =>
    page.waitForFunction((r) => window.__ar.rastreo === r, rastreo, { timeout: ms }).then(
      () => true,
      () => false,
    )
  ok(await esperar('encontrada', 90000), 'MindAR reconoce la tarjeta')
  const t0 = await page.evaluate(() => window.__ar.t)
  await page.waitForTimeout(2500)
  const t1 = await page.evaluate(() => window.__ar.t)
  ok(t1 > t0, `la animación avanza con la tarjeta a la vista (t ${t0.toFixed(2)} → ${t1.toFixed(2)})`)
  await page.screenshot({ path: join(SALIDA, '3-anclada.png') })

  ok(await esperar('perdida', 30000), 'detecta que la tarjeta salió de cuadro')
  const p0 = await page.evaluate(() => window.__ar.t)
  await page.waitForTimeout(700)
  const p1 = await page.evaluate(() => ({ t: window.__ar.t, rastreo: window.__ar.rastreo }))
  if (p1.rastreo === 'perdida') ok(p1.t === p0, 'la animación queda en pausa mientras no la ve')
  ok(await page.isVisible('#apunta'), 'muestra "Apunta a la tarjeta"')
  await page.screenshot({ path: join(SALIDA, '4-perdida.png') })
  ok(await esperar('encontrada', 30000), 'la vuelve a reconocer y sigue')
  await page.waitForTimeout(1200)
  await page.screenshot({ path: join(SALIDA, '5-retoma.png') })
  const estado = await page.evaluate(() => window.__ar)
  console.log(`    (render ${estado.fps} fps, MindAR ${estado.fpsRastreo} cuadros/s en SwiftShader)`)
  ok(errores.length === 0 && estado.errores.length === 0, `sin errores en la consola${errores.length ? `: ${errores[0]}` : ''}`)
  await browser.close()

  // ── Plan B: permiso negado ──
  console.log('Plan B con la cámara negada…')
  // hay cámara (falsa) pero el permiso se niega, como cuando alguien toca "No permitir"
  const b2 = await chromium.launch({ executablePath: CHROMIUM, args: [...GPU, '--use-fake-device-for-media-stream', '--deny-permission-prompts'] })
  const ctx = await b2.newContext({ viewport: { width: 390, height: 780 }, deviceScaleFactor: 2 })
  const p2 = await ctx.newPage()
  await p2.goto(`${url}/ar/`, { waitUntil: 'networkidle' })
  await p2.click('#ver-ar')
  await p2.waitForFunction(() => window.__ar.modo === 'planb' && window.__ar.listo, null, { timeout: 60000 })
  const motivo = await p2.evaluate(() => window.__ar.motivo)
  ok(motivo === 'permiso', `entra el Plan B y explica que falta el permiso (${motivo})`)
  ok(await p2.isVisible('#cta'), 'el botón "Prueba 1 mes gratis" está a la vista')
  await p2.waitForTimeout(1500)
  await p2.screenshot({ path: join(SALIDA, '6-planb.png') })
  await b2.close()

  // ── peso ──
  const archivos = []
  const recorrer = async (dir) => {
    for (const f of await readdir(dir, { withFileTypes: true })) {
      const ruta = join(dir, f.name)
      if (f.isDirectory()) await recorrer(ruta)
      else archivos.push(ruta)
    }
  }
  await recorrer(join(PUBLICO, 'ar'))
  let crudo = 0
  let comprimido = 0
  // el CDN comprime con brotli solo lo que es texto; el .mind, las fuentes y la imagen van tal cual
  for (const f of archivos) {
    const tam = (await stat(f)).size
    crudo += tam
    comprimido += /\.(js|html|json|css|svg|txt)$/.test(f) ? brotliCompressSync(await readFile(f), { params: { [constants.BROTLI_PARAM_QUALITY]: 5 } }).length : tam
  }
  const mb = (n) => (n / 1024 / 1024).toFixed(2)
  ok(comprimido < 3 * 1024 * 1024, `peso de /ar: ${mb(comprimido)} MB transferidos (${mb(crudo)} MB sin comprimir)`)
} finally {
  cerrar()
}

console.log(fallas.length ? `\n${fallas.length} comprobación(es) fallaron.` : `\nTodo bien. Capturas en ${relative(RAIZ, SALIDA)}/`)
process.exitCode = fallas.length ? 1 : 0
