/**
 * El ticket de reserva como imagen PNG, dibujado en un <canvas> con las mismas filas
 * que el ticket en pantalla (filasTicket). Papel térmico con bordes dentados, como
 * los cupones de Copa Prosein.
 */
import { barras, filasTicket, type DatosTicket, type FilaTicket } from './ticket'

const ESCALA = 3 // nitidez de la imagen (3× el tamaño en pantalla)
const ANCHO = 300
const RELLENO = 20
const MARGEN = 28
const DIENTE = 12
export const COLORES_PAPEL = {
  fondo: '#EFEDE8',
  papel: '#FFFDF6',
  tinta: '#2A2926',
  tinta2: '#6B6860',
  linea: '#C9C4B8',
}
const MONO = '"Chivo Mono", ui-monospace, Menlo, Consolas, monospace'
const FUENTE = {
  marca: `700 19px ${MONO}`,
  sub: `400 11px ${MONO}`,
  leyenda: `400 8.5px ${MONO}`,
  fila: `400 12px ${MONO}`,
  filaFuerte: `700 13px ${MONO}`,
  texto: `400 10.5px ${MONO}`,
  gracias: `700 12px ${MONO}`,
}
const ALTO_FIJO = { corte: 17, fila: 17.4, sello: 76, barras: 48, gracias: 26, sub: 18 }

async function cargarFuentes() {
  if (!document.fonts?.load) return
  try {
    await Promise.all([document.fonts.load(`400 12px "Chivo Mono"`), document.fonts.load(`700 12px "Chivo Mono"`)])
  } catch {
    /* se dibuja con la fuente de respaldo */
  }
}

function recortar(ctx: CanvasRenderingContext2D, texto: string, max: number) {
  if (ctx.measureText(texto).width <= max) return texto
  let t = texto
  while (t.length > 1 && ctx.measureText(t + '…').width > max) t = t.slice(0, -1)
  return t + '…'
}

/** Parte un texto en renglones que caben en `max`. */
function renglones(ctx: CanvasRenderingContext2D, texto: string, max: number): string[] {
  const out: string[] = []
  let linea = ''
  for (const palabra of texto.split(/\s+/)) {
    const prueba = linea ? `${linea} ${palabra}` : palabra
    if (linea && ctx.measureText(prueba).width > max) {
      out.push(linea)
      linea = palabra
    } else linea = prueba
  }
  if (linea) out.push(linea)
  return out
}

function espaciado(ctx: CanvasRenderingContext2D, texto: string, xc: number, y: number, espacio: number) {
  const anchos = [...texto].map((c) => ctx.measureText(c).width)
  const total = anchos.reduce((a, b) => a + b, 0) + espacio * (anchos.length - 1)
  let pos = xc - total / 2
  ctx.textAlign = 'left'
  ;[...texto].forEach((c, i) => {
    ctx.fillText(c, pos, y)
    pos += anchos[i] + espacio
  })
}

function caminoPapel(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, alto: number) {
  const dientes = Math.round(w / DIENTE)
  const paso = w / dientes
  const medio = DIENTE / 2
  ctx.beginPath()
  ctx.moveTo(x, y + medio)
  for (let i = 0; i < dientes; i++) {
    ctx.lineTo(x + i * paso + paso / 2, y)
    ctx.lineTo(x + (i + 1) * paso, y + medio)
  }
  ctx.lineTo(x + w, y + alto - medio)
  for (let i = dientes; i > 0; i--) {
    ctx.lineTo(x + i * paso - paso / 2, y + alto)
    ctx.lineTo(x + (i - 1) * paso, y + alto - medio)
  }
  ctx.closePath()
}

