/**
 * "Mi negocio": lo que el dueño ve y hace desde su app. Habla con el Apps Script
 * maestro (accion: 'dueno'); la sesión la firma el Apps Script después de verificar
 * la cuenta de Google.
 */
import { API_URL, DEMO_MODE } from '../config'

export interface Negocio {
  slug: string
  nombre: string
}

export interface Sesion {
  sesion: string
  email: string
  negocios: Negocio[]
  /** Clave pública VAPID para suscribirse a los avisos ('' si el Worker no está configurado). */
  vapid: string
}

export interface Cita {
  id: string
  cliente: string
  telefono: string
  servicios: string
  total: number
  totalBs: number | null
  fecha: string
  hora: string
  metodo: string
  estado: string
  lugar: string
  direccion: string
  capture: string
  recibo: number | null
}

export interface Agenda {
  negocio: { slug: string; nombre: string; moneda: 'EUR' | 'USD' | 'BS' }
  hoy: string
  citas: Cita[]
}

export class ErrorNegocio extends Error {
  constructor(public codigo: string, mensaje: string) {
    super(mensaje)
  }
}

async function llamar<T>(datos: Record<string, unknown>): Promise<T> {
  let r: Response
  try {
    r = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ accion: 'dueno', ...datos }),
      redirect: 'follow',
    })
  } catch {
    throw new ErrorNegocio('red', 'No pudimos conectar. Revisa tu conexión.')
  }
  const json = (await r.json().catch(() => null)) as (T & { error?: string; mensaje?: string }) | null
  if (!json) throw new ErrorNegocio('red', 'El servidor no respondió bien. Intenta de nuevo.')
  if (json.error) throw new ErrorNegocio(json.error, json.mensaje || 'No se pudo completar.')
  return json
}

export function entrar(credencial: string): Promise<Sesion> {
  if (DEMO_MODE) return Promise.resolve(DEMO.sesion)
  return llamar<Sesion>({ op: 'entrar', credencial })
}

export function citas(sesion: string, slug: string, desde: string, dias: number): Promise<Agenda> {
  if (DEMO_MODE) return Promise.resolve(DEMO.agenda(desde))
  return llamar<Agenda>({ op: 'citas', sesion, slug, desde, dias })
}

export function confirmarPago(sesion: string, slug: string, id: string): Promise<{ ok: boolean; estado: string }> {
  if (DEMO_MODE) return Promise.resolve({ ok: true, estado: 'Confirmada' })
  return llamar({ op: 'confirmar_pago', sesion, slug, id })
}

export function avisos(sesion: string, slug: string, suscripcion: PushSubscriptionJSON, quitar = false): Promise<{ ok: boolean }> {
  if (DEMO_MODE) return Promise.resolve({ ok: true })
  return llamar({ op: 'avisos', sesion, slug, suscripcion, quitar })
}

// ---------- Configuración ----------

export interface Servicio {
  id: string
  nombre: string
  precio: number
  duracion: number
  categoria: string
  adicional: boolean
}
export interface Horario {
  dia: string
  inicio: string
  fin: string
}
export interface Sede {
  nombre: string
  direccion: string
  mapsUrl: string
  activa: boolean
}
export interface Mensaje {
  nombre: string
  texto: string
}
export interface Bloqueo {
  fecha: string
  inicio: string
  fin: string
  motivo: string
}
export interface Cupon {
  codigo: string
  /** 1–100, o 0 si descuenta un monto. */
  porcentaje: number
  /** En la moneda del negocio, o 0 si descuenta un porcentaje. */
  monto: number
  /** Usos que quedan; null = ilimitado. */
  usos: number | null
}
export interface Configuracion {
  config: Record<string, string>
  paginaUrl: string
  servicios: Servicio[]
  horarios: Horario[]
  sedes: Sede[]
  mensajes: Mensaje[]
  bloqueos: Bloqueo[]
  cupones: Cupon[]
  /** data URL del logo subido ('' si no hay). */
  logo: string
}
export type Seccion = 'servicios' | 'horario' | 'bloqueos' | 'cupones' | 'marca' | 'estilo' | 'logo' | 'lugar' | 'pagos' | 'mensaje' | 'comprobantes'
export interface DatosSeccion {
  config?: Record<string, string>
  servicios?: Servicio[]
  horarios?: Horario[]
  sedes?: Sede[]
  mensajes?: Mensaje[]
  bloqueos?: Bloqueo[]
  cupones?: Cupon[]
  logo?: string
}
export interface Guardado {
  ok: boolean
  errores: string[]
  datos?: Configuracion
}

export function leerConfiguracion(sesion: string, slug: string): Promise<Configuracion> {
  if (DEMO_MODE) return Promise.resolve(structuredClone(DEMO.configuracion))
  return llamar<Configuracion>({ op: 'config', sesion, slug })
}

export function guardar(sesion: string, slug: string, seccion: Seccion, datos: DatosSeccion): Promise<Guardado> {
  if (DEMO_MODE) {
    const c = DEMO.configuracion
    Object.assign(c.config, datos.config ?? {})
    for (const k of ['servicios', 'horarios', 'sedes', 'mensajes', 'bloqueos', 'cupones'] as const) if (datos[k]) (c[k] as unknown) = datos[k]
    if (seccion === 'logo') c.logo = datos.logo ?? ''
    return new Promise((ok) => setTimeout(() => ok({ ok: true, errores: [], datos: structuredClone(c) }), 400))
  }
  return llamar<Guardado>({ op: 'guardar', sesion, slug, seccion, datos })
}

