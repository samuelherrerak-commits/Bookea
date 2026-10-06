// Guion de la animación: 15 s en bucle, en 5 escenas.
//
// evaluar(t, d, e) llena el estado `e` para el segundo `t` sin depender de lo anterior, así
// la animación se puede pausar, saltar a una escena o verse a otra velocidad (modo ?prueba).
//
// Coordenadas: mm sobre la tarjeta, con el origen en su centro, x a la derecha, y hacia arriba
// y z saliendo de la tarjeta. Las manos y los pies del personaje van en unidades del logo
// (la grilla de 32 del SVG), relativas al centro del ícono.

import { FRASES } from './textos.js'

export const DURACION = 15
export const ESCENAS = [
  { id: 'despertar', nombre: 'Despertar', inicio: 0, fin: 2.2 },
  { id: 'ataque', nombre: 'Ataque', inicio: 2.2, fin: 5 },
  { id: 'llamada', nombre: 'Llamada', inicio: 5, fin: 7.8 },
  { id: 'funciones', nombre: 'Funciones', inicio: 7.8, fin: 12.8 },
  { id: 'cierre', nombre: 'Cierre', inicio: 12.8, fin: 15 },
]

// Esqueleto del personaje despierto (unidades del logo).
export const CUERPO = {
  hombros: [
    [-13.4, 0.5],
    [13.4, 0.5],
  ],
  caderas: [
    [-5.5, -13.2],
    [5.5, -13.2],
  ],
  brazo: 15,
  pierna: 11,
  suela: -26, // debajo del centro del ícono, con el cuerpo estirado
}

export const POSE = { abierta: 0, puno: 1, senala: 2, sostiene: 3 }

// Las frases salen cada 0,68 s desde el hueco y se apilan sobre la tarjeta.
export const LANZAMIENTOS = FRASES.map((_, i) => 7.85 + i * 0.68)
export const VUELO = 0.42

export const SONIDOS = [
  [0.3, 'despegue'],
  [1.12, 'boing'],
  [1.5, 'salto'],
  [2.0, 'aterriza'],
  [2.42, 'cae'],
  [2.52, 'cae'],
  [2.66, 'cae'],
  [2.96, 'patada'],
  [3.0, 'papel'],
  [3.6, 'patada'],
  [3.64, 'papel'],
  [4.46, 'pisoton'],
  [4.48, 'papel'],
  [5.05, 'timbre'],
  [5.45, 'timbre'],
  [6.12, 'escribir'],
  [7.0, 'ding'],
  ...LANZAMIENTOS.map((t) => [t, 'whoosh']),
  [13.0, 'brillo'],
  [14.6, 'salto'],
  [14.94, 'pop'],
].map(([t, id]) => ({ t, id }))

/** Medidas de la escena a partir de tarjeta.json (la posición del logo impreso). */
export function disposicion(tarjeta) {
  const { ancho, alto, logo } = tarjeta
  const LU = 0.72 // mm por unidad del logo, con el personaje a tamaño completo
  const piso = -alto / 2 + 10.5
  const P = { x: ancho / 2 - 23, y: piso - CUERPO.suela * LU }
  const z = 8
  return {
    ancho,
    alto,
    // centro del ícono impreso
    L: { x: logo.x + logo.lado / 2 - ancho / 2, y: alto / 2 - (logo.y + logo.lado / 2) },
    lu0: logo.lado / 32,
    LU,
    piso,
    P,
    z,
    libretas: [
      { tipo: 'espiral', x: P.x - 18, ancho: 14, alto: 17, z: z - 0.6, rot: -0.07, cae: [2.22, 2.42], rompe: 3.0, dir: -1 },
      { tipo: 'bloc', x: P.x + 19, ancho: 12, alto: 14, z: z - 1, rot: 0.1, cae: [2.32, 2.52], rompe: 3.64, dir: 1 },
      { tipo: 'agenda', x: P.x - 36, ancho: 17, alto: 21, z: z - 1.4, rot: 0.04, cae: [2.42, 2.66], rompe: 4.48, dir: 0 },
    ],
    // ráfagas de confeti de papel: [t, x, y, cantidad, dirección]
    rafagas: [
      { t: 3.0, x: P.x - 15, y: piso + 9, n: 42, dir: -1 },
      { t: 3.64, x: P.x + 17, y: piso + 8, n: 38, dir: 1 },
      { t: 4.48, x: P.x - 36, y: piso + 11, n: 70, dir: 0 },
    ],
    telefono: { x: P.x + 14, y: P.y + 9, z: z + 2.5 },
    cita: { x: P.x - 14, y: P.y + 11, z: z + 3.5, ancho: 28, alto: 10 },
    globo: { x: P.x - 4, y: P.y + 27, z: z + 5 },
    // pila de frases sobre el borde superior de la tarjeta
    pila: { y: alto / 2 + 13, paso: 21.5, z: 13, pasoZ: -2.2 },
  }
}

