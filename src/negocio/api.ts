/**
 * "Mi negocio": lo que el dueño ve y hace desde su app. Habla con el Apps Script
 * maestro (accion: 'dueno'); la sesión la firma el Apps Script después de verificar
 * la cuenta de Google.
 */
import { API_URL, DEMO_MODE } from '../config'

export interface Negocio {
  slug: string
  nombre: string
  /** bookeaa team: 'equipo' = una persona del equipo (ve solo lo suyo). Sin rol = administrador. */
  rol?: 'admin' | 'equipo'
  persona?: { id: string; nombre: string } | null
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
  /** bookeaa team: quién atiende ('' sin equipo). */
  profesional?: string
  profesionalId?: string
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
  if (DEMO_MODE) {
    const a = DEMO.agenda(desde)
    // Carla (equipo de Spa Sol) ve solo sus citas.
    return Promise.resolve(slug === 'spa-sol' ? { ...a, negocio: { ...a.negocio, slug, nombre: 'Spa Sol' }, citas: a.citas.filter((c) => c.profesionalId === 'carla') } : a)
  }
  return llamar<Agenda>({ op: 'citas', sesion, slug, desde, dias })
}

export function confirmarPago(sesion: string, slug: string, id: string): Promise<{ ok: boolean; estado: string }> {
  if (DEMO_MODE) return Promise.resolve({ ok: true, estado: 'Confirmada' })
  return llamar({ op: 'confirmar_pago', sesion, slug, id })
}

/** La clave de avisos al día (la de la sesión pudo quedar vacía) y si el servidor de avisos está configurado. */
export function claveAvisos(sesion: string, slug: string): Promise<{ vapid: string; servidor: boolean }> {
  if (DEMO_MODE) return Promise.resolve({ vapid: '', servidor: true })
  return llamar({ op: 'vapid', sesion, slug })
}

export interface PruebaAvisos {
  ok: boolean
  equipos: number
  enviadas: number
  fallos: string[]
}

export function probarAvisos(sesion: string, slug: string): Promise<PruebaAvisos> {
  if (DEMO_MODE) return Promise.resolve({ ok: true, equipos: 1, enviadas: 1, fallos: [] })
  return llamar<PruebaAvisos>({ op: 'probar_avisos', sesion, slug })
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
  /** bookeaa team. */
  equipo?: EquipoConfig
}

export interface PersonaEquipo {
  /** Vacío = persona nueva (el servidor le pone id y le crea su calendario). */
  id: string
  nombre: string
  email: string
  foto: string
  cargo: string
  /** IDs de los servicios que hace (vacío = todos). */
  servicios: string[]
  /** Su horario (vacío = el del negocio). dia: "Lunes"… o 0-6. */
  horarios: { dia: string | number; inicio: string; fin: string }[]
  activo: boolean
  /** Ya tiene su calendario de bookeaa. */
  calendario?: boolean
}

export interface EquipoConfig {
  plan: 'individual' | 'team'
  activo: boolean
  modo: 'servicio' | 'persona' | 'ambos'
  cualquiera: boolean
  personas: PersonaEquipo[]
}

/** Un bloqueo de una persona del equipo (un evento en su calendario). */
export interface BloqueoPersona {
  id: string
  fecha: string
  inicio: string
  fin: string
  motivo: string
  todoElDia: boolean
}

export function bloqueosPersona(sesion: string, slug: string, persona = ''): Promise<{ bloqueos: BloqueoPersona[] }> {
  if (DEMO_MODE) return espera({ bloqueos: structuredClone(DEMO.bloqueosPersona) })
  return llamar({ op: 'bloqueos', sesion, slug, persona })
}

export function bloquear(sesion: string, slug: string, b: { fecha: string; inicio: string; fin: string; motivo: string }, persona = ''): Promise<{ bloqueos: BloqueoPersona[] }> {
  if (DEMO_MODE) {
    DEMO.bloqueosPersona.push({ id: `b${Date.now()}`, ...b, motivo: b.motivo || 'No disponible', todoElDia: !b.inicio })
    DEMO.bloqueosPersona.sort((x, y) => (x.fecha + x.inicio).localeCompare(y.fecha + y.inicio))
    return espera({ bloqueos: structuredClone(DEMO.bloqueosPersona) })
  }
  return llamar({ op: 'bloquear', sesion, slug, persona, ...b })
}

