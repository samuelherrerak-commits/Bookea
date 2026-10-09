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

// ---------- Datos de ejemplo (sin VITE_API_URL) ----------

function sumarDias(ymd: string, n: number) {
  const [a, m, d] = ymd.split('-').map(Number)
  return new Date(Date.UTC(a, m - 1, d + n, 12)).toISOString().slice(0, 10)
}

export function hoyCaracas(ahora = Date.now()): string {
  return new Date(ahora - 4 * 3600_000).toISOString().slice(0, 10)
}

const DEMO = {
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
