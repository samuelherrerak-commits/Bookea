// Los dos personajes de /ar2, dibujados como figuras planas de capas (2.5D), igual que los
// bocetos de marketing/bookee/ (bookee.js y villana.js): bookee nuevo y la agenda malvada.
//
// Cada uno se arma en sus propias unidades (la grilla de 32 del logo), con el origen entre los
// pies, x a la derecha, y hacia arriba y z hacia quien mira (capas). La escena lo pone de pie
// sobre la tarjeta y lo gira para que siempre mire a la cámara.

import { THREE, COLOR, mat, matPropio, malla, elipse, geo, geoRrect, geoCapsula, geoAnillo, geoCirculo, Trazo } from './formas.js'

export const ROJO = '#e3261c'
export const ROJO_OSCURO = '#5c0b07'
const c01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x)

/** Triángulo (o polígono) plano a partir de puntos [x, y]. */
function geoPoligono(clave, puntos) {
  return geo(`pol:${clave}`, () => {
    const s = new THREE.Shape()
    puntos.forEach(([x, y], i) => (i ? s.lineTo(x, y) : s.moveTo(x, y)))
    s.closePath()
    return new THREE.ShapeGeometry(s)
  })
}

/** Barra de puntas redondas entre dos puntos (cejas, aspas). */
function barra(ax, ay, bx, by, ancho, material, z) {
  const m = malla(geoCapsula(ancho, Math.hypot(bx - ax, by - ay) + ancho), material, (ax + bx) / 2, (ay + by) / 2, z)
  m.rotation.z = Math.atan2(by - ay, bx - ax) - Math.PI / 2
  return m
}

// ── Bookee ────────────────────────────────────────────────────────────────────────────────

export const BOOKEE = {
  hombros: [
    [-14.6, 15],
    [14.6, 15],
  ],
  caderas: [
    [-5.5, 9.5],
    [5.5, 9.5],
  ],
  brazo: 11,
  pierna: 7.5,
  alto: 38,
}

/** Estado de bookee que llena el guion. */
export function estadoBookee() {
  return {
    visible: 0,
    x: 0, y: 0, z: 0, escala: 1, rot: 0, squash: 1,
    // ojos: 0 normal · 1 feliz · 2 susto · 3 decidido · 4 guiño
    ojos: 0, parpadeo: 1, miraX: 0, miraY: 0, cejas: 0,
    // boca: 0 sonrisa · 1 grande · 2 o · 3 nerviosa · 4 decidida
    boca: 0, habla: 0,
    manos: [{ x: -19, y: 12, tipo: 0 }, { x: 19, y: 12, tipo: 0 }], // tipo: 0 abierta · 1 puño · 2 pulgar · 3 teléfono
    pies: [{ x: -6.5, y: 0 }, { x: 6.5, y: 0 }],
    dir: 0,
  }
}
export const OJOS = { normal: 0, feliz: 1, susto: 2, decidido: 3, guino: 4 }
export const BOCA = { sonrisa: 0, grande: 1, o: 2, nerviosa: 3, decidida: 4 }
export const MANO = { abierta: 0, puno: 1, pulgar: 2, telefono: 3 }