export function crearEstado() {
  const mano = () => ({ x: 0, y: 0, pose: 0, curva: 1 })
  const pie = () => ({ x: 0, y: 0, rot: 0 })
  return {
    t: 0,
    escena: 0,
    hueco: { abierto: 0, apertura: 1 },
    pj: {
      x: 0, y: 0, z: 0, lu: 1, rot: 0, squash: 1,
      estiro: 0, ojos: 0, feliz: 0, sorpresa: 0, enojo: 0, boca: 0, hablar: 0,
      mirarX: 0, mirarY: 0, dir: 0, extremidades: 0, grosor: 0,
      manos: [mano(), mano()],
      pies: [pie(), pie()],
      senalar: 0,
      lapiz: 0,
    },
    libretas: [0, 1, 2].map(() => ({ visible: 0, x: 0, y: 0, z: 0, rot: 0, escala: 1, rota: -1 })),
    telefono: { visible: 0, x: 0, y: 0, z: 0, rot: 0, escala: 0, sonando: 0, enMano: 0 },
    cita: { visible: 0, x: 0, y: 0, z: 0, escala: 0, revelar: 0, check: 0 },
    globo: { visible: 0, x: 0, y: 0, z: 0, escala: 0 },
    paneles: FRASES.map(() => ({ visible: 0, x: 0, y: 0, z: 0, escala: 1, rot: 0, opacidad: 1 })),
    boton: 0,
  }
}

export function escenaEn(t) {
  for (let i = 0; i < ESCENAS.length; i++) if (t < ESCENAS[i].fin) return i
  return ESCENAS.length - 1
}

export function evaluar(t, d, e) {
  t = ((t % DURACION) + DURACION) % DURACION
  e.t = t
  e.escena = escenaEn(t)
  reposo(t, d, e)
  if (t < 2.2) despertar(t, d, e)
  else if (t < 5) ataque(t, d, e)
  else if (t < 7.8) llamada(t, d, e)
  else if (t < 12.8) funciones(t, d, e)
  else cierre(t, d, e)
  libretas(t, d, e)
  paneles(t, d, e)
  return e
}

// ── Curvas ────────────────────────────────────────────────────────────────────────────────
const c01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x)
const seg = (t, a, b) => c01((t - a) / (b - a))
const lerp = (a, b, k) => a + (b - a) * k
const suave = (k) => k * k * (3 - 2 * k)
const salida = (k) => 1 - (1 - k) ** 3
const entrada = (k) => k * k * k
const rebote = (k, s = 1.70158) => {
  if (k <= 0) return 0
  const c = k - 1
  return 1 + c * c * ((s + 1) * c + s)
}
const arco = (k) => 4 * k * (1 - k)
const campana = (t, a, b) => {
  const k = seg(t, a, b)
  return k <= 0 || k >= 1 ? 0 : Math.sin(Math.PI * k)
}

function mano(m, x, y, pose = POSE.abierta, curva = 1) {
  m.x = x
  m.y = y
  m.pose = pose
  m.curva = curva
}
function hacia(m, x, y, k, pose = m.pose) {
  m.x = lerp(m.x, x, k)
  m.y = lerp(m.y, y, k)
  if (k > 0.5) m.pose = pose
}
function pie(p, x, y, rot = 0) {
  p.x = x
  p.y = y
  p.rot = rot
}

