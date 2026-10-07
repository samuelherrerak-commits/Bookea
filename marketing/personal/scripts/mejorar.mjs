// Mejora un video crudo antes de editarlo: reducción de ruido de la voz y, opcional,
// corrección de color + "luz profesional" (luz principal en la cara y luz cálida detrás).
//
//   node scripts/mejorar.mjs <entrada> <salida.mp4> [--luz]
//
// Ruido: RNNoise (modelo sh.rnnn de GregorR/rnnoise-models, BSD) + afftdn suave.
// Luz: capas generadas una vez (radiales) mezcladas en RGB. Ojo: eq/hqdn3d trabajan solo
// sobre el primer plano, que en gbrp es el VERDE; por eso se vuelve a YUV antes de usarlos.
import { spawnSync } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const FFMPEG =
  process.env.FFMPEG_PATH ||
  spawnSync('python3', ['-c', 'import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())'], { encoding: 'utf8' }).stdout.trim() ||
  'ffmpeg'
const [entrada, salida] = process.argv.slice(2).filter((a) => !a.startsWith('--'))
const conLuz = process.argv.includes('--luz')
if (!entrada || !salida) {
  console.error('Uso: node scripts/mejorar.mjs <entrada> <salida.mp4> [--luz]')
  process.exit(1)
}
const ff = (args) => {
  const r = spawnSync(FFMPEG, ['-y', '-hide_banner', '-loglevel', 'error', ...args], { stdio: 'inherit' })
  if (r.status !== 0) throw new Error('ffmpeg salió con ' + r.status)
}

const tmp = join(RAIZ, 'public', 'tmp')
mkdirSync(tmp, { recursive: true })
const modelo = join(RAIZ, 'scripts', 'modelos', 'sh.rnnn')
const AUDIO = `highpass=f=80,arnndn=m=${modelo}:mix=0.9,afftdn=nr=10:nf=-45:tn=1,lowpass=f=14000`
const BASE = 'scale=1080:1920:force_original_aspect_ratio=increase:flags=lanczos,crop=1080:1920,fps=30,hqdn3d=1.5:1.5:4:4,unsharp=5:5:0.6'

if (!conLuz) {
  ff(['-i', entrada, '-vf', `${BASE},format=yuv420p`, '-af', AUDIO, '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '16', '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', salida])
} else {
  // Luz principal (neutra) en la cara, en el tercio superior.
  const K = 'exp(-(pow((X-W*0.48)/(W*0.30),2)+pow((Y-H*0.30)/(H*0.17),2)))'
  // Luz cálida detrás: arriba al centro y en los bordes altos.
  const G =
    'exp(-(pow((X-W*0.5)/(W*0.42),2)+pow((Y-H*0.13)/(H*0.11),2)))+0.7*exp(-(pow((X-W*0.0)/(W*0.16),2)+pow((Y-H*0.22)/(H*0.2),2)))+0.7*exp(-(pow((X-W*1.0)/(W*0.16),2)+pow((Y-H*0.22)/(H*0.2),2)))'
  const key = join(tmp, 'luz-key.png')
  const calida = join(tmp, 'luz-calida.png')
  ff(['-f', 'lavfi', '-i', 'color=c=black:s=1080x1920:d=1', '-vf', `format=gbrp,geq=r='255*${K}':g='250*${K}':b='242*${K}'`, '-frames:v', '1', key])
  ff(['-f', 'lavfi', '-i', 'color=c=black:s=1080x1920:d=1', '-vf', `format=gbrp,geq=r='255*min(1,${G})':g='150*min(1,${G})':b='40*min(1,${G})'`, '-frames:v', '1', calida])
  const LUZ =
    `[0:v]${BASE},eq=brightness=0.03:gamma=1.06,format=gbrp[v];[1:v]format=gbrp[k];[2:v]format=gbrp[c];` +
    `[v][k]blend=all_mode=screen:all_opacity=0.16[v1];` +
    `[v1]curves=master='0/0 0.12/0.08 0.5/0.53 0.85/0.89 1/1',format=yuv444p,eq=contrast=1.06:saturation=1.06,format=gbrp[v2];` +
    `[v2][c]blend=all_mode=screen:all_opacity=0.34,format=yuv444p,colorbalance=rs=-0.01:bs=0.012:rh=0.02:bh=-0.02,vignette=angle=PI/4.4,format=yuv420p[vo];` +
    `[0:a]${AUDIO}[ao]`
  ff(['-i', entrada, '-loop', '1', '-i', key, '-loop', '1', '-i', calida, '-filter_complex', LUZ, '-map', '[vo]', '-map', '[ao]', '-shortest', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '16', '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', salida])
}
console.log('✔', salida)
