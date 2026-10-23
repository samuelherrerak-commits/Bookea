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

// ---------- Métricas (panel de computadora) ----------

export interface NegocioMetricas {
  slug: string
  nombre: string
  estado: EstadoCobro
  creado: string
  vence: string
  dias: number | null
  /** null si no se pudo leer su hoja. */
  reservas30: number | null
  previas30: number | null
  proximas: number | null
  clientes: number | null
  ultimaReserva: string
  /** Reservas de los últimos 6 meses (el último es el mes en curso). */
  porMes: number[]
  error: string
}

export interface Metricas {
  hoy: string
  generado: string
  precio: number
  /** 'yyyy-MM', los últimos 12 meses. */
  meses: string[]
  /** Lo cobrado por bookeaa (USD) en cada mes. */
  ingresos: number[]
  altas: number[]
  /** Reservas de todos los negocios en cada mes. */
  reservas: number[]
  negocios: NegocioMetricas[]
}

export interface Ranking {
  nombre: string
  n: number
}

export interface EstadisticasNegocio {
  meses: string[]
  porMes: number[]
  ingresosMes: number[]
  canceladasMes: number[]
  clientesNuevosMes: number[]
  total: number
  canceladas: number
  ultimos30: number
  previos30: number
  ingresos30: number
  ingresosPrevios30: number
  proximas: number
  ultimaSolicitud: string
  clientes: number
  recurrentes: number
  conCupon: number
  ticket: number
  servicios: (Ranking & { ingresos: number })[]
  metodos: Ranking[]
  modalidades: Ranking[]
  estados: Ranking[]
  horas: { desde: number; hasta: number; dias: string[]; mapa: number[][] }
}