const PARPADEOS = [3.55, 6.55, 9.6, 11.65, 13.75]
function parpadeo(t) {
  for (const b of PARPADEOS) if (t > b && t < b + 0.14) return 0.1 + 0.9 * Math.abs((t - b) / 0.07 - 1)
  return 1
}

// ── Escenas ───────────────────────────────────────────────────────────────────────────────

/** De pie en su lugar, respirando: la base sobre la que se arma cada escena. */
function reposo(t, d, e) {
  const p = e.pj
  p.x = d.P.x
  p.y = d.P.y
  p.z = d.z
  p.lu = d.LU
  p.rot = 0
  p.squash = 1 + 0.022 * Math.sin(t * Math.PI * 2 * 1.4)
  p.estiro = 1
  p.ojos = parpadeo(t)
  p.feliz = 0
  p.sorpresa = 0
  p.enojo = 0
  p.boca = 0
  p.hablar = 0
  p.mirarX = 0
  p.mirarY = 0
  p.dir = 0
  p.extremidades = 1
  p.grosor = 1
  p.senalar = 0
  p.lapiz = 0
  const v = Math.sin(t * 5) * 0.6
  mano(p.manos[0], -17.5, -11 + v)
  mano(p.manos[1], 17.5, -11 - v)
  pie(p.pies[0], -6.5, -22.8)
  pie(p.pies[1], 6.5, -22.8)
  e.hueco.abierto = 1
  e.hueco.apertura = 1
  e.telefono.visible = 0
  e.telefono.enMano = 0
  e.telefono.sonando = 0
  e.cita.visible = 0
  e.globo.visible = 0
  e.boton = 0
}

/** 0–2,2 s: el logo impreso despierta, le salen brazos y piernas y salta fuera de la tarjeta. */
function despertar(t, d, e) {
  const p = e.pj
  const { L, P } = d
  const sube = salida(seg(t, 0.3, 0.8))
  p.estiro = rebote(seg(t, 0.8, 1.1))
  p.ojos = seg(t, 0.85, 0.95) * (t > 1.12 && t < 1.24 ? 0.15 : 1)
  p.sorpresa = campana(t, 0.85, 1.45)
  p.mirarX = t < 1.0 ? 0 : t < 1.15 ? -1 : t < 1.3 ? 1 : 0
  p.extremidades = rebote(seg(t, 1.1, 1.42), 2.4)
  p.grosor = sube
  e.hueco.abierto = t >= 0.3 ? 1 : 0
  e.hueco.apertura = 1 + 0.4 * campana(t, 0.3, 0.9)

  if (t < 1.5) {
    p.x = L.x
    p.y = L.y + 1.5 * sube
    p.z = lerp(0.05, 4, sube)
    p.lu = lerp(d.lu0, 0.3, sube)
    p.rot = 0.07 * Math.sin(t * 75) * campana(t, 0.1, 0.3)
    p.squash = 1 - 0.18 * seg(t, 1.36, 1.5)
    const w = Math.sin(t * 32)
    mano(p.manos[0], -19, 5 + 3 * w)
    mano(p.manos[1], 19, 5 - 3 * w)
    pie(p.pies[0], -7 - w, -22)
    pie(p.pies[1], 7 - w, -22)
    return
  }
  const k = seg(t, 1.5, 2.0)
  p.x = lerp(L.x, P.x, k)
  p.y = lerp(L.y + 1.5, P.y, k) + 24 * arco(k)
  p.z = lerp(4, d.z, k) + 7 * arco(k)
  p.lu = lerp(0.3, d.LU, salida(k))
  p.rot = -Math.PI * 2 * suave(k)
  if (t < 2.0) {
    p.squash = 1 + 0.16 * campana(t, 1.5, 1.66)
    mano(p.manos[0], -16, 13)
    mano(p.manos[1], 16, 13)
    pie(p.pies[0], -5, -19)
    pie(p.pies[1], 5, -19)
  } else {
    // aterriza: se aplasta y abre los brazos (¡ta-da!)
    p.squash = 1 - 0.24 * campana(t, 2.0, 2.18)
    const k2 = salida(seg(t, 2.0, 2.15))
    mano(p.manos[0], lerp(-16, -21, k2), lerp(13, 5, k2))
    mano(p.manos[1], lerp(16, 21, k2), lerp(13, 5, k2))
    p.feliz = campana(t, 2.0, 2.2)
  }
}

