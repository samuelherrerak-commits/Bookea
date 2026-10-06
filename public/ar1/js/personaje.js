// El personaje: el ícono de bookeaa (public/bookeaa.svg) armado con geometría plana y con las
// mismas medidas de su grilla de 32, más ojos, cejas, boca y brazos y piernas "rubber hose".
// Todo en unidades del logo con el origen en el centro del ícono; la escala del grupo las pasa
// a mm. El eje z va en capas (contornos detrás, rellenos delante) con escala fija, así no se
// pisan aunque el logo mida 4,6 mm.

import { THREE, COLOR, mat, malla, elipse, geo, geoRrect, geoCapsula, geoAnillo, geoCirculo, Trazo } from './formas.js'
import { CUERPO, POSE } from './guion.js'

const Z_MM = 0.62 // mm por unidad de capa
const ANCHO_TRAZO = 2.8
const CONTORNO = 0.85
const c01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x)
const lerp = (a, b, k) => a + (b - a) * k

export function crearPersonaje({ cuerpo: colorCuerpo, calado: colorCalado }) {
  const raiz = new THREE.Group()
  raiz.name = 'personaje'

  // ── Cuerpo: el calendario del logo ─────────────────────────────────────────────────────
  const borde = new THREE.Group() // grosor 2.5D: la misma silueta, corrida y en grafito
  const bordeContorno = malla(geoRrect(29.7, 27.7, 7.85), mat(COLOR.carbon), 0, 0, -0.75)
  const bordeRelleno = malla(geoRrect(28, 26, 7), mat(COLOR.grafito), 0, 0, -0.7)
  borde.add(bordeContorno, bordeRelleno)
  const contorno = malla(geoRrect(29.7, 27.7, 7.85), mat(COLOR.carbon), 0, 0, -0.2)
  const cuerpo = malla(geoRrect(28, 26, 7), mat(colorCuerpo), 0, 0, 0)
  raiz.add(borde, contorno, cuerpo)

  // argollas: M10 2.5v5 y M22 2.5v5 con trazo 2,6 y puntas redondas → x = ±6, 7,6 de largo
  const argollas = [-6, 6].map((x) => {
    const g = new THREE.Group()
    g.add(malla(geoCapsula(4.3, 9.3), mat(COLOR.carbon), 0, 0, -0.3))
    g.add(malla(geoCapsula(2.6, 7.6), mat(colorCuerpo), 0, 0, 0.15))
    g.position.x = x
    raiz.add(g)
    return g
  })

  // la "b": M12 11v12 (asta) y el círculo de radio 4 con centro en (16, 17.5), trazo 2,6
  const b = new THREE.Group()
  b.add(malla(geoCapsula(2.6, 14.6), mat(colorCalado), -4, -1, 0.3))
  b.add(malla(geoAnillo(2.7, 5.3, 48), mat(colorCalado), 0, -1.5, 0.3))
  raiz.add(b)

  // ── Cara ───────────────────────────────────────────────────────────────────────────────
  const cara = new THREE.Group()
  raiz.add(cara)
  const ojos = [-1, 1].map((lado) => {
    const g = new THREE.Group()
    const abierto = new THREE.Group()
    abierto.add(elipse(2.25, 3.0, mat(COLOR.carbon), 0, 0, 0.4))
    // ojo "pastel" de los dibujos de los años 30: una porción blanca en diagonal
    const brillo = malla(geo('porcion-ojo', () => new THREE.CircleGeometry(1, 12, Math.PI * 0.2, Math.PI * 0.32)), mat(COLOR.papel), 0, 0, 0.45)
    brillo.scale.set(2.05, 2.8, 1)
    abierto.add(brillo)
    const feliz = malla(geoAnillo(1.5, 2.6, 20, Math.PI * 0.12, Math.PI * 0.76), mat(COLOR.carbon), 0, -1, 0.4)
    g.add(abierto, feliz)
    cara.add(g)
    return { g, abierto, feliz, lado }
  })
  const cejas = [-1, 1].map((lado) => {
    const m = malla(geoRrect(4.4, 1.15, 0.575), mat(COLOR.carbon), 0, 0, 0.4)
    cara.add(m)
    return { m, lado }
  })
  const sonrisa = malla(geoAnillo(2.9, 3.9, 24, Math.PI * 1.12, Math.PI * 0.76), mat(COLOR.carbon), 0, 0, 0.4)
  const bocaAbierta = elipse(1, 1, mat(COLOR.carbon), 0, 0, 0.4)
  cara.add(sonrisa, bocaAbierta)

  // ── Brazos y piernas ───────────────────────────────────────────────────────────────────
  // del color del cuerpo con contorno del calado: blancas sobre la tarjeta negra, negras sobre las blancas
  const brazos = [0, 1].map(() => {
    const t = { contorno: new Trazo(colorCalado, -1.1), relleno: new Trazo(colorCuerpo, -1.0) }
    raiz.add(t.contorno.grupo, t.relleno.grupo)
    return t
  })
  const piernas = [0, 1].map(() => {
    const t = { contorno: new Trazo(colorCalado, -1.3), relleno: new Trazo(colorCuerpo, -1.2) }
    raiz.add(t.contorno.grupo, t.relleno.grupo)
    return t
  })
  const guantes = [0, 1].map(() => {
    const g = crearGuante()
    raiz.add(g.grupo)
    return g
  })
  const zapatos = [0, 1].map(() => {
    const z = crearZapato()
    raiz.add(z)
    return z
  })
  const lapiz = crearLapiz()
  raiz.add(lapiz)

  const A = new THREE.Vector2()
  const B = new THREE.Vector2()

  /**
   * Aplica el estado del guion (pj). `apunta` = { x, y } en unidades locales (o null): a dónde
   * estira el índice la mano derecha cuando señala el botón.
   */
  function aplicar(p, t, apunta) {
    const sq = p.squash
    const sx = 1 / Math.sqrt(Math.max(sq, 0.2))
    raiz.position.set(p.x, p.y, p.z)
    // aplasta desde los pies cuando tiene piernas, desde el centro cuando es solo el logo
    if (p.extremidades > 0.5) raiz.position.y += CUERPO.suela * p.lu * (1 - sq)
    raiz.scale.set(p.lu * sx, p.lu * sq, Z_MM)
    raiz.rotation.z = p.rot

    // cuerpo estirado: de 26 a 30 de alto, con la base fija
    const est = Math.max(0, p.estiro)
    const alto = 26 + 4 * est
    const arriba = -14 + alto
    cuerpo.scale.y = alto / 26
    cuerpo.position.y = -14 + alto / 2
    contorno.scale.y = (alto + 1.7) / 27.7
    contorno.position.y = cuerpo.position.y
    borde.scale.y = cuerpo.scale.y
    borde.position.set(0.9 * p.grosor, cuerpo.position.y - 1.1 * p.grosor, 0)
    borde.visible = p.grosor > 0.01
    for (const a of argollas) a.position.y = arriba - 1
    const e = c01(est)
    b.scale.setScalar(lerp(1, 0.6, e))
    b.position.y = lerp(0, -6.35, e)

    // cara
    const caraVisible = est > 0.05 && p.ojos > 0.001
    cara.visible = caraVisible
    if (caraVisible) {
      const dy = arriba - 16
      const crece = c01((est - 0.05) / 0.6)
      const feliz = p.feliz > 0.5
      const sorpresa = 1 + 0.25 * p.sorpresa
      for (const o of ojos) {
        o.g.position.set(o.lado * 5 + p.mirarX * 0.9, 8.5 + dy + p.mirarY * 0.8, 0)
        o.g.scale.setScalar(crece)
        o.abierto.visible = !feliz
        o.feliz.visible = feliz
        o.abierto.scale.set(sorpresa, Math.max(0.08, p.ojos) * sorpresa, 1)
      }
      for (const c of cejas) {
        c.m.visible = est > 0.5
        c.m.position.set(c.lado * 5.2 + p.mirarX * 0.4, 13.3 + dy + 1.4 * p.sorpresa - 0.7 * p.enojo, 0.4)
        c.m.rotation.z = c.lado * 0.45 * p.enojo - c.lado * 0.2 * p.sorpresa
        c.m.scale.setScalar(crece)
      }
      let boca = p.boca
      if (p.hablar) boca = 0.25 + 0.55 * Math.abs(Math.sin(t * 21))
      const abierta = boca > 0.15
      sonrisa.visible = !abierta && est > 0.5
      sonrisa.position.set(p.mirarX * 0.6, 6.6 + dy, 0.4)
      sonrisa.scale.setScalar(crece)
      bocaAbierta.visible = abierta
      bocaAbierta.position.set(p.mirarX * 0.6, 3.6 + dy, 0.4)
      bocaAbierta.scale.set((2.0 + 0.4 * boca) * crece, (0.4 + 1.5 * boca) * crece, 1)
    }

    // brazos, piernas, guantes y zapatos
    const g = c01(p.extremidades)
    const hay = g > 0.02
    const yEscala = alto / 30 // hombros y caderas suben y bajan con el cuerpo
    for (let i = 0; i < 2; i++) {
      const lado = i === 0 ? -1 : 1
      const brazo = brazos[i]
      const guante = guantes[i]
      brazo.contorno.grupo.visible = brazo.relleno.grupo.visible = guante.grupo.visible = hay
      const pierna = piernas[i]
      const zapato = zapatos[i]
      pierna.contorno.grupo.visible = pierna.relleno.grupo.visible = zapato.visible = hay
      if (!hay) continue

      const m = p.manos[i]
      A.set(CUERPO.hombros[i][0], -14 + (CUERPO.hombros[i][1] + 14) * yEscala)
      B.set(m.x, m.y)
      let pose = m.pose
      if (i === 1 && apunta && p.senalar > 0) {
        // estira el brazo hacia el botón
        const dx = apunta.x - A.x
        const dy = apunta.y - A.y
        const l = Math.hypot(dx, dy) || 1
        const largo = 18 + 2.5 * Math.max(0, Math.sin(t * 22)) // el dedo "pincha" hacia el botón
        B.set(lerp(B.x, A.x + (dx / l) * largo, p.senalar), lerp(B.y, A.y + (dy / l) * largo, p.senalar))
        pose = POSE.senala
      }
      B.set(A.x + (B.x - A.x) * g, A.y + (B.y - A.y) * g)
      const fin = extremidad(brazo, A, B, CUERPO.brazo * g, lado * m.curva, g)
      guante.grupo.position.set(B.x, B.y, 0)
      guante.grupo.rotation.z = fin
      guante.grupo.scale.set(g, lado * g, 1)
      guante.pose(pose)
      if (i === 0) {
        lapiz.visible = p.lapiz > 0 && hay
        lapiz.position.set(B.x, B.y, 0)
      }

      const f = p.pies[i]
      A.set(CUERPO.caderas[i][0], CUERPO.caderas[i][1])
      B.set(A.x + (f.x - A.x) * g, A.y + (f.y - A.y) * g)
      extremidad(pierna, A, B, CUERPO.pierna * g, lado, g)
      const mira = p.dir !== 0 ? Math.sign(p.dir) : lado
      zapato.position.set(B.x, B.y, 0)
      zapato.rotation.z = f.rot
      zapato.scale.set(mira * g, g, 1)
    }
  }

  return { raiz, aplicar, guantes }
}