// ---------- Datos de ejemplo (sin VITE_API_URL) ----------

function sumarDias(ymd: string, n: number) {
  const [a, m, d] = ymd.split('-').map(Number)
  return new Date(Date.UTC(a, m - 1, d + n, 12)).toISOString().slice(0, 10)
}

export function hoyCaracas(ahora = Date.now()): string {
  return new Date(ahora - 4 * 3600_000).toISOString().slice(0, 10)
}

const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']

const DEMO = {
  configuracion: {
    config: {
      nombre_negocio: 'Barbería Norte', marca: 'Barbería Norte', logo_url: '', hero_titulo: 'Tu corte, cuando quieras', hero_subtitulo: 'Reserva en 1 minuto.',
      tema_estilo: 'moderno', color_principal: '#7FA894', color_fondo: '', paleta: 'Bosque',
      lugar_tipo: 'barberia', lugar_nombre: '', permite_domicilio: 'no', recargo_domicilio_pct: '20', minutos_extra_domicilio: '15',
      mensaje_plantilla: 'Clásica', intervalo_min: '30', dias_anticipacion: '30', anticipacion_min_horas: '2', zona_horaria: 'America/Caracas', recordatorio_minutos: '60',
      whatsapp: '584121234567', moneda: 'EUR', metodos_pago: 'Pago en la cita, Bolívares (Pago Móvil)', pm_banco: 'Banesco', pm_telefono: '04121234567', pm_cedula: 'V-12345678',
      tasa_eur_manual: '', tasa_usd_manual: '', facturacion_modo: 'interno', ticket_reserva: 'si', facturacion_rif: '', facturacion_razon_social: '', facturacion_proveedor: '',
    },
    paginaUrl: '/u/demo',
    servicios: [
      { id: 'corte', nombre: 'Corte', precio: 10, duracion: 30, categoria: 'Cabello', adicional: false },
      { id: 'corte-y-barba', nombre: 'Corte y barba', precio: 16, duracion: 45, categoria: 'Cabello', adicional: false },
      { id: 'barba', nombre: 'Barba', precio: 8, duracion: 20, categoria: 'Barba', adicional: false },
      { id: 'lavado', nombre: 'Lavado', precio: 3, duracion: 10, categoria: '', adicional: true },
    ],
    horarios: DIAS.flatMap((dia, i) => (i < 5 ? [{ dia, inicio: '09:00', fin: '13:00' }, { dia, inicio: '14:00', fin: '18:00' }] : i === 5 ? [{ dia, inicio: '09:00', fin: '14:00' }] : [{ dia, inicio: '', fin: '' }])),
    sedes: [{ nombre: 'Sede Centro', direccion: 'Av. Libertador, local 12', mapsUrl: '', activa: true }],
    mensajes: [{ nombre: 'Clásica', texto: 'Hola {negocio}, soy {nombre}. Reservé {servicios} el {fecha} a las {hora}.' }],
    bloqueos: [{ fecha: sumarDias(hoyCaracas(), 6), inicio: '', fin: '', motivo: 'Vacaciones' }],
    cupones: [{ codigo: 'OCTUBRE10', porcentaje: 10, monto: 0, usos: null }, { codigo: 'BIENVENIDA', porcentaje: 0, monto: 2, usos: 15 }],
    logo: '',
  } as Configuracion,

  sesion: { sesion: 'demo', email: 'demo@gmail.com', negocios: [{ slug: 'demo', nombre: 'Barbería Norte' }], vapid: '' } as Sesion,
  agenda(desde: string): Agenda {
    const hoy = hoyCaracas()
    const c = (id: string, fecha: string, hora: string, cliente: string, servicios: string, extra: Partial<Cita> = {}): Cita => ({
      id, cliente, telefono: '0412 555 1234', servicios, total: 16, totalBs: null, fecha, hora, metodo: 'Pago en la cita',
      estado: 'Confirmada', lugar: 'En la barbería', direccion: 'Av. Libertador, local 12', capture: '', recibo: Number(id.replace(/\D/g, '')) || null, ...extra,
    })
    return {
      negocio: { slug: 'demo', nombre: 'Barbería Norte', moneda: 'EUR' },
      hoy,
      citas: [
        c('1', hoy, '09:00', 'Ana Pérez', 'Corte de dama'),
        c('2', hoy, '10:30', 'Carlos Méndez', 'Corte y barba', { metodo: 'Bolívares (Pago Móvil)', estado: 'Pago por verificar', capture: 'https://drive.google.com/', totalBs: 640 }),
        c('3', hoy, '14:00', 'Luis Rojas', 'Barba'),
        c('4', hoy, '17:30', 'María Gómez', 'Corte y cejas', { lugar: 'A domicilio', direccion: 'Ubicación por WhatsApp' }),
        c('5', sumarDias(hoy, 1), '11:00', 'Pedro Silva', 'Corte'),
        c('6', sumarDias(hoy, 3), '15:30', 'Rosa Díaz', 'Tinte'),
      ].filter((x) => x.fecha >= desde),
    }
  },
}