export function crearBookee() {
  const raiz = new THREE.Group()
  const negro = mat(COLOR.carbon)
  const blanco = mat(COLOR.papel)
  const claro = mat(COLOR.niebla)
  const gris = mat(COLOR.grafito)

  // cuerpo con grosor (copia corrida en grafito) y contorno claro para leerse sobre la mesa
  const borde = new THREE.Group()
  borde.add(malla(geoRrect(31.8, 28.8, 9.9), claro, 0, 0, -0.8), malla(geoRrect(30, 27, 9), gris, 0, 0, -0.7))
  borde.position.set(0.9, 22.5 - 1.1, 0)
  const contorno = malla(geoRrect(31.8, 28.8, 9.9), claro, 0, 22.5, -0.3)
  const cuerpo = malla(geoRrect(30, 27, 9), negro, 0, 22.5, 0)
  raiz.add(borde, contorno, cuerpo)
  for (const x of [-7, 7]) raiz.add(malla(geoCapsula(5.2, 8.6), claro, x, 36.2, -0.4), malla(geoCapsula(3.4, 6.8), negro, x, 36.2, -0.35))

  // cara (todo en una capa sobre el cuerpo)
  const cara = new THREE.Group()
  raiz.add(cara)
  for (const x of [-10.5, 10.5]) cara.add(elipse(2.6, 1.5, gris, x, 23.2, 0.2))
  const ojos = [-1, 1].map((lado) => {
    const g = new THREE.Group()
    g.position.set(lado * 5.6, 27.3, 0)
    const abierto = new THREE.Group()
    const blancoOjo = elipse(4.2, 5, blanco, 0, 0, 0.3)
    const pupila = new THREE.Group()
    pupila.add(elipse(1, 1, negro, 0, 0, 0.35), elipse(0.38, 0.38, blanco, -0.4, 0.45, 0.4), elipse(0.18, 0.18, blanco, 0.4, -0.35, 0.4))
    const parpado = malla(geoRrect(10, 4, 1), negro, 0, 5.4, 0.45)
    abierto.add(blancoOjo, pupila, parpado)
    const feliz = malla(geoAnillo(2.6, 4.2, 20, Math.PI * 0.15, Math.PI * 0.7), blanco, 0, -1.6, 0.3)
    g.add(abierto, feliz)
    cara.add(g)
    return { lado, g, abierto, blancoOjo, pupila, parpado, feliz }
  })
  const cejas = [-1, 1].map((lado) => {
    const m = malla(geoRrect(5.6, 1.4, 0.7), blanco, lado * 5.6, 34, 0.3)
    cara.add(m)
    return { lado, m }
  })
  const sonrisa = malla(geoAnillo(2.4, 3.6, 20, Math.PI * 1.15, Math.PI * 0.7), blanco, 0, 23.4, 0.3)
  const triste = malla(geoAnillo(2.2, 3.2, 20, Math.PI * 0.2, Math.PI * 0.6), blanco, 0, 17.6, 0.3)
  const abierta = new THREE.Group()
  abierta.add(elipse(3.6, 2.4, blanco, 0, 0, 0.3), elipse(2.2, 0.9, gris, 0, -1.2, 0.32))
  abierta.position.set(0, 19.8, 0)
  cara.add(sonrisa, triste, abierta)
  // la «b» calada en la panza
  cara.add(malla(geoCapsula(1.5, 6), blanco, -2.2, 13.1, 0.3), malla(geoAnillo(1.25, 2.7, 32), blanco, 0.5, 12.6, 0.3))

  // brazos y piernas: trazo carbón con contorno claro
  const extremidad = (z) => ({ contorno: new Trazo(COLOR.niebla, z - 0.05), relleno: new Trazo(COLOR.carbon, z) })
  const brazos = [extremidad(-1.0), extremidad(-1.0)]
  const piernas = [extremidad(-1.2), extremidad(-1.2)]
  for (const t of [...brazos, ...piernas]) raiz.add(t.contorno.grupo, t.relleno.grupo)

  const guantes = [0, 1].map(() => {
    const g = new THREE.Group()
    const mano = new THREE.Group()
    mano.add(elipse(3.9, 3.9, negro, 0, 0, 1.2), elipse(3.1, 3.1, blanco, 0, 0, 1.3))
    // pulgar arriba: puño ancho con los dedos doblados y el pulgar del lado de afuera
    const pulgar = new THREE.Group()
    pulgar.add(malla(geoRrect(3.6, 7, 1.8), negro, -2.6, 4.2, 1.15), malla(geoRrect(2.4, 5.8, 1.2), blanco, -2.6, 4.2, 1.25))
    pulgar.add(malla(geoRrect(9, 7.2, 2.6), negro, 0.4, 0, 1.3), malla(geoRrect(7.8, 6, 2), blanco, 0.4, 0, 1.35))
    for (const y of [-1, 1]) pulgar.add(malla(geoRrect(4, 0.5, 0.25), negro, 1.8, y, 1.4))
    const telefono = new THREE.Group()
    telefono.add(malla(geoRrect(8.6, 13.6, 1.9), mat(COLOR.niebla), 0, 0, 0), malla(geoRrect(7.6, 12.6, 1.5), negro, 0, 0, 0.05), malla(geoRrect(5.8, 9.6, 0.6), blanco, 0, 0.3, 0.1))
    telefono.position.set(0.6, 6.4, 1.0)
    telefono.rotation.z = -0.15
    g.add(telefono, mano, pulgar)
    raiz.add(g)
    return { g, mano, pulgar, telefono }
  })
  const zapatos = [0, 1].map(() => {
    const g = new THREE.Group()
    g.add(elipse(5.8, 3.3, claro, 0, 0, 1.0), elipse(5, 2.6, negro, 0, 0, 1.05), elipse(1.4, 0.7, blanco, 1.2, 0.9, 1.1))
    raiz.add(g)
    return g
  })

  const A = new THREE.Vector2()
  const B = new THREE.Vector2()
  function aplicar(p) {
    raiz.visible = p.visible > 0
    if (!raiz.visible) return
    const sx = 1 / Math.sqrt(Math.max(p.squash, 0.3))
    raiz.scale.set(sx, p.squash, 1)

    // ojos
    const tipo = p.ojos
    for (const o of ojos) {
      const feliz = tipo === OJOS.feliz || (tipo === OJOS.guino && o.lado > 0)
      o.feliz.visible = feliz
      o.abierto.visible = !feliz
      if (feliz) continue
      const susto = tipo === OJOS.susto
      o.blancoOjo.scale.set(susto ? 4.6 : 4.2, (susto ? 5.6 : 5) * Math.max(0.08, p.parpadeo), 1)
      const r = susto ? 1.5 : 2.9
      o.pupila.scale.set(r, r * Math.max(0.1, p.parpadeo), 1)
      o.pupila.position.set(p.miraX * 1.4, p.miraY * 1.6 + (tipo === OJOS.decidido ? -0.8 : 0), 0)
      o.parpado.visible = tipo === OJOS.decidido
    }
    for (const c of cejas) {
      if (tipo === OJOS.decidido) {
        c.m.position.set(c.lado * 5.2, 33.2, 0.5)
        c.m.rotation.z = c.lado * 0.38
      } else {
        c.m.position.set(c.lado * 5.6, 34 + p.cejas * 0.9, 0.3)
        c.m.rotation.z = p.cejas < 0 ? -c.lado * 0.4 * Math.min(1, -p.cejas) : c.lado * 0.08 * p.cejas
      }
    }
    // boca (habla abre y cierra la grande)
    const boca = p.habla > 0 ? BOCA.grande : p.boca
    sonrisa.visible = boca === BOCA.sonrisa || boca === BOCA.decidida
    sonrisa.scale.setScalar(boca === BOCA.decidida ? 0.8 : 1)
    triste.visible = boca === BOCA.nerviosa
    abierta.visible = boca === BOCA.grande || boca === BOCA.o
    if (boca === BOCA.o) abierta.scale.set(0.42, 0.85, 1)
    else abierta.scale.set(1, p.habla > 0 ? 0.35 + 0.65 * p.habla : 1, 1)

    // brazos y guantes
    for (let i = 0; i < 2; i++) {
      const lado = i ? 1 : -1
      const m = p.manos[i]
      A.set(BOOKEE.hombros[i][0], BOOKEE.hombros[i][1])
      B.set(m.x, m.y)
      dibujarExtremidad(brazos[i], A, B, BOOKEE.brazo, lado, 2.4, 1.2)
      const gu = guantes[i]
      gu.g.position.set(B.x, B.y, 0)
      gu.pulgar.visible = m.tipo === MANO.pulgar
      gu.mano.visible = m.tipo !== MANO.pulgar
      gu.telefono.visible = m.tipo === MANO.telefono
      const f = p.pies[i]
      A.set(BOOKEE.caderas[i][0], BOOKEE.caderas[i][1])
      B.set(f.x, f.y + 2.4)
      dibujarExtremidad(piernas[i], A, B, BOOKEE.pierna, lado, 2.6, 1.2)
      const mira = p.dir !== 0 ? Math.sign(p.dir) : lado
      zapatos[i].position.set(f.x + mira * 1.2, f.y + 2.2, 0)
      zapatos[i].scale.x = mira
    }
  }

  return { raiz, aplicar, alto: BOOKEE.alto, ancho: 30 }
}

