// Guion de /ar2: la agenda malvada rompe la tarjeta y bookee la vence. 15 s en bucle, 8 escenas
// (el guion gráfico aprobado está en marketing/ar2/ar2-guion.png).
//
// evaluar(t, d, e) llena el estado `e` para el segundo `t` sin depender de lo anterior: se puede
// pausar, saltar a una escena o verse a otra velocidad (modo ?prueba).
//
// Coordenadas: mm sobre la tarjeta, con el origen en su centro, x a la derecha, y hacia el borde
// de arriba de la tarjeta y z saliendo de ella (hacia arriba si está sobre la mesa). Los
// personajes están de pie: x, y es el punto entre sus pies y z la altura de los pies. Sus manos,
// pies y gestos van en sus propias unidades (la grilla de 32 del logo), como en personajes.js.

import { estadoBookee, estadoVillana, OJOS, BOCA, MANO } from './personajes.js'
import { CITAS } from './textos.js'

export const DURACION = 15
export const ESCENAS = [
  { id: 'grieta', nombre: 'Algo se mueve', inicio: 0, fin: 1.5 },
  { id: 'rompe', nombre: 'La villana rompe la tarjeta', inicio: 1.5, fin: 3.5 },
  { id: 'desafio', nombre: 'Bookee le hace frente', inicio: 3.5, fin: 5 },
  { id: 'susto', nombre: 'Ruge y bookee se asusta', inicio: 5, fin: 7 },
  { id: 'acecho', nombre: 'Está a punto de comérselo', inicio: 7, fin: 9.5 },
  { id: 'agendado', nombre: '¡Agendado!', inicio: 9.5, fin: 11.5 },
  { id: 'cae', nombre: 'Se encoge y cae', inicio: 11.5, fin: 13 },
  { id: 'firma', nombre: 'Su firma', inicio: 13, fin: 15 },
]

const GOLPES = [0.35, 0.75, 1.1]
const SALTOS_VILLANA = [7.0, 7.47, 7.94] // tres saltos pesados hacia bookee (0,47 s cada uno)
export const LANZAMIENTO_CITAS = 10.0

export const SONIDOS = [
  ...GOLPES.map((t) => [t, 'golpe']),
  [1.25, 'crujido'],
  [1.5, 'rasgado'],
  [1.55, 'papel'],
  [2.25, 'rugidoGrave'],
  [2.95, 'aterrizaPesado'],
  [3.6, 'paso'],
  [3.8, 'paso'],
  [4.0, 'paso'],
  [4.2, 'paso'],
  [4.45, 'oye'],
  [5.05, 'rugido'],
  [5.2, 'ay'],
  ...SALTOS_VILLANA.map((t) => [t + 0.46, 'aterrizaPesado']),
  [8.45, 'suspenso'],
  [9.6, 'saca'],
  [9.9, 'destello'],
  [9.95, 'agendado'],
  [10.05, 'whoosh'],
  [10.3, 'whoosh'],
  [11.55, 'boing'],
  [11.95, 'nooo'],
  [12.55, 'plop'],
  [12.85, 'cierre'],
  [13.55, 'brillo'],
  [13.7, 'agendado'],
  [14.55, 'corre'],
].map(([t, id]) => ({ t, id }))

/** Medidas de la escena (mm). Todo sale de aquí para poder ajustarlo en un solo lugar. */
export function disposicion(tarjeta) {
  const { ancho, alto } = tarjeta
  return {
    ancho,
    alto,
    LU: 0.6, // mm por unidad de personaje
    // el hueco rasgado, en el centro (sobre «bookeaa»)
    hueco: { x: 0, y: 1, ru: 17, rv: 11, prof: 60 },
    villana: { x: 24, y: 8 }, // donde se para después de salir
    acecho: { x: -20, y: 10 }, // justo detrás de bookee, al lado del hueco
    bookee: { x: -25, y: -11 }, // donde se planta (retrocede 6 mm cuando se asusta)
    entrada: { x: -66, y: -11 }, // fuera de la tarjeta, por el costado izquierdo
    firma: { x: 0, y: -9 },
    citas: CITAS.map((_, i) => {
      // en abanico sobre la escena, a distintas alturas
      const a = -0.95 + (1.9 * i) / (CITAS.length - 1)
      return { x: Math.sin(a) * 38, y: 6 + Math.cos(a * 2) * 5, z: 38 + 10 * Math.cos(a * 1.6) + (i % 2) * 6, rot: a * 0.25 }
    }),
  }
}