export function desbloquear(sesion: string, slug: string, id: string, persona = ''): Promise<{ bloqueos: BloqueoPersona[] }> {
  if (DEMO_MODE) {
    DEMO.bloqueosPersona = DEMO.bloqueosPersona.filter((x) => x.id !== id)
    return espera({ bloqueos: structuredClone(DEMO.bloqueosPersona) })
  }
  return llamar({ op: 'desbloquear', sesion, slug, persona, id })
}

const espera = <T,>(v: T) => new Promise<T>((ok) => setTimeout(() => ok(v), 350))

export type Seccion = 'servicios' | 'horario' | 'bloqueos' | 'cupones' | 'marca' | 'estilo' | 'logo' | 'lugar' | 'pagos' | 'mensaje' | 'comprobantes' | 'equipo'
export interface DatosSeccion {
  config?: Record<string, string>
  servicios?: Servicio[]
  horarios?: Horario[]
  sedes?: Sede[]
  mensajes?: Mensaje[]
  bloqueos?: Bloqueo[]
  cupones?: Cupon[]
  logo?: string
  equipo?: PersonaEquipo[]
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
    if (seccion === 'equipo' && c.equipo) {
      const cfg = datos.config ?? {}
      c.equipo = {
        ...c.equipo,
        activo: cfg.equipo_activo ? cfg.equipo_activo === 'si' : c.equipo.activo,
        modo: (cfg.equipo_modo as EquipoConfig['modo']) || c.equipo.modo,
        cualquiera: cfg.equipo_cualquiera ? cfg.equipo_cualquiera !== 'no' : c.equipo.cualquiera,
        personas: (datos.equipo ?? c.equipo.personas).map((p) => ({ ...p, id: p.id || p.nombre.toLowerCase().split(/\s+/)[0], calendario: true })),
      }
    }
    return new Promise((ok) => setTimeout(() => ok({ ok: true, errores: [], datos: structuredClone(c) }), 400))
  }
  return llamar<Guardado>({ op: 'guardar', sesion, slug, seccion, datos })
}

// ---------- Panel de control (solo el administrador) ----------

export type PeriodoPanel = 'hoy' | 'semana' | 'mes' | 'mes_pasado' | '30' | '12m'

export interface Rubro {
  nombre: string
  n: number
  ingresos: number
}

export interface ResumenPeriodo {
  reservas: number
  ingresos: number
  /** Citas de hasta hoy (ya atendidas) y desde mañana (agendadas). */
  atendidas: number
  ingresosAtendidas: number
  agendadas: number
  ingresosAgendadas: number
  porVerificar: number
  ingresosPorVerificar: number
  canceladas: number
  ingresosCancelados: number
  ticket: number
  clientes: number
  porPersona: Rubro[]
  porServicio: Rubro[]
  porMetodo: Rubro[]
  /** Un punto por día (o por mes en 12 meses): clave 'yyyy-MM-dd' o 'yyyy-MM'. */
  serie: { clave: string; n: number; ingresos: number }[]
}

export interface Panel {
  periodo: PeriodoPanel
  desde: string
  hasta: string
  hoy: string
  porMes: boolean
  moneda: 'EUR' | 'USD' | 'BS'
  equipo: boolean
  actual: ResumenPeriodo
  anterior: { desde: string; hasta: string; reservas: number; ingresos: number; clientes: number; canceladas: number }
}

export function panel(sesion: string, slug: string, periodo: PeriodoPanel): Promise<Panel> {
  if (DEMO_MODE) return espera(panelDemo(periodo))
  return llamar<Panel>({ op: 'panel', sesion, slug, periodo })
}

