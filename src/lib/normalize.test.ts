import { describe, expect, it } from 'vitest'
import { DEFAULT_CONFIG, LOGO_MAX, logoDirecto, normalizeCatalog, normalizeConfig, normalizeHorarios, normalizeServices, slug, toNumber } from './normalize'

describe('toNumber', () => {
  it('entiende formatos es-VE y en-US', () => {
    expect(toNumber(12)).toBe(12)
    expect(toNumber('12,5')).toBe(12.5)
    expect(toNumber('1.234,56')).toBe(1234.56)
    expect(toNumber('1,234.56')).toBe(1234.56)
    expect(toNumber('15 €')).toBe(15)
    expect(toNumber('', 7)).toBe(7)
  })
})

describe('slug', () => {
  it('quita acentos y espacios', () => {
    expect(slug('Nivelación Gel')).toBe('nivelacion-gel')
    expect(slug('  Uñas  (2) ')).toBe('unas-2')
  })
})

describe('respuesta real de la hoja (ID vacío, Tipo = categoría)', () => {
  const real = {
    servicios: [
      { ID: '', Nombre: 'Manicure', Precio: 13, Duracion_Min: 60, Tipo: 'Manos' },
      { ID: '', Nombre: 'Nivelacion', Precio: 15, Duracion_Min: 60, Tipo: 'Manos' },
      { ID: '', Nombre: 'Kapping', Precio: 17, Duracion_Min: 60, Tipo: 'Manos' },
      { ID: '', Nombre: 'Sistema', Precio: 20, Duracion_Min: 60, Tipo: 'Manos' },
    ],
    promociones: [],
    config: { nombre_negocio: 'MARIA NAILS', hora_apertura: '9:00', hora_cierre: '19:00', dias_laborales: '1,2,3,4,5,6' },
    tasa: { valor: 974.06, fecha: '2026-09-24T00:00:00-04:00', fuente: 'BCV (vía DolarApi)' },
    citasAgendadas: [],
  }

  it('muestra los 4 servicios con IDs derivados del nombre', () => {
    const c = normalizeCatalog(real)
    expect(c.servicios.map((s) => s.id)).toEqual(['manicure', 'nivelacion', 'kapping', 'sistema'])
    expect(c.servicios.every((s) => s.tipo === 'base' && s.categoria === 'Manos')).toBe(true)
  })

  it('arma el horario desde Configuracion cuando no hay pestaña Horarios', () => {
    const c = normalizeCatalog(real)
    expect(c.config.horario[0]).toEqual([])
    expect(c.config.horario[1]).toEqual([[540, 1140]])
    expect(c.tasa?.valor).toBe(974.06)
  })
})

describe('normalizeServices', () => {
  it('tolera encabezados con acentos y nombres repetidos', () => {
    const s = normalizeServices([
      { Nombre: 'Arte', 'Precio ($)': '3,5', 'Duración': '15', Tipo: 'Adicional' },
      { ID: '', Nombre: 'Arte', Precio: 4, Duracion_Min: 20, Tipo: '' },
      { ID: 'X', Nombre: '', Precio: 1 },
    ])
    expect(s).toHaveLength(2)
    expect(s[0]).toMatchObject({ id: 'arte', precio: 3.5, duracionMin: 15, tipo: 'adicional' })
    expect(s[1]).toMatchObject({ id: 'arte-2', tipo: 'base', categoria: 'Servicios' })
  })
})

describe('normalizeCatalog', () => {
  it('promos aceptan IDs o nombres de servicios', () => {
    const c = normalizeCatalog({
      servicios: [
        { ID: 'S1', Nombre: 'Manicure', Precio: 12, Duracion_Min: 60, Tipo: 'Manos' },
        { ID: '', Nombre: 'Pedicure Spa', Precio: 15, Duracion_Min: 60, Tipo: 'Pies' },
      ],
      promociones: [
        { ID: '', Nombre: 'Combo', Servicios_Incluidos: 's1, pedicure spa', Precio_Promo: '24' },
        { ID: 'P2', Nombre: 'Rota', Servicios_Incluidos: 'no existe', Precio_Promo: 5 },
      ],
      config: {},
      citasAgendadas: [{ inicio: '2026-09-24T14:00:00.000Z', fin: '2026-09-24T15:00:00.000Z' }, { inicio: 'x', fin: 'y' }],
    })
    expect(c.promociones).toHaveLength(1)
    expect(c.promociones[0]).toMatchObject({ id: 'combo', servicioIds: ['S1', 'pedicure-spa'], precio: 24 })
    expect(c.citas).toHaveLength(1)
  })
})

