// Arma un video FYP (MG sin voz, o VOZ con voz de IA) de principio a fin.
//
//   node scripts/fyp.mjs FYP-S01-JUE-MG FYP-S01-JUE-VOZ        # renderiza esos
//   node scripts/fyp.mjs FYP-S01-VIE-VOZ --cuadros 1,5,12      # PNG sueltos para revisar
//   node scripts/fyp.mjs FYP-S01-VIE-VOZ --voz es_ES-davefx-medium --vel 0.85
//
// Lee fyp/videos.json (lo genera fyp/generar.py desde fyp/octubre.py y fyp/escenas.py).
// Salida: salida/fyp/<id>.mp4 (1080×1920, 30 fps, -14 LUFS).
import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { generarAudio } from '../../scripts/audio.mjs'

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const PUBLIC = join(RAIZ, 'public')
const TMP = join(PUBLIC, 'tmp', 'fyp')
const SALIDA = join(RAIZ, 'salida', 'fyp')
const FFMPEG =
  process.env.FFMPEG_PATH ||
  spawnSync('python3', ['-c', 'import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())'], { encoding: 'utf8' }).stdout.trim() ||
  'ffmpeg'

const args = process.argv.slice(2)
const opcion = (n, def) => (args.includes(n) ? args[args.indexOf(n) + 1] : def)
const flags = new Set(['--voz', '--vel', '--cuadros', '--recortes'])
const VOZ = opcion('--voz', 'samuel') // 'samuel' = tu voz clonada (Qwen3-TTS); o una voz de Piper (es_MX-claude-high…)
const VEL = opcion('--vel', '0.9')
const RECORTES = opcion('--recortes', '') // con --voz archivo:/ruta.mp3 → tramos del audio, p. ej. "0-5.3,16.2-22.2"
const CUADROS = opcion('--cuadros', null)
const COLA = 1.4 // segundos de pantalla final (CTA) después de la última palabra
const LEAD = 0.35

const todos = JSON.parse(readFileSync(join(RAIZ, 'fyp', 'videos.json'), 'utf8'))
// fyp/pruebas.json: videos sueltos (fuera del calendario) con el mismo formato que videos.json.
const pruebas = join(RAIZ, 'fyp', 'pruebas.json')
if (existsSync(pruebas)) todos.push(...JSON.parse(readFileSync(pruebas, 'utf8')))
// --todos: todos los videos que ya tienen escenas (MG y VOZ), en orden. Pensado para dejarlo corriendo de fondo.
const ids = args.includes('--todos')
  ? todos.filter((v) => v.escenas && v.tipo !== 'CAM').map((v) => v.id)
  : args.filter((a, i) => !a.startsWith('--') && !flags.has(args[i - 1]))
const correr = (cmd, a, o = {}) => {
  const r = spawnSync(cmd, a, { stdio: 'inherit', cwd: RAIZ, ...o })
  if (r.status !== 0) throw new Error(`${cmd} salió con ${r.status}`)
}
const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]/g, '')

// Los `en` de las escenas están escritos relativos a la escena; Escena.tsx los espera absolutos.
function absolutas(e, d) {
  const x = { ...e, desde: d.desde, hasta: d.hasta }
  delete x.dur
  delete x.ancla
  if (x.tiempos) x.tiempos = x.tiempos.map((t) => t + d.desde)
  if (x.telefonos) x.telefonos = x.telefonos.map((t) => ({ ...t, en: t.en != null ? t.en + d.desde : undefined }))
  if (x.burbujas) x.burbujas = x.burbujas.map((b) => ({ ...b, en: b.en + d.desde }))
  if (x.visto) x.visto = { ...x.visto, en: x.visto.en + d.desde }
  if (x.evento) x.evento = { ...x.evento, en: x.evento.en + d.desde }
  if (x.agenda) x.agenda = x.agenda.map((r) => ({ ...r, en: r.en != null ? r.en + d.desde : undefined }))
  if (x.contador) x.contador = { ...x.contador, en: x.contador.en != null ? x.contador.en + d.desde : undefined }
  if (x.golpes) x.golpes = x.golpes.map((t) => t + d.desde)
  if (x.barras) x.barras = { ...x.barras, filas: x.barras.filas.map((f) => ({ ...f, en: f.en != null ? f.en + d.desde : undefined })) }
  return x
}

function sfxAuto(escenas, total) {
  const s = [{ t: 0, nombre: 'impacto', vol: 0.4 }, { t: 0.12, nombre: 'mensaje', vol: 0.45 }] // firma sonora de bookeaa
  escenas.forEach((e, i) => {
    const entrada = e.entrada ?? 'ola'
    const base = entrada === 'corte' ? 0.05 : 0.3
    if (i > 0 && entrada !== 'corte') s.push({ t: e.desde - 0.05, nombre: 'whoosh', vol: 0.4 })
    if (i > 0) s.push({ t: e.desde + base + 0.1, nombre: 'pop', vol: 0.35 })
    for (const g of e.golpes ?? []) s.push({ t: g, nombre: 'impacto', vol: 0.3 })
    for (const b of e.burbujas ?? []) s.push({ t: b.en, nombre: 'burbuja', vol: 0.55 })
    for (const t of e.telefonos ?? []) s.push({ t: t.en ?? e.desde + base + 0.5, nombre: 'barrido', vol: 0.4 })
    if (e.evento) s.push({ t: e.evento.en + 0.5, nombre: 'check', vol: 0.4 })
    ;(e.agenda ?? []).forEach((r, k) => {
      if (r.estado === 'tachado') s.push({ t: (r.en ?? e.desde + base + 0.35 + k * 0.3) + 0.7, nombre: 'click', vol: 0.5 })
    })
  })
  s.push({ t: Math.max(0, total - COLA + 0.4), nombre: 'exito', vol: 0.35 })
  return s.filter((x) => x.t >= 0 && x.t < total)
}

