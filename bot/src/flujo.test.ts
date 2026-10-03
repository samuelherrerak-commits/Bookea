import { describe, expect, it, vi } from 'vitest'
import { nueva } from './db'
import { enHorario, procesar } from './flujo'
import type { Conversacion, Dia, Entrada, Salida, Servicios } from './tipos'

// Jueves 1-oct-2026, 3:00 p. m. en Caracas.
const AHORA = Date.UTC(2026, 9, 1, 19, 0)

const SABADOS: Dia[] = [{ fecha: '2026-10-03', horas: ['08:00', '09:30', '11:00'] }, { fecha: '2026-10-10', horas: ['08:00'] }]
const HABILES: Dia[] = [{ fecha: '2026-10-02', horas: ['09:00', '10:00'] }, { fecha: '2026-10-05', horas: ['14:00'] }]

function servicios(over: Partial<Record<keyof Servicios, any>> = {}) {
  const s = {
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
  return s
}

const txt = (texto: string): Entrada => ({ tipo: 'texto', texto })
const op = (id: string): Entrada => ({ tipo: 'opcion', id, titulo: id })

/** Corre varios mensajes seguidos, como un chat real. */
async function chat(s: Servicios, entradas: Entrada[], inicial: Conversacion = nueva('584121112233', 'Ana')) {
  let conv = inicial
  let salidas: Salida[] = []
  let ahora = AHORA
  for (const e of entradas) {
    const r = await procesar(conv, e, ahora, s)
    conv = { ...r.conv, ultimoEntrante: ahora }
    salidas = r.salidas
    ahora += 60_000
  }
  return { conv, salidas }
}

const ids = (s: Salida | undefined) => (s?.tipo === 'lista' ? s.filas.map((f) => f.id) : s?.tipo === 'botones' ? s.botones.map((b) => b.id) : [])
const textoDe = (s: Salida[]) => s.map((x) => ('texto' in x ? x.texto : '')).join('\n')

const DATOS = [txt('Barbería El Corte'), op('rubro:barberia'), txt('Corte · $5 · 30 min\nBarba · $3 · 20 min'), txt('Lunes a sábado 9 a 7'), txt('elcorte@gmail.com'), op('saltar_logo')]

describe('bot · menú', () => {
  it('saluda con el nombre y muestra las 5 opciones', async () => {
    const { salidas, conv } = await chat(servicios(), [txt('Hola')])
    expect(textoDe(salidas)).toContain('¡Hola Ana!')
    expect(ids(salidas[0])).toEqual(['afiliar', 'precios', 'soporte', 'como', 'persona'])
    expect(conv.paso).toBe('inicio')
  })

  it('entiende números y palabras', async () => {
    expect(textoDe((await chat(servicios(), [txt('hola'), txt('2')])).salidas)).toContain('$10 al mes')
    expect(textoDe((await chat(servicios(), [txt('cuánto cuesta?')])).salidas)).toContain('primer mes es gratis')
  })

  it('"menú" vuelve al inicio desde cualquier paso', async () => {
    const { conv, salidas } = await chat(servicios(), [op('afiliar'), txt('Mi negocio'), txt('menú')])
    expect(conv.paso).toBe('inicio')
    expect(conv.datos).toEqual({})
    expect(ids(salidas[0])).toContain('afiliar')
  })
})

describe('bot · afiliación con cita', () => {
  it('presencial: pide dirección, ofrece solo sábados y agenda', async () => {
    const s = servicios()
    const { conv, salidas } = await chat(s, [
      op('afiliar'), ...DATOS, op('mod_presencial'), txt('Av. Bolívar, local 4, frente a la plaza'), op('dia:2026-10-03'), op('hora:2026-10-03|09:30'), op('confirmar'),
    ])
    expect(s.disponibilidad).toHaveBeenCalledWith('presencial')
    expect(s.agendar).toHaveBeenCalledTimes(1)
    const af = s.agendar.mock.calls[0][1]
    expect(af).toMatchObject({ negocio: 'Barbería El Corte', rubro: 'Barbería o peluquería', correo: 'elcorte@gmail.com', modalidad: 'presencial', direccion: 'Av. Bolívar, local 4, frente a la plaza', fecha: '2026-10-03', hora: '09:30', sinLogo: true })
    expect(conv.cita?.idEvento).toBe('ev1')
    expect(conv.etiqueta).toBe('cita')
    expect(textoDe(salidas)).toContain('sábado 3 de octubre')
    expect(textoDe(salidas)).toContain('9:30 a. m.')
    expect(textoDe(salidas)).toContain('Av. Bolívar')
  })

  it('Google Meet: no pide dirección, ofrece días hábiles y devuelve el enlace', async () => {
    const s = servicios()
    const r1 = await chat(s, [op('afiliar'), ...DATOS, op('mod_meet')])
    expect(r1.conv.paso).toBe('af_dia')
    expect(ids(r1.salidas[0])).toEqual(['dia:2026-10-02', 'dia:2026-10-05'])
    const r2 = await chat(s, [op('dia:2026-10-02'), op('hora:2026-10-02|10:00'), op('confirmar')], r1.conv)
    expect(textoDe(r2.salidas)).toContain('https://meet.google.com/abc-defg-hij')
    expect(s.agendar.mock.calls[0][1].direccion).toBeUndefined()
  })

  it('la ubicación de WhatsApp sirve como dirección', async () => {
    const s = servicios()
    const { conv } = await chat(s, [op('afiliar'), ...DATOS, op('mod_presencial'), { tipo: 'ubicacion', lat: 10.5, lng: -66.9, nombre: 'Barbería El Corte', direccion: 'Calle 5, Caracas' }])
    expect(conv.paso).toBe('af_dia')
    expect(conv.datos.af?.direccion).toBe('Barbería El Corte, Calle 5, Caracas')
  })

  it('valida los datos y vuelve a preguntar', async () => {
    const s = servicios()
    let r = await chat(s, [op('afiliar'), txt('x')])
    expect(r.conv.paso).toBe('af_nombre')
    r = await chat(s, [op('afiliar'), ...DATOS.slice(0, 4), txt('correo-malo')])
    expect(r.conv.paso).toBe('af_correo')
    expect(textoDe(r.salidas)).toContain('no parece válido')
    r = await chat(s, [op('afiliar'), ...DATOS.slice(0, 4), txt('ana@empresa.com')])
    expect(r.conv.paso).toBe('af_correo_confirmar')
    expect(ids(r.salidas[0])).toEqual(['correo_ok', 'correo_otro'])
  })

  it('el logo como imagen se guarda', async () => {
    const s = servicios()
    const { conv, salidas } = await chat(s, [op('afiliar'), ...DATOS.slice(0, 5), { tipo: 'imagen', mediaId: 'MEDIA1' }])
    expect(conv.datos.af?.logo).toBe('MEDIA1')
    expect(conv.paso).toBe('af_modalidad')
    expect(textoDe(salidas)).toContain('Recibido el logo')
  })

  it('corregir un dato vuelve directo al resumen', async () => {
    const s = servicios()
    const r = await chat(s, [
      op('afiliar'), ...DATOS, op('mod_meet'), op('dia:2026-10-02'), op('hora:2026-10-02|09:00'), op('corregir'), op('fix:horario'), txt('Martes a sábado'),
    ])
    expect(r.conv.paso).toBe('af_confirmar')
    expect(textoDe(r.salidas)).toContain('Martes a sábado')
  })

  it('si la hora se ocupó al confirmar, vuelve a ofrecer días', async () => {
    const s = servicios({ agendar: vi.fn(async () => ({ ok: false as const, motivo: 'ocupado' as const })) })
    const r = await chat(s, [op('afiliar'), ...DATOS, op('mod_meet'), op('dia:2026-10-02'), op('hora:2026-10-02|09:00'), op('confirmar')])
    expect(r.conv.paso).toBe('af_dia')
    expect(textoDe(r.salidas)).toContain('se acaba de ocupar')
    expect(r.conv.cita).toBeNull()
  })

  it('sin horas libres pasa el chat a una persona', async () => {
    const s = servicios({ disponibilidad: vi.fn(async () => []) })
    const r = await chat(s, [op('afiliar'), ...DATOS, op('mod_meet')])
    expect(r.conv.modo).toBe('humano')
    expect(s.persona).toHaveBeenCalled()
  })

  it('con cita agendada: ver, cambiar de fecha y cancelar', async () => {
    const s = servicios()
    const conCita = (await chat(s, [op('afiliar'), ...DATOS, op('mod_meet'), op('dia:2026-10-02'), op('hora:2026-10-02|09:00'), op('confirmar')])).conv
    const menu = await chat(s, [txt('hola')], conCita)
    expect(ids(menu.salidas[0])[0]).toBe('mi_cita')

    const mover = await chat(s, [op('mi_cita'), op('cita_cambiar'), op('dia:2026-10-05'), op('hora:2026-10-05|14:00'), op('confirmar')], conCita)
    expect(s.reprogramar).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ idEvento: 'ev1' }), '2026-10-05', '14:00')
    expect(mover.conv.cita).toMatchObject({ fecha: '2026-10-05', hora: '14:00' })
    expect(textoDe(mover.salidas)).toContain('Cambié tu cita')

    const cancelar = await chat(s, [op('mi_cita'), op('cita_cancelar'), op('cancelar_si')], conCita)
    expect(s.cancelar).toHaveBeenCalled()
    expect(cancelar.conv.cita).toBeNull()
  })
})