/** Un panel de ejemplo con números estables (cambian con el período, no al recargar). */
function panelDemo(periodo: PeriodoPanel): Panel {
  const hoy = hoyCaracas()
  const porMes = periodo === '12m'
  const largo = { hoy: 1, semana: 7, mes: 31, mes_pasado: 30, '30': 30, '12m': 12 }[periodo]
  let semilla = largo * 7919
  const azar = () => ((semilla = (semilla * 16807) % 2147483647) / 2147483647)
  const desde = porMes ? sumarDias(hoy, -330).slice(0, 8) + '01' : periodo === 'mes' ? hoy.slice(0, 8) + '01' : sumarDias(hoy, -(largo - 1))
  const serie = Array.from({ length: largo }, (_, i) => {
    const clave = porMes ? new Date(Date.UTC(Number(desde.slice(0, 4)), Number(desde.slice(5, 7)) - 1 + i, 1)).toISOString().slice(0, 7) : sumarDias(desde, i)
    const n = porMes ? Math.round(60 + i * 6 + azar() * 25) : new Date(clave + 'T12:00:00Z').getUTCDay() === 0 ? 0 : Math.round(2 + azar() * 7)
    return { clave, n, ingresos: Math.round(n * (12 + azar() * 6)) }
  })
  const reservas = serie.reduce((a, d) => a + d.n, 0)
  const ingresos = serie.reduce((a, d) => a + d.ingresos, 0)
  const atendidas = porMes ? reservas : serie.filter((d) => d.clave <= hoy).reduce((a, d) => a + d.n, 0)
  const ingresosAtendidas = porMes ? ingresos : serie.filter((d) => d.clave <= hoy).reduce((a, d) => a + d.ingresos, 0)
  const parte = (fr: number[], nombres: string[]) => nombres.map((nombre, i) => ({ nombre, n: Math.round(reservas * fr[i]), ingresos: Math.round(ingresos * fr[i]) }))
  return {
    periodo, desde, hasta: porMes ? hoy.slice(0, 8) + '28' : periodo === 'mes' ? sumarDias(desde, largo - 1) : hoy, hoy, porMes, moneda: 'USD', equipo: true,
    actual: {
      reservas, ingresos, atendidas, ingresosAtendidas, agendadas: reservas - atendidas, ingresosAgendadas: ingresos - ingresosAtendidas,
      porVerificar: Math.round(reservas * 0.05), ingresosPorVerificar: Math.round(ingresos * 0.05), canceladas: Math.round(reservas * 0.06), ingresosCancelados: Math.round(ingresos * 0.06),
      ticket: reservas ? Math.round((ingresos / reservas) * 100) / 100 : 0, clientes: Math.round(reservas * 0.7),
      porPersona: parte([0.42, 0.33, 0.25], ['Carla Méndez', 'Andrés Rojas', 'Sofía Pérez']),
      porServicio: parte([0.38, 0.27, 0.18, 0.11, 0.06], ['Corte', 'Corte y barba', 'Barba', 'Corte niño', 'Lavado']),
      porMetodo: parte([0.55, 0.45], ['Pago en la cita', 'Bolívares (Pago Móvil)']),
      serie,
    },
    anterior: { desde: '', hasta: '', reservas: Math.round(reservas * 0.86), ingresos: Math.round(ingresos * 0.82), clientes: Math.round(reservas * 0.62), canceladas: Math.round(reservas * 0.08) },
  }
}

// ---------- Mi plan y pagos ----------

export type EstadoPlan = 'activo' | 'prueba' | 'pendiente' | 'vencido' | 'suspendido' | 'sin_fecha'

export interface PagoReportado {
  id: string
  registrado: string
  fecha: string
  banco: string
  telefono: string
  referencia: string
  montoBs: number
  meses: number
  estado: 'Por verificar' | 'Aprobado' | 'Rechazado' | string
  conciliado: string
  motivo: string
}

export interface Plan {
  estado: EstadoPlan
  /** bookeaa team cobra según las personas activas del equipo. */
  plan?: 'individual' | 'team'
  personas?: number
  /** Fecha de corte (yyyy-MM-dd) o ''. */
  vence: string
  dias: number | null
  gracia: number
  corteDia: number | null
  /** Último día para pagar antes de la pausa. */
  limite: string
  precio: number
  tasa: number
  montoBs: number
  pagoMovil: { banco: string; telefono: string; cedula: string; titular: string }
  pagos: PagoReportado[]
  porVerificar: boolean
}

export function plan(sesion: string, slug: string): Promise<Plan> {
  if (DEMO_MODE) return Promise.resolve(structuredClone(DEMO.plan))
  return llamar<Plan>({ op: 'plan', sesion, slug })
}

export interface Reporte {
  fecha: string
  banco: string
  telefono: string
  referencia: string
  montoBs: string
  meses: number
}