for (const id of ids) {
  const v = todos.find((x) => x.id === id)
  if (!v) throw new Error(`No existe ${id} en fyp/videos.json`)
  if (!v.escenas) throw new Error(`${id} todavía no tiene escenas en fyp/escenas.py`)
  mkdirSync(TMP, { recursive: true })
  mkdirSync(SALIDA, { recursive: true })
  console.log(`\n▶ ${id} · ${v.titulo}`)

  let escenas = []
  let captions = []
  let voz
  let total
  if (v.tipo === 'VOZ') {
    const wav = join(TMP, `${id}-voz.wav`)
    const json = join(TMP, `${id}-palabras.json`)
    correr('python3', VOZ.startsWith('archivo:') ? [join(RAIZ, 'fyp', 'voz_archivo.py'), v.vozTexto, wav, json, '--audio', VOZ.slice(8), '--recortes', RECORTES] : VOZ === 'samuel' ? [join(RAIZ, 'fyp', 'voz_clon.py'), v.vozTexto, wav, json] : [join(RAIZ, 'fyp', 'voz.py'), v.vozTexto, wav, json, '--voz', VOZ, '--vel', VEL])
    const { duracionVoz, palabras } = JSON.parse(readFileSync(json, 'utf8'))
    voz = `tmp/fyp/${id}-voz.wav`
    total = Math.round((duracionVoz + COLA) * 10) / 10
    const claves = palabras.map((p) => norm(p.text))
    let desde = 0
    const marcas = v.escenas.map((e, i) => {
      if (i === 0) return 0
      const ancla = norm(e.ancla).split(' ')
      const k = claves.findIndex((_, j) => j >= desde && ancla.every((a, n) => claves[j + n] === a))
      if (k < 0) throw new Error(`${id}: no encuentro la ancla "${e.ancla}" en la voz`)
      desde = k + 1
      return Math.max(0.3, palabras[k].startMs / 1000 - 0.15)
    })
    escenas = v.escenas.map((e, i) => absolutas(e, { desde: marcas[i], hasta: i < marcas.length - 1 ? marcas[i + 1] : total }))
    captions = palabras.map((p, i) => ({
      text: ' ' + p.text,
      startMs: p.startMs,
      endMs: Math.max(p.endMs, p.startMs + 120),
      timestampMs: Math.round((p.startMs + p.endMs) / 2),
      confidence: null,
      pageBreakAfter: /[.?!:]$/.test(p.text) || (palabras[i + 1] && palabras[i + 1].startMs - p.endMs > 350) || undefined,
    }))
  } else {
    total = 15
    let t = 0
    const durs = v.escenas.map((e) => e.dur)
    const fijo = durs.reduce((a, b) => a + (b ?? 0), 0)
    escenas = v.escenas.map((e, i) => {
      const d = e.dur ?? total - fijo
      const r = absolutas(e, { desde: t, hasta: t + d })
      t += d
      return r
    })
  }

  if (v.hilo) escenas.forEach((e) => (e.hiloGlobal = true))
  const musica = `tmp/fyp/${id}-musica.wav`
  await generarAudio({ duracion: total, cues: [], destino: join(PUBLIC, musica), semilla: 11, volumenMusica: 1 })
  const props = {
    duracion: total,
    escenas,
    captions,
    subtitulos: { arriba: 1470, tamano: 72 },
    voz,
    musica,
    volumenMusica: v.tipo === 'VOZ' ? 0.11 : 0.4,
    sfx: sfxAuto(escenas, total),
    hilo: !!v.hilo,
    etiquetas: !!v.etiquetas,
  }
  const ruta = join(TMP, `${id}-props.json`)
  writeFileSync(ruta, JSON.stringify(props))

  if (CUADROS) {
    for (const s of CUADROS.split(',')) correr('npx', ['remotion', 'still', 'src/index.ts', 'Fyp', join(SALIDA, `${id}-${s}s.png`), `--props=${ruta}`, `--frame=${Math.round(+s * 30)}`])
    continue
  }
  const crudo = join(TMP, `${id}-crudo.mp4`)
  correr('npx', ['remotion', 'render', 'src/index.ts', 'Fyp', crudo, `--props=${ruta}`, '--crf=18', '--concurrency=50%'])
  const final = join(SALIDA, `${id}.mp4`)
  correr(FFMPEG, [
    '-y', '-hide_banner', '-loglevel', 'error', '-i', crudo,
    '-af', 'loudnorm=I=-14:TP=-1.5:LRA=9',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '21', '-maxrate', '3.8M', '-bufsize', '7.6M', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '128k', '-ar', '48000', '-movflags', '+faststart', '-use_editlist', '0', final,
  ])
  console.log(`✔ ${final} · ${total.toFixed(1)} s`)
}
