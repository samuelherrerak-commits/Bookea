/**
 * Central de bookeaa: lo que ve y hace el administrador (correos de dueno_admins).
 * Habla con el Apps Script maestro (accion: 'central') con la sesión de "Entrar con Google".
 */
import { API_URL, DEMO_MODE } from '../config'

export type EstadoCobro = 'activo' | 'prueba' | 'pendiente' | 'suspendido' | 'sin_fecha'

export interface Negocio {
  slug: string
  nombre: string
  email: string
  telefono: string
  creado: string
  /** yyyy-MM-dd o ''. */
  vence: string
  ultimoPago: string
  notas: string
  activo: boolean
  estado: EstadoCobro
  /** Días hasta el vencimiento (negativo = vencido); null sin fecha. */
  dias: number | null
  hoja: string
}

export interface Pago {
  fecha: string
  slug: string
  negocio: string
  monto: number
  meses: number
  metodo: string
  referencia: string
  venceNuevo: string
}

export interface Prospecto {
  fecha: string
  telefono: string
  nombre: string
  negocio: string
  correo: string
  modalidad: string
  cita: string
  estado: string
}

export interface Resumen {
  hoy: string
  precio: number
  totales: { activos: number; prueba: number; pendientes: number; suspendidos: number; sinFecha: number; porVencer: number }
  negocios: Negocio[]
  pagos: Pago[]
  prospectos: Prospecto[]
}

export class ErrorCentral extends Error {
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
      body: JSON.stringify({ accion: 'central', ...datos }),
      redirect: 'follow',
    })
  } catch {
    throw new ErrorCentral('red', 'No pudimos conectar. Revisa tu conexión.')
  }
  const json = (await r.json().catch(() => null)) as (T & { error?: string; mensaje?: string }) | null
  if (!json) throw new ErrorCentral('red', 'El servidor no respondió bien. Intenta de nuevo.')
  if (json.error) throw new ErrorCentral(json.error, json.mensaje || 'No se pudo completar.')
  return json
}

export const resumen = (sesion: string) => (DEMO_MODE ? demo.resumen() : llamar<Resumen>({ op: 'resumen', sesion }))

export const registrarPago = (sesion: string, d: { slug: string; meses: number; monto: number; metodo: string; referencia: string }) =>
  DEMO_MODE ? demo.pago(d) : llamar<{ ok: boolean; vence: string }>({ op: 'pago', sesion, ...d })

export const crear = (sesion: string, d: { nombre: string; slug: string; email: string; telefono: string; diasPrueba: number; notas: string }) =>
  DEMO_MODE ? demo.crear(d) : llamar<{ ok: boolean; slug: string; hoja: string }>({ op: 'crear', sesion, ...d })

export const cambiarActivo = (sesion: string, slug: string, activo: boolean) =>
  DEMO_MODE ? demo.activo(slug, activo) : llamar<{ ok: boolean }>({ op: 'activo', sesion, slug, activo })

export const editar = (sesion: string, slug: string, campos: Partial<Pick<Negocio, 'email' | 'telefono' | 'notas' | 'vence'>>) =>
  DEMO_MODE ? demo.editar(slug, campos) : llamar<{ ok: boolean }>({ op: 'editar', sesion, slug, ...campos })

/** "Barbería El Corte" → "barberia-el-corte" (como lo valida crearTenant). */
export function slugDe(nombre: string): string {
  return nombre
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 32)
    .replace(/-+$/, '')
}

/** "0412 555 1234" → "584125551234". */
export function telefonoWa(tel: string): string {
  const d = tel.replace(/\D/g, '')
  return d.startsWith('0') ? `58${d.slice(1)}` : d
}

// ---------- Datos de ejemplo (sin VITE_API_URL) ----------

const hoy = () => new Date(Date.now() - 4 * 3600_000).toISOString().slice(0, 10)
const dias = (n: number) => new Date(Date.now() - 4 * 3600_000 + n * 86400_000).toISOString().slice(0, 10)