/** Brazo o pierna "rubber hose": si sobra largo se dobla hacia afuera, si falta se estira. */
function dibujarExtremidad(t, A, B, largo, signo, ancho, contorno) {
  const dx = B.x - A.x
  const dy = B.y - A.y
  const d = Math.hypot(dx, dy) || 1e-6
  const comba = d < largo ? Math.sqrt(largo * largo - d * d) / 2 : 0
  const cx = (A.x + B.x) / 2 + (-dy / d) * comba * signo
  const cy = (A.y + B.y) / 2 + (dx / d) * comba * signo
  t.contorno.trazar(A.x, A.y, cx, cy, B.x, B.y, ancho + 2 * contorno)
  t.relleno.trazar(A.x, A.y, cx, cy, B.x, B.y, ancho)
  return Math.atan2(B.y - cy, B.x - cx)
}

// ── La agenda malvada ─────────────────────────────────────────────────────────────────────

export const VILLANA = {
  hombros: [
    [-21.5, 36],
    [21.5, 36],
  ],
  caderas: [
    [-9, 13],
    [9, 13],
  ],
  brazo: 22,
  pierna: 12,
  alto: 68,
}

export function estadoVillana() {
  return {
    visible: 0,
    x: 0, y: 0, z: 0, escala: 1, rot: 0, squash: 1,
    ojos: 0, // 0 malos · 1 en X
    boca: 0, // 0 grande · 1 rugido · 2 vencida
    miraX: 0, miraY: 0, cejas: 0, hojas: 1,
    manos: [{ x: -34, y: 50, garra: -110 }, { x: 34, y: 50, garra: -70 }],
    pies: [{ x: -11, y: 0 }, { x: 11, y: 0 }],
  }
}

