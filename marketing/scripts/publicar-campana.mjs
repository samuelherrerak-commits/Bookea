// Copia los renders de marketing/salida/ a public/campana/media/ para la página de la campaña.
//
//   node marketing/scripts/publicar-campana.mjs
//
// - videos:     video-N.mp4 y video-N-portada.jpg
// - carruseles: cN/NN.jpg a 540 px (para ver) y bookeaa-carrusel-N.zip con los originales
// - historias:  historias/NN.jpg en tamaño original (se descargan una a una) y bookeaa-historias-noviembre.zip
// - ZIP por mes: bookeaa-carruseles.zip (octubre, 1-7) y bookeaa-carruseles-noviembre.zip (8-15)
//
// Necesita ffmpeg (FFMPEG_PATH) para reducir las imágenes y `zip` en el PATH.

import { execFileSync } from 'node:child_process'
import { copyFile, mkdir, readdir, rm } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { RAIZ } from './servidor.mjs'

const FFMPEG = process.env.FFMPEG_PATH || 'ffmpeg'
const SALIDA = join(RAIZ, 'marketing/salida')
const MEDIA = join(RAIZ, 'public/campana/media')
const MESES = { octubre: [1, 2, 3, 4, 5, 6, 7], noviembre: [8, 9, 10, 11, 12, 13, 14, 15] }

const reducir = (de, a) => execFileSync(FFMPEG, ['-y', '-loglevel', 'error', '-i', de, '-vf', 'scale=540:-2', '-q:v', '3', a])
const comprimir = (zip, archivos) => {
  if (existsSync(zip)) execFileSync('rm', [zip])
  execFileSync('zip', ['-j', '-q', zip, ...archivos])
}
const jpgs = async (dir) => (await readdir(dir)).filter((f) => f.endsWith('.jpg')).sort()

await mkdir(MEDIA, { recursive: true })

// Videos
const dirVideos = join(SALIDA, 'videos')
if (existsSync(dirVideos)) {
  for (const f of await readdir(dirVideos)) {
    const m = f.match(/^bookeaa-video-(\d+)(-portada\.jpg|\.mp4)$/)
    if (m) await copyFile(join(dirVideos, f), join(MEDIA, `video-${m[1]}${m[2]}`))
  }
  console.log('  ✓ videos')
}

// Carruseles
const originales = {}
for (const [mes, ids] of Object.entries(MESES)) {
  for (const id of ids) {
    const dir = join(SALIDA, `carruseles/carrusel-${id}`)
    if (!existsSync(dir)) continue
    const destino = join(MEDIA, `c${id}`)
    await rm(destino, { recursive: true, force: true })
    await mkdir(destino, { recursive: true })
    const lista = (await jpgs(dir)).map((f) => join(dir, f))
    for (const f of lista) reducir(f, join(destino, f.split('/').pop()))
    // Dentro del ZIP del mes, cada lámina lleva el número de carrusel para que no choquen.
    const conNombre = []
    for (const f of lista) {
      const tmp = join(SALIDA, `.zip-${mes}`, `carrusel-${id}-${f.split('/').pop()}`)
      await mkdir(join(SALIDA, `.zip-${mes}`), { recursive: true })
      await copyFile(f, tmp)
      conNombre.push(tmp)
    }
    comprimir(join(MEDIA, `bookeaa-carrusel-${id}.zip`), lista)
    ;(originales[mes] ||= []).push(...conNombre)
  }
  if (originales[mes]) {
    comprimir(join(MEDIA, mes === 'octubre' ? 'bookeaa-carruseles.zip' : `bookeaa-carruseles-${mes}.zip`), originales[mes])
    await rm(join(SALIDA, `.zip-${mes}`), { recursive: true, force: true })
    console.log(`  ✓ carruseles de ${mes}`)
  }
}

// Historias
const dirHist = join(SALIDA, 'historias')
if (existsSync(dirHist)) {
  const destino = join(MEDIA, 'historias')
  await rm(destino, { recursive: true, force: true })
  await mkdir(destino, { recursive: true })
  const lista = (await jpgs(dirHist)).map((f) => join(dirHist, f))
  for (const f of lista) await copyFile(f, join(destino, f.split('/').pop().replace('historia-', '')))
  comprimir(join(MEDIA, 'bookeaa-historias-noviembre.zip'), lista)
  console.log(`  ✓ ${lista.length} historias`)
}
