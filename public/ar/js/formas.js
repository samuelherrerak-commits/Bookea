// Piezas de dibujo compartidas: colores de la marca, formas planas y trazos que se
// recalculan en cada cuadro sin crear memoria nueva.

import * as THREE from '../vendor/three-0.186.1/three.module.js'

export { THREE }

// Paleta de la marca (manual: blanco y negro, grises solo de apoyo).
export const COLOR = {
  carbon: '#0f0f0e',
  papel: '#ffffff',
  niebla: '#f4f4f2',
  linea: '#e3e3df',
  grafito: '#5b5b57',
}

const materiales = new Map()

/** Material plano compartido (sin luces). Para opacidad propia usa matPropio(). */
export function mat(color, extra = {}) {
  const clave = color + JSON.stringify(extra)
  let m = materiales.get(clave)
  if (!m) {
    m = new THREE.MeshBasicMaterial({ color, ...extra })
    materiales.set(clave, m)
  }
  return m
}

export function matPropio(color, extra = {}) {
  return new THREE.MeshBasicMaterial({ color, transparent: true, ...extra })
}

/** Rectángulo de esquinas redondeadas, centrado. */
export function rrect(w, h, r) {
  r = Math.min(r, w / 2, h / 2)
  const x = -w / 2
  const y = -h / 2
  const s = new THREE.Shape()
  s.moveTo(x + r, y)
  s.lineTo(x + w - r, y)
  s.absarc(x + w - r, y + r, r, -Math.PI / 2, 0)
  s.lineTo(x + w, y + h - r)
  s.absarc(x + w - r, y + h - r, r, 0, Math.PI / 2)
  s.lineTo(x + r, y + h)
  s.absarc(x + r, y + h - r, r, Math.PI / 2, Math.PI)
  s.lineTo(x, y + r)
  s.absarc(x + r, y + r, r, Math.PI, Math.PI * 1.5)
  return s
}

const geos = new Map()
/** Geometría de una forma, cacheada por clave (las formas se repiten mucho). */
export function geo(clave, crear) {
  let g = geos.get(clave)
  if (!g) {
    g = crear()
    geos.set(clave, g)
  }
  return g
}

export const geoRrect = (w, h, r, seg = 10) => geo(`rr:${w}:${h}:${r}:${seg}`, () => new THREE.ShapeGeometry(rrect(w, h, r), seg))
export const geoCirculo = (seg = 32) => geo(`c:${seg}`, () => new THREE.CircleGeometry(1, seg))
export const geoAnillo = (r0, r1, seg, t0 = 0, tl = Math.PI * 2) =>
  geo(`a:${r0}:${r1}:${seg}:${t0}:${tl}`, () => new THREE.RingGeometry(r0, r1, seg, 1, t0, tl))
/** Cápsula vertical (rectángulo con puntas redondas) de largo total `largo`. */
export const geoCapsula = (ancho, largo) => geoRrect(ancho, largo, ancho / 2, 8)

export function malla(geometria, material, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geometria, material)
  m.position.set(x, y, z)
  return m
}

export function elipse(rx, ry, material, x = 0, y = 0, z = 0) {
  const m = malla(geoCirculo(), material, x, y, z)
  m.scale.set(rx, ry, 1)
  return m
}

/**
 * Trazo grueso de puntas redondas sobre una curva cuadrática (A → B con control C):
 * los brazos y piernas "rubber hose". Se recalcula en cada cuadro sobre el mismo buffer.
 */
export class Trazo {
  constructor(color, z, segmentos = 16) {
    this.n = segmentos + 1
    this.z = z
    this.pos = new Float32Array(this.n * 6)
    const indices = []
    for (let i = 0; i < segmentos; i++) {
      const a = 2 * i
      indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2)
    }
    this.geo = new THREE.BufferGeometry()
    this.geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage))
    this.geo.setIndex(indices)
    const material = mat(color, { side: THREE.DoubleSide })
    this.grupo = new THREE.Group()
    this.cinta = new THREE.Mesh(this.geo, material)
    this.cinta.frustumCulled = false
    this.puntaA = malla(geoCirculo(20), material)
    this.puntaB = malla(geoCirculo(20), material)
    this.grupo.add(this.cinta, this.puntaA, this.puntaB)
  }

  trazar(ax, ay, cx, cy, bx, by, ancho) {
    const h = ancho / 2
    const n = this.n
    const p = this.pos
    let fx = bx - ax
    let fy = by - ay
    const fl = Math.hypot(fx, fy) || 1
    fx /= fl
    fy /= fl
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1)
      const u = 1 - t
      const x = u * u * ax + 2 * u * t * cx + t * t * bx
      const y = u * u * ay + 2 * u * t * cy + t * t * by
      let tx = 2 * u * (cx - ax) + 2 * t * (bx - cx)
      let ty = 2 * u * (cy - ay) + 2 * t * (by - cy)
      const l = Math.hypot(tx, ty)
      if (l < 1e-6) {
        tx = fx
        ty = fy
      } else {
        tx /= l
        ty /= l
      }
      const k = i * 6
      p[k] = x - ty * h
      p[k + 1] = y + tx * h
      p[k + 2] = this.z
      p[k + 3] = x + ty * h
      p[k + 4] = y - tx * h
      p[k + 5] = this.z
    }
    this.geo.attributes.position.needsUpdate = true
    this.puntaA.position.set(ax, ay, this.z)
    this.puntaA.scale.set(h, h, 1)
    this.puntaB.position.set(bx, by, this.z)
    this.puntaB.scale.set(h, h, 1)
  }
}

/**
 * Texto en una textura de canvas (se dibuja una sola vez). `dibujar(ctx, ancho, alto)` pinta
 * sobre un canvas de `ancho × alto` px; devuelve la textura lista para un plano.
 */
export function textura(ancho, alto, dibujar) {
  const lienzo = document.createElement('canvas')
  lienzo.width = ancho
  lienzo.height = alto
  const ctx = lienzo.getContext('2d')
  dibujar(ctx, ancho, alto)
  const tex = new THREE.CanvasTexture(lienzo)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 4
  return tex
}

/** Camino de rectángulo redondeado en un contexto 2D. */
export function caminoRrect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

export const fuente = (peso, px, familia = 'Barlow Condensed') => `${peso} ${px}px '${familia}', 'Arial Narrow', sans-serif`