/** Boca ancha (en la convención del boceto: y hacia arriba, `arr` y `aba` = alto de los bordes). */
function formaBoca(arr, aba) {
  const s = new THREE.Shape()
  s.moveTo(-19, arr - 1)
  s.quadraticCurveTo(0, arr + 3, 19, arr - 1)
  s.quadraticCurveTo(17, aba - 2, 0, aba)
  s.quadraticCurveTo(-17, aba - 2, -19, arr - 1)
  return s
}

function dientes(x0, x1, y, dir, n) {
  const formas = []
  const w = (x1 - x0) / n
  for (let k = 0; k < n; k++) {
    const s = new THREE.Shape()
    s.moveTo(x0 + k * w, y)
    s.lineTo(x0 + k * w + w / 2, y + dir * 2.6)
    s.lineTo(x0 + (k + 1) * w, y)
    s.closePath()
    formas.push(s)
  }
  return formas
}

function colmillo(x, y, dir, largo) {
  const s = new THREE.Shape()
  s.moveTo(x - 2.6, y)
  s.quadraticCurveTo(x - 1.4, y + dir * largo * 0.6, x + 0.3, y + dir * largo)
  s.quadraticCurveTo(x + 1.4, y + dir * largo * 0.5, x + 2.6, y)
  s.closePath()
  return s
}

