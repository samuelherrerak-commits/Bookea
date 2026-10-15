import { describe, expect, it } from 'vitest'
import { barras, emiteTicket, filasTicket, LEYENDA_NO_FISCAL, nombreArchivo, numeroTicket, textoTicket, type DatosTicket } from './ticket'

const base: DatosTicket = {
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

describe('ticket de reserva (no fiscal)', () => {
  it('lleva la leyenda exacta arriba y abajo', () => {
    expect(LEYENDA_NO_FISCAL).toBe('DOCUMENTO NO FISCAL - VÁLIDO ÚNICAMENTE COMO COMPROBANTE DE CONTROL INTERNO')
    const texto = textoTicket(base)
    // Arriba, justo debajo del título, y como última línea del ticket.
    const lineas = texto.split('\n')
    expect(lineas.slice(0, 3)).toContain(LEYENDA_NO_FISCAL)
    expect(lineas[lineas.length - 1]).toBe(LEYENDA_NO_FISCAL)
  })

  it('nunca dice factura, IVA ni base imponible', () => {
    for (const d of [base, { ...base, metodo: 'pago_movil' as const, pagadoBs: 720, tasa: 40 }]) {
      expect(textoTicket(d)).not.toMatch(/factura|\bIVA\b|base imponible|n[uú]mero de control/i)
    }
  })

  it('con pago en la cita muestra solo la referencia, sin bolívares', () => {
    const t = textoTicket(base)
    expect(t).toContain('TOTAL (REF.): 18,00 €')
    expect(t).not.toMatch(/Bs\./)
    expect(t).toContain('tasa BCV del día de la cita')
  })

  it('con Pago Móvil muestra la referencia y lo pagado en bolívares con su tasa', () => {
    const t = textoTicket({ ...base, metodo: 'pago_movil', pagadoBs: 720, tasa: 40 })
    expect(t).toContain('TOTAL (REF.): 18,00 €')
    expect(t).toContain('PAGADO: Bs. 720,00')
    expect(t).toContain('TASA BCV: 40,00')
  })

  it('en bolívares no habla de referencia', () => {
    expect(textoTicket({ ...base, moneda: 'BS', total: 720 })).toContain('TOTAL: Bs. 720,00')
  })

  it('número correlativo y nombre de archivo', () => {
    expect(numeroTicket(7)).toBe('000007')
    expect(numeroTicket(null)).toBe('')
    expect(nombreArchivo(base)).toBe('ticket-barberia-norte-000007.png')
    expect(nombreArchivo({ ...base, numero: null })).toBe('ticket-barberia-norte-ab12cd34.png')
  })

  it('se titula ticket de reserva y lleva el sello con el número', () => {
    const filas = filasTicket(base)
    expect(filas[0]).toEqual({ t: 'marca', texto: 'BARBERÍA NORTE' })
    expect(filas[1]).toEqual({ t: 'sub', texto: 'TICKET DE RESERVA' })
    expect(filas).toContainEqual({ t: 'sello', arriba: 'RESERVA', abajo: 'N° 000007' })
    expect(filas).toContainEqual({ t: 'fila', a: 'DÍA', b: 'JUEVES 15 DE OCTUBRE' })
    expect(filas).toContainEqual({ t: 'fila', a: 'HORA', b: '2:00 P. M.' })
    // Sin correlativo, el sello lleva la referencia de la reserva.
    expect(filasTicket({ ...base, numero: null })).toContainEqual({ t: 'sello', arriba: 'RESERVA', abajo: '#AB12CD34' })
  })

  it('código de barras estable para la misma reserva', () => {
    expect(barras(base.reservaId)).toEqual(barras(base.reservaId))
    expect(barras(base.reservaId)).not.toEqual(barras('otra'))
    for (const [x, w] of barras(base.reservaId)) expect(x + w).toBeLessThanOrEqual(200)
  })

  it('se emite solo si está activo y el negocio no factura en modo fiscal', () => {
    expect(emiteTicket({ facturacionModo: 'interno', ticketReserva: true })).toBe(true)
    expect(emiteTicket({ facturacionModo: 'interno', ticketReserva: false })).toBe(false)
    expect(emiteTicket({ facturacionModo: 'fiscal', ticketReserva: true })).toBe(false)
  })
})
