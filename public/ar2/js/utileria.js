// Lo que acompaña a los personajes en /ar2: la tarjeta con el hueco rasgado (solapas de papel
// con la imagen del frente, grietas y pozo con profundidad), los trozos de tarjeta, las citas
// digitales, los globos de diálogo, el destello y las sombras. Coordenadas en mm sobre la tarjeta.

import { THREE, COLOR, mat, matPropio, malla, elipse, rrect, geoRrect, textura, caminoRrect, fuente } from './formas.js'
import { CITAS, GLOBOS } from './textos.js'
import { ROJO } from './personajes.js'

const c01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x)

/** Borde del hueco: un óvalo dentado, siempre el mismo (sale de la posición de cada punta). */
export function bordeHueco(h, n = 14) {
  const puntos = []
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + 0.2
    const r = 1 + 0.1 * Math.sin(i * 2.7) - (i % 2 ? 0.17 : 0)
    puntos.push(new THREE.Vector2(h.x + Math.cos(a) * h.ru * r, h.y + Math.sin(a) * h.rv * r))
  }
  return puntos
}

export function crearUtileria({ d, tarjeta, modo, texturaFrente }) {
  const grupo = new THREE.Group()
  const hueco = crearHueco({ d, tarjeta, modo, texturaFrente })
  grupo.add(hueco.grupo)
  const trozos = crearTrozos(d)
  grupo.add(trozos.malla)

  const citas = CITAS.map((c, i) => {
    const g = new THREE.Group()
    const plano = malla(new THREE.PlaneGeometry(17, 9.6), new THREE.MeshBasicMaterial({ map: texturaCita(c, i), transparent: true, depthWrite: false }))
    plano.rotation.x = Math.PI / 2
    g.add(plano)
    grupo.add(g)
    return { g, plano }
  })

  const globos = Object.fromEntries(
    Object.entries(GLOBOS).map(([id, texto]) => {
      const rojo = id === 'grrr'
      const { tex, ancho, alto } = texturaGlobo(texto, rojo)
      const g = new THREE.Group()
      const plano = malla(new THREE.PlaneGeometry(ancho, alto), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }))
      plano.rotation.x = Math.PI / 2
      plano.renderOrder = 3
      g.add(plano)
      grupo.add(g)
      return [id, { g, plano }]
    }),
  )

  const destello = new THREE.Group()
  const planoDestello = malla(new THREE.PlaneGeometry(26, 26), new THREE.MeshBasicMaterial({ map: texturaDestello(), transparent: true, depthWrite: false, opacity: 1 }))
  planoDestello.rotation.x = Math.PI / 2
  planoDestello.renderOrder = 4
  destello.add(planoDestello)
  grupo.add(destello)

  const sombra = () => {
    const m = elipse(1, 1, matPropio(COLOR.carbon, { opacity: 0.3, depthWrite: false }))
    m.renderOrder = 1
    grupo.add(m)
    return m
  }
  const sombras = { b: sombra(), v: sombra() }

  /** `orientar(objeto)` lo gira hacia la cámara (lo pone la escena). */
  function aplicar(e, t, orientar) {
    hueco.aplicar(e.hueco, t)
    trozos.aplicar(e.trozos)
    for (let i = 0; i < citas.length; i++) {
      const c = e.citas[i]
      const o = citas[i]
      o.g.visible = c.visible > 0
      if (!o.g.visible) continue
      o.g.position.set(c.x, c.y, c.z)
      o.g.scale.setScalar(c.escala)
      orientar(o.g)
      o.plano.rotation.y = c.rot
      o.plano.material.opacity = c.opacidad
    }
    // globos sobre la cabeza de quien habla, corridos hacia un costado
    const encima = (g, quien, escala, x, alto) => {
      g.g.visible = escala > 0.01
      if (!g.g.visible) return
      g.g.position.set(quien.x, quien.y, quien.z + alto)
      orientar(g.g)
      g.plano.position.x = x
      g.g.scale.setScalar(escala)
    }
    const LU = d.LU
    encima(globos.oye, e.b, e.globos.oye, 3, 36)
    encima(globos.grrr, e.v, e.globos.grrr, 0, 46 * e.v.escala + 2)
    encima(globos.agendado, e.b, e.globos.agendado, 5, 38)
    encima(globos.nooo, d.hueco, e.globos.nooo, 0, 0)
    if (globos.nooo.g.visible) globos.nooo.g.position.z = 26
    destello.visible = e.destello > 0.01
    if (destello.visible) {
      destello.position.set(e.b.x, e.b.y, e.b.z + 38 * LU)
      orientar(destello)
      planoDestello.position.x = 22 * LU
      planoDestello.scale.setScalar(0.4 + 0.9 * e.destello)
      planoDestello.material.opacity = Math.min(1, e.destello * 1.6)
    }
    // sombras planas: más chicas y claras mientras más alto está el personaje
    const sombrear = (m, p, ancho) => {
      m.visible = p.visible > 0 && p.z > -1
      if (!m.visible) return
      const alto = Math.max(0, p.z)
      const k = 1 - Math.min(alto, 30) / 45
      m.position.set(p.x, p.y, 0.1)
      m.scale.set(ancho * p.escala * k, ancho * 0.35 * p.escala * k, 1)
      m.material.opacity = 0.3 * k
    }
    sombrear(sombras.b, e.b, 10)
    sombrear(sombras.v, e.v, 15)
  }

  return { grupo, aplicar }
}

