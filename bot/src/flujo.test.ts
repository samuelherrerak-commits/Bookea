import { describe, expect, it, vi } from 'vitest'
import { nueva } from './db'
import { enHorario, procesar, separarDatos } from './flujo'
import type { Conversacion, Dia, Entrada, Salida, Servicios } from './tipos'

// Jueves 1-oct-2026, 3:00 p. m. en Caracas.
const AHORA = Date.UTC(2026, 9, 1, 19, 0)

const SABADOS: Dia[] = [{ fecha: '2026-10-03', horas: ['08:00', '09:30', '11:00'] }, { fecha: '2026-10-10', horas: ['08:00'] }]
const HABILES: Dia[] = [{ fecha: '2026-10-02', horas: ['09:00', '10:00'] }, { fecha: '2026-10-05', horas: ['14:00'] }]

function servicios(over: Partial<Record<keyof Servicios, any>> = {}) {
  return {
    disponibilidad: vi.fn(async (m: string) => (m === 'presencial' ? SABADOS : HABILES)),
    agendar: vi.fn(async (_c: Conversacion, af: any) => ({
      ok: true as const,
      cita: { idEvento: 'ev1', modalidad: af.modalidad, fecha: af.fecha, hora: af.hora, direccion: af.direccion, meet: af.modalidad === 'meet' ? 'https://meet.google.com/abc-defg-hij' : undefined },
    })),
    reprogramar: vi.fn(async (_c: Conversacion, cita: any, fecha: string, hora: string) => ({ ok: true as const, cita: { ...cita, fecha, hora } })),
    cancelar: vi.fn(async () => true),
    soporte: vi.fn(async () => 42),
    persona: vi.fn(async () => undefined),
    ...over,
  }
}

const txt = (texto: string): Entrada => ({ tipo: 'texto', texto })
const op = (id: string): Entrada => ({ tipo: 'opcion', id, titulo: id })

/** Corre varios mensajes seguidos, como un chat real, y cuenta los mensajes del bot. */
async function chat(s: Servicios, entradas: Entrada[], inicial: Conversacion = nueva('584121112233', 'Ana Pérez')) {
  let conv = inicial
  let salidas: Salida[] = []
  let enviados = 0
  let ahora = AHORA
  for (const e of entradas) {
    const r = await procesar(conv, e, ahora, s)
    conv = { ...r.conv, ultimoEntrante: ahora }
    salidas = r.salidas
    enviados += r.salidas.length
    ahora += 60_000
  }
  return { conv, salidas, enviados }
}

const ids = (s: Salida | undefined) => (s?.tipo === 'lista' ? s.filas.map((f) => f.id) : s?.tipo === 'botones' ? s.botones.map((b) => b.id) : [])
const textoDe = (s: Salida[]) => s.map((x) => ('texto' in x ? x.texto : '')).join('\n')

describe('bot · un mensaje por turno', () => {
  it('ninguna respuesta manda más de un mensaje', async () => {
    const s = servicios()
    const recorridos: Entrada[][] = [
      [txt('hola'), op('afiliar'), txt('Barbería El Corte, elcorte@gmail.com'), op('mod_presencial'), txt('Av. Bolívar, local 4'), op('hora:2026-10-03|09:30')],
      [txt('hola'), op('info'), op('afiliar')],
      [txt('hola'), op('soporte'), op('sop:alerta'), op('sop_no'), txt('No suena, Barbería El Corte')],
    ]
    for (const r of recorridos) {
      let conv = nueva('58412', '')
      for (const [i, e] of r.entries()) {
        const res = await procesar(conv, e, AHORA + i * 60_000, s)
        expect(res.salidas.length, JSON.stringify(e)).toBeLessThanOrEqual(1)
        conv = { ...res.conv, ultimoEntrante: AHORA + i * 60_000 }
      }
    }
  })
})

describe('bot · menú', () => {
  it('saluda con el primer nombre, el precio y las 4 opciones (siempre menú primero)', async () => {
    const { salidas, conv } = await chat(servicios(), [txt('Hola, quiero afiliar mi negocio')])
    expect(textoDe(salidas)).toContain('¡Hola Ana!')
    expect(textoDe(salidas)).toContain('1 mes gratis')
    expect(ids(salidas[0])).toEqual(['afiliar', 'info', 'soporte', 'persona'])
    expect(conv.paso).toBe('inicio')
  })

  it('"Cómo funciona y precio" es un solo mensaje que lleva a afiliar', async () => {
    const { salidas } = await chat(servicios(), [txt('hola'), op('info')])
    expect(textoDe(salidas)).toContain('$10 al mes')
    expect(ids(salidas[0])).toEqual(['afiliar', 'persona'])
  })

  it('después del saludo entiende números y palabras', async () => {
    expect((await chat(servicios(), [txt('hola'), txt('1')])).conv.paso).toBe('af_datos')
    expect(textoDe((await chat(servicios(), [txt('hola'), txt('cuánto cuesta?')])).salidas)).toContain('$10 al mes')
  })

  it('"menú" vuelve al inicio desde cualquier paso', async () => {
    const { conv, salidas } = await chat(servicios(), [txt('hola'), op('afiliar'), txt('menú')])
    expect(conv.paso).toBe('inicio')
    expect(ids(salidas[0])).toContain('afiliar')
  })
})

