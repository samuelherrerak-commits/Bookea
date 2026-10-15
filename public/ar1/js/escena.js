// La escena de three.js: une personaje y utilería sobre la tarjeta y la dibuja en dos modos.
//   ar     → la tarjeta es la real (video de la cámara); MindAR mueve el `ancla`.
//   planb  → tarjeta virtual que se mece, para quien no tiene o no quiere usar la cámara.

import { THREE } from './formas.js'
import { crearPersonaje } from './personaje.js'
import { crearUtileria } from './utileria.js'

export { THREE }

export async function crearEscena({ lienzo, tarjeta, d, modo, boton }) {
  await Promise.all([
    document.fonts.load("800 64px 'Barlow Condensed'"),
    document.fonts.load("600 32px 'Barlow'"),
  ]).catch(() => {})

  const renderer = new THREE.WebGLRenderer({ canvas: lienzo, antialias: true, alpha: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
  renderer.setClearColor(0x000000, 0)

  const escena = new THREE.Scene()
  const camara = new THREE.PerspectiveCamera(35, 1, 5, 4000)
  // AR: la matriz la pone MindAR (1 unidad = ancho de la tarjeta). Plan B: inclinación propia.
  const ancla = new THREE.Group()
  const mundo = new THREE.Group() // la tarjeta en mm, con el origen en su centro
  ancla.add(mundo)
  escena.add(ancla)
  if (modo === 'ar') {
    ancla.matrixAutoUpdate = false
    ancla.visible = false
    mundo.scale.setScalar(1 / tarjeta.ancho)
  }

  let texturaFrente = null
  if (modo !== 'ar') {
    texturaFrente = await new THREE.TextureLoader().loadAsync(new URL('../tarjeta.webp', import.meta.url).href)
    texturaFrente.colorSpace = THREE.SRGBColorSpace
    texturaFrente.anisotropy = renderer.capabilities.getMaxAnisotropy()
  }

  const util = crearUtileria({ d, tarjeta, modo, texturaFrente })
  const pj = crearPersonaje(tarjeta.logo)
  mundo.add(util.grupo, pj.raiz)

  // ── apuntar al botón real de la pantalla ──
  const rayo = new THREE.Raycaster()
  const ndc = new THREE.Vector2()
  const plano = new THREE.Plane()
  const normal = new THREE.Vector3()
  const punto = new THREE.Vector3()
  const apunta = { x: 0, y: 0 }
  const q = new THREE.Quaternion()

  function apuntarAlBoton(p) {
    if (!boton || !boton.isConnected) return null
    const r = boton.getBoundingClientRect()
    const c = lienzo.getBoundingClientRect()
    if (!r.width || !c.width) return null
    ndc.set(((r.left + r.width / 2 - c.left) / c.width) * 2 - 1, -(((r.top + r.height / 2 - c.top) / c.height) * 2 - 1))
    rayo.setFromCamera(ndc, camara)
    mundo.getWorldQuaternion(q)
    normal.set(0, 0, 1).applyQuaternion(q)
    plano.setFromNormalAndCoplanarPoint(normal, mundo.localToWorld(punto.set(0, 0, p.z)))
    if (!rayo.ray.intersectPlane(plano, punto)) return null
    mundo.worldToLocal(punto)
    apunta.x = (punto.x - p.x) / p.lu
    apunta.y = (punto.y - p.y) / p.lu
    return apunta
  }

  const v = new THREE.Vector3()
  function aplicar(e, t) {
    util.aplicar(e, t)
    escena.updateMatrixWorld()
    const destino = e.pj.senalar > 0 ? apuntarAlBoton(e.pj) : null
    pj.aplicar(e.pj, t, destino)
    if (e.telefono.enMano && e.telefono.visible) {
      // el teléfono va pegado a la mano derecha
      pj.raiz.updateMatrixWorld(true)
      pj.guantes[1].grupo.getWorldPosition(v)
      mundo.worldToLocal(v)
      util.telefono.grupo.position.set(v.x + 0.6, v.y + 1.2, v.z + 0.3)
    }
  }

  // ── Plan B: cámara fija que encuadra la tarjeta y la pila de frases ──
  let balanceo = 0
  const arrastre = { x: 0, y: 0 }
  function encuadrar(ancho, alto) {
    camara.aspect = ancho / alto
    camara.fov = 35
    const tan = Math.tan(THREE.MathUtils.degToRad(camara.fov / 2))
    // lo que tiene que entrar: de los pies (-27 mm) a la pila de frases (118 mm), ±56 mm a lo
    // ancho, sin quedar debajo de la barra de arriba ni del botón de abajo
    const y0 = -27
    const y1 = 118
    const arriba = Math.min(116, alto * 0.16)
    const abajo = Math.min(104, alto * 0.16)
    const libre = Math.max(0.3, (alto - arriba - abajo) / alto)
    const vista = Math.max((y1 - y0) / libre, (2 * 56) / camara.aspect)
    const dist = vista / 2 / tan
    const centro = y1 + (arriba / alto) * vista - vista / 2
    camara.position.set(0, centro - 4, dist)
    camara.lookAt(0, centro, 0)
    camara.near = dist / 20
    camara.far = dist * 6
    camara.updateProjectionMatrix()
  }

  function moverPlanB(dt) {
    balanceo += dt
    ancla.rotation.set(-0.42 + 0.05 * Math.sin(balanceo * 0.7) + arrastre.y, 0.16 * Math.sin(balanceo * 0.45) + arrastre.x, 0)
  }

  function redimensionar() {
    const ancho = lienzo.clientWidth || window.innerWidth
    const alto = lienzo.clientHeight || window.innerHeight
    renderer.setSize(ancho, alto, false)
    if (modo !== 'ar') encuadrar(ancho, alto)
    else camara.aspect = ancho / alto
  }

  function render() {
    renderer.render(escena, camara)
  }

  function destruir() {
    renderer.dispose()
    renderer.forceContextLoss?.()
  }

  redimensionar()
  return { renderer, escena, camara, ancla, mundo, aplicar, render, redimensionar, moverPlanB, arrastre, destruir }
}
