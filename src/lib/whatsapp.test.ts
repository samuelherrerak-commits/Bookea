import { describe, expect, it } from 'vitest'
import { PLANTILLAS_MENSAJE } from './mensajes'
import { summarize } from './pricing'
import { buildWhatsAppMessage, buildWhatsAppUrl } from './whatsapp'

const catalog = {
  servicios: [
    { id: 'kapping', nombre: 'Kapping', precio: 17, duracionMin: 60, tipo: 'base' as const, categoria: 'Manos' },
    { id: 'nivelacion', nombre: 'Nivelacion', precio: 15, duracionMin: 60, tipo: 'base' as const, categoria: 'Manos' },
  ],
  promociones: [],
  tasa: { valor: 974.06, fecha: null, fuente: 'BCV' },
}
const sede = { id: 'principal', nombre: 'El consultorio', direccion: '', mapsUrl: 'https://maps.app.goo.gl/MBfSuyGHQrRRcDp17' }
const base = {
  negocio: 'ByMariaNails',
  customer: { nombre: ' Ana Pérez ', telefono: '0412 123 4567' },
  schedule: { fecha: '2026-09-24', hora: '14:30' },
  coupon: null,
  tasa: catalog.tasa,
  reservaId: 'abc12345-xyz',
}
const [calida, formal, breve] = PLANTILLAS_MENSAJE

describe('buildWhatsAppMessage', () => {
  it('Cálida, en el local + Pago Móvil: Maps, monto en Bs, capture y calendario', () => {
    const msg = buildWhatsAppMessage({
      ...base,
      plantilla: calida.texto,
      modalidad: 'local',
      lugar: { titulo: 'En el consultorio', sede },
      summary: summarize({ servicios: ['kapping'], promos: [] }, catalog, null, 'local'),
      payment: { metodo: 'pago_movil', pagado: true, comprobante: null },
      comprobanteUrl: 'https://drive.google.com/file/d/123/view',
      calendarUrl: 'https://calendar.google.com/calendar/render?action=TEMPLATE',
    })
    expect(msg).toBe(
      [
        '✨ ¡Nueva reserva en ByMariaNails! ✨',
        '',
        '¡Hola! 😊 Quiero confirmar mi cita:',
        '',
        '👤 Nombre: Ana Pérez',
        '📱 Teléfono: 0412 123 4567',
        '',
        '🗓️ Fecha: Jueves 24 de septiembre',
        '⏰ Hora: 2:30 p. m. (1 h aprox.)',
        '',
        '💫 Servicios:',
        '• Kapping — 17,00 €',
        '',
        '📍 Lugar: En el consultorio',
        'https://maps.app.goo.gl/MBfSuyGHQrRRcDp17',
        '',
        '💰 Total: 17,00 €',
        '💳 Pago: Pago Móvil, Bs. 16.559,02 (tasa BCV Bs. 974,06)',
        '🧾 Capture: https://drive.google.com/file/d/123/view',
        '',
        '📆 Agrégala a tu calendario: https://calendar.google.com/calendar/render?action=TEMPLATE',
        '',
        '🔖 Reserva #ABC12345',
        '¡Gracias! Nos vemos pronto 💕',
      ].join('\n'),
    )
    expect(msg).not.toMatch(/spa/i)
  })

  it('domicilio + pago en la cita: pide la ubicación y muestra el recargo; sin cupón ni capture', () => {
    const msg = buildWhatsAppMessage({
      ...base,
      plantilla: calida.texto,
      modalidad: 'domicilio',
      lugar: { titulo: 'A domicilio', sede: null },
      summary: summarize({ servicios: ['kapping', 'nivelacion'], promos: [] }, catalog, null, 'domicilio'),
      payment: { metodo: 'lugar' },
    })
    expect(msg).toContain('💫 Servicios:\n• Kapping — 17,00 €\n• Nivelacion — 15,00 €')
    expect(msg).toContain('⏰ Hora: 2:30 p. m. (2 h 15 min aprox.)')
    expect(msg).toContain('📍 Lugar: A domicilio (+20 %: 6,40 €)')
    expect(msg).toContain('Te envío mi ubicación por aquí 👇')
    expect(msg).toContain('💰 Total: 38,40 €')
    expect(msg).toContain('💳 Pago: En la cita')
    expect(msg).not.toContain('🎟️')
    expect(msg).not.toContain('Capture')
    expect(msg).not.toContain('calendario')
  })

  it('Formal y Breve usan los mismos datos con otro texto', () => {
    const input = {
      ...base,
      modalidad: 'local' as const,
      lugar: { titulo: 'En Sede Norte', sede: { ...sede, nombre: 'Sede Norte', direccion: 'Av. 5, local 3' } },
      summary: summarize({ servicios: ['kapping'], promos: [] }, catalog, null, 'local'),
      payment: { metodo: 'lugar' as const },
    }
    const f = buildWhatsAppMessage({ ...input, plantilla: formal.texto })
    expect(f).toContain('Nombre: Ana Pérez')
    expect(f).toContain('Lugar: En Sede Norte\nAv. 5, local 3 · https://maps.app.goo.gl/MBfSuyGHQrRRcDp17')
    expect(f).not.toMatch(/[\u{1F300}-\u{1FAFF}]/u)
    const b = buildWhatsAppMessage({ ...input, plantilla: breve.texto })
    expect(b.split('\n')).toHaveLength(4)
    expect(b).toContain('En Sede Norte · Total 17,00 € · En la cita')
  })

  it('sin plantilla usa la Cálida', () => {
    const msg = buildWhatsAppMessage({
      ...base,
      modalidad: 'local',
      lugar: { titulo: 'En el spa', sede: null },
      summary: summarize({ servicios: ['kapping'], promos: [] }, catalog, null, 'local'),
      payment: { metodo: 'lugar' },
    })
    expect(msg.startsWith('✨ ¡Nueva reserva en ByMariaNails! ✨')).toBe(true)
  })
})

describe('buildWhatsAppUrl', () => {
  it('limpia el número y codifica el texto', () => {
    const url = buildWhatsAppUrl('+58 412-2516390', 'Hola & chao\nlínea')
    expect(url).toBe('https://wa.me/584122516390?text=Hola%20%26%20chao%0Al%C3%ADnea')
  })
})
