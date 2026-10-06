// Todo lo que acompaña al personaje: la tarjeta con su hueco, las libretas, el confeti de
// papel, el teléfono, la cita, el globo y las frases. Coordenadas en mm sobre la tarjeta.

import { THREE, COLOR, mat, matPropio, malla, elipse, rrect, geoRrect, geoCapsula, geoAnillo, textura, caminoRrect, fuente } from './formas.js'
import { FRASES, CITA, GLOBO, AGENDA } from './textos.js'

const c01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x)

export function crearUtileria({ d, tarjeta, modo, texturaFrente }) {
  const grupo = new THREE.Group()
  const tarjetaV = crearTarjeta({ d, tarjeta, modo, texturaFrente })
  grupo.add(tarjetaV.grupo)

  const libretas = d.libretas.map((def) => {
    const l = crearLibreta(def)
    grupo.add(l.grupo)
    return l
  })
  const confeti = crearConfeti(d)
  grupo.add(confeti.malla)
  const telefono = crearTelefono()
  grupo.add(telefono.grupo)
  const cita = crearCita(d)
  grupo.add(cita.grupo)
  const globo = crearGlobo()
  grupo.add(globo.grupo)
  const paneles = FRASES.map((lineas) => {
    const p = crearPanel(lineas)
    grupo.add(p.grupo)
    return p
  })
  const sombra = elipse(1, 1, matPropio(COLOR.carbon, { opacity: 0.3, depthWrite: false }))
  sombra.renderOrder = 1
  grupo.add(sombra)

  function aplicar(e, t) {
    tarjetaV.aplicar(e.hueco)
    for (let i = 0; i < libretas.length; i++) libretas[i].aplicar(e.libretas[i])
    confeti.aplicar(t)
    telefono.aplicar(e.telefono, t)
    cita.aplicar(e.cita)
    globo.aplicar(e.globo)
    for (let i = 0; i < paneles.length; i++) paneles[i].aplicar(e.paneles[i])
    // sombra plana del personaje sobre la tarjeta: más chica y clara mientras más alto está
    const p = e.pj
    const alto = Math.max(p.z, 0)
    sombra.visible = p.extremidades > 0.3
    sombra.position.set(p.x + alto * 0.25, p.y + (-24 * p.lu) - alto * 0.3, 0.12)
    sombra.scale.set(11 * p.lu * (1 - Math.min(alto, 30) / 60), 2.6 * p.lu * 2.2, 1)
    sombra.material.opacity = 0.32 * (1 - Math.min(alto, 30) / 40)
  }

  return { grupo, aplicar, telefono }
}

// ── La tarjeta: hueco con profundidad y, en el Plan B, la cara impresa ─────────────────────

function caminoAgujero(cx, cy, w, h, r) {
  const p = new THREE.Path()
  const x = cx - w / 2
  const y = cy - h / 2
  // sentido contrario al contorno de la tarjeta, como pide un agujero
  p.moveTo(x + r, y)
  p.absarc(x + r, y + r, r, Math.PI * 1.5, Math.PI, true)
  p.lineTo(x, y + h - r)
  p.absarc(x + r, y + h - r, r, Math.PI, Math.PI / 2, true)
  p.lineTo(x + w - r, y + h)
  p.absarc(x + w - r, y + h - r, r, Math.PI / 2, 0, true)
  p.lineTo(x + w, y + r)
  p.absarc(x + w - r, y + r, r, 0, -Math.PI / 2, true)
  p.lineTo(x + r, y)
  return p
}

