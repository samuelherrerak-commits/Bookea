// Probar /ar en tu teléfono antes de publicar.
//
//   npm run ar:probar
//
// La cámara del navegador exige HTTPS, así que esto levanta un servidor local de public/ y un
// túnel HTTPS gratuito de Cloudflare (no pide cuenta) y muestra un QR en la terminal para
// abrirlo con el teléfono. Mientras corre, cualquiera con el enlace puede abrirlo: ciérralo con
// Ctrl+C al terminar.
//
// Sin la tarjeta impresa: abre marketing/ar/tarjeta-ar-frente.png en la pantalla del computador
// y apunta el teléfono ahí (con el brillo alto y sin reflejos).
//
// Si el túnel no arranca: instala cloudflared (macOS: brew install cloudflared · Windows:
// winget install Cloudflare.cloudflared) y vuelve a correr esto, o usa otro túnel HTTPS
// (por ejemplo ngrok) apuntando al puerto que se muestra abajo.

import { spawn } from 'node:child_process'
import qrcode from 'qrcode-generator'
import { servirPublico } from './ar-servidor.mjs'

const PUERTO = Number(process.env.PUERTO) || 5180
const { puerto, cerrar } = await servirPublico({ puerto: PUERTO, host: '0.0.0.0' })
console.log(`\nServidor local en el puerto ${puerto}: http://localhost:${puerto}/ar/`)
console.log(`(en el computador, sin cámara: http://localhost:${puerto}/ar/?prueba)\n`)
console.log('Abriendo el túnel HTTPS de Cloudflare…')

const tunel = spawn('npx', ['--yes', 'cloudflared', 'tunnel', '--no-autoupdate', '--url', `http://localhost:${puerto}`], {
  stdio: ['ignore', 'pipe', 'pipe'],
  shell: process.platform === 'win32',
})
let listo = false
const leer = (datos) => {
  const m = String(datos).match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/)
  if (!m || listo) return
  listo = true
  const direccion = `${m[0]}/ar/`
  console.log(`\nAbre esto en el teléfono (Safari en iPhone, Chrome en Android):\n\n  ${direccion}\n`)
  console.log(qrTerminal(direccion))
  console.log(`Modo de prueba, sin tarjeta: ${direccion}?prueba`)
  console.log('El túnel tarda unos segundos en responder la primera vez. Ctrl+C para cerrar.\n')
}
tunel.stdout.on('data', leer)
tunel.stderr.on('data', leer)
tunel.on('exit', (codigo) => {
  if (listo) return
  console.error(`\nNo se pudo abrir el túnel (código ${codigo}). Instala cloudflared o usa otro túnel HTTPS al puerto ${puerto}.`)
  cerrar()
  process.exit(1)
})

const salir = () => {
  tunel.kill()
  cerrar()
  process.exit(0)
}
process.on('SIGINT', salir)
process.on('SIGTERM', salir)

/** QR con medios bloques sobre fondo blanco: se lee igual en terminales claras u oscuras. */
function qrTerminal(texto) {
  const qr = qrcode(0, 'L')
  qr.addData(texto)
  qr.make()
  const n = qr.getModuleCount()
  const margen = 2
  const oscuro = (f, c) => f >= 0 && c >= 0 && f < n && c < n && qr.isDark(f, c)
  let salida = ''
  for (let f = -margen; f < n + margen; f += 2) {
    let linea = '  \x1b[47m\x1b[30m'
    for (let c = -margen; c < n + margen; c++) {
      const a = oscuro(f, c)
      const b = oscuro(f + 1, c)
      linea += a && b ? '█' : a ? '▀' : b ? '▄' : ' '
    }
    salida += `${linea}\x1b[0m\n`
  }
  return salida
}
