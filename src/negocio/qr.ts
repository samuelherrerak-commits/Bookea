/**
 * Piezas con el código QR de la página del negocio (cartel, historia, post, tarjeta o
 * solo el código), con sus colores y sus fuentes. Es el mismo dibujo que el generador
 * de la ventana de la hoja (apps-script/cliente/Sidebar.html, dibujarQr): si cambias
 * uno, cambia el otro.
 *
 * El link NO se puede cambiar: siempre es la página del negocio (/u/<slug>).
 */
import qrcode from 'qrcode-generator'
import { contrast, derivarAcento, derivarNeutros, isHex } from '../lib/color'
import { loadEstiloFonts } from '../lib/fonts'
import { PALETAS, paletaPorNombre } from '../lib/theme'
import type { ThemeEstilo } from '../types'

export interface PlantillaQr {
  id: 'mostrador' | 'historia' | 'post' | 'tarjeta' | 'solo'
  nombre: string
  uso: string
  ancho: number
  alto: number
  titulo: string
  subtitulo: string
  llamado: string
}

/** Formatos, en píxeles reales (los impresos, a 300 dpi). */
export const PLANTILLAS_QR: PlantillaQr[] = [
  { id: 'mostrador', nombre: 'Cartel de mostrador', uso: 'Caja, espejo o recepción (A6)', ancho: 1240, alto: 1748, titulo: 'Reserva tu próxima cita', subtitulo: 'Escanea con la cámara de tu celular', llamado: 'Sin llamadas · las 24 horas' },
  { id: 'historia', nombre: 'Historia de Instagram', uso: '1080 × 1920', ancho: 1080, alto: 1920, titulo: 'Reserva aquí', subtitulo: 'Escanea el código o toca el link de mi perfil', llamado: 'Agenda abierta 24/7' },
  { id: 'post', nombre: 'Post de Instagram', uso: '1080 × 1350', ancho: 1080, alto: 1350, titulo: 'Ya puedes reservar online', subtitulo: 'Escanea el código y elige tu hora', llamado: 'Rápido y sin mensajes' },
  { id: 'tarjeta', nombre: 'Tarjeta de presentación', uso: '8,9 × 5 cm para imprimir', ancho: 1050, alto: 600, titulo: 'Reserva tu cita', subtitulo: 'Escanea el código', llamado: '' },
  { id: 'solo', nombre: 'Solo el código', uso: 'Para tus diseños', ancho: 1024, alto: 1024, titulo: '', subtitulo: '', llamado: '' },
]

export const MODOS_QR = [['marca', 'Mis colores'], ['invertido', 'Invertido'], ['bn', 'Blanco y negro']] as const
export type ModoQr = (typeof MODOS_QR)[number][0]

/** Forma de cada estilo (igual que la lista ESTILOS de la ventana de la hoja). */
const FORMA: Record<ThemeEstilo, { display: string; sans: string; peso: number; mayus: boolean; radio: number }> = {
  elegante: { display: 'Instrument Serif', sans: 'Inter Variable', peso: 400, mayus: false, radio: 16 },
  moderno: { display: 'Plus Jakarta Sans', sans: 'Inter Variable', peso: 700, mayus: false, radio: 14 },
  editorial: { display: 'Newsreader', sans: 'Source Sans 3', peso: 500, mayus: false, radio: 8 },
  amable: { display: 'Nunito', sans: 'Nunito', peso: 800, mayus: false, radio: 24 },
  audaz: { display: 'Barlow Condensed', sans: 'Barlow', peso: 800, mayus: true, radio: 8 },
  clasico: { display: 'Playfair Display', sans: 'Lato', peso: 600, mayus: false, radio: 6 },
  minimal: { display: 'DM Sans', sans: 'DM Sans', peso: 500, mayus: false, radio: 8 },
  retro: { display: 'Fraunces', sans: 'Figtree', peso: 600, mayus: false, radio: 24 },
}

const textoSobre = (fondo: string) => (contrast(fondo, '#1A1816') >= contrast(fondo, '#FFFFFF') ? '#1A1816' : '#FFFFFF')
const hex = (v: string) => (v.startsWith('#') ? v : `#${v}`).toUpperCase()

/** Colores de la pieza. El código va siempre en una tarjeta blanca con módulos oscuros. */
export function coloresQr(config: Record<string, string>, modo: ModoQr) {
  const fondo = isHex(config.color_fondo || '') ? hex(config.color_fondo) : ''
  const p = paletaPorNombre(config.paleta || '') ?? PALETAS[0]
  const acento = isHex(config.color_principal || '') ? derivarAcento(hex(config.color_principal), fondo || undefined) : { base: p.base, soft: p.soft, deep: p.deep }
  const n = fondo ? derivarNeutros(fondo) : { bg: '#FDFBF7', line: '#EDE6DC', ink: '#2D2A26', muted: '#8A837A' }
  const modulos = [acento.deep, n.ink, '#111111'].find((x) => contrast(x, '#FFFFFF') >= 4.5) ?? '#111111'
  if (modo === 'bn') return { fondo: '#FFFFFF', texto: '#111111', suave: '#5B5B57', acento: '#111111', sobreAcento: '#FFFFFF', tarjeta: '#FFFFFF', modulos: '#111111' }
  if (modo === 'invertido') {
    const t = textoSobre(acento.deep)
    return { fondo: acento.deep, texto: t, suave: t, acento: t, sobreAcento: acento.deep, tarjeta: '#FFFFFF', modulos }
  }
  return { fondo: n.bg, texto: n.ink, suave: n.muted, acento: acento.base, sobreAcento: textoSobre(acento.base), tarjeta: '#FFFFFF', modulos }
}