function crearTarjeta({ d, tarjeta, modo, texturaFrente }) {
  const grupo = new THREE.Group()
  const { ancho, alto } = tarjeta
  const { L } = d
  // tapa el logo impreso aunque el seguimiento tiemble ~1 mm (sin llegar al "bookeaa" de al lado)
  const lado = tarjeta.logo.lado + 1.6
  const radio = 1.5
  const prof = 5

  // cara de la tarjeta con el agujero. En AR no se pinta: solo escribe profundidad, así lo que
  // pasa "dentro" de la tarjeta queda oculto salvo por el agujero.
  const forma = rrect(ancho, alto, 0.5)
  forma.holes.push(caminoAgujero(L.x, L.y, lado, lado, radio))
  const geoCara = new THREE.ShapeGeometry(forma, 12)
  const uv = geoCara.attributes.uv
  const pos = geoCara.attributes.position
  for (let i = 0; i < uv.count; i++) uv.setXY(i, (pos.getX(i) + ancho / 2) / ancho, (pos.getY(i) + alto / 2) / alto)
  const cara =
    modo === 'ar'
      ? new THREE.Mesh(geoCara, new THREE.MeshBasicMaterial({ colorWrite: false }))
      : new THREE.Mesh(geoCara, new THREE.MeshBasicMaterial({ map: texturaFrente }))
  cara.renderOrder = -1
  grupo.add(cara)

  if (modo !== 'ar') {
    // canto y sombra de la tarjeta virtual
    grupo.add(malla(geoRrect(ancho, alto, 0.5), mat('#2c2c29'), 0, 0, -0.45))
    const sombra = malla(geoRrect(ancho, alto, 2), matPropio(COLOR.carbon, { opacity: 0.16, depthWrite: false }), 2.5, -3.5, -2.5)
    grupo.add(sombra)
  }

  // paredes y fondo del hueco
  const contorno = caminoAgujero(0, 0, lado, lado, radio).getPoints(6)
  const vert = []
  const colores = []
  const c = new THREE.Color()
  for (let i = 0; i < contorno.length - 1; i++) {
    const a = contorno[i]
    const b = contorno[i + 1]
    // sombreado falso según hacia dónde mira la pared
    const nx = -(b.y - a.y)
    const ny = b.x - a.x
    const luz = 0.5 + 0.5 * ((nx * 0.4 + ny * 0.9) / (Math.hypot(nx, ny) || 1))
    c.set('#141413').lerp(new THREE.Color('#4a4a46'), luz)
    vert.push(a.x, a.y, 0, b.x, b.y, 0, b.x, b.y, -prof, a.x, a.y, 0, b.x, b.y, -prof, a.x, a.y, -prof)
    for (let k = 0; k < 6; k++) colores.push(c.r, c.g, c.b)
  }
  const geoPared = new THREE.BufferGeometry()
  geoPared.setAttribute('position', new THREE.Float32BufferAttribute(vert, 3))
  geoPared.setAttribute('color', new THREE.Float32BufferAttribute(colores, 3))
  const hueco = new THREE.Group()
  hueco.position.set(L.x, L.y, 0)
  hueco.add(new THREE.Mesh(geoPared, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide })))
  hueco.add(malla(geoRrect(lado, lado, radio), mat('#000000'), 0, 0, -prof))
  // borde del agujero: marca el corte aunque la tarjeta sea negra
  const labio = new THREE.Mesh(bordeRrect(lado, lado, radio, 0.35), mat(COLOR.grafito))
  labio.position.z = 0.03
  hueco.add(labio)
  grupo.add(hueco)

  // tapa del color de la tarjeta: con el hueco cerrado, el logo impreso se ve tal cual
  const tapa = malla(geoRrect(lado + 0.2, lado + 0.2, radio), mat(tarjeta.fondo), L.x, L.y, 0.02)
  grupo.add(tapa)

  return {
    grupo,
    aplicar(h) {
      const abierto = h.abierto > 0.5
      tapa.visible = !abierto
      hueco.visible = abierto
      labio.scale.set(h.apertura, h.apertura, 1)
    },
  }
}

/** Marco de rectángulo redondeado (para el borde del agujero). */
function bordeRrect(w, h, r, grosor) {
  const f = rrect(w + 2 * grosor, h + 2 * grosor, r + grosor)
  f.holes.push(caminoAgujero(0, 0, w, h, r))
  return new THREE.ShapeGeometry(f, 8)
}

// ── Libretas y agenda de papel (se parten en dos al romperse) ──────────────────────────────

