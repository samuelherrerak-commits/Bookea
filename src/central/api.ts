/**
 * Central de bookeaa: lo que ve y hace el administrador (correos de dueno_admins).
 * Habla con el Apps Script maestro (accion: 'central') con la sesión de "Entrar con Google".
 */
import { API_URL, DEMO_MODE } from '../config'

export type EstadoCobro = 'activo' | 'prueba' | 'pendiente' | 'vencido' | 'suspendido' | 'sin_fecha'

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

// ---------- Cobros: pagos reportados por los negocios y movimientos del banco ----------

export interface Movimiento {
  clave: string
  fecha: string
  referencia: string
  descripcion: string
  monto: number
  /** 'correo' o 'estado de cuenta'. */
  fuente: string
  pagoId: string
}

export interface PagoNegocio {
  id: string
  registrado: string
  slug: string
  negocio: string
  fecha: string
  banco: string
  telefono: string
  referencia: string
  montoBs: number
  tasa: number
  montoUsd: number
  meses: number
  estado: string
  conciliado: string
  motivo: string
  /** Movimiento del banco que se le parece (mismo monto o referencia), para revisar a mano. */
  pista?: Movimiento | null
}

export interface PagoMovilDatos {
  banco: string
  telefono: string
  cedula: string
  titular: string
}

export interface LecturaCorreos {
  fecha: string
  leidos: number
  abonos: number
  nuevos: number
  sinDatos: number
  aprobados: number
}

export interface Cobros {
  porVerificar: PagoNegocio[]
  revisados: PagoNegocio[]
  movimientos: Movimiento[]
  tasa: number
  ajustes: {
    pagoMovil: PagoMovilDatos
    correoQuery: string
    ultimaLectura: LecturaCorreos | null
    automaticos: { correos: boolean; cortes: boolean }
  }
}