export function reportarPago(sesion: string, slug: string, r: Reporte): Promise<{ ok: boolean; id: string; estado: string }> {
  if (DEMO_MODE) {
    DEMO.plan.pagos.unshift({ id: 'PDEMO', registrado: '', fecha: r.fecha, banco: r.banco, telefono: r.telefono, referencia: r.referencia, montoBs: Number(r.montoBs.replace(/\./g, '').replace(',', '.')) || 0, meses: r.meses, estado: 'Por verificar', conciliado: '', motivo: '' })
    DEMO.plan.porVerificar = true
    return new Promise((ok) => setTimeout(() => ok({ ok: true, id: 'PDEMO', estado: 'Por verificar' }), 500))
  }
  return llamar({ op: 'reportar_pago', sesion, slug, ...r })
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
  plan: {
    estado: 'pendiente', vence: sumarDias(hoyCaracas(), -1), dias: -1, gracia: 3, corteDia: Number(sumarDias(hoyCaracas(), -1).slice(8, 10)),
    limite: sumarDias(hoyCaracas(), 2), precio: 10, tasa: 40.25, montoBs: 402.5,
    pagoMovil: { banco: 'Banco de Venezuela (0102)', telefono: '04220298203', cedula: 'V-12345678', titular: 'bookeaa' },
    pagos: [{ id: 'P1', registrado: '', fecha: sumarDias(hoyCaracas(), -31), banco: 'Banesco', telefono: '04121234567', referencia: '001234567', montoBs: 380, meses: 1, estado: 'Aprobado', conciliado: 'Correo del banco', motivo: '' }],
    porVerificar: false,
  } as Plan,
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
      { id: '', nombre: 'Corte', precio: 10, duracion: 30, categoria: 'Cabello', adicional: false },
      { id: '', nombre: 'Corte y barba', precio: 16, duracion: 45, categoria: 'Cabello', adicional: false },
      { id: '', nombre: 'Barba', precio: 8, duracion: 20, categoria: 'Barba', adicional: false },
      { id: '', nombre: 'Lavado', precio: 3, duracion: 10, categoria: '', adicional: true },
    ],
    horarios: DIAS.flatMap((dia, i) => (i < 5 ? [{ dia, inicio: '09:00', fin: '13:00' }, { dia, inicio: '14:00', fin: '18:00' }] : i === 5 ? [{ dia, inicio: '09:00', fin: '14:00' }] : [{ dia, inicio: '', fin: '' }])),
    sedes: [{ nombre: 'Sede Centro', direccion: 'Av. Libertador, local 12', mapsUrl: '', activa: true }],
    mensajes: [{ nombre: 'Clásica', texto: 'Hola {negocio}, soy {nombre}. Reservé {servicios} el {fecha} a las {hora}.' }],
    bloqueos: [{ fecha: sumarDias(hoyCaracas(), 6), inicio: '', fin: '', motivo: 'Vacaciones' }],
    cupones: [{ codigo: 'OCTUBRE10', porcentaje: 10, monto: 0, usos: null }, { codigo: 'BIENVENIDA', porcentaje: 0, monto: 2, usos: 15 }],
    logo: '',
    equipo: {
      plan: 'team',
      activo: true,
      modo: 'servicio',
      cualquiera: true,
      personas: [
        { id: 'carla', nombre: 'Carla Méndez', email: 'carla@gmail.com', foto: '', cargo: 'Barbera principal', servicios: [], horarios: [], activo: true, calendario: true },
        { id: 'andres', nombre: 'Andrés Rojas', email: 'andres@gmail.com', foto: '', cargo: 'Barbero', servicios: ['corte', 'barba'], horarios: [2, 3, 4, 5, 6].map((d) => ({ dia: d, inicio: '12:00', fin: '20:00' })), activo: true, calendario: true },
      ],
    },
  } as Configuracion,
  bloqueosPersona: [{ id: 'b1', fecha: sumarDias(hoyCaracas(), 4), inicio: '', fin: '', motivo: 'Cita médica', todoElDia: true }] as BloqueoPersona[],

  // En demo se entra como administrador de Barbería Norte y como Carla, del equipo de Spa Sol.
  sesion: {
    sesion: 'demo', email: 'demo@gmail.com', vapid: '',
    negocios: [{ slug: 'demo', nombre: 'Barbería Norte', rol: 'admin' }, { slug: 'spa-sol', nombre: 'Spa Sol', rol: 'equipo', persona: { id: 'carla', nombre: 'Carla Méndez' } }],
  } as Sesion,
  agenda(desde: string): Agenda {
    const hoy = hoyCaracas()
    const c = (id: string, fecha: string, hora: string, cliente: string, servicios: string, extra: Partial<Cita> = {}): Cita => ({
      id, cliente, telefono: '0412 555 1234', servicios, total: 16, totalBs: null, fecha, hora, metodo: 'Pago en la cita',
      estado: 'Confirmada', lugar: 'En la barbería', direccion: 'Av. Libertador, local 12', capture: '', recibo: Number(id.replace(/\D/g, '')) || null,
      profesional: Number(id) % 2 ? 'Carla Méndez' : 'Andrés Rojas', profesionalId: Number(id) % 2 ? 'carla' : 'andres', ...extra,
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
