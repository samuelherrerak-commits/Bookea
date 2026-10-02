import { describe, expect, it } from 'vitest'
import { crearSesion, firmaMetaValida, hmacHex, sesionValida } from './firma'
import { cuerpoMensaje, mensajesDelWebhook } from './whatsapp'

const enc = new TextEncoder()
const cuerpo = (o: unknown) => enc.encode(JSON.stringify(o)).buffer as ArrayBuffer

describe('firma de Meta', () => {
  it('acepta la firma correcta y rechaza las demás', async () => {
    const datos = cuerpo({ hola: 1 })
    const firma = 'sha256=' + (await hmacHex('secreto', datos))
    expect(await firmaMetaValida('secreto', datos, firma)).toBe(true)
    expect(await firmaMetaValida('otro', datos, firma)).toBe(false)
    expect(await firmaMetaValida('secreto', cuerpo({ hola: 2 }), firma)).toBe(false)
    expect(await firmaMetaValida('secreto', datos, null)).toBe(false)
    expect(await firmaMetaValida('', datos, firma)).toBe(false)
  })

  it('la sesión de la bandeja vence y no se puede falsificar', async () => {
    const s = await crearSesion('clave-larga-123', 1000, 5000)
    expect(await sesionValida('clave-larga-123', s, 2000)).toBe(true)
    expect(await sesionValida('clave-larga-123', s, 7000)).toBe(false)
    expect(await sesionValida('otra-clave-1234', s, 2000)).toBe(false)
    expect(await sesionValida('clave-larga-123', '999999999.abc', 2000)).toBe(false)
  })
})

const webhook = (mensaje: Record<string, unknown>) => ({
  object: 'whatsapp_business_account',
  entry: [{ id: 'WABA', changes: [{ field: 'messages', value: {
    messaging_product: 'whatsapp', metadata: { phone_number_id: '1' },
    contacts: [{ profile: { name: 'Ana' }, wa_id: '584121112233' }],
    messages: [{ from: '584121112233', id: 'wamid.X', timestamp: '1790000000', ...mensaje }],
  } }] }],
})

describe('webhook de Meta', () => {
  it('lee texto, botones, listas, imágenes y ubicación', () => {
    expect(mensajesDelWebhook(webhook({ type: 'text', text: { body: 'Hola' } }))[0]).toMatchObject({ de: '584121112233', nombre: 'Ana', wamid: 'wamid.X', ms: 1790000000000, entrada: { tipo: 'texto', texto: 'Hola' } })
    expect(mensajesDelWebhook(webhook({ type: 'interactive', interactive: { type: 'button_reply', button_reply: { id: 'confirmar', title: 'Confirmar' } } }))[0].entrada).toEqual({ tipo: 'opcion', id: 'confirmar', titulo: 'Confirmar' })
    expect(mensajesDelWebhook(webhook({ type: 'interactive', interactive: { type: 'list_reply', list_reply: { id: 'dia:2026-10-03', title: 'Sáb 3 oct' } } }))[0].entrada).toMatchObject({ tipo: 'opcion', id: 'dia:2026-10-03' })
    expect(mensajesDelWebhook(webhook({ type: 'image', image: { id: 'MED', caption: 'mi logo', mime_type: 'image/png' } }))[0]).toMatchObject({ mediaId: 'MED', entrada: { tipo: 'imagen', mediaId: 'MED', texto: 'mi logo' } })
    expect(mensajesDelWebhook(webhook({ type: 'location', location: { latitude: 10.5, longitude: -66.9, name: 'Local' } }))[0].entrada).toMatchObject({ tipo: 'ubicacion', lat: 10.5, lng: -66.9, nombre: 'Local' })
    expect(mensajesDelWebhook(webhook({ type: 'sticker', sticker: { id: 'S' } }))[0].entrada).toEqual({ tipo: 'otro' })
  })

  it('ignora los avisos de entrega (statuses)', () => {
    const w = { entry: [{ changes: [{ field: 'messages', value: { statuses: [{ id: 'wamid.Y', status: 'delivered' }] } }] }] }
    expect(mensajesDelWebhook(w)).toEqual([])
    expect(mensajesDelWebhook({})).toEqual([])
  })
})

describe('mensajes salientes', () => {
  it('respeta los límites de botones y listas de WhatsApp', () => {
    const b = cuerpoMensaje('58412', { tipo: 'botones', texto: 'x', botones: [1, 2, 3, 4].map((i) => ({ id: 'b' + i, titulo: 'Un título demasiado largo para un botón' })) }) as any
    expect(b.interactive.action.buttons).toHaveLength(3)
    expect(b.interactive.action.buttons[0].reply.title.length).toBeLessThanOrEqual(20)
    const l = cuerpoMensaje('58412', { tipo: 'lista', texto: 'x', boton: 'Ver opciones', filas: Array.from({ length: 12 }, (_, i) => ({ id: 'f' + i, titulo: 'Fila con un título muy muy largo', descripcion: 'd'.repeat(100) })) }) as any
    const filas = l.interactive.action.sections[0].rows
    expect(filas).toHaveLength(10)
    expect(filas[0].title.length).toBeLessThanOrEqual(24)
    expect(filas[0].description.length).toBeLessThanOrEqual(72)
  })
})