describe('bot · soporte y persona', () => {
  it('responde solo y cierra si se resolvió', async () => {
    const s = servicios()
    const r = await chat(s, [op('soporte'), txt('Barbería El Corte'), op('sop:logo'), op('sop_si')])
    expect(r.conv.paso).toBe('inicio')
    expect(r.conv.modo).toBe('bot')
    expect(s.soporte).not.toHaveBeenCalled()
  })

  it('si no se resolvió abre un caso y pasa a modo humano', async () => {
    const s = servicios()
    const r = await chat(s, [op('soporte'), txt('Barbería El Corte'), op('sop:alerta'), op('sop_no'), txt('No me suena la alerta'), { tipo: 'imagen', mediaId: 'CAP1' }])
    expect(s.soporte).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ negocio: 'Barbería El Corte', tema: 'Alerta de las citas', descripcion: 'No me suena la alerta', captura: 'CAP1' }))
    expect(r.conv.modo).toBe('humano')
    expect(r.conv.etiqueta).toBe('soporte')
    expect(textoDe(r.salidas)).toContain('#42')
  })

  it('en modo humano el bot no responde, salvo "menú"', async () => {
    const s = servicios()
    const r = await chat(s, [op('persona'), txt('hola?')])
    expect(r.salidas).toEqual([])
    expect(s.persona).toHaveBeenCalledTimes(1)
    const r2 = await chat(s, [txt('menu')], r.conv)
    expect(r2.conv.modo).toBe('bot')
  })

  it('después de 24 h sin escribir vuelve al bot y empieza de nuevo', async () => {
    const s = servicios()
    const r = await chat(s, [op('persona')])
    const despues = await procesar(r.conv, txt('hola'), AHORA + 25 * 3600_000, s)
    expect(despues.conv.modo).toBe('bot')
    expect(ids(despues.salidas[0])).toContain('afiliar')
  })

  it('horario de atención: lunes a sábado de 8 a 18 en Caracas', () => {
    expect(enHorario(AHORA)).toBe(true) // jueves 3 p. m.
    expect(enHorario(Date.UTC(2026, 9, 4, 15))).toBe(false) // domingo
    expect(enHorario(Date.UTC(2026, 9, 1, 23, 30))).toBe(false) // jueves 7:30 p. m.
  })
})
