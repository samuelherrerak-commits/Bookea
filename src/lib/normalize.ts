import { DEFAULT_WHATSAPP } from '../config'
import type { BusinessConfig, BusyRange, Catalog, Money, Promo, Sede, Service, Tasa, ThemeEstilo } from '../types'
import { parseHHMM } from './format'
import { derivarAcento } from './color'
import { capitalizar, etiquetaLugar, sedeId } from './lugar'
import { elegirPlantilla, PLANTILLAS_MENSAJE, type PlantillaMensaje } from './mensajes'
import { ESTILOS, paletaPorNombre } from './theme'

// ---------- Normalización: la hoja la llena una persona, así que se tolera de todo ----------

export type Row = Record<string, unknown>

export function toNumber(value: unknown, fallback = 0): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : fallback
  if (typeof value !== 'string') return fallback
  let s = value.replace(/[^\d.,-]/g, '')
  if (s.includes(',') && s.includes('.')) {
    // "1.234,56" (es-VE) o "1,234.56" (en-US): el último separador es el decimal.
    s = s.lastIndexOf(',') > s.lastIndexOf('.') ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '')
  } else if (s.includes(',')) {
    s = s.replace(',', '.')
  }
  const n = Number.parseFloat(s)
  return Number.isFinite(n) ? n : fallback
}

export const str = (value: unknown) => (value === null || value === undefined ? '' : String(value).trim())

/** "Duración (min)" → "duracionmin": sin acentos, mayúsculas, espacios ni símbolos. */
export function normKey(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
}

/** "Nivelación Gel" → "nivelacion-gel". Debe coincidir con slug_ del Apps Script. */
export function slug(value: string): string {
  return (
    value
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'item'
  )
}

/** Lee una columna aceptando variantes del encabezado ("Duracion_Min", "Duración", "duracion min"). */
export function pick(row: Row, ...names: string[]): unknown {
  const wanted = names.map(normKey)
  for (const [k, v] of Object.entries(row)) if (wanted.includes(normKey(k))) return v
  return undefined
}

/** Usa el ID de la hoja o, si está vacío, uno derivado del nombre (único). */
function assignIds<T extends { id: string; nombre: string }>(items: T[]): T[] {
  const used = new Set<string>()
  return items.map((item) => {
    let id = item.id || slug(item.nombre)
    if (used.has(id)) {
      let n = 2
      while (used.has(`${id}-${n}`)) n++
      id = `${id}-${n}`
    }
    used.add(id)
    return { ...item, id }
  })
}

export function normalizeServices(rows: unknown): Service[] {
  if (!Array.isArray(rows)) return []
  const items = rows
    .map((r: Row) => {
      const tipoRaw = str(pick(r, 'Tipo', 'Categoria'))
      const adicional = /adic|extra/i.test(tipoRaw)
      return {
        id: str(pick(r, 'ID')),
        nombre: str(pick(r, 'Nombre', 'Servicio')),
        precio: toNumber(pick(r, 'Precio')),
        duracionMin: Math.max(0, Math.round(toNumber(pick(r, 'Duracion_Min', 'Duracion', 'DuracionMin', 'Minutos'), 60))),
        tipo: adicional ? ('adicional' as const) : ('base' as const),
        categoria: adicional || /^base$/i.test(tipoRaw) || !tipoRaw ? 'Servicios' : tipoRaw,
      }
    })
    .filter((s) => s.nombre)
  return assignIds(items)
}

/** Resuelve IDs o nombres de servicios (sin distinguir mayúsculas ni acentos). */
function resolveServiceRefs(refs: string[], servicios: Service[]): string[] {
  return refs
    .map((ref) => {
      const key = normKey(ref)
      return (servicios.find((s) => normKey(s.id) === key) ?? servicios.find((s) => normKey(s.nombre) === key))?.id
    })
    .filter((id): id is string => Boolean(id))
}

export function normalizePromos(rows: unknown, servicios: Service[] = []): Promo[] {
  if (!Array.isArray(rows)) return []
  const items = rows
    .map((r: Row) => {
      const refs = str(pick(r, 'Servicios_Incluidos', 'Servicios'))
        .split(/[,;|+]/)
        .map((x) => x.trim())
        .filter(Boolean)
      return {
        id: str(pick(r, 'ID')),
        nombre: str(pick(r, 'Nombre', 'Promocion')),
        servicioIds: servicios.length ? resolveServiceRefs(refs, servicios) : refs,
        precio: toNumber(pick(r, 'Precio_Promo', 'Precio')),
      }
    })
    .filter((p) => p.nombre && p.servicioIds.length > 0)
  return assignIds(items)
}