describe('normalizeHorarios', () => {
  it('acepta días en texto, tramos múltiples y días cerrados', () => {
    const h = normalizeHorarios([
      { dia: 'Lunes', inicio: '9:00', fin: '12:00' },
      { dia: 'lunes', inicio: '14:00', fin: '19:00' },
      { dia: 'Sábado', inicio: '09:00', fin: '14:00' },
      { dia: 'Domingo', inicio: '', fin: '' },
      { dia: 'Miercoles', inicio: '10:00', fin: '09:00' }, // inválido
    ])!
    expect(h[1]).toEqual([[540, 720], [840, 1140]])
    expect(h[6]).toEqual([[540, 840]])
    expect(h[0]).toEqual([])
    expect(h[3]).toEqual([])
  })

  it('la pestaña Horarios tiene prioridad sobre Configuracion', () => {
    const cfg = normalizeConfig({ hora_apertura: '08:00', hora_cierre: '20:00' }, [{ dia: 2, inicio: '10:00', fin: '16:00' }])
    expect(cfg.horario[2]).toEqual([[600, 960]])
    expect(cfg.horario[1]).toEqual([])
  })

  it('usa valores por defecto y el WhatsApp del negocio si la hoja está vacía', () => {
    const cfg = normalizeConfig([])
    expect(cfg.whatsapp).toBe('584122516390')
    expect(cfg.horario[1]).toEqual([[540, 1140]])
    expect(cfg.zonaHoraria).toBe('America/Caracas')
  })
})

describe('paleta y textos del negocio', () => {
  it('la paleta elegida del dropdown define los tres colores', () => {
    const cfg = normalizeConfig({ paleta: 'Azul Noche' })
    expect(cfg.tema).toMatchObject({ base: '#8FA8C8', soft: '#E6EDF6', deep: '#3E5A80' })
  })

  it('un hex escrito a mano gana sobre la paleta', () => {
    const cfg = normalizeConfig({ paleta: 'Azul Noche', tema_deep: '#ABCDEF' })
    expect(cfg.tema.deep).toBe('#ABCDEF')
    expect(cfg.tema.base).toBe('#8FA8C8')
  })

  it('ignora una paleta desconocida, un hex inválido y un estilo inexistente', () => {
    const cfg = normalizeConfig({ paleta: 'fucsia', tema_base: 'no soy un color', tema_estilo: 'fugaz' })
    expect(cfg.tema.base).toBe(DEFAULT_CONFIG.tema.base)
    expect(cfg.tema.estilo).toBe(DEFAULT_CONFIG.tema.estilo)
  })

  it('color_principal gana sobre la paleta y los hex a mano, y acepta hex sin #', () => {
    const cfg = normalizeConfig({ paleta: 'Azul Noche', tema_base: '#ABCDEF', color_principal: '1F6F5C' })
    expect(cfg.tema.base).toBe('#1F6F5C')
    expect(cfg.tema.deep).toBe('#1F6F5C')
    expect(cfg.tema.soft).not.toBe('#E6EDF6')
  })

  it('color_fondo llega al tema; sin él no hay fondo propio', () => {
    expect(normalizeConfig({ color_fondo: '#111111' }).tema.fondo).toBe('#111111')
    expect(normalizeConfig({}).tema.fondo).toBeUndefined()
    expect(normalizeConfig({ color_fondo: 'negro' }).tema.fondo).toBeUndefined()
  })

  it('reconoce los estilos nuevos, con o sin tilde', () => {
    expect(normalizeConfig({ tema_estilo: 'Audaz' }).tema.estilo).toBe('audaz')
    expect(normalizeConfig({ tema_estilo: 'clásico' }).tema.estilo).toBe('clasico')
  })

  it('los textos del hero nunca llegan vacíos a la pantalla', () => {
    const cfg = normalizeConfig([])
    expect(cfg.heroTitulo).not.toBe('')
    expect(cfg.heroSubtitulo).not.toBe('')
  })

  it('no hereda la dirección de otro negocio', () => {
    const cfg = normalizeConfig([])
    expect(cfg.lugar.sedes).toHaveLength(1)
    expect(cfg.lugar.sedes[0]).toMatchObject({ direccion: '', mapsUrl: '' })
  })
})

