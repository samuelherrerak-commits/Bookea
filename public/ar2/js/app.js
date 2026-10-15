// /ar2 (la agenda malvada): entra directo a la realidad aumentada, sin pantalla inicial. Al
// cargar pide la cámara; si no se puede (permiso negado, sin cámara, navegador de otra app…)
// muestra la misma animación sobre una tarjeta virtual (Plan B).
//
//   /ar2/                realidad aumentada directo
//   /ar2/?prueba         la animación sin cámara ni tarjeta, con controles para revisar el guion
//                        (&t=8.2 empieza en ese segundo, &escena=3 en esa escena, &pausa quieta)
//   /ar2/?debug          en modo AR muestra FPS y estado del seguimiento (&t=10 empieza en ese segundo)
//   &proceso=640 &minCF=0.001 &beta=100 &suavizado=22   ajustes finos del seguimiento

import { DURACION, ESCENAS, SONIDOS, crearEstado, disposicion, evaluar } from './guion.js'
import { CTA, DESCRIPCION, MENSAJES } from './textos.js'
import { abrirCamara, iniciarAR, precargarMindAR, precargarObjetivo } from './camara-ar.js'
import * as sonido from './sonido.js'

const $ = (s) => document.querySelector(s)
const q = new URLSearchParams(location.search)
const PRUEBA = q.has('prueba')
const DEBUG = q.has('debug') || PRUEBA
const num = (k) => {
  const v = parseFloat(q.get(k) ?? '')
  return Number.isFinite(v) ? v : undefined
}
const OPCIONES = { proceso: num('proceso'), minCF: num('minCF'), beta: num('beta'), suavizado: num('suavizado') }

// Estado a la vista de las pruebas automáticas (marketing/scripts/ar-verificar.mjs).
const est = (window.__ar = {
  pantalla: 'cargando',
  modo: null,
  rastreo: 'buscando',
  motivo: null,
  t: 0,
  reproduciendo: false,
  velocidad: 1,
  fps: 0,
  fpsRastreo: 0,
  listo: false,
  errores: [],
})
window.addEventListener('error', (ev) => est.errores.push(String(ev.message)))
window.addEventListener('unhandledrejection', (ev) => est.errores.push(String(ev.reason)))

const cuerpo = document.body
const vista = $('#vista')
const boton = $('#cta')
boton.textContent = CTA.texto
boton.href = CTA.url
vista.setAttribute('role', 'img')
vista.setAttribute('aria-label', DESCRIPCION)

// todo lo pesado empieza a bajar de inmediato, en paralelo con el permiso de la cámara
const cargaEscena = import('./escena.js')
const cargaTarjeta = fetch(new URL('../tarjeta.json', import.meta.url)).then((r) => r.json())
if (!PRUEBA && navigator.mediaDevices?.getUserMedia) {
  precargarMindAR().catch(() => {})
  precargarObjetivo().catch(() => {})
}

const e = crearEstado()
let d = null
let tarjeta = null
let escena = null
let ar = null
let consejoId = 0
let ocultoReproduciendo = false
let abriendo = false

// ── pantallas ──
function pantalla(nombre, mensaje) {
  est.pantalla = nombre
  cuerpo.dataset.pantalla = nombre
  if (mensaje) $('#cargando-texto').textContent = mensaje
}

function rastreo(estado) {
  est.rastreo = estado
  cuerpo.dataset.rastreo = estado
  est.reproduciendo = estado === 'encontrada'
  if (estado === 'encontrada') {
    clearTimeout(consejoId)
    $('#consejo').hidden = true
  }
  $('#apunta-pausa').hidden = estado !== 'perdida'
}

async function prepararTarjeta() {
  if (!tarjeta) {
    tarjeta = await cargaTarjeta
    d = disposicion(tarjeta)
  }
}

function nuevoLienzo() {
  const c = document.createElement('canvas')
  c.className = 'lienzo'
  return c
}

function limpiar() {
  clearTimeout(consejoId)
  ar?.detener()
  ar = null
  escena?.destruir()
  escena = null
  vista.replaceChildren()
  est.modo = null
  est.reproduciendo = false
}