/** Dibuja un brazo o una pierna doblada como manguera. Devuelve el ángulo del extremo. */
function extremidad(t, A, B, largo, signo, g) {
  const dx = B.x - A.x
  const dy = B.y - A.y
  const d = Math.hypot(dx, dy) || 1e-6
  // si sobra largo, se dobla hacia afuera; si falta, se estira (es de goma)
  const comba = d < largo ? Math.sqrt(largo * largo - d * d) / 2 : 0
  const cx = (A.x + B.x) / 2 + (-dy / d) * comba * signo
  const cy = (A.y + B.y) / 2 + (dx / d) * comba * signo
  t.contorno.trazar(A.x, A.y, cx, cy, B.x, B.y, (ANCHO_TRAZO + 2 * CONTORNO) * Math.max(g, 0.3))
  t.relleno.trazar(A.x, A.y, cx, cy, B.x, B.y, ANCHO_TRAZO * Math.max(g, 0.3))
  return Math.atan2(B.y - cy, B.x - cx)
}

/** Guante blanco de dibujo animado con contorno carbón. El eje x apunta a lo largo del brazo. */
function crearGuante() {
  const grupo = new THREE.Group()
  const negro = mat(COLOR.carbon)
  const blanco = mat(COLOR.papel)
  // contornos (detrás) y rellenos (delante): así la silueta queda con un solo contorno
  const palmaC = malla(geoCirculo(28), negro, 3.6, 0, 1.3)
  palmaC.scale.set(3.75, 3.75, 1)
  const palma = malla(geoCirculo(28), blanco, 3.6, 0, 1.37)
  palma.scale.set(3.0, 3.0, 1)
  const punoC = malla(geoRrect(3.2, 6.1, 1.4), negro, 0.5, 0, 1.3)
  const puno = malla(geoRrect(2.0, 4.9, 0.8), blanco, 0.5, 0, 1.36)
  const pulgar = new THREE.Group()
  pulgar.add(malla(geoCapsula(2.9, 4.5), negro, 0, 0, 1.3), malla(geoCapsula(1.7, 3.3), blanco, 0, 0, 1.38))
  pulgar.position.set(3.4, 2.9, 0)
  pulgar.rotation.z = -0.55
  const dedo = new THREE.Group()
  dedo.add(malla(geoCapsula(3.1, 6.6), negro, 0, 0, 1.3), malla(geoCapsula(1.9, 5.4), blanco, 0, 0, 1.38))
  dedo.position.set(7.4, 0.3, 0)
  dedo.rotation.z = Math.PI / 2
  grupo.add(palmaC, palma, punoC, puno, pulgar, dedo)
  return {
    grupo,
    pose(p) {
      const cerrada = p === POSE.puno || p === POSE.sostiene
      const k = cerrada ? 0.88 : 1
      palma.scale.set(3.0 * k, 3.0 * k, 1)
      palmaC.scale.set(3.75 * k, 3.75 * k, 1)
      pulgar.visible = p === POSE.abierta || p === POSE.senala
      dedo.visible = p === POSE.senala
    },
  }
}

/** Zapato grande carbón con contorno blanco y un brillo. El tobillo está en el origen. */
function crearZapato() {
  const g = new THREE.Group()
  g.add(elipse(4.9, 2.9, mat(COLOR.papel), 1.9, -1.6, 1.0))
  g.add(elipse(4.15, 2.15, mat(COLOR.carbon), 1.9, -1.6, 1.05))
  g.add(elipse(1.25, 0.5, mat(COLOR.papel), 3.1, -0.85, 1.1))
  return g
}

/** Lápiz digital para anotar la cita (no es papel: bookeaa es "sin libreta"). */
function crearLapiz() {
  const g = new THREE.Group()
  const cuerpo = new THREE.Group()
  cuerpo.add(malla(geoCapsula(2.0, 9.4), mat(COLOR.papel), 0, 0, 1.55))
  cuerpo.add(malla(geoCapsula(1.1, 8.4), mat(COLOR.carbon), 0, 0, 1.6))
  cuerpo.position.set(0, -3.6, 0)
  g.add(cuerpo)
  g.rotation.z = -0.55
  return g
}