/** 2,2–5 s: caen libretas y una agenda de papel; dos patadas y un pisotón las vuelven confeti. */
function ataque(t, d, e) {
  const p = e.pj
  const { P } = d
  const [n0, n1, n2] = d.libretas
  const xs = [P.x, n0.x + 9, n1.x - 10, n2.x]

  // recorrido
  let x = P.x
  let y = P.y
  let z = d.z
  if (t < 2.6) x = P.x
  else if (t < 2.8) {
    const k = seg(t, 2.6, 2.8)
    x = lerp(P.x, xs[1], k)
    y += 6 * arco(k)
  } else if (t < 3.25) x = xs[1]
  else if (t < 3.5) {
    const k = seg(t, 3.25, 3.5)
    x = lerp(xs[1], xs[2], k)
    y += 8 * arco(k)
  } else if (t < 3.85) x = xs[2]
  else if (t < 4.5) {
    const k = seg(t, 3.85, 4.5)
    x = lerp(xs[2], xs[3], salida(k))
    y += 30 * arco(Math.pow(k, 0.75))
    z += 5 * arco(k)
  } else if (t < 4.75) x = xs[3]
  else {
    const k = seg(t, 4.75, 5.0)
    x = lerp(xs[3], P.x, k)
    y += 9 * arco(k)
  }
  p.x = x
  p.y = y
  p.z = z

  // cara
  p.dir = t < 2.45 ? 0 : t < 3.3 ? -1 : t < 3.85 ? 1 : t < 4.6 ? -1 : 0
  p.mirarX = p.dir
  p.mirarY = t < 2.5 ? 1 : 0
  p.sorpresa = campana(t, 2.25, 2.5)
  p.enojo = seg(t, 2.42, 2.55) * (1 - seg(t, 4.55, 4.7))
  p.boca = campana(t, 2.95, 3.2) + campana(t, 3.58, 3.82) + campana(t, 4.4, 4.62)
  p.feliz = 0.8 * seg(t, 4.6, 4.7)

  // guardia de boxeo con los puños
  mano(p.manos[0], -15, -1, POSE.puno, 1.4)
  mano(p.manos[1], 15, -1, POSE.puno, 1.4)
  if (t < 2.6) {
    // baja los brazos del ¡ta-da! y levanta los puños
    const baja = suave(seg(t, 2.2, 2.4))
    const guardia = seg(t, 2.45, 2.6)
    hacia(p.manos[0], lerp(-21, -17.5, baja), lerp(5, -11, baja), 1 - guardia, POSE.abierta)
    hacia(p.manos[1], lerp(21, 17.5, baja), lerp(5, -11, baja), 1 - guardia, POSE.abierta)
  }

  // patada 1 (hacia la izquierda, con el pie derecho)
  if (t > 2.82 && t < 3.3) {
    const atras = seg(t, 2.82, 2.94)
    const golpe = seg(t, 2.94, 3.02)
    const vuelve = seg(t, 3.12, 3.3)
    pie(p.pies[1], lerp(lerp(6.5, 12, atras), -24, golpe), lerp(lerp(-22.8, -18, atras), -15, golpe), lerp(0.4 * atras, -0.3, golpe))
    if (vuelve > 0) pie(p.pies[1], lerp(-24, 6.5, vuelve), lerp(-15, -22.8, vuelve), lerp(-0.3, 0, vuelve))
    mano(p.manos[0], -20, 7, POSE.puno, 1)
    mano(p.manos[1], 16, 9, POSE.puno, 1)
  }
  // patada 2 (hacia la derecha, con el pie izquierdo)
  if (t > 3.5 && t < 3.9) {
    const atras = seg(t, 3.5, 3.58)
    const golpe = seg(t, 3.58, 3.66)
    const vuelve = seg(t, 3.75, 3.9)
    pie(p.pies[0], lerp(lerp(-6.5, -12, atras), 24, golpe), lerp(lerp(-22.8, -18, atras), -15, golpe), lerp(-0.4 * atras, 0.3, golpe))
    if (vuelve > 0) pie(p.pies[0], lerp(24, -6.5, vuelve), lerp(-15, -22.8, vuelve), lerp(0.3, 0, vuelve))
    mano(p.manos[0], -16, 9, POSE.puno, 1)
    mano(p.manos[1], 20, 7, POSE.puno, 1)
    p.rot = -0.18 * campana(t, 3.55, 3.85)
  }
  // pisotón sobre la agenda
  if (t >= 3.85 && t < 4.5) {
    const k = seg(t, 3.85, 4.5)
    if (k < 0.6) {
      pie(p.pies[0], -5, -19)
      pie(p.pies[1], 5, -19)
    } else {
      pie(p.pies[0], -4, -25)
      pie(p.pies[1], 4, -25)
    }
    mano(p.manos[0], -16, 14, POSE.puno, 1)
    mano(p.manos[1], 16, 14, POSE.puno, 1)
  }
  if (t >= 4.5 && t < 4.62) p.squash = 1 - 0.3 * campana(t, 4.5, 4.62)
  // se sacude las manos
  if (t >= 4.6 && t < 4.75) {
    const s = Math.sin(t * 60) * 2.5
    mano(p.manos[0], -3 - s, -4, POSE.abierta, 1.6)
    mano(p.manos[1], 3 + s, -4, POSE.abierta, 1.6)
  }
  if (t >= 4.75) {
    const k = seg(t, 4.75, 5.0)
    mano(p.manos[0], lerp(-3, -17.5, k), lerp(-4, -11, k))
    mano(p.manos[1], lerp(3, 17.5, k), lerp(-4, -11, k))
  }
}