// ---------- Horario semanal ----------

const DIAS: Record<string, number> = {
  domingo: 0, dom: 0, lunes: 1, lun: 1, martes: 2, mar: 2, miercoles: 3, mie: 3,
  jueves: 4, jue: 4, viernes: 5, vie: 5, sabado: 6, sab: 6,
}

export function parseDia(value: unknown): number | null {
  const s = normKey(str(value))
  if (/^[0-6]$/.test(s)) return Number(s)
  if (s === '7') return 0
  return s in DIAS ? DIAS[s] : null
}

const emptyWeek = (): Array<Array<[number, number]>> => Array.from({ length: 7 }, () => [])

/** Filas {dia, inicio, fin} de la hoja Horarios → tramos por día. null si no hay datos. */
export function normalizeHorarios(rows: unknown): Array<Array<[number, number]>> | null {
  if (!Array.isArray(rows) || rows.length === 0) return null
  const week = emptyWeek()
  let any = false
  for (const r of rows as Row[]) {
    const dia = parseDia(pick(r, 'dia', 'Dia'))
    const inicio = parseHHMM(str(pick(r, 'inicio', 'Hora_Inicio', 'Abre')))
    const fin = parseHHMM(str(pick(r, 'fin', 'Hora_Fin', 'Cierra')))
    if (dia === null || !Number.isFinite(inicio) || !Number.isFinite(fin) || fin <= inicio) continue
    week[dia].push([inicio, fin])
    any = true
  }
  week.forEach((tramos) => tramos.sort((a, b) => a[0] - b[0]))
  return any ? week : null
}

export const DEFAULT_CONFIG: BusinessConfig = {
  nombreNegocio: 'Mi Negocio',
  marca: 'Mi Negocio',
  logoUrl: '',
  whatsapp: DEFAULT_WHATSAPP,
  horario: [[], [[540, 1140]], [[540, 1140]], [[540, 1140]], [[540, 1140]], [[540, 1140]], [[540, 1140]]],
  intervaloMin: 30,
  diasAnticipacion: 21,
  anticipacionMinHoras: 2,
  zonaHoraria: 'America/Caracas',
  pagoMovil: { banco: '', telefono: '', cedula: '' },
  // Igual que el backend: sin la clave, no hay domicilio (así el front nunca ofrece
  // algo que doPost después rechaza).
  permiteDomicilio: false,
  domicilio: { recargoPct: 20, minutosExtra: 15 },
  // Sin dirección por defecto: cada negocio pone la suya. Antes caía la de otro tenant.
  lugar: { tipo: 'local', etiqueta: 'el local', sedes: [{ id: 'principal', nombre: 'El local', direccion: '', mapsUrl: '' }] },
  mensaje: { plantilla: PLANTILLAS_MENSAJE[0].nombre, texto: PLANTILLAS_MENSAJE[0].texto },
  tema: { base: '#C08497', soft: '#FBF3F4', deep: '#6B3A48', estilo: 'elegante' },
  moneda: 'EUR',
  metodosPago: [],
  heroTitulo: 'Reserva tu cita en minutos',
  heroSubtitulo: 'Elige tus servicios, escoge el horario que prefieras y confirma por WhatsApp.',
  facturacionModo: 'interno',
}

