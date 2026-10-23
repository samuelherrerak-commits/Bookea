import { describe, expect, it } from 'vitest'
import { constanteGs, funcionesGs } from './appsScript'

const gs = Object.values(import.meta.glob('../../apps-script/Code.gs', { query: '?raw', import: 'default', eager: true }) as Record<string, string>)[0] ?? ''
type Fn = (...a: any[]) => any

const ev = (a: string, b: string) => ({ getStartTime: () => new Date(a), getEndTime: () => new Date(b) })
/** Calendarios falsos por id: lista de eventos [inicio, fin] en hora de Caracas. */
function calendarios(eventos: Record<string, Array<[string, string]>>) {
  return {
    getCalendarById: (id: string) =>
      id in eventos
        ? { id, getEvents: () => eventos[id].map(([a, b]) => ev(`${a}-04:00`, `${b}-04:00`)) }
        : null,
  }
}
const caracas = (d: Date) => new Date(d.getTime() - 4 * 3600_000)
const Utilities = {
  formatDate: (d: Date, _z: string, f: string) => (f === 'u' ? String(caracas(d).getUTCDay() || 7) : caracas(d).toISOString().slice(0, 10)),
}

function cargar(eventos: Record<string, Array<[string, string]>> = {}) {
  return funcionesGs<Record<string, Fn>>(gs, [
    'parsearHorarioEquipo_', 'horarioEquipoTexto_', 'haceServicios_', 'idPersona_', 'equipoValidar_', 'asignarPersona_', 'calendarioPersona_',
    'parseDia_', 'toMinutes_', 'hhmm_', 'normKey_', 'slug_',
  ], {
    DIAS_CORTOS_EQUIPO: constanteGs(gs, 'DIAS_CORTOS_EQUIPO'), MAX_EQUIPO: 30, MAX_FOTO_EQUIPO: 400000, ZONA: 'America/Caracas',
    CalendarApp: calendarios(eventos), Utilities,
  })
}