/** 5–7,8 s: suena un teléfono; lo atiende con una mano, con la otra anota la cita. ¡Agendado! */
function llamada(t, d, e) {
  const p = e.pj
  const { P, L } = d
  const T = e.telefono
  const C = e.cita
  const G = e.globo

  // teléfono
  T.visible = t < 7.62 ? 1 : 0
  T.escala = rebote(seg(t, 5.0, 5.15)) * (1 - seg(t, 7.45, 7.6))
  T.sonando = t >= 5.05 && t < 5.85 ? 1 : 0
  T.x = d.telefono.x
  T.y = d.telefono.y
  T.z = d.telefono.z
  T.rot = T.sonando ? 0.22 * Math.sin(t * Math.PI * 2 * 17) : 0
  T.enMano = t >= 5.68 && t < 7.45 ? 1 : 0

  // susto
  p.sorpresa = campana(t, 5.05, 5.55)
  p.y = P.y + 3 * arco(seg(t, 5.05, 5.25))
  p.mirarX = t < 5.7 ? 1 : t < 6.08 ? 0 : t < 6.95 ? -0.9 : 0
  p.mirarY = t < 5.7 ? 0.6 : 0

  // mano derecha: toma el teléfono y se lo lleva a la oreja
  const der = p.manos[1]
  const tx = (T.x - P.x) / d.LU
  const ty = (T.y - P.y) / d.LU
  if (t >= 5.45 && t < 5.68) hacia(der, tx, ty, salida(seg(t, 5.45, 5.68)), POSE.abierta)
  else if (t >= 5.68 && t < 7.45) {
    const k = salida(seg(t, 5.68, 5.95))
    mano(der, lerp(tx, 13.5, k), lerp(ty, 11.5, k) + 0.4 * Math.sin(t * 9), POSE.sostiene, 1.2)
  } else if (t >= 7.45) hacia(der, 17.5, -11, seg(t, 7.45, 7.62), POSE.abierta)
  p.hablar = t > 6.0 && t < 6.95 ? 1 : 0
  p.rot = 0.05 * Math.sin(t * 8) * (t > 6.0 && t < 7.0 ? 1 : 0)

  // tarjeta de cita: aparece, la mano izquierda la escribe, sale el check y se va a la tarjeta
  C.visible = t >= 6.0 && t < 7.72 ? 1 : 0
  C.escala = rebote(seg(t, 6.0, 6.15))
  C.revelar = seg(t, 6.12, 6.9)
  C.check = rebote(seg(t, 6.9, 7.05))
  C.x = d.cita.x
  C.y = d.cita.y
  C.z = d.cita.z
  if (t >= 7.45) {
    const k = seg(t, 7.45, 7.72)
    C.x = lerp(d.cita.x, L.x, entrada(k))
    C.y = lerp(d.cita.y, L.y, entrada(k)) + 8 * arco(k)
    C.z = lerp(d.cita.z, 0, entrada(k))
    C.escala = lerp(1, 0.08, k)
  }
  const izq = p.manos[0]
  p.lapiz = t > 6.04 && t < 7.0 ? 1 : 0
  if (t > 6.0 && t < 6.95) {
    const x0 = (d.cita.x - d.cita.ancho / 2 + 3 - P.x) / d.LU
    const x1 = (d.cita.x + d.cita.ancho * 0.2 - P.x) / d.LU
    const y = (d.cita.y - 1 - P.y) / d.LU
    const k = C.revelar
    const llegar = salida(seg(t, 6.0, 6.12))
    mano(izq, lerp(-17.5, lerp(x0, x1, k), llegar), lerp(-11, y + 1.2 * Math.sin(t * 55) * (k > 0 && k < 1 ? 1 : 0), llegar), POSE.puno, 0.6)
  } else if (t >= 6.95) hacia(izq, -17.5, -11, seg(t, 6.95, 7.15), POSE.abierta)

  // globo
  G.visible = t >= 7.0 && t < 7.75 ? 1 : 0
  G.escala = rebote(seg(t, 7.0, 7.2)) * (1 - seg(t, 7.58, 7.75))
  G.x = d.globo.x
  G.y = d.globo.y
  G.z = d.globo.z
  p.feliz = seg(t, 7.0, 7.08) * (1 - seg(t, 7.6, 7.78))
  p.boca = p.feliz * 0.8
}