function crearLibreta(def) {
  const { tipo, ancho: w, alto: h } = def
  const grupo = new THREE.Group()
  const etiqueta = tipo === 'agenda' ? texturaEtiqueta() : null
  const mitades = [-1, 1].map((lado) => {
    const m = new THREE.Group()
    const hw = w / 2
    const cx = (lado * hw) / 2
    if (tipo === 'agenda') {
      m.add(malla(geoRrect(hw + 1.2, h + 1.2, 1.7), mat(COLOR.papel), cx, 0, 0))
      m.add(malla(geoRrect(hw, h, 1.2), mat(COLOR.carbon), cx, 0, 0.05))
      const tex = etiqueta.clone()
      tex.repeat.set(0.5, 1)
      tex.offset.set(lado < 0 ? 0 : 0.5, 0)
      tex.needsUpdate = true
      const pl = new THREE.Mesh(new THREE.PlaneGeometry(hw * 0.78, 4.4), new THREE.MeshBasicMaterial({ map: tex, transparent: true }))
      pl.position.set((lado * hw * 0.78) / 2, h * 0.16, 0.1)
      m.add(pl)
      if (lado > 0) m.add(malla(geoRrect(1.3, h, 0.4), mat(COLOR.grafito), hw * 0.62, 0, 0.12))
    } else {
      const fondo = tipo === 'bloc' ? COLOR.niebla : COLOR.papel
      m.add(malla(geoRrect(hw + 1.1, h + 1.1, 1.2), mat(COLOR.carbon), cx, 0, 0))
      m.add(malla(geoRrect(hw, h, 0.8), mat(fondo), cx, 0, 0.05))
      for (let k = 0; k < 5; k++) m.add(malla(geoRrect(hw * 0.78, 0.38, 0.19), mat(COLOR.linea), cx, h / 2 - 4.4 - k * 2.6, 0.1))
      // espiral arriba
      const n = 3
      for (let k = 0; k < n; k++) {
        const x = cx + ((k - (n - 1) / 2) * hw) / n
        m.add(malla(geoAnillo(0.5, 0.95, 16), mat(COLOR.grafito), x, h / 2 - 0.1, 0.15))
      }
    }
    grupo.add(m)
    return m
  })
  return {
    grupo,
    aplicar(s) {
      grupo.visible = s.visible > 0
      if (!grupo.visible) return
      grupo.position.set(s.x, s.y, s.z)
      grupo.rotation.z = s.rot
      grupo.scale.set(1 + (1 - s.escala) * 0.5, s.escala, 1)
      const r = s.rota
      for (let i = 0; i < 2; i++) {
        const m = mitades[i]
        const lado = i === 0 ? -1 : 1
        if (r < 0) {
          m.position.set(0, 0, 0)
          m.rotation.z = 0
          m.scale.setScalar(1)
        } else {
          m.position.set((def.dir * 38 + lado * 12) * r, 22 * r - 50 * r * r, 9 * r)
          m.rotation.z = lado * 7 * r
          m.scale.setScalar(Math.max(0.001, 1 - r / 0.7))
        }
      }
    },
  }
}

function texturaEtiqueta() {
  return textura(256, 96, (ctx, w, h) => {
    caminoRrect(ctx, 4, 4, w - 8, h - 8, 12)
    ctx.fillStyle = COLOR.papel
    ctx.fill()
    ctx.fillStyle = COLOR.carbon
    ctx.font = fuente(800, 62)
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(AGENDA.toUpperCase(), w / 2, h / 2 + 3)
  })
}

// ── Confeti de papel: una sola malla instanciada ───────────────────────────────────────────