// ── La tarjeta y el hueco ─────────────────────────────────────────────────────────────────
//
// La cara de la tarjeta tiene el hueco recortado. En AR no se pinta: solo escribe profundidad,
// así todo lo que queda bajo la tarjeta se oculta salvo por el hueco. Las solapas tapan el hueco
// con la imagen del frente (en AR solo se ven mientras se rasga); al abrirse giran sobre el borde
// y quedan paradas como papel roto.

function crearHueco({ d, tarjeta, modo, texturaFrente }) {
  const grupo = new THREE.Group()
  const { ancho, alto } = tarjeta
  const H = d.hueco
  const borde = bordeHueco(H)
  const uv = (x, y) => [(x + ancho / 2) / ancho, (y + alto / 2) / alto]

  // la mesa: un plano invisible grande, a la altura de la tarjeta y con el agujero, que solo
  // escribe profundidad. Así el pozo se ve únicamente por el hueco, también cuando la cámara lo
  // mira más allá del borde de la tarjeta (la tarjeta tiene que estar sobre una superficie plana).
  const mesa = new THREE.Shape([new THREE.Vector2(-500, -500), new THREE.Vector2(500, -500), new THREE.Vector2(500, 500), new THREE.Vector2(-500, 500)])
  mesa.holes.push(new THREE.Path([...borde].reverse()))
  const mascara = new THREE.Mesh(new THREE.ShapeGeometry(mesa, 12), new THREE.MeshBasicMaterial({ colorWrite: false }))
  mascara.renderOrder = -2
  mascara.position.z = -0.02
  grupo.add(mascara)
  if (modo !== 'ar') {
    // Plan B: la cara impresa de la tarjeta, con el mismo agujero
    const forma = rrect(ancho, alto, 0.5)
    forma.holes.push(new THREE.Path([...borde].reverse()))
    const geoCara = new THREE.ShapeGeometry(forma, 12)
    const pos = geoCara.attributes.position
    for (let i = 0; i < pos.count; i++) geoCara.attributes.uv.setXY(i, ...uv(pos.getX(i), pos.getY(i)))
    const cara = new THREE.Mesh(geoCara, new THREE.MeshBasicMaterial({ map: texturaFrente }))
    cara.renderOrder = -1
    grupo.add(cara)
    // canto y sombra (encima de la mesa invisible, para que no los tape)
    const conHueco = (w, h, r, dx, dy) => {
      const f = rrect(w, h, r)
      f.holes.push(new THREE.Path(borde.map((p) => new THREE.Vector2(p.x - dx, p.y - dy)).reverse()))
      return new THREE.ShapeGeometry(f, 8)
    }
    grupo.add(malla(conHueco(ancho + 0.6, alto + 0.6, 0.8, 0.25, -0.35), mat('#c9c6bf'), 0.25, -0.35, -0.01))
    const sombra = malla(conHueco(ancho, alto, 2, 2.5, -3.5), matPropio(COLOR.carbon, { opacity: 0.12, depthWrite: false }), 2.5, -3.5, -0.015)
    sombra.renderOrder = -3
    grupo.add(sombra)
  }

  // el pozo: paredes con sombreado falso y fondo negro
  const interior = new THREE.Group()
  const vert = []
  const colores = []
  const arriba = new THREE.Color()
  const abajo = new THREE.Color('#030303')
  for (let i = 0; i < borde.length; i++) {
    const a = borde[i]
    const b = borde[(i + 1) % borde.length]
    const nx = -(b.y - a.y)
    const ny = b.x - a.x
    const luz = 0.5 + 0.5 * ((nx * 0.3 + ny * 0.95) / (Math.hypot(nx, ny) || 1))
    arriba.set('#1a1a18').lerp(new THREE.Color('#6a6a64'), luz)
    vert.push(a.x, a.y, 0, b.x, b.y, 0, b.x, b.y, -H.prof, a.x, a.y, 0, b.x, b.y, -H.prof, a.x, a.y, -H.prof)
    for (const c of [arriba, arriba, abajo, arriba, abajo, abajo]) colores.push(c.r, c.g, c.b)
  }
  const geoPared = new THREE.BufferGeometry()
  geoPared.setAttribute('position', new THREE.Float32BufferAttribute(vert, 3))
  geoPared.setAttribute('color', new THREE.Float32BufferAttribute(colores, 3))
  interior.add(new THREE.Mesh(geoPared, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide })))
  const fondo = new THREE.Mesh(new THREE.ShapeGeometry(new THREE.Shape(borde)), mat('#000000'))
  fondo.position.z = -H.prof
  interior.add(fondo)
  grupo.add(interior)

  // solapas: un trapecio por tramo del borde (del borde hasta la mitad del radio), con su pedazo
  // de imagen. El centro es una tapa aparte: al romperse cae al pozo y al cerrar vuelve a subir.
  const centro = new THREE.Vector2(H.x + 1.2, H.y - 0.6)
  const interno = borde.map((p) => new THREE.Vector2().lerpVectors(p, centro, 0.5))
  const matFrente = new THREE.MeshBasicMaterial({ map: texturaFrente, color: modo === 'ar' ? 0xf1f1ee : 0xffffff, transparent: true })
  const matDorso = new THREE.MeshBasicMaterial({ color: '#d6d4cf', side: THREE.BackSide, transparent: true })
  const eje = new THREE.Vector3()
  const solapas = borde.map((a, i) => {
    const j = (i + 1) % borde.length
    const b = borde[j]
    const pa = interno[i]
    const pb = interno[j]
    const geoS = new THREE.BufferGeometry()
    geoS.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, b.x - a.x, b.y - a.y, 0, pb.x - a.x, pb.y - a.y, 0, pa.x - a.x, pa.y - a.y, 0], 3))
    geoS.setAttribute('uv', new THREE.Float32BufferAttribute([...uv(a.x, a.y), ...uv(b.x, b.y), ...uv(pb.x, pb.y), ...uv(pa.x, pa.y)], 2))
    geoS.setIndex([0, 1, 2, 0, 2, 3])
    const giro = new THREE.Group()
    giro.position.set(a.x, a.y, 0.04)
    giro.add(new THREE.Mesh(geoS, matFrente), new THREE.Mesh(geoS, matDorso))
    // grieta a lo largo del corte, del centro a la punta (se dibuja encima)
    const largo = Math.hypot(a.x - centro.x, a.y - centro.y)
    const grieta = malla(geoRrect(0.5, 1, 0.2), matGrieta(), 0, 0, 0.05)
    grupo.add(giro, grieta)
    // eje de giro: el borde; el signo hace que el lado de adentro suba
    const ex = b.x - a.x
    const ey = b.y - a.y
    const wx = centro.x - a.x
    const wy = centro.y - a.y
    const signo = Math.sign(ex * wy - ey * wx) || 1
    const variacion = 0.88 + 0.22 * ((i * 7) % 5) / 4
    return { giro, grieta, eje: new THREE.Vector3(ex, ey, 0).normalize(), signo, variacion, largo, dir: Math.atan2(a.y - centro.y, a.x - centro.x) }
  })
  const geoTapa = new THREE.ShapeGeometry(new THREE.Shape(interno.map((p) => p.clone().sub(centro))))
  const pt = geoTapa.attributes.position
  for (let i = 0; i < pt.count; i++) geoTapa.attributes.uv.setXY(i, ...uv(pt.getX(i) + centro.x, pt.getY(i) + centro.y))
  const tapa = new THREE.Group()
  tapa.add(new THREE.Mesh(geoTapa, matFrente), new THREE.Mesh(geoTapa, matDorso))
  tapa.position.set(centro.x, centro.y, 0.04)
  grupo.add(tapa)

  function aplicar(h, t) {
    interior.visible = h.interior > 0
    const verSolapas = modo !== 'ar' || h.solapas > 0.001
    matFrente.opacity = modo === 'ar' ? h.solapas : 1
    matDorso.opacity = matFrente.opacity
    tapa.visible = verSolapas && h.tapa < 0.99
    tapa.position.z = 0.04 - H.prof * 0.8 * h.tapa + h.temblor * 0.4 * Math.sin(t * 55)
    tapa.rotation.set(0.5 * h.tapa, 0.3 * h.tapa, 0)
    for (let i = 0; i < solapas.length; i++) {
      const s = solapas[i]
      s.giro.visible = verSolapas
      // tiembla con los golpes de abajo
      const salto = h.temblor * 0.5 * (0.6 + 0.4 * Math.sin(t * 60 + i * 1.7))
      const angulo = s.signo * (h.apertura * 2.3 * s.variacion + salto * 0.08)
      s.giro.quaternion.setFromAxisAngle(eje.copy(s.eje), angulo)
      s.giro.position.z = 0.04 + salto
      // grietas: crecen desde el centro antes de abrirse y quedan como cicatriz al cerrar
      const g = Math.max(h.grieta * (h.apertura < 0.05 ? 1 : 0), h.cicatriz)
      s.grieta.visible = g > 0.01 && h.apertura < 0.05
      if (s.grieta.visible) {
        const l = s.largo * g
        s.grieta.position.set(centro.x + Math.cos(s.dir) * l / 2, centro.y + Math.sin(s.dir) * l / 2, 0.1 + salto)
        s.grieta.rotation.z = s.dir - Math.PI / 2
        s.grieta.scale.set(1, l, 1)
        s.grieta.material.opacity = Math.min(1, g * 3) * (h.cicatriz > 0 ? h.cicatriz : 1)
      }
    }
  }

  return { grupo, aplicar }
}