describe('separarDatos', () => {
  it('saca negocio y correo de un solo mensaje', () => {
    expect(separarDatos('Barbería El Corte, elcorte@gmail.com')).toEqual({ negocio: 'Barbería El Corte', correo: 'elcorte@gmail.com' })
    expect(separarDatos('Mi negocio se llama Uñas Bellas y mi correo es unasbellas@gmail.com.')).toEqual({ negocio: 'Uñas Bellas', correo: 'unasbellas@gmail.com' })
    expect(separarDatos('Spa Zen')).toEqual({ negocio: 'Spa Zen', correo: '' })
    expect(separarDatos('ana@gmail.com')).toEqual({ negocio: '', correo: 'ana@gmail.com' })
    expect(separarDatos('Nombre: Estética Glow | correo: glow@gmail.com')).toEqual({ negocio: 'Estética Glow', correo: 'glow@gmail.com' })
  })
})

describe('bot · afiliación corta', () => {
  it('presencial: 5 mensajes del bot desde "Afiliar" hasta la cita confirmada', async () => {
    const s = servicios()
    const inicio = (await chat(s, [txt('hola')])).conv
    const { conv, salidas, enviados } = await chat(s, [
      op('afiliar'), txt('Barbería El Corte, elcorte@gmail.com'), op('mod_presencial'), txt('Av. Bolívar, local 4, frente a la plaza'), op('hora:2026-10-03|09:30'),
    ], inicio)
    expect(enviados).toBe(5)
    expect(s.agendar.mock.calls[0][1]).toEqual({
      negocio: 'Barbería El Corte', correo: 'elcorte@gmail.com', modalidad: 'presencial', direccion: 'Av. Bolívar, local 4, frente a la plaza', fecha: '2026-10-03', hora: '09:30', ubicacion: undefined,
    })
    expect(conv.cita?.idEvento).toBe('ev1')
    expect(conv.etiqueta).toBe('cita')
    expect(textoDe(salidas)).toContain('sábado 3 de octubre')
    expect(textoDe(salidas)).toContain('Av. Bolívar')
  })

  it('Google Meet: 4 mensajes, sin dirección, con el enlace', async () => {
    const s = servicios()
    const inicio = (await chat(s, [txt('hola')])).conv
    const { salidas, enviados } = await chat(s, [op('afiliar'), txt('Spa Zen, spazen@gmail.com'), op('mod_meet'), op('hora:2026-10-02|10:00')], inicio)
    expect(enviados).toBe(4)
    expect(textoDe(salidas)).toContain('https://meet.google.com/abc-defg-hij')
    expect(s.agendar.mock.calls[0][1].direccion).toBeUndefined()
  })

  it('las horas van en una sola lista con día y hora, y se puede pedir más', async () => {
    const s = servicios({ disponibilidad: vi.fn(async () => [{ fecha: '2026-10-05', horas: ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00'] }, { fecha: '2026-10-06', horas: ['09:00', '10:00', '11:00', '12:00'] }]) })
    const r = await chat(s, [txt('hola'), op('afiliar'), txt('Spa Zen, spazen@gmail.com'), op('mod_meet')])
    const filas = ids(r.salidas[0])
    expect(filas).toHaveLength(10)
    expect(filas[0]).toBe('hora:2026-10-05|09:00')
    expect(filas.at(-1)).toBe('mas_horas')
    const mas = await chat(s, [op('mas_horas')], r.conv)
    expect(ids(mas.salidas[0])).toEqual(['hora:2026-10-06|12:00', 'primeras_horas'])
  })

  it('si falta el correo o el nombre, pide solo lo que falta', async () => {
    const s = servicios()
    let r = await chat(s, [txt('hola'), op('afiliar'), txt('Barbería El Corte')])
    expect(r.conv.paso).toBe('af_correo')
    r = await chat(s, [txt('correo-malo')], r.conv)
    expect(textoDe(r.salidas)).toContain('no parece válido')
    r = await chat(s, [txt('elcorte@gmail.com')], r.conv)
    expect(r.conv.paso).toBe('af_modalidad')
    r = await chat(s, [txt('hola'), op('afiliar'), txt('elcorte@gmail.com')])
    expect(textoDe(r.salidas)).toContain('cómo se llama tu negocio')
  })

  it('la ubicación de WhatsApp sirve como dirección', async () => {
    const { conv } = await chat(servicios(), [txt('hola'), op('afiliar'), txt('X Barber, x@gmail.com'), op('mod_presencial'), { tipo: 'ubicacion', lat: 10.5, lng: -66.9, nombre: 'X Barber', direccion: 'Calle 5' }])
    expect(conv.paso).toBe('af_hora')
    expect(conv.datos.af?.direccion).toBe('X Barber, Calle 5')
  })

  it('hora ocupada: vuelve a ofrecer horas', async () => {
    const s = servicios({ agendar: vi.fn(async () => ({ ok: false as const, motivo: 'ocupado' as const })) })
    const r = await chat(s, [txt('hola'), op('afiliar'), txt('Spa Zen, spazen@gmail.com'), op('mod_meet'), op('hora:2026-10-02|09:00')])
    expect(r.conv.paso).toBe('af_hora')
    expect(textoDe(r.salidas)).toContain('se acaba de ocupar')
  })

  it('sin horas libres pasa el chat a una persona', async () => {
    const s = servicios({ disponibilidad: vi.fn(async () => []) })
    const r = await chat(s, [txt('hola'), op('afiliar'), txt('Spa Zen, spazen@gmail.com'), op('mod_meet')])
    expect(r.conv.modo).toBe('humano')
    expect(s.persona).toHaveBeenCalled()
  })

  it('con cita: "mi cita" para ver, cambiar y cancelar', async () => {
    const s = servicios()
    const conCita = (await chat(s, [txt('hola'), op('afiliar'), txt('Spa Zen, spazen@gmail.com'), op('mod_meet'), op('hora:2026-10-02|09:00')])).conv
    expect(ids((await chat(s, [txt('menu')], conCita)).salidas[0])[0]).toBe('mi_cita')

    const mover = await chat(s, [txt('mi cita'), op('cita_cambiar'), op('hora:2026-10-05|14:00')], conCita)
    expect(s.reprogramar).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ idEvento: 'ev1' }), '2026-10-05', '14:00')
    expect(textoDe(mover.salidas)).toContain('Cambié tu cita')

    const cancelar = await chat(s, [op('mi_cita'), op('cita_cancelar'), op('cancelar_si')], conCita)
    expect(s.cancelar).toHaveBeenCalled()
    expect(cancelar.conv.cita).toBeNull()
  })
})

describe('bot · soporte y persona', () => {
  it('respuesta y "¿se resolvió?" en un solo mensaje', async () => {
    const s = servicios()
    const r = await chat(s, [txt('hola'), op('soporte'), op('sop:logo')])
    expect(r.salidas).toHaveLength(1)
    expect(textoDe(r.salidas)).toContain('Subir logo')
    expect(ids(r.salidas[0])).toEqual(['sop_si', 'sop_no'])
    expect((await chat(s, [op('sop_si')], r.conv)).conv.paso).toBe('inicio')
  })

  it('si no se resolvió: una descripción (con o sin captura) abre el caso', async () => {
    const s = servicios()
    const r = await chat(s, [txt('hola'), op('soporte'), op('sop:alerta'), op('sop_no'), { tipo: 'imagen', mediaId: 'CAP1', texto: 'No suena la alerta. Barbería El Corte' }])
    expect(s.soporte).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ tema: 'Alerta de las citas', descripcion: 'No suena la alerta. Barbería El Corte', captura: 'CAP1' }))
    expect(r.conv.modo).toBe('humano')
    expect(textoDe(r.salidas)).toContain('#42')
  })

  it('en modo humano el bot no responde, salvo "menú"', async () => {
    const s = servicios()
    const r = await chat(s, [txt('hola'), op('persona'), txt('hola?')])
    expect(r.salidas).toEqual([])
    expect((await chat(s, [txt('menu')], r.conv)).conv.modo).toBe('bot')
  })

  it('después de 24 h sin escribir vuelve al bot', async () => {
    const s = servicios()
    const r = await chat(s, [txt('hola'), op('persona')])
    const despues = await procesar(r.conv, txt('hola'), AHORA + 25 * 3600_000, s)
    expect(despues.conv.modo).toBe('bot')
    expect(ids(despues.salidas[0])).toContain('afiliar')
  })

  it('horario de atención: lunes a sábado de 8 a 18 en Caracas', () => {
    expect(enHorario(AHORA)).toBe(true)
    expect(enHorario(Date.UTC(2026, 9, 4, 15))).toBe(false)
    expect(enHorario(Date.UTC(2026, 9, 1, 23, 30))).toBe(false)
  })
})

describe('conNotas', () => {
  it('anota el motivo cuando agendar falla y deja pasar el resultado', async () => {
    const { conNotas } = await import('./index')
    const notas: string[] = []
    const s = conNotas({
      ...servicios(),
      agendar: async () => ({ ok: false, motivo: 'error', mensaje: 'Calendar is not defined' }),
      disponibilidad: async () => { throw new Error('Apps Script: no_autorizado') },
    } as Servicios, notas)
    expect(await s.agendar({} as any, {} as any)).toMatchObject({ ok: false, motivo: 'error' })
    await expect(s.disponibilidad('meet')).rejects.toThrow('no_autorizado')
    expect(notas).toEqual(['No se pudo agendar: Calendar is not defined', 'No se pudo disponibilidad: Apps Script: no_autorizado'])
  })
})