const demo = (() => {
  const negocios: Negocio[] = [
    { slug: 'barberia-norte', nombre: 'Barbería Norte', email: 'norte@gmail.com', telefono: '584121112233', creado: dias(-70), vence: dias(-3), ultimoPago: dias(-33), notas: '', activo: true, estado: 'pendiente', dias: -3, hoja: '' },
    { slug: 'spa-sol', nombre: 'Spa Sol', email: 'spasol@gmail.com', telefono: '584142223344', creado: dias(-40), vence: dias(2), ultimoPago: dias(-28), notas: 'Paga por Zelle', activo: true, estado: 'activo', dias: 2, hoja: '' },
    { slug: 'unas-mariana', nombre: 'Uñas Mariana', email: 'mariana@gmail.com', telefono: '584243334455', creado: dias(-10), vence: dias(20), ultimoPago: '', notas: '', activo: true, estado: 'prueba', dias: 20, hoja: '' },
    { slug: 'consultorio-diaz', nombre: 'Consultorio Díaz', email: 'diaz@gmail.com', telefono: '584165556677', creado: dias(-100), vence: dias(24), ultimoPago: dias(-6), notas: '', activo: true, estado: 'activo', dias: 24, hoja: '' },
    { slug: 'estudio-luz', nombre: 'Estudio Luz', email: 'luz@gmail.com', telefono: '', creado: dias(-120), vence: dias(-40), ultimoPago: dias(-70), notas: 'No respondió', activo: false, estado: 'suspendido', dias: -40, hoja: '' },
  ]
  const pagos: Pago[] = [
    { fecha: `${dias(-6)}T10:20`, slug: 'consultorio-diaz', negocio: 'Consultorio Díaz', monto: 10, meses: 1, metodo: 'Pago Móvil', referencia: '004512', venceNuevo: dias(24) },
    { fecha: `${dias(-28)}T16:05`, slug: 'spa-sol', negocio: 'Spa Sol', monto: 10, meses: 1, metodo: 'Zelle', referencia: '', venceNuevo: dias(2) },
  ]
  const prospectos: Prospecto[] = [
    { fecha: dias(-1), telefono: '584128889900', nombre: 'José', negocio: 'Barbería El Corte', correo: 'elcorte@gmail.com', modalidad: 'Presencial', cita: `${dias(5)}T09:30`, estado: 'Agendada' },
  ]
  const recalcular = (): Resumen => {
    const h = hoy()
    for (const n of negocios) {
      n.dias = n.vence ? Math.round((Date.parse(n.vence) - Date.parse(h)) / 86400_000) : null
      n.estado = !n.activo ? 'suspendido' : !n.vence ? 'sin_fecha' : n.vence < h ? 'pendiente' : n.ultimoPago ? 'activo' : 'prueba'
    }
    const c = (e: EstadoCobro) => negocios.filter((n) => n.estado === e).length
    return {
      hoy: h,
      precio: 10,
      totales: { activos: c('activo'), prueba: c('prueba'), pendientes: c('pendiente'), suspendidos: c('suspendido'), sinFecha: c('sin_fecha'), porVencer: negocios.filter((n) => (n.estado === 'activo' || n.estado === 'prueba') && (n.dias ?? 99) <= 5).length },
      negocios: structuredClone(negocios),
      pagos: structuredClone(pagos),
      prospectos: structuredClone(prospectos),
    }
  }
  const espera = <T,>(v: T) => new Promise<T>((ok) => setTimeout(() => ok(v), 350))
  return {
    resumen: () => espera(recalcular()),
    pago: (d: { slug: string; meses: number; monto: number; metodo: string; referencia: string }) => {
      const n = negocios.find((x) => x.slug === d.slug)!
      const base = n.vence && n.vence >= hoy() ? n.vence : hoy()
      const f = new Date(base)
      f.setUTCMonth(f.getUTCMonth() + d.meses)
      n.vence = f.toISOString().slice(0, 10)
      n.ultimoPago = hoy()
      n.activo = true
      pagos.unshift({ fecha: `${hoy()}T12:00`, slug: n.slug, negocio: n.nombre, monto: d.monto, meses: d.meses, metodo: d.metodo, referencia: d.referencia, venceNuevo: n.vence })
      return espera({ ok: true, vence: n.vence })
    },
    crear: (d: { nombre: string; slug: string; email: string; telefono: string; diasPrueba: number; notas: string }) => {
      negocios.unshift({ slug: d.slug, nombre: d.nombre, email: d.email, telefono: d.telefono, creado: hoy(), vence: dias(d.diasPrueba), ultimoPago: '', notas: d.notas, activo: true, estado: 'prueba', dias: d.diasPrueba, hoja: '' })
      return espera({ ok: true, slug: d.slug, hoja: '' })
    },
    activo: (slug: string, activo: boolean) => {
      negocios.find((x) => x.slug === slug)!.activo = activo
      return espera({ ok: true })
    },
    editar: (slug: string, campos: Partial<Negocio>) => {
      Object.assign(negocios.find((x) => x.slug === slug)!, campos)
      return espera({ ok: true })
    },
  }
})()
