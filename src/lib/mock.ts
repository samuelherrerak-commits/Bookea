import { DEFAULT_WHATSAPP } from '../config'
import type { Catalog, Coupon, ReservationPayload, ReservationResult } from '../types'
import { ApiError } from './errors'
import { PLANTILLAS_MENSAJE } from './mensajes'
import { normalizeCatalog } from './normalize'
import { addDays, zonedParts } from './slots'

// Datos de ejemplo con la misma forma que devuelve el Apps Script.
// Se usan solo cuando VITE_API_URL está vacío (desarrollo / demo).

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))

const SERVICIOS = [
  { ID: 'S1', Nombre: 'Manicure semipermanente', Precio: 12, Duracion_Min: 60, Tipo: 'Base' },
  { ID: 'S2', Nombre: 'Pedicure semipermanente', Precio: 15, Duracion_Min: 60, Tipo: 'Base' },
  { ID: 'S3', Nombre: 'Uñas acrílicas · set completo', Precio: 25, Duracion_Min: 120, Tipo: 'Base' },
  { ID: 'S4', Nombre: 'Polygel natural', Precio: 22, Duracion_Min: 90, Tipo: 'Base' },
  { ID: 'S5', Nombre: 'Relleno acrílico', Precio: 16, Duracion_Min: 75, Tipo: 'Base' },
  { ID: 'S6', Nombre: 'Manicure tradicional', Precio: 6, Duracion_Min: 45, Tipo: 'Base' },
  { ID: 'A1', Nombre: 'Nail art a mano (2 uñas)', Precio: 3, Duracion_Min: 15, Tipo: 'Adicional' },
  { ID: 'A2', Nombre: 'Francés o baby boomer', Precio: 4, Duracion_Min: 15, Tipo: 'Adicional' },
  { ID: 'A3', Nombre: 'Retiro de producto', Precio: 3, Duracion_Min: 20, Tipo: 'Adicional' },
  { ID: 'A4', Nombre: 'Spa de manos', Precio: 5, Duracion_Min: 15, Tipo: 'Adicional' },
  { ID: 'A5', Nombre: 'Efecto cromado', Precio: 4, Duracion_Min: 10, Tipo: 'Adicional' },
]

const PROMOCIONES = [
  { ID: 'P1', Nombre: 'Mani + Pedi', Servicios_Incluidos: 'S1, S2', Precio_Promo: 24 },
  { ID: 'P2', Nombre: 'Acrílicas con arte', Servicios_Incluidos: 'S3, A1', Precio_Promo: 25 },
  { ID: 'P3', Nombre: 'Manos de spa', Servicios_Incluidos: 'S1, A4', Precio_Promo: 15 },
]

const CONFIG = {
  nombre_negocio: 'ByMariaNails',
  whatsapp: DEFAULT_WHATSAPP,
  hora_apertura: '09:00',
  hora_cierre: '19:00',
  intervalo_min: '30',
  dias_laborales: '1,2,3,4,5,6',
  dias_anticipacion: '21',
  anticipacion_min_horas: '2',
  zona_horaria: 'America/Caracas',
  pm_banco: 'Banesco (0134)',
  pm_telefono: '0412-2516390',
  pm_cedula: 'V-12.345.678',
  recargo_domicilio_pct: '20',
  minutos_extra_domicilio: '15',
  permite_domicilio: 'si',
  lugar_tipo: 'spa',
  mensaje_plantilla: 'Cálida',
  direccion_spa: '',
  direccion_spa_url: 'https://maps.app.goo.gl/MBfSuyGHQrRRcDp17',
}

const SEDES_DEMO = [
  { Nombre: 'Sede Centro', Direccion: 'Av. Libertador, local 12', Maps_URL: 'https://maps.app.goo.gl/MBfSuyGHQrRRcDp17', Activa: 'si' },
  { Nombre: 'Sede Norte', Direccion: 'C.C. El Norte, piso 2', Maps_URL: '', Activa: 'si' },
]

const CUPONES: Record<string, Coupon> = {
  BIENVENIDA: { codigo: 'BIENVENIDA', porcentaje: 10, monto: 0 },
  MARIA5: { codigo: 'MARIA5', porcentaje: 0, monto: 5 },
}

/** Citas ocupadas relativas a hoy (hora de Caracas, UTC−4). */
function demoCitas() {
  const today = zonedParts(new Date(), 'America/Caracas').ymd
  const at = (days: number, from: string, to: string) => ({
    inicio: `${addDays(today, days)}T${from}:00-04:00`,
    fin: `${addDays(today, days)}T${to}:00-04:00`,
  })
  return [
    at(0, '13:00', '15:00'),
    at(1, '09:00', '10:30'),
    at(1, '14:00', '16:00'),
    at(2, '10:00', '13:00'),
    at(2, '15:30', '17:00'),
    at(3, '09:00', '19:00'),
    at(4, '11:00', '12:00'),
    at(5, '16:00', '18:30'),
  ]
}