/** 7,8–12,8 s: las frases salen disparadas desde la tarjeta; el personaje las celebra. */
function funciones(t, d, e) {
  const p = e.pj
  let salto = 0
  for (const Ti of LANZAMIENTOS) salto = Math.max(salto, campana(t, Ti, Ti + 0.26))
  p.y = d.P.y + 2.4 * salto
  p.squash *= 1 - 0.06 * salto
  p.mirarY = 1
  p.feliz = 0.7
  const w = Math.sin(t * 9)
  const brazos = suave(seg(t, 7.8, 8.0))
  hacia(p.manos[0], -16, 13 + 2 * w, brazos)
  hacia(p.manos[1], 16, 13 - 2 * w, brazos)
}

/** 12,8–15 s: señala el botón de la pantalla, saluda y vuelve al hueco (el logo queda igual). */
function cierre(t, d, e) {
  const p = e.pj
  const { L, P } = d
  p.mirarY = t < 13.0 ? 1 : -0.8
  p.mirarX = t < 13.0 ? 0 : 0.5
  p.feliz = 0.4
  // el render reemplaza la mano derecha por una que apunta al botón real
  p.senalar = suave(seg(t, 13.0, 13.25)) * (1 - suave(seg(t, 14.15, 14.3)))
  e.boton = suave(seg(t, 12.95, 13.2))
  if (t < 13.0) {
    // baja los brazos de la celebración
    const k = suave(seg(t, 12.8, 13.0))
    mano(p.manos[0], lerp(-16, -17.5, k), lerp(13, -11, k))
    mano(p.manos[1], lerp(16, 17.5, k), lerp(13, -11, k))
  }
  if (t >= 13.0 && t < 14.3) {
    hacia(p.manos[0], -16, -6.5, suave(seg(t, 13.0, 13.2)), POSE.puno)
    p.manos[0].curva = 2
    mano(p.manos[1], 21, -14, POSE.senala, 0.6)
  }
  if (t >= 14.25 && t < 14.6) {
    p.feliz = 1
    p.mirarY = 0
    p.mirarX = 0
    mano(p.manos[1], 17 + 2.5 * Math.sin(t * 28), 13, POSE.abierta, 1)
  }
  if (t >= 14.6) {
    const k = seg(t, 14.6, 14.92)
    p.x = lerp(P.x, L.x, k)
    p.y = lerp(P.y, L.y, k) + 22 * arco(k)
    p.z = lerp(d.z, 0.05, entrada(k)) + 4 * arco(k)
    p.lu = lerp(d.LU, d.lu0, entrada(k))
    p.rot = Math.PI * 2 * suave(k)
    p.squash = 1
    p.extremidades = 1 - seg(t, 14.7, 14.88)
    p.estiro = 1 - seg(t, 14.75, 14.9)
    p.ojos = 1 - seg(t, 14.84, 14.92)
    p.grosor = 1 - seg(t, 14.85, 14.95)
    p.feliz = 0
    mano(p.manos[0], -16, 13)
    mano(p.manos[1], 16, 13)
    pie(p.pies[0], -5, -19)
    pie(p.pies[1], 5, -19)
    e.hueco.apertura = 1 + 0.35 * campana(t, 14.75, 14.98)
    e.hueco.abierto = t < 14.96 ? 1 : 0
    e.boton = 1 - seg(t, 14.7, 15)
  }
}

