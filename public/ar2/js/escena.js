// La escena de /ar2: la tarjeta con su hueco, los dos personajes de pie sobre ella y la utilería.
//   ar     → la tarjeta es la real (video de la cámara); MindAR mueve el `ancla`.
//   planb  → tarjeta virtual vista desde arriba en diagonal, para quien no usa la cámara.
//
// Los personajes son figuras planas: se paran sobre la tarjeta y giran sobre su eje para mirar
// siempre a la cámara (así nunca se ven de canto y bookee te mira a ti).

import { THREE } from './formas.js'
import { crearBookee, crearVillana } from './personajes.js'
import { crearUtileria } from './utileria.js'

export { THREE }

const Z_MM = 0.25 // mm por unidad de capa de los personajes

export async function crearEscena({ lienzo, tarjeta, d, modo }) {
  await Promise.all([document.fonts.load("800 64px 'Barlow Condensed'"), document.fonts.load("600 32px 'Barlow'")]).catch(() => {})

  const renderer = new THREE.WebGLRenderer({ canvas: lienzo, antialias: true, alpha: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
  renderer.setClearColor(0x000000, 0)

  const escena = new THREE.Scene()
  const camara = new THREE.PerspectiveCamera(35, 1, 5, 4000)
  const ancla = new THREE.Group()
  const mundo = new THREE.Group() // la tarjeta en mm, con el origen en su centro
  ancla.add(mundo)
  escena.add(ancla)
  if (modo === 'ar') {
    ancla.matrixAutoUpdate = false
    ancla.visible = false
    mundo.scale.setScalar(1 / tarjeta.ancho)
  }

  // la imagen del frente: la usan las solapas del hueco (y la tarjeta virtual del Plan B)
  const texturaFrente = await new THREE.TextureLoader().loadAsync(new URL('../tarjeta.webp', import.meta.url).href)
  texturaFrente.colorSpace = THREE.SRGBColorSpace
  texturaFrente.anisotropy = renderer.capabilities.getMaxAnisotropy()

  const util = crearUtileria({ d, tarjeta, modo, texturaFrente })
  mundo.add(util.grupo)

  // cada personaje: soporte (posición y giro hacia la cámara) → de pie → escala → inclinación
  const montar = (pj) => {
    const soporte = new THREE.Group()
    const dePie = new THREE.Group()
    dePie.rotation.x = Math.PI / 2
    const escala = new THREE.Group()
    const inclina = new THREE.Group()
    soporte.add(dePie)
    dePie.add(escala)
    escala.add(inclina)
    inclina.add(pj.raiz)
    mundo.add(soporte)
    return { pj, soporte, escala, inclina }
  }
  const bookee = montar(crearBookee())
  const villana = montar(crearVillana())

  // ── hacia dónde está la cámara, vista desde la tarjeta ──
  const cam = new THREE.Vector3()
  const a = new THREE.Vector3()
  const b = new THREE.Vector3()
  // gira sobre su eje hacia la cámara y, si se la mira muy desde arriba, se echa un poco hacia
  // atrás (sin despegar los pies): así una figura plana se lee igual desde cualquier ángulo
  const INCLINA_DESDE = THREE.MathUtils.degToRad(30)
  const INCLINA_MAX = THREE.MathUtils.degToRad(50)
  function orientar(obj) {
    const dx = cam.x - obj.position.x
    const dy = cam.y - obj.position.y
    const elevacion = Math.atan2(cam.z - obj.position.z, Math.hypot(dx, dy))
    const atras = Math.min(INCLINA_MAX, Math.max(0, elevacion - INCLINA_DESDE))
    obj.rotation.order = 'ZXY'
    obj.rotation.set(-atras, 0, Math.atan2(dx, -dy))
  }
  /** 1 si el eje x de la tarjeta va hacia la derecha de la pantalla, -1 si se ve al revés. */
  function sentidoEnPantalla() {
    a.set(0, 0, 0)
    b.set(10, 0, 0)
    mundo.localToWorld(a).project(camara)
    mundo.localToWorld(b).project(camara)
    return b.x >= a.x ? 1 : -1
  }

  function colocar(m, p) {
    m.soporte.visible = p.visible > 0
    if (!m.soporte.visible) return
    m.soporte.position.set(p.x, p.y, p.z)
    orientar(m.soporte)
    const s = d.LU * p.escala
    m.escala.scale.set(s, s, Z_MM)
    m.inclina.rotation.z = p.rot
    m.pj.aplicar(p)
  }

  function aplicar(e, t) {
    escena.updateMatrixWorld()
    camara.getWorldPosition(cam)
    mundo.worldToLocal(cam)
    // el guion supone que la tarjeta se ve de frente (bookee a la izquierda): si se mira desde
    // el otro lado, las miradas, el andar y la inclinación se dan vuelta
    const sx = sentidoEnPantalla()
    e.b.miraX *= sx
    e.b.dir *= sx
    e.b.rot *= sx
    e.v.miraX *= sx
    e.v.rot *= sx
    colocar(bookee, e.b)
    colocar(villana, e.v)
    util.aplicar(e, t, orientar)
  }

  // ── Plan B: cámara fija que encuadra la tarjeta y lo que pasa encima ──
  const INCLINACION = -0.82
  let balanceo = 0
  const arrastre = { x: 0, y: 0 }
  function encuadrar(ancho, alto) {
    camara.aspect = ancho / alto
    camara.fov = 35
    const tan = Math.tan(THREE.MathUtils.degToRad(camara.fov / 2))
    // de lo más bajo (borde de adelante de la tarjeta) a lo más alto (las citas que flotan),
    // ±46 mm a lo ancho (la tarjeta justo de borde a borde), sin quedar bajo la barra de arriba
    // ni el botón de abajo
    const y0 = -20
    const y1 = 56
    const arriba = Math.min(90, alto * 0.12)
    const abajo = Math.min(104, alto * 0.16)
    const libre = Math.max(0.3, (alto - arriba - abajo) / alto)
    const vista = Math.max((y1 - y0) / libre, (2 * 46) / camara.aspect)
    const dist = vista / 2 / tan
    // el contenido, centrado en el espacio libre entre la barra y el botón
    const centro = (y0 + y1) / 2 - ((abajo - arriba) / 2 / alto) * vista
    camara.position.set(0, centro, dist)
    camara.lookAt(0, centro, 0)
    camara.near = dist / 20
    camara.far = dist * 6
    camara.updateProjectionMatrix()
  }

  function moverPlanB(dt) {
    balanceo += dt
    ancla.rotation.set(INCLINACION + 0.04 * Math.sin(balanceo * 0.6) + arrastre.y, 0, 0.18 * Math.sin(balanceo * 0.4) + arrastre.x)
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

  if (modo !== 'ar') moverPlanB(0)
  redimensionar()
  return { renderer, escena, camara, ancla, mundo, aplicar, render, redimensionar, moverPlanB, arrastre, destruir }
}