/** Otros rubros para la vista previa (?rubro=), así las capturas no son todas de uñas. */
const RUBROS: Record<string, { servicios: typeof SERVICIOS; promociones: typeof PROMOCIONES }> = {
  barberia: {
    servicios: [
      { ID: 'B1', Nombre: 'Corte clásico', Precio: 10, Duracion_Min: 30, Tipo: 'Cortes' },
      { ID: 'B2', Nombre: 'Corte y barba', Precio: 16, Duracion_Min: 45, Tipo: 'Cortes' },
      { ID: 'B3', Nombre: 'Fade con diseño', Precio: 14, Duracion_Min: 45, Tipo: 'Cortes' },
      { ID: 'B4', Nombre: 'Perfilado de barba', Precio: 7, Duracion_Min: 20, Tipo: 'Barba' },
      { ID: 'B5', Nombre: 'Afeitado con toalla caliente', Precio: 12, Duracion_Min: 30, Tipo: 'Barba' },
      { ID: 'BA1', Nombre: 'Cejas', Precio: 3, Duracion_Min: 10, Tipo: 'Adicional' },
      { ID: 'BA2', Nombre: 'Mascarilla negra', Precio: 5, Duracion_Min: 15, Tipo: 'Adicional' },
    ],
    promociones: [
      { ID: 'BP1', Nombre: 'Corte + barba + cejas', Servicios_Incluidos: 'B2, BA1', Precio_Promo: 17 },
      { ID: 'BP2', Nombre: 'Día del padre', Servicios_Incluidos: 'B1, B5', Precio_Promo: 19 },
    ],
  },
  estetica: {
    servicios: [
      { ID: 'E1', Nombre: 'Limpieza facial profunda', Precio: 25, Duracion_Min: 60, Tipo: 'Facial' },
      { ID: 'E2', Nombre: 'Hidratación con ácido hialurónico', Precio: 30, Duracion_Min: 50, Tipo: 'Facial' },
      { ID: 'E3', Nombre: 'Masaje relajante', Precio: 35, Duracion_Min: 60, Tipo: 'Corporal' },
      { ID: 'E4', Nombre: 'Drenaje linfático', Precio: 32, Duracion_Min: 60, Tipo: 'Corporal' },
      { ID: 'E5', Nombre: 'Diseño de cejas', Precio: 10, Duracion_Min: 30, Tipo: 'Mirada' },
      { ID: 'EA1', Nombre: 'Aromaterapia', Precio: 5, Duracion_Min: 10, Tipo: 'Adicional' },
    ],
    promociones: [
      { ID: 'EP1', Nombre: 'Facial + masaje', Servicios_Incluidos: 'E1, E3', Precio_Promo: 52 },
      { ID: 'EP2', Nombre: 'Glow express', Servicios_Incluidos: 'E2, EA1', Precio_Promo: 31 },
    ],
  },
}

/**
 * Solo en demo: ?estilo=&principal=&fondo=&marca=&rubro= arman el negocio de ejemplo.
 * Sirve para ver y capturar las plantillas sin tocar una hoja. En producción el
 * mock no se usa, así que el negocio real solo se configura desde su hoja.
 */
function previewOverrides(): { config: Record<string, string>; rubro: string; sedes: string } {
  if (typeof window === 'undefined') return { config: {}, rubro: '', sedes: '' }
  const q = new URLSearchParams(window.location.search)
  const config: Record<string, string> = {}
  const set = (param: string, key: string) => {
    const v = q.get(param)
    if (v) config[key] = v
  }
  set('estilo', 'tema_estilo')
  set('principal', 'color_principal')
  set('fondo', 'color_fondo')
  set('marca', 'marca')
  set('titulo', 'hero_titulo')
  set('subtitulo', 'hero_subtitulo')
  set('lugar', 'lugar_tipo')
  set('domicilio', 'permite_domicilio')
  set('mensaje', 'mensaje_plantilla')
  return { config, rubro: q.get('rubro') ?? '', sedes: q.get('sedes') ?? '' }
}

export async function mockFetchData(): Promise<Catalog> {
  await wait(650)
  const preview = previewOverrides()
  const rubro = RUBROS[preview.rubro]
  return normalizeCatalog({
    servicios: rubro?.servicios ?? SERVICIOS,
    promociones: rubro?.promociones ?? PROMOCIONES,
    config: { ...CONFIG, ...preview.config },
    // ?sedes=2 muestra un negocio con dos sedes (una sola agenda).
    sedes: preview.sedes === '2' ? SEDES_DEMO : [],
    mensajes: PLANTILLAS_MENSAJE.map((p) => ({ Nombre: p.nombre, Texto: p.texto })),
    tasa: { valor: 412.35, fecha: new Date().toISOString().slice(0, 10), fuente: 'BCV (demo)' },
    citasAgendadas: demoCitas(),
  })
}

export async function mockValidateCoupon(codigo: string): Promise<Coupon> {
  await wait(450)
  const c = CUPONES[codigo]
  if (!c) throw new ApiError('cupon_invalido', 'Este cupón no existe o ya se agotó.')
  return c
}

let reciboDemo = 0

export async function mockSubmitReservation(payload: ReservationPayload): Promise<ReservationResult> {
  await wait(900)
  console.info('[demo] Reservación que se enviaría al Apps Script:', {
    ...payload,
    comprobante: payload.comprobante ? `${payload.comprobante.nombre} (${payload.comprobante.base64.length} caracteres)` : null,
  })
  return {
    id: crypto.randomUUID(),
    total: payload.total,
    totalBs: null,
    tasa: null,
    comprobanteUrl: payload.comprobante ? 'https://drive.google.com/file/d/demo/view' : null,
    recibo: ++reciboDemo,
  }
}