function aleatorio(semilla) {
  let s = semilla >>> 0
  return () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function crearConfeti(d) {
  const total = d.rafagas.reduce((n, r) => n + r.n, 0)
  const malla_ = new THREE.InstancedMesh(new THREE.PlaneGeometry(1.7, 1.1), new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }), total)
  malla_.frustumCulled = false
  const azar = aleatorio(20261005)
  const paleta = [COLOR.papel, COLOR.papel, COLOR.papel, COLOR.niebla, COLOR.niebla, COLOR.linea, COLOR.linea, COLOR.grafito].map(
    (h) => new THREE.Color(h),
  )
  const piezas = []
  for (const r of d.rafagas) {
    for (let i = 0; i < r.n; i++) {
      const ang = azar() * Math.PI * 2
      const vel = 45 + azar() * 70
      piezas.push({
        r,
        vx: Math.cos(ang) * vel + r.dir * 45,
        vy: Math.abs(Math.sin(ang)) * vel * 0.9 + 35,
        vz: 10 + azar() * 70,
        wx: (azar() - 0.5) * 22,
        wy: (azar() - 0.5) * 22,
        wz: (azar() - 0.5) * 16,
        tam: 0.7 + azar() * 0.8,
        demora: azar() * 0.06,
      })
      malla_.setColorAt(piezas.length - 1, paleta[Math.floor(azar() * paleta.length)])
    }
  }
  const m = new THREE.Matrix4()
  const q = new THREE.Quaternion()
  const eu = new THREE.Euler()
  const p = new THREE.Vector3()
  const s = new THREE.Vector3()
  const VIDA = 1.6
  return {
    malla: malla_,
    aplicar(t) {
      let algo = false
      for (let i = 0; i < piezas.length; i++) {
        const k = piezas[i]
        const dt = t - k.r.t - k.demora
        if (dt < 0 || dt > VIDA) {
          s.set(0, 0, 0)
          m.compose(p.set(0, 0, -1000), q.identity(), s)
        } else {
          algo = true
          // aire: frena con el tiempo; gravedad hacia el borde de abajo de la tarjeta
          const fr = (1 - Math.exp(-2.2 * dt)) / 2.2
          p.set(k.r.x + k.vx * fr, k.r.y + k.vy * fr - 0.5 * 75 * dt * dt, d.z + k.vz * fr)
          eu.set(k.wx * dt, k.wy * dt, k.wz * dt)
          q.setFromEuler(eu)
          const desvanece = dt > VIDA - 0.4 ? (VIDA - dt) / 0.4 : 1
          s.setScalar(k.tam * desvanece)
          m.compose(p, q, s)
        }
        malla_.setMatrixAt(i, m)
      }
      malla_.visible = algo
      malla_.instanceMatrix.needsUpdate = true
    },
  }
}

// ── Teléfono que suena ─────────────────────────────────────────────────────────────────────

function crearTelefono() {
  const grupo = new THREE.Group()
  const cuerpo = new THREE.Group()
  cuerpo.add(malla(geoRrect(8.6, 14.6, 2.3), mat(COLOR.papel), 0, 0, 0))
  cuerpo.add(malla(geoRrect(7, 13, 1.7), mat(COLOR.carbon), 0, 0, 0.05))
  cuerpo.add(malla(geoRrect(5.6, 9.4, 0.8), mat(COLOR.grafito), 0, 0.4, 0.1))
  // el ícono de bookeaa en la pantalla
  cuerpo.add(malla(geoRrect(3.2, 3.0, 0.8), mat(COLOR.papel), 0, 0.5, 0.15))
  cuerpo.add(malla(geoCapsula(0.45, 1.1), mat(COLOR.papel), -0.7, 2.05, 0.15))
  cuerpo.add(malla(geoCapsula(0.45, 1.1), mat(COLOR.papel), 0.7, 2.05, 0.15))
  cuerpo.add(malla(geoAnillo(0.32, 0.62, 18), mat(COLOR.carbon), 0.12, 0.25, 0.2))
  cuerpo.add(malla(geoCapsula(0.32, 1.5), mat(COLOR.carbon), -0.42, 0.55, 0.2))
  cuerpo.add(elipse(0.6, 0.6, mat(COLOR.papel), 0, -5.3, 0.1))
  grupo.add(cuerpo)
  const ondas = []
  for (const lado of [-1, 1]) {
    for (const k of [0, 1]) {
      const r = 8.2 + k * 2.6
      const t0 = lado > 0 ? -0.55 : Math.PI - 0.55
      const g = new THREE.Group()
      g.add(malla(geoAnillo(r - 0.55, r + 0.55, 18, t0, 1.1), mat(COLOR.carbon), 0, 0, -0.05))
      g.add(malla(geoAnillo(r - 0.3, r + 0.3, 18, t0, 1.1), mat(COLOR.papel), 0, 0, 0))
      grupo.add(g)
      ondas.push({ g, k })
    }
  }
  return {
    grupo,
    cuerpo,
    aplicar(s, t) {
      grupo.visible = s.visible > 0 && s.escala > 0.001
      if (!grupo.visible) return
      if (!s.enMano) grupo.position.set(s.x, s.y, s.z)
      grupo.rotation.z = s.enMano ? -0.35 : s.rot
      grupo.scale.setScalar(s.escala)
      for (const o of ondas) {
        o.g.visible = s.sonando > 0 && Math.sin(t * 30 - o.k * 1.6) > -0.2
        o.g.scale.setScalar(1 + 0.08 * Math.sin(t * 30 - o.k))
      }
    },
  }
}

