/**
 * Conector de Claude para administrar bookeaa (MCP, "Streamable HTTP" sin streaming: cada
 * POST /mcp es un mensaje JSON-RPC y la respuesta es JSON).
 *
 * Cada herramienta llama al Apps Script maestro con la sesión de la central del
 * administrador que autorizó el conector (ver oauth.ts), así que el Apps Script aplica
 * los mismos permisos y validaciones que la central y "Mi negocio".
 */
import { acceso, appsScript, revocar, type Acceso, type EnvConector } from './oauth'

const VERSIONES = ['2025-06-18', '2025-03-26', '2024-11-05']

interface Herramienta {
  name: string
  title: string
  description: string
  inputSchema: Record<string, unknown>
  annotations?: Record<string, boolean>
  /** Arma la llamada al Apps Script (sin la sesión). */
  pedido: (a: any) => Record<string, unknown>
  /** Recorta la respuesta a lo que sirve (menos texto para Claude). */
  forma?: (r: any, a: any) => unknown
}

const ESTADOS = ['activo', 'prueba', 'pendiente', 'vencido', 'suspendido', 'sin_fecha']
const SECCIONES = ['marca', 'estilo', 'lugar', 'horario', 'servicios', 'pagos', 'mensaje', 'comprobantes', 'bloqueos', 'cupones', 'equipo']

const obj = (properties: Record<string, unknown>, required: string[] = []) => ({ type: 'object', properties, required, additionalProperties: false })
const slug = { type: 'string', description: 'Link del negocio, lo que va después de /u/ (ej. "barberia-norte").' }
const lectura = { readOnlyHint: true, destructiveHint: false, openWorldHint: false }
const escritura = { readOnlyHint: false, destructiveHint: false, openWorldHint: false }

/** "Barbería El Corte" → "barberia-el-corte" (igual que la central). */
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