export interface DetalleNegocio {
  negocio: Negocio
  config: { marca: string; moneda: 'USD' | 'EUR' | 'BS'; whatsapp: string; lugar: string; metodos: string; servicios: number; ticket: boolean }
  estadisticas: EstadisticasNegocio
  recientes: { cliente: string; servicios: string; total: number; fecha: string; hora: string; estado: string; metodo: string }[]
  pagos: Pago[]
  reportes: PagoNegocio[]
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

/** Quién es el administrador y dónde está el Worker del conector de Claude (bot_bandeja_url). */
export const yo = (sesion: string) =>
  DEMO_MODE ? Promise.resolve({ email: 'demo@gmail.com', conector: '' }) : llamar<{ email: string; conector: string }>({ op: 'yo', sesion })

export const resumen = (sesion: string) => (DEMO_MODE ? demo.resumen() : llamar<Resumen>({ op: 'resumen', sesion }))

export const registrarPago = (sesion: string, d: { slug: string; meses: number; monto: number; metodo: string; referencia: string }) =>
  DEMO_MODE ? demo.pago(d) : llamar<{ ok: boolean; vence: string }>({ op: 'pago', sesion, ...d })

export const crear = (sesion: string, d: { nombre: string; slug: string; email: string; telefono: string; diasPrueba: number; notas: string }) =>
  DEMO_MODE ? demo.crear(d) : llamar<{ ok: boolean; slug: string; hoja: string }>({ op: 'crear', sesion, ...d })

export const cambiarActivo = (sesion: string, slug: string, activo: boolean) =>
  DEMO_MODE ? demo.activo(slug, activo) : llamar<{ ok: boolean }>({ op: 'activo', sesion, slug, activo })

export const editar = (sesion: string, slug: string, campos: Partial<Pick<Negocio, 'email' | 'telefono' | 'notas' | 'vence'>>) =>
  DEMO_MODE ? demo.editar(slug, campos) : llamar<{ ok: boolean }>({ op: 'editar', sesion, slug, ...campos })

export const metricas = (sesion: string, fresco = false) =>
  DEMO_MODE ? demo.metricas() : llamar<Metricas>({ op: 'metricas', sesion, fresco })

export const detalleNegocio = (sesion: string, slug: string) =>
  DEMO_MODE ? demo.detalle(slug) : llamar<DetalleNegocio>({ op: 'negocio', sesion, slug })

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

// ---------- Marketing: calendario y cola de publicaciones ----------

export type EstadoPublicacion = 'borrador' | 'aprobado' | 'publicado' | 'omitido'
export interface Publicacion {
  id: string
  /** yyyy-MM-dd */
  fecha: string
  /** HH:mm, hora de Caracas */
  hora: string
  tipo: string
  titulo: string
  plataforma: string
  caption: string
  hashtags: string
  media: string
  estado: EstadoPublicacion
  publicadoEn: string
  notas: string
}
export type CamposPublicacion = Partial<Pick<Publicacion, 'estado' | 'fecha' | 'hora' | 'titulo' | 'caption' | 'hashtags' | 'media' | 'notas'>>

export const marketing = (sesion: string) =>
  DEMO_MODE ? demoMarketing.leer() : llamar<{ publicaciones: Publicacion[] }>({ op: 'marketing', sesion })

export const marketingGuardar = (sesion: string, id: string, campos: CamposPublicacion) =>
  DEMO_MODE ? demoMarketing.guardar(id, campos) : llamar<{ ok: boolean }>({ op: 'marketing_guardar', sesion, id, ...campos })

export const marketingImportar = (sesion: string, filas: Omit<Publicacion, 'publicadoEn'>[]) =>
  DEMO_MODE ? demoMarketing.importar(filas) : llamar<{ ok: boolean; agregadas: number }>({ op: 'marketing_importar', sesion, filas })

const demoMarketing = (() => {
  let lista: Publicacion[] = []
  const espera = <T,>(v: T) => new Promise<T>((ok) => setTimeout(() => ok(v), 250))
  return {
    leer: () => espera({ publicaciones: structuredClone(lista) }),
    guardar: (id: string, campos: CamposPublicacion) => {
      Object.assign(lista.find((x) => x.id === id) ?? {}, campos)
      return espera({ ok: true })
    },
    importar: (filas: Omit<Publicacion, 'publicadoEn'>[]) => {
      const nuevas = filas.filter((f) => !lista.some((x) => x.id === f.id)).map((f) => ({ ...f, publicadoEn: '' }))
      lista = [...lista, ...nuevas]
      return espera({ ok: true, agregadas: nuevas.length })
    },
  }
})()

// ---------- TikTok: conectar la cuenta y mandar videos como borrador ----------

export interface EstadoTikTok {
  configurado: boolean
  conectado: boolean
  usuario: string
  /** Redirect URI que debe estar registrada en la app de TikTok. */
  redirect: string
  /** Pista de la Client key en uso (primeras y últimas 4 letras) y si parece de sandbox (empieza con "sb"). */
  pista?: string
  sandbox?: boolean
}

export const tiktokEstado = (sesion: string) =>
  DEMO_MODE ? demoTikTok.estado() : llamar<EstadoTikTok>({ op: 'tiktok_estado', sesion })

export const tiktokUrl = (sesion: string) =>
  DEMO_MODE ? demoTikTok.url() : llamar<{ url: string }>({ op: 'tiktok_url', sesion })

export const tiktokConectar = (sesion: string, code: string, state: string) =>
  DEMO_MODE ? demoTikTok.conectar() : llamar<{ ok: boolean; usuario: string }>({ op: 'tiktok_conectar', sesion, code, state })

export const tiktokDesconectar = (sesion: string) =>
  DEMO_MODE ? demoTikTok.desconectar() : llamar<{ ok: boolean }>({ op: 'tiktok_desconectar', sesion })

export const tiktokEnviar = (sesion: string, id: string) =>
  DEMO_MODE ? demoTikTok.enviar() : llamar<{ ok: boolean; publishId: string; usuario: string }>({ op: 'tiktok_enviar', sesion, id })

const demoTikTok = (() => {
  let conectado = false
  const espera = <T,>(v: T) => new Promise<T>((ok) => setTimeout(() => ok(v), 250))
  return {
    estado: () => espera<EstadoTikTok>({ configurado: true, conectado, usuario: conectado ? 'bookeaa (demo)' : '', redirect: 'https://bookeaa.com/central' }),
    url: () => espera({ url: '#tiktok-demo' }),
    conectar: () => { conectado = true; return espera({ ok: true, usuario: 'bookeaa (demo)' }) },
    desconectar: () => { conectado = false; return espera({ ok: true }) },
    enviar: () => espera({ ok: true, publishId: 'demo', usuario: 'bookeaa (demo)' }),
  }
})()

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
  // Números de ejemplo estables (no cambian al recargar).
  const azar = (semilla: number) => () => ((semilla = (semilla * 16807) % 2147483647) - 1) / 2147483646
  const mesesDemo = () => {
    const [y, m] = hoy().split('-').map(Number)
    return Array.from({ length: 12 }, (_, i) => new Date(Date.UTC(y, m - 12 + i, 1)).toISOString().slice(0, 7))
  }
  const serie = (semilla: number, base: number, crece: number, desde = 0) => {
    const r = azar(semilla)
    return mesesDemo().map((_, i) => (i < desde ? 0 : Math.max(0, Math.round(base + crece * (i - desde) + (r() - 0.5) * base * 0.6))))
  }
  const ritmo: Record<string, [number, number, number]> = {
    'barberia-norte': [40, 2, 2], 'spa-sol': [22, 1.5, 6], 'unas-mariana': [12, 0, 11], 'consultorio-diaz': [30, -1.2, 0], 'estudio-luz': [8, -1, 0],
  }
  const metricasDemo = (): Metricas => {
    const r = recalcular()
    const meses = mesesDemo()
    const negociosM = r.negocios.map((n, k): NegocioMetricas => {
      const [b, c, d] = ritmo[n.slug] ?? [10, 0.5, 6]
      const porMes = serie(k + 3, b, c, d)
      if (n.slug === 'estudio-luz') porMes.splice(-3, 3, 2, 0, 0)
      if (n.slug === 'unas-mariana') porMes[11] = 9
      return {
        slug: n.slug, nombre: n.nombre, estado: n.estado, creado: n.creado, vence: n.vence, dias: n.dias,
        reservas30: porMes[11] + Math.round(porMes[10] * 0.4), previas30: porMes[10], proximas: Math.round(porMes[11] * 0.6),
        clientes: Math.round(porMes.reduce((a, v) => a + v, 0) * 0.45), ultimaReserva: n.slug === 'estudio-luz' ? dias(-52) : dias(-1), porMes: porMes.slice(-6), error: '',
      }
    })
    const reservas = meses.map((_, i) => negociosM.reduce((a, n) => a + (serie(negociosM.indexOf(n) + 3, ...(ritmo[n.slug] ?? [10, 0.5, 6]))[i] ?? 0), 0))
    return {
      hoy: r.hoy, generado: new Date().toISOString(), precio: 10, meses,
      ingresos: serie(11, 20, 3.2, 2).map((v) => v - (v % 10)),
      altas: [0, 0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 1],
      reservas, negocios: negociosM,
    }
  }
  const detalleDemo = (slug: string): DetalleNegocio => {
    const n = recalcular().negocios.find((x) => x.slug === slug) ?? recalcular().negocios[0]
    const m = metricasDemo().negocios.find((x) => x.slug === n.slug)!
    const [b, c, d] = ritmo[n.slug] ?? [10, 0.5, 6]
    const porMes = serie(recalcular().negocios.indexOf(n) + 3, b, c, d)
    const rnd = azar(n.slug.length * 7)
    const horas = [1, 2, 3, 4, 5, 6, 0].reduce((mapa, dia) => {
      mapa[dia] = Array.from({ length: 11 }, (_, h) => (dia === 0 ? 0 : Math.round(rnd() * (h > 1 && h < 4 ? 6 : h > 7 ? 7 : 3) * (dia === 5 || dia === 6 ? 1.6 : 1))))
      return mapa
    }, [] as number[][])
    const total = porMes.reduce((a, v) => a + v, 0)
    return {
      negocio: n,
      config: { marca: n.nombre, moneda: 'USD', whatsapp: n.telefono, lugar: 'barberia', metodos: 'pago_movil,efectivo,zelle', servicios: 7, ticket: true },
      estadisticas: {
        meses: mesesDemo(), porMes, ingresosMes: porMes.map((v) => v * 14), canceladasMes: porMes.map((v) => Math.round(v * 0.06)),
        clientesNuevosMes: porMes.map((v) => Math.round(v * 0.35)), total, canceladas: Math.round(total * 0.06),
        ultimos30: m.reservas30 ?? 0, previos30: m.previas30 ?? 0, ingresos30: (m.reservas30 ?? 0) * 14, ingresosPrevios30: (m.previas30 ?? 0) * 13,
        proximas: m.proximas ?? 0, ultimaSolicitud: m.ultimaReserva, clientes: m.clientes ?? 0, recurrentes: Math.round((m.clientes ?? 0) * 0.42), conCupon: Math.round(total * 0.08), ticket: 14,
        servicios: [
          { nombre: 'Corte clásico', n: Math.round(total * 0.42), ingresos: Math.round(total * 0.42) * 10 },
          { nombre: 'Corte y barba', n: Math.round(total * 0.27), ingresos: Math.round(total * 0.27) * 16 },
          { nombre: 'Barba', n: Math.round(total * 0.14), ingresos: Math.round(total * 0.14) * 7 },
          { nombre: 'Corte niño', n: Math.round(total * 0.1), ingresos: Math.round(total * 0.1) * 8 },
          { nombre: 'Cejas', n: Math.round(total * 0.07), ingresos: Math.round(total * 0.07) * 5 },
        ],
        metodos: [{ nombre: 'Pago Móvil', n: Math.round(total * 0.58) }, { nombre: 'Efectivo', n: Math.round(total * 0.3) }, { nombre: 'Zelle', n: Math.round(total * 0.12) }],
        modalidades: [{ nombre: 'En la barbería', n: Math.round(total * 0.9) }, { nombre: 'A domicilio', n: Math.round(total * 0.1) }],
        estados: [{ nombre: 'Confirmada', n: Math.round(total * 0.88) }, { nombre: 'Cancelada', n: Math.round(total * 0.06) }, { nombre: 'Pago por verificar', n: Math.round(total * 0.06) }],
        horas: { desde: 9, hasta: 19, dias: ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'], mapa: horas },
      },
      recientes: ['Ana Pérez', 'Carlos Méndez', 'Luis Rojas', 'María Gómez', 'José Díaz', 'Eva Torres'].map((cliente, i) => ({
        cliente, servicios: ['Corte clásico', 'Corte y barba', 'Barba', 'Corte clásico', 'Cejas', 'Corte niño'][i], total: [10, 16, 7, 10, 5, 8][i],
        fecha: dias(1 - i), hora: ['10:00', '11:30', '15:00', '09:30', '17:00', '12:00'][i], estado: i === 1 ? 'Pago por verificar' : i === 4 ? 'Cancelada' : 'Confirmada', metodo: i % 2 ? 'Efectivo' : 'Pago Móvil',
      })),
      pagos: pagos.filter((p) => p.slug === n.slug),
      reportes: reportes.filter((p) => p.slug === n.slug),
    }
  }
  return {
    metricas: () => espera(metricasDemo()),
    detalle: (slug: string) => espera(detalleDemo(slug)),
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
