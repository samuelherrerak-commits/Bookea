// Renderiza los videos de la campaña a MP4 (1080×1920, 30 fps, H.264).
//
//   node marketing/scripts/render-video.mjs            → los 8 videos (octubre 1-4, noviembre 5-8)
//   node marketing/scripts/render-video.mjs 1 3        → solo el 1 y el 3
//   node marketing/scripts/render-video.mjs 2 --cuadros 1,4.5,9   → PNG sueltos para revisar
//
// Abre marketing/video/index.html?v=N&render=1, pide cada cuadro con window.seek(t)
// y se lo pasa a ffmpeg. Necesita un ffmpeg con libx264 (FFMPEG_PATH o "ffmpeg" en
// el PATH) y Chromium (CHROMIUM_PATH, por defecto el de /opt/pw-browsers).

import { spawn } from 'node:child_process'
import { mkdir, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { chromium } from 'playwright-core'
import { generarAudio } from './audio.mjs'
import { RAIZ, servir } from './servidor.mjs'

const SALIDA = join(RAIZ, 'marketing/salida/videos')
const FPS = 30
const FFMPEG = process.env.FFMPEG_PATH || 'ffmpeg'
const CHROMIUM = process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium'

const args = process.argv.slice(2)
const iCuadros = args.indexOf('--cuadros')
const cuadros = iCuadros >= 0 ? args[iCuadros + 1].split(',').map(Number) : null
const videos = args.filter((a, i) => /^\d$/.test(a) && (iCuadros < 0 || i !== iCuadros + 1)).map(Number)
const lista = videos.length ? videos : [1, 2, 3, 4, 5, 6, 7, 8]

const { url, cerrar } = await servir()
const base = `${url}/marketing/video/index.html`

await mkdir(SALIDA, { recursive: true })
const browser = await chromium.launch({ executablePath: CHROMIUM })

try {
  for (const n of lista) {
    const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 })
    page.on('pageerror', (e) => console.error('  error en la página:', e.message))
    await page.goto(`${base}?v=${n}&render=1`, { waitUntil: 'networkidle' })
    await page.evaluate(() => window.listo)
    const duracion = await page.evaluate(() => window.duracion)
    const stage = page.locator('#stage')

    if (cuadros) {
      for (const t of cuadros) {
        await page.evaluate((x) => window.seek(x), t)
        await stage.screenshot({ path: join(SALIDA, `video${n}-t${t}.png`) })
      }
      console.log(`  ✓ video ${n}: ${cuadros.length} cuadros`)
      await page.close()
      continue
    }

    const total = Math.round(duracion * FPS)
    // Audio primero: los efectos salen de las marcas de cada escena (window.cues)
    // y la música se genera con la duración exacta del video.
    const cues = await page.evaluate(() => window.cues)
    const wav = join(SALIDA, `.audio-${n}.wav`)
    await generarAudio({ duracion, cues, destino: wav, semilla: 7 + n })
    const destino = join(SALIDA, `bookeaa-video-${n}.mp4`)
    const ff = spawn(FFMPEG, [
      '-y', '-loglevel', 'error',
      '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
      '-i', wav,
      '-map', '0:v', '-map', '1:a',
      '-c:v', 'libx264', '-preset', 'medium', '-crf', '19', '-pix_fmt', 'yuv420p', '-movflags', '+faststart',
      // Instagram normaliza cerca de -14 LUFS: se entrega ahí para que no la baje ni la suba.
      '-af', 'loudnorm=I=-14:TP=-1.5:LRA=11',
      '-c:a', 'aac', '-b:a', '192k', '-shortest',
      destino,
    ], { stdio: ['pipe', 'inherit', 'inherit'] })
    const termino = new Promise((ok, mal) => ff.on('exit', (c) => (c === 0 ? ok() : mal(new Error('ffmpeg salió con ' + c)))))

    for (let f = 0; f < total; f++) {
      await page.evaluate((x) => window.seek(x), f / FPS)
      const jpg = await stage.screenshot({ type: 'jpeg', quality: 92 })
      if (!ff.stdin.write(jpg)) await new Promise((r) => ff.stdin.once('drain', r))
      if (f % 150 === 0) process.stdout.write(`  video ${n}: ${Math.round((f / total) * 100)} %\r`)
    }
    ff.stdin.end()
    await termino
    await rm(wav, { force: true })
    // Portada: un cuadro del gancho, cuando el título ya está completo.
    await page.evaluate(() => window.seek(1.6))
    await stage.screenshot({ path: join(SALIDA, `bookeaa-video-${n}-portada.jpg`), type: 'jpeg', quality: 90 })
    console.log(`  ✓ ${destino} (${duracion.toFixed(1)} s)`)
    await page.close()
  }
} finally {
  await browser.close()
  cerrar()
}