let _matGrieta = null
const matGrieta = () => (_matGrieta ??= matPropio(COLOR.carbon, { opacity: 1, depthWrite: false }))

// ── Trozos de tarjeta que saltan al romperse ──────────────────────────────────────────────
function crearTrozos(d) {
  const N = 40
  const geoT = new THREE.PlaneGeometry(2.2, 1.6)
  const inst = new THREE.InstancedMesh(geoT, new THREE.MeshBasicMaterial({ color: '#f4f3ef', side: THREE.DoubleSide }), N)
  inst.frustumCulled = false
  const borde = bordeHueco(d.hueco, N)
  const datos = borde.map((p, i) => {
    const r = (k) => {
      const x = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453
      return x - Math.floor(x)
    }
    const dx = p.x - d.hueco.x
    const dy = p.y - d.hueco.y
    const l = Math.hypot(dx, dy) || 1
    const v = 25 + 45 * r(1)
    return { x: p.x, y: p.y, vx: (dx / l) * v, vy: (dy / l) * v, vz: 55 + 50 * r(2), giro: 8 + 14 * r(3), eje: new THREE.Vector3(r(4) - 0.5, r(5) - 0.5, r(6) - 0.5).normalize() }
  })
  const m = new THREE.Matrix4()
  const q = new THREE.Quaternion()
  const p = new THREE.Vector3()
  const s = new THREE.Vector3()
  const G = 260 // mm/s² (caen despacio, como papel)
  return {
    malla: inst,
    aplicar(tiempo) {
      inst.visible = tiempo >= 0
      if (!inst.visible) return
      const desvanece = 1 - c01((tiempo - 1.6) / 0.6)
      for (let i = 0; i < N; i++) {
        const t = datos[i]
        // cae hasta la mesa y se queda ahí
        const tPiso = (2 * t.vz) / G
        const tt = Math.min(tiempo, tPiso)
        const freno = 1 / (1 + tt * 1.8)
        p.set(t.x + t.vx * tt * freno, t.y + t.vy * tt * freno, Math.max(0.15, t.vz * tt - (G * tt * tt) / 2))
        q.setFromAxisAngle(t.eje, t.giro * tt)
        s.setScalar(desvanece)
        m.compose(p, q, s)
        inst.setMatrixAt(i, m)
      }
      inst.instanceMatrix.needsUpdate = true
    },
  }
}