// ── Cita (se escribe con el lápiz) ─────────────────────────────────────────────────────────

function crearCita(d) {
  const { ancho: w, alto: h } = d.cita
  const grupo = new THREE.Group()
  grupo.add(malla(geoRrect(w + 1.2, h + 1.2, 1.9), mat(COLOR.carbon), 0, 0, 0))
  grupo.add(malla(geoRrect(w, h, 1.4), mat(COLOR.papel), 0, 0, 0.05))
  grupo.add(malla(geoRrect(1.4, h - 3, 0.7), mat(COLOR.carbon), -w / 2 + 2.4, 0, 0.1))
  const px = 25 // px por mm en la textura
  const tex = textura(Math.round((w - 6) * px), Math.round((h - 1) * px), (ctx, cw, ch) => {
    ctx.fillStyle = COLOR.carbon
    ctx.textBaseline = 'alphabetic'
    ctx.font = fuente(800, 3.2 * px)
    ctx.fillText(CITA.titulo.toUpperCase(), 0, ch * 0.47)
    ctx.fillStyle = COLOR.grafito
    ctx.font = fuente(600, 2.5 * px, 'Barlow')
    ctx.fillText(CITA.detalle, 0, ch * 0.86)
  })
  const ancho = w - 6
  const texto = new THREE.Mesh(new THREE.PlaneGeometry(1, h - 1), new THREE.MeshBasicMaterial({ map: tex, transparent: true }))
  texto.position.z = 0.12
  grupo.add(texto)
  const check = new THREE.Group()
  check.add(elipse(2.4, 2.4, mat(COLOR.carbon), 0, 0, 0.2))
  const visto = textura(96, 96, (ctx) => {
    ctx.strokeStyle = COLOR.papel
    ctx.lineWidth = 13
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.beginPath()
    ctx.moveTo(24, 50)
    ctx.lineTo(41, 66)
    ctx.lineTo(72, 32)
    ctx.stroke()
  })
  const vistoM = new THREE.Mesh(new THREE.PlaneGeometry(4.8, 4.8), new THREE.MeshBasicMaterial({ map: visto, transparent: true }))
  vistoM.position.z = 0.25
  check.add(vistoM)
  check.position.set(w / 2 - 0.5, h / 2 - 0.5, 0)
  grupo.add(check)
  const x0 = -w / 2 + 4
  return {
    grupo,
    aplicar(s) {
      grupo.visible = s.visible > 0 && s.escala > 0.001
      if (!grupo.visible) return
      grupo.position.set(s.x, s.y, s.z)
      grupo.scale.setScalar(s.escala)
      const r = Math.max(0.001, s.revelar)
      texto.scale.x = ancho * r
      texto.position.x = x0 + (ancho * r) / 2
      tex.repeat.x = r
      texto.visible = s.revelar > 0
      check.visible = s.check > 0.01
      check.scale.setScalar(Math.max(0.001, s.check))
    },
  }
}

// ── Globo "¡Agendado!" ─────────────────────────────────────────────────────────────────────