/** Una fila leída del estado de cuenta (la arma estadoCuenta.ts). */
export interface FilaBanco {
  fecha: string
  referencia: string
  descripcion: string
  monto: number
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

export const cobros = (sesion: string) => (DEMO_MODE ? demo.cobros() : llamar<Cobros>({ op: 'cobros', sesion }))

export const aprobar = (sesion: string, id: string) =>
  DEMO_MODE ? demo.revisar(id, true) : llamar<{ ok: boolean; vence?: string }>({ op: 'aprobar', sesion, id })

export const rechazar = (sesion: string, id: string, motivo: string) =>
  DEMO_MODE ? demo.revisar(id, false, motivo) : llamar<{ ok: boolean }>({ op: 'rechazar', sesion, id, motivo })

/** Sube los movimientos del estado de cuenta; el servidor guarda los nuevos y concilia. */
export const subirMovimientos = (sesion: string, filas: FilaBanco[]) =>
  DEMO_MODE ? demo.movimientos(filas) : llamar<{ ok: boolean; nuevos: number; aprobados: number }>({ op: 'movimientos', sesion, filas })

export const leerCorreos = (sesion: string) => (DEMO_MODE ? demo.leer() : llamar<LecturaCorreos>({ op: 'leer_correos', sesion }))

export const instalarCobros = (sesion: string) =>
  DEMO_MODE ? demo.instalar() : llamar<{ ok: boolean }>({ op: 'instalar_cobros', sesion })

export const ajustesCobro = (sesion: string, d: { pagoMovil?: Partial<PagoMovilDatos>; correoQuery?: string }) =>
  DEMO_MODE ? demo.ajustes(d) : llamar<{ ok: boolean }>({ op: 'ajustes_cobro', sesion, ...d })

/** Pone la fecha de corte según el día del mes en que entró el negocio. */
export const usarIngreso = (sesion: string, slug: string) =>
  DEMO_MODE ? demo.ingreso(slug) : llamar<{ ok: boolean; vence: string }>({ op: 'usar_ingreso', sesion, slug })

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
      n.estado = !n.activo ? 'suspendido' : !n.vence ? 'sin_fecha' : n.vence < h ? (Math.round((Date.parse(h) - Date.parse(n.vence)) / 86400_000) <= 3 ? 'pendiente' : 'vencido') : n.ultimoPago ? 'activo' : 'prueba'
    }
    const c = (e: EstadoCobro) => negocios.filter((n) => n.estado === e).length
    return {
      hoy: h,
      precio: 10,
      totales: { activos: c('activo'), prueba: c('prueba'), pendientes: c('pendiente') + c('vencido'), suspendidos: c('suspendido'), sinFecha: c('sin_fecha'), porVencer: negocios.filter((n) => (n.estado === 'activo' || n.estado === 'prueba') && (n.dias ?? 99) <= 5).length },
      negocios: structuredClone(negocios),
      pagos: structuredClone(pagos),
      prospectos: structuredClone(prospectos),
    }
  }
  const espera = <T,>(v: T) => new Promise<T>((ok) => setTimeout(() => ok(v), 350))
  const tasa = 39.5
  const reportes: PagoNegocio[] = [
    { id: 'p3', registrado: `${hoy()}T09:12`, slug: 'barberia-norte', negocio: 'Barbería Norte', fecha: hoy(), banco: 'Banesco (0134)', telefono: '04121112233', referencia: '003418274651', montoBs: 395, tasa, montoUsd: 10, meses: 1, estado: 'Por verificar', conciliado: '', motivo: '' },
    { id: 'p2', registrado: `${dias(-1)}T18:40`, slug: 'estudio-luz', negocio: 'Estudio Luz', fecha: dias(-1), banco: 'Mercantil (0105)', telefono: '04245550000', referencia: '88120034', montoBs: 790, tasa, montoUsd: 20, meses: 2, estado: 'Por verificar', conciliado: '', motivo: '' },
    { id: 'p1', registrado: `${dias(-6)}T10:20`, slug: 'consultorio-diaz', negocio: 'Consultorio Díaz', fecha: dias(-6), banco: 'Banco de Venezuela (0102)', telefono: '04165556677', referencia: '004512', montoBs: 392, tasa: 39.2, montoUsd: 10, meses: 1, estado: 'Aprobado', conciliado: 'correo', motivo: '' },
  ]
  const movs: Movimiento[] = [
    { clave: 'm1', fecha: hoy(), referencia: '3418274651', descripcion: 'PAGO MOVIL RECIBIDO 04121112233', monto: 395, fuente: 'correo', pagoId: '' },
    { clave: 'm2', fecha: dias(-2), referencia: '55120987', descripcion: 'PAGO MOVIL RECIBIDO', monto: 120, fuente: 'estado de cuenta', pagoId: '' },
  ]
  const ajustes: Cobros['ajustes'] = {
    pagoMovil: { banco: 'Banco de Venezuela (0102)', telefono: '04120000000', cedula: 'V-12345678', titular: 'bookeaa' },
    correoQuery: 'from:(bdvenlinea OR banvenez OR bancodevenezuela) newer_than:7d',
    ultimaLectura: { fecha: new Date(Date.now() - 7 * 60_000).toISOString(), leidos: 4, abonos: 2, nuevos: 1, sinDatos: 2, aprobados: 0 },
    automaticos: { correos: false, cortes: false },
  }
  const cobrosDemo = (): Cobros => {
    const libres = movs.filter((m) => !m.pagoId)
    const ultimos4 = (r: string) => r.slice(-4)
    return {
      porVerificar: reportes.filter((p) => p.estado === 'Por verificar').map((p) => ({ ...p, pista: libres.find((m) => Math.abs(m.monto - p.montoBs) <= 0.5 || ultimos4(m.referencia) === ultimos4(p.referencia)) ?? null })),
      revisados: structuredClone(reportes.filter((p) => p.estado !== 'Por verificar')),
      movimientos: structuredClone(libres),
      tasa,
      ajustes: structuredClone(ajustes),
    }
  }
  return {
    cobros: () => espera(cobrosDemo()),
    revisar: (id: string, ok: boolean, motivo = '') => {
      const p = reportes.find((x) => x.id === id)!
      let vence: string | undefined
      p.estado = ok ? 'Aprobado' : 'Rechazado'
      p.motivo = motivo
      if (ok) {
        const m = movs.find((x) => !x.pagoId && Math.abs(x.monto - p.montoBs) <= 0.5)
        if (m) m.pagoId = id
        const n = negocios.find((x) => x.slug === p.slug)
        if (n) {
          const f = new Date((n.vence && n.vence >= hoy() ? n.vence : hoy()) + 'T12:00:00Z')
          f.setUTCMonth(f.getUTCMonth() + p.meses)
          n.vence = f.toISOString().slice(0, 10)
          n.ultimoPago = hoy()
          n.activo = true
          vence = n.vence
        }
      }
      return espera({ ok: true, vence })
    },
    movimientos: (filas: FilaBanco[]) => {
      let nuevos = 0
      for (const f of filas) {
        const clave = `${f.fecha}|${f.referencia}|${f.monto}`
        if (movs.some((m) => m.clave === clave)) continue
        movs.unshift({ clave, ...f, fuente: 'estado de cuenta', pagoId: '' })
        nuevos++
      }
      return espera({ ok: true, nuevos, aprobados: 0 })
    },
    leer: () => {
      ajustes.ultimaLectura = { fecha: new Date().toISOString(), leidos: 3, abonos: 1, nuevos: 0, sinDatos: 2, aprobados: 0 }
      return espera(ajustes.ultimaLectura)
    },
    instalar: () => {
      ajustes.automaticos = { correos: true, cortes: true }
      return espera({ ok: true })
    },
    ajustes: (d: { pagoMovil?: Partial<PagoMovilDatos>; correoQuery?: string }) => {
      Object.assign(ajustes.pagoMovil, d.pagoMovil)
      if (d.correoQuery !== undefined) ajustes.correoQuery = d.correoQuery
      return espera({ ok: true })
    },
    ingreso: (slug: string) => {
      const n = negocios.find((x) => x.slug === slug)!
      const [y, m, d] = n.creado.split('-').map(Number)
      const h = hoy()
      let k = 1
      let v = ''
      do {
        const f = new Date(Date.UTC(y, m - 1 + k, 1))
        const ultimo = new Date(Date.UTC(f.getUTCFullYear(), f.getUTCMonth() + 1, 0)).getUTCDate()
        f.setUTCDate(Math.min(d, ultimo))
        v = f.toISOString().slice(0, 10)
        k++
      } while (v < h)
      n.vence = v
      return espera({ ok: true, vence: v })
    },
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