// ── Texturas dibujadas en canvas (una sola vez) ───────────────────────────────────────────
function texturaCita([titulo, hora], i) {
  return textura(340, 192, (ctx, w, h) => {
    caminoRrect(ctx, 6, 6, w - 12, h - 12, 26)
    ctx.fillStyle = COLOR.papel
    ctx.fill()
    ctx.lineWidth = 6
    ctx.strokeStyle = COLOR.carbon
    ctx.stroke()
    // check en círculo
    ctx.fillStyle = COLOR.carbon
    ctx.beginPath()
    ctx.arc(62, h / 2, 34, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = COLOR.papel
    ctx.lineWidth = 9
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.beginPath()
    ctx.moveTo(46, h / 2 + 2)
    ctx.lineTo(57, h / 2 + 13)
    ctx.lineTo(78, h / 2 - 10)
    ctx.stroke()
    ctx.fillStyle = COLOR.carbon
    ctx.font = fuente(800, 40)
    ctx.textBaseline = 'middle'
    ctx.fillText(titulo.toUpperCase(), 112, h / 2 - 22, w - 130)
    ctx.fillStyle = COLOR.grafito
    ctx.font = fuente(600, 30, 'Barlow')
    ctx.fillText(hora, 112, h / 2 + 24, w - 130)
    if (i % 3 === 0) {
      ctx.fillStyle = COLOR.carbon
      ctx.font = fuente(800, 20)
      ctx.fillText('NUEVA', w - 92, 34)
    }
  })
}

function texturaGlobo(texto, rojo) {
  const px = 10 // px del canvas por mm
  const letra = 54
  const medida = document.createElement('canvas').getContext('2d')
  medida.font = fuente(800, letra)
  const anchoTexto = medida.measureText(texto.toUpperCase()).width
  const w = Math.ceil(anchoTexto + 70)
  const h = 120
  const tex = textura(w, h + 26, (ctx) => {
    ctx.fillStyle = rojo ? ROJO : COLOR.papel
    ctx.strokeStyle = COLOR.carbon
    ctx.lineWidth = 7
    caminoRrect(ctx, 6, 6, w - 12, h - 12, (h - 12) / 2)
    ctx.fill()
    ctx.stroke()
    // colita hacia abajo
    ctx.beginPath()
    ctx.moveTo(w * 0.42, h - 9)
    ctx.lineTo(w * 0.5, h + 20)
    ctx.lineTo(w * 0.58, h - 9)
    ctx.fill()
    ctx.stroke()
    ctx.fillRect(w * 0.42 + 4, h - 16, w * 0.16 - 8, 10)
    ctx.fillStyle = rojo ? COLOR.papel : COLOR.carbon
    ctx.font = fuente(800, letra)
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(texto.toUpperCase(), w / 2, h / 2 + 3)
  })
  return { tex, ancho: w / px, alto: (h + 26) / px }
}

function texturaDestello() {
  return textura(256, 256, (ctx, w, h) => {
    const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2)
    g.addColorStop(0, 'rgba(255,255,255,1)')
    g.addColorStop(0.25, 'rgba(255,255,255,0.9)')
    g.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, w, h)
    ctx.strokeStyle = 'rgba(255,255,255,0.95)'
    ctx.lineCap = 'round'
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2
      ctx.lineWidth = i % 2 ? 6 : 11
      ctx.beginPath()
      ctx.moveTo(w / 2 + Math.cos(a) * 46, h / 2 + Math.sin(a) * 46)
      ctx.lineTo(w / 2 + Math.cos(a) * (i % 2 ? 100 : 124), h / 2 + Math.sin(a) * (i % 2 ? 100 : 124))
      ctx.stroke()
    }
  })
}