function rectRedondeado(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, alto: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + alto, r)
  ctx.arcTo(x + w, y + alto, x, y + alto, r)
  ctx.arcTo(x, y + alto, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

type Medida = { fila: FilaTicket; alto: number; lineas?: string[] }

/** Dibuja el ticket y devuelve un PNG. */
export async function imagenTicket(d: DatosTicket): Promise<Blob> {
  await cargarFuentes()
  const util = ANCHO - RELLENO * 2
  const medidor = document.createElement('canvas').getContext('2d')!
  const medidas: Medida[] = filasTicket(d).map((fila) => {
    if (fila.t === 'leyenda' || fila.t === 'texto' || fila.t === 'marca') {
      medidor.font = FUENTE[fila.t]
      const lineas = renglones(medidor, fila.texto, util)
      const interlinea = fila.t === 'marca' ? 22 : fila.t === 'leyenda' ? 11 : 14
      return { fila, lineas, alto: lineas.length * interlinea + (fila.t === 'marca' ? 6 : 4) }
    }
    return { fila, alto: ALTO_FIJO[fila.t] }
  })
  const altoPapel = RELLENO + medidas.reduce((t, m) => t + m.alto, 0) + RELLENO + DIENTE / 2

  const lienzo = document.createElement('canvas')
  lienzo.width = (ANCHO + MARGEN * 2) * ESCALA
  lienzo.height = (altoPapel + MARGEN * 2) * ESCALA
  const ctx = lienzo.getContext('2d')!
  ctx.scale(ESCALA, ESCALA)
  ctx.fillStyle = COLORES_PAPEL.fondo
  ctx.fillRect(0, 0, ANCHO + MARGEN * 2, altoPapel + MARGEN * 2)

  ctx.save()
  ctx.shadowColor = 'rgba(20, 22, 24, 0.16)'
  ctx.shadowBlur = 18
  ctx.shadowOffsetY = 6
  caminoPapel(ctx, MARGEN, MARGEN, ANCHO, altoPapel)
  ctx.fillStyle = COLORES_PAPEL.papel
  ctx.fill()
  ctx.restore()

  const x0 = MARGEN + RELLENO
  const x1 = MARGEN + ANCHO - RELLENO
  const xc = MARGEN + ANCHO / 2
  let y = MARGEN + RELLENO
  ctx.textBaseline = 'middle'

  for (const { fila: f, alto, lineas } of medidas) {
    const medio = y + alto / 2
    ctx.textAlign = 'center'
    if (f.t === 'marca' || f.t === 'leyenda' || f.t === 'texto') {
      ctx.font = FUENTE[f.t]
      ctx.fillStyle = f.t === 'marca' ? COLORES_PAPEL.tinta : COLORES_PAPEL.tinta2
      const interlinea = f.t === 'marca' ? 22 : f.t === 'leyenda' ? 11 : 14
      lineas!.forEach((l, i) => {
        if (f.t === 'texto') {
          ctx.textAlign = 'left'
          ctx.fillText(l, x0, y + 2 + interlinea * (i + 0.5))
        } else ctx.fillText(l, xc, y + 2 + interlinea * (i + 0.5))
      })
    } else if (f.t === 'sub') {
      ctx.fillStyle = d.color
      ctx.font = `700 11px ${MONO}`
      espaciado(ctx, f.texto, xc, medio, 2)
    } else if (f.t === 'corte') {
      ctx.save()
      ctx.strokeStyle = COLORES_PAPEL.linea
      ctx.lineWidth = 1.5
      ctx.setLineDash([4, 3])
      ctx.beginPath()
      ctx.moveTo(x0, medio)
      ctx.lineTo(x1, medio)
      ctx.stroke()
      ctx.restore()
    } else if (f.t === 'fila') {
      ctx.font = f.fuerte ? FUENTE.filaFuerte : FUENTE.fila
      ctx.fillStyle = f.fuerte ? COLORES_PAPEL.tinta : COLORES_PAPEL.tinta2
      ctx.textAlign = 'left'
      const valor = f.b
      ctx.font = f.fuerte ? FUENTE.filaFuerte : FUENTE.fila
      const anchoValor = Math.min(ctx.measureText(valor).width, util * 0.62)
      ctx.fillText(recortar(ctx, f.a, util - anchoValor - 12), x0, medio)
      ctx.fillStyle = COLORES_PAPEL.tinta
      ctx.textAlign = 'right'
      ctx.fillText(recortar(ctx, valor, util * 0.62), x1, medio)
    } else if (f.t === 'sello') {
      ctx.save()
      ctx.translate(xc, medio)
      ctx.rotate((-7 * Math.PI) / 180)
      ctx.font = `700 24px ${MONO}`
      const ancho = Math.max(ctx.measureText(f.abajo).width, 90) + 32
      const altoSello = 54
      ctx.globalAlpha = 0.92
      ctx.strokeStyle = d.color
      ctx.lineWidth = 1.2
      rectRedondeado(ctx, -ancho / 2, -altoSello / 2, ancho, altoSello, 10)
      ctx.stroke()
      rectRedondeado(ctx, -ancho / 2 + 2.6, -altoSello / 2 + 2.6, ancho - 5.2, altoSello - 5.2, 8)
      ctx.stroke()
      ctx.fillStyle = d.color
      ctx.font = `700 10px ${MONO}`
      espaciado(ctx, f.arriba, 0, -11, 2)
      ctx.textAlign = 'center'
      ctx.font = `700 24px ${MONO}`
      ctx.fillText(f.abajo, 0, 9)
      ctx.restore()
    } else if (f.t === 'barras') {
      ctx.fillStyle = COLORES_PAPEL.tinta
      const ancho = 210
      const ox = xc - ancho / 2
      barras(f.semilla).forEach(([pos, w]) => ctx.fillRect(ox + (pos / 200) * ancho, y + 6, (w / 200) * ancho, 30))
      ctx.fillStyle = COLORES_PAPEL.tinta2
      ctx.font = `400 10px ${MONO}`
      espaciado(ctx, f.codigo, xc, y + 43, 3)
    } else if (f.t === 'gracias') {
      ctx.fillStyle = COLORES_PAPEL.tinta
      ctx.font = FUENTE.gracias
      espaciado(ctx, f.texto, xc, medio + 2, 0.8)
    }
    y += alto
  }

  return new Promise((resolve, reject) =>
    lienzo.toBlob((b) => (b ? resolve(b) : reject(new Error('No se pudo crear la imagen.'))), 'image/png'),
  )
}