// ── Utilería a lo largo de varias escenas ─────────────────────────────────────────────────

function libretas(t, d, e) {
  for (let i = 0; i < 3; i++) {
    const def = d.libretas[i]
    const L = e.libretas[i]
    const [c0, c1] = def.cae
    L.visible = t >= c0 && t < def.rompe + 0.7 ? 1 : 0
    if (!L.visible) continue
    const caida = entrada(seg(t, c0, c1))
    const yPiso = d.piso + def.alto / 2
    L.x = def.x
    L.y = lerp(yPiso + 45, yPiso, caida)
    L.z = def.z
    L.rot = def.rot * (1 - 0.6 * caida)
    L.escala = 1 - 0.14 * campana(t, c1, c1 + 0.14)
    L.rota = t >= def.rompe ? t - def.rompe : -1
  }
}

function paneles(t, d, e) {
  const { pila, L } = d
  const n = LANZAMIENTOS.length
  const salida0 = seg(t, 12.8, 13.25)
  for (let i = 0; i < n; i++) {
    const P = e.paneles[i]
    const Ti = LANZAMIENTOS[i]
    P.visible = t >= Ti && t < 13.25 ? 1 : 0
    if (!P.visible) continue
    // cuántas frases llegaron después (continuo, para que la pila suba suave)
    let k = 0
    for (let j = i + 1; j < n; j++) k += suave(seg(t, LANZAMIENTOS[j], LANZAMIENTOS[j] + 0.32))
    const rotFinal = i % 2 ? 0.035 : -0.035
    const y = pila.y + pila.paso * k
    const z = pila.z + pila.pasoZ * k
    const f = seg(t, Ti, Ti + VUELO)
    const g = salida(f)
    P.x = lerp(L.x, 0, g)
    P.y = lerp(L.y, y, g)
    P.z = lerp(0, z, g) + 14 * arco(f)
    P.escala = lerp(0.1, 1 - 0.05 * k, g)
    P.rot = lerp(-0.9, rotFinal, g)
    P.opacidad = 1 - c01(k - 3)
    if (salida0 > 0) {
      P.y += 45 * entrada(salida0)
      P.opacidad *= 1 - seg(t, 12.85, 13.25)
    }
    if (P.opacidad <= 0.001) P.visible = 0
  }
}