function crearGlobo() {
  const W = 34
  const H = 15
  const px = 24
  const tex = textura(W * px, H * px, (ctx, w, h) => {
    const b = 0.6 * px
    const cola = 3.2 * px
    caminoRrect(ctx, b, b, w - 2 * b, h - 2 * b - cola, 2.6 * px)
    ctx.fillStyle = COLOR.papel
    ctx.strokeStyle = COLOR.carbon
    ctx.lineWidth = b * 1.2
    ctx.fill()
    ctx.stroke()
    // cola hacia el personaje (abajo a la derecha)
    const y0 = h - b - cola - 1
    ctx.beginPath()
    ctx.moveTo(w * 0.58, y0)
    ctx.lineTo(w * 0.7, h - b * 1.5)
    ctx.lineTo(w * 0.72, y0)
    ctx.closePath()
    ctx.fill()
    ctx.beginPath()
    ctx.moveTo(w * 0.58, y0 + b * 0.7)
    ctx.lineTo(w * 0.7, h - b * 1.5)
    ctx.lineTo(w * 0.72, y0 + b * 0.7)
    ctx.stroke()
    ctx.fillStyle = COLOR.carbon
    ctx.font = fuente(800, 6.6 * px)
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(GLOBO.toUpperCase(), w / 2, (h - cola) / 2 + 0.3 * px)
  })
  const grupo = new THREE.Group()
  const plano = new THREE.Mesh(new THREE.PlaneGeometry(W, H), new THREE.MeshBasicMaterial({ map: tex, transparent: true }))
  grupo.add(plano)
  return {
    grupo,
    aplicar(s) {
      grupo.visible = s.visible > 0 && s.escala > 0.001
      if (!grupo.visible) return
      grupo.position.set(s.x, s.y, s.z)
      grupo.scale.setScalar(s.escala)
    },
  }
}

// ── Frases (pastillas blancas con texto carbón, como en la marca) ─────────────────────────

const PX_POR_MM = 15
const LETRA_MM = 7

function crearPanel(lineas) {
  const fontPx = LETRA_MM * PX_POR_MM
  const pad = 2.4 * PX_POR_MM
  const altoLinea = fontPx * 0.98
  const medir = document.createElement('canvas').getContext('2d')
  medir.font = fuente(800, fontPx)
  const textos = lineas.map((l) => l.toUpperCase())
  const anchoTexto = Math.max(...textos.map((l) => medir.measureText(l).width))
  const w = Math.ceil(anchoTexto + 2 * pad)
  const h = Math.ceil(textos.length * altoLinea + 2 * pad * 0.82)
  const borde = 0.55 * PX_POR_MM
  const radio = 2.6 * PX_POR_MM
  const tex = textura(w, h, (ctx) => {
    caminoRrect(ctx, borde / 2, borde / 2, w - borde, h - borde, radio)
    ctx.fillStyle = COLOR.papel
    ctx.fill()
    ctx.lineWidth = borde
    ctx.strokeStyle = COLOR.carbon
    ctx.stroke()
    ctx.fillStyle = COLOR.carbon
    ctx.font = fuente(800, fontPx)
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    textos.forEach((l, i) => ctx.fillText(l, w / 2, h / 2 + (i - (textos.length - 1) / 2) * altoLinea + fontPx * 0.04))
  })
  const W = w / PX_POR_MM
  const H = h / PX_POR_MM
  const grupo = new THREE.Group()
  const matPanel = new THREE.MeshBasicMaterial({ map: tex, transparent: true })
  const matCanto = matPropio(COLOR.grafito)
  const canto = new THREE.Mesh(new THREE.ShapeGeometry(rrect(W, H, radio / PX_POR_MM), 8), matCanto)
  canto.position.set(0.9, -1.1, -0.5)
  const plano = new THREE.Mesh(new THREE.PlaneGeometry(W, H), matPanel)
  grupo.add(canto, plano)
  return {
    grupo,
    ancho: W,
    alto: H,
    aplicar(s) {
      grupo.visible = s.visible > 0
      if (!grupo.visible) return
      grupo.position.set(s.x, s.y, s.z)
      grupo.rotation.z = s.rot
      grupo.scale.setScalar(Math.max(0.001, s.escala))
      matPanel.opacity = c01(s.opacidad)
      matCanto.opacity = c01(s.opacidad)
    },
  }
}

