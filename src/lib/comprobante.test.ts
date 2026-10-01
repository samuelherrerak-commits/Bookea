import { describe, expect, it } from 'vitest'
import { comprobantePdf } from './comprobantePdf'
import { LEYENDA_NO_FISCAL, nombreArchivo, numeroRecibo, textoComprobante, type DatosComprobante } from './comprobante'

const base: DatosComprobante = {
  negocio: 'Barbería Norte',
  numero: 7,
  reservaId: 'ab12cd34-0000-4000-8000-000000000000',
  emitido: new Date(2026, 9, 1, 15, 4),
  cliente: 'Carlos Méndez',
  telefono: '0412 555 1234',
  cita: 'Jueves 15 de octubre · 2:00 p. m.',
  lugar: 'En Sede Centro',
  direccion: 'Av. Libertador, local 12',
  servicios: [{ nombre: 'Corte y barba', precio: 16 }, { nombre: 'Cejas', precio: 2 }],
  recargo: 0,
  descuento: 0,
  cupon: '',
  total: 18,
  moneda: 'EUR',
  metodo: 'lugar',
  pagadoBs: null,
  tasa: null,
  color: '#1F6F5C',
}

describe('comprobante de cita (no fiscal)', () => {
  it('lleva la leyenda exacta arriba y abajo', () => {
    expect(LEYENDA_NO_FISCAL).toBe('DOCUMENTO NO FISCAL - VÁLIDO ÚNICAMENTE COMO COMPROBANTE DE CONTROL INTERNO')
    const texto = textoComprobante(base)
    expect(texto.startsWith(LEYENDA_NO_FISCAL)).toBe(true)
    expect(texto.endsWith(LEYENDA_NO_FISCAL)).toBe(true)
  })

  it('nunca dice factura, IVA ni base imponible', () => {
    for (const d of [base, { ...base, metodo: 'pago_movil' as const, pagadoBs: 720, tasa: 40 }]) {
      expect(textoComprobante(d)).not.toMatch(/factura|\bIVA\b|base imponible|n[uú]mero de control/i)
    }
  })

  it('con pago en la cita muestra solo la referencia, sin bolívares', () => {
    const t = textoComprobante(base)
    expect(t).toContain('Total (referencia): 18,00 €')
    expect(t).not.toMatch(/Bs\./)
    expect(t).toContain('tasa BCV del día de la cita')
  })

  it('con Pago Móvil muestra la referencia y lo pagado en bolívares con su tasa', () => {
    const t = textoComprobante({ ...base, metodo: 'pago_movil', pagadoBs: 720, tasa: 40 })
    expect(t).toContain('Total (referencia): 18,00 €')
    expect(t).toContain('Pagado: Bs. 720,00 · tasa BCV 40,00')
  })

  it('en bolívares no habla de referencia', () => {
    expect(textoComprobante({ ...base, moneda: 'BS', total: 720 })).toContain('Total: Bs. 720,00')
  })

  it('número correlativo y nombre de archivo', () => {
    expect(numeroRecibo(7)).toBe('000007')
    expect(numeroRecibo(null)).toBe('')
    expect(nombreArchivo(base)).toBe('comprobante-barberia-norte-000007.pdf')
    expect(nombreArchivo({ ...base, numero: null })).toBe('comprobante-barberia-norte-ab12cd34.pdf')
  })

  it('arma un PDF', async () => {
    const blob = comprobantePdf(base)
    const bytes = new Uint8Array(await blob.arrayBuffer())
    expect(new TextDecoder().decode(bytes.slice(0, 5))).toBe('%PDF-')
  })
})