// ── modo AR (se llama solo al cargar la página) ──
async function verEnAR() {
  if (abriendo) return
  abriendo = true
  limpiar()
  pantalla('cargando', MENSAJES.abriendo)
  let stream
  try {
    stream = await abrirCamara()
  } catch (err) {
    console.warn(err)
    abriendo = false
    return verSinCamara(err?.motivo ?? 'error')
  }
  pantalla('cargando', MENSAJES.preparando)
  try {
    const [{ crearEscena, THREE }] = await Promise.all([cargaEscena, prepararTarjeta()])
    const video = document.createElement('video')
    video.className = 'camara'
    const lienzo = nuevoLienzo()
    vista.replaceChildren(video, lienzo)
    escena = await crearEscena({ lienzo, tarjeta, d, modo: 'ar' })
    ar = await iniciarAR({ THREE, contenedor: vista, video, stream, escena, opciones: OPCIONES, onEstado: rastreo })
  } catch (err) {
    console.error(err)
    est.errores.push(String(err))
    for (const pista of stream.getTracks()) pista.stop()
    abriendo = false
    return verSinCamara('error')
  }
  abriendo = false
  est.modo = 'ar'
  est.t = DEBUG ? (num('t') ?? 0) : 0
  if (DEBUG) window.__arDebug = { escena, ar }
  rastreo('buscando')
  pantalla('ar')
  ajustar() // recién ahora la vista tiene medidas
  consejoId = setTimeout(() => {
    if (est.rastreo !== 'encontrada') $('#consejo').hidden = false
  }, 20000)
  est.listo = true
}

// ── Plan B: la misma animación sobre una tarjeta virtual ──
async function verSinCamara(motivo = 'elegido') {
  limpiar()
  pantalla('cargando', MENSAJES.preparando)
  try {
    const [{ crearEscena }] = await Promise.all([cargaEscena, prepararTarjeta()])
    const lienzo = nuevoLienzo()
    vista.replaceChildren(lienzo)
    escena = await crearEscena({ lienzo, tarjeta, d, modo: 'planb' })
  } catch (err) {
    console.error(err)
    est.errores.push(String(err))
    return verEstatico()
  }
  est.modo = 'planb'
  est.motivo = motivo
  const escenaInicial = Math.round(num('escena') ?? 0)
  est.t = num('t') ?? (escenaInicial >= 1 && escenaInicial <= ESCENAS.length ? ESCENAS[escenaInicial - 1].inicio : 0)
  est.reproduciendo = !(PRUEBA && q.has('pausa'))
  $('#nota-motivo').textContent = MENSAJES.motivos[motivo] ?? ''
  $('#nota-motivo').hidden = !MENSAJES.motivos[motivo]
  $('#reintentar').hidden = motivo === 'navegador' || motivo === 'sinCamara' || PRUEBA
  $('#reintentar').textContent = motivo === 'elegido' ? 'Ver con la cámara' : 'Reintentar con cámara'
  pantalla('planb')
  ajustar()
  est.listo = true
}

/** Sin WebGL: la tarjeta y el botón, sin animación. */
function verEstatico() {
  limpiar()
  pantalla('estatico')
  est.listo = true
}

// ── bucle ──
let ultimo = 0
let cuadros = 0
let marca = 0
function cuadro(ahora) {
  requestAnimationFrame(cuadro)
  const dt = Math.min(0.1, (ahora - (ultimo || ahora)) / 1000)
  ultimo = ahora
  cuadros++
  if (ahora - marca >= 500) {
    est.fps = Math.round((cuadros * 1000) / (ahora - marca))
    if (ar) est.fpsRastreo = Math.round((ar.cuadros() * 1000) / (ahora - marca))
    cuadros = 0
    marca = ahora
    if (DEBUG) $('#debug').textContent = `${est.fps} fps${ar ? ` · rastreo ${est.fpsRastreo}/s · ${est.rastreo}` : ''} · t ${est.t.toFixed(2)}`
  }
  if (!escena) return
  if (est.reproduciendo) avanzar(dt * est.velocidad)
  if (ar) ar.actualizar(dt)
  else escena.moverPlanB(dt)
  evaluar(est.t, d, e)
  escena.aplicar(e, est.t)
  boton.classList.toggle('resalta', e.boton > 0.5 && (!ar || est.rastreo === 'encontrada'))
  escena.render()
  if (PRUEBA) pintarControles()
}

function avanzar(dt) {
  const antes = est.t
  let ahora = antes + dt
  if (ahora >= DURACION) {
    sonidosEntre(antes, DURACION)
    ahora -= DURACION
    sonidosEntre(-1, ahora)
  } else sonidosEntre(antes, ahora)
  est.t = ahora
}

function sonidosEntre(a, b) {
  for (const s of SONIDOS) if (s.t > a && s.t <= b) sonido.sonar(s.id)
}

// ── controles del modo de prueba ──
const rango = $('#prueba-t')
const botonesEscena = ESCENAS.map((s, i) => {
  const b = document.createElement('button')
  b.type = 'button'
  b.textContent = `${i + 1} ${s.nombre}`
  b.addEventListener('click', () => (est.t = s.inicio))
  $('#prueba-escenas').insertBefore(b, $('[data-vel]'))
  return b
})
function pintarControles() {
  rango.value = est.t.toFixed(2)
  $('#prueba-reloj').textContent = `${est.t.toFixed(1)} s · ${ESCENAS[e.escena].nombre}`
  $('#prueba-play').textContent = est.reproduciendo ? 'Pausa' : 'Play'
  botonesEscena.forEach((b, i) => b.setAttribute('aria-current', String(i === e.escena)))
  for (const b of document.querySelectorAll('[data-vel]')) b.setAttribute('aria-current', String(Number(b.dataset.vel) === est.velocidad))
}

