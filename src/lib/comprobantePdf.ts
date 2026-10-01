/**
 * PDF del comprobante de cita. Se carga con import() solo al terminar una reserva, así
 * jsPDF no pesa en el catálogo. Ancho A6 (105 mm); el alto crece con los servicios.
 */
import { jsPDF } from 'jspdf'
import {
  cabeceraComprobante,
  detalleComprobante,
  LEYENDA_NO_FISCAL,
  totalesComprobante,
  type DatosComprobante,
  type Linea,
} from './comprobante'

const ANCHO = 105
const MARGEN = 8
const UTIL = ANCHO - MARGEN * 2

function rgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  const n = parseInt(h.length === 3 ? h.replace(/./g, (c) => c + c) : h, 16)
  return Number.isFinite(n) ? [(n >> 16) & 255, (n >> 8) & 255, n & 255] : [15, 15, 14]
}

export function comprobantePdf(d: DatosComprobante): Blob {
  // Primero se mide con un documento de prueba, para darle al PDF el alto justo.
  const medir = new jsPDF({ unit: 'mm', format: [ANCHO, 400] })
  const alto = Math.max(148, Math.ceil(dibujar(medir, d)) + MARGEN)
  const doc = new jsPDF({ unit: 'mm', format: [ANCHO, alto] })
  dibujar(doc, d)
  doc.setProperties({ title: `Comprobante de cita · ${d.negocio}`, subject: LEYENDA_NO_FISCAL, creator: 'bookeaa' })
  return doc.output('blob')
}

/** Dibuja todo y devuelve la altura usada (mm). */
function dibujar(doc: jsPDF, d: DatosComprobante): number {
  let y = MARGEN

  const leyenda = (yy: number) => {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(6.6)
    const lineas = doc.splitTextToSize(LEYENDA_NO_FISCAL, UTIL - 6) as string[]
    const h = lineas.length * 3 + 4
    doc.setFillColor(242, 242, 240)
    doc.setDrawColor(15, 15, 14)
    doc.setLineWidth(0.3)
    doc.roundedRect(MARGEN, yy, UTIL, h, 1.5, 1.5, 'FD')
    doc.setTextColor(15, 15, 14)
    lineas.forEach((l, i) => doc.text(l, ANCHO / 2, yy + 4.6 + i * 3, { align: 'center' }))
    return yy + h
  }

  y = leyenda(y) + 7

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(15)
  doc.setTextColor(...rgb(d.color))
  doc.text('COMPROBANTE DE CITA', MARGEN, y)
  y += 6
  doc.setFontSize(11)
  doc.setTextColor(15, 15, 14)
  ;(doc.splitTextToSize(d.negocio, UTIL) as string[]).forEach((l) => { doc.text(l, MARGEN, y); y += 5 })
  y += 1.5

  const filas = (lineas: Linea[], opts: { derecha?: boolean } = {}) => {
    // Columna de etiquetas tan ancha como la más larga (en su propio peso), sin pasar de 40 mm.
    const col = Math.min(40, Math.max(26, ...lineas.map((l) => {
      doc.setFont('helvetica', l.fuerte ? 'bold' : 'normal')
      doc.setFontSize(l.fuerte ? 9.6 : 8.6)
      return doc.getTextWidth(l.etiqueta) + 3
    })))
    lineas.forEach((l) => {
      doc.setFont('helvetica', l.fuerte ? 'bold' : 'normal')
      doc.setFontSize(l.fuerte ? 9.6 : 8.6)
      if (opts.derecha) {
        // Concepto a la izquierda, monto a la derecha.
        const valorAncho = doc.getTextWidth(l.valor)
        const concepto = doc.splitTextToSize(l.etiqueta, UTIL - valorAncho - 4) as string[]
        doc.setTextColor(15, 15, 14)
        concepto.forEach((c, i) => doc.text(c, MARGEN, y + i * 4))
        doc.text(l.valor, ANCHO - MARGEN, y, { align: 'right' })
        y += concepto.length * 4 + 1.2
      } else {
        doc.setTextColor(91, 91, 87)
        doc.text(l.etiqueta, MARGEN, y)
        doc.setTextColor(15, 15, 14)
        const valor = doc.splitTextToSize(l.valor, UTIL - col) as string[]
        valor.forEach((v, i) => doc.text(v, MARGEN + col, y + i * 4))
        y += valor.length * 4 + 1.2
      }
    })
  }
  const regla = () => {
    doc.setDrawColor(210, 210, 206)
    doc.setLineWidth(0.25)
    doc.line(MARGEN, y, ANCHO - MARGEN, y)
    y += 5
  }

  filas(cabeceraComprobante(d))
  y += 1
  regla()
  filas(detalleComprobante(d), { derecha: true })
  y += 0.5
  regla()
  const [total, ...resto] = totalesComprobante(d)
  filas([total], { derecha: true })
  filas(resto)
  y += 4

  y = leyenda(y) + 5
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(6.8)
  doc.setTextColor(91, 91, 87)
  doc.text('Reserva hecha con bookeaa · bookeaa.com', ANCHO / 2, y, { align: 'center' })
  return y
}