export function crearVillana() {
  const raiz = new THREE.Group()
  const negro = mat(COLOR.carbon)
  const blanco = mat(COLOR.papel)
  const claro = mat(COLOR.niebla)
  const gris = mat(COLOR.grafito)
  const rojo = mat(ROJO)
  const rojoOscuro = mat(ROJO_OSCURO)

  // bloque de hojas que asoma por la derecha y abajo, con rayas
  const hojas = new THREE.Group()
  hojas.add(malla(geoRrect(46.6, 52.6, 6.8), negro, 2.5, 35.5, -0.6), malla(geoRrect(45, 51, 6), blanco, 2.5, 35.5, -0.55))
  for (let k = 1; k <= 4; k++) {
    hojas.add(malla(geoRrect(0.5, 43, 0.2), gris, 19 + k * 0.6, 36.5, -0.5))
    hojas.add(malla(geoRrect(36, 0.5, 0.2), gris, 2, 13.6 - k * 0.6, -0.5))
  }
  raiz.add(hojas)
  // tapa, brillo del canto, elástico y pestaña
  raiz.add(malla(geoRrect(45.6, 53.6, 8.8), claro, 0, 38, -0.3)) // contorno para la mesa
  raiz.add(malla(geoRrect(44, 52, 8), negro, 0, 38, -0.2))
  raiz.add(malla(geoCapsula(1.2, 40), gris, -18, 40, -0.15))
  raiz.add(malla(geoRrect(3.6, 52, 0.01), gris, 15.8, 38, -0.12))
  raiz.add(malla(geoRrect(7.2, 8.6, 1.8), negro, 25, 46, -0.65), malla(geoRrect(6, 7.4, 1.5), claro, 25, 46, -0.6))
  // argollas de la espiral
  for (let k = 0; k < 7; k++) {
    const x = -14.3 + k * 5.5
    const a = new THREE.Group()
    a.add(malla(geoAnillo(0.8, 3.6, 14, 0, Math.PI), negro, 0, 0, 0))
    a.add(malla(geoRrect(2.8, 6, 0.01), negro, -2.2, -3, 0), malla(geoRrect(2.8, 6, 0.01), negro, 2.2, -3, 0))
    a.add(malla(geoAnillo(1.65, 2.75, 14, 0, Math.PI), gris, 0, 0, 0.05))
    a.add(malla(geoRrect(1.1, 6, 0.01), gris, -2.2, -3, 0.05), malla(geoRrect(1.1, 6, 0.01), gris, 2.2, -3, 0.05))
    a.position.set(x, 65, 0.1)
    raiz.add(a)
  }

  // ojos triangulares rojos (o en X)
  const cara = new THREE.Group()
  raiz.add(cara)
  const ojos = [-1, 1].map((lado) => {
    const pts = [
      [-17.5 * lado, 52],
      [-3.5 * lado, 46.5],
      [-14 * lado, 41],
    ]
    const cx = (pts[0][0] + pts[1][0] + pts[2][0]) / 3
    const cy = (pts[0][1] + pts[1][1] + pts[2][1]) / 3
    const rel = (k) => pts.map(([x, y]) => [cx + (x - cx) * k, cy + (y - cy) * k])
    const malo = new THREE.Group()
    const brillo = malla(geoPoligono(`ojo-brillo${lado}`, rel(1.45)), matPropio(ROJO, { opacity: 0.28, depthWrite: false }), 0, 0, 0.25)
    malo.add(brillo, malla(geoPoligono(`ojo-borde${lado}`, rel(1.2)), blanco, 0, 0, 0.3), malla(geoPoligono(`ojo${lado}`, pts), rojo, 0, 0, 0.35))
    const pupila = new THREE.Group()
    pupila.add(elipse(0.9, 2.2, rojoOscuro, 0, 0, 0.4), elipse(0.8, 0.8, blanco, -lado * 2.2, 1.6, 0.42))
    pupila.position.set(cx + lado * 1.5, cy, 0)
    malo.add(pupila)
    const x = new THREE.Group()
    x.add(barra(-4, -4, 4, 4, 2.4, rojo, 0.35), barra(-4, 4, 4, -4, 2.4, rojo, 0.35))
    x.position.set(lado * 10, 46.5, 0)
    cara.add(malo, x)
    return { malo, x, pupila, cx: cx + lado * 1.5, cy }
  })
  const cejas = [-1, 1].map((lado) => {
    const g = new THREE.Group()
    g.add(barra(-8, 3.5, 8, -3.5, 3, gris, 0.3))
    g.position.set(lado * 11, 53, 0)
    g.scale.x = lado
    cara.add(g)
    return g
  })

  // bocas
  const bocaAbierta = (arr, aba, clave) => {
    const g = new THREE.Group()
    const forma = formaBoca(arr, aba)
    const contorno = malla(geo(`boca-c${clave}`, () => new THREE.ShapeGeometry(forma, 16)), blanco, 0, 0, 0.28)
    // el contorno es la misma boca un poco más grande, escalada desde su centro
    const centro = (arr + aba) / 2
    contorno.scale.set(1.07, 1.1, 1)
    contorno.position.set(0, centro - centro * 1.1 + 0.2, 0.28)
    g.add(contorno, malla(geo(`boca${clave}`, () => new THREE.ShapeGeometry(forma, 16)), rojoOscuro, 0, 0, 0.3))
    g.add(elipse(9, (arr - aba) * 0.22, rojo, 2, aba + (arr - aba) * 0.3, 0.32))
    g.add(malla(geo(`dientes${clave}`, () => new THREE.ShapeGeometry([...dientes(-17, 17, arr + 0.4, -1, 12), ...dientes(-14, 14, aba - 0.6, 1, 10)])), blanco, 0, 0, 0.34))
    g.add(malla(geo(`colmillos${clave}`, () => new THREE.ShapeGeometry([colmillo(-10, arr + 1, -1, arr - aba > 20 ? 10 : 8), colmillo(10, arr + 1, -1, arr - aba > 20 ? 10 : 8), colmillo(-14, aba - 0.5, 1, 5.5), colmillo(14, aba - 0.5, 1, 5.5)])), blanco, 0, 0, 0.36))
    cara.add(g)
    return g
  }
  const grande = bocaAbierta(36, 21, 'g')
  const rugido = bocaAbierta(39, 16, 'r')
  const vencida = new THREE.Group()
  const onda = [new Trazo(COLOR.papel, 0.3), new Trazo(COLOR.papel, 0.3)]
  onda[0].trazar(-14, 27, -7, 30.5, 0, 27, 1.8)
  onda[1].trazar(0, 27, 7, 23.5, 14, 27, 1.8)
  vencida.add(onda[0].grupo, onda[1].grupo, elipse(2.4, 3.2, rojo, 8, 23.6, 0.32))
  cara.add(vencida)

  // brazos (garras) y piernas (botas)
  const extremidad = (z) => ({ contorno: new Trazo(COLOR.niebla, z - 0.05), relleno: new Trazo(COLOR.carbon, z) })
  const brazos = [extremidad(-0.9), extremidad(-0.9)]
  const piernas = [extremidad(-1.1), extremidad(-1.1)]
  for (const t of [...brazos, ...piernas]) raiz.add(t.contorno.grupo, t.relleno.grupo)
  const garras = [0, 1].map(() => {
    const g = new THREE.Group()
    const unas = new THREE.Group()
    for (const a of [-40, 0, 40]) {
      const r = (a * Math.PI) / 180
      const u = new THREE.Group()
      u.add(malla(geoPoligono('una-c', [[4, -2.1], [9.6, 0], [4, 2.1]]), negro, 0, 0, 0.9), malla(geoPoligono('una', [[4.4, -1.3], [8.4, 0], [4.4, 1.3]]), blanco, 0, 0, 0.95))
      u.rotation.z = r
      unas.add(u)
    }
    g.add(unas, elipse(6, 6, claro, 0, 0, 0.8), elipse(5.2, 5.2, negro, 0, 0, 1))
    raiz.add(g)
    return { g, unas }
  })
  const botas = [0, 1].map(() => {
    const s = new THREE.Shape()
    s.moveTo(-7.5, 0)
    s.quadraticCurveTo(-7.5, 6, 0, 6)
    s.quadraticCurveTo(8.5, 6, 8.5, 0)
    s.closePath()
    const g = new THREE.Group()
    const contorno = malla(geo('bota', () => new THREE.ShapeGeometry(s, 10)), claro, 0, -0.6, 0.95)
    contorno.scale.set(1.14, 1.2, 1)
    g.add(contorno, malla(geo('bota', () => new THREE.ShapeGeometry(s, 10)), negro, 0, 0, 1), malla(geoRrect(17, 1.6, 0.8), gris, 0.5, 0.4, 1.05))
    raiz.add(g)
    return g
  })

  const A = new THREE.Vector2()
  const B = new THREE.Vector2()
  function aplicar(v) {
    raiz.visible = v.visible > 0
    if (!raiz.visible) return
    const sx = 1 / Math.sqrt(Math.max(v.squash, 0.3))
    raiz.scale.set(sx, v.squash, 1)
    hojas.visible = v.hojas > 0.5
    for (const o of ojos) {
      o.malo.visible = v.ojos === 0
      o.x.visible = v.ojos === 1
      o.pupila.position.set(o.cx + v.miraX * 1.6, o.cy + v.miraY * 1.2, 0)
    }
    for (const c of cejas) {
      c.visible = v.ojos === 0
      c.position.y = 53 - v.cejas
    }
    grande.visible = v.boca === 0
    rugido.visible = v.boca === 1
    vencida.visible = v.boca === 2
    for (let i = 0; i < 2; i++) {
      const lado = i ? 1 : -1
      const m = v.manos[i]
      A.set(VILLANA.hombros[i][0], VILLANA.hombros[i][1])
      B.set(m.x, m.y)
      dibujarExtremidad(brazos[i], A, B, VILLANA.brazo, lado, 4.2, 0.8)
      garras[i].g.position.set(B.x, B.y, 0)
      garras[i].unas.rotation.z = (m.garra * Math.PI) / 180
      const f = v.pies[i]
      A.set(VILLANA.caderas[i][0], VILLANA.caderas[i][1])
      B.set(f.x, f.y + 3)
      dibujarExtremidad(piernas[i], A, B, VILLANA.pierna, lado, 4.4, 0.8)
      botas[i].position.set(f.x + lado * 0.5, f.y, 0)
      botas[i].scale.x = lado
    }
  }

  return { raiz, aplicar, alto: VILLANA.alto, ancho: 46 }
}

export { c01 }