if (PRUEBA) {
  $('#prueba').hidden = false
  rango.max = String(DURACION)
  $('#prueba-play').addEventListener('click', () => (est.reproduciendo = !est.reproduciendo))
  $('#prueba-reiniciar').addEventListener('click', () => (est.t = 0))
  for (const b of document.querySelectorAll('[data-vel]')) b.addEventListener('click', () => (est.velocidad = Number(b.dataset.vel)))
  rango.addEventListener('input', () => {
    est.reproduciendo = false
    est.t = Number(rango.value)
  })
  window.addEventListener('keydown', (ev) => {
    if (ev.target instanceof HTMLInputElement) return
    if (ev.key === ' ') {
      ev.preventDefault()
      est.reproduciendo = !est.reproduciendo
    } else if (ev.key === 'ArrowRight' || ev.key === 'ArrowLeft') {
      const paso = (ev.shiftKey ? 1 : 0.1) * (ev.key === 'ArrowRight' ? 1 : -1)
      est.reproduciendo = false
      est.t = (((est.t + paso) % DURACION) + DURACION) % DURACION
    } else if (/^[1-8]$/.test(ev.key)) est.t = ESCENAS[Number(ev.key) - 1].inicio
  })
}

// ── arrastrar la tarjeta virtual (Plan B) ──
let arrastrando = null
vista.addEventListener('pointerdown', (ev) => {
  if (est.modo !== 'planb') return
  arrastrando = { x: ev.clientX, y: ev.clientY }
  vista.setPointerCapture(ev.pointerId)
})
vista.addEventListener('pointermove', (ev) => {
  if (!arrastrando || !escena) return
  escena.arrastre.x = Math.max(-0.6, Math.min(0.6, (ev.clientX - arrastrando.x) * 0.004))
  escena.arrastre.y = Math.max(-0.3, Math.min(0.3, (ev.clientY - arrastrando.y) * 0.003))
})
const soltar = () => {
  arrastrando = null
  if (escena) escena.arrastre.x = escena.arrastre.y = 0
}
vista.addEventListener('pointerup', soltar)
vista.addEventListener('pointercancel', soltar)

// ── sonido: el navegador lo deja arrancar recién con el primer toque ──
const btnSonido = $('#sonido')
const avisoSonido = $('#activar-sonido')
const pintarSonido = () => {
  btnSonido.setAttribute('aria-pressed', String(sonido.silenciado()))
  btnSonido.setAttribute('aria-label', sonido.silenciado() ? 'Activar sonido' : 'Silenciar')
  avisoSonido.hidden = sonido.silenciado() || sonido.activo()
}
const primerToque = () => {
  sonido.activarAudio()
  setTimeout(pintarSonido, 120)
}
window.addEventListener('pointerdown', primerToque, { passive: true })
window.addEventListener('keydown', primerToque)
avisoSonido.addEventListener('click', primerToque)
btnSonido.addEventListener('click', () => {
  sonido.activarAudio()
  // si todavía no sonaba, el primer toque en el botón solo lo activa
  if (sonido.silenciado() || avisoSonido.hidden) sonido.silenciar(!sonido.silenciado())
  pintarSonido()
})
setTimeout(pintarSonido, 600)

$('#reintentar').addEventListener('click', verEnAR)
$('#consejo-sin-camara').addEventListener('click', () => verSinCamara('elegido'))

const ajustar = () => {
  escena?.redimensionar()
  ar?.ajustar()
}
window.addEventListener('resize', ajustar)
window.addEventListener('orientationchange', () => setTimeout(ajustar, 300))

document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    ocultoReproduciendo = est.reproduciendo
    est.reproduciendo = false
  } else if (est.modo === 'planb') est.reproduciendo = ocultoReproduciendo
  // si al volver la cámara quedó cortada (por ejemplo, al cambiar de app en iPhone), se reabre
  else if (est.modo === 'ar' && ar && !ar.activa()) verEnAR()
})
// al salir de la página se suelta la cámara; si vuelve con "atrás", se reabre
window.addEventListener('pagehide', () => ar?.detener())
window.addEventListener('pageshow', (ev) => {
  if (ev.persisted && est.modo === 'ar') verEnAR()
})

requestAnimationFrame(cuadro)
if (DEBUG) $('#debug').hidden = false

if (PRUEBA) verSinCamara('elegido')
else verEnAR()