export function crearEstado() {
  return {
    t: 0,
    escena: 0,
    b: estadoBookee(),
    v: estadoVillana(),
    // grieta: largo de las grietas 0..1 · temblor de la tarjeta · apertura de las solapas 0..1 ·
    // tapa: el centro roto, 0 en su lugar y 1 caído al pozo · interior: se ve el pozo ·
    // cicatriz: grietas que quedan al cerrar · solapas: opacidad
    hueco: { grieta: 0, temblor: 0, apertura: 0, tapa: 0, interior: 0, cicatriz: 0, solapas: 0 },
    trozos: -1, // segundos desde que saltaron los trozos de tarjeta (-1: no hay)
    citas: CITAS.map(() => ({ visible: 0, x: 0, y: 0, z: 0, escala: 1, rot: 0, opacidad: 1 })),
    globos: { oye: 0, grrr: 0, agendado: 0, nooo: 0 },
    destello: 0,
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
  hueco(t, d, e)
  villana(t, d, e)
  bookee(t, d, e)
  citas(t, d, e)
  globos(t, d, e)
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
const entre = (t, a, b) => t >= a && t < b

function mano(m, x, y, tipo = MANO.abierta) {
  m.x = x
  m.y = y
  m.tipo = tipo
}
function garra(m, x, y, angulo) {
  m.x = x
  m.y = y
  m.garra = angulo
}
function pies(p, xi, yi, xd, yd) {
  p[0].x = xi
  p[0].y = yi
  p[1].x = xd
  p[1].y = yd
}

/** Pasos: los pies se alternan y el cuerpo rebota. `fase` en ciclos. */
function caminar(b, fase, largo = 4.5) {
  const s = Math.sin(fase * Math.PI * 2)
  pies(b.pies, -6.5 + s * largo, Math.max(0, s) * 3, 6.5 - s * largo, Math.max(0, -s) * 3)
  b.z += Math.abs(s) * 0.9
  mano(b.manos[0], -18 - s * 3, 12 + s)
  mano(b.manos[1], 18 - s * 3, 12 - s)
  b.rot = -0.05 * b.dir
}

const PARPADEOS = [3.9, 6.6, 8.9, 12.3, 14.1]
function parpadeo(t) {
  for (const p of PARPADEOS) if (t > p && t < p + 0.14) return 0.1 + 0.9 * Math.abs((t - p) / 0.07 - 1)
  return 1
}

// ── Estado de base ────────────────────────────────────────────────────────────────────────
function reposo(t, d, e) {
  const { b, v, hueco: h, globos: g } = e
  b.visible = 0
  b.x = d.bookee.x
  b.y = d.bookee.y
  b.z = 0
  b.escala = 1
  b.rot = 0
  b.squash = 1 + 0.02 * Math.sin(t * Math.PI * 2 * 1.3)
  b.ojos = OJOS.normal
  b.parpadeo = parpadeo(t)
  b.miraX = 0
  b.miraY = 0
  b.cejas = 0
  b.boca = BOCA.sonrisa
  b.habla = 0
  b.dir = 0
  const balanceo = Math.sin(t * 4) * 0.8
  mano(b.manos[0], -19, 12 + balanceo)
  mano(b.manos[1], 19, 12 - balanceo)
  pies(b.pies, -6.5, 0, 6.5, 0)

  v.visible = 0
  v.x = d.villana.x
  v.y = d.villana.y
  v.z = 0
  v.escala = 1
  v.rot = 0
  v.squash = 1 + 0.025 * Math.sin(t * Math.PI * 2 * 0.9)
  v.ojos = 0
  v.boca = 0
  v.miraX = 0
  v.miraY = 0
  v.cejas = 0
  v.hojas = 1
  const resp = Math.sin(t * 3) * 1.2
  garra(v.manos[0], -34, 50 + resp, -110)
  garra(v.manos[1], 34, 50 - resp, -70)
  pies(v.pies, -11, 0, 11, 0)

  h.grieta = 0
  h.temblor = 0
  h.apertura = 0
  h.tapa = 0
  h.interior = 0
  h.cicatriz = 0
  h.solapas = 0
  e.trozos = -1
  g.oye = g.grrr = g.agendado = g.nooo = 0
  e.destello = 0
  e.boton = 0
}

// ── El hueco: grieta, se rasga, queda abierto y al final se cierra con cicatriz ───────────
function hueco(t, d, e) {
  const h = e.hueco
  h.grieta = suave(seg(t, 0.3, 1.3))
  let temblor = 0
  for (const g of GOLPES) temblor = Math.max(temblor, campana(t, g, g + 0.2))
  h.temblor = temblor + 0.6 * campana(t, 1.25, 1.5)
  // las solapas se abren de golpe (1,5 s) y se cierran cuando cae la villana (12,55 s)
  if (t >= 1.5 && t < 12.55) h.apertura = rebote(seg(t, 1.5, 1.78), 2.2)
  else if (t >= 12.55) h.apertura = 1 - salida(seg(t, 12.55, 12.82)) + 0.08 * campana(t, 12.82, 12.95)
  if (t >= 1.5 && t < 12.55) h.tapa = entrada(seg(t, 1.5, 1.85))
  else if (t >= 12.55) h.tapa = 1 - salida(seg(t, 12.55, 12.82))
  h.interior = t >= 1.5 && t < 12.95 ? 1 : 0
  h.solapas = t >= 0.3 ? 1 - seg(t, 14.5, 15) : 0
  h.cicatriz = t >= 12.82 ? 1 - seg(t, 14.5, 15) : 0
  if (t >= 1.5 && t < 4) e.trozos = t - 1.5
}

// ── La agenda malvada ─────────────────────────────────────────────────────────────────────
function villana(t, d, e) {
  const v = e.v
  const H = d.hueco
  const V = d.villana
  const A = d.acecho
  if (t < 1.5 || t >= 12.6) return
  v.visible = 1

  if (t < 2.95) {
    // sale del hueco con las garras arriba, ruge y salta a su lugar
    v.boca = 1
    garra(v.manos[0], -38, 62 + 2 * Math.sin(t * 20), -120)
    garra(v.manos[1], 38, 62 - 2 * Math.sin(t * 20), -60)
    v.cejas = 1.5
    if (t < 2.5) {
      v.x = H.x
      v.y = H.y
      v.z = lerp(-72, -6, salida(seg(t, 1.55, 2.2)))
      v.rot = 0.06 * Math.sin(t * 40) * campana(t, 2.2, 2.5)
    } else {
      const k = seg(t, 2.5, 2.95)
      v.x = lerp(H.x, V.x, k)
      v.y = lerp(H.y, V.y, k)
      v.z = lerp(-6, 0, k) + 24 * arco(k)
      v.boca = 0
      pies(v.pies, -8, 3, 8, 3)
    }
    return
  }
  if (t < 7) {
    // en su lugar: aterriza, mira a bookee y ruge
    v.squash *= 1 - 0.18 * campana(t, 2.95, 3.15)
    v.miraX = t > 3.7 ? -1 : -0.4
    if (t >= 5.0 && t < 6.3) {
      v.boca = 1
      v.escala = 1 + 0.12 * salida(seg(t, 5.0, 5.25))
      v.rot = 0.05 * Math.sin(t * 34) * campana(t, 5.05, 5.8)
      garra(v.manos[0], -38, 62, -120)
      garra(v.manos[1], 38, 62, -60)
      v.cejas = 2
    } else if (t >= 6.3) v.escala = lerp(1.12, 1.06, seg(t, 6.3, 6.6))
    return
  }
  if (t < 9.5) {
    // tres saltos pesados hacia bookee y se le viene encima con la boca abierta
    v.escala = 1.06
    v.miraX = -1
    v.miraY = -0.6
    let x = V.x
    let y = V.y
    for (let i = 0; i < SALTOS_VILLANA.length; i++) {
      const t0 = SALTOS_VILLANA[i]
      const a = i / SALTOS_VILLANA.length
      const b = (i + 1) / SALTOS_VILLANA.length
      if (t >= t0 + 0.47) {
        x = lerp(V.x, A.x, b)
        y = lerp(V.y, A.y, b)
      } else if (t >= t0) {
        const k = seg(t, t0, t0 + 0.47)
        x = lerp(V.x, A.x, lerp(a, b, k))
        y = lerp(V.y, A.y, lerp(a, b, k))
        v.z = 9 * arco(k)
        pies(v.pies, -9, 3, 9, 3)
      }
      v.squash *= 1 - 0.15 * campana(t, t0 + 0.44, t0 + 0.6)
    }
    v.x = x
    v.y = y
    if (t >= 8.4) {
      const k = salida(seg(t, 8.4, 8.9))
      v.boca = 1
      v.cejas = 2
      v.rot = 0.26 * k + 0.02 * Math.sin(t * 9)
      v.escala = 1.06 + 0.1 * k
      v.z = 1.5 * k
      garra(v.manos[0], lerp(-34, -40, k), lerp(50, 44, k), -150)
      garra(v.manos[1], lerp(34, 10, k), lerp(50, 70, k), -90)
    }
    return
  }
  // ── 9,5–12,6 s: ¡Agendado! la golpea el destello, se queda sin hojas y cae por el hueco ──
  const A2 = { x: A.x + 6, y: A.y + 2 }
  if (t < 9.9) {
    v.x = A.x
    v.y = A.y
    v.boca = 1
    v.cejas = 2
    v.escala = 1.16
    v.rot = 0.26
    v.z = 1.5
    garra(v.manos[0], -40, 44, -150)
    garra(v.manos[1], 10, 70, -90)
    return
  }
  v.ojos = 1
  v.boca = 2
  v.hojas = t < LANZAMIENTO_CITAS ? 1 : 0
  garra(v.manos[0], -27, 16, 0)
  garra(v.manos[1], 27, 16, 0)
  pies(v.pies, -4, 0, 5, 0)
  if (t < 11.5) {
    const k = salida(seg(t, 9.9, 10.3))
    v.x = lerp(A.x, A2.x, k)
    v.y = lerp(A.y, A2.y, k)
    v.rot = lerp(0.26, -0.18, k) + 0.08 * Math.sin(t * 7) * seg(t, 10.3, 10.6)
    v.escala = lerp(1.16, 0.9, seg(t, 9.95, 10.6))
    v.squash *= 1 - 0.2 * campana(t, 9.9, 10.15)
    return
  }
  // se tambalea hasta el hueco, se encoge a una libretita y cae
  const k = seg(t, 11.5, 11.9)
  v.x = lerp(A2.x, d.hueco.x, k)
  v.y = lerp(A2.y, d.hueco.y, k)
  v.z = 8 * arco(k)
  v.rot = 0.15 * Math.sin(t * 14)
  v.escala = lerp(0.9, 0.35, suave(seg(t, 11.9, 12.15)))
  if (t >= 12.15) {
    v.z = lerp(2, -48, entrada(seg(t, 12.15, 12.55)))
    v.rot = 0.6 * seg(t, 12.15, 12.55)
  }
}

// ── Bookee ────────────────────────────────────────────────────────────────────────────────
function bookee(t, d, e) {
  const b = e.b
  const B = d.bookee
  if (t < 3.5) return
  b.visible = 1

  if (t < 5) {
    // entra caminando por el costado de la tarjeta y la enfrenta
    if (t < 4.3) {
      const k = seg(t, 3.5, 4.3)
      b.x = lerp(d.entrada.x, B.x, k)
      b.y = lerp(d.entrada.y, B.y, k)
      b.dir = 1
      caminar(b, (t - 3.5) * 2.5)
      b.miraX = 0.5
    } else {
      b.ojos = OJOS.decidido
      b.boca = BOCA.decidida
      b.miraX = 1
      b.squash *= 1 - 0.1 * campana(t, 4.3, 4.45)
      mano(b.manos[0], -11, 14, MANO.puno)
      mano(b.manos[1], 11, 14, MANO.puno)
      if (entre(t, 4.45, 4.95)) {
        b.habla = Math.abs(Math.sin(t * 22))
        mano(b.manos[1], 21, 26 + 2 * Math.sin(t * 25), MANO.puno) // amenaza con el puño
      }
    }
    return
  }
  if (t < 7) {
    // ¡GRRR! salta del susto, se tapa la boca, le tiemblan las piernas y retrocede
    b.ojos = OJOS.susto
    b.boca = BOCA.nerviosa
    b.cejas = -1
    b.miraX = 1
    b.miraY = 0.3
    b.z = 6 * arco(seg(t, 5.15, 5.42))
    const k = suave(seg(t, 5.45, 5.95))
    b.x = lerp(B.x, B.x - 6, k)
    mano(b.manos[0], -7, 21)
    mano(b.manos[1], 7, 21)
    const tiembla = Math.sin(t * 50) * 0.8
    pies(b.pies, -4 + tiembla, 0, 4 - tiembla, 0)
    b.rot = 0.03 * Math.sin(t * 47)
    return
  }
  if (t < 9.5) {
    // acorralado: se encoge y mira hacia arriba, a la boca de la villana
    b.x = B.x - 6
    b.ojos = OJOS.susto
    b.boca = BOCA.o
    b.cejas = -1
    b.miraX = 0.7
    b.miraY = t > 8.4 ? 1 : 0.4
    b.squash *= lerp(1, 0.9, seg(t, 8.4, 8.7))
    mano(b.manos[0], -21, 36)
    mano(b.manos[1], 21, 36)
    const tiembla = Math.sin(t * 55) * 0.8
    pies(b.pies, -4 + tiembla, 0, 4 - tiembla, 0)
    b.rot = 0.03 * Math.sin(t * 52)
    return
  }
  if (t < 13) {
    // ¡Agendado!: saca el teléfono, destello, la villana pierde sus hojas
    b.x = B.x - 6
    b.miraX = 0.8
    b.miraY = 0.4
    if (t < 9.75) {
      b.ojos = OJOS.susto
      b.boca = BOCA.o
      const k = salida(seg(t, 9.5, 9.75))
      mano(b.manos[1], lerp(21, 19, k), lerp(36, 14, k), k > 0.5 ? MANO.telefono : MANO.abierta)
      mano(b.manos[0], -21, lerp(36, 12, k))
    } else if (t < 11.5) {
      b.ojos = OJOS.decidido
      b.boca = BOCA.decidida
      const k = rebote(seg(t, 9.75, 9.9))
      mano(b.manos[1], lerp(19, 22, k), lerp(14, 38, k), MANO.telefono)
      mano(b.manos[0], -19, 12, MANO.puno)
      b.squash *= 1 + 0.08 * campana(t, 9.85, 10.1)
      if (entre(t, 9.95, 10.5)) b.habla = Math.abs(Math.sin(t * 24))
      e.destello = campana(t, 9.88, 10.3)
    } else {
      // mira cómo se encoge y cae
      b.ojos = OJOS.normal
      b.boca = t < 12.6 ? BOCA.o : BOCA.grande
      b.miraX = 0.9
      b.miraY = -0.6
      mano(b.manos[1], 19, 12)
      b.cejas = t < 12.6 ? 1 : 0.6
    }
    return
  }
  // ── 13–15 s: camina al centro, guiño y pulgar arriba, y sale corriendo por donde entró ──
  const F = d.firma
  const x0 = B.x - 6
  if (t < 13.5) {
    const k = seg(t, 13.0, 13.5)
    b.x = lerp(x0, F.x, k)
    b.y = lerp(B.y, F.y, k)
    b.dir = 1
    caminar(b, (t - 13) * 2.6, 4)
    b.ojos = OJOS.feliz
    b.boca = BOCA.grande
    return
  }
  b.x = F.x
  b.y = F.y
  if (t < 14.5) {
    b.ojos = OJOS.guino
    b.boca = BOCA.sonrisa
    b.cejas = 0.8
    b.rot = -0.07 * salida(seg(t, 13.5, 13.65))
    b.squash *= 1 - 0.08 * campana(t, 13.5, 13.65)
    mano(b.manos[1], 20, lerp(12, 27, rebote(seg(t, 13.5, 13.68))), MANO.pulgar)
    mano(b.manos[0], -18, 12)
    if (entre(t, 13.7, 14.2)) b.habla = Math.abs(Math.sin(t * 24))
    e.boton = suave(seg(t, 13.55, 13.8))
    return
  }
  const k = entrada(seg(t, 14.55, 14.97))
  if (k >= 1) b.visible = 0 // ya salió de la tarjeta
  b.x = lerp(F.x, d.entrada.x, k)
  b.y = lerp(F.y, d.entrada.y, k)
  b.dir = -1
  b.ojos = OJOS.feliz
  b.boca = BOCA.grande
  caminar(b, (t - 14.5) * 4, 5)
  e.boton = 1 - seg(t, 14.6, 15)
}

// ── Las citas digitales: salen de la villana, flotan y llueven sobre la tarjeta ───────────
function citas(t, d, e) {
  const A = d.acecho
  for (let i = 0; i < e.citas.length; i++) {
    const c = e.citas[i]
    const def = d.citas[i]
    const t0 = LANZAMIENTO_CITAS + i * 0.07
    c.visible = t >= t0 && t < 14.8 ? 1 : 0
    if (!c.visible) continue
    // vuelo desde el cuerpo de la villana hasta su lugar
    const k = salida(seg(t, t0, t0 + 0.6))
    c.x = lerp(A.x + 6, def.x, k)
    c.y = lerp(A.y + 2, def.y, k)
    c.z = lerp(18, def.z, k) + 1.2 * Math.sin(t * 2.4 + i)
    c.escala = lerp(0.2, 1, k)
    c.rot = def.rot + 0.06 * Math.sin(t * 1.8 + i * 1.3)
    c.opacidad = 1
    // lluvia: bajan girando sobre la tarjeta y se desvanecen
    if (t >= 13) {
      const l = seg(t, 13 + i * 0.05, 14.6)
      c.z = lerp(def.z, 3, suave(l))
      c.rot += 2.2 * l * (i % 2 ? 1 : -1)
      c.opacidad = 1 - seg(t, 14.2, 14.75)
    }
  }
}

// ── Globos de diálogo (escala 0..1) ───────────────────────────────────────────────────────
function globos(t, d, e) {
  const g = e.globos
  const pop = (a, b) => rebote(seg(t, a, a + 0.18)) * (1 - seg(t, b - 0.15, b))
  g.oye = pop(4.45, 5.0)
  g.grrr = pop(5.08, 6.2)
  g.agendado = pop(9.95, 11.1)
  g.nooo = pop(11.95, 12.6)
}