export const HERRAMIENTAS: Herramienta[] = [
  {
    name: 'listar_negocios',
    title: 'Listar negocios',
    description: 'Todos los negocios de bookeaa con su estado de cobro (activo, prueba, pendiente = por cobrar dentro de los 3 días de gracia, vencido, suspendido, sin_fecha), fecha de corte, contacto y notas. También trae los totales y los prospectos que agendó el bot de WhatsApp.',
    inputSchema: obj({ estado: { type: 'string', enum: ESTADOS, description: 'Solo los de este estado.' } }),
    annotations: lectura,
    pedido: () => ({ accion: 'central', op: 'resumen' }),
    forma: (r, a) => ({
      hoy: r.hoy, precioMensualUsd: r.precio, totales: r.totales,
      negocios: (r.negocios || []).filter((n: any) => !a.estado || n.estado === a.estado).map((n: any) => ({
        slug: n.slug, nombre: n.nombre, estado: n.estado, vence: n.vence, dias: n.dias, email: n.email, telefono: n.telefono,
        creado: n.creado, ultimoPago: n.ultimoPago, notas: n.notas || undefined, pagina: `https://www.bookeaa.com/u/${n.slug}`,
      })),
      prospectos: r.prospectos,
    }),
  },
  {
    name: 'ver_metricas',
    title: 'Ver métricas de bookeaa',
    description: 'Panel de la central: lo cobrado por bookeaa por mes (USD), altas y reservas de toda la plataforma en los últimos 12 meses, y la actividad de cada negocio (reservas de 30 días contra los 30 anteriores, próximas, clientes, última reserva). Se guarda 10 minutos en caché.',
    inputSchema: obj({ recalcular: { type: 'boolean', description: 'true para leer las hojas otra vez en vez de usar la caché.' } }),
    annotations: lectura,
    pedido: (a) => ({ accion: 'central', op: 'metricas', fresco: !!a.recalcular }),
  },
  {
    name: 'ver_negocio',
    title: 'Ver un negocio a fondo',
    description: 'Un negocio completo: su cobro, su configuración resumida, estadísticas de reservas (por mes, facturación, clientes, servicios más pedidos, horas pico, métodos de pago, cancelaciones), las últimas reservas y sus pagos a bookeaa.',
    inputSchema: obj({ slug }, ['slug']),
    annotations: lectura,
    pedido: (a) => ({ accion: 'central', op: 'negocio', slug: a.slug }),
  },
  {
    name: 'crear_negocio',
    title: 'Crear negocio',
    description: 'Da de alta un negocio en bookeaa: crea su hoja, su calendario y su carpeta (tarda unos 30 segundos) y le da días de prueba. El Gmail del dueño recibe acceso y con él entra a "Mi negocio". Después se configura con guardar_configuracion.',
    inputSchema: obj({
      nombre: { type: 'string', description: 'Nombre visible del negocio.' },
      slug: { type: 'string', description: 'Link (minúsculas, números y guiones). Si no se da, sale del nombre.' },
      email: { type: 'string', description: 'Gmail del dueño.' },
      telefono: { type: 'string', description: 'WhatsApp del dueño, ej. 04121234567.' },
      dias_prueba: { type: 'integer', minimum: 0, maximum: 365, description: 'Días gratis antes del primer cobro. Por defecto 30.' },
      notas: { type: 'string' },
    }, ['nombre']),
    annotations: escritura,
    pedido: (a) => ({
      accion: 'central', op: 'crear', nombre: a.nombre, slug: a.slug || slugDe(String(a.nombre || '')), email: a.email || '',
      telefono: a.telefono || '', diasPrueba: a.dias_prueba ?? 30, notas: a.notas || '',
    }),
  },
  {
    name: 'editar_negocio',
    title: 'Editar datos de un negocio',
    description: 'Cambia el Gmail del dueño, su WhatsApp, las notas o la fecha de corte (vence, yyyy-MM-dd) de un negocio.',
    inputSchema: obj({ slug, email: { type: 'string' }, telefono: { type: 'string' }, notas: { type: 'string' }, vence: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' } }, ['slug']),
    annotations: escritura,
    pedido: (a) => ({ accion: 'central', op: 'editar', ...a }),
  },
  {
    name: 'suspender_negocio',
    title: 'Suspender o reactivar un negocio',
    description: 'Suspender pausa la página del negocio: deja de recibir reservas. Reactivar la vuelve a abrir.',
    inputSchema: obj({ slug, suspender: { type: 'boolean', description: 'true suspende; false reactiva.' } }, ['slug', 'suspender']),
    annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: false },
    pedido: (a) => ({ accion: 'central', op: 'activo', slug: a.slug, activo: !a.suspender }),
  },
  {
    name: 'registrar_pago',
    title: 'Registrar pago de un negocio',
    description: 'Anota un pago del plan de bookeaa ($10 al mes) y extiende la fecha de corte desde el corte anterior. Si el negocio estaba suspendido, se reactiva.',
    inputSchema: obj({
      slug,
      meses: { type: 'integer', minimum: 1, maximum: 12 },
      monto_usd: { type: 'number', minimum: 0 },
      metodo: { type: 'string', description: 'Pago Móvil, Zelle, Binance, Efectivo, Transferencia u Otro.' },
      referencia: { type: 'string' },
    }, ['slug', 'meses', 'monto_usd']),
    annotations: escritura,
    pedido: (a) => ({ accion: 'central', op: 'pago', slug: a.slug, meses: a.meses, monto: a.monto_usd, metodo: a.metodo || 'Pago Móvil', referencia: a.referencia || '' }),
  },
  {
    name: 'ver_cobros',
    title: 'Ver cobros por verificar',
    description: 'Los Pago Móvil que reportaron los negocios y siguen por verificar (con la pista del abono del banco que más se les parece), los ya revisados, los abonos del banco sin reporte y la tasa BCV.',
    inputSchema: obj({}),
    annotations: lectura,
    pedido: () => ({ accion: 'central', op: 'cobros' }),
    forma: (r) => ({ porVerificar: r.porVerificar, revisados: (r.revisados || []).slice(0, 15), abonosSinReporte: r.movimientos, tasa: r.tasa }),
  },
  {
    name: 'aprobar_pago',
    title: 'Aprobar un Pago Móvil reportado',
    description: 'Aprueba un pago por verificar (el id sale de ver_cobros): extiende el plan del negocio, lo reactiva si estaba en pausa y le avisa.',
    inputSchema: obj({ id: { type: 'string' } }, ['id']),
    annotations: escritura,
    pedido: (a) => ({ accion: 'central', op: 'aprobar', id: a.id }),
  },
  {
    name: 'rechazar_pago',
    title: 'Rechazar un Pago Móvil reportado',
    description: 'Rechaza un pago por verificar y le avisa al negocio con el motivo.',
    inputSchema: obj({ id: { type: 'string' }, motivo: { type: 'string' } }, ['id']),
    annotations: escritura,
    pedido: (a) => ({ accion: 'central', op: 'rechazar', id: a.id, motivo: a.motivo || '' }),
  },
  {
    name: 'ver_citas',
    title: 'Ver citas de un negocio',
    description: 'Las reservas de un negocio desde una fecha (por defecto hoy) por varios días (máx. 62).',
    inputSchema: obj({ slug, desde: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' }, dias: { type: 'integer', minimum: 1, maximum: 62 } }, ['slug']),
    annotations: lectura,
    pedido: (a) => ({ accion: 'dueno', op: 'citas', slug: a.slug, desde: a.desde, dias: a.dias || 14 }),
  },
  {
    name: 'ver_configuracion',
    title: 'Ver la configuración de un negocio',
    description: 'Todo lo que el dueño ve en Mi negocio → Configurar: claves de config (marca, estilo, lugar, horario, pagos, mensaje, comprobantes), servicios, horarios, sedes, mensajes, bloqueos, cupones y el link público. Léela antes de guardar_configuracion.',
    inputSchema: obj({ slug }, ['slug']),
    annotations: lectura,
    pedido: (a) => ({ accion: 'dueno', op: 'config', slug: a.slug }),
  },
  {
    name: 'guardar_configuracion',
    title: 'Guardar una sección de la configuración',
    description: [
      'Guarda una sección de la configuración de un negocio, con las mismas validaciones que Mi negocio → Configurar. `datos` tiene la misma forma que devuelve ver_configuracion:',
      '- marca: {config:{nombre_negocio, marca, logo_url, hero_titulo, hero_subtitulo}}',
      '- estilo: {config:{tema_estilo (elegante|moderno|editorial|amable|audaz|clasico|minimal|retro), paleta (Rosa Clásico, Rosa Palo, Coral, Terracota, Salvia, Bosque, Azul Noche, Lavanda, Dorado, Carbón), color_principal (#hex o vacío), color_fondo}}',
      '- lugar: {config:{lugar_tipo (spa|consultorio|barberia|estudio|salon|clinica|local|otro), lugar_nombre, permite_domicilio (si|no), recargo_domicilio_pct, minutos_extra_domicilio}, sedes:[{nombre, direccion, mapsUrl, activa}]}',
      '- horario: {config:{intervalo_min, dias_anticipacion, anticipacion_min_horas, zona_horaria, recordatorio_minutos}, horarios:[{dia:"Lunes", inicio:"09:00", fin:"18:00"}]} (los días sin tramo quedan cerrados)',
      '- servicios: {servicios:[{id, nombre, precio, duracion (min), categoria, adicional}]}',
      '- pagos: {config:{whatsapp, moneda (USD|EUR|Bs), metodos_pago ("Pago en el lugar, Bolívares (Pago Móvil)"), pm_banco, pm_telefono, pm_cedula, tasa_eur_manual, tasa_usd_manual}}',
      '- mensaje: {config:{mensaje_plantilla}, mensajes:[{nombre, texto}]}',
      '- comprobantes: {config:{facturacion_modo (interno|fiscal), ticket_reserva (si|no), facturacion_rif, facturacion_razon_social, facturacion_proveedor}}',
      '- bloqueos: {bloqueos:[{fecha:"yyyy-MM-dd", inicio, fin, motivo}]}',
      '- cupones: {cupones:[{codigo, porcentaje, monto, usos}]}',
      '- equipo (bookeaa team: una agenda por persona): {config:{equipo_activo (si|no), equipo_modo (servicio = primero el servicio | persona = primero la persona | ambos), equipo_cualquiera (si|no: ofrecer "Cualquiera disponible")}, equipo:[{id (de ver_configuracion; sin id = persona nueva), nombre, email (su Gmail: recibe su calendario), cargo, foto (https), servicios:[ids de servicios; vacío = todos], horarios:[{dia:"Lunes", inicio, fin}] (vacío = el del negocio), activo}]}. A cada persona nueva se le crea su calendario "Citas <nombre> · <negocio>" y se le comparte. Su link: https://www.bookeaa.com/u/<slug>?con=<id>.',
      'Ojo: servicios, horarios, sedes, mensajes, bloqueos, cupones y equipo REEMPLAZAN la lista completa: manda también los que se quedan (en equipo, quien no venga queda inactivo).',
    ].join('\n'),
    inputSchema: obj({ slug, seccion: { type: 'string', enum: SECCIONES }, datos: { type: 'object', additionalProperties: true } }, ['slug', 'seccion', 'datos']),
    annotations: escritura,
    pedido: (a) => ({ accion: 'dueno', op: 'guardar', slug: a.slug, seccion: a.seccion, datos: a.datos }),
  },
]

const INSTRUCCIONES = [
  'Administras bookeaa, una plataforma de reservas para negocios de Venezuela (barberías, spas, consultorios…).',
  'Cada negocio tiene su página en https://www.bookeaa.com/u/<slug>. El plan cuesta $10 al mes, con fecha de corte el día de ingreso y 3 días de gracia.',
  'Antes de cambiar algo, confirma con el administrador lo que vas a hacer si no lo pidió con claridad. Para configurar, lee primero ver_configuracion.',
].join(' ')

type Rpc = { jsonrpc: '2.0'; id?: string | number | null; method?: string; params?: any }

const ok = (id: Rpc['id'], result: unknown) => ({ jsonrpc: '2.0', id, result })
const fallo = (id: Rpc['id'], code: number, message: string) => ({ jsonrpc: '2.0', id: id ?? null, error: { code, message } })

/** La sesión de la central venció: el cliente tiene que volver a autorizar. */
class SesionVencida extends Error {}

async function llamarHerramienta(h: Herramienta, args: any, quien: Acceso, env: EnvConector) {
  const r = await appsScript(env, { ...h.pedido(args || {}), sesion: quien.sesion })
  if (r?.error === 'sesion') throw new SesionVencida()
  if (r?.error || r?.ok === false) {
    const mensaje = r.mensaje || (Array.isArray(r.errores) ? r.errores.join(' ') : '') || r.error || 'No se pudo completar.'
    return { content: [{ type: 'text', text: `No se pudo: ${mensaje}` }], isError: true }
  }
  const datos = h.forma ? h.forma(r, args || {}) : r
  return { content: [{ type: 'text', text: JSON.stringify(datos) }], structuredContent: datos && typeof datos === 'object' && !Array.isArray(datos) ? datos : { resultado: datos } }
}

async function atender(m: Rpc, quien: Acceso, env: EnvConector): Promise<object | null> {
  if (!m || m.jsonrpc !== '2.0' || typeof m.method !== 'string') return fallo(m?.id, -32600, 'Solicitud inválida')
  if (m.id === undefined) return null // notificación (ej. notifications/initialized): no lleva respuesta
  switch (m.method) {
    case 'initialize': {
      const pedida = String(m.params?.protocolVersion || '')
      return ok(m.id, {
        protocolVersion: VERSIONES.includes(pedida) ? pedida : VERSIONES[0],
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: 'bookeaa', title: 'bookeaa', version: '1.0.0' },
        instructions: INSTRUCCIONES,
      })
    }
    case 'ping':
      return ok(m.id, {})
    case 'tools/list':
      return ok(m.id, { tools: HERRAMIENTAS.map(({ name, title, description, inputSchema, annotations }) => ({ name, title, description, inputSchema, annotations })) })
    case 'tools/call': {
      const h = HERRAMIENTAS.find((x) => x.name === m.params?.name)
      if (!h) return fallo(m.id, -32602, `Herramienta desconocida: ${m.params?.name}`)
      try {
        return ok(m.id, await llamarHerramienta(h, m.params?.arguments, quien, env))
      } catch (e) {
        if (e instanceof SesionVencida) throw e
        return ok(m.id, { content: [{ type: 'text', text: `Error: ${(e as Error).message}` }], isError: true })
      }
    }
    default:
      return fallo(m.id, -32601, `Método no soportado: ${m.method}`)
  }
}

function noAutorizado(origen: string, descripcion: string) {
  // Las cabeceras HTTP van en ASCII: sin tildes ni comillas.
  const cabecera = descripcion.normalize('NFD').replace(/[^\x20-\x7e]/g, '').replace(/"/g, "'")
  return new Response(JSON.stringify({ error: 'invalid_token', error_description: descripcion }), {
    status: 401,
    headers: {
      'Content-Type': 'application/json',
      'WWW-Authenticate': `Bearer resource_metadata="${origen}/.well-known/oauth-protected-resource", error="invalid_token", error_description="${cabecera}"`,
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Expose-Headers': 'WWW-Authenticate',
    },
  })
}

/** POST /mcp. */
export async function manejarMcp(req: Request, url: URL, env: EnvConector, ahora = Date.now()): Promise<Response> {
  const h = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type, Authorization, Mcp-Protocol-Version, Mcp-Session-Id', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Expose-Headers': 'WWW-Authenticate' }
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: h })
  if (req.method !== 'POST') return new Response('Este conector solo acepta POST (sin streaming).', { status: 405, headers: { ...h, Allow: 'POST' } })
  const quien = await acceso(req, env, ahora)
  if (!quien) return noAutorizado(url.origin, 'Conecta bookeaa entrando con Google como administrador.')
  const cuerpo = (await req.json().catch(() => undefined)) as Rpc | Rpc[] | undefined
  if (cuerpo === undefined) return Response.json(fallo(null, -32700, 'JSON inválido'), { status: 400, headers: h })
  try {
    const lista = Array.isArray(cuerpo) ? cuerpo : [cuerpo]
    const respuestas = (await Promise.all(lista.map((m) => atender(m, quien, env)))).filter(Boolean)
    if (!respuestas.length) return new Response(null, { status: 202, headers: h })
    return Response.json(Array.isArray(cuerpo) ? respuestas : respuestas[0], { headers: h })
  } catch (e) {
    if (e instanceof SesionVencida) {
      await revocar(req, env)
      return noAutorizado(url.origin, 'La sesión de la central venció. Vuelve a conectar bookeaa.')
    }
    throw e
  }
}