describe('Code.gs · bookeaa team', () => {
  const f = cargar()

  it('el horario de cada persona se escribe y se lee igual', () => {
    const h = f.parsearHorarioEquipo_('lun 09:00-13:00, Sábado 9:00-14:00; mar 14:00-18:00')
    expect(h).toEqual([
      { dia: 1, inicio: '09:00', fin: '13:00' },
      { dia: 6, inicio: '09:00', fin: '14:00' },
      { dia: 2, inicio: '14:00', fin: '18:00' },
    ])
    expect(f.horarioEquipoTexto_(h)).toBe('lun 09:00-13:00, mar 14:00-18:00, sáb 09:00-14:00')
    expect(f.parsearHorarioEquipo_('')).toEqual([])
    expect(f.parsearHorarioEquipo_('lunes 18:00-09:00')).toBeNull()
    expect(f.parsearHorarioEquipo_('cualquier cosa')).toBeNull()
  })

  it('servicios: sin lista hace todos; ids sin importar mayúsculas', () => {
    expect(f.haceServicios_({ servicios: [] }, ['S1', 'S9'])).toBe(true)
    expect(f.haceServicios_({ servicios: ['s1', 'A1'] }, ['S1'])).toBe(true)
    expect(f.haceServicios_({ servicios: ['S1'] }, ['S1', 'S2'])).toBe(false)
  })

  it('el id (y link) sale del nombre y no se repite', () => {
    expect(f.idPersona_('Carla Pérez', [])).toBe('carla-perez')
    expect(f.idPersona_('Carla Pérez', ['carla-perez'])).toBe('carla-perez-2')
  })

  it('valida el equipo antes de guardarlo', () => {
    const ok = { nombre: 'Carla', email: 'carla@gmail.com', horarios: [{ dia: 'Lunes', inicio: '09:00', fin: '18:00' }] }
    expect(f.equipoValidar_({ config: { equipo_activo: 'si', equipo_modo: 'ambos' }, equipo: [ok] })).toEqual([])
    const errores = f.equipoValidar_({
      config: { equipo_modo: 'otro' },
      equipo: [ok, { nombre: 'Ana', email: 'CARLA@gmail.com' }, { nombre: 'Luis', email: 'x' }, { nombre: '', email: 'a@b.co' }, { nombre: 'Eva', email: 'eva@gmail.com', foto: 'http://x', horarios: [{ dia: 'lunes', inicio: '18:00', fin: '09:00' }] }],
    })
    expect(errores).toEqual([
      'Modo: servicio, persona o ambos.',
      'Ana: ese correo ya está en el equipo.',
      'Luis: escribe su Gmail.',
      'Cada persona necesita su nombre.',
      'Eva: la foto tiene que ser una imagen o un enlace https://',
      'Eva: revisa su horario (lunes).',
    ])
    expect(f.equipoValidar_({ config: { equipo_activo: 'si' }, equipo: [{ ...ok, activo: false }] })).toContain('Para activar el equipo agrega al menos una persona activa.')
    // La foto subida desde Mi negocio llega como imagen (data URL).
    expect(f.equipoValidar_({ equipo: [{ ...ok, foto: 'data:image/jpeg;base64,/9j/AAA=' }] })).toEqual([])
    expect(f.equipoValidar_({ equipo: [{ ...ok, foto: 'data:text/html;base64,AAA=' }] })).toEqual(['Carla: la foto tiene que ser una imagen o un enlace https://'])
    expect(f.equipoValidar_({ equipo: [{ ...ok, foto: 'data:image/png;base64,' + 'A'.repeat(400001) }] })).toEqual(['Carla: la foto pesa mucho, prueba con otra.'])
  })

  describe('a quién se le agenda la cita', () => {
    // Lunes 5 de octubre de 2026 de 10:00 a 11:00 en Caracas.
    const inicio = new Date('2026-10-05T10:00:00-04:00')
    const fin = new Date('2026-10-05T11:00:00-04:00')
    const negocio = [{ dia: 1, inicio: '09:00', fin: '18:00' }]
    const carla = { id: 'carla', nombre: 'Carla', calendarioId: 'c1', servicios: [], horario: [] }
    const andrea = { id: 'andrea', nombre: 'Andrea', calendarioId: 'c2', servicios: ['S1'], horario: [] }
    const sofia = { id: 'sofia', nombre: 'Sofía', calendarioId: 'c3', servicios: [], horario: [{ dia: 1, inicio: '14:00', fin: '18:00' }] }
    const g = cargar({
      c1: [['2026-10-05T09:00', '2026-10-05T09:30'], ['2026-10-05T15:00', '2026-10-05T16:00']],
      c2: [],
      c3: [],
    })
    const asignar = (pedida: string, cualquiera: boolean, ids: string[], equipo = [carla, andrea, sofia]) =>
      g.asignarPersona_(equipo, pedida, cualquiera, ids, inicio, fin, '2026-10-05', 600, 660, negocio)

    it('la persona pedida, si está libre y hace el servicio', () => {
      expect(asignar('carla', true, ['S1']).persona.id).toBe('carla')
      expect(asignar('andrea', true, ['S2'])).toEqual({ error: 'datos_invalidos', mensaje: 'Esa persona no hace estos servicios. Elige otra.' })
      // Sofía no trabaja a esa hora.
      expect(asignar('sofia', true, ['S1'])).toEqual({ error: 'cupo_ocupado', mensaje: 'Ese horario de Sofía acaba de ocuparse.' })
    })

    it('"Cualquiera": la libre con menos citas ese día; sin "Cualquiera" hay que elegir', () => {
      expect(asignar('*', true, ['S1']).persona.id).toBe('andrea') // Carla ya tiene 2 citas ese día
      expect(asignar('*', true, ['S2']).persona.id).toBe('carla') // Andrea no hace S2 y Sofía no está
      expect(asignar('*', false, ['S1']).error).toBe('datos_invalidos')
    })

    it('si choca con su calendario, está ocupada', () => {
      const h = cargar({ c1: [['2026-10-05T10:30', '2026-10-05T11:30']] })
      expect(h.asignarPersona_([carla], 'carla', true, [], inicio, fin, '2026-10-05', 600, 660, negocio).error).toBe('cupo_ocupado')
      expect(h.asignarPersona_([carla], '*', true, [], inicio, fin, '2026-10-05', 600, 660, negocio)).toEqual({ error: 'cupo_ocupado', mensaje: 'Ese horario acaba de ocuparse.' })
    })
  })
})