describe('lugar, sedes, domicilio y mensaje', () => {
  it('sin lugar_tipo sigue siendo "el spa" y la dirección vieja arma la sede única', () => {
    const cfg = normalizeConfig({ direccion_spa: 'Urb. X, local 3', direccion_spa_url: 'https://maps.app.goo.gl/x' })
    expect(cfg.lugar.etiqueta).toBe('el spa')
    expect(cfg.lugar.sedes).toEqual([
      { id: 'principal', nombre: 'El spa', direccion: 'Urb. X, local 3', mapsUrl: 'https://maps.app.goo.gl/x' },
    ])
  })

  it('el tipo de lugar da la etiqueta; "otro" usa lugar_nombre', () => {
    expect(normalizeConfig({ lugar_tipo: 'consultorio' }).lugar.etiqueta).toBe('el consultorio')
    expect(normalizeConfig({ lugar_tipo: 'Barbería' }).lugar.etiqueta).toBe('la barbería')
    expect(normalizeConfig({ lugar_tipo: 'otro', lugar_nombre: 'Casa Ana' }).lugar.etiqueta).toBe('Casa Ana')
  })

  it('la pestaña Sedes manda: ignora inactivas y filas sin nombre, ids únicos', () => {
    const cfg = normalizeConfig({ direccion_spa: 'vieja' }, undefined, {
      sedes: [
        { Nombre: 'Sede Centro', Direccion: 'Av. 1', Maps_URL: 'https://maps.app.goo.gl/a', Activa: true },
        { Nombre: 'Sede Norte', Direccion: 'Av. 2', Maps_URL: 'no es url', Activa: 'si' },
        { Nombre: 'Cerrada', Activa: false },
        { Nombre: '', Direccion: 'sin nombre' },
      ],
    })
    expect(cfg.lugar.sedes.map((s) => s.id)).toEqual(['sede-centro', 'sede-norte'])
    expect(cfg.lugar.sedes[1].mapsUrl).toBe('')
  })

  it('domicilio igual que el backend: vacío o "no" = no se ofrece', () => {
    expect(normalizeConfig({}).permiteDomicilio).toBe(false)
    expect(normalizeConfig({ permite_domicilio: 'no' }).permiteDomicilio).toBe(false)
    expect(normalizeConfig({ permite_domicilio: 'Si' }).permiteDomicilio).toBe(true)
  })

  it('el mensaje sale de la pestaña Mensajes según mensaje_plantilla', () => {
    const mensajes = [
      { Nombre: 'Cálida', Texto: 'A {nombre}' },
      { Nombre: 'Formal', Texto: 'B {nombre}' },
    ]
    expect(normalizeConfig({ mensaje_plantilla: 'formal' }, undefined, { mensajes }).mensaje.texto).toBe('B {nombre}')
    expect(normalizeConfig({}, undefined, { mensajes }).mensaje.texto).toBe('A {nombre}')
    expect(normalizeConfig({ mensaje_plantilla: 'Breve' }).mensaje.plantilla).toBe('Breve')
  })
})

describe('logo del negocio', () => {
  const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='

  it('el logo subido gana sobre el enlace', () => {
    const c = normalizeConfig({ logo_url: 'https://ejemplo.com/logo.png' }, undefined, { logo: PNG })
    expect(c.logoUrl).toBe(PNG)
  })

  it('un logo subido raro se ignora y queda el enlace', () => {
    for (const malo of ['javascript:alert(1)', 'data:text/html;base64,PGgxPg==', 'data:image/svg+xml;base64,PHN2Zz4=', PNG + 'A'.repeat(LOGO_MAX)]) {
      expect(normalizeConfig({ logo_url: 'https://ejemplo.com/l.png' }, undefined, { logo: malo }).logoUrl).toBe('https://ejemplo.com/l.png')
    }
  })

  it('los enlaces de Drive pasan al enlace directo de la imagen', () => {
    const id = '1AbCdEfGhIjKlMnOpQrStUvWxYz012345'
    for (const u of [
      `https://drive.google.com/file/d/${id}/view?usp=sharing`,
      `https://drive.google.com/open?id=${id}`,
      `https://drive.google.com/uc?export=view&id=${id}`,
    ]) {
      expect(logoDirecto(u)).toBe(`https://lh3.googleusercontent.com/d/${id}=w400`)
    }
  })

  it('http pasa a https; Instagram y Facebook se descartan', () => {
    expect(logoDirecto('http://ejemplo.com/logo.png')).toBe('https://ejemplo.com/logo.png')
    expect(logoDirecto('https://scontent.cdninstagram.com/v/t51/logo.jpg?oe=1')).toBe('')
    expect(logoDirecto('https://www.instagram.com/p/abc/')).toBe('')
    expect(logoDirecto('ftp://x/logo.png')).toBe('')
    expect(logoDirecto(undefined)).toBe('')
  })
})

describe('ticket de reserva en la configuración', () => {
  it('viene activo por defecto y "no" lo apaga', () => {
    expect(normalizeConfig({}).ticketReserva).toBe(true)
    expect(normalizeConfig({ ticket_reserva: 'si' }).ticketReserva).toBe(true)
    expect(normalizeConfig({ ticket_reserva: 'no' }).ticketReserva).toBe(false)
    expect(normalizeConfig({ ticket_reserva: 'NO ' }).ticketReserva).toBe(false)
  })
})