/** El link de la página del negocio: lo único que puede llevar el QR. */
export function linkDelNegocio(slug: string, origen = location.origin): string {
  return `${origen}/u/${slug}`
}

export interface OpcionesQr {
  plantilla: PlantillaQr['id']
  modo: ModoQr
  titulo: string
  subtitulo: string
  llamado: string
  mostrarNombre: boolean
  mostrarLink: boolean
}

function renglones(ctx: CanvasRenderingContext2D, texto: string, max: number) {
  const out: string[] = []
  let actual = ''
  for (const p of texto.split(/\s+/).filter(Boolean)) {
    const prueba = actual ? `${actual} ${p}` : p
    if (ctx.measureText(prueba).width <= max || !actual) actual = prueba
    else {
      out.push(actual)
      actual = p
    }
  }
  if (actual) out.push(actual)
  return out
}

function fuenteQueCabe(ctx: CanvasRenderingContext2D, texto: string, fuente: (px: number) => string, px: number, max: number) {
  let t = px
  do {
    ctx.font = fuente(t)
    t -= 1
  } while (ctx.measureText(texto).width > max && t > 10)
}

function rectRedondo(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  r = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

/** Módulos en celdas enteras (sin bordes borrosos) con 4 de margen. */
function pintarModulos(ctx: CanvasRenderingContext2D, qr: ReturnType<typeof qrcode>, x: number, y: number, lado: number, color: string) {
  const n = qr.getModuleCount()
  const cel = Math.floor(lado / (n + 8))
  const real = cel * (n + 8)
  const ox = Math.round(x + (lado - real) / 2) + cel * 4
  const oy = Math.round(y + (lado - real) / 2) + cel * 4
  ctx.fillStyle = color
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (qr.isDark(r, c)) ctx.fillRect(ox + c * cel, oy + r * cel, cel, cel)
}

export function matrizQr(url: string) {
  const qr = qrcode(0, 'M')
  qr.addData(url, 'Byte')
  qr.make()
  return qr
}

/** Dibuja la pieza completa en el canvas. */
export async function dibujarQr(canvas: HTMLCanvasElement, config: Record<string, string>, link: string, q: OpcionesQr): Promise<void> {
  const p = PLANTILLAS_QR.find((x) => x.id === q.plantilla) ?? PLANTILLAS_QR[0]
  const estilo = (config.tema_estilo in FORMA ? config.tema_estilo : 'elegante') as ThemeEstilo
  const e = FORMA[estilo]
  const col = coloresQr(config, q.modo)
  const W = p.ancho
  const H = p.alto
  const fDisplay = (px: number) => `${e.peso} ${Math.round(px)}px '${e.display}', serif`
  const fSans = (px: number, peso = 400) => `${peso} ${Math.round(px)}px '${e.sans}', sans-serif`
  await loadEstiloFonts(estilo).catch(() => {})
  await Promise.all([fDisplay(40), fSans(40), fSans(40, 600)].map((f) => document.fonts.load(f).catch(() => {})))

  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')!
  const qr = matrizQr(link)
  const nombre = config.marca || config.nombre_negocio || ''
  const mayus = (s: string) => (e.mayus ? s.toUpperCase() : s)
  const linkVisible = link.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/$/, '')
  const radio = Math.max(8, e.radio) * (W / 400)

  if (p.id === 'solo') {
    ctx.fillStyle = '#FFFFFF'
    ctx.fillRect(0, 0, W, H)
    pintarModulos(ctx, qr, 0, 0, W, col.modulos)
    return
  }

  ctx.fillStyle = col.fondo
  ctx.fillRect(0, 0, W, H)
  ctx.textBaseline = 'alphabetic'
  type Bloque = { f: string; c: string; s: string; gap: number; lh?: number; lineas?: string[]; alto?: number }

  if (p.id === 'tarjeta') {
    const ladoT = Math.round(H * 0.78)
    const xq = Math.round(H * 0.11)
    const yq = Math.round((H - ladoT) / 2)
    ctx.fillStyle = col.tarjeta
    rectRedondo(ctx, xq, yq, ladoT, ladoT, radio * 0.6)
    ctx.fill()
    pintarModulos(ctx, qr, xq, yq, ladoT, col.modulos)
    const x = xq + ladoT + Math.round(H * 0.1)
    const ancho = W - x - Math.round(H * 0.1)
    const bloques: Bloque[] = []
    if (q.mostrarNombre && nombre) bloques.push({ f: fDisplay(H * 0.11), c: col.texto, s: mayus(nombre), gap: H * 0.05 })
    if (q.titulo) bloques.push({ f: fSans(H * 0.07, 600), c: col.texto, s: q.titulo, gap: H * 0.02 })
    if (q.subtitulo) bloques.push({ f: fSans(H * 0.055), c: col.suave, s: q.subtitulo, gap: H * 0.05 })
    if (q.mostrarLink) {
      fuenteQueCabe(ctx, linkVisible, (px) => fSans(px, 600), H * 0.045, ancho)
      bloques.push({ f: ctx.font, c: col.texto, s: linkVisible, gap: 0 })
    }
    let total = 0
    for (const b of bloques) {
      ctx.font = b.f
      b.lineas = renglones(ctx, b.s, ancho)
      b.alto = parseInt(b.f.split(' ')[1], 10) * 1.15
      total += b.lineas.length * b.alto + b.gap
    }
    let y = (H - total) / 2
    ctx.textAlign = 'left'
    for (const b of bloques) {
      ctx.font = b.f
      ctx.fillStyle = b.c
      for (const l of b.lineas!) {
        y += b.alto!
        ctx.fillText(l, x, y - b.alto! * 0.2)
      }
      y += b.gap
    }
    return
  }

  // Vertical: nombre, título, texto, tarjeta con el QR, frase destacada, link y la marca.
  const margen = W * 0.08
  const ancho = W - margen * 2
  const escala = (W / 1080) * (p.id === 'historia' ? 1.22 : 1)
  const arriba: Bloque[] = []
  if (q.mostrarNombre && nombre) arriba.push({ f: fDisplay(46 * escala), c: col.texto, s: mayus(nombre), gap: 40 * escala })
  if (q.titulo) arriba.push({ f: fDisplay((p.id === 'historia' ? 118 : 96) * escala), c: col.texto, s: mayus(q.titulo), gap: 22 * escala, lh: 1.02 })
  if (q.subtitulo) arriba.push({ f: fSans(38 * escala), c: col.suave, s: q.subtitulo, gap: 0 })
  let alto = 0
  for (const b of arriba) {
    ctx.font = b.f
    b.lineas = renglones(ctx, b.s, ancho)
    b.alto = parseInt(b.f.split(' ')[1], 10) * (b.lh ?? 1.2)
    alto += b.lineas.length * b.alto + b.gap
  }
  const altoAbajo = (q.llamado ? 96 * escala : 0) + (q.mostrarLink ? 64 * escala : 0)
  const espacio = 60 * escala
  const libre = H - margen * 2 - 60 * escala
  const lado = Math.max(W * 0.4, Math.min(ancho * (p.id === 'historia' ? 0.86 : 0.78), libre - alto - altoAbajo - espacio * 2))
  const total = alto + espacio + lado + espacio + altoAbajo
  let y = margen + Math.max(0, (libre - total) / 2)
  ctx.textAlign = 'center'
  for (const b of arriba) {
    ctx.font = b.f
    ctx.fillStyle = b.c
    for (const l of b.lineas!) {
      y += b.alto!
      ctx.fillText(l, W / 2, y - b.alto! * 0.18)
    }
    y += b.gap
  }
  y += espacio
  const xq = (W - lado) / 2
  ctx.save()
  ctx.shadowColor = 'rgba(0,0,0,0.12)'
  ctx.shadowBlur = 40 * escala
  ctx.shadowOffsetY = 12 * escala
  ctx.fillStyle = col.tarjeta
  rectRedondo(ctx, xq, y, lado, lado, radio)
  ctx.fill()
  ctx.restore()
  pintarModulos(ctx, qr, xq, y, lado, col.modulos)
  y += lado + espacio
  if (q.llamado) {
    fuenteQueCabe(ctx, q.llamado, (px) => fSans(px, 600), 36 * escala, ancho - 80 * escala)
    const ap = Math.min(ancho, ctx.measureText(q.llamado).width + 80 * escala)
    const hp = 76 * escala
    ctx.fillStyle = col.acento
    rectRedondo(ctx, (W - ap) / 2, y, ap, hp, hp / 2)
    ctx.fill()
    ctx.fillStyle = col.sobreAcento
    ctx.textBaseline = 'middle'
    ctx.fillText(q.llamado, W / 2, y + hp / 2 + 2 * escala)
    ctx.textBaseline = 'alphabetic'
    y += 96 * escala
  }
  if (q.mostrarLink) {
    fuenteQueCabe(ctx, linkVisible, (px) => fSans(px, 600), 32 * escala, ancho)
    ctx.fillStyle = col.texto
    ctx.fillText(linkVisible, W / 2, y + 44 * escala)
  }
  ctx.font = fSans(24 * escala)
  ctx.fillStyle = col.suave
  ctx.globalAlpha = 0.8
  ctx.fillText('Reservas online con bookeaa', W / 2, H - margen * 0.6)
  ctx.globalAlpha = 1
}