describe('Code.gs · bookeaa team en Mi negocio y en la central', () => {
  const tenants = [
    { slug: 'spa-sol', nombre: 'Spa Sol', email: 'dueña@gmail.com', activo: 'si' },
    { slug: 'barberia', nombre: 'Barbería', email: 'barbero@gmail.com', activo: 'si' },
    { slug: 'cerrado', nombre: 'Cerrado', email: 'x@gmail.com', activo: 'no' },
  ]
  const indice = [
    { email: 'carla@gmail.com', slug: 'spa-sol', id: 'carla', nombre: 'Carla', activo: true },
    { email: 'carla@gmail.com', slug: 'cerrado', id: 'carla', nombre: 'Carla', activo: true },
    { email: 'ana@gmail.com', slug: 'spa-sol', id: 'ana', nombre: 'Ana', activo: false },
    { email: 'barbero@gmail.com', slug: 'spa-sol', id: 'pedro', nombre: 'Pedro', activo: true },
  ]
  const f = funcionesGs<Record<string, Fn>>(gs, ['accesosDe_', 'negociosDe_', 'tenantActivo_', 'personasActivas_', 'planDe_', 'precioPlan_', 'atenderEquipo_', 'normKey_'], {
    esAdminDueno_: (e: string) => e === 'admin@bookeaa.com',
    equipoIndice_: () => indice,
    PRECIO_MENSUAL: 10, PRECIO_TEAM: 25, TEAM_INCLUIDAS: 5, PRECIO_PERSONA_EXTRA: 5,
  })

  it('quién entra y con qué rol: el correo del negocio es admin; el del equipo, solo lo suyo', () => {
    const roles = (email: string) => f.accesosDe_(email, tenants).map((a: any) => `${a.tenant.slug}:${a.rol}${a.persona ? ':' + a.persona.id : ''}`)
    expect(roles('dueña@gmail.com')).toEqual(['spa-sol:admin'])
    // Carla está en un negocio activo y en uno suspendido: solo entra al activo.
    expect(roles('carla@gmail.com')).toEqual(['spa-sol:equipo:carla'])
    // Ana quedó inactiva: ya no entra.
    expect(roles('ana@gmail.com')).toEqual([])
    // El barbero es dueño de su barbería y además está en el equipo de Spa Sol.
    expect(roles('barbero@gmail.com')).toEqual(['barberia:admin', 'spa-sol:equipo:pedro'])
    // Un administrador de bookeaa ve todos como admin (sin repetir).
    expect(roles('admin@bookeaa.com')).toEqual(['spa-sol:admin', 'barberia:admin'])
  })

  it('una persona del equipo no toca la configuración ni el plan', () => {
    const acceso = { tenant: tenants[0], rol: 'equipo', persona: { id: 'carla', nombre: 'Carla' } }
    for (const op of ['config', 'guardar', 'plan', 'reportar_pago', 'cualquiera']) {
      expect(f.atenderEquipo_(op, {}, acceso, 'carla@gmail.com', Date.now())).toEqual({ error: 'no_autorizado', mensaje: 'Eso lo hace el administrador del negocio.' })
    }
  })

  it('precio: individual $10; team $25 hasta 5 personas y $5 por cada una más', () => {
    expect(f.planDe_('Team')).toBe('team')
    expect(f.planDe_('')).toBe('individual')
    expect(f.precioPlan_('individual', 9)).toBe(10)
    expect(f.precioPlan_('team', 0)).toBe(25)
    expect(f.precioPlan_('team', 5)).toBe(25)
    expect(f.precioPlan_('team', 8)).toBe(40)
    expect(f.personasActivas_('spa-sol')).toBe(2) // Carla y Pedro (Ana está inactiva)
  })
})

describe('Code.gs · métricas por persona', () => {
  const g = funcionesGs<Record<string, Fn>>(gs, ['ultimosMeses_', 'diaSemana_', 'sumarConteo_', 'rankingConteo_', 'estadisticasReservas_', 'sumarDias_', 'ymd_', 'horaTexto_', 'toNumber_', 'round2_'], {
    METRICAS_MESES: 12, DIAS_SEMANA_CORTO: ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'], ZONA: 'America/Caracas',
    Utilities: { formatDate: (d: Date) => d.toISOString().slice(0, 10) },
  })
  it('cuenta citas y facturación de cada persona, sin las canceladas', () => {
    const fila = (fecha: string, persona: string, total: number, estado = 'Confirmada') => ({
      ID: Math.random().toString(36), Fecha_Cita: fecha, Hora_Cita: '10:00', Cliente: 'X', Telefono: '0412' + Math.random(), Servicios: 'Corte', Total: total, Estado: estado, Profesional: persona,
    })
    const e = g.estadisticasReservas_([fila('2026-10-01', 'Carla', 20), fila('2026-10-02', 'Carla', 10), fila('2026-10-03', 'Andrea', 15), fila('2026-10-04', 'Andrea', 99, 'Cancelada'), fila('2026-10-05', '', 5)], '2026-10-14', true)
    expect(e.porPersona).toEqual([{ nombre: 'Carla', n: 2, ingresos: 30 }, { nombre: 'Andrea', n: 1, ingresos: 15 }])
  })
})

