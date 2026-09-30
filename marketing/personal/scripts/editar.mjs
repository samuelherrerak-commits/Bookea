// Edita un video de la cuenta personal de principio a fin.
//
//   node scripts/editar.mjs ediciones/2026-10-05-lanzamiento.json
//
// La edición (JSON) necesita como mínimo `fuente` (link de Google Drive, URL o ruta local).
// Cada paso guarda su resultado en la misma edición, así se puede corregir a mano y
// volver a correr: solo se rehace lo que falta.
//   1. descarga la fuente a public/entrada/
//   2. transcribe con Whisper (palabra por palabra) → <edición>.captions.json
//   3. corta silencios → `segmentos` (edítalos si quieres otro corte)
//   4. arma la música de bookeaa y los efectos (marketing/scripts/audio.mjs)
//   5. renderiza con Remotion y deja el volumen en -14 LUFS → salida/<nombre>.mp4
//
// Opciones: --sin-render (solo prepara), --cuadros 1,5.5 (PNG sueltos para revisar).
import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { basename, dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { generarAudio } from '../../scripts/audio.mjs'

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const PUBLIC = join(RAIZ, 'public')
const FFMPEG = process.env.FFMPEG_PATH || ffmpegConX264()
const CIERRE_S = 2.5
const GANCHO_S = 1.6

const args = process.argv.slice(2)
const rutaEdicion = resolve(args.find((a) => a.endsWith('.json')) ?? '')
if (!existsSync(rutaEdicion)) {
  console.error('Uso: node scripts/editar.mjs ediciones/<nombre>.json [--sin-render] [--cuadros 1,5.5]')
  process.exit(1)
}
const nombre = basename(rutaEdicion, '.json')
const e = JSON.parse(readFileSync(rutaEdicion, 'utf8'))
const guardar = () => writeFileSync(rutaEdicion, JSON.stringify(e, null, 2) + '\n')

function ffmpegConX264() {
  // El ffmpeg de Playwright no trae libx264; imageio-ffmpeg (pip) sí.
  const r = spawnSync('python3', ['-c', 'import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())'], { encoding: 'utf8' })
  return r.status === 0 ? r.stdout.trim() : 'ffmpeg'
}

function correr(cmd, argv, opciones = {}) {
  const r = spawnSync(cmd, argv, { stdio: opciones.capturar ? 'pipe' : 'inherit', encoding: 'utf8', cwd: RAIZ, maxBuffer: 1 << 28 })
  if (r.status !== 0) {
    if (opciones.capturar) console.error(r.stderr?.slice(-3000))
    throw new Error(`${cmd} salió con ${r.status}`)
  }
  return r
}

function duracionDe(archivo) {
  const r = correr(FFMPEG, ['-hide_banner', '-i', archivo, '-f', 'null', '-'], { capturar: true })
  const m = [...r.stderr.matchAll(/time=(\d+):(\d+):([\d.]+)/g)].pop()
  return m ? +m[1] * 3600 + +m[2] * 60 + +m[3] : 0
}

/** Link de Drive (compartido "cualquiera con el enlace") → descarga directa. */
function urlDescarga(fuente) {
  const id = fuente.match(/\/file\/d\/([\w-]+)/)?.[1] ?? fuente.match(/[?&]id=([\w-]+)/)?.[1]
  if (/drive\.google\.com/.test(fuente) && id) {
    return `https://drive.usercontent.google.com/download?id=${id}&export=download&confirm=t`
  }
  return fuente
}

// 1. Traer el video y dejarlo en un MP4 vertical fácil de leer para Remotion.
function traer() {
  if (e.video && existsSync(join(PUBLIC, e.video))) return
  if (!e.fuente) throw new Error('La edición no tiene `fuente` (link de Drive, URL o ruta).')
  mkdirSync(join(PUBLIC, 'entrada'), { recursive: true })
  let original = e.fuente
  if (/^https?:/.test(e.fuente)) {
    original = join(PUBLIC, 'entrada', `${nombre}-original`)
    console.log('↓ Descargando', e.fuente)
    correr('curl', ['-fL', '--retry', '3', '-o', original, urlDescarga(e.fuente)])
  }
  const destino = join('entrada', `${nombre}.mp4`)
  console.log('⚙ Normalizando a 1080×1920 · 30 fps')
  correr(FFMPEG, [
    '-y', '-hide_banner', '-loglevel', 'error', '-i', original,
    '-vf', 'scale=1080:1920:force_original_aspect_ratio=increase:flags=lanczos,crop=1080:1920,fps=30,unsharp=5:5:0.5',
    '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '17', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', join(PUBLIC, destino),
  ])
  e.video = destino
  guardar()
}

// 2. Subtítulos palabra por palabra.
//    Por defecto Whisper turbo con sherpa-onnx (modelos en GitHub Releases, no necesita
//    huggingface). Con `motorWhisper: "faster"` usa faster-whisper (alineación exacta,
//    pero baja el modelo de huggingface.co).
function transcribir() {
  const ruta = rutaEdicion.replace(/\.json$/, '.captions.json')
  if (!existsSync(ruta)) {
    console.log('✎ Transcribiendo con Whisper')
    if (e.motorWhisper === 'faster') {
      correr('python3', [join(RAIZ, 'scripts', 'transcribir.py'), join(PUBLIC, e.video), ruta, '--modelo', e.modeloWhisper ?? 'small'])
    } else {
      const wav = join(PUBLIC, 'tmp', `${nombre}-16k.wav`)
      mkdirSync(dirname(wav), { recursive: true })
      correr(FFMPEG, ['-y', '-hide_banner', '-loglevel', 'error', '-i', join(PUBLIC, e.video), '-ac', '1', '-ar', '16000', wav])
      correr('python3', [join(RAIZ, 'scripts', 'transcribir_sherpa.py'), wav, ruta, '--modelo', e.modeloWhisper ?? 'turbo'])
    }
  }
  return JSON.parse(readFileSync(ruta, 'utf8'))
}

// 3. Cortar silencios (y lo que no sea voz) dejando un respiro natural.
function cortar(total, captions) {
  if (e.segmentos?.length) return
  // Con tiempos por palabra (faster-whisper) se corta por las pausas entre palabras:
  // funciona aunque haya ruido de fondo, donde silencedetect no encuentra nada.
  if (e.motorWhisper === 'faster' && captions.length) {
    const pausa = e.silencioMin ?? 0.45
    const segs = []
    for (const c of captions) {
      const a = c.startMs / 1000
      const b = c.endMs / 1000
      const ult = segs[segs.length - 1]
      if (ult && a - ult.hasta <= pausa) ult.hasta = b
      else segs.push({ desde: a, hasta: b })
    }
    e.segmentos = segs.map((x) => ({ desde: +Math.max(0, x.desde - 0.12).toFixed(2), hasta: +Math.min(total, x.hasta + 0.2).toFixed(2) }))
    const quedan = e.segmentos.reduce((s, x) => s + x.hasta - x.desde, 0)
    console.log(`✂ ${e.segmentos.length} tramos (por palabras) · ${total.toFixed(1)} s → ${quedan.toFixed(1)} s`)
    guardar()
    return
  }
  const r = correr(FFMPEG, ['-hide_banner', '-i', join(PUBLIC, e.video), '-af', `silencedetect=noise=${e.umbralSilencio ?? '-32dB'}:d=${e.silencioMin ?? 0.45}`, '-f', 'null', '-'], { capturar: true })
  const silencios = []
  let desde = null
  for (const l of r.stderr.split('\n')) {
    const a = l.match(/silence_start: ([\d.]+)/)
    const b = l.match(/silence_end: ([\d.]+)/)
    if (a) desde = +a[1]
    if (b && desde != null) silencios.push([desde, +b[1]]), (desde = null)
  }
  if (desde != null) silencios.push([desde, total])
  const aire = 0.12
  const segmentos = []
  let t = 0
  for (const [a, b] of silencios) {
    if (a - t > 0.25) segmentos.push({ desde: +Math.max(0, t - aire).toFixed(2), hasta: +Math.min(total, a + aire).toFixed(2) })
    t = b
  }
  if (total - t > 0.25) segmentos.push({ desde: +Math.max(0, t - aire).toFixed(2), hasta: +total.toFixed(2) })
  e.segmentos = segmentos.length ? segmentos : [{ desde: 0, hasta: +total.toFixed(2) }]
  const quedan = e.segmentos.reduce((s, x) => s + x.hasta - x.desde, 0)
  console.log(`✂ ${e.segmentos.length} tramos · ${total.toFixed(1)} s → ${quedan.toFixed(1)} s`)
  guardar()
}

/** Segundo del original → segundo del video final (igual que aSalida de src/tiempo.ts). */
function aSalida(t) {
  let ini = 0
  for (const s of e.segmentos) {
    if (t < s.desde) return ini
    if (t < s.hasta) return ini + t - s.desde
    ini += s.hasta - s.desde
  }
  return ini
}

// 4. Música de bookeaa y efectos sincronizados.
async function sonido() {
  const cortes = e.segmentos.reduce((s, x) => s + x.hasta - x.desde, 0)
  const duracion = cortes + (e.cierre ? CIERRE_S : 0)
  const cues = [...(e.sonidos ?? [])]
  let t = 0
  e.segmentos.forEach((s, i) => {
    if (s.bloque && i > 0) cues.push({ t: Math.max(0, t - 0.06), tipo: 'golpe' })
    t += s.hasta - s.desde
  })
  // Mismos efectos que los reels de la marca: texto al entrar un titular, whoosh en la ola.
  if (e.gancho) cues.push({ t: 0.08, tipo: 'texto' }, { t: GANCHO_S - 0.45, tipo: 'whoosh' })
  for (const x of e.enfasis ?? []) cues.push({ t: (x.ts != null ? aSalida(x.ts) : x.t) + 0.04, tipo: 'texto' })
  // Escenas de marca: whoosh en la ola/lado, texto al entrar el titular, desliza con cada
  // teléfono y teclas mientras se escribe el link (igual que los reels de la campaña).
  for (const x of e.escenas ?? []) {
    const a = aSalida(x.desde)
    const entrada = x.entrada ?? 'ola'
    const base = entrada === 'corte' ? 0.05 : 0.3
    if (entrada !== 'corte') cues.push({ t: a, tipo: 'whoosh' })
    if (x.tiempos) x.tiempos.forEach((ts) => cues.push({ t: Math.max(a + base, aSalida(ts)) + 0.05, tipo: 'texto' }))
    else cues.push({ t: a + base + 0.05, tipo: 'texto' })
    ;(x.telefonos ?? []).forEach((tel, i) => cues.push({ t: tel.en != null ? Math.max(a + base, aSalida(tel.en)) : a + base + 0.5 + i * 0.3, tipo: 'desliza' }))
    if (x.link) for (let i = 0; i < x.link.length; i++) cues.push({ t: a + base + 0.75 + (1.0 * i) / x.link.length, tipo: 'tecla' })
  }
  if (e.cierre) cues.push({ t: cortes + 0.1, tipo: 'final' })

  mkdirSync(join(PUBLIC, 'tmp'), { recursive: true })
  e.efectos = `tmp/${nombre}-efectos.wav`
  await generarAudio({ duracion, cues, destino: join(PUBLIC, e.efectos), volumenMusica: 0 })
  if (e.conMusica) {
    e.musica = `tmp/${nombre}-musica.wav`
    await generarAudio({ duracion, cues: [], destino: join(PUBLIC, e.musica), semilla: e.semillaMusica ?? 7, volumenMusica: 1 })
  } else {
    delete e.musica
  }
}

// 5. Render + volumen de Instagram/TikTok.
function renderizar(captions) {
  mkdirSync(join(RAIZ, 'salida'), { recursive: true })
  const props = join(PUBLIC, 'tmp', `${nombre}-props.json`)
  writeFileSync(props, JSON.stringify({ ...e, captions }))
  const cuadros = args[args.indexOf('--cuadros') + 1]
  const npx = ['remotion']
  if (args.includes('--cuadros') && cuadros) {
    for (const s of cuadros.split(',')) {
      const png = join(RAIZ, 'salida', `${nombre}-${s}s.png`)
      correr('npx', [...npx, 'still', 'src/index.ts', 'Vlog', png, `--props=${props}`, `--frame=${Math.round(+s * 30)}`])
    }
    return
  }
  const crudo = join(PUBLIC, 'tmp', `${nombre}-crudo.mp4`)
  correr('npx', [...npx, 'render', 'src/index.ts', 'Vlog', crudo, `--props=${props}`, '--crf=18', '--concurrency=50%'])
  const final = join(RAIZ, 'salida', `${nombre}.mp4`)
  console.log('🔊 Normalizando a -14 LUFS')
  correr(FFMPEG, [
    '-y', '-hide_banner', '-loglevel', 'error', '-i', crudo,
    '-af', 'highpass=f=70,acompressor=threshold=-20dB:ratio=3:attack=5:release=120,loudnorm=I=-14:TP=-1.5:LRA=9',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '22', '-maxrate', '3.8M', '-bufsize', '7.6M', '-pix_fmt', 'yuv420p', '-color_range', 'tv',
    '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-movflags', '+faststart', final,
  ])
  console.log('✔', final)
}

traer()
const total = duracionDe(join(PUBLIC, e.video))
const captions = transcribir()
cortar(total, captions)
await sonido()
guardar()
if (!args.includes('--sin-render')) renderizar(captions)