/** Pestaña Sedes: Nombre, Direccion, Maps_URL, Activa. Las inactivas y sin nombre se ignoran. */
export function normalizeSedes(raw: unknown): Sede[] {
  if (!Array.isArray(raw)) return []
  const vistas = new Set<string>()
  const sedes: Sede[] = []
  for (const r of raw as Row[]) {
    const nombre = str(r.nombre ?? r.Nombre)
    const activa = str(r.activa ?? r.Activa ?? 'si').toLowerCase()
    if (!nombre || ['no', 'false', '0'].includes(activa)) continue
    let id = sedeId(nombre)
    while (vistas.has(id)) id += '-2'
    vistas.add(id)
    const url = str(r.mapsUrl ?? r.Maps_URL ?? r.maps_url)
    sedes.push({ id, nombre, direccion: str(r.direccion ?? r.Direccion), mapsUrl: /^https?:\/\//i.test(url) ? url : '' })
  }
  return sedes
}

/** Pestaña Mensajes: Nombre, Texto. */
export function normalizeMensajes(raw: unknown): PlantillaMensaje[] {
  if (!Array.isArray(raw)) return []
  return (raw as Row[])
    .map((r) => ({ nombre: str(r.nombre ?? r.Nombre), texto: String(r.texto ?? r.Texto ?? '').trim() }))
    .filter((m) => m.nombre && m.texto)
}

/** Logo subido desde la ventana de configuración: data URL de imagen, chico. */
const LOGO_DATA = /^data:image\/(png|webp|jpeg);base64,[A-Za-z0-9+/=]+$/
export const LOGO_MAX = 45000

export function logoSubido(valor: unknown): string {
  const v = typeof valor === 'string' ? valor.trim() : ''
  return v.length <= LOGO_MAX && LOGO_DATA.test(v) ? v : ''
}

/**
 * Un enlace de logo que una página pueda mostrar. El enlace de "Compartir" de Drive
 * abre una página, no la imagen: se pasa al enlace directo. Los de Instagram/Facebook
 * vencen y su CDN bloquea a otros sitios, así que se descartan (queda el nombre).
 */
export function logoDirecto(url: unknown): string {
  let u = typeof url === 'string' ? url.trim() : ''
  if (!u) return ''
  u = u.replace(/^http:\/\//i, 'https://')
  if (!/^https:\/\//i.test(u)) return ''
  const drive =
    /drive\.google\.com\/file\/d\/([\w-]{10,})/.exec(u) ||
    /drive\.google\.com\/(?:open|uc|thumbnail)\?(?:[^#]*&)?id=([\w-]{10,})/.exec(u)
  if (drive) return `https://lh3.googleusercontent.com/d/${drive[1]}=w400`
  if (/cdninstagram\.com|fbcdn\.net|instagram\.com\/|facebook\.com\//i.test(u)) return ''
  return u
}

export function normalizeConfig(
  raw: unknown,
  horariosRaw?: unknown,
  extra: { sedes?: unknown; mensajes?: unknown; logo?: unknown } = {},
): BusinessConfig {
  const map: Record<string, string> = {}
  if (Array.isArray(raw)) {
    for (const r of raw as Row[]) if (str(r.Clave)) map[str(r.Clave).toLowerCase()] = str(r.Valor)
  } else if (raw && typeof raw === 'object') {
    for (const [k, v] of Object.entries(raw)) map[k.toLowerCase()] = str(v)
  }
  const int = (key: string, fallback: number) => {
    const n = Math.round(toNumber(map[key], Number.NaN))
    return Number.isFinite(n) && n >= 0 ? n : fallback
  }
  const d = DEFAULT_CONFIG

  // Horario: pestaña Horarios; si no existe (script anterior), las claves de Configuracion.
  let horario = normalizeHorarios(horariosRaw)
  if (!horario) {
    const abre = parseHHMM(map.hora_apertura ?? '')
    const cierra = parseHHMM(map.hora_cierre ?? '')
    const dias = (map.dias_laborales ?? '')
      .split(/[,;\s]+/)
      .map(parseDia)
      .filter((n): n is number => n !== null)
    if (Number.isFinite(abre) && Number.isFinite(cierra) && cierra > abre) {
      horario = emptyWeek()
      for (const dia of dias.length ? dias : [1, 2, 3, 4, 5, 6]) horario[dia] = [[abre, cierra]]
    } else {
      horario = d.horario
    }
  }

  const bool = (key: string, fallback: boolean) => {
    const v = (map[key] ?? '').trim().toLowerCase()
    if (!v) return fallback
    return v === 'si' || v === 'true' || v === '1' || v === 'yes'
  }
  const hex = (key: string, fallback: string) => {
    // En la hoja es fácil olvidar el "#": "1F6F5C" también vale.
    const v = (map[key] ?? '').trim()
    return /^#?(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(v) ? (v.startsWith('#') ? v : `#${v}`) : fallback
  }
  // Precedencia: color_principal > tema_base/soft/deep > paleta del dropdown > default.
  // color_principal gana porque es la opción simple: hojas viejas pueden tener
  // tema_base/soft/deep escritos, y si mandaran esos el color nuevo no se vería nunca.
  // El fondo es independiente: si falta, la app usa sus neutros crema de siempre.
  const fondo = hex('color_fondo', '') || undefined
  const principal = hex('color_principal', '')
  const acento = principal ? derivarAcento(principal, fondo) : null
  const paleta = paletaPorNombre(map.paleta ?? '')
  const estiloRaw = (map.tema_estilo ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
  const MONEDAS: readonly Money[] = ['EUR', 'USD', 'BS']
  const monedaRaw = (map.moneda ?? '').trim().toUpperCase()

  // Lugar: el tipo da la etiqueta ("el consultorio"). Sin pestaña Sedes (hojas viejas)
  // la dirección de siempre (direccion_spa) arma una sede única con ese nombre.
  const lugarTipo = (map.lugar_tipo ?? '').trim().toLowerCase() || 'spa'
  const etiqueta = etiquetaLugar(lugarTipo, map.lugar_nombre ?? '')
  let sedes = normalizeSedes(extra.sedes)
  if (!sedes.length) {
    const url = (map.direccion_spa_url ?? '').trim()
    sedes = [
      {
        id: 'principal',
        nombre: capitalizar(etiqueta),
        direccion: (map.direccion_spa ?? '').trim(),
        mapsUrl: /^https?:\/\//i.test(url) ? url : '',
      },
    ]
  }
  const plantilla = elegirPlantilla(normalizeMensajes(extra.mensajes), map.mensaje_plantilla ?? '')

  const whatsapp = (map.whatsapp ?? '').replace(/\D/g, '')
  return {
    nombreNegocio: map.nombre_negocio || d.nombreNegocio,
    marca: map.marca || d.marca,
    // El logo subido gana; si no hay, el enlace (corregido si es de Drive).
    logoUrl: logoSubido(extra.logo) || logoDirecto(map.logo_url) || d.logoUrl,
    whatsapp: whatsapp || d.whatsapp,
    horario,
    intervaloMin: int('intervalo_min', d.intervaloMin) || d.intervaloMin,
    diasAnticipacion: int('dias_anticipacion', d.diasAnticipacion) || d.diasAnticipacion,
    anticipacionMinHoras: int('anticipacion_min_horas', d.anticipacionMinHoras),
    zonaHoraria: map.zona_horaria || d.zonaHoraria,
    pagoMovil: {
      banco: map.pm_banco ?? '',
      telefono: map.pm_telefono ?? '',
      cedula: map.pm_cedula ?? '',
    },
    permiteDomicilio: bool('permite_domicilio', d.permiteDomicilio),
    domicilio: {
      recargoPct: map.recargo_domicilio_pct ? toNumber(map.recargo_domicilio_pct, d.domicilio.recargoPct) : d.domicilio.recargoPct,
      minutosExtra: int('minutos_extra_domicilio', d.domicilio.minutosExtra),
    },
    lugar: { tipo: lugarTipo, etiqueta, sedes },
    mensaje: { plantilla: plantilla.nombre, texto: plantilla.texto },
    tema: {
      base: acento?.base ?? hex('tema_base', paleta?.base ?? d.tema.base),
      soft: acento?.soft ?? hex('tema_soft', paleta?.soft ?? d.tema.soft),
      deep: acento?.deep ?? hex('tema_deep', paleta?.deep ?? d.tema.deep),
      estilo: ESTILOS.includes(estiloRaw as ThemeEstilo) ? (estiloRaw as ThemeEstilo) : d.tema.estilo,
      ...(fondo ? { fondo } : {}),
    },
    moneda: MONEDAS.includes(monedaRaw as Money) ? (monedaRaw as Money) : d.moneda,
    metodosPago: (map.metodos_pago ?? '')
      .split(',')
      .map((x) => x.trim())
      .filter(Boolean),
    heroTitulo: map.hero_titulo || d.heroTitulo,
    heroSubtitulo: map.hero_subtitulo || d.heroSubtitulo,
    facturacionModo: (map.facturacion_modo ?? '').trim().toLowerCase() === 'fiscal' ? 'fiscal' : 'interno',
  }
}

export function normalizeTasa(raw: unknown): Tasa | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Row
  const valor = toNumber(r.valor, 0)
  if (!(valor > 0)) return null
  return { valor, fecha: str(r.fecha) || null, fuente: str(r.fuente) || 'BCV' }
}

export function normalizeCitas(rows: unknown): BusyRange[] {
  if (!Array.isArray(rows)) return []
  return rows
    .map((r: Row) => ({ inicio: new Date(str(r.inicio)), fin: new Date(str(r.fin)) }))
    .filter((c) => !Number.isNaN(c.inicio.getTime()) && !Number.isNaN(c.fin.getTime()) && c.fin > c.inicio)
}

export function normalizeCatalog(data: Row): Catalog {
  const servicios = normalizeServices(data.servicios)
  return {
    servicios,
    promociones: normalizePromos(data.promociones, servicios),
    config: normalizeConfig(data.config, data.horarios, { sedes: data.sedes, mensajes: data.mensajes, logo: data.logo }),
    tasa: normalizeTasa(data.tasa),
    citas: normalizeCitas(data.citasAgendadas),
  }
}