describe('Code.gs · calendario y foto de cada persona del equipo', () => {
  type Llamada = { url: string; regla: any }
  function cargarGuardar(opts: { previas?: any[]; falla?: (email: string) => string | null; crearFalla?: boolean } = {}) {
    const acl: Llamada[] = []
    const creados: string[] = []
    const archivos: any[] = []
    let filas: any[][] = []
    let indice: any[] = []
    const rango = { setValues: () => rango, setNumberFormat: () => rango }
    const f = funcionesGs<Record<string, Fn>>(gs, [
      'equipoGuardar_', 'compartirCalendario_', 'guardarFotoEquipo_', 'estadoCalendarioEquipo_', 'idPersona_', 'horarioEquipoTexto_',
      'parseDia_', 'toMinutes_', 'hhmm_', 'normKey_', 'slug_',
    ], {
      EQUIPO_HEADERS: constanteGs(gs, 'EQUIPO_HEADERS'), DIAS_CORTOS_EQUIPO: constanteGs(gs, 'DIAS_CORTOS_EQUIPO'), ZONA: 'America/Caracas',
      cfgHoja_: () => ({ getRange: () => rango, getMaxRows: () => 100 }),
      equipoLeer_: () => opts.previas ?? [],
      getConfig_: () => ({ marca: 'Spa Sol' }),
      limpiarTexto_: (v: unknown, n: number) => String(v ?? '').trim().slice(0, n),
      paraCelda_: (v: unknown) => v,
      cfgReemplazar_: (_s: unknown, _n: number, f: any[][]) => { filas = f },
      actualizarIndiceEquipo_: (_slug: string, l: any[]) => { indice = l },
      CalendarApp: {
        createCalendar: (nombre: string) => {
          if (opts.crearFalla) throw new Error('Se alcanzó el límite de calendarios')
          creados.push(nombre)
          return { getId: () => `cal${creados.length}@group.calendar.google.com` }
        },
      },
      // Sin el servicio avanzado "Calendar": comparte por la API con el token del script.
      ScriptApp: { getOAuthToken: () => 'tok' },
      UrlFetchApp: {
        fetch: (url: string, o: any) => {
          const regla = JSON.parse(o.payload)
          acl.push({ url, regla })
          const error = opts.falla?.(regla.scope.value) ?? null
          return { getResponseCode: () => (error ? 403 : 200), getContentText: () => JSON.stringify(error ? { error: { message: error } } : {}) }
        },
      },
      Utilities: { newBlob: (b: unknown, mime: string, nombre: string) => ({ b, mime, nombre }), base64Decode: (x: string) => x },
      DriveApp: {
        Access: { ANYONE_WITH_LINK: 'link' }, Permission: { VIEW: 'view' },
        getFolderById: (id: string) => ({
          createFile: (blob: any) => {
            const a = { id: `foto${archivos.length + 1}`, carpeta: id, blob, compartido: '', getId: () => a.id, setSharing: (x: string) => { a.compartido = x } }
            archivos.push(a)
            return a
          },
        }),
      },
      console: { warn: () => {} },
    })
    return { f, acl, creados, archivos, filas: () => filas, indice: () => indice }
  }
  const tenant = { slug: 'spa-sol', nombre: 'Spa Sol', email: 'Dueña@gmail.com', carpetaId: 'carpeta-spa' }
  const carla = { nombre: 'Carla', email: 'Carla@Gmail.com', servicios: [], horarios: [], activo: true }

  it('a la persona nueva le crea su calendario y se lo comparte a ella y a la dueña', () => {
    const g = cargarGuardar()
    expect(g.f.equipoGuardar_({}, tenant, [carla])).toBe(1)
    expect(g.creados).toEqual(['Citas Carla · Spa Sol'])
    expect(g.acl.map((a) => [a.regla.role, a.regla.scope.value])).toEqual([['writer', 'carla@gmail.com'], ['writer', 'dueña@gmail.com']])
    expect(g.acl[0].url).toBe('https://www.googleapis.com/calendar/v3/calendars/cal1%40group.calendar.google.com/acl?sendNotifications=true')
    const fila = g.filas()[0]
    expect(fila[3]).toBe('cal1@group.calendar.google.com')
    expect(fila[9]).toBe('carla@gmail.com') // Compartido
    expect(g.indice()).toEqual([{ id: 'carla', nombre: 'Carla', email: 'carla@gmail.com', activo: true }])
  })

  it('si Google no deja compartir, lo anota y lo reintenta al guardar de nuevo', () => {
    const g = cargarGuardar({ falla: (e) => (e === 'carla@gmail.com' ? 'Invalid scope value.' : null) })
    g.f.equipoGuardar_({}, tenant, [carla])
    const fila = g.filas()[0]
    expect(fila[9]).toBe('error: Invalid scope value.')
    const previa = { id: 'carla', nombre: 'Carla', email: 'carla@gmail.com', calendarioId: fila[3], compartido: fila[9], foto: '', cargo: '', servicios: [], horario: [] }
    expect(g.f.estadoCalendarioEquipo_(previa)).toEqual({ estado: 'error', error: 'Invalid scope value.' })

    const otra = cargarGuardar({ previas: [previa] })
    otra.f.equipoGuardar_({}, tenant, [{ ...carla, id: 'carla' }])
    expect(otra.creados).toEqual([]) // usa el mismo calendario
    expect(otra.acl.map((a) => a.regla.scope.value)).toEqual(['carla@gmail.com', 'dueña@gmail.com'])
    expect(otra.filas()[0][9]).toBe('carla@gmail.com')
    expect(otra.f.estadoCalendarioEquipo_({ ...previa, compartido: 'carla@gmail.com' }).estado).toBe('compartido')
  })

  it('ya compartido con su correo: no lo vuelve a compartir; si cambia el correo, sí', () => {
    const previa = { id: 'carla', nombre: 'Carla', email: 'carla@gmail.com', calendarioId: 'c@g', compartido: 'carla@gmail.com', foto: '', cargo: '', servicios: [], horario: [] }
    const g = cargarGuardar({ previas: [previa] })
    g.f.equipoGuardar_({}, tenant, [{ ...carla, id: 'carla' }])
    expect(g.acl).toEqual([])
    g.f.equipoGuardar_({}, tenant, [{ ...carla, id: 'carla', email: 'carla.nueva@gmail.com' }])
    expect(g.acl.map((a) => a.regla.scope.value)).toEqual(['carla.nueva@gmail.com', 'dueña@gmail.com'])
    expect(g.f.estadoCalendarioEquipo_({ ...previa, compartido: '' }).estado).toBe('pendiente')
    expect(g.f.estadoCalendarioEquipo_({ ...previa, calendarioId: '' }).estado).toBe('sin_crear')
  })

  it('si no se puede crear el calendario, guarda a la persona y anota el error', () => {
    const g = cargarGuardar({ crearFalla: true })
    g.f.equipoGuardar_({}, tenant, [carla])
    expect(g.filas()[0][3]).toBe('')
    expect(g.filas()[0][9]).toMatch(/^error: No se pudo crear su calendario/)
    expect(g.acl).toEqual([])
  })

  it('la foto subida queda en la carpeta del negocio en Drive, visible con el enlace', () => {
    const g = cargarGuardar()
    g.f.equipoGuardar_({}, tenant, [{ ...carla, foto: 'data:image/jpeg;base64,/9j/AAA=' }])
    expect(g.archivos).toHaveLength(1)
    expect(g.archivos[0]).toMatchObject({ carpeta: 'carpeta-spa', compartido: 'link', blob: { mime: 'image/jpeg', nombre: 'Foto Carla.jpg' } })
    expect(g.filas()[0][4]).toBe('https://lh3.googleusercontent.com/d/foto1=w400')
    // Un enlace https se guarda tal cual; cualquier otra cosa no.
    g.f.equipoGuardar_({}, tenant, [{ ...carla, foto: 'https://x.com/a.jpg' }, { nombre: 'Ana', email: 'ana@gmail.com', foto: 'javascript:alert(1)' }])
    expect(g.filas().map((r) => r[4])).toEqual(['https://x.com/a.jpg', ''])
  })
})
