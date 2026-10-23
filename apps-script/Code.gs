/**
 * Backend maestro multi-negocio de "SaaS Reservas" (Google Apps Script + Sheets + Calendar).
 *
 * Un solo despliegue atiende a todos los negocios. Cada negocio tiene SU hoja de
 * Google (base de datos + configuración), SU calendario y SU carpeta de comprobantes.
 * El registro Tenants mapea slug → hoja.
 *
 * Instalación:
 *   1. Crea una hoja de cálculo maestra Y EJECUTA `setupMaster`. Crea la pestaña
 *      Tenants. (La hoja maestra es la que contiene este script.)
 *   2. Ejecuta `setupTemplate` para crear la hoja plantilla que se clona por negocio
 *      (guarda su ID en las propiedades del script).
 *   3. Ejecuta `crearTenant(slug, nombre, email)` por cada clienta.
 *   4. Menú SaaS Reservas > "Generar token de la API". Copia el token que muestra
 *      en VITE_API_TOKEN de Render y ejecuta "Actualizar todos los negocios".
 *   5. Menú SaaS Reservas > "Actualizar la tasa cada 2 horas" (instala el disparador).
 *   6. Implementar > Nueva implementación > Aplicación web
 *      Ejecutar como: Yo · Quién tiene acceso: Cualquier persona.
 *      Copia la URL (termina en /exec) para usarla como VITE_API_URL en el front.
 *   Cada vez que cambies este código: Implementar > Gestionar implementaciones >
 *   editar > Nueva versión (la URL se mantiene).
 */

// El token que exige cada petición NO vive en el código: está en las propiedades
// del script (clave api_token) y se crea con el menú "Generar token de la API".
// Ojo: el navegador lo manda en cada petición, así que no es una contraseña; solo
// frena bots casuales. Lo que protege de verdad son las validaciones de doPost.
const PROPIEDAD_TOKEN = 'api_token';
const ZONA = 'America/Caracas';
const PAGO_MOVIL = 'Bolívares (Pago Móvil)';
// Etiquetas conocidas. La hoja de cada negocio decide cuáles se ofrecen (config.metodos_pago).
const METODOS_PAGO = ['Pago en la cita', 'Pago en el lugar', PAGO_MOVIL];
// El front comprime el capture a ~150 KB; 3 MB deja margen sin abrir la puerta a basura.
const MAX_COMPROBANTE_BYTES = 3 * 1024 * 1024;
// Topes anti-spam (ver limite_). Por negocio: reservas por minuto, reservas del
// mismo teléfono por día y consultas de cupón cada 10 minutos.
const MAX_RESERVAS_POR_MINUTO = 30;
const MAX_RESERVAS_POR_TELEFONO_DIA = 3;
const MAX_CUPONES_10_MIN = 30;
// Largo máximo de lo que escribe la clienta.
const LARGO = { cliente: 80, telefono: 20, direccion: 200, sede: 80, cupon: 40 };
const CARPETA_RAIZ = 'SaaS-Reservas';
const NOMBRE_CARPETA_NEGOCIOS = 'Negocios';
const PROPIEDAD_TEMPLATE = 'tenant_plantilla_id';

// bookeaa team. Servicios = IDs separados por coma (vacío = hace todos). Horario = "lun 09:00-18:00, sáb 09:00-14:00"
// (vacío = el horario del negocio). Calendario_Id lo crea bookeaa y lo comparte con su Gmail.
const EQUIPO_HEADERS = ['ID', 'Nombre', 'Email', 'Calendario_Id', 'Foto_URL', 'Cargo', 'Servicios', 'Horario', 'Activo', 'Compartido'];
const MAX_EQUIPO = 30;
const MAX_FOTO_EQUIPO = 400000; // caracteres de la foto subida (data URL); Mi negocio la manda en ~30 KB

const SHEETS = [
  {
    name: 'Reservaciones',
    headers: ['ID', 'Fecha_Solicitud', 'Cliente', 'Telefono', 'Servicios', 'Total', 'Fecha_Cita', 'Hora_Cita',
      'Metodo_Pago', 'Referencia', 'Cupon', 'Estado', 'Tasa_BCV', 'Total_Bs',
      'Modalidad', 'Direccion', 'Recargo', 'Comprobante', 'Recibo_N', 'Profesional', 'Profesional_ID'],
  },
  { name: 'Servicios', headers: ['ID', 'Nombre', 'Precio', 'Duracion_Min', 'Tipo'] },
  { name: 'Promociones', headers: ['ID', 'Nombre', 'Servicios_Incluidos', 'Precio_Promo'] },
  { name: 'Cupones', headers: ['Codigo', 'Descuento_Porcentaje', 'Descuento_Monto', 'Usos_Restantes'] },
  { name: 'Configuracion', headers: ['Clave', 'Valor'] },
  { name: 'Horarios', headers: ['Dia', 'Hora_Inicio', 'Hora_Fin'] },
  { name: 'Bloqueos', headers: ['Fecha', 'Hora_Inicio', 'Hora_Fin', 'Motivo'] },
  // Dónde se atiende. Una sola agenda para todas las sedes: una hora ocupada lo está en todas.
  { name: 'Sedes', headers: ['Nombre', 'Direccion', 'Maps_URL', 'Activa'] },
  // Plantillas del mensaje de WhatsApp; `mensaje_plantilla` elige cuál se usa.
  { name: 'Mensajes', headers: ['Nombre', 'Texto'] },
  // bookeaa team: una agenda (calendario) por persona. Ver equipoLeer_.
  { name: 'Equipo', headers: EQUIPO_HEADERS },
];

/**
 * Tipos de lugar (clave `lugar_tipo`) con su artículo, porque se usan en frases:
 * "En el consultorio". Con 'otro' manda `lugar_nombre`. La misma lista vive en
 * src/lib/lugar.ts y en apps-script/cliente/; hay un test que las compara.
 */
const LUGAR_TIPOS = {
  spa: 'el spa',
  consultorio: 'el consultorio',
  barberia: 'la barbería',
  estudio: 'el estudio',
  salon: 'el salón',
  clinica: 'la clínica',
  local: 'el local',
};

/**
 * Las 3 plantillas con las que nace la pestaña Mensajes. Mismo texto que
 * src/lib/mensajes.ts (PLANTILLAS_MENSAJE); un test falla si se desincronizan.
 * Variables: {negocio} {nombre} {telefono} {fecha} {hora} {duracion} {servicios}
 * {lugar} {direccion} {cupon} {total} {pago} {comprobante} {calendario} {reserva}.
 */
const PLANTILLAS_MENSAJE = [
  {
    nombre: 'Cálida',
    texto: [
      '✨ ¡Nueva reserva en {negocio}! ✨',
      '',
      '¡Hola! 😊 Quiero confirmar mi cita:',
      '',
      '👤 Nombre: {nombre}',
      '📱 Teléfono: {telefono}',
      '',
      '🗓️ Fecha: {fecha}',
      '⏰ Hora: {hora} ({duracion} aprox.)',
      '',
      '💫 Servicios:',
      '{servicios}',
      '',
      '📍 Lugar: {lugar}',
      '{direccion}',
      '',
      '🎟️ {cupon}',
      '💰 Total: {total}',
      '💳 Pago: {pago}',
      '🧾 Capture: {comprobante}',
      '',
      '📆 Agrégala a tu calendario: {calendario}',
      '',
      '🔖 Reserva {reserva}',
      '¡Gracias! Nos vemos pronto 💕',
    ].join('\n'),
  },
  {
    nombre: 'Formal',
    texto: [
      'Buen día. Quisiera confirmar la siguiente cita en {negocio}:',
      '',
      'Nombre: {nombre}',
      'Teléfono: {telefono}',
      'Fecha: {fecha}',
      'Hora: {hora} (duración aproximada: {duracion})',
      '',
      'Servicios:',
      '{servicios}',
      '',
      'Lugar: {lugar}',
      '{direccion}',
      '{cupon}',
      'Total: {total}',
      'Forma de pago: {pago}',
      'Comprobante: {comprobante}',
      '',
      'Agregar al calendario: {calendario}',
      'Reserva {reserva}',
      '',
      'Quedo atento(a) a su confirmación. Muchas gracias.',
    ].join('\n'),
  },
  {
    nombre: 'Breve',
    texto: [
      'Hola, {negocio} 👋 Reservé para el {fecha} a las {hora}.',
      '{servicios}',
      '{lugar} · Total {total} · {pago}',
      'Soy {nombre} ({telefono}). Reserva {reserva}',
      '{calendario}',
    ].join('\n'),
  },
];

// Telefono, Vence, Ultimo_Pago y Notas los usa la central (/central): el cobro mensual de bookeaa.
const TENANT_HEADERS = ['Slug', 'Nombre', 'Spreadsheet_Id', 'Calendario_Id', 'Carpeta_Id', 'Token', 'Activo', 'Email', 'Creado', 'Telefono', 'Vence', 'Ultimo_Pago', 'Notas', 'Suspendido_Auto', 'Plan'];

const DIAS_SEMANA = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

// Claves que lee la landing. Los valores vacíos se completan en la hoja de cada negocio.
const CONFIG_DEFAULTS = [
  ['nombre_negocio', 'Mi Negocio'],
  ['marca', ''], // nombre visible en toda la app (si vacío usa nombre_negocio)
  ['logo_url', ''],
  ['whatsapp', ''],
  ['hora_apertura', '09:00'],
  ['hora_cierre', '19:00'],
  ['intervalo_min', '30'],
  ['dias_laborales', '1,2,3,4,5,6'], // 0 = domingo … 6 = sábado
  ['dias_anticipacion', '21'],
  ['anticipacion_min_horas', '2'],
  // Alertas del evento en el calendario, en minutos antes de la cita ("1440, 60").
  // "no" = sin alerta; vacío = la alerta por defecto del calendario. Se elige en la
  // ventana de configuración (Horario).
  ['recordatorio_minutos', ''],
  ['zona_horaria', ZONA],
  ['paleta', 'Rosa Clásico'], // dropdown: aplica base/soft/deep a la vez
  ['tema_base', ''], // hex manual; si está vacío manda la paleta
  ['tema_soft', ''],
  ['tema_deep', ''],
  ['tema_estilo', 'elegante'], // elegante | moderno | editorial | amable | audaz | clasico | minimal | retro
  ['color_principal', ''], // hex, ej. #1F6F5C. Si está lleno gana sobre la paleta y tema_base/soft/deep
  ['color_fondo', ''], // hex del fondo de la página, ej. #FFFFFF o #111111. Vacío = crema de siempre
  ['hero_titulo', ''],
  ['hero_subtitulo', ''],
  ['lugar_tipo', 'spa'], // spa | consultorio | barberia | estudio | salon | clinica | local | otro
  ['lugar_nombre', ''], // solo con lugar_tipo = otro: cómo se dice después de "En" (ej. "la clínica")
  ['permite_domicilio', 'si'], // si | no
  ['mensaje_plantilla', 'Cálida'], // nombre de una fila de la pestaña Mensajes
  ['metodos_pago', 'Pago en la cita, Bolívares (Pago Móvil)'],
  ['moneda', 'EUR'], // EUR | USD | Bs
  ['pm_banco', ''],
  ['pm_telefono', ''],
  ['pm_cedula', ''],
  ['tasa_eur_manual', ''],
  ['tasa_usd_manual', ''],
  ['recargo_domicilio_pct', '20'],
  ['minutos_extra_domicilio', '15'],
  // La dirección vive en la pestaña Sedes. direccion_spa/_url se siguen leyendo en
  // hojas viejas y prepararHoja_ las pasa a Sedes.
  ['slug', ''], // lo escribe crearTenant; la barra lateral lo usa para refrescar la página
  ['api_url', ''], // URL /exec de este script; idem
  ['pagina_url', ''], // enlace público del negocio (propiedad del script sitio_url + /u/slug)
  // Comprobantes: "interno" = el negocio puede dar el ticket de reserva NO fiscal (por defecto).
  // "fiscal" = el negocio factura con su imprenta digital autorizada; bookeaa no emite tickets.
  ['facturacion_modo', 'interno'],
  ['ticket_reserva', 'si'], // "no" apaga el ticket de reserva (solo cuenta en modo interno)
  ['facturacion_rif', ''],
  ['facturacion_razon_social', ''],
  ['facturacion_proveedor', ''], // imprenta digital autorizada por el SENIAT
  ['recibo_ultimo', '0'], // último número de ticket de reserva; lo lleva el script
  // bookeaa team (pestaña Equipo): si = cada persona tiene su agenda y el cliente elige con quién.
  ['equipo_activo', 'no'],
  ['equipo_modo', 'servicio'], // servicio = primero el servicio | persona = primero la persona | ambos
  ['equipo_cualquiera', 'si'], // ofrecer "Cualquiera disponible"
];

/**
 * Paletas predefinidas. Elige una del dropdown de Configuracion y la celda se pinta
 * con su color. La misma lista vive en src/lib/theme.ts; theme.test.ts falla si se
 * desincronizan, así que si tocas una toca la otra.
 */
const PALETAS = [
  { id: 'rosa-clasico', nombre: 'Rosa Clásico', base: '#E5B8C1', soft: '#F6E6E9', deep: '#B97A88' },
  { id: 'rosa-palo', nombre: 'Rosa Palo', base: '#D9B3B8', soft: '#F7ECEE', deep: '#9E6B72' },
  { id: 'coral', nombre: 'Coral', base: '#F0A08C', soft: '#FCE8E2', deep: '#C45A3C' },
  { id: 'terracota', nombre: 'Terracota', base: '#D9A08C', soft: '#F7E9E2', deep: '#A65E43' },
  { id: 'salvia', nombre: 'Salvia', base: '#A8BFA8', soft: '#E8F0E8', deep: '#5F7A5F' },
  { id: 'bosque', nombre: 'Bosque', base: '#7FA894', soft: '#E4F0E9', deep: '#3E6B55' },
  { id: 'azul-noche', nombre: 'Azul Noche', base: '#8FA8C8', soft: '#E6EDF6', deep: '#3E5A80' },
  { id: 'lavanda', nombre: 'Lavanda', base: '#B8A8D0', soft: '#EEE9F6', deep: '#6E5A96' },
  { id: 'dorado', nombre: 'Dorado', base: '#D9BC7A', soft: '#F7EFD9', deep: '#A8862F' },
  { id: 'carbon', nombre: 'Carbón', base: '#9A9A9A', soft: '#EDEDED', deep: '#3A3A3A' },
];

/**
 * Estilos de tipografía y forma. La misma lista (y orden) vive en src/lib/theme.ts.
 * elegante, editorial, clasico y retro usan serif; moderno, amable, audaz y minimal, sans.
 */
const ESTILOS = ['elegante', 'moderno', 'editorial', 'amable', 'audaz', 'clasico', 'minimal', 'retro'];

function paletaPorNombre_(valor) {
  const key = normKey_(valor);
  return PALETAS.filter(function (p) { return normKey_(p.id) === key || normKey_(p.nombre) === key; })[0] || null;
}

// ============================================================================
// 1. Configuración inicial (hoja maestra / plantilla / tenants)
// ============================================================================

function setupMaster() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName('Tenants');
  if (!sheet) {
    sheet = ss.insertSheet('Tenants');
    sheet.appendRow(TENANT_HEADERS);
  } else {
    const lastCol = Math.max(sheet.getLastColumn(), 1);
    const current = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(String);
    TENANT_HEADERS.forEach(function (h, i) {
      if (current.indexOf(h) === -1) sheet.getRange(1, i + 1).setValue(h);
    });
  }
  sheet.getRange(1, 1, 1, sheet.getLastColumn()).setFontWeight('bold').setBackground('#E5B8C1');
  sheet.setFrozenRows(1);
  Logger.log('Hoja maestra lista. Pestaña Tenants preparada.');
}

/** Crea la plantilla que se clona por cada negocio y guarda su ID. */
function setupTemplate() {
  const nombre = 'TENANT-Plantilla';
  const plantilla = SpreadsheetApp.create(nombre);
  prepararHoja_(plantilla, CONFIG_DEFAULTS[0][1]);
  PropertiesService.getScriptProperties().setProperty(PROPIEDAD_TEMPLATE, plantilla.getId());
  const url = plantilla.getUrl();
  Logger.log('Plantilla creada: ' + url);
  Logger.log('ID guardado. Usar este archivo como plantilla para los próximos negocios.');
}

function plantillaId_() {
  return PropertiesService.getScriptProperties().getProperty(PROPIEDAD_TEMPLATE);
}

function plantillaIdActual() {
  const id = plantillaId_();
  Logger.log(id ? 'Plantilla ID: ' + id : 'Todavía no hay plantilla. Ejecuta setupTemplate.');
  return id;
}

/**
 * Crea un nuevo negocio y lo deja listo para su dueña.
 * @param {string} slug Ej. "mariana" (minúsculas, a-z0-9-).
 * @param {string} nombre Ej. "ByMariaNails".
 * @param {string} email Correo de la clienta (opcional): editora de su hoja, dueña del calendario y de la carpeta.
 * @param {Object=} opt Para migrar negocios existentes: {ssId, calendarioId, carpetaId}.
 */
function crearTenant(slug, nombre, email, opt) {
  opt = opt || {};
  slug = String(slug || '').trim().toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '');
  nombre = String(nombre || '').trim() || 'Mi Negocio';
  email = String(email || '').trim();

  if (!/^[a-z0-9](?:[a-z0-9-]{0,30}[a-z0-9])?$/.test(slug)) {
    throw new Error('Slug inválido. Usa minúsculas, números y guiones (ej. "mariana-nails").');
  }
  if (getTenantPorSlug_(slug)) throw new Error('El slug "' + slug + '" ya existe.');

  const reg = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Tenants');
  if (!reg) throw new Error('Ejecuta setupMaster primero.');

  // --- Hoja del negocio: plantilla clonada u hoja existente (migración) ---
  let ssId = String(opt.ssId || '').trim();
  let ss;
  if (ssId) {
    ss = SpreadsheetApp.openById(ssId);
    prepararHoja_(ss, nombre);
  } else {
    const plantilla = plantillaId_();
    if (!plantilla) throw new Error('No hay plantilla. Ejecuta setupTemplate.');
    const archivo = DriveApp.getFileById(plantilla).makeCopy(nombre + ' — SaaS');
    ssId = archivo.getId();
    ss = SpreadsheetApp.openById(ssId);
    marcaHoja_(ss, nombre);
  }

  // --- Estructura de carpetas en Drive ---
  const carpetaNegocio = carpetaNegocio_(slug);
  let carpetaId = String(opt.carpetaId || carpetaNegocio.getId() || '').trim();
  let carpeta;
  if (opt.carpetaId) {
    carpeta = DriveApp.getFolderById(opt.carpetaId);
  } else {
    carpeta = crearCarpetaComprobantes_(carpetaNegocio, nombre);
    carpetaId = carpeta.getId();
  }

  // --- Calendario (siempre en la cuenta maestra; la clienta queda como owner) ---
  let calendarioId = String(opt.calendarioId || '').trim();
  let calendario;
  if (opt.calendarioId) {
    calendario = CalendarApp.getCalendarById(opt.calendarioId);
    if (!calendario) throw new Error('No tengo acceso al calendario ' + opt.calendarioId);
  } else {
    calendario = CalendarApp.createCalendar('Citas ' + nombre, { timeZone: ZONA });
    calendarioId = calendario.getId();
  }
  if (email) {
    try { ss.getOwner().addEditor(email); } catch (_) {}
    compartirCalendario_(calendarioId, email, 'owner');
    try { carpeta.addEditor(email); } catch (_) {}
  }

  // --- Registrar ---
  const creado = new Date();
  reg.appendRow([slug, nombre, ssId, calendarioId, carpetaId, Utilities.getUuid(), 'si', email, creado]);
  limpiarCacheTenants_(); // el slug nuevo tiene que verse de inmediato
  // Copia los IDs a la hoja del negocio (informativo).
  try {
    const cfg = ss.getSheetByName('Configuracion');
    setConfigKey_(cfg, 'calendario_id', calendarioId);
    setConfigKey_(cfg, 'carpeta_id', carpetaId);
    escribirEnlaces_(ss, slug);
  } catch (_) {}

  Logger.log('Negocio creado: ' + nombre + ' (slug: ' + slug + ')');
  Logger.log('Editar hoja: ' + ss.getUrl());
  Logger.log('Calendario: ' + calendarioId);
  Logger.log('Carpeta comprobantes: ' + carpetaId);
  return { slug: slug, ssId: ssId, calendarioId: calendarioId, carpetaId: carpetaId, url: ss.getUrl() };
}

function promptNuevoNegocio() {
  const ui = SpreadsheetApp.getUi();
  const r1 = ui.prompt('Nuevo negocio · Slug', 'Identificador corto (minúsculas, ej. "mariana")', ui.ButtonSet.OK_CANCEL);
  if (r1.getSelectedButton() !== ui.Button.OK) return;
  const r2 = ui.prompt('Nuevo negocio · Nombre', 'Nombre visible (ej. "ByMariaNails")', ui.ButtonSet.OK_CANCEL);
  if (r2.getSelectedButton() !== ui.Button.OK) return;
  const r3 = ui.prompt('Nuevo negocio · Correo (opcional)', 'Correo de la clienta: obtiene su hoja, calendario y carpeta.', ui.ButtonSet.OK_CANCEL);
  if (r3.getSelectedButton() !== ui.Button.OK) return;
  try {
    crearTenant(r1.getResponseText(), r2.getResponseText(), r3.getResponseText());
    ui.alert('Listo. Revisa los Registros (Ver > Registros) para el enlace de la hoja nueva.');
  } catch (err) {
    ui.alert('Error: ' + err.message);
  }
}

function verRegistro() {
  SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Tenants').activate();
  SpreadsheetApp.flush();
}

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('SaaS Reservas')
    .addItem('Nuevo negocio', 'promptNuevoNegocio')
    .addItem('Ver registro', 'verRegistro')
    .addItem('Crear plantilla', 'setupTemplate')
    .addItem('Ver ID plantilla', 'plantillaIdActual')
    .addItem('Diagnóstico de un negocio', 'promptDiagnostico')
    .addSeparator()
    .addItem('Actualizar un negocio', 'promptActualizarNegocio')
    .addItem('Actualizar todos los negocios', 'promptActualizarTodos')
    .addSeparator()
    .addItem('Generar token de la API', 'promptGenerarToken')
    .addItem('Actualizar la tasa cada 2 horas', 'instalarDisparadorTasa')
    .addSeparator()
    .addItem('Make: generar token de marketing', 'promptGenerarTokenMake')
    .addItem('Make: guardar webhook de publicación', 'promptWebhookMake')
    .addItem('Marketing: activar programador (Instagram y TikTok)', 'instalarProgramador')
    .addItem('TikTok: guardar claves de la app', 'promptClavesTikTok')
    .addItem('Bot de WhatsApp: generar token', 'promptGenerarTokenBot')
    .addItem('Bot de WhatsApp: avisos y calendario', 'promptAjustesBot')
    .addItem('Bot de WhatsApp: probar agenda', 'probarAgendaBot')
    .addItem('Cobros: activar automáticos (correos del banco y cortes)', 'instalarCobros')
    .addToUi();
}

function promptActualizarNegocio() {
  const ui = SpreadsheetApp.getUi();
  const r = ui.prompt('Actualizar negocio', 'Slug del negocio (ej. "mariana")', ui.ButtonSet.OK_CANCEL);
  if (r.getSelectedButton() !== ui.Button.OK) return;
  try {
    ui.alert(actualizarTenant(r.getResponseText()));
  } catch (err) {
    ui.alert('Error: ' + err.message);
  }
}

function promptActualizarTodos() {
  const ui = SpreadsheetApp.getUi();
  const r = ui.alert('Actualizar todos los negocios',
    'Agrega a cada hoja lo nuevo (pestañas, claves, plantillas, dropdowns). No borra datos. ¿Seguir?',
    ui.ButtonSet.OK_CANCEL);
  if (r !== ui.Button.OK) return;
  ui.alert(actualizarTodos());
}

/**
 * Crea un token nuevo y lo guarda en las propiedades del script. El anterior vale
 * 24 h más: en ese plazo hay que ponerlo en Render (VITE_API_TOKEN) y redesplegar,
 * y ejecutar "Actualizar todos los negocios" para que llegue a sus barras laterales.
 */
function promptGenerarToken() {
  const ui = SpreadsheetApp.getUi();
  const r = ui.alert('Generar token de la API',
    'El token actual seguirá funcionando 24 horas; en ese plazo pon el nuevo en Render (VITE_API_TOKEN) y redespliega. ¿Seguir?',
    ui.ButtonSet.OK_CANCEL);
  if (r !== ui.Button.OK) return;
  const token = generarTokenApi();
  ui.alert('Token nuevo',
    token + '\n\n1. Cópialo en Render > Environment > VITE_API_TOKEN y redespliega.\n' +
    '2. Ejecuta "Actualizar todos los negocios" para que llegue a cada barra lateral.',
    ui.ButtonSet.OK);
}

function generarTokenApi() {
  const props = PropertiesService.getScriptProperties();
  const token = 'bk_' + Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '').slice(0, 8);
  // El anterior sigue valiendo 24 h: mientras Render redespliega con el nuevo, la
  // página publicada todavía manda el viejo y no debe quedarse sin servicio.
  const anterior = props.getProperty(PROPIEDAD_TOKEN);
  if (anterior) {
    props.setProperty(PROPIEDAD_TOKEN + '_anterior', anterior);
    props.setProperty(PROPIEDAD_TOKEN + '_anterior_hasta', String(Date.now() + 24 * 60 * 60 * 1000));
  }
  props.setProperty(PROPIEDAD_TOKEN, token);
  try { CacheService.getScriptCache().remove(PROPIEDAD_TOKEN); } catch (_) {}
  return token;
}

/**
 * Los tokens que se aceptan: el vigente y, por 24 h después de cambiarlo, el
 * anterior. Se cachean 10 min para no leer propiedades en cada petición.
 */
function tokensValidos_() {
  const cache = CacheService.getScriptCache();
  const hit = cache.get(PROPIEDAD_TOKEN);
  if (hit) return JSON.parse(hit);
  const props = PropertiesService.getScriptProperties();
  const validos = [String(props.getProperty(PROPIEDAD_TOKEN) || '').trim()].filter(Boolean);
  const anterior = String(props.getProperty(PROPIEDAD_TOKEN + '_anterior') || '').trim();
  if (anterior && Number(props.getProperty(PROPIEDAD_TOKEN + '_anterior_hasta') || 0) > Date.now()) validos.push(anterior);
  if (validos.length) cache.put(PROPIEDAD_TOKEN, JSON.stringify(validos), 10 * 60);
  return validos;
}

/** El token vigente ('' si no se generó). Es el que se escribe en cada hoja. */
function tokenApi_() {
  return tokensValidos_()[0] || '';
}

/** Sin token configurado no se atiende a nadie: mejor cerrado que abierto por error. */
function tokenValido_(recibido) {
  const t = String(recibido || '');
  return t.length >= 16 && tokensValidos_().indexOf(t) !== -1;
}

function promptDiagnostico() {
  const ui = SpreadsheetApp.getUi();
  const r = ui.prompt('Diagnóstico', 'Slug del negocio (ej. "mariana")', ui.ButtonSet.OK_CANCEL);
  if (r.getSelectedButton() !== ui.Button.OK) return;
  try {
    diagnostico(r.getResponseText());
  } catch (err) {
    ui.alert('Error: ' + err.message);
  }
}

// ---------- Armado de hoja de negocio ----------

/**
 * Prepara una hoja de negocio: pestañas, encabezados, claves, dropdowns y formato.
 * La usan setupTemplate, crearTenant y actualizarTenant. Nunca borra ni pisa datos:
 * solo agrega lo que falta. Devuelve qué agregó, para el resumen de "Actualizar".
 */
function prepararHoja_(ss, nombrePorDefecto) {
  const hecho = { pestanas: [], claves: [], sedesMigradas: 0, mensajesNuevos: 0 };
  // Los encabezados toman el color del negocio: color_principal > hex manual > paleta > rosa.
  const previa = getConfig_(ss);
  const paletaPrevia = paletaPorNombre_(previa.paleta || '');
  const colorCabecera = hexValido_(previa.color_principal) || previa.tema_base ||
    (paletaPrevia && paletaPrevia.base) || PALETAS[0].base;
  const textoCabecera = esOscuro_(colorCabecera) ? '#FFFFFF' : '#1A1816';
  SHEETS.forEach(function (s) {
    let sheet = ss.getSheetByName(s.name);
    if (!sheet) {
      sheet = ss.insertSheet(s.name);
      sheet.appendRow(s.headers);
      hecho.pestanas.push(s.name);
    } else {
      const lastCol = Math.max(sheet.getLastColumn(), 1);
      const current = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(String);
      s.headers.forEach(function (h) {
        if (current.indexOf(h) === -1) sheet.getRange(1, sheet.getLastColumn() + 1).setValue(h);
      });
    }
    sheet.getRange(1, 1, 1, sheet.getLastColumn())
      .setFontWeight('bold').setBackground(colorCabecera).setFontColor(textoCabecera);
    sheet.setFrozenRows(1);
  });

  const config = ss.getSheetByName('Configuracion');
  config.getRange('A:B').setNumberFormat('@');
  const existentes = getConfig_(ss);
  CONFIG_DEFAULTS.forEach(function (kv) {
    if (!(kv[0] in existentes)) {
      config.appendRow(kv);
      hecho.claves.push(kv[0]);
    }
  });
  if (!(existentes['marca'])) setConfigKey_(config, 'marca', nombrePorDefecto);

  hecho.mensajesNuevos = prepararMensajes_(ss);
  hecho.sedesMigradas = prepararSedes_(ss);
  aplicarOpcionesConfig_(ss, config);

  const horarios = ss.getSheetByName('Horarios');
  horarios.getRange('A:C').setNumberFormat('@');
  if (horarios.getLastRow() < 2) {
    const cfg = getConfig_(ss);
    const dias = String(cfg.dias_laborales || '1,2,3,4,5,6').split(/[,;\s]+/).map(Number);
    const rows = [1, 2, 3, 4, 5, 6, 0].map(function (d) {
      return dias.indexOf(d) === -1
        ? [DIAS_SEMANA[d], '', '']
        : [DIAS_SEMANA[d], cfg.hora_apertura || '09:00', cfg.hora_cierre || '19:00'];
    });
    horarios.getRange(2, 1, rows.length, 3).setValues(rows);
  }
  ss.getSheetByName('Bloqueos').getRange('B:C').setNumberFormat('@');
  return hecho;
}

/** Siembra las 3 plantillas si la pestaña Mensajes está vacía. Devuelve cuántas escribió. */
function prepararMensajes_(ss) {
  const sheet = ss.getSheetByName('Mensajes');
  sheet.setColumnWidth(1, 140);
  sheet.setColumnWidth(2, 520);
  sheet.getRange('B:B').setWrap(true).setVerticalAlignment('top');
  sheet.getRange('A:A').setVerticalAlignment('top');
  if (getSheetData_(ss, 'Mensajes').length > 0) return 0;
  const filas = PLANTILLAS_MENSAJE.map(function (p) { return [p.nombre, p.texto]; });
  sheet.getRange(2, 1, filas.length, 2).setValues(filas);
  sheet.getRange(1, 2).setNote(
    'Variables: {negocio} {nombre} {telefono} {fecha} {hora} {duracion} {servicios} {lugar} ' +
    '{direccion} {cupon} {total} {pago} {comprobante} {calendario} {reserva}.\n\n' +
    'Si todas las variables de una línea quedan vacías (ej. no hubo cupón), esa línea no sale en el mensaje. ' +
    'Elige cuál se usa en Configuracion → mensaje_plantilla.'
  );
  return filas.length;
}

/**
 * La pestaña Sedes nace con una fila. Si la hoja es vieja y tenía direccion_spa,
 * esa dirección pasa a la sede (las claves viejas se quedan, no se borra nada).
 * Devuelve 1 si migró una dirección, 0 si no.
 */
function prepararSedes_(ss) {
  const sheet = ss.getSheetByName('Sedes');
  sheet.getRange('A:C').setNumberFormat('@');
  const n = Math.max(sheet.getLastRow() - 1, 1);
  sheet.getRange(2, 4, n + 20, 1).insertCheckboxes();
  sheet.getRange(1, 1).setNote('Una fila por sede. Con una sola sede la página dice "En el consultorio" (según lugar_tipo); ' +
    'con varias, el cliente elige entre sus nombres. Todas comparten la misma agenda.');
  if (getSheetData_(ss, 'Sedes').length > 0) return 0;
  const cfg = getConfig_(ss);
  const nombre = capitalizar_(etiquetaLugar_(cfg));
  sheet.getRange(2, 1, 1, 4).setValues([[nombre, cfg.direccion_spa || '', cfg.direccion_spa_url || '', true]]);
  return cfg.direccion_spa || cfg.direccion_spa_url ? 1 : 0;
}

/**
 * Dropdowns y notas de Configuracion: estilo, paleta (con muestra de color), lugar,
 * domicilio, moneda y plantilla de mensaje (lista tomada de la pestaña Mensajes).
 */
function aplicarOpcionesConfig_(ss, configSheet) {
  const lista = function (valores) {
    return SpreadsheetApp.newDataValidation().requireValueInList(valores, true).setAllowInvalid(false).build();
  };
  const data = configSheet.getDataRange().getValues();
  let celdaPaleta = null;
  for (let i = 1; i < data.length; i++) {
    const clave = normKey_(data[i][0]);
    const celda = configSheet.getRange(i + 1, 2);
    if (clave === 'paleta') {
      celdaPaleta = celda;
      celda.setDataValidation(lista(PALETAS.map(function (p) { return p.nombre; })));
      celda.setNote('Atajo de colores. Si color_principal está lleno, manda ese color y la paleta no se usa. ' +
        'Más cómodo: menú bookeaa → Configurar mi página.');
    } else if (clave === 'temaestilo') {
      celda.setDataValidation(lista(ESTILOS));
      celda.setNote(
        'elegante: serif fina · moderno: sans firme · editorial: serif de revista · amable: redondeada\n' +
        'audaz: condensada en mayúsculas · clasico: serif sobria · minimal: una sans, sin adornos · ' +
        'retro: serif cálida y muy redonda.\n\nLa distribución de la página es la misma en todos.'
      );
    } else if (clave === 'colorprincipal') {
      celda.setNote('Color de marca en hex (ej. #1F6F5C). De él salen botones, chips y el texto de acento; ' +
        'el tono se ajusta solo para que se lea. Si está lleno, gana sobre la paleta y tema_base/soft/deep.');
    } else if (clave === 'colorfondo') {
      celda.setNote('Fondo de la página en hex (ej. #FFFFFF, #F4EFE6 o #111111). Si es oscuro, los textos ' +
        'pasan a claro solos. Vacío = el crema de siempre.');
    } else if (clave === 'lugartipo') {
      celda.setDataValidation(lista(Object.keys(LUGAR_TIPOS).concat(['otro'])));
      celda.setNote('Cómo se llama el lugar donde atiendes: la página dice "En el consultorio", "Ver ubicación de la barbería"… ' +
        'Con "otro", escribe el nombre en lugar_nombre. Las direcciones van en la pestaña Sedes.');
    } else if (clave === 'lugarnombre') {
      celda.setNote('Solo si lugar_tipo = otro. Escríbelo como va después de "En": "la clínica", "el taller", "Casa Ana".');
    } else if (clave === 'permitedomicilio') {
      celda.setDataValidation(lista(['si', 'no']));
      celda.setNote('"si" agrega la opción "A domicilio" con el recargo y los minutos extra de más abajo.');
    } else if (clave === 'moneda') {
      celda.setDataValidation(lista(['EUR', 'USD', 'Bs']));
    } else if (clave === 'facturacionmodo') {
      celda.setDataValidation(lista(['interno', 'fiscal']));
      celda.setNote('interno: el negocio puede dar el ticket de reserva NO fiscal (control interno; ver ticket_reserva). ' +
        'fiscal: el negocio factura con su imprenta digital autorizada por el SENIAT y bookeaa no emite tickets.');
    } else if (clave === 'ticketreserva') {
      celda.setDataValidation(lista(['si', 'no']));
      celda.setNote('"si": al reservar, el cliente ve su ticket de reserva imprimirse y lo descarga como imagen. ' +
        '"no": pasa directo a WhatsApp, sin ticket. Solo cuenta con facturacion_modo = interno.');
    } else if (clave === 'reciboultimo') {
      celda.setNote('Último número de ticket de reserva. Lo lleva el script: no lo cambies a mano.');
    } else if (clave === 'mensajeplantilla') {
      const mensajes = ss.getSheetByName('Mensajes');
      if (mensajes) {
        celda.setDataValidation(SpreadsheetApp.newDataValidation()
          .requireValueInRange(mensajes.getRange('A2:A'), true).setAllowInvalid(false).build());
      }
      celda.setNote('Qué plantilla de la pestaña Mensajes se usa para el WhatsApp de cada reserva.');
    }
  }
  if (!celdaPaleta) return;
  const nombres = PALETAS.map(function (p) { return p.nombre; });
  const viejas = configSheet.getConditionalFormatRules().filter(function (r) {
    const cond = r.getBooleanCondition();
    const valores = cond ? cond.getCriteriaValues() : [];
    return !(valores.length && nombres.indexOf(String(valores[0])) !== -1);
  });
  const nuevas = PALETAS.map(function (p) {
    return SpreadsheetApp.newConditionalFormatRule()
      .whenTextEqualTo(p.nombre)
      .setBackground(p.base)
      .setRanges([celdaPaleta])
      .build();
  });
  configSheet.setConditionalFormatRules(viejas.concat(nuevas));
}

/**
 * Pone al día la hoja de un negocio ya creado con todo lo nuevo: pestañas (Sedes,
 * Mensajes), claves, dropdowns, plantillas de mensaje, migración de la dirección
 * vieja a Sedes y los enlaces que usa la barra lateral. No borra ni pisa datos.
 * Devuelve un resumen legible de lo que cambió.
 */
function actualizarTenant(slug) {
  const tenant = getTenantPorSlug_(String(slug || '').trim());
  if (!tenant) throw new Error('No encontré el negocio: ' + slug);
  const ss = openTenant_(tenant);
  const hecho = prepararHoja_(ss, tenant.nombre);
  const enlaces = escribirEnlaces_(ss, tenant.slug);
  limpiarCacheCatalogo_(tenant.slug);
  limpiarCacheTenants_();
  Logger.log('Hoja actualizada: ' + ss.getUrl());

  const lineas = [];
  if (hecho.pestanas.length) lineas.push('Pestañas nuevas: ' + hecho.pestanas.join(', '));
  if (hecho.claves.length) lineas.push('Claves nuevas: ' + hecho.claves.join(', '));
  if (hecho.mensajesNuevos) lineas.push('Plantillas de mensaje: ' + hecho.mensajesNuevos);
  if (hecho.sedesMigradas) lineas.push('La dirección de siempre pasó a la pestaña Sedes');
  if (enlaces) lineas.push('Enlaces para la barra lateral: ' + enlaces);
  return '"' + tenant.nombre + '": ' + (lineas.length ? '\n  · ' + lineas.join('\n  · ') : 'ya estaba al día.') +
    '\n' + ss.getUrl();
}

/** Actualiza todas las hojas de negocios activos. Un negocio que falle no frena a los demás. */
function actualizarTodos() {
  const resumen = getTenants_().filter(tenantActivo_).map(function (t) {
    try {
      return actualizarTenant(t.slug);
    } catch (err) {
      return '"' + t.nombre + '": ERROR — ' + err.message;
    }
  });
  const texto = resumen.length ? resumen.join('\n\n') : 'No hay negocios activos.';
  Logger.log(texto);
  return texto;
}

/**
 * Escribe slug, api_url y api_token en la Configuracion del negocio si faltan o cambiaron. La barra lateral
 * los usa para pedir la página fresca después de guardar (fresh=1). Devuelve qué escribió.
 */
function escribirEnlaces_(ss, slug) {
  const cfgSheet = ss.getSheetByName('Configuracion');
  const cfg = getConfig_(ss);
  const escritos = [];
  if (!cfg.slug) {
    setConfigKey_(cfgSheet, 'slug', slug);
    escritos.push('slug');
  }
  let url = '';
  try { url = ScriptApp.getService().getUrl() || ''; } catch (_) {}
  // /dev solo le funciona al dueño: a la barra lateral le sirve la /exec publicada.
  if (url && /\/exec$/.test(url) && cfg.api_url !== url) {
    setConfigKey_(cfgSheet, 'api_url', url);
    escritos.push('api_url');
  }
  // Token para que la barra lateral pida la página fresca. Es el mismo que ya viaja
  // en cada petición del navegador, así que no expone nada nuevo.
  const token = tokenApi_();
  if (token && cfg.api_token !== token) {
    setConfigKey_(cfgSheet, 'api_token', token);
    escritos.push('api_token');
  }
  // Enlace público: propiedad del script "sitio_url" (ej. https://bookea.onrender.com).
  const sitio = String(PropertiesService.getScriptProperties().getProperty('sitio_url') || '').replace(/\/+$/, '');
  const pagina = sitio && slug ? sitio + '/u/' + slug : '';
  if (pagina && cfg.pagina_url !== pagina) {
    setConfigKey_(cfgSheet, 'pagina_url', pagina);
    escritos.push('pagina_url');
  }
  return escritos.join(', ');
}

function setConfigKey_(configSheet, key, value) {
  const data = configSheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (normKey_(data[i][0]) === normKey_(key)) {
      configSheet.getRange(i + 1, 2).setValue(String(value));
      return;
    }
  }
  configSheet.appendRow([String(key), String(value)]);
}

function marcaHoja_(ss, nombre) {
  const cfg = ss.getSheetByName('Configuracion');
  setConfigKey_(cfg, 'nombre_negocio', nombre);
  setConfigKey_(cfg, 'marca', nombre);
}

// ---------- Carpetas de Drive ----------

function carpetaNegocio_(slug) {
  const root = DriveApp.getFoldersByName(CARPETA_RAIZ).hasNext()
    ? DriveApp.getFoldersByName(CARPETA_RAIZ).next()
    : DriveApp.createFolder(CARPETA_RAIZ);
  const negocios = root.getFoldersByName(NOMBRE_CARPETA_NEGOCIOS).hasNext()
    ? root.getFoldersByName(NOMBRE_CARPETA_NEGOCIOS).next()
    : root.createFolder(NOMBRE_CARPETA_NEGOCIOS);
  const folder = negocios.getFoldersByName(slug).hasNext()
    ? negocios.getFoldersByName(slug).next()
    : negocios.createFolder(slug);
  return folder;
}

function crearCarpetaComprobantes_(parent, nombre) {
  return parent.createFolder('Comprobantes ' + nombre);
}

// ---------- Registro Tenants ----------

function getTenantPorSlug_(slug) {
  const key = normKey_(slug);
  return getTenants_().filter(function (t) { return normKey_(t.slug) === key; })[0] || null;
}

function getTenantPorSsId_(ssId) {
  const key = String(ssId || '').trim();
  if (!key) return null;
  return getTenants_().filter(function (t) { return t.ssId === key; })[0] || null;
}

function getTenantPorParametro_(p) {
  const slug = String(p.shop || p.slug || '').trim().toLowerCase();
  const ssId = String(p.ss_id || '').trim();
  const t = slug ? getTenantPorSlug_(slug) : ssId ? getTenantPorSsId_(ssId) : null;
  return t && tenantActivo_(t) ? t : null;
}

function tenantActivo_(t) {
  const a = String(t.activo || 'si').trim().toLowerCase();
  return a !== 'no' && a !== 'false' && a !== '0';
}

/**
 * Todos los negocios. Se cachea porque se lee en CADA petición (token → slug →
 * hoja) y cambia poquísimo: dar de alta un negocio se tarda en verse, y
 * crearTenant_ / actualizarTenant limpian la caché.
 */
function getTenants_() {
  const cache = CacheService.getScriptCache();
  const hit = cache.get('tenants');
  if (hit) {
    try {
      return JSON.parse(hit);
    } catch (_) {
      cache.remove('tenants');
    }
  }
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Tenants');
  if (!sheet || sheet.getLastRow() < 2) return [];
  const rows = sheet.getDataRange().getValues();
  const headers = rows.shift().map(String);
  const tenants = rows
    .filter(function (r) { return r.some(function (c) { return c !== ''; }); })
    .map(function (r) {
      const obj = {};
      headers.forEach(function (h, i) { obj[h] = r[i]; });
      return {
        slug: String(obj.Slug || obj.slug || '').trim(),
        nombre: String(obj.Nombre || obj.nombre || '').trim(),
        ssId: String(obj.Spreadsheet_Id || obj.spreadsheet_id || obj.ssId || '').trim(),
        calendarioId: String(obj.Calendario_Id || obj.calendario_id || obj.calendarioId || '').trim(),
        carpetaId: String(obj.Carpeta_Id || obj.carpeta_id || obj.carpetaId || '').trim(),
        token: String(obj.Token || obj.token || '').trim(),
        activo: String(obj.Activo || obj.activo || 'si').trim(),
        email: String(obj.Email || obj.email || '').trim(),
      };
    });
  try {
    cache.put('tenants', JSON.stringify(tenants), CACHE_DIRECTORIO_SEG);
  } catch (_) {
    /* si no cabe o falla, se relee la hoja */
  }
  return tenants;
}

/** El directorio se relee de la hoja: se llama al dar de alta o editar un negocio. */
function limpiarCacheTenants_() {
  try {
    CacheService.getScriptCache().remove('tenants');
  } catch (_) {
    /* nada */
  }
}

function openTenant_(tenant) {
  return SpreadsheetApp.openById(tenant.ssId);
}

function getCalendarioTenant_(tenant) {
  if (!tenant.calendarioId) return null;
  try {
    return CalendarApp.getCalendarById(tenant.calendarioId);
  } catch (_) {
    return null;
  }
}

// ============================================================================
// 2. GET: catálogo, configuración, tasa y ocupación (o validación de cupón)
// ============================================================================

function doGet(e) {
  try {
    const p = (e && e.parameter) || {};
    if (!tokenValido_(p.token)) return json_({ error: 'no_autorizado' });

    const tenant = getTenantPorParametro_(p);
    if (!tenant) return json_({ error: 'no_tenant', mensaje: 'Este negocio no existe o está desactivado.' });

    // Catálogo: de la caché si se puede, antes de tocar una sola hoja.
    // fresh=1 salta la lectura pero vuelve a llenar la caché: lo usa la pantalla de
    // agenda para ver la ocupación real sin esperar los 15 minutos de TTL.
    // Solo el catálogo (GET sin action) se cachea; cupon y demás van directo a la hoja.
    if (!p.action && p.fresh !== '1') {
      const hit = leerCacheCatalogo_(tenant.slug);
      if (hit) return jsonDeTexto_(conLogo_(hit, logoNegocio_(tenant, null)));
    }

    const ss = openTenant_(tenant);

    if (p.action === 'cupon') {
      // Sin tope, los códigos se podrían adivinar probando miles.
      if (limite_('cupon_' + tenant.slug, MAX_CUPONES_10_MIN, 600)) {
        return json_({ valido: false, mensaje: 'Demasiados intentos. Espera unos minutos.' });
      }
      const cupon = buscarCupon_(ss, String(p.codigo || '').slice(0, LARGO.cupon));
      if (!cupon) return json_({ valido: false, mensaje: 'Este cupón no existe o ya se agotó.' });
      return json_({ valido: true, codigo: cupon.codigo, porcentaje: cupon.porcentaje, monto: cupon.monto });
    }

    const config = getConfig_(ss);
    const dias = Number(config.dias_anticipacion) || 21;
    const servicios = getServicios_(ss);
    const moneda = normalizarMoneda_(config.moneda);
    const equipo = equipoActivo_(ss, config);

    const texto = jsonTexto_({
      negocio: tenant.nombre,
      servicios: servicios,
      promociones: getPromociones_(ss, servicios),
      config: configPublica_(config), // la lista de cupones NO se envía al navegador
      horarios: getHorarios_(ss, config),
      sedes: getSedes_(ss, config),
      mensajes: getMensajes_(ss),
      tasa: getTasa(moneda, ss),
      moneda: moneda,
      // Citas del calendario + bloqueos de la hoja, solo como rangos (sin nombres
      // ni motivos). Es la única fuente de ocupacion: si no esta aqui, esta libre.
      citasAgendadas: getOcupacionCalendario_(dias, tenant)
        .concat(getBloqueos_(ss, dias).map(function (b) {
          return { inicio: b.inicio.toISOString(), fin: b.fin.toISOString() };
        })),
      // bookeaa team: quién atiende y la ocupación del calendario de cada persona.
      equipo: equipoPublico_(equipo),
      citasEquipo: equipo.length ? getOcupacionEquipo_(equipo, dias) : {},
    });
    guardarCacheCatalogo_(tenant.slug, texto, CACHE_CATALOGO_SEG);
    // El logo va aparte de la caché del catálogo (puede pesar ~40 KB): se agrega al responder.
    return jsonDeTexto_(conLogo_(texto, logoNegocio_(tenant, ss)));
  } catch (err) {
    console.error(err);
    return json_({ error: 'servidor', mensaje: 'Error del servidor. Intenta de nuevo.' });
  }
}

/** Configuracion sin las claves internas (las que usa la barra lateral). */
function configPublica_(config) {
  const out = {};
  Object.keys(config).forEach(function (k) {
    // Lo interno no viaja al navegador. facturacion_modo y ticket_reserva sí: la página decide si da el ticket.
    const interna = k === 'api_token' || k === 'api_url' || k === 'recibo_ultimo' ||
      (k.indexOf('facturacion_') === 0 && k !== 'facturacion_modo');
    if (!interna) out[k] = config[k];
  });
  return out;
}

// ============================================================================
// 3. POST: registrar la reservación
// ============================================================================

function doPost(e) {
  let data;
  try {
    data = JSON.parse(e.postData.contents);
  } catch (err) {
    return json_({ error: 'datos_invalidos', mensaje: 'Solicitud inválida.' });
  }
  // El bot de WhatsApp tiene su propio token (no el público de la web) y no es de un negocio.
  if (data && data.accion === 'central') {
    try {
      return json_(atenderCentral_(data, Date.now()));
    } catch (err) {
      console.error('central: ' + err);
      return json_({ error: 'servidor', mensaje: 'Error del servidor. Intenta de nuevo.' });
    }
  }
  if (data && data.accion === 'make') {
    try {
      return json_(atenderMake_(data, Date.now()));
    } catch (err) {
      return json_({ error: 'excepcion', mensaje: String(err && err.message || err).slice(0, 300) });
    }
  }
  if (data && data.accion === 'dueno') {
    try {
      return json_(atenderDueno_(data, Date.now()));
    } catch (err) {
      console.error('dueno: ' + err);
      return json_({ error: 'servidor', mensaje: 'Error del servidor. Intenta de nuevo.' });
    }
  }
  if (data && data.accion === 'bot') {
    // Si algo revienta (permisos de Calendar, servicio sin activar), el bot recibe el motivo
    // en JSON en vez de la página de error de Google.
    try {
      return json_(atenderBot_(data, Date.now()));
    } catch (err) {
      return json_({ error: 'excepcion', mensaje: String(err && err.message || err).slice(0, 300) });
    }
  }
  if (!tokenValido_(data.token)) return json_({ error: 'no_autorizado' });

  const tenant = getTenantPorParametro_(data);
  if (!tenant) return json_({ error: 'no_tenant', mensaje: 'Este negocio no existe o está desactivado.' });

  // Anti-inundación, antes de esperar el lock: alguien mandando reservas en bucle
  // no debe poder tapar la fila de todos los negocios.
  if (limite_('post_' + tenant.slug, MAX_RESERVAS_POR_MINUTO, 60)) {
    return json_({ error: 'servidor', mensaje: 'Hay mucha demanda en este momento. Intenta en un minuto.' });
  }

  // Un solo POST a la vez. Sin esto, dos peticiones pueden pasar la comprobación de
  // disponibilidad al mismo tiempo y las dos creerse dueñas de la misma hora, o la
  // segunda ver "ocupado" por el evento que la primera aún no ha escrito. El lock
  // abarca desde la comprobación hasta la escritura: eso es lo que compite.
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(25000)) {
    return json_({ error: 'servidor', mensaje: 'Hay mucha demanda en este momento. Intenta de nuevo.' });
  }

  let hecha = null; // la reserva guardada; lo que sigue al lock se hace con esto
  try {
    const ss = openTenant_(tenant);
    const config = getConfig_(ss);
    const zona = config.zona_horaria || ZONA;
    const moneda = normalizarMoneda_(config.moneda);

    // --- Validación de datos ---
    // Cada nombre se declara aquí y una sola vez. Antes el mismo nombre estaba
    // declarado dos veces: una fuera del try y otra dentro con const, que la tapaba.
    // Adentro mandaba la const, pero al salir a armar la respuesta volvía la de
    // afuera, sin asignar, y `orden.total` reventaba con un TypeError fuera de
    // todo try/catch: la reserva quedaba guardada y el cliente recibía un error 500
    // sin poder ni ver la fila ni el resumen de WhatsApp.
    const cliente = limpiarTexto_(data.cliente, LARGO.cliente);
    const telefono = limpiarTexto_(data.telefono, LARGO.telefono);
    const fechaCita = String(data.fechaCita || '');
    const horaCita = String(data.horaCita || '');
    const metodoPago = String(data.metodoPago || '');
    const esPagoMovil = metodoPago === PAGO_MOVIL;
    // 'spa' era el nombre viejo de 'local': un navegador con la versión anterior en caché lo sigue mandando.
    const modalidad = data.modalidad === 'spa' ? 'local' : String(data.modalidad || '');
    // A domicilio la clienta envía su ubicación por WhatsApp; el campo es opcional.
    const direccion = limpiarTexto_(data.direccion, LARGO.direccion) || (data.modalidad === 'domicilio' ? 'Ubicación por WhatsApp' : '');
    const comprobante = data.comprobante && data.comprobante.base64 ? data.comprobante : null;

    if (cliente.length < 2 || telefono.replace(/\D/g, '').length < 10 ||
        !/^\d{4}-\d{2}-\d{2}$/.test(fechaCita) || !/^\d{2}:\d{2}$/.test(horaCita)) {
      return json_({ error: 'datos_invalidos', mensaje: 'Revisa tus datos e intenta de nuevo.' });
    }
    if (METODOS_PAGO.indexOf(metodoPago) === -1 || !esMetodoPermitido_(config, metodoPago)) {
      return json_({ error: 'datos_invalidos', mensaje: 'Selecciona un método de pago.' });
    }
    const permiteDomicilio = permiteDomicilio_(config);
    if (modalidad !== 'local' && modalidad !== 'domicilio') {
      return json_({ error: 'datos_invalidos', mensaje: 'Elige dónde será tu cita.' });
    }
    if (modalidad === 'domicilio' && !permiteDomicilio) {
      return json_({ error: 'datos_invalidos', mensaje: 'Este negocio no ofrece citas a domicilio.' });
    }
    // En el local: la sede tiene que existir. Con una sola, vale aunque no venga el nombre.
    const sedes = getSedes_(ss, config);
    let sede = null;
    if (modalidad === 'local') {
      const pedida = normKey_(limpiarTexto_(data.sede, LARGO.sede));
      sede = sedes.filter(function (x) { return normKey_(x.nombre) === pedida; })[0] ||
        (sedes.length === 1 ? sedes[0] : null);
      if (!sede) return json_({ error: 'datos_invalidos', mensaje: 'Elige dónde será tu cita.' });
    }
    const lugarTexto = modalidad === 'domicilio'
      ? 'A domicilio'
      : 'En ' + (sedes.length > 1 ? sede.nombre : etiquetaLugar_(config));
    if (esPagoMovil && !comprobante) {
      return json_({ error: 'datos_invalidos', mensaje: 'Falta el capture del Pago Móvil.' });
    }
    if (comprobante && (String(comprobante.base64).length * 3) / 4 > MAX_COMPROBANTE_BYTES) {
      return json_({ error: 'datos_invalidos', mensaje: 'La imagen del capture es demasiado grande.' });
    }
    if (comprobante && !esImagen_(bytesDe_(comprobante.base64))) {
      return json_({ error: 'datos_invalidos', mensaje: 'El capture tiene que ser una foto o una captura de pantalla.' });
    }
    // Tope por teléfono: nadie reserva más de 3 veces al día en el mismo negocio.
    // Se cuenta solo lo que se guardó (más abajo), así un "horario ocupado" no gasta cupo.
    const claveTelefono = 'tel_' + tenant.slug + '_' + telefono.replace(/\D/g, '');
    if (contador_(claveTelefono) >= MAX_RESERVAS_POR_TELEFONO_DIA) {
      return json_({ error: 'datos_invalidos', mensaje: 'Ya tienes varias reservas hoy en este negocio. Escríbele por WhatsApp si necesitas otra.' });
    }
    const reservaIdPedida = /^[\w-]{8,64}$/.test(String(data.reservaId || '')) ? String(data.reservaId) : '';

    // --- Reintento de una reserva que ya se guardó ---
    // Si esta misma reservaId ya tiene fila, el cliente se quedó sin respuesta la
    // primera vez y está reintentando. Se devuelve el éxito tal cual: seguir a la
    // comprobación de disponibilidad daría "ocupado" por el evento que él mismo
    // acaba de crear, y la reserva se perdería sin dejar rastro en la hoja.
    const previa = reservaIdPedida ? buscarReservaPorId_(ss, reservaIdPedida, fechaCita, horaCita) : null;
    if (previa) return json_(previa);

    // --- El total se recalcula aquí; no se confía en el que manda el navegador ---
    const cuponPedido = data.cupon ? String(data.cupon).slice(0, LARGO.cupon) : '';
    const orden = calcularOrden_(ss, data.items, cuponPedido, modalidad, config);
    if (orden.lineas.length === 0 || !orden.hasBase) {
      return json_({ error: 'datos_invalidos', mensaje: 'Tu orden necesita al menos un servicio base.' });
    }
    if (cuponPedido && !orden.cupon) {
      return json_({ error: 'cupon_invalido', mensaje: 'El cupón ya no es válido.' });
    }

    // --- Disponibilidad ---
    const inicio = Utilities.parseDate(fechaCita + ' ' + horaCita, zona, 'yyyy-MM-dd HH:mm');
    const fin = new Date(inicio.getTime() + orden.duracion * 60000);
    if (inicio.getTime() < Date.now()) {
      return json_({ error: 'cupo_ocupado', mensaje: 'Ese horario ya pasó.' });
    }
    const minInicio = toMinutes_(horaCita);
    const minFin = minInicio + orden.duracion;
    const diaSemana = Number(Utilities.formatDate(inicio, zona, 'u')) % 7; // 1 = lunes … 7 = domingo
    const horariosNegocio = getHorarios_(ss, config);
    // bookeaa team: el horario que cuenta es el de la persona (lo revisa asignarPersona_).
    const equipo = equipoActivo_(ss, config);
    if (!equipo.length) {
      const tramos = horariosNegocio.filter(function (t) { return t.dia === diaSemana; });
      const dentro = tramos.some(function (t) {
        return minInicio >= toMinutes_(t.inicio) && minFin <= toMinutes_(t.fin);
      });
      if (!dentro) {
        return json_({ error: 'cupo_ocupado', mensaje: 'Ese horario está fuera de nuestro horario de atención.' });
      }
    }
    const bloqueado = getBloqueos_(ss, diasDeReserva_(config)).some(function (b) { return b.inicio < fin && b.fin > inicio; });
    if (bloqueado) {
      return json_({ error: 'cupo_ocupado', mensaje: 'Ese horario no está disponible.' });
    }

    // El calendario del negocio ocupa a todos (también con equipo: sus eventos son cierres del local).
    const calendarNegocio = getCalendarioTenant_(tenant);
    if (calendarNegocio) {
      const choques = calendarNegocio.getEvents(new Date(inicio.getTime() - 86400000), new Date(fin.getTime() + 86400000))
        .filter(function (ev) { return ev.getStartTime() < fin && ev.getEndTime() > inicio; });
      if (choques.length > 0) {
        return json_({ error: 'cupo_ocupado', mensaje: 'Ese horario acaba de ocuparse.' });
      }
    }
    let calendar = calendarNegocio;
    let persona = null;
    if (equipo.length) {
      const asignada = asignarPersona_(equipo, String(data.profesional || '*'), String(config.equipo_cualquiera || 'si').toLowerCase() !== 'no',
        idsServiciosPedido_(ss, data.items), inicio, fin, fechaCita, minInicio, minFin, horariosNegocio);
      if (asignada.error) return json_({ error: asignada.error, mensaje: asignada.mensaje });
      persona = asignada.persona;
      calendar = asignada.calendario;
    }

    // --- Tasa sin salir a la red ---
    // bcv.org.ve no tiene timeout configurable y puede tardar más que el límite de
    // ejecución. Acá solo se lee la caché o el último valor bueno: la tasa sirve
    // para mostrar el equivalente en bolívares, no para decidir nada. La versión
    // fresca se busca DESPUÉS de agendar la cita, y si sale se parchea la celda.
    // Con "Pago en la cita" se guarda solo el valor de referencia (EUR/USD): el monto en
    // bolívares depende de la tasa del día de la cita, no la de hoy. Con Pago Móvil sí
    // se guarda lo que se pagó hoy en Bs y su tasa.
    const conBs = moneda === 'BS' || esPagoMovil;
    let tasa = moneda === 'BS' || !esPagoMovil ? null : tasaCache_(moneda, ss);
    let totalBs = moneda === 'BS' ? orden.total : esPagoMovil && tasa ? round2_(orden.total * tasa.valor) : null;
    const recibo = emiteTicket_(config) ? siguienteRecibo_(ss) : null;

    const id = reservaIdPedida || Utilities.getUuid();
    const serviciosTexto = orden.lineas.map(function (l) { return l.nombre; }).join(', ');

    // === A partir de acá se escribe: capture, fila, evento ===
    // El orden es el del NAILS original y es deliberado. Lo que falle antes de la
    // fila no deja nada escrito, así que la clienta reintenta limpio. Lo que falle
    // después de la fila, con el evento sin crear, se deshace borrando la fila. El
    // evento va de último a propósito: es lo único que ocupa la hora, y si el
    // script se agota antes de crearlo el horario queda libre, en vez de quedar
    // ocupado por una cita que nadie registró.

    // El capture no puede tumbar la reserva: si Drive falla, se avisa y la fila
    // sigue adelante con el comprobante marcado como no subido.
    let comprobanteUrl = '';
    if (comprobante) {
      try {
        comprobanteUrl = guardarComprobante_(
          comprobante,
          fechaCita + '_' + horaCita.replace(':', '') + '_' + slug_(cliente) + '_' + id.slice(0, 8),
          tenant.carpetaId
        ) || '';
      } catch (err) {
        console.warn('No se pudo subir el capture: ' + err);
      }
    }

    const hoja = ss.getSheetByName('Reservaciones');
    if (persona) asegurarColumnas_(hoja, ['Profesional', 'Profesional_ID']);
    appendByHeaders_(hoja, {
      ID: id,
      Fecha_Solicitud: new Date(),
      Cliente: cliente,
      Telefono: telefono,
      Servicios: serviciosTexto,
      Total: orden.total,
      Fecha_Cita: fechaCita,
      Hora_Cita: horaCita,
      Metodo_Pago: metodoPago,
      Referencia: 'N/A',
      Cupon: orden.cupon ? orden.cupon.codigo : 'N/A',
      Estado: esPagoMovil ? 'Pago por verificar' : 'Confirmada',
      Tasa_BCV: moneda === 'BS' ? '' : (tasa ? tasa.valor : ''),
      Total_Bs: totalBs === null ? '' : totalBs,
      Modalidad: lugarTexto,
      Direccion: modalidad === 'domicilio' ? direccion : (sede.direccion || sede.nombre),
      Recargo: orden.recargo,
      Comprobante: comprobanteUrl || (comprobante ? 'no se pudo subir' : 'N/A'),
      Recibo_N: recibo === null ? '' : recibo,
      Profesional: persona ? persona.nombre : '',
      Profesional_ID: persona ? persona.id : '',
    });
    const fila = hoja.getLastRow();

    if (calendar) {
      let evento = null;
      try {
        evento = calendar.createEvent(
          (modalidad === 'domicilio' ? '🏠 Domicilio · ' : sedes.length > 1 ? '📍 ' + sede.nombre + ' · ' : '') +
            'Cita: ' + cliente + ' - ' + serviciosTexto,
          inicio, fin, {
            location: ubicacionDe_(sede, modalidad, direccion),
            // El detalle va desde el arranque, como en el original: ya se sabe el
            // capture y el total, no hace falta completar el evento después.
            description: [
              'Teléfono: ' + telefono,
              persona ? 'Con: ' + persona.nombre : '',
              modalidad === 'domicilio'
                ? 'A domicilio: ' + direccion + ' (incluye ' + config_min_extra_(config) + ' min de traslado)'
                : lugarTexto + (sede.direccion ? ' · ' + sede.direccion : ''),
              lineaTotalEvento_(orden, moneda, esPagoMovil ? totalBs : null, esPagoMovil && tasa ? tasa.valor : null),
              'Pago: ' + metodoPago,
              'Capture: ' + (comprobanteUrl || 'N/A'),
              'Cupón: ' + (orden.cupon ? orden.cupon.codigo : 'N/A'),
              'ID: ' + id,
            ].filter(String).join('\n'),
          }
        );
      } catch (err) {
        // La fila quedó prometiendo una cita que no se agendó. Se borra: es peor un
        // registro que miente que una hora libre que alguien más puede tomar.
        borrarFilaReserva_(hoja, fila);
        throw err;
      }
      // La cita ya está agendada: si la alerta falla, la reserva sigue valiendo.
      try {
        ponerAlertas_(evento, recordatoriosDe_(config));
      } catch (err) {
        console.warn('No se pudo poner la alerta: ' + err);
      }
    }

    // El cupón se consume cuando la cita ya quedó agendada de verdad, y su fallo
    // no puede reportarse como error: la reserva sí existe.
    if (orden.cupon) {
      try {
        descontarCupon_(ss, orden.cupon);
      } catch (err) {
        console.warn('No se pudo descontar el cupón: ' + err);
      }
    }

    limpiarCacheCatalogo_(tenant.slug); // la ocupación cambió: la próxima carga recalcula
    sumar_(claveTelefono, 86400);

    hecha = { ss: ss, id: id, orden: orden, moneda: moneda, tasa: tasa, totalBs: totalBs, comprobanteUrl: comprobanteUrl,
      conBs: conBs, esPagoMovil: esPagoMovil, recibo: recibo,
      profesional: persona ? { id: persona.id, nombre: persona.nombre } : null,
      cita: { cliente: cliente, servicios: serviciosTexto, fecha: fechaCita, hora: horaCita } };
  } catch (err) {
    console.error(err);
    return json_({ error: 'servidor', mensaje: 'No se pudo guardar la reserva. Intenta de nuevo.' });
  } finally {
    lock.releaseLock();
  }

  // === La reserva ya está a salvo y el lock liberado: lo que sigue es extra ===
  // La tasa fresca se pide fuera del lock, para no hacer esperar a las reservas de
  // los demás negocios por un sitio externo lento. Nada de esto puede perder la reserva.
  let tasa = hecha.tasa;
  let totalBs = hecha.totalBs;
  // Solo Pago Móvil necesita la tasa: con pago en la cita no se guardan bolívares.
  if (hecha.moneda !== 'BS' && hecha.esPagoMovil) {
    try {
      const fresca = getTasa(hecha.moneda, hecha.ss);
      if (fresca && (!tasa || fresca.valor !== tasa.valor)) {
        tasa = fresca;
        totalBs = round2_(hecha.orden.total * tasa.valor);
        actualizarReserva_(hecha.ss, hecha.id, { Tasa_BCV: fresca.valor, Total_Bs: totalBs });
      }
    } catch (err) {
      console.warn('No se pudo actualizar la tasa: ' + err);
    }
  }

  // Notificación al dueño (la manda el Worker del bot). No puede tumbar la reserva.
  try {
    avisarReserva_(tenant.slug, {
      id: hecha.id, cliente: hecha.cita.cliente, servicios: hecha.cita.servicios, fecha: hecha.cita.fecha, hora: hecha.cita.hora,
      estado: hecha.esPagoMovil ? ESTADO_POR_VERIFICAR : 'Confirmada',
      profesional: hecha.profesional ? hecha.profesional.nombre : '', profesionalId: hecha.profesional ? hecha.profesional.id : '',
    });
  } catch (err) {
    console.warn('Aviso al dueño: ' + err);
  }

  return json_({
    success: true,
    id: hecha.id,
    total: hecha.orden.total,
    totalBs: hecha.conBs ? totalBs : null,
    tasa: hecha.esPagoMovil && tasa ? tasa.valor : null,
    comprobanteUrl: hecha.comprobanteUrl || null,
    recibo: hecha.recibo,
    profesional: hecha.profesional,
  });
}

/**
 * Siguiente número de ticket de reserva (interno, no fiscal) del negocio. Se llama
 * dentro del lock de doPost, así dos reservas no se llevan el mismo número.
 */
/** Ticket de reserva: activo (ticket_reserva distinto de "no") y el negocio no factura en modo fiscal. */
function emiteTicket_(config) {
  if (String(config.facturacion_modo || '').trim().toLowerCase() === 'fiscal') return false;
  return !/^(no|false|0|off)$/i.test(String(config.ticket_reserva == null ? '' : config.ticket_reserva).trim());
}

function siguienteRecibo_(ss) {
  const sheet = ss.getSheetByName('Configuracion');
  const n = Math.max(0, Math.floor(toNumber_(getConfig_(ss).recibo_ultimo))) + 1;
  setConfigKey_(sheet, 'recibo_ultimo', n);
  return n;
}

/**
 * Línea del total para el evento del calendario. Siempre el valor de referencia; los
 * bolívares solo si ya se pagaron (Pago Móvil), con la tasa de ese día.
 */
/**
 * Minutos antes de la cita para las alertas del evento ("1440, 60" → [1440, 60]).
 * Enteros de 0 a 40320 (4 semanas, el máximo de Google), sin repetir, máx. 5.
 * "no" → [] (sin alerta). Vacío o ilegible → null: no se toca, manda la del calendario.
 */
function recordatoriosDe_(config) {
  const v = String((config && config.recordatorio_minutos) || '').trim().toLowerCase();
  if (v === 'no') return [];
  const out = [];
  v.split(/[\s,;]+/).forEach(function (t) {
    if (!/^\d{1,5}$/.test(t)) return;
    const n = Number(t);
    if (n <= 40320 && out.indexOf(n) === -1) out.push(n);
  });
  return out.length ? out.sort(function (a, b) { return b - a; }).slice(0, 5) : null;
}

/** Reemplaza las alertas del evento; con [] queda sin alerta, con null no se toca. */
function ponerAlertas_(evento, minutos) {
  if (!evento || !minutos) return;
  evento.removeAllReminders();
  minutos.forEach(function (m) { evento.addPopupReminder(m); });
}

function lineaTotalEvento_(orden, moneda, bsPagados, tasa) {
  let linea = (moneda === 'BS' ? 'Total: Bs. ' + orden.total.toFixed(2)
    : 'Total (referencia): ' + orden.total.toFixed(2) + ' ' + moneda);
  if (moneda !== 'BS' && bsPagados !== null && bsPagados !== undefined) {
    linea += ' · pagado Bs. ' + Number(bsPagados).toFixed(2) + (tasa ? ' (tasa BCV ' + Number(tasa).toFixed(2) + ')' : '');
  }
  if (orden.recargo > 0) linea += ' · recargo domicilio ' + orden.recargo.toFixed(2) + ' ' + moneda;
  return linea;
}

// ============================================================================
// Seguridad: textos, imágenes y topes
// ============================================================================

/** Un renglón de texto: sin caracteres de control, espacios simples y con largo máximo. */
function limpiarTexto_(valor, max) {
  return String(valor == null ? '' : valor)
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

/**
 * Lo que se escribe en una celda. Un texto que empieza con = + - @ Sheets lo toma
 * como fórmula: alguien que reserve como "=IMPORTXML(…)" metería una fórmula en la
 * hoja del negocio. El apóstrofo inicial lo fuerza a texto (Sheets no lo muestra).
 */
function paraCelda_(valor) {
  return typeof valor === 'string' && /^[=+\-@]/.test(valor) ? "'" + valor : valor;
}

function bytesDe_(base64) {
  try {
    return Utilities.base64Decode(String(base64));
  } catch (_) {
    return [];
  }
}

/** JPEG, PNG, WEBP o HEIC/HEIF según los primeros bytes, no según lo que diga el navegador. */
function esImagen_(bytes) {
  if (!bytes || bytes.length < 12) return false;
  const b = function (i) { return bytes[i] & 0xff; }; // Apps Script da bytes con signo
  const ascii = function (i, n) {
    let t = '';
    for (let k = i; k < i + n; k++) t += String.fromCharCode(b(k));
    return t;
  };
  if (b(0) === 0xff && b(1) === 0xd8 && b(2) === 0xff) return true; // JPEG
  if (b(0) === 0x89 && ascii(1, 3) === 'PNG') return true; // PNG
  if (ascii(0, 4) === 'RIFF' && ascii(8, 4) === 'WEBP') return true; // WEBP
  if (ascii(4, 4) === 'ftyp' && /^(heic|heix|hevc|mif1|msf1|heif)$/.test(ascii(8, 4))) return true; // HEIC
  return false;
}

/**
 * Tope por ventana fija de tiempo: cuenta este intento y dice si ya pasó de `max`
 * en los últimos `seg` segundos. CacheService no es atómico, así que con mucha
 * concurrencia puede dejar pasar uno o dos de más: para frenar abuso alcanza.
 */
function limite_(clave, max, seg) {
  const ventana = clave + '_' + Math.floor(Date.now() / (seg * 1000));
  return sumar_(ventana, seg) > max;
}

function contador_(clave) {
  try {
    return Number(CacheService.getScriptCache().get(clave.slice(0, 240)) || 0);
  } catch (_) {
    return 0;
  }
}

/** Suma 1 al contador y lo devuelve. Si la caché falla, no bloquea a nadie. */
function sumar_(clave, seg) {
  try {
    const k = clave.slice(0, 240);
    const n = contador_(k) + 1;
    CacheService.getScriptCache().put(k, String(n), seg);
    return n;
  } catch (_) {
    return 0;
  }
}

/** Dirección que se pone en el evento del calendario. */
function ubicacionDe_(sede, modalidad, direccion) {
  if (modalidad === 'domicilio') return direccion;
  return [sede.direccion, sede.mapsUrl].filter(Boolean).join(' · ') || sede.nombre;
}

/** Cuántos días hacia adelante se mira la ocupación: el mismo que la agenda. */
function diasDeReserva_(config) {
  return Number(config.dias_anticipacion) || 21;
}

function esMetodoPermitido_(config, metodo) {
  if (!metodo) return false;
  const list = String(config.metodos_pago || '').split(',').map(function (x) { return x.trim(); }).filter(Boolean);
  if (!list.length) return true; // sin configurar: todo permitido (compatibilidad)
  const key = normKey_(metodo);
  return list.some(function (m) { return normKey_(m) === key; });
}

function permiteDomicilio_(config) {
  const v = String(config.permite_domicilio || '').trim().toLowerCase();
  return v !== '' && v !== 'no' && v !== 'false' && v !== '0';
}

function normalizarMoneda_(value) {
  const m = String(value || 'EUR').trim().toUpperCase();
  return m === 'USD' || m === 'BS' ? m : 'EUR';
}

// ============================================================================
// 4. Tasa oficial del euro / dólar (BCV)
// ============================================================================

/**
 * Bolívares por unidad de `moneda` según el BCV: { valor, fecha, fuente } o null.
 * Orden: caché (3 h) → DolarApi (oficial) → scrape del BCV → último valor bueno → manual.
 */
function getTasa(moneda, ss) {
  moneda = normalizarMoneda_(moneda);
  const sufijo = moneda === 'USD' ? 'usd' : 'eur';
  const cacheKey = 'tasa_' + sufijo;
  const cache = CacheService.getScriptCache();
  const cached = cache.get(cacheKey);
  if (cached) return JSON.parse(cached);

  const props = PropertiesService.getScriptProperties();
  const tasa = buscarTasaFresca_(moneda);
  if (tasa) return tasa;

  const ultima = props.getProperty(cacheKey + '_ultima');
  if (ultima) {
    const t = JSON.parse(ultima);
    t.fuente += ' (último valor conocido)';
    cache.put(cacheKey, JSON.stringify(t), 15 * 60);
    return t;
  }

  if (!ss) return null;
  const manual = toNumber_(getConfig_(ss)['tasa_' + sufijo + '_manual']);
  return manual > 0 ? { valor: round2_(manual), fecha: null, fuente: 'Manual' } : null;
}

/**
 * Tasa desde caché, último valor conocido o valor manual, sin salir a la red.
 * Es la que usa la reserva: el cupo depende de la fila, no del tipo de cambio, y
 * bcv.org.ve no tiene timeout configurable. La versión en fresco se pide después
 * de guardar la fila y solo para mostrarla.
 */
/**
 * Pide la tasa a la red y la deja en caché (3 h) y como "último valor bueno".
 * DolarApi primero: responde rápido y es el que suele funcionar. El scrape del BCV
 * queda de respaldo porque bcv.org.ve tarda mucho y no tiene timeout configurable.
 */
function buscarTasaFresca_(moneda) {
  const cacheKey = 'tasa_' + (moneda === 'USD' ? 'usd' : 'eur');
  const tasa = tasaDolarApi_(moneda) || tasaBCV_(moneda);
  if (tasa) {
    PropertiesService.getScriptProperties().setProperty(cacheKey + '_ultima', JSON.stringify(tasa));
    CacheService.getScriptCache().put(cacheKey, JSON.stringify(tasa), 3 * 60 * 60);
  }
  return tasa;
}

/**
 * Lo corre el disparador cada 2 horas: así la tasa siempre está en caché y ningún
 * cliente espera a DolarApi o al BCV mientras carga la página.
 */
function refrescarTasas() {
  ['USD', 'EUR'].forEach(function (m) {
    try {
      buscarTasaFresca_(m);
    } catch (err) {
      console.warn('No se pudo refrescar la tasa ' + m + ': ' + err);
    }
  });
}

/** Instala (una sola vez) el disparador de refrescarTasas. */
function instalarDisparadorTasa() {
  const existe = ScriptApp.getProjectTriggers().some(function (t) { return t.getHandlerFunction() === 'refrescarTasas'; });
  if (!existe) ScriptApp.newTrigger('refrescarTasas').timeBased().everyHours(2).create();
  refrescarTasas();
  const msg = existe ? 'El disparador ya estaba instalado. Tasa actualizada.' : 'Listo: la tasa se actualiza sola cada 2 horas.';
  try { SpreadsheetApp.getUi().alert(msg); } catch (_) { Logger.log(msg); }
}

function tasaCache_(moneda, ss) {
  moneda = normalizarMoneda_(moneda);
  const sufijo = moneda === 'USD' ? 'usd' : 'eur';
  const cache = CacheService.getScriptCache();
  const cached = cache.get('tasa_' + sufijo);
  if (cached) return JSON.parse(cached);

  const props = PropertiesService.getScriptProperties();
  const ultima = props.getProperty('tasa_' + sufijo + '_ultima');
  if (ultima) {
    const t = JSON.parse(ultima);
    t.fuente += ' (último valor conocido)';
    return t;
  }

  const manual = toNumber_(getConfig_(ss)['tasa_' + sufijo + '_manual']);
  return manual > 0 ? { valor: round2_(manual), fecha: null, fuente: 'Manual' } : null;
}

function tasaBCV_(moneda) {
  try {
    const id = moneda === 'USD' ? 'dolar' : 'euro';
    const res = UrlFetchApp.fetch('https://www.bcv.org.ve/', {
      muteHttpExceptions: true,
      validateHttpsCertificates: false, // el certificado del BCV suele fallar la validación
      followRedirects: true,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SaaSReservas/1.0)' },
    });
    if (res.getResponseCode() !== 200) return null;
    const html = res.getContentText();
    const m = html.match(new RegExp('id=["\']' + id + '["\'][\\s\\S]*?<strong>\\s*([\\d.,]+)\\s*<\\/strong>', 'i'));
    if (!m) return null;
    const valor = toNumber_(m[1]);
    const f = html.match(/date-display-single[^>]*content=["']([^"']+)["']/i);
    return valor > 0 ? { valor: round2_(valor), fecha: f ? f[1] : null, fuente: 'BCV' } : null;
  } catch (err) {
    console.warn('BCV: ' + err);
    return null;
  }
}

function tasaDolarApi_(moneda) {
  try {
    const ruta = moneda === 'USD' ? 'dollars' : 'euros';
    const res = UrlFetchApp.fetch('https://ve.dolarapi.com/v1/' + ruta + '/oficial', { muteHttpExceptions: true });
    if (res.getResponseCode() !== 200) return null;
    const d = JSON.parse(res.getContentText());
    const valor = toNumber_(d.promedio || d.venta || d.compra);
    return valor > 0 ? { valor: round2_(valor), fecha: d.fechaActualizacion || null, fuente: 'BCV (vía DolarApi)' } : null;
  } catch (err) {
    console.warn('DolarApi: ' + err);
    return null;
  }
}

/** Ejecútala desde el editor para ver qué tasa se obtiene (Ver > Registros). */
function probarTasa(moneda) {
  moneda = normalizarMoneda_(moneda);
  CacheService.getScriptCache().remove('tasa_' + (moneda === 'USD' ? 'usd' : 'eur'));
  console.log('BCV ' + moneda + '      → ' + JSON.stringify(tasaBCV_(moneda)));
  console.log('DolarApi ' + moneda + ' → ' + JSON.stringify(tasaDolarApi_(moneda)));
  console.log('Resultado       → ' + JSON.stringify(getTasa(moneda, SpreadsheetApp.getActiveSpreadsheet())));
}

// ============================================================================
// Auxiliares
// ============================================================================

function json_(obj) {
  // Apps Script agrega Access-Control-Allow-Origin: * por su cuenta.
  return jsonDeTexto_(jsonTexto_(obj));
}

function jsonTexto_(obj) {
  return JSON.stringify(obj);
}

// ---------- Logo subido desde la ventana de configuración ----------
// Vive en la pestaña oculta "Logo" (A2) como data URL, comprimido en el navegador.
const LOGO_MAX = 45000;

/** Un data URL de imagen chico y con bytes de imagen de verdad. */
function logoValido_(valor) {
  const v = String(valor || '').trim();
  const m = /^data:image\/(png|webp|jpeg);base64,([A-Za-z0-9+\/=]+)$/.exec(v);
  return !!m && v.length <= LOGO_MAX && esImagen_(bytesDe_(m[2]));
}

function leerLogoHoja_(ss) {
  const sheet = ss.getSheetByName('Logo');
  if (!sheet) return '';
  const v = String(sheet.getRange('A2').getValue() || '').trim();
  return logoValido_(v) ? v : '';
}

/**
 * El logo del negocio. Con `ss` (la hoja ya abierta) se relee y se refresca la caché;
 * sin ella se usa la caché (6 h) y solo se abre la hoja si no está. "-" = sin logo.
 */
function logoNegocio_(tenant, ss) {
  const cache = CacheService.getScriptCache();
  const clave = 'logo_' + tenant.slug;
  if (!ss) {
    const hit = cache.get(clave);
    if (hit !== null) return hit === '-' ? '' : hit;
  }
  let logo = '';
  try {
    logo = leerLogoHoja_(ss || openTenant_(tenant));
  } catch (err) {
    console.warn('No se pudo leer el logo de ' + tenant.slug + ': ' + err);
  }
  try { cache.put(clave, logo || '-', 6 * 60 * 60); } catch (_) {}
  return logo;
}

/** Agrega "logo" al JSON del catálogo sin volver a parsearlo. */
function conLogo_(texto, logo) {
  return logo ? '{"logo":' + JSON.stringify(logo) + ',' + texto.slice(1) : texto;
}

function jsonDeTexto_(texto) {
  return ContentService.createTextOutput(texto).setMimeType(ContentService.MimeType.JSON);
}

// ---------- Caché del catálogo ----------

// 15 min: cada reserva la borra, la pantalla de horarios pide fresh=1 y doPost
// revisa choques igual. Lo que tarda en verse es un cambio hecho a mano en la hoja.
const CACHE_CATALOGO_SEG = 15 * 60;
/** CacheService tira excepción por encima de 100 KB por clave; cortamos antes. */
const CACHE_MAX_BYTES = 90 * 1000;
/** El directorio cambia muy poco: 5 min de caché sacan una lectura de hoja por petición. */
const CACHE_DIRECTORIO_SEG = 5 * 60;

function claveCatalogo_(slug) {
  return 'cat_' + slug;
}

/** Devuelve el catálogo cacheado o null si no hay (o era demasiado grande para guardarlo). */
function leerCacheCatalogo_(slug) {
  try {
    return CacheService.getScriptCache().get(claveCatalogo_(slug)) || null;
  } catch (_) {
    return null;
  }
}

function guardarCacheCatalogo_(slug, texto, ttlSeg) {
  try {
    if (texto.length > CACHE_MAX_BYTES) return;
    CacheService.getScriptCache().put(claveCatalogo_(slug), texto, ttlSeg || CACHE_CATALOGO_SEG);
  } catch (err) {
    console.warn('No se pudo cachear el catálogo de ' + slug + ': ' + err);
  }
}

function limpiarCacheCatalogo_(slug) {
  try {
    CacheService.getScriptCache().remove(claveCatalogo_(slug));
  } catch (_) {
    /* sin caché no hay nada que invalidar */
  }
}

function getSheetData_(ss, sheetName) {
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet || sheet.getLastRow() < 2) return [];
  const data = sheet.getDataRange().getValues();
  const headers = data.shift().map(String);
  return data
    .filter(function (row) { return row.some(function (c) { return c !== ''; }); })
    .map(function (row) {
      const obj = {};
      headers.forEach(function (h, i) { obj[h] = row[i]; });
      return obj;
    });
}

/** Configuracion como { clave: 'valor en texto' } (getDisplayValues evita fechas raras). */
function getConfig_(ss) {
  const sheet = ss.getSheetByName('Configuracion');
  const out = {};
  if (!sheet || sheet.getLastRow() < 2) return out;
  sheet.getRange(2, 1, sheet.getLastRow() - 1, 2).getDisplayValues().forEach(function (r) {
    const k = String(r[0]).trim().toLowerCase();
    if (k) out[k] = String(r[1]).trim();
  });
  return out;
}

/** Solo inicio y fin de cada evento: nunca se exponen nombres ni teléfonos. */
function getOcupacionCalendario_(dias, tenant) {
  const calendar = getCalendarioTenant_(tenant);
  if (!calendar) return [];
  const desde = new Date();
  const hasta = new Date(desde.getTime() + (dias + 1) * 86400000);
  return calendar.getEvents(desde, hasta).map(function (ev) {
    return { inicio: ev.getStartTime().toISOString(), fin: ev.getEndTime().toISOString() };
  });
}

/**
 * Misma lógica de precios que src/lib/pricing.ts.
 * `servicios` se pasa desde afuera para no releer la hoja: doPost ya los leyó.
 */
function calcularOrden_(ss, items, codigoCupon, modalidad, config, servicios) {
  config = config || getConfig_(ss);
  items = items || {};
  servicios = servicios || getServicios_(ss);
  const promos = getPromociones_(ss, servicios);
  const byId = {};
  servicios.forEach(function (s) { byId[s.ID] = s; });
  const unique = function (list) {
    return (Array.isArray(list) ? list : []).map(String).filter(function (x, i, a) { return a.indexOf(x) === i; });
  };

  const lineas = [];
  unique(items.promos).forEach(function (id) {
    const p = promos.filter(function (x) { return x.ID === id; })[0];
    if (!p) return;
    lineas.push({
      nombre: String(p.Nombre),
      precio: toNumber_(p.Precio_Promo),
      duracion: p.Servicios_Incluidos.reduce(function (sum, sid) {
        return sum + (toNumber_(byId[sid].Duracion_Min) || 60);
      }, 0),
      base: true,
    });
  });
  unique(items.servicios).forEach(function (id) {
    const s = byId[id];
    if (!s) return;
    lineas.push({
      nombre: String(s.Nombre),
      precio: toNumber_(s.Precio),
      duracion: toNumber_(s.Duracion_Min) || 60,
      base: !/adic|extra/i.test(String(s.Tipo)),
    });
  });

  const subtotal = round2_(lineas.reduce(function (sum, l) { return sum + l.precio; }, 0));
  const cupon = codigoCupon ? buscarCupon_(ss, codigoCupon) : null;
  let descuento = 0;
  if (cupon && subtotal > 0) {
    const raw = cupon.porcentaje > 0 ? subtotal * cupon.porcentaje / 100 : cupon.monto;
    descuento = round2_(Math.min(subtotal, Math.max(0, raw)));
  }
  // A domicilio: recargo sobre el precio de los servicios (antes del cupón) y tiempo de traslado.
  const aDomicilio = modalidad === 'domicilio' && lineas.length > 0;
  const recargo = aDomicilio ? round2_(subtotal * config_recargo_pct_(config) / 100) : 0;
  const minutosExtra = aDomicilio ? config_min_extra_(config) : 0;
  return {
    lineas: lineas,
    hasBase: lineas.some(function (l) { return l.base; }),
    subtotal: subtotal,
    recargo: recargo,
    descuento: descuento,
    total: round2_(subtotal + recargo - descuento),
    duracion: Math.max(15, lineas.reduce(function (sum, l) { return sum + l.duracion; }, 0)) + minutosExtra,
    cupon: cupon,
  };
}

function config_recargo_pct_(config) {
  const v = String(config.recargo_domicilio_pct || '').trim();
  return v === '' ? 20 : toNumber_(v);
}

function config_min_extra_(config) {
  const v = String(config.minutos_extra_domicilio || '').trim();
  return v === '' ? 15 : Math.max(0, Math.round(toNumber_(v)));
}

/**
 * Guarda el capture en Drive (carpeta del negocio) y devuelve su enlace.
 * Si el negocio no tiene carpeta configurada devuelve '' sin error: la captura es
 * un extra de la reserva, no una condición para guardarla.
 */
  function guardarComprobante_(comprobante, nombreBase, carpetaId) {
    if (!comprobante) return '';
    const mime = /^image\/(jpeg|png|webp|heic|heif)$/.test(comprobante.mime) ? comprobante.mime : 'image/jpeg';
    const ext = mime === 'image/png' ? '.png' : mime === 'image/webp' ? '.webp' : '.jpg';
    const blob = Utilities.newBlob(Utilities.base64Decode(comprobante.base64), mime, nombreBase + ext);

    // El id de la carpeta es lo que hay, pero no puede ser la única vía: si el
    // negocio la borró, cambió o nunca se configuró, getFolderById revienta y se
    // lleva la reserva entera. Se cae a buscarla por nombre y, si tampoco está, a
    // crearla, que es lo que hacía el NAILS original.
    const carpeta = carpetaDe_(carpetaId);
    return carpeta ? carpeta.createFile(blob).getUrl() : '';
  }

  /**
   * Carpeta de comprobantes del negocio, o null si no hay forma de obtener una.
   * Devuelve null cuando el tenant no tiene Carpeta_Id configurada, que es el caso
   * normal de quien no usa Pago Móvil.
   */
  function carpetaDe_(carpetaId) {
    if (carpetaId) {
      try {
        return DriveApp.getFolderById(carpetaId);
      } catch (err) {
        console.warn('Carpeta_Id ' + carpetaId + ' no sirve, se busca por nombre: ' + err);
      }
    }
    try {
      const carpetas = DriveApp.getFoldersByName(CARPETA_COMPROBANTES);
      return carpetas.hasNext() ? carpetas.next() : DriveApp.createFolder(CARPETA_COMPROBANTES);
    } catch (err) {
      console.error('No hay carpeta donde guardar el capture: ' + err);
      return null;
    }
  }


// ---------- Catálogo tolerante (misma lógica que src/lib/normalize.ts) ----------

// ---------- Lugar, sedes y mensajes ----------

/** "#1f6f5c" o "1F6F5C" → "#1F6F5C"; cualquier otra cosa → ''. */
function hexValido_(value) {
  const v = String(value || '').trim();
  return /^#?(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(v) ? (v.charAt(0) === '#' ? v : '#' + v).toUpperCase() : '';
}

function esOscuro_(hex) {
  let h = String(hex || '').replace('#', '');
  if (h.length === 3) h = h.replace(/./g, function (c) { return c + c; });
  const n = parseInt(h, 16);
  if (isNaN(n)) return false;
  const lin = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(function (v) {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2] < 0.18;
}

function capitalizar_(texto) {
  texto = String(texto || '');
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

/** "el consultorio", "la barbería"… o lo que diga lugar_nombre con lugar_tipo = otro. */
function etiquetaLugar_(config) {
  const tipo = normKey_(config.lugar_tipo || 'spa');
  if (LUGAR_TIPOS[tipo]) return LUGAR_TIPOS[tipo];
  return String(config.lugar_nombre || '').trim() || LUGAR_TIPOS.local;
}

/**
 * Sedes activas con nombre. Sin pestaña (hoja vieja todavía sin actualizar) se arma
 * una sede con direccion_spa, igual que hace el front.
 */
function getSedes_(ss, config) {
  const sedes = getSheetData_(ss, 'Sedes')
    .filter(function (r) {
      const activa = String(r.Activa === undefined ? 'si' : r.Activa).trim().toLowerCase();
      return String(r.Nombre || '').trim() && ['no', 'false', '0'].indexOf(activa) === -1;
    })
    .map(function (r) {
      return {
        nombre: String(r.Nombre).trim(),
        direccion: String(r.Direccion || '').trim(),
        mapsUrl: String(r.Maps_URL || '').trim(),
      };
    });
  if (sedes.length) return sedes;
  return [{
    nombre: capitalizar_(etiquetaLugar_(config)),
    direccion: String(config.direccion_spa || '').trim(),
    mapsUrl: String(config.direccion_spa_url || '').trim(),
  }];
}

function getMensajes_(ss) {
  return getSheetData_(ss, 'Mensajes')
    .map(function (r) { return { nombre: String(r.Nombre || '').trim(), texto: String(r.Texto || '').trim() }; })
    .filter(function (m) { return m.nombre && m.texto; });
}

function normKey_(value) {
  return String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function slug_(value) {
  return String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'item';
}

function pick_(row, names) {
  const wanted = names.map(normKey_);
  for (const k in row) if (wanted.indexOf(normKey_(k)) !== -1) return row[k];
  return '';
}

function assignIds_(items) {
  const used = {};
  items.forEach(function (it) {
    let id = String(it.ID || '').trim() || slug_(it.Nombre);
    if (used[id]) {
      let n = 2;
      while (used[id + '-' + n]) n++;
      id = id + '-' + n;
    }
    used[id] = true;
    it.ID = id;
  });
  return items;
}

/** Pone a cada servicio el ID que usa la página (el de la hoja o, si está vacío, el de assignIds_). */
function idsComoLaPagina_(servicios) {
  const conId = assignIds_(servicios.map(function (s) { return { ID: s.id, Nombre: s.nombre }; }));
  return servicios.map(function (s, i) { return Object.assign({}, s, { id: conId[i].ID }); });
}

function getServicios_(ss) {
  const rows = getSheetData_(ss, 'Servicios').map(function (r) {
    return {
      ID: String(pick_(r, ['ID'])).trim(),
      Nombre: String(pick_(r, ['Nombre', 'Servicio'])).trim(),
      Precio: toNumber_(pick_(r, ['Precio'])),
      Duracion_Min: toNumber_(pick_(r, ['Duracion_Min', 'Duracion', 'DuracionMin', 'Minutos'])) || 60,
      Tipo: String(pick_(r, ['Tipo', 'Categoria'])).trim(),
    };
  }).filter(function (s) { return s.Nombre; });
  return assignIds_(rows);
}

function getPromociones_(ss, servicios) {
  const find = function (ref) {
    const key = normKey_(ref);
    const s = servicios.filter(function (x) { return normKey_(x.ID) === key; })[0] ||
      servicios.filter(function (x) { return normKey_(x.Nombre) === key; })[0];
    return s ? s.ID : null;
  };
  const rows = getSheetData_(ss, 'Promociones').map(function (r) {
    return {
      ID: String(pick_(r, ['ID'])).trim(),
      Nombre: String(pick_(r, ['Nombre', 'Promocion'])).trim(),
      Servicios_Incluidos: String(pick_(r, ['Servicios_Incluidos', 'Servicios'])).split(/[,;|+]/)
        .map(function (x) { return x.trim(); }).filter(Boolean).map(find).filter(Boolean),
      Precio_Promo: toNumber_(pick_(r, ['Precio_Promo', 'Precio'])),
    };
  }).filter(function (p) { return p.Nombre && p.Servicios_Incluidos.length > 0; });
  return assignIds_(rows);
}

// ---------- Horario semanal y bloqueos ----------

function parseDia_(value) {
  const s = normKey_(value);
  if (/^[0-6]$/.test(s)) return Number(s);
  if (s === '7') return 0;
  const map = { domingo: 0, dom: 0, lunes: 1, lun: 1, martes: 2, mar: 2, miercoles: 3, mie: 3,
    jueves: 4, jue: 4, viernes: 5, vie: 5, sabado: 6, sab: 6 };
  return s in map ? map[s] : null;
}

function toMinutes_(value) {
  const m = /^(\d{1,2}):(\d{2})/.exec(String(value).trim());
  return m ? Number(m[1]) * 60 + Number(m[2]) : NaN;
}

function hhmm_(min) {
  return ('0' + Math.floor(min / 60)).slice(-2) + ':' + ('0' + (min % 60)).slice(-2);
}

function getHorarios_(ss, config) {
  const out = [];
  const sheet = ss.getSheetByName('Horarios');
  if (sheet && sheet.getLastRow() > 1) {
    sheet.getRange(2, 1, sheet.getLastRow() - 1, 3).getDisplayValues().forEach(function (r) {
      const dia = parseDia_(r[0]);
      const a = toMinutes_(r[1]);
      const b = toMinutes_(r[2]);
      if (dia === null || isNaN(a) || isNaN(b) || b <= a) return;
      out.push({ dia: dia, inicio: hhmm_(a), fin: hhmm_(b) });
    });
    if (out.length) return out.sort(function (x, y) { return (x.dia + 6) % 7 - (y.dia + 6) % 7 || (x.inicio < y.inicio ? -1 : 1); });
  }
  const a = toMinutes_(config.hora_apertura || '09:00');
  const b = toMinutes_(config.hora_cierre || '19:00');
  String(config.dias_laborales || '1,2,3,4,5,6').split(/[,;\s]+/).map(parseDia_).forEach(function (d) {
    if (d !== null && !isNaN(a) && !isNaN(b) && b > a) out.push({ dia: d, inicio: hhmm_(a), fin: hhmm_(b) });
  });
  return out;
}

function ymd_(value) {
  if (value && typeof value.getTime === 'function' && !isNaN(value.getTime())) return Utilities.formatDate(value, ZONA, 'yyyy-MM-dd');
  const s = String(value).trim();
  let m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s);
  if (m) return m[1] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[3]).slice(-2);
  m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s);
  if (m) return m[3] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[1]).slice(-2);
  return null;
}

function getBloqueos_(ss, dias) {
  const sheet = ss.getSheetByName('Bloqueos');
  if (!sheet || sheet.getLastRow() < 2) return [];
  const n = sheet.getLastRow() - 1;
  const fechas = sheet.getRange(2, 1, n, 1).getValues();
  const horas = sheet.getRange(2, 2, n, 2).getDisplayValues();
  const desde = Date.now() - 86400000;
  const hasta = Date.now() + (dias + 1) * 86400000;
  const out = [];
  for (let i = 0; i < n; i++) {
    const fecha = ymd_(fechas[i][0]);
    if (!fecha) continue;
    const a = toMinutes_(horas[i][0]);
    const b = toMinutes_(horas[i][1]);
    const ini = isNaN(a) ? '00:00' : hhmm_(a);
    const inicio = Utilities.parseDate(fecha + ' ' + ini, ZONA, 'yyyy-MM-dd HH:mm');
    const fin = isNaN(b) || (!isNaN(a) && b <= a)
      ? new Date(Utilities.parseDate(fecha + ' 00:00', ZONA, 'yyyy-MM-dd HH:mm').getTime() + 86400000)
      : Utilities.parseDate(fecha + ' ' + hhmm_(b), ZONA, 'yyyy-MM-dd HH:mm');
    if (fin.getTime() < desde || inicio.getTime() > hasta) continue;
    out.push({ inicio: inicio, fin: fin });
  }
  return out;
}

/** Ejecútala desde el editor: muestra lo que la landing va a recibir para un slug. */
function diagnostico(slug) {
  const tenant = getTenantPorSlug_(String(slug || '').trim());
  if (!tenant) {
    Logger.log('No encontré el negocio: ' + slug);
    return;
  }
  const ss = openTenant_(tenant);
  const config = getConfig_(ss);
  const crudos = getSheetData_(ss, 'Servicios');
  const servicios = getServicios_(ss);
  console.log('Negocio: ' + tenant.nombre + ' (slug: ' + tenant.slug + ')');
  console.log('Servicios: ' + servicios.length + ' de ' + crudos.length + ' filas (sin Nombre se ignoran)');
  servicios.forEach(function (s) {
    console.log('  · ' + s.ID + ' | ' + s.Nombre + ' | ' + s.Precio + ' | ' + s.Duracion_Min + ' min | ' + (s.Tipo || 'Servicios'));
  });
  const promos = getPromociones_(ss, servicios);
  console.log('Promociones válidas: ' + promos.length + ' de ' + getSheetData_(ss, 'Promociones').length +
    ' (se ignoran las que no encuentran sus servicios)');
  console.log('Horario:');
  getHorarios_(ss, config).forEach(function (t) { console.log('  · ' + DIAS_SEMANA[t.dia] + ' ' + t.inicio + '–' + t.fin); });
  console.log('Bloqueos próximos: ' + getBloqueos_(ss, 60).length);
  console.log('Marca: ' + (config.marca || config.nombre_negocio));
  const paleta = paletaPorNombre_(config.paleta || '');
  console.log('Paleta: ' + (paleta ? paleta.nombre : '— (sin paleta elegida)'));
  console.log('Colores que verá la web: base ' + (config.tema_base || (paleta ? paleta.base : '—')) +
    ' · soft ' + (config.tema_soft || (paleta ? paleta.soft : '—')) +
    ' · deep ' + (config.tema_deep || (paleta ? paleta.deep : '—')));
  console.log('Estilo: ' + (config.tema_estilo || 'elegante') +
    (hexValido_(config.color_principal) ? ' · color principal ' + hexValido_(config.color_principal) + ' (manda sobre la paleta)' : '') +
    (hexValido_(config.color_fondo) ? ' · fondo ' + hexValido_(config.color_fondo) : ''));
  // El hex escrito a mano gana sobre la paleta, así que pueden quedar despistados.
  if (paleta && (config.tema_base || config.tema_soft || config.tema_deep)) {
    const coinciden = config.tema_base === paleta.base && config.tema_soft === paleta.soft && config.tema_deep === paleta.deep;
    if (!coinciden) {
      console.warn(
        'La paleta dice "' + paleta.nombre + '" pero tema_base/soft/deep tienen otros hex: mandan los hex. ' +
        'Si quieres que mande la paleta, borra los tres hex.'
      );
    }
  }
  console.log('Moneda: ' + normalizarMoneda_(config.moneda));
  console.log('Lugar: ' + etiquetaLugar_(config) + ' · sedes: ' + getSedes_(ss, config).map(function (x) {
    return x.nombre + (x.direccion ? ' (' + x.direccion + ')' : '');
  }).join(', '));
  console.log('Permite domicilio: ' + (permiteDomicilio_(config) ? 'sí' : 'no'));
  const mensajes = getMensajes_(ss);
  const elegido = mensajes.filter(function (m) { return normKey_(m.nombre) === normKey_(config.mensaje_plantilla || ''); })[0];
  console.log('Mensaje de WhatsApp: ' + (elegido ? elegido.nombre : (mensajes[0] ? mensajes[0].nombre + ' (la primera; mensaje_plantilla no coincide)' : 'Cálida (por defecto; falta la pestaña Mensajes)')));
  console.log('Métodos de pago: ' + (config.metodos_pago || '—'));
  ['pm_banco', 'pm_telefono', 'pm_cedula'].forEach(function (k) {
    if (!config[k]) console.warn('Falta "' + k + '" en Configuracion (datos de Pago Móvil).');
  });
}

// ---------- Cupones ----------

function buscarCupon_(ss, codigo) {
  const code = String(codigo || '').trim().toUpperCase();
  if (!code) return null;
  const sheet = ss.getSheetByName('Cupones');
  if (!sheet || sheet.getLastRow() < 2) return null;
  const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 4).getValues();
  for (let i = 0; i < data.length; i++) {
    if (String(data[i][0]).trim().toUpperCase() !== code) continue;
    const usos = data[i][3];
    if (usos !== '' && toNumber_(usos) <= 0) return null;
    return {
      fila: i + 2,
      codigo: String(data[i][0]).trim().toUpperCase(),
      porcentaje: toNumber_(data[i][1]),
      monto: toNumber_(data[i][2]),
      usos: usos,
    };
  }
  return null;
}

function descontarCupon_(ss, cupon) {
  if (cupon.usos === '') return; // ilimitado
  ss.getSheetByName('Cupones').getRange(cupon.fila, 4).setValue(Math.max(0, toNumber_(cupon.usos) - 1));
}

function appendByHeaders_(sheet, record) {
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(String);
  sheet.appendRow(headers.map(function (h) { return h in record ? paraCelda_(record[h]) : ''; }));
}

/** Agrega al final las columnas que falten (hojas creadas antes de que existieran). */
function asegurarColumnas_(sheet, nombres) {
  const actuales = sheet.getRange(1, 1, 1, Math.max(1, sheet.getLastColumn())).getValues()[0].map(String);
  nombres.forEach(function (n) {
    if (actuales.indexOf(n) === -1) {
      sheet.getRange(1, sheet.getLastColumn() + 1).setValue(n);
      actuales.push(n);
    }
  });
}

/** Índice (base 0) de una columna por su encabezado, o -1 si no existe. */
function columna_(headers, nombre) {
  return headers.map(String).indexOf(nombre);
}

  /**
   * Borra la fila de una reserva que se acaba de escribir y que no llegó a
   * agendarse. Se usa cuando el evento del calendario falla después de que la fila
   * ya está: mejor que no quede registro que a que quede una reserva que promete
   * una cita que no existe. La fila se pasa por número porque es la que se acaba
   * de escribir, y borrar hacia arriba no mueve las de abajo.
   */
  function borrarFilaReserva_(hoja, fila) {
    if (!hoja || !fila || fila < 2) return false;
    try {
      hoja.deleteRow(fila);
      return true;
    } catch (err) {
      console.error('No se pudo borrar la fila ' + fila + ' de la reserva: ' + err);
      return false;
    }
  }

  /**
   * Escribe campos en la fila de la reserva cuya ID coincide. Se usa para completar

 * la fila después de crearla (el enlace del capture, la tasa fresca) sin tener que
 * volver a escribirla entera. Busca por ID y no por número de fila, porque entre
 * la escritura y el parcheo otra persona pudo insertar filas.
 */
function actualizarReserva_(ss, id, campos) {
  if (!id) return false;
  const sheet = ss.getSheetByName('Reservaciones');
  if (!sheet || sheet.getLastRow() < 2) return false;
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(String);
  const colId = columna_(headers, 'ID');
  if (colId === -1) return false;
  const n = sheet.getLastRow() - 1;
  const ids = sheet.getRange(2, colId + 1, n, 1).getValues();
  for (let i = 0; i < n; i++) {
    if (String(ids[i][0]) !== String(id)) continue;
    Object.keys(campos).forEach(function (nombre) {
      const c = columna_(headers, nombre);
      if (c !== -1) sheet.getRange(i + 2, c + 1).setValue(campos[nombre]);
    });
    return true;
  }
  return false;
}

/**
 * Devuelve la respuesta de una reserva ya guardada, o null si no existe.
 *
 * El cliente manda un `reservaId` fijo por intento y lo reusa cuando reintenta,
 * así que un reintento con el mismo id es la misma reserva: se le devuelve el
 * éxito guardado en vez de comprobar disponibilidad, que rechazaría el reintento
 * con "ocupado" por el evento que él mismo ya había creado. Se exige que la fecha
 * y la hora coincidan, para que un id reutilizado en otra hora no traiga la
 * reserva anterior.
 */
function buscarReservaPorId_(ss, reservaId, fechaCita, horaCita) {
  if (!reservaId) return null;
  const sheet = ss.getSheetByName('Reservaciones');
  if (!sheet || sheet.getLastRow() < 2) return null;
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(String);
  const colId = columna_(headers, 'ID');
  if (colId === -1) return null;
  const n = sheet.getLastRow() - 1;
  const ids = sheet.getRange(2, colId + 1, n, 1).getValues();
  for (let i = 0; i < n; i++) {
    if (String(ids[i][0]) !== String(reservaId)) continue;
    const fila = i + 2;
    const leer = function (nombre) {
      const c = columna_(headers, nombre);
      return c === -1 ? null : sheet.getRange(fila, c + 1).getValue();
    };
    if (String(leer('Fecha_Cita')) !== String(fechaCita)) return null;
    if (String(leer('Hora_Cita')) !== String(horaCita)) return null;
    const total = leer('Total');
    const totalBs = leer('Total_Bs');
    const tasa = leer('Tasa_BCV');
    const comp = String(leer('Comprobante') || '');
    const recibo = leer('Recibo_N');
    return {
      success: true,
      id: String(reservaId),
      total: total === null || total === '' ? null : toNumber_(total),
      totalBs: totalBs === null || totalBs === '' ? null : toNumber_(totalBs),
      tasa: tasa === null || tasa === '' ? null : toNumber_(tasa),
      // Lo único que sirve de la columna es un enlace a Drive; el resto son
      // marcadores como "pendiente" o "no se pudo subir".
      comprobanteUrl: /^https:\/\//.test(comp) ? comp : null,
      recibo: recibo === null || recibo === '' ? null : toNumber_(recibo),
      profesional: leer('Profesional_ID') ? { id: String(leer('Profesional_ID')), nombre: String(leer('Profesional') || '') } : null,
    };
  }
  return null;
}

function toNumber_(value) {
  if (typeof value === 'number') return isFinite(value) ? value : 0;
  let s = String(value || '').replace(/[^\d.,-]/g, '');
  if (s.indexOf(',') !== -1 && s.indexOf('.') !== -1) {
    s = s.lastIndexOf(',') > s.lastIndexOf('.') ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '');
  } else if (s.indexOf(',') !== -1) {
    s = s.replace(',', '.');
  }
  const n = parseFloat(s);
  return isFinite(n) ? n : 0;
}

function round2_(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

// ============================================================================
// Bot de WhatsApp de bookeaa (Cloudflare Worker en bot/)
// ============================================================================
// El Worker llama a doPost con { accion: 'bot', token: <bot_token>, op, ... }.
// - disponibilidad: horas libres para la cita de configuración e inducción
//   (presencial solo sábados; Google Meet de lunes a viernes)
// - agendar / reprogramar / cancelar: eventos en el calendario "Afiliaciones bookeaa"
//   con invitación al Gmail del negocio (y enlace de Meet si es virtual)
// - soporte / persona: fila en la hoja Soporte y correo de aviso
// Los horarios se cambian en las propiedades del script (claves bot_*).
// Requiere el servicio avanzado "Google Calendar API" (identificador Calendar).

const BOT_DEFAULTS = {
  bot_sabado_desde: '08:00', bot_sabado_hasta: '17:00', bot_sabado_min: '90', bot_sabados: '4',
  bot_meet_desde: '09:00', bot_meet_hasta: '17:00', bot_meet_min: '60', bot_dias_meet: '8',
  bot_anticipacion_horas: '12',
};
const BOT_CAMPOS_PROSPECTO = ['Fecha', 'Teléfono', 'Nombre en WhatsApp', 'Negocio', 'Rubro', 'Servicios', 'Horario', 'Correo', 'Logo',
  'Foto de servicios', 'Modalidad', 'Dirección', 'Cita', 'Meet', 'Estado', 'Id evento'];
const BOT_CAMPOS_SOPORTE = ['Fecha', 'Caso', 'Tipo', 'Teléfono', 'Nombre en WhatsApp', 'Negocio', 'Tema', 'Descripción', 'Captura', 'Estado'];

function botConfig_() {
  const props = PropertiesService.getScriptProperties().getProperties();
  const out = {};
  Object.keys(BOT_DEFAULTS).forEach(function (k) { out[k] = String(props[k] || BOT_DEFAULTS[k]).trim(); });
  return out;
}

function minutosDe_(hhmm) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(hhmm || ''));
  return m ? Number(m[1]) * 60 + Number(m[2]) : NaN;
}

function hhmm_(min) {
  return ('0' + Math.floor(min / 60)).slice(-2) + ':' + ('0' + (min % 60)).slice(-2);
}

/** "2026-10-03" + "09:30" en Caracas (UTC−4) → ms. */
function msCaracas_(fecha, hora) {
  const p = fecha.split('-').map(Number);
  return Date.UTC(p[0], p[1] - 1, p[2]) + minutosDe_(hora) * 60000 + 4 * 3600000;
}

/** Inicios posibles de un día: cada `duracion` minutos, terminando antes de `hasta`. */
function horasDelDia_(desde, hasta, duracion) {
  const out = [];
  const ini = minutosDe_(desde), fin = minutosDe_(hasta), d = Number(duracion);
  if (!(d > 0) || isNaN(ini) || isNaN(fin)) return out;
  for (let m = ini; m + d <= fin; m += d) out.push(hhmm_(m));
  return out;
}

/** Fechas candidatas (en Caracas) desde `ahoraMs`: los próximos N sábados o N días hábiles. */
function diasCandidatos_(modalidad, ahoraMs, cfg) {
  const out = [];
  const hoy = new Date(ahoraMs - 4 * 3600000);
  const base = Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth(), hoy.getUTCDate());
  const quiere = modalidad === 'presencial' ? Number(cfg.bot_sabados) : Number(cfg.bot_dias_meet);
  for (let i = 0; i < 60 && out.length < quiere; i++) {
    const d = new Date(base + i * 86400000);
    const dia = d.getUTCDay();
    const vale = modalidad === 'presencial' ? dia === 6 : dia >= 1 && dia <= 5;
    if (vale) out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

/** Horas que no chocan con ningún evento y que empiezan después de `minimoMs`. */
function horasLibres_(fecha, horas, duracion, ocupados, minimoMs) {
  return horas.filter(function (h) {
    const ini = msCaracas_(fecha, h), fin = ini + Number(duracion) * 60000;
    if (ini < minimoMs) return false;
    return !ocupados.some(function (o) { return o.ini < fin && o.fin > ini; });
  });
}

function calendarioAfiliaciones_() {
  const props = PropertiesService.getScriptProperties();
  const id = props.getProperty('bot_calendario');
  const cal = id ? CalendarApp.getCalendarById(id) : null;
  if (cal) return cal;
  const nuevo = CalendarApp.createCalendar('Afiliaciones bookeaa', { timeZone: ZONA });
  props.setProperty('bot_calendario', nuevo.getId());
  return nuevo;
}

function botDuracion_(modalidad, cfg) {
  return Number(modalidad === 'presencial' ? cfg.bot_sabado_min : cfg.bot_meet_min);
}

/** Días con horas libres. `excluir`: id de un evento que no cuenta como ocupado (al reprogramar). */
function botDisponibilidad_(modalidad, ahoraMs, cfg, cal, excluir) {
  const fechas = diasCandidatos_(modalidad, ahoraMs, cfg);
  if (!fechas.length) return [];
  const horas = modalidad === 'presencial'
    ? horasDelDia_(cfg.bot_sabado_desde, cfg.bot_sabado_hasta, cfg.bot_sabado_min)
    : horasDelDia_(cfg.bot_meet_desde, cfg.bot_meet_hasta, cfg.bot_meet_min);
  const desde = new Date(msCaracas_(fechas[0], '00:00'));
  const hasta = new Date(msCaracas_(fechas[fechas.length - 1], '23:59'));
  const limpio = String(excluir || '').replace(/@google\.com$/, '');
  const ocupados = cal.getEvents(desde, hasta)
    .filter(function (ev) { return !limpio || String(ev.getId()).replace(/@google\.com$/, '') !== limpio; })
    .map(function (ev) { return { ini: ev.getStartTime().getTime(), fin: ev.getEndTime().getTime() }; });
  const minimo = ahoraMs + Number(cfg.bot_anticipacion_horas) * 3600000;
  return fechas
    .map(function (f) { return { fecha: f, horas: horasLibres_(f, horas, botDuracion_(modalidad, cfg), ocupados, minimo) }; })
    .filter(function (d) { return d.horas.length; });
}

function hojaBot_(nombre, campos) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(nombre);
  if (!sheet) {
    sheet = ss.insertSheet(nombre);
    sheet.appendRow(campos);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, campos.length).setFontWeight('bold');
  }
  return sheet;
}

/** Guarda una imagen del chat en la carpeta "bookeaa · bot" y devuelve el enlace. */
function botGuardarImagen_(img, nombre) {
  if (!img || !img.base64) return '';
  try {
    const bytes = Utilities.base64Decode(img.base64);
    if (!esImagen_(bytes)) return '';
    const props = PropertiesService.getScriptProperties();
    let carpeta = null;
    const id = props.getProperty('bot_carpeta');
    try { carpeta = id ? DriveApp.getFolderById(id) : null; } catch (_) {}
    if (!carpeta) {
      carpeta = DriveApp.createFolder('bookeaa · bot');
      props.setProperty('bot_carpeta', carpeta.getId());
    }
    return carpeta.createFile(Utilities.newBlob(bytes, img.mime || 'image/jpeg', nombre)).getUrl();
  } catch (err) {
    console.warn('No se pudo guardar la imagen: ' + err);
    return '';
  }
}

function botAvisar_(asunto, lineas) {
  const props = PropertiesService.getScriptProperties();
  const para = props.getProperty('aviso_email') || Session.getEffectiveUser().getEmail();
  if (!para) return;
  try {
    MailApp.sendEmail({ to: para, subject: '[bookeaa bot] ' + asunto, body: lineas.filter(Boolean).join('\n') + '\n\nBandeja: ' + (props.getProperty('bot_bandeja_url') || '(pon bot_bandeja_url en las propiedades)') });
  } catch (err) {
    console.warn('No se pudo mandar el aviso: ' + err);
  }
}

function botTexto_(v, max) {
  return paraCelda_(String(v == null ? '' : v).replace(/[\u0000-\u0008\u000b-\u001f]/g, '').trim().slice(0, max));
}

function botCita_(modalidad, fecha, hora, cfg) {
  const ini = msCaracas_(fecha, hora);
  return { ini: new Date(ini), fin: new Date(ini + botDuracion_(modalidad, cfg) * 60000) };
}

/** Punto de entrada desde doPost. */
function atenderBot_(data, ahoraMs) {
  const esperado = String(PropertiesService.getScriptProperties().getProperty('bot_token') || '');
  if (esperado.length < 24 || String(data.token || '') !== esperado) return { error: 'no_autorizado' };
  if (limite_('bot', 240, 60)) return { error: 'limite' };
  const cfg = botConfig_();
  const op = String(data.op || '');
  const quien = { telefono: String(data.telefono || '').replace(/\D/g, '').slice(0, 20), nombre: botTexto_(data.nombre, 80) };

  if (op === 'disponibilidad') {
    const modalidad = data.modalidad === 'presencial' ? 'presencial' : 'meet';
    return { dias: botDisponibilidad_(modalidad, ahoraMs, cfg, calendarioAfiliaciones_()) };
  }
  if (op === 'agendar') return botAgendar_(data, quien, ahoraMs, cfg);
  if (op === 'reprogramar') return botReprogramar_(data, quien, ahoraMs, cfg);
  if (op === 'cancelar') return botCancelar_(data, quien);
  if (op === 'soporte' || op === 'persona') return botSoporte_(op, data, quien);
  if (op === 'agenda') return agendaParaWorker_(data, ahoraMs);
  return { error: 'op_desconocida' };
}

function botLibre_(modalidad, fecha, hora, ahoraMs, cfg, cal, excluir) {
  return botDisponibilidad_(modalidad, ahoraMs, cfg, cal, excluir).some(function (d) {
    return d.fecha === fecha && d.horas.indexOf(hora) !== -1;
  });
}

function botAgendar_(data, quien, ahoraMs, cfg) {
  const af = data.af || {};
  const modalidad = af.modalidad === 'presencial' ? 'presencial' : 'meet';
  const fecha = String(af.fecha || ''), hora = String(af.hora || '');
  const correo = String(af.correo || '').trim().toLowerCase();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha) || !/^\d{2}:\d{2}$/.test(hora) || !/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(correo)) {
    return { ok: false, motivo: 'error', mensaje: 'Datos incompletos: fecha ' + fecha + ', hora ' + hora + ', correo ' + correo };
  }
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(20000)) return { ok: false, motivo: 'error' };
  try {
    const cal = calendarioAfiliaciones_();
    if (!botLibre_(modalidad, fecha, hora, ahoraMs, cfg, cal)) return { ok: false, motivo: 'ocupado' };
    const negocio = botTexto_(af.negocio, 80);
    const logo = botGuardarImagen_(data.logo, 'logo-' + negocio);
    const foto = botGuardarImagen_(data.serviciosFoto, 'servicios-' + negocio);
    const direccion = modalidad === 'presencial' ? botTexto_(af.direccion, 300) : '';
    const c = botCita_(modalidad, fecha, hora, cfg);
    // El bot solo pide lo mínimo; servicios, precios y horario se toman en la cita.
    const descripcion = [
      'Cita de configuración e inducción de bookeaa.',
      '',
      'Negocio: ' + negocio,
      'WhatsApp: +' + quien.telefono + (quien.nombre ? ' (' + quien.nombre + ')' : ''),
      'Correo: ' + correo,
      direccion ? 'Dirección: ' + direccion : '',
      af.rubro ? 'Rubro: ' + botTexto_(af.rubro, 80) : '',
      af.horario ? 'Horario: ' + botTexto_(af.horario, 200) : '',
      af.servicios ? 'Servicios:\n' + botTexto_(af.servicios, 1500) : '',
      logo ? 'Logo: ' + logo : '',
      foto ? 'Foto de servicios: ' + foto : '',
      '',
      'En la cita: servicios con precio y duración, horario, dirección, logo y colores.',
    ].filter(function (l, i, a) { return l !== '' || (i > 0 && a[i - 1] !== ''); }).join('\n');
    const evento = {
      summary: 'Afiliación bookeaa · ' + negocio + (modalidad === 'presencial' ? ' (presencial)' : ' (Google Meet)'),
      description: descripcion,
      start: { dateTime: c.ini.toISOString(), timeZone: ZONA },
      end: { dateTime: c.fin.toISOString(), timeZone: ZONA },
      attendees: [{ email: correo }],
      reminders: { useDefault: false, overrides: [{ method: 'email', minutes: 1440 }, { method: 'popup', minutes: 60 }] },
    };
    if (direccion) evento.location = direccion;
    if (modalidad === 'meet') evento.conferenceData = { createRequest: { requestId: Utilities.getUuid(), conferenceSolutionKey: { type: 'hangoutsMeet' } } };
    const creado = botCrearEvento_(cal, evento, c);
    const meet = creado.hangoutLink || '';
    hojaBot_('Prospectos', BOT_CAMPOS_PROSPECTO).appendRow([
      new Date(ahoraMs), "'+" + quien.telefono, quien.nombre, negocio, botTexto_(af.rubro, 80), botTexto_(af.servicios, 1500),
      botTexto_(af.horario, 200), correo, logo, foto, modalidad === 'presencial' ? 'Presencial' : 'Google Meet', direccion,
      c.ini, meet, 'Agendada', creado.id,
    ]);
    botAvisar_('Nueva afiliación: ' + negocio, [
      negocio + ' agendó su cita de configuración.',
      'Cuándo: ' + Utilities.formatDate(c.ini, ZONA, "EEEE d 'de' MMMM, h:mm a"),
      modalidad === 'presencial' ? 'Presencial en: ' + direccion : 'Google Meet: ' + (meet || 'sin enlace. Activa el servicio Google Calendar API en Apps Script y crea el Meet a mano en el evento.'),
      'WhatsApp: +' + quien.telefono, 'Correo: ' + correo,
    ]);
    return { ok: true, cita: { idEvento: creado.id, modalidad: modalidad, fecha: fecha, hora: hora, direccion: direccion || undefined, meet: meet || undefined } };
  } catch (err) {
    console.error('botAgendar_: ' + err);
    return { ok: false, motivo: 'error', mensaje: String(err && err.message || err).slice(0, 300) };
  } finally {
    lock.releaseLock();
  }
}

// Con el servicio avanzado "Google Calendar API" el evento lleva Meet. Sin él, se crea igual
// con CalendarApp (sin enlace de Meet) para que la cita nunca se pierda. Los ids de CalendarApp
// terminan en @google.com; así se sabe con qué servicio moverlos o borrarlos después.
function botCalAvanzado_() {
  return typeof Calendar !== 'undefined' && Calendar.Events;
}

function botCrearEvento_(cal, evento, c) {
  if (botCalAvanzado_()) {
    try {
      return Calendar.Events.insert(evento, cal.getId(), { conferenceDataVersion: 1, sendUpdates: 'all' });
    } catch (err) {
      console.warn('Calendar.Events.insert falló, uso CalendarApp: ' + err);
    }
  }
  const ev = cal.createEvent(evento.summary, c.ini, c.fin, {
    description: evento.description, location: evento.location || '', guests: evento.attendees[0].email, sendInvites: true,
  });
  ev.addEmailReminder(1440);
  ev.addPopupReminder(60);
  return { id: ev.getId(), hangoutLink: '' };
}

function botMoverEvento_(cal, id, c) {
  if (botCalAvanzado_() && !/@/.test(id)) {
    Calendar.Events.patch({ start: { dateTime: c.ini.toISOString(), timeZone: ZONA }, end: { dateTime: c.fin.toISOString(), timeZone: ZONA } },
      cal.getId(), id, { sendUpdates: 'all' });
    return;
  }
  const ev = cal.getEventById(id);
  if (!ev) throw new Error('No encuentro el evento ' + id);
  ev.setTime(c.ini, c.fin);
}

function botBorrarEvento_(cal, id) {
  if (botCalAvanzado_() && !/@/.test(id)) {
    Calendar.Events.remove(cal.getId(), id, { sendUpdates: 'all' });
    return;
  }
  const ev = cal.getEventById(id);
  if (ev) ev.deleteEvent();
}

/** Fila de Prospectos de un evento (por su id). */
function botFilaDeEvento_(idEvento) {
  const sheet = hojaBot_('Prospectos', BOT_CAMPOS_PROSPECTO);
  const n = sheet.getLastRow();
  if (n < 2) return null;
  const col = BOT_CAMPOS_PROSPECTO.indexOf('Id evento') + 1;
  const ids = sheet.getRange(2, col, n - 1, 1).getValues();
  for (let i = ids.length - 1; i >= 0; i--) if (String(ids[i][0]) === String(idEvento)) return { sheet: sheet, fila: i + 2 };
  return null;
}

function botReprogramar_(data, quien, ahoraMs, cfg) {
  const cita = data.cita || {};
  const fecha = String(data.fecha || ''), hora = String(data.hora || '');
  const modalidad = cita.modalidad === 'presencial' ? 'presencial' : 'meet';
  if (!cita.idEvento || !/^\d{4}-\d{2}-\d{2}$/.test(fecha) || !/^\d{2}:\d{2}$/.test(hora)) return { ok: false, motivo: 'error' };
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(20000)) return { ok: false, motivo: 'error' };
  try {
    const cal = calendarioAfiliaciones_();
    if (!botLibre_(modalidad, fecha, hora, ahoraMs, cfg, cal, cita.idEvento)) return { ok: false, motivo: 'ocupado' };
    const c = botCita_(modalidad, fecha, hora, cfg);
    botMoverEvento_(cal, cita.idEvento, c);
    const f = botFilaDeEvento_(cita.idEvento);
    if (f) {
      f.sheet.getRange(f.fila, BOT_CAMPOS_PROSPECTO.indexOf('Cita') + 1).setValue(c.ini);
      f.sheet.getRange(f.fila, BOT_CAMPOS_PROSPECTO.indexOf('Estado') + 1).setValue('Reprogramada');
    }
    botAvisar_('Cita reprogramada', ['+' + quien.telefono + ' cambió su cita para ' + Utilities.formatDate(c.ini, ZONA, "EEEE d 'de' MMMM, h:mm a") + '.']);
    return { ok: true, cita: { idEvento: cita.idEvento, modalidad: modalidad, fecha: fecha, hora: hora, direccion: cita.direccion, meet: cita.meet } };
  } catch (err) {
    console.error('botReprogramar_: ' + err);
    return { ok: false, motivo: 'error', mensaje: String(err && err.message || err).slice(0, 300) };
  } finally {
    lock.releaseLock();
  }
}

function botCancelar_(data, quien) {
  const cita = data.cita || {};
  if (!cita.idEvento) return { ok: false };
  try {
    botBorrarEvento_(calendarioAfiliaciones_(), cita.idEvento);
    const f = botFilaDeEvento_(cita.idEvento);
    if (f) f.sheet.getRange(f.fila, BOT_CAMPOS_PROSPECTO.indexOf('Estado') + 1).setValue('Cancelada');
    botAvisar_('Cita cancelada', ['+' + quien.telefono + ' canceló su cita de ' + cita.fecha + ' ' + cita.hora + '.']);
    return { ok: true };
  } catch (err) {
    console.error('botCancelar_: ' + err);
    return { ok: false };
  }
}

function botSoporte_(op, data, quien) {
  const props = PropertiesService.getScriptProperties();
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  let caso;
  try {
    caso = Number(props.getProperty('bot_caso_ultimo') || 0) + 1;
    props.setProperty('bot_caso_ultimo', String(caso));
  } finally {
    lock.releaseLock();
  }
  const sop = data.sop || {};
  const captura = op === 'soporte' ? botGuardarImagen_(data.captura, 'caso-' + caso) : '';
  hojaBot_('Soporte', BOT_CAMPOS_SOPORTE).appendRow([
    new Date(), caso, op === 'soporte' ? 'Soporte' : 'Pidió una persona', "'+" + quien.telefono, quien.nombre,
    botTexto_(sop.negocio, 120), botTexto_(sop.tema, 80), botTexto_(sop.descripcion, 1500), captura, 'Abierto',
  ]);
  botAvisar_(op === 'soporte' ? 'Caso de soporte #' + caso : 'Te piden hablar con una persona', [
    'WhatsApp: +' + quien.telefono + (quien.nombre ? ' (' + quien.nombre + ')' : ''),
    sop.negocio ? 'Negocio: ' + sop.negocio : '',
    sop.tema ? 'Tema: ' + sop.tema : '',
    sop.descripcion ? 'Descripción: ' + sop.descripcion : '',
    captura ? 'Captura: ' + captura : '',
  ]);
  return { ok: true, caso: caso };
}

function promptGenerarTokenBot() {
  const ui = SpreadsheetApp.getUi();
  const token = 'bot_' + Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '').slice(0, 12);
  PropertiesService.getScriptProperties().setProperty('bot_token', token);
  ui.alert('Token del bot', token + '\n\nCópialo en GitHub > Settings > Secrets and variables > Actions > BOT_TOKEN.\nEl anterior deja de servir ahora.', ui.ButtonSet.OK);
}

/** Revisa, desde el editor, lo mismo que necesita el bot para agendar. */
function probarAgendaBot() {
  const ui = SpreadsheetApp.getUi();
  const lineas = [];
  const token = String(PropertiesService.getScriptProperties().getProperty('bot_token') || '');
  lineas.push(token.length >= 24 ? '✅ Token del bot creado (termina en …' + token.slice(-4) + '). Debe ser igual a BOT_TOKEN en GitHub.' : '❌ No hay token del bot: usa "Bot de WhatsApp: generar token" y ponlo en GitHub como BOT_TOKEN.');
  lineas.push(typeof Calendar !== 'undefined' ? '✅ Servicio Google Calendar API activado.' : '❌ Falta activar Servicios (+) → Google Calendar API, identificador "Calendar".');
  ['meet', 'presencial'].forEach(function (m) {
    try {
      const dias = botDisponibilidad_(m, Date.now(), botConfig_(), calendarioAfiliaciones_());
      const horas = dias.reduce(function (n, d) { return n + d.horas.length; }, 0);
      lineas.push((horas ? '✅ ' : '⚠️ ') + (m === 'meet' ? 'Google Meet' : 'Presencial') + ': ' + horas + ' horas libres en ' + dias.length + ' días.');
    } catch (err) {
      lineas.push('❌ ' + m + ': ' + (err && err.message || err));
    }
  });
  lineas.push('', 'Si todo sale ✅ y el bot sigue fallando: Implementar → Gestionar implementaciones → editar → Nueva versión (el bot usa la versión publicada, no la del editor).');
  ui.alert('Prueba de la agenda del bot', lineas.join('\n'), ui.ButtonSet.OK);
}

function promptAjustesBot() {
  const ui = SpreadsheetApp.getUi();
  const props = PropertiesService.getScriptProperties();
  const r = ui.prompt('Avisos del bot', 'Correo que recibe los avisos (afiliaciones, soporte). Actual: ' +
    (props.getProperty('aviso_email') || Session.getEffectiveUser().getEmail()), ui.ButtonSet.OK_CANCEL);
  if (r.getSelectedButton() !== ui.Button.OK) return;
  const correo = r.getResponseText().trim();
  if (correo) props.setProperty('aviso_email', correo);
  const b = ui.prompt('Bandeja del bot', 'Dirección de la bandeja (https://…workers.dev/bandeja), para el enlace de los correos:', ui.ButtonSet.OK_CANCEL);
  if (b.getSelectedButton() === ui.Button.OK && b.getResponseText().trim()) props.setProperty('bot_bandeja_url', b.getResponseText().trim());
  calendarioAfiliaciones_();
  ui.alert('Listo. El calendario "Afiliaciones bookeaa" ya existe: ahí caen las citas y, si bloqueas una hora, el bot no la ofrece.');
}

// ============================================================================
// Mi negocio: la app de cada dueño (bookeaa.com/negocio)
// ============================================================================
// El dueño entra con Google: el navegador manda el ID token, acá se verifica con
// Google (aud = google_client_id) y el correo se busca en la columna Email de
// Tenants. Después se usa una sesión propia firmada (30 días) para no pedir Google
// en cada consulta. Propiedades del script:
//   google_client_id  ID de cliente OAuth (tipo Web) de Google Cloud
//   dueno_admins      correos que ven todos los negocios (separados por coma)
//   sesion_secreto    lo crea el script la primera vez; cambiarlo cierra todas las sesiones
// Las notificaciones las manda el Worker del bot (bot_bandeja_url sin /bandeja).

const SESION_DIAS = 30;
const ESTADO_POR_VERIFICAR = 'Pago por verificar';

function secretoSesion_() {
  const props = PropertiesService.getScriptProperties();
  let s = props.getProperty('sesion_secreto');
  if (!s) {
    s = Utilities.getUuid() + Utilities.getUuid();
    props.setProperty('sesion_secreto', s);
  }
  return s;
}

function firmar_(texto) {
  return Utilities.base64EncodeWebSafe(Utilities.computeHmacSha256Signature(texto, secretoSesion_())).replace(/=+$/, '');
}

/** Sesión "correo|vence(ms)|firma". */
function crearSesion_(email, ahoraMs) {
  const cuerpo = String(email).toLowerCase() + '|' + (ahoraMs + SESION_DIAS * 86400000);
  return cuerpo + '|' + firmar_(cuerpo);
}

/** El correo de una sesión válida, o null. */
function leerSesion_(sesion, ahoraMs) {
  const partes = String(sesion || '').split('|');
  if (partes.length !== 3) return null;
  const cuerpo = partes[0] + '|' + partes[1];
  if (firmar_(cuerpo) !== partes[2]) return null;
  if (!(Number(partes[1]) > ahoraMs)) return null;
  return partes[0];
}

/** Verifica el ID token con Google. Devuelve el correo verificado o null. */
function correoDeGoogle_(credencial, ahoraMs) {
  const clientId = String(PropertiesService.getScriptProperties().getProperty('google_client_id') || '').trim();
  if (!clientId || !credencial) return null;
  const r = UrlFetchApp.fetch('https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(credencial), { muteHttpExceptions: true });
  if (r.getResponseCode() !== 200) return null;
  const t = JSON.parse(r.getContentText());
  if (t.aud !== clientId) return null;
  if (String(t.email_verified) !== 'true' || !t.email) return null;
  if (!(Number(t.exp) * 1000 > ahoraMs)) return null;
  if (['accounts.google.com', 'https://accounts.google.com'].indexOf(String(t.iss)) === -1) return null;
  return String(t.email).toLowerCase();
}

function esAdminDueno_(email) {
  const lista = String(PropertiesService.getScriptProperties().getProperty('dueno_admins') || '');
  return lista.split(',').map(function (x) { return x.trim().toLowerCase(); }).filter(Boolean).indexOf(email) !== -1;
}

/** Negocios activos de un correo (la columna Email de Tenants admite varios, separados por coma). */
function negociosDe_(email, tenants) {
  const admin = esAdminDueno_(email);
  return tenants.filter(function (t) {
    if (!t.slug || !tenantActivo_(t)) return false;
    if (admin) return true;
    return String(t.email || '').toLowerCase().split(/[,;\s]+/).indexOf(email) !== -1;
  });
}

function horaTexto_(v) {
  if (v && typeof v.getTime === 'function' && !isNaN(v.getTime())) return Utilities.formatDate(v, ZONA, 'HH:mm');
  const m = /^(\d{1,2}):(\d{2})/.exec(String(v || '').trim());
  return m ? ('0' + m[1]).slice(-2) + ':' + m[2] : '';
}

/** Citas de Reservaciones con fecha entre `desde` y `hasta` (yyyy-MM-dd, ambas incluidas), por fecha y hora. */
function citasEntre_(filas, desde, hasta) {
  return filas
    .map(function (r) {
      return {
        id: String(r.ID || ''),
        cliente: String(r.Cliente || ''),
        telefono: String(r.Telefono || ''),
        servicios: String(r.Servicios || ''),
        total: toNumber_(r.Total),
        totalBs: r.Total_Bs === '' || r.Total_Bs == null ? null : toNumber_(r.Total_Bs),
        fecha: ymd_(r.Fecha_Cita) || '',
        hora: horaTexto_(r.Hora_Cita),
        metodo: String(r.Metodo_Pago || ''),
        estado: String(r.Estado || ''),
        lugar: String(r.Modalidad || ''),
        direccion: String(r.Direccion || ''),
        capture: /^https:\/\//.test(String(r.Comprobante || '')) ? String(r.Comprobante) : '',
        recibo: r.Recibo_N === '' || r.Recibo_N == null ? null : toNumber_(r.Recibo_N),
        // bookeaa team: quién atiende.
        profesional: String(r.Profesional || ''),
        profesionalId: String(r.Profesional_ID || ''),
      };
    })
    .filter(function (c) { return c.id && c.fecha && c.fecha >= desde && c.fecha <= hasta; })
    .sort(function (a, b) { return (a.fecha + a.hora).localeCompare(b.fecha + b.hora); });
}

function sumarDias_(ymd, n) {
  const p = ymd.split('-').map(Number);
  return Utilities.formatDate(new Date(Date.UTC(p[0], p[1] - 1, p[2] + n, 12)), 'UTC', 'yyyy-MM-dd');
}

/** Base del Worker del bot (de bot_bandeja_url) o '' si no está configurada. */
function urlWorker_() {
  return String(PropertiesService.getScriptProperties().getProperty('bot_bandeja_url') || '').trim().replace(/\/bandeja\/?$/, '');
}

/** Como llamarWorker_, pero devuelve el código HTTP para explicar qué falló (aviso de prueba). */
function llamarWorkerDetalle_(ruta, datos) {
  const base = urlWorker_();
  const token = String(PropertiesService.getScriptProperties().getProperty('bot_token') || '');
  if (!/^https:/.test(base)) return { codigo: 0, error: 'Falta la propiedad bot_bandeja_url del Apps Script (la dirección de la bandeja del bot).' };
  if (!token) return { codigo: 0, error: 'Falta la propiedad bot_token del Apps Script.' };
  try {
    const r = UrlFetchApp.fetch(base + ruta, {
      method: 'post', contentType: 'application/json', payload: JSON.stringify(datos),
      headers: { Authorization: 'Bearer ' + token }, muteHttpExceptions: true,
    });
    const codigo = r.getResponseCode();
    let json = null;
    try { json = JSON.parse(r.getContentText()); } catch (_) { /* no es JSON */ }
    if (codigo === 401) return { codigo: codigo, error: 'El bot_token del Apps Script no coincide con BOT_TOKEN del servidor de avisos (GitHub).' };
    if (codigo !== 200) return { codigo: codigo, error: 'El servidor de avisos respondió ' + codigo + (json && json.error ? ': ' + json.error : '') + '.' };
    return { codigo: codigo, json: json };
  } catch (err) {
    return { codigo: 0, error: 'No se pudo hablar con el servidor de avisos: ' + err };
  }
}

/** POST al Worker con el token del bot. Nunca lanza: los avisos no pueden tumbar nada. */
function llamarWorker_(ruta, datos) {
  const base = urlWorker_();
  const token = String(PropertiesService.getScriptProperties().getProperty('bot_token') || '');
  if (!/^https:\/\//.test(base) || !token) return null;
  try {
    const r = UrlFetchApp.fetch(base + ruta, {
      method: 'post', contentType: 'application/json', payload: JSON.stringify(datos),
      headers: { Authorization: 'Bearer ' + token }, muteHttpExceptions: true,
    });
    return r.getResponseCode() === 200 ? JSON.parse(r.getContentText()) : null;
  } catch (err) {
    console.warn('Worker ' + ruta + ': ' + err);
    return null;
  }
}

/** Clave pública VAPID del Worker (para suscribirse a las notificaciones). */
function claveVapid_() {
  const cache = CacheService.getScriptCache();
  const hit = cache.get('vapid_publica');
  if (hit) return hit;
  const base = urlWorker_();
  if (!/^https:\/\//.test(base)) return '';
  try {
    const r = UrlFetchApp.fetch(base + '/push/clave', { muteHttpExceptions: true });
    const clave = r.getResponseCode() === 200 ? String(JSON.parse(r.getContentText()).clave || '') : '';
    if (clave) cache.put('vapid_publica', clave, 21600);
    return clave;
  } catch (err) {
    return '';
  }
}

/** Avisa al Worker de una reserva nueva (notificación al dueño). Fuera del lock. */
function avisarReserva_(slug, cita) {
  llamarWorker_('/push/evento', { tipo: 'reserva', slug: slug, cita: cita });
}

/** Punto de entrada desde doPost (accion: 'dueno'). */
function atenderDueno_(data, ahoraMs) {
  if (limite_('dueno', 600, 60)) return { error: 'limite', mensaje: 'Demasiadas consultas. Intenta en un minuto.' };
  const op = String(data.op || '');
  if (op === 'entrar') {
    const email = correoDeGoogle_(data.credencial, ahoraMs);
    if (!email) return { error: 'no_autorizado', mensaje: 'No pudimos verificar tu cuenta de Google.' };
    const accesos = accesosDe_(email, getTenants_());
    if (!accesos.length) return { error: 'sin_negocio', mensaje: email + ' no tiene un negocio en bookeaa. Entra con el correo que diste al afiliarte (o con el que te agregaron al equipo).' };
    return {
      sesion: crearSesion_(email, ahoraMs), email: email, vapid: claveVapid_(),
      negocios: accesos.map(function (a) { return { slug: a.tenant.slug, nombre: a.tenant.nombre, rol: a.rol, persona: a.persona }; }),
    };
  }

  const email = leerSesion_(data.sesion, ahoraMs);
  if (!email) return { error: 'sesion', mensaje: 'Tu sesión venció. Entra otra vez.' };
  const acceso = accesosDe_(email, getTenants_()).filter(function (a) { return a.tenant.slug === String(data.slug || ''); })[0];
  if (!acceso) return { error: 'no_autorizado', mensaje: 'Ese negocio no es tuyo.' };
  // bookeaa team: una persona del equipo solo ve y toca lo suyo.
  if (acceso.rol === 'equipo') return atenderEquipo_(op, data, acceso, email, ahoraMs);
  const tenant = acceso.tenant;
  if (op === 'bloqueos' || op === 'bloquear' || op === 'desbloquear') {
    return atenderBloqueos_(op, data, openTenant_(tenant), tenant, String(data.persona || ''), ahoraMs);
  }
  if (op === 'panel') return panelNegocio_(tenant, data, ahoraMs);
  if (op === 'guardar' && String(data.seccion || '') === 'equipo' && !esAdminDueno_(email)) {
    const fila = filasTenants_().filter(function (o) { return normKey_(o.Slug) === normKey_(tenant.slug); })[0] || {};
    const activar = data.datos && data.datos.config && String(data.datos.config.equipo_activo || '') === 'si';
    if (activar && planDe_(fila.Plan) !== 'team') {
      return { ok: false, errores: ['El equipo es de bookeaa team. Escríbenos para cambiar tu plan.'] };
    }
  }

  if (op === 'citas') {
    const desde = /^\d{4}-\d{2}-\d{2}$/.test(String(data.desde || '')) ? String(data.desde) : Utilities.formatDate(new Date(ahoraMs), ZONA, 'yyyy-MM-dd');
    const dias = Math.max(1, Math.min(62, Math.floor(Number(data.dias) || 14)));
    const libro = openTenant_(tenant);
    const config = getConfig_(libro);
    return {
      negocio: { slug: tenant.slug, nombre: config.marca || config.nombre_negocio || tenant.nombre, moneda: normalizarMoneda_(config.moneda) },
      hoy: Utilities.formatDate(new Date(ahoraMs), ZONA, 'yyyy-MM-dd'),
      citas: citasEntre_(getSheetData_(libro, 'Reservaciones'), desde, sumarDias_(desde, dias - 1)),
    };
  }
  if (op === 'confirmar_pago') {
    const datos = openTenant_(tenant);
    const cita = getSheetData_(datos, 'Reservaciones').filter(function (r) { return String(r.ID) === String(data.id || ''); })[0];
    if (!cita) return { error: 'no_existe', mensaje: 'No encontramos esa reserva.' };
    if (String(cita.Estado) !== ESTADO_POR_VERIFICAR) return { ok: true, estado: String(cita.Estado) };
    actualizarReserva_(datos, cita.ID, { Estado: 'Confirmada' });
    return { ok: true, estado: 'Confirmada' };
  }
  if (op === 'config') return duenoLeerConfig_(openTenant_(tenant), tenant, ahoraMs);
  if (op === 'guardar') return duenoGuardar_(openTenant_(tenant), tenant, String(data.seccion || ''), data.datos, ahoraMs);
  if (op === 'plan') return planNegocio_(tenant, ahoraMs);
  if (op === 'reportar_pago') {
    const lockPago = LockService.getScriptLock();
    if (!lockPago.tryLock(20000)) return { error: 'servidor', mensaje: 'Intenta de nuevo en un momento.' };
    try {
      return reportarPago_(tenant, email, data, ahoraMs);
    } finally {
      lockPago.releaseLock();
    }
  }
  if (op === 'vapid') {
    // La app la pide cada vez que abre Avisos: la de la sesión pudo quedar vacía si se
    // entró antes de configurar bot_bandeja_url.
    return { vapid: claveVapid_(), servidor: /^https:/.test(urlWorker_()) };
  }
  if (op === 'probar_avisos') {
    const r = llamarWorkerDetalle_('/push/evento', { tipo: 'prueba', slug: tenant.slug });
    if (r.error) return { error: 'servidor', mensaje: r.error };
    return { ok: true, equipos: r.json.equipos || 0, enviadas: r.json.enviadas || 0, fallos: r.json.fallos || [] };
  }
  if (op === 'avisos') {
    const s = data.suscripcion || {};
    if (!/^https:/.test(String(s.endpoint || ''))) return { error: 'datos_invalidos', mensaje: 'Suscripción inválida.' };
    const r = llamarWorkerDetalle_(data.quitar ? '/push/quitar' : '/push/suscribir', { slug: tenant.slug, email: email, suscripcion: s });
    return r.json && r.json.ok ? { ok: true } : { error: 'servidor', mensaje: 'No se pudieron activar los avisos. ' + (r.error || 'Intenta de nuevo.') };
  }
  return { error: 'op_desconocida' };
}

/** Para el Worker (accion 'bot', op 'agenda'): las citas de un día de varios negocios. */
function agendaParaWorker_(data, ahoraMs) {
  const fecha = /^\d{4}-\d{2}-\d{2}$/.test(String(data.fecha || '')) ? String(data.fecha) : Utilities.formatDate(new Date(ahoraMs), ZONA, 'yyyy-MM-dd');
  const pedidos = (Array.isArray(data.slugs) ? data.slugs : []).map(String).slice(0, 200);
  const agenda = {};
  getTenants_().forEach(function (t) {
    if (pedidos.indexOf(t.slug) === -1 || !tenantActivo_(t)) return;
    try {
      agenda[t.slug] = citasEntre_(getSheetData_(openTenant_(t), 'Reservaciones'), fecha, fecha)
        .filter(function (c) { return !/cancel/i.test(c.estado); })
        .map(function (c) { return { id: c.id, cliente: c.cliente, servicios: c.servicios, fecha: c.fecha, hora: c.hora, estado: c.estado, profesionalId: c.profesionalId }; });
    } catch (err) {
      console.warn('agenda ' + t.slug + ': ' + err);
    }
  });
  return { fecha: fecha, agenda: agenda };
}

// ---------- Mi negocio: configuración (lo mismo que la ventana de la hoja) ----------
// Igual que CLAVES_POR_SECCION de apps-script/cliente/Configurador.gs (un test las compara).
const CLAVES_DUENO = {
  marca: ['nombre_negocio', 'marca', 'logo_url', 'hero_titulo', 'hero_subtitulo'],
  estilo: ['tema_estilo', 'color_principal', 'color_fondo', 'paleta'],
  lugar: ['lugar_tipo', 'lugar_nombre', 'permite_domicilio', 'recargo_domicilio_pct', 'minutos_extra_domicilio'],
  mensaje: ['mensaje_plantilla'],
  horario: ['intervalo_min', 'dias_anticipacion', 'anticipacion_min_horas', 'zona_horaria', 'recordatorio_minutos'],
  pagos: ['whatsapp', 'moneda', 'metodos_pago', 'pm_banco', 'pm_telefono', 'pm_cedula', 'tasa_eur_manual', 'tasa_usd_manual'],
  comprobantes: ['facturacion_modo', 'ticket_reserva', 'facturacion_rif', 'facturacion_razon_social', 'facturacion_proveedor'],
};
/** Secciones que solo tocan tablas (sin claves de Configuracion). */
const TABLAS_DUENO = ['servicios', 'bloqueos', 'logo', 'cupones', 'equipo'];
const MAX_CUPONES = 200;
const MAX_SERVICIOS = 120;

/** Filas de datos como texto visible (las horas no se vuelven fechas). */
function cfgFilas_(ss, nombre, columnas) {
  const sheet = ss.getSheetByName(nombre);
  if (!sheet || sheet.getLastRow() < 2) return [];
  return sheet.getRange(2, 1, sheet.getLastRow() - 1, columnas).getDisplayValues()
    .filter(function (r) { return r.some(function (c) { return String(c).trim() !== ''; }); });
}

function cfgHora_(v) {
  const m = /^(\d{1,2}):(\d{2})/.exec(String(v || '').trim());
  return m ? ('0' + m[1]).slice(-2) + ':' + m[2] : '';
}

function cfgActiva_(v) {
  return ['false', 'falso', 'no', '0'].indexOf(String(v).trim().toLowerCase()) === -1;
}

/** recordatorio_minutos: vacío, "no" o hasta 5 números (0–40320) separados por comas. */
function cfgAlertas_(valor) {
  const v = String(valor == null ? '' : valor).trim().toLowerCase();
  if (v === '' || v === 'no') return true;
  const partes = v.split(/[\s,;]+/);
  return partes.length <= 5 && partes.every(function (t) { return /^\d{1,5}$/.test(t) && Number(t) <= 40320; });
}

function cfgReemplazar_(sheet, columnas, filas) {
  const ultima = sheet.getLastRow();
  if (ultima > 1) sheet.getRange(2, 1, ultima - 1, columnas).clearContent();
  if (filas.length) sheet.getRange(2, 1, filas.length, columnas).setValues(filas);
}

function cfgHoja_(ss, nombre) {
  const sheet = ss.getSheetByName(nombre);
  if (sheet) return sheet;
  const def = SHEETS.filter(function (s) { return s.name === nombre; })[0];
  const nueva = ss.insertSheet(nombre);
  if (def) nueva.getRange(1, 1, 1, def.headers.length).setValues([def.headers]);
  return nueva;
}

/** Todo lo que la pestaña Configurar muestra, en una sola llamada. */
function duenoLeerConfig_(ss, tenant, ahoraMs) {
  const todo = getConfig_(ss);
  const config = {};
  Object.keys(CLAVES_DUENO).forEach(function (s) {
    CLAVES_DUENO[s].forEach(function (k) { config[k] = todo[k] == null ? '' : todo[k]; });
  });
  const hoy = Utilities.formatDate(new Date(ahoraMs), ZONA, 'yyyy-MM-dd');
  const bloqueos = [];
  const bs = ss.getSheetByName('Bloqueos');
  if (bs && bs.getLastRow() >= 2) {
    const n = bs.getLastRow() - 1;
    const fechas = bs.getRange(2, 1, n, 1).getValues();
    const resto = bs.getRange(2, 2, n, 3).getDisplayValues();
    for (let i = 0; i < n; i++) {
      const fecha = ymd_(fechas[i][0]);
      if (!fecha || fecha < hoy) continue;
      bloqueos.push({ fecha: fecha, inicio: cfgHora_(resto[i][0]), fin: cfgHora_(resto[i][1]), motivo: String(resto[i][2] || '').trim() });
    }
    bloqueos.sort(function (a, b) { return (a.fecha + a.inicio).localeCompare(b.fecha + b.inicio); });
  }
  return {
    config: config,
    paginaUrl: /^https?:\/\//.test(String(todo.pagina_url || '')) ? String(todo.pagina_url) : '',
    // Sin ID en la hoja, cada servicio lleva el mismo que le da la página (assignIds_: sale del
    // nombre). Así el equipo puede elegir servicio por servicio y la reserva los reconoce.
    servicios: idsComoLaPagina_(cfgFilas_(ss, 'Servicios', 5).map(function (r) {
      const tipo = String(r[4] || '').trim();
      const adicional = /adic|extra/i.test(tipo);
      return {
        id: String(r[0] || '').trim(), nombre: String(r[1] || '').trim(), precio: toNumber_(r[2]),
        duracion: toNumber_(r[3]) || 60, adicional: adicional,
        categoria: adicional || /^base$/i.test(tipo) ? '' : tipo,
      };
    }).filter(function (s) { return s.nombre; })),
    horarios: cfgFilas_(ss, 'Horarios', 3).map(function (r) {
      return { dia: String(r[0]).trim(), inicio: cfgHora_(r[1]), fin: cfgHora_(r[2]) };
    }),
    sedes: cfgFilas_(ss, 'Sedes', 4).map(function (r) {
      return { nombre: String(r[0]).trim(), direccion: String(r[1]).trim(), mapsUrl: String(r[2]).trim(), activa: cfgActiva_(r[3]) };
    }).filter(function (s) { return s.nombre || s.direccion; }),
    mensajes: cfgFilas_(ss, 'Mensajes', 2).map(function (r) {
      return { nombre: String(r[0]).trim(), texto: String(r[1]) };
    }).filter(function (m) { return m.nombre; }),
    bloqueos: bloqueos,
    // Usos vacío = ilimitado (como lo lee buscarCupon_ al reservar).
    cupones: cfgFilas_(ss, 'Cupones', 4).map(function (r) {
      return {
        codigo: String(r[0] || '').trim().toUpperCase(),
        porcentaje: String(r[1]).trim() === '' ? 0 : toNumber_(r[1]),
        monto: String(r[2]).trim() === '' ? 0 : toNumber_(r[2]),
        usos: String(r[3]).trim() === '' ? null : Math.max(0, Math.floor(toNumber_(r[3]))),
      };
    }).filter(function (c) { return c.codigo; }),
    logo: leerLogoHoja_(ss),
    // bookeaa team (solo lo ve el administrador): el ID del calendario sirve para su enlace de Google Calendar.
    equipo: {
      plan: planDe_((filasTenants_().filter(function (o) { return normKey_(o.Slug) === normKey_(tenant.slug); })[0] || {}).Plan),
      activo: String(todo.equipo_activo || '').toLowerCase() === 'si',
      modo: String(todo.equipo_modo || 'servicio').toLowerCase(),
      cualquiera: String(todo.equipo_cualquiera || 'si').toLowerCase() !== 'no',
      personas: equipoLeer_(ss).map(function (p) {
        const cal = estadoCalendarioEquipo_(p);
        return {
          id: p.id, nombre: p.nombre, email: p.email, foto: p.foto, cargo: p.cargo, servicios: p.servicios, horarios: p.horario, activo: p.activo,
          calendario: !!p.calendarioId, calendarioId: p.calendarioId, calendarioEstado: cal.estado, calendarioError: cal.error,
        };
      }),
    },
  };
}

/** Los mismos errores que la ventana de la hoja, más servicios y días libres. */
function duenoValidar_(seccion, datos) {
  const c = datos.config || {};
  const errores = [];
  const hex = /^#?(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;
  const hora = /^\d{1,2}:\d{2}$/;
  const numero = function (k, min, max, nombre) {
    if (!(k in c) || String(c[k]).trim() === '') return;
    const n = Number(String(c[k]).replace(',', '.'));
    if (!isFinite(n) || n < min || n > max) errores.push((nombre || k) + ': escribe un número entre ' + min + ' y ' + max + '.');
  };
  if (seccion === 'estilo') {
    ['color_principal', 'color_fondo'].forEach(function (k) {
      if (c[k] && !hex.test(String(c[k]).trim())) errores.push('Escribe el color en hex, como #1F6F5C.');
    });
  }
  if (seccion === 'marca') {
    if (!String(c.marca || c.nombre_negocio || '').trim()) errores.push('Escribe el nombre de tu negocio.');
    if (c.logo_url && !/^https?:\/\//i.test(String(c.logo_url).trim())) errores.push('El logo tiene que ser un enlace que empiece por https://');
  }
  if (seccion === 'lugar') {
    numero('recargo_domicilio_pct', 0, 300, 'Recargo a domicilio');
    numero('minutos_extra_domicilio', 0, 240, 'Minutos de traslado');
    const sedes = (datos.sedes || []).filter(function (s) { return String(s.nombre || '').trim(); });
    if (!sedes.some(function (s) { return s.activa !== false; })) errores.push('Deja al menos una sede activa.');
    const nombres = sedes.map(function (s) { return normKey_(s.nombre); });
    if (nombres.some(function (n, i) { return nombres.indexOf(n) !== i; })) errores.push('Dos sedes tienen el mismo nombre.');
    sedes.forEach(function (s) {
      if (s.mapsUrl && !/^https?:\/\//i.test(String(s.mapsUrl).trim())) errores.push('El enlace de Maps de "' + s.nombre + '" tiene que empezar por https://');
    });
    if (normKey_(c.lugar_tipo || '') === 'otro' && !String(c.lugar_nombre || '').trim()) errores.push('Con "Otro", escribe cómo se llama tu lugar.');
  }
  if (seccion === 'mensaje') {
    const mensajes = (datos.mensajes || []).filter(function (m) { return String(m.nombre || '').trim(); });
    if (!mensajes.length) errores.push('Deja al menos una plantilla de mensaje.');
    if (!mensajes.some(function (m) { return normKey_(m.nombre) === normKey_(c.mensaje_plantilla || ''); })) errores.push('Elige cuál plantilla se usa.');
  }
  if (seccion === 'horario') {
    numero('intervalo_min', 5, 240, 'Cada cuántos minutos');
    numero('dias_anticipacion', 1, 365, 'Días a mostrar');
    numero('anticipacion_min_horas', 0, 168, 'Horas mínimas de aviso');
    if (!cfgAlertas_(c.recordatorio_minutos)) errores.push('Alerta: elige hasta 5 tiempos, de 0 minutos a 4 semanas antes de la cita.');
    (datos.horarios || []).forEach(function (h) {
      if (!h.inicio && !h.fin) return;
      if (!hora.test(h.inicio || '') || !hora.test(h.fin || '') || toMinutes_(h.fin) <= toMinutes_(h.inicio)) {
        errores.push(h.dia + ': la hora de cierre va después de la de apertura.');
      }
    });
  }
  if (seccion === 'equipo') equipoValidar_(datos).forEach(function (e) { errores.push(e); });
  if (seccion === 'comprobantes') {
    const modo = String(c.facturacion_modo || 'interno').trim().toLowerCase();
    if (modo !== 'interno' && modo !== 'fiscal') errores.push('Elige un modo: control interno o facturación fiscal.');
    const ticket = String(c.ticket_reserva || 'si').trim().toLowerCase();
    if (ticket !== 'si' && ticket !== 'no') errores.push('Ticket de reserva: elige si se emite o no.');
    if (modo === 'fiscal') {
      if (!/^[VJEGP]-?\d{6,9}-?\d$/i.test(String(c.facturacion_rif || '').trim())) errores.push('Escribe tu RIF completo, por ejemplo J-12345678-9.');
      if (!String(c.facturacion_razon_social || '').trim()) errores.push('Escribe tu nombre o razón social como sale en el RIF.');
    }
  }
  if (seccion === 'pagos') {
    if (c.whatsapp && String(c.whatsapp).replace(/\D/g, '').length < 10) errores.push('El WhatsApp necesita el código de país, por ejemplo 584121234567.');
    if ('metodos_pago' in c && !String(c.metodos_pago || '').trim()) errores.push('Deja al menos un método de pago.');
  }
  if (seccion === 'servicios') {
    const lista = datos.servicios || [];
    if (lista.length > MAX_SERVICIOS) errores.push('Máximo ' + MAX_SERVICIOS + ' servicios.');
    if (!lista.some(function (s) { return String(s.nombre || '').trim() && !s.adicional; })) errores.push('Deja al menos un servicio principal (que no sea adicional).');
    const vistos = [];
    lista.forEach(function (s) {
      const nombre = String(s.nombre || '').trim();
      if (!nombre) return errores.push('Hay un servicio sin nombre.');
      if (vistos.indexOf(normKey_(nombre)) !== -1) errores.push('"' + nombre + '" está repetido.');
      vistos.push(normKey_(nombre));
      if (!(Number(s.precio) >= 0) || !isFinite(Number(s.precio))) errores.push(nombre + ': revisa el precio.');
      if (!(Number(s.duracion) >= 5 && Number(s.duracion) <= 720)) errores.push(nombre + ': la duración va de 5 a 720 minutos.');
    });
  }
  if (seccion === 'bloqueos') {
    (datos.bloqueos || []).forEach(function (b) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(String(b.fecha || ''))) return errores.push('Hay un día libre sin fecha.');
      const parcial = b.inicio || b.fin;
      if (parcial && (!hora.test(b.inicio || '') || !hora.test(b.fin || '') || toMinutes_(b.fin) <= toMinutes_(b.inicio))) {
        errores.push(b.fecha + ': la hora de fin va después de la de inicio (o deja las dos vacías para todo el día).');
      }
    });
  }
  if (seccion === 'cupones') {
    const lista = datos.cupones || [];
    if (lista.length > MAX_CUPONES) errores.push('Máximo ' + MAX_CUPONES + ' cupones.');
    const codigos = [];
    lista.forEach(function (c) {
      const codigo = String(c.codigo || '').trim().toUpperCase();
      if (!/^[A-Z0-9][A-Z0-9_-]{2,19}$/.test(codigo)) return errores.push((codigo || 'Un cupón') + ': el código lleva de 3 a 20 letras o números, sin espacios.');
      if (codigos.indexOf(codigo) !== -1) errores.push(codigo + ' está repetido.');
      codigos.push(codigo);
      const pct = Number(c.porcentaje) || 0, monto = Number(c.monto) || 0;
      if (pct && monto) errores.push(codigo + ': elige porcentaje o monto, no los dos.');
      else if (!pct && !monto) errores.push(codigo + ': escribe cuánto descuenta.');
      if (pct && !(pct > 0 && pct <= 100)) errores.push(codigo + ': el porcentaje va de 1 a 100.');
      if (monto && !(monto > 0)) errores.push(codigo + ': revisa el monto.');
      if (c.usos !== null && c.usos !== undefined && c.usos !== '' && !(Number(c.usos) >= 0 && Number(c.usos) <= 100000)) errores.push(codigo + ': revisa los usos.');
    });
  }
  if (seccion === 'logo' && datos.logo && !logoValido_(datos.logo)) errores.push('La imagen no se pudo guardar. Prueba con un PNG o JPG más liviano.');
  return errores;
}

/** Guarda una sección en la hoja del negocio. Devuelve { ok, errores } y la configuración nueva. */
function duenoGuardar_(ss, tenant, seccion, datos, ahoraMs) {
  const permitidas = CLAVES_DUENO[seccion];
  if (!permitidas && TABLAS_DUENO.indexOf(seccion) === -1) return { ok: false, errores: ['Sección desconocida.'] };
  datos = datos || {};
  const errores = duenoValidar_(seccion, datos);
  if (errores.length) return { ok: false, errores: errores };

  const lock = LockService.getScriptLock();
  if (!lock.tryLock(20000)) return { ok: false, errores: ['La hoja está ocupada. Intenta de nuevo.'] };
  try {
    const valores = datos.config || {};
    if (permitidas) {
      const hojaConfig = ss.getSheetByName('Configuracion');
      permitidas.forEach(function (k) {
        if (k in valores) setConfigKey_(hojaConfig, k, paraCelda_(String(valores[k] == null ? '' : valores[k]).trim()));
      });
    }
    if (seccion === 'lugar' && Array.isArray(datos.sedes)) {
      const filas = datos.sedes.filter(function (s) { return String(s.nombre || '').trim(); }).map(function (s) {
        return [paraCelda_(limpiarTexto_(s.nombre, 80)), paraCelda_(limpiarTexto_(s.direccion, 200)), paraCelda_(String(s.mapsUrl || '').trim().slice(0, 500)), s.activa !== false];
      });
      const hojaSedes = cfgHoja_(ss, 'Sedes');
      cfgReemplazar_(hojaSedes, 4, filas);
      if (filas.length) hojaSedes.getRange(2, 4, filas.length, 1).insertCheckboxes();
    }
    if (seccion === 'mensaje' && Array.isArray(datos.mensajes)) {
      cfgReemplazar_(cfgHoja_(ss, 'Mensajes'), 2, datos.mensajes.filter(function (m) { return String(m.nombre || '').trim(); })
        .map(function (m) { return [paraCelda_(limpiarTexto_(m.nombre, 60)), paraCelda_(String(m.texto || '').slice(0, 2000))]; }));
    }
    if (seccion === 'horario' && Array.isArray(datos.horarios)) {
      const filas = [];
      [1, 2, 3, 4, 5, 6, 0].map(function (d) { return DIAS_SEMANA[d]; }).forEach(function (dia) {
        const tramos = datos.horarios.filter(function (h) { return normKey_(h.dia) === normKey_(dia) && h.inicio && h.fin; });
        if (!tramos.length) filas.push([dia, '', '']);
        tramos.forEach(function (t) { filas.push([dia, cfgHora_(t.inicio), cfgHora_(t.fin)]); });
      });
      const hojaHorarios = cfgHoja_(ss, 'Horarios');
      hojaHorarios.getRange('A:C').setNumberFormat('@');
      cfgReemplazar_(hojaHorarios, 3, filas);
    }
    if (seccion === 'equipo') {
      // Sus claves de config (equipo_*) van aparte de CLAVES_DUENO: la ventana de la hoja no las maneja.
      const hojaCfg = ss.getSheetByName('Configuracion');
      ['equipo_activo', 'equipo_modo', 'equipo_cualquiera'].forEach(function (k) {
        if (k in valores) setConfigKey_(hojaCfg, k, String(valores[k]).trim().toLowerCase());
      });
      if (Array.isArray(datos.equipo)) equipoGuardar_(ss, tenant, datos.equipo);
    }
    if (seccion === 'servicios') {
      cfgReemplazar_(cfgHoja_(ss, 'Servicios'), 5, (datos.servicios || []).map(function (s) {
        const tipo = s.adicional ? 'Adicional' : paraCelda_(limpiarTexto_(s.categoria || '', 40));
        return [paraCelda_(limpiarTexto_(s.id || '', 60)), paraCelda_(limpiarTexto_(s.nombre, 80)), round2_(Number(s.precio) || 0), Math.round(Number(s.duracion)), tipo];
      }));
    }
    if (seccion === 'bloqueos') {
      // Se reemplazan solo los de hoy en adelante: los días pasados quedan como historia.
      const hojaBloqueos = cfgHoja_(ss, 'Bloqueos');
      const hoy = Utilities.formatDate(new Date(ahoraMs), ZONA, 'yyyy-MM-dd');
      const pasados = [];
      if (hojaBloqueos.getLastRow() >= 2) {
        const n = hojaBloqueos.getLastRow() - 1;
        const fechas = hojaBloqueos.getRange(2, 1, n, 1).getValues();
        const resto = hojaBloqueos.getRange(2, 2, n, 3).getDisplayValues();
        for (let i = 0; i < n; i++) {
          const f = ymd_(fechas[i][0]);
          if (f && f < hoy) pasados.push([f, resto[i][0], resto[i][1], resto[i][2]]);
        }
      }
      const nuevos = (datos.bloqueos || []).filter(function (b) { return String(b.fecha) >= hoy; }).map(function (b) {
        return [String(b.fecha), b.inicio ? cfgHora_(b.inicio) : '', b.fin ? cfgHora_(b.fin) : '', paraCelda_(limpiarTexto_(b.motivo || '', 80))];
      });
      hojaBloqueos.getRange('A:C').setNumberFormat('@');
      cfgReemplazar_(hojaBloqueos, 4, pasados.concat(nuevos));
    }
    if (seccion === 'cupones') {
      cfgReemplazar_(cfgHoja_(ss, 'Cupones'), 4, (datos.cupones || []).map(function (c) {
        const usos = c.usos === null || c.usos === undefined || c.usos === '' ? '' : Math.floor(Number(c.usos));
        return [String(c.codigo).trim().toUpperCase(), Number(c.porcentaje) || '', Number(c.monto) ? round2_(Number(c.monto)) : '', usos];
      }));
    }
    if (seccion === 'logo') {
      let hojaLogo = ss.getSheetByName('Logo');
      if (!hojaLogo) {
        hojaLogo = ss.insertSheet('Logo');
        hojaLogo.getRange('A1').setValue('Logo (lo maneja la configuración; no lo edites)');
        hojaLogo.hideSheet();
      }
      if (datos.logo) hojaLogo.getRange('A2').setValue(String(datos.logo).trim());
      else hojaLogo.getRange('A2').clearContent();
    }
    SpreadsheetApp.flush();
  } finally {
    lock.releaseLock();
  }
  limpiarCacheCatalogo_(tenant.slug); // la página muestra el cambio en la próxima carga
  return { ok: true, errores: [], datos: duenoLeerConfig_(ss, tenant, ahoraMs) };
}

// ============================================================================
// Central de bookeaa (bookeaa.com/central): administración de los negocios
// ============================================================================
// Solo para los correos de la propiedad dueno_admins. Entran con Google igual que en
// "Mi negocio" (op 'entrar' de la rama dueno) y usan la misma sesión.
// El cobro mensual vive en la pestaña Tenants (Vence, Ultimo_Pago) y cada pago queda
// en la pestaña Pagos del archivo maestro.

const PRECIO_MENSUAL = 10;
// bookeaa team: $25 al mes hasta 5 personas y $5 por cada persona más.
const PRECIO_TEAM = 25;
const TEAM_INCLUIDAS = 5;
const PRECIO_PERSONA_EXTRA = 5;

/** 'team' o 'individual' (la columna Plan de Tenants; vacía = individual). */
function planDe_(valor) {
  return /^team$/i.test(String(valor || '').trim()) ? 'team' : 'individual';
}

/** Lo que paga un negocio al mes según su plan y las personas activas de su equipo. */
function precioPlan_(plan, personas) {
  if (plan !== 'team') return PRECIO_MENSUAL;
  return PRECIO_TEAM + Math.max(0, (personas || 0) - TEAM_INCLUIDAS) * PRECIO_PERSONA_EXTRA;
}
const DIAS_PRUEBA = 30;
const DIAS_AVISO_VENCE = 5;
const PAGOS_HEADERS = ['Fecha', 'Slug', 'Negocio', 'Monto', 'Meses', 'Metodo', 'Referencia', 'Vence_Antes', 'Vence_Nuevo', 'Registrado_Por'];

/** Estado de cobro de un negocio: suspendido, pendiente (venció), prueba, activo o sin_fecha. */
/**
 * Estado de cobro: suspendido, sin_fecha, prueba o activo (al día), pendiente (pasó el
 * corte y está en los DIAS_GRACIA para pagar) o vencido (pasó la gracia; revisarCortes
 * lo suspende).
 */
function estadoCobro_(t, hoy) {
  if (!tenantActivo_(t)) return 'suspendido';
  const vence = ymd_(t.vence);
  if (!vence) return 'sin_fecha';
  if (vence < hoy) return diasEntre_(vence, hoy) <= DIAS_GRACIA ? 'pendiente' : 'vencido';
  return ymd_(t.ultimoPago) ? 'activo' : 'prueba';
}

/**
 * Nuevo vencimiento al pagar `meses`. El corte es siempre el mismo día del mes (el de
 * ingreso): se suma desde el vencimiento anterior, no desde el día en que pagó. Si
 * venció hace meses, se salta hasta el primer corte que quede en el futuro.
 */
function extenderVence_(antes, meses, hoy) {
  if (!antes) return sumarMeses_(hoy, meses);
  let n = meses;
  while (sumarMeses_(antes, n) < hoy && n < 240) n++;
  return sumarMeses_(antes, n);
}

/** Próxima fecha de corte (mismo día del mes que el ingreso) que sea hoy o después. */
function proximoCorte_(creado, hoy) {
  if (!creado) return '';
  let n = 1;
  while (sumarMeses_(creado, n) < hoy && n < 600) n++;
  return sumarMeses_(creado, n);
}

function diasEntre_(a, b) {
  const pa = a.split('-').map(Number), pb = b.split('-').map(Number);
  return Math.round((Date.UTC(pb[0], pb[1] - 1, pb[2]) - Date.UTC(pa[0], pa[1] - 1, pa[2])) / 86400000);
}

/** Suma meses a una fecha yyyy-MM-dd (el 31 de enero + 1 mes = 28/29 de febrero). */
function sumarMeses_(ymd, meses) {
  const p = ymd.split('-').map(Number);
  const destino = new Date(Date.UTC(p[0], p[1] - 1 + meses, 1));
  const ultimo = new Date(Date.UTC(destino.getUTCFullYear(), destino.getUTCMonth() + 1, 0)).getUTCDate();
  destino.setUTCDate(Math.min(p[2], ultimo));
  return destino.toISOString().slice(0, 10);
}

/** La pestaña Tenants con los encabezados de la central (los agrega si faltan). */
function hojaTenants_() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Tenants');
  if (!sheet) throw new Error('Falta la pestaña Tenants (ejecuta setupMaster).');
  const actuales = sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), 1)).getValues()[0].map(String);
  TENANT_HEADERS.forEach(function (h) {
    if (actuales.indexOf(h) === -1) {
      actuales.push(h);
      sheet.getRange(1, actuales.length).setValue(h);
    }
  });
  return { sheet: sheet, headers: actuales };
}

/** Todas las filas de Tenants como objetos con su número de fila. */
function filasTenants_() {
  const t = hojaTenants_();
  const n = t.sheet.getLastRow() - 1;
  if (n < 1) return [];
  const valores = t.sheet.getRange(2, 1, n, t.headers.length).getValues();
  return valores.map(function (r, i) {
    const o = { fila: i + 2 };
    t.headers.forEach(function (h, j) { o[h] = r[j]; });
    return o;
  }).filter(function (o) { return String(o.Slug || '').trim(); });
}

/** Escribe columnas (por encabezado) de la fila de un negocio. */
function escribirTenant_(slug, campos) {
  const t = hojaTenants_();
  const fila = filasTenants_().filter(function (o) { return normKey_(o.Slug) === normKey_(slug); })[0];
  if (!fila) throw new Error('No existe el negocio ' + slug + '.');
  Object.keys(campos).forEach(function (h) {
    const c = t.headers.indexOf(h);
    if (c !== -1) t.sheet.getRange(fila.fila, c + 1).setValue(campos[h]);
  });
  limpiarCacheTenants_();
}

function negocioCentral_(o, hoy) {
  const t = {
    slug: String(o.Slug).trim(), nombre: String(o.Nombre || '').trim(), activo: String(o.Activo || 'si'),
    vence: o.Vence, ultimoPago: o.Ultimo_Pago,
  };
  const vence = ymd_(o.Vence) || '';
  return {
    slug: t.slug,
    nombre: t.nombre,
    email: String(o.Email || '').trim(),
    telefono: String(o.Telefono || '').replace(/[^\d+]/g, ''),
    creado: ymd_(o.Creado) || '',
    vence: vence,
    ultimoPago: ymd_(o.Ultimo_Pago) || '',
    notas: String(o.Notas || ''),
    activo: tenantActivo_(t),
    estado: estadoCobro_(t, hoy),
    dias: vence ? diasEntre_(hoy, vence) : null,
    plan: planDe_(o.Plan),
    personas: personasActivas_(String(o.Slug).trim()),
    precio: precioPlan_(planDe_(o.Plan), personasActivas_(String(o.Slug).trim())),
    hoja: o.Spreadsheet_Id ? 'https://docs.google.com/spreadsheets/d/' + o.Spreadsheet_Id + '/edit' : '',
  };
}

function hojaPagos_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName('Pagos');
  if (!sheet) {
    sheet = ss.insertSheet('Pagos');
    sheet.appendRow(PAGOS_HEADERS);
    sheet.getRange(1, 1, 1, PAGOS_HEADERS.length).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function pagosRecientes_(limite) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Pagos');
  if (!sheet || sheet.getLastRow() < 2) return [];
  const n = sheet.getLastRow() - 1;
  const desde = Math.max(2, sheet.getLastRow() - limite + 1);
  return sheet.getRange(desde, 1, sheet.getLastRow() - desde + 1, PAGOS_HEADERS.length).getValues().map(function (r) {
    return {
      fecha: r[0] instanceof Date ? Utilities.formatDate(r[0], ZONA, "yyyy-MM-dd'T'HH:mm") : String(r[0]),
      slug: String(r[1]), negocio: String(r[2]), monto: toNumber_(r[3]), meses: toNumber_(r[4]),
      metodo: String(r[5]), referencia: String(r[6]), venceNuevo: ymd_(r[8]) || '',
    };
  }).reverse();
}

/** Lo que el bot agendó para afiliar (pestaña Prospectos), sin los ya convertidos en negocio. */
function prospectosCentral_(negocios) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Prospectos');
  if (!sheet || sheet.getLastRow() < 2) return [];
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(String);
  const col = function (h) { return headers.indexOf(h); };
  const correos = negocios.map(function (n) { return n.email.toLowerCase(); });
  return sheet.getRange(2, 1, sheet.getLastRow() - 1, headers.length).getValues().map(function (r) {
    const cita = r[col('Cita')];
    return {
      fecha: ymd_(r[col('Fecha')]) || '',
      telefono: String(r[col('Teléfono')] || '').replace(/[^\d+]/g, ''),
      nombre: String(r[col('Nombre en WhatsApp')] || ''),
      negocio: String(r[col('Negocio')] || ''),
      correo: String(r[col('Correo')] || '').trim(),
      modalidad: String(r[col('Modalidad')] || ''),
      cita: cita instanceof Date ? Utilities.formatDate(cita, ZONA, "yyyy-MM-dd'T'HH:mm") : String(cita || ''),
      estado: String(r[col('Estado')] || ''),
    };
  }).filter(function (p) {
    return p.negocio && !/cancel/i.test(p.estado) && (!p.correo || correos.indexOf(p.correo.toLowerCase()) === -1);
  }).reverse().slice(0, 100);
}

function resumenCentral_(ahoraMs) {
  const hoy = Utilities.formatDate(new Date(ahoraMs), ZONA, 'yyyy-MM-dd');
  const negocios = filasTenants_().map(function (o) { return negocioCentral_(o, hoy); });
  const cuenta = function (e) { return negocios.filter(function (n) { return n.estado === e; }).length; };
  return {
    hoy: hoy,
    precio: PRECIO_MENSUAL,
    totales: {
      activos: cuenta('activo'), prueba: cuenta('prueba'), pendientes: cuenta('pendiente'),
      suspendidos: cuenta('suspendido'), sinFecha: cuenta('sin_fecha'),
      porVencer: negocios.filter(function (n) { return (n.estado === 'activo' || n.estado === 'prueba') && n.dias !== null && n.dias <= DIAS_AVISO_VENCE; }).length,
      team: negocios.filter(function (n) { return n.plan === 'team'; }).length,
      // Lo que entra al mes: cada negocio con su precio (individual o team).
      mrr: negocios.filter(function (n) { return n.estado === 'activo' || n.estado === 'pendiente'; }).reduce(function (a, n) { return a + n.precio; }, 0),
      mrrPrueba: negocios.filter(function (n) { return n.estado === 'prueba'; }).reduce(function (a, n) { return a + n.precio; }, 0),
    },
    negocios: negocios,
    pagos: pagosRecientes_(60),
    prospectos: prospectosCentral_(negocios),
  };
}

/** Registra un pago: extiende Vence desde la fecha de vencimiento (o desde hoy si ya venció). */
function registrarPagoCentral_(data, email, ahoraMs) {
  const hoy = Utilities.formatDate(new Date(ahoraMs), ZONA, 'yyyy-MM-dd');
  const meses = Math.max(1, Math.min(12, Math.floor(Number(data.meses) || 1)));
  const monto = round2_(Number(String(data.monto == null ? '' : data.monto).replace(',', '.')));
  if (!(monto >= 0)) return { error: 'datos_invalidos', mensaje: 'Revisa el monto.' };
  const fila = filasTenants_().filter(function (o) { return normKey_(o.Slug) === normKey_(data.slug || ''); })[0];
  if (!fila) return { error: 'no_existe', mensaje: 'Ese negocio no existe.' };
  const antes = ymd_(fila.Vence) || '';
  const nuevo = extenderVence_(antes, meses, hoy);
  hojaPagos_().appendRow([new Date(ahoraMs), String(fila.Slug), String(fila.Nombre), monto, meses,
    limpiarTexto_(data.metodo || 'Pago Móvil', 40), paraCelda_(limpiarTexto_(data.referencia || '', 60)), antes, nuevo, email]);
  // Pagar reactiva un negocio suspendido.
  escribirTenant_(fila.Slug, { Vence: nuevo, Ultimo_Pago: hoy, Activo: 'si', Suspendido_Auto: '' });
  return { ok: true, vence: nuevo };
}

function crearNegocioCentral_(data, ahoraMs) {
  const nombre = limpiarTexto_(data.nombre, 80);
  const slug = String(data.slug || '').trim().toLowerCase();
  const email = String(data.email || '').trim().toLowerCase();
  if (!nombre) return { error: 'datos_invalidos', mensaje: 'Escribe el nombre del negocio.' };
  if (email && !/^[^\s@,]+@[^\s@,]+\.[a-z]{2,}$/i.test(email)) return { error: 'datos_invalidos', mensaje: 'Revisa el correo (Gmail del dueño).' };
  const dias = Math.max(0, Math.min(365, Math.floor(Number(data.diasPrueba == null ? DIAS_PRUEBA : data.diasPrueba))));
  let creado;
  try {
    creado = crearTenant(slug, nombre, email);
  } catch (err) {
    return { error: 'datos_invalidos', mensaje: String(err.message || err) };
  }
  const hoy = Utilities.formatDate(new Date(ahoraMs), ZONA, 'yyyy-MM-dd');
  escribirTenant_(creado.slug, {
    Telefono: paraCelda_(String(data.telefono || '').replace(/[^\d]/g, '').slice(0, 20)),
    Vence: sumarDias_(hoy, dias), // primer mes gratis (o los días de prueba que se elijan)
    Notas: paraCelda_(limpiarTexto_(data.notas || '', 300)),
    Plan: planDe_(data.plan),
  });
  return { ok: true, slug: creado.slug, hoja: creado.url };
}

/** Punto de entrada desde doPost (accion: 'central'). */
function atenderCentral_(data, ahoraMs) {
  const email = leerSesion_(data.sesion, ahoraMs);
  if (!email) return { error: 'sesion', mensaje: 'Tu sesión venció. Entra otra vez.' };
  if (!esAdminDueno_(email)) return { error: 'no_autorizado', mensaje: email + ' no es administrador de bookeaa (propiedad dueno_admins).' };
  const op = String(data.op || '');
  // Para el conector de Claude: quién es el administrador y dónde está el Worker que lo atiende.
  if (op === 'yo') return { email: email, conector: urlWorker_() };
  if (op === 'resumen') return resumenCentral_(ahoraMs);
  if (op === 'cobros') return cobrosCentral_(ahoraMs);
  if (op === 'metricas') return metricasCentral_(ahoraMs, !!data.fresco);
  if (op === 'negocio') return negocioDetalleCentral_(String(data.slug || ''), ahoraMs);
  if (op === 'marketing') return marketingCentral_();
  if (op === 'tiktok_estado') return tiktokEstado_();
  if (op === 'tiktok_url') return tiktokUrl_(email);

  const lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) return { error: 'servidor', mensaje: 'Hay otra operación en curso. Intenta de nuevo.' };
  try {
    if (op === 'pago') return registrarPagoCentral_(data, email, ahoraMs);
    if (op === 'crear') return crearNegocioCentral_(data, ahoraMs);
    if (op === 'marketing_guardar') return marketingGuardar_(data, email, ahoraMs);
    if (op === 'marketing_importar') return marketingImportar_(data);
    if (op === 'tiktok_conectar') return tiktokConectar_(data, email, ahoraMs);
    if (op === 'tiktok_desconectar') return tiktokDesconectar_();
    if (op === 'tiktok_enviar') return tiktokEnviar_(data, ahoraMs);
    if (op === 'aprobar' || op === 'rechazar') {
      const hojaPN = hojaCon_('PagosNegocio', PAGOS_NEGOCIO_HEADERS);
      const pago = objetos_(hojaPN, PAGOS_NEGOCIO_HEADERS).filter(function (o) { return String(o.ID) === String(data.id || ''); })[0];
      if (!pago || String(pago.Estado) !== 'Por verificar') return { error: 'no_existe', mensaje: 'Ese pago ya no está por verificar.' };
      if (op === 'aprobar') return { ok: true, vence: aprobarPago_(pago.fila, 'Aprobado a mano', email, ahoraMs) };
      const motivo = limpiarTexto_(data.motivo || 'No encontramos el pago en el banco', 160);
      escribirFila_(hojaPN, PAGOS_NEGOCIO_HEADERS, pago.fila, { Estado: 'Rechazado', Motivo: paraCelda_(motivo), Revisado_Por: email, Fecha_Revision: new Date(ahoraMs) });
      avisarNegocio_(String(pago.Slug), '❌ Pago no confirmado', motivo + '. Revisa los datos y repórtalo otra vez en Mi plan y pagos.');
      return { ok: true };
    }
    if (op === 'movimientos') {
      const nuevos = guardarMovimientos_(data.filas, 'estado de cuenta', ahoraMs);
      const r = conciliar_(ahoraMs);
      return { ok: true, nuevos: nuevos, aprobados: r.aprobados.length };
    }
    if (op === 'leer_correos') return leerCorreosBanco();
    if (op === 'instalar_cobros') return instalarCobros();
    if (op === 'ajustes_cobro') return guardarAjustesCobro_(data);
    if (op === 'usar_ingreso') {
      const t = filasTenants_().filter(function (o) { return normKey_(o.Slug) === normKey_(data.slug || ''); })[0];
      const creado = t ? ymd_(t.Creado) : '';
      if (!creado) return { error: 'datos_invalidos', mensaje: 'Ese negocio no tiene fecha de ingreso.' };
      const corte = proximoCorte_(creado, Utilities.formatDate(new Date(ahoraMs), ZONA, 'yyyy-MM-dd'));
      escribirTenant_(String(t.Slug), { Vence: corte });
      return { ok: true, vence: corte };
    }
    if (op === 'activo') {
      escribirTenant_(String(data.slug || ''), { Activo: data.activo ? 'si' : 'no', Suspendido_Auto: '' });
      return { ok: true };
    }
    if (op === 'editar') {
      const campos = {};
      if ('email' in data) campos.Email = String(data.email || '').trim().toLowerCase();
      if ('telefono' in data) campos.Telefono = paraCelda_(String(data.telefono || '').replace(/[^\d]/g, '').slice(0, 20));
      if ('notas' in data) campos.Notas = paraCelda_(limpiarTexto_(data.notas || '', 300));
      if ('plan' in data) campos.Plan = planDe_(data.plan);
      if ('vence' in data) {
        if (data.vence && !/^\d{4}-\d{2}-\d{2}$/.test(String(data.vence))) return { error: 'datos_invalidos', mensaje: 'Revisa la fecha de vencimiento.' };
        campos.Vence = String(data.vence || '');
      }
      escribirTenant_(String(data.slug || ''), campos);
      return { ok: true };
    }
    return { error: 'op_desconocida' };
  } catch (err) {
    return { error: 'servidor', mensaje: String(err.message || err) };
  } finally {
    lock.releaseLock();
  }
}

// ============================================================================
// Marketing en Central: calendario y cola de publicaciones
// ============================================================================
// Pestaña Marketing del archivo maestro. Cada fila es una publicación (video, carrusel o
// pieza de campaña) con su fecha, su texto y su estado: borrador → aprobado → publicado
// (u omitido). Central la lee y la edita; Make puede leer la misma pestaña para publicar
// lo que esté "aprobado". Fecha y Hora se guardan como texto plano (yyyy-MM-dd y HH:mm).

const MARKETING_HEADERS = ['ID', 'Fecha', 'Hora', 'Tipo', 'Titulo', 'Plataforma', 'Caption', 'Hashtags', 'Media', 'Estado', 'Publicado_En', 'Notas'];
const MARKETING_ESTADOS = ['borrador', 'aprobado', 'publicado', 'omitido'];

function hojaMarketing_() {
  const nueva = !SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Marketing');
  const sheet = hojaCon_('Marketing', MARKETING_HEADERS);
  if (nueva) {
    sheet.getRange(1, 1, sheet.getMaxRows(), 3).setNumberFormat('@'); // ID, Fecha, Hora: texto plano
    sheet.getRange(1, 12, sheet.getMaxRows(), 1).setNumberFormat('@');
  }
  return sheet;
}

function publicacionDe_(o) {
  const hora = String(o.Hora || '');
  return {
    id: String(o.ID), fecha: ymd_(o.Fecha) || '', hora: /^\d{1,2}:\d{2}/.test(hora) ? hora.slice(0, 5) : '',
    tipo: String(o.Tipo || ''), titulo: String(o.Titulo || ''), plataforma: String(o.Plataforma || ''),
    caption: String(o.Caption || ''), hashtags: String(o.Hashtags || ''), media: String(o.Media || ''),
    estado: MARKETING_ESTADOS.indexOf(String(o.Estado)) !== -1 ? String(o.Estado) : 'borrador',
    publicadoEn: o.Publicado_En ? String(o.Publicado_En) : '', notas: String(o.Notas || ''),
  };
}

function marketingCentral_() {
  const filas = objetos_(hojaMarketing_(), MARKETING_HEADERS).filter(function (o) { return String(o.ID).trim(); });
  return { publicaciones: filas.map(publicacionDe_) };
}

/** Agrega las publicaciones que todavía no existen (por ID); las que ya están no se tocan. */
function marketingImportar_(data) {
  const sheet = hojaMarketing_();
  const existentes = {};
  objetos_(sheet, MARKETING_HEADERS).forEach(function (o) { existentes[String(o.ID)] = o; });
  const nuevas = [];
  let completadas = 0;
  (Array.isArray(data.filas) ? data.filas : []).slice(0, 300).forEach(function (f) {
    const id = limpiarTexto_(f.id, 60);
    if (!id || !ymd_(f.fecha || '')) return;
    const previa = existentes[id];
    if (previa && previa !== true) {
      // Ya estaba en la cola: solo se le pone el link si aún no tiene y no se ha publicado (lo demás no se pisa).
      const media = limpiarTexto_(f.media, 1500);
      if (media && !String(previa.Media || '').trim() && String(previa.Estado) !== 'publicado') {
        escribirFila_(sheet, MARKETING_HEADERS, previa.fila, { Media: paraCelda_(media) });
        completadas++;
      }
      existentes[id] = true;
      return;
    }
    if (previa) return;
    existentes[id] = true;
    nuevas.push([
      id, ymd_(f.fecha), limpiarTexto_(f.hora, 5), limpiarTexto_(f.tipo, 20), paraCelda_(limpiarTexto_(f.titulo, 120)),
      paraCelda_(limpiarTexto_(f.plataforma, 60)), paraCelda_(String(f.caption || '').slice(0, 2200)),
      paraCelda_(limpiarTexto_(f.hashtags, 400)), paraCelda_(limpiarTexto_(f.media, 1500)),
      MARKETING_ESTADOS.indexOf(f.estado) !== -1 ? f.estado : 'borrador', '', paraCelda_(limpiarTexto_(f.notas, 300)),
    ]);
  });
  if (nuevas.length) sheet.getRange(sheet.getLastRow() + 1, 1, nuevas.length, MARKETING_HEADERS.length).setValues(nuevas);
  return { ok: true, agregadas: nuevas.length, completadas: completadas };
}

function marketingGuardar_(data, email, ahoraMs) {
  const sheet = hojaMarketing_();
  const o = objetos_(sheet, MARKETING_HEADERS).filter(function (x) { return String(x.ID) === String(data.id || ''); })[0];
  if (!o) return { error: 'no_existe', mensaje: 'Esa publicación ya no está en la cola.' };
  const c = {};
  if ('estado' in data) {
    if (MARKETING_ESTADOS.indexOf(data.estado) === -1) return { error: 'datos_invalidos', mensaje: 'Estado no válido.' };
    c.Estado = data.estado;
    c.Publicado_En = data.estado === 'publicado' ? Utilities.formatDate(new Date(ahoraMs), ZONA, "yyyy-MM-dd HH:mm") + ' · ' + email : '';
    if (data.estado === 'aprobado') c.Notas = paraCelda_(limpiarTexto_(String(o.Notas || '').replace(/Enviado a Make \([^)]*\)( · )?/g, ''), 300)); // aprobar de nuevo permite reenviar
  }
  if ('fecha' in data) {
    if (!ymd_(data.fecha || '')) return { error: 'datos_invalidos', mensaje: 'Revisa la fecha.' };
    c.Fecha = ymd_(data.fecha);
  }
  if ('hora' in data) {
    if (!/^\d{1,2}:\d{2}$/.test(String(data.hora || ''))) return { error: 'datos_invalidos', mensaje: 'Revisa la hora (HH:mm).' };
    c.Hora = ('0' + String(data.hora)).slice(-5);
  }
  if ('titulo' in data) c.Titulo = paraCelda_(limpiarTexto_(data.titulo, 120));
  if ('caption' in data) c.Caption = paraCelda_(String(data.caption || '').slice(0, 2200));
  if ('hashtags' in data) c.Hashtags = paraCelda_(limpiarTexto_(data.hashtags, 400));
  if ('media' in data) c.Media = paraCelda_(limpiarTexto_(data.media, 1500));
  if ('notas' in data) c.Notas = paraCelda_(limpiarTexto_(data.notas, 300));
  escribirFila_(sheet, MARKETING_HEADERS, o.fila, c);
  return { ok: true };
}

// ---------- Make: publica lo aprobado ----------
// Make (escenario "bookeaa - publicar aprobados") llama a doPost con { accion: 'make', token, op }.
// Tiene SU PROPIO token (propiedad make_token, menú "Make: generar token de marketing"); no usa el
// token público de la web porque ese viaja en el navegador.
//   pendientes → las publicaciones aprobadas cuya fecha y hora (Caracas) ya llegaron y tienen link.
//   publicado  → Make avisa el resultado: ok → publicado; error → vuelve a borrador con el motivo.

function promptGenerarTokenMake() {
  const ui = SpreadsheetApp.getUi();
  const token = 'make_' + Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '').slice(0, 12);
  PropertiesService.getScriptProperties().setProperty('make_token', token);
  ui.alert('Token de Make', token + '\n\nPégalo en el escenario de Make (módulo HTTP, campo token). El anterior deja de servir ahora. No lo compartas por chat.', ui.ButtonSet.OK);
}

/** Los links de Media (separados por espacio o coma); solo https. */
function enlacesMedia_(media) {
  return String(media || '').split(/[\s,]+/).filter(function (u) { return /^https:\/\/\S+$/.test(u); });
}

const MAKE_NOTA = 'Enviado a Make';

/** Aprobadas con link a las que ya les toca (fecha y hora de Caracas), de la más antigua a la más nueva. */
function publicacionesVencidas_(ahoraMs) {
  const hoy = Utilities.formatDate(new Date(ahoraMs), ZONA, 'yyyy-MM-dd');
  const hora = Utilities.formatDate(new Date(ahoraMs), ZONA, 'HH:mm');
  return marketingCentral_().publicaciones.filter(function (p) {
    return p.estado === 'aprobado' && enlacesMedia_(p.media).length && (p.fecha < hoy || (p.fecha === hoy && p.hora <= hora));
  }).sort(function (a, b) { return (a.fecha + a.hora).localeCompare(b.fecha + b.hora); });
}

/** Lo que Make necesita para publicar una pieza en Instagram. */
function piezaParaMake_(p) {
  const enlaces = enlacesMedia_(p.media);
  return {
    id: p.id, tipo: p.tipo, titulo: p.titulo, esCarrusel: p.tipo === 'carrusel',
    caption: [p.caption, p.hashtags].filter(Boolean).join('\n\n'),
    video_url: p.tipo === 'carrusel' ? '' : enlaces[0],
    archivos: p.tipo === 'carrusel' ? enlaces.slice(0, 10).map(function (u) { return { media_type: 'IMAGE', image_url: u }; }) : [],
  };
}

function promptWebhookMake() {
  const ui = SpreadsheetApp.getUi();
  const r = ui.prompt('Make: webhook de publicación', 'Pega la dirección del webhook del escenario de Make (empieza con https://hook.…). Se guarda solo en las propiedades de este script. No la compartas por chat.', ui.ButtonSet.OK_CANCEL);
  if (r.getSelectedButton() !== ui.Button.OK) return;
  const url = r.getResponseText().trim();
  if (!/^https:\/\/hook\.[a-z0-9.-]+\/[A-Za-z0-9]+$/.test(url)) { ui.alert('Esa no parece una dirección de webhook de Make.'); return; }
  PropertiesService.getScriptProperties().setProperty('make_webhook', url);
  ui.alert('Webhook guardado', 'Ahora activa el programador: menú "Marketing: activar programador (Instagram y TikTok)".', ui.ButtonSet.OK);
}

/**
 * Programador: Apps Script lleva el reloj (gratis) y Make solo corre cuando hay algo que publicar.
 * Manda cada pieza vencida al webhook de Make (una llamada por pieza) y deja la marca "Enviado a Make" en las notas
 * para no repetirla; Make avisa el resultado con op "publicado". Máximo 3 por ronda.
 */
function makeEnviarPendientes_(ahoraMs) {
  const props = PropertiesService.getScriptProperties();
  const url = String(props.getProperty('make_webhook') || '');
  const token = String(props.getProperty('make_token') || '');
  if (!url) return { enviadas: [], errores: {}, motivo: 'sin_webhook' };
  if (token.length < 24) return { enviadas: [], errores: {}, motivo: 'sin_token' };
  const lista = publicacionesVencidas_(ahoraMs).filter(function (p) { return p.notas.indexOf(MAKE_NOTA) === -1; }).slice(0, 3);
  const enviadas = [];
  const errores = {};
  lista.forEach(function (p) {
    const r = UrlFetchApp.fetch(url, { method: 'post', contentType: 'application/json', muteHttpExceptions: true, payload: JSON.stringify(Object.assign({ token: token }, piezaParaMake_(p))) });
    const codigo = r.getResponseCode();
    if (codigo < 200 || codigo >= 300) { errores[p.id] = 'HTTP ' + codigo; return; }
    const previa = p.notas.replace(/Enviado a Make \([^)]*\)( · )?/g, '');
    marketingGuardar_({ id: p.id, notas: MAKE_NOTA + ' (' + Utilities.formatDate(new Date(ahoraMs), ZONA, 'yyyy-MM-dd HH:mm') + ')' + (previa ? ' · ' + previa : '') }, 'Programador', ahoraMs);
    enviadas.push(p.id);
  });
  return { enviadas: enviadas, errores: errores };
}

/** Función del temporizador: Instagram (vía Make) y borradores de TikTok. */
function programadorMarketing() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(20000)) return;
  try {
    const ahora = Date.now();
    try { makeEnviarPendientes_(ahora); } catch (e) { console.error('Make: ' + e.message); }
    try { tiktokAutomatico_(ahora); } catch (e) { console.error('TikTok: ' + e.message); }
  } finally {
    lock.releaseLock();
  }
}

function instalarProgramador() {
  const ui = SpreadsheetApp.getUi();
  ScriptApp.getProjectTriggers().forEach(function (t) { if (t.getHandlerFunction() === 'programadorMarketing') ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('programadorMarketing').timeBased().everyMinutes(15).create();
  ui.alert('Programador activado', 'Cada 15 minutos revisa Marketing: manda a Make lo aprobado que ya toca (Instagram) y a tus borradores de TikTok. No gasta créditos de Make mientras no haya nada que publicar.', ui.ButtonSet.OK);
}

function atenderMake_(data, ahoraMs) {
  const esperado = String(PropertiesService.getScriptProperties().getProperty('make_token') || '');
  if (esperado.length < 24 || String(data.token || '') !== esperado) return { error: 'no_autorizado' };
  const op = String(data.op || '');
  const hoy = Utilities.formatDate(new Date(ahoraMs), ZONA, 'yyyy-MM-dd');
  const hora = Utilities.formatDate(new Date(ahoraMs), ZONA, 'HH:mm');
  if (op === 'pendientes') return { publicaciones: publicacionesVencidas_(ahoraMs).slice(0, 3).map(piezaParaMake_) };
  if (op === 'publicado') {
    const lock = LockService.getScriptLock();
    if (!lock.tryLock(30000)) return { error: 'servidor', mensaje: 'Hay otra operación en curso.' };
    try {
      const ok = data.ok === true || data.ok === 'true';
      const campos = ok
        ? { id: data.id, estado: 'publicado' }
        : { id: data.id, estado: 'borrador', notas: 'Error al publicar (' + hoy + ' ' + hora + '): ' + limpiarTexto_(data.error || 'sin detalle', 200) };
      const r = marketingGuardar_(campos, 'Make' + (data.post ? ' · ' + limpiarTexto_(data.post, 40) : ''), ahoraMs);
      return r;
    } finally {
      lock.releaseLock();
    }
  }
  if (op === 'tiktok') {
    const lock = LockService.getScriptLock();
    if (!lock.tryLock(30000)) return { ok: true, enviadas: [], errores: {}, motivo: 'ocupado' };
    try {
      return tiktokAutomatico_(ahoraMs);
    } finally {
      lock.releaseLock();
    }
  }
  return { error: 'op_desconocida' };
}

// ============================================================================
// TikTok: borradores desde Central (Login Kit + Content Posting API, modo Upload)
// ============================================================================
// Central conecta TU cuenta de TikTok (OAuth) y manda cada video como BORRADOR a tu bandeja de
// TikTok; tú lo terminas y publicas desde la app. Solo publica en la cuenta del dueño de la app.
// Las claves de la app NO viven en el código ni se pegan en ningún chat: se guardan con el menú
// "TikTok: guardar claves de la app" (propiedades tiktok_client_key y tiktok_client_secret).
// El video se SUBE por partes (FILE_UPLOAD) en vez de pasar un link: con link TikTok exige
// verificar el dominio donde está el archivo (Cloudinary no es nuestro).
// Redirect URI registrada en la app de TikTok: TIKTOK_REDIRECT (sin parámetros, https).

const TIKTOK_REDIRECT = 'https://bookeaa.com/central';
const TIKTOK_SCOPES = 'user.info.basic,video.upload';
const TIKTOK_API = 'https://open.tiktokapis.com/v2/';
const TIKTOK_MAX_BYTES = 64 * 1024 * 1024; // un solo bloque: TikTok acepta de 5 a 64 MB (o menos, si el video entero es menor)

function promptClavesTikTok() {
  const ui = SpreadsheetApp.getUi();
  const props = PropertiesService.getScriptProperties();
  const k = ui.prompt('TikTok: Client key', 'Pega el Client key de tu app (developers.tiktok.com → tu app).', ui.ButtonSet.OK_CANCEL);
  if (k.getSelectedButton() !== ui.Button.OK || !k.getResponseText().trim()) return;
  const sc = ui.prompt('TikTok: Client secret', 'Pega el Client secret. Se guarda solo en las propiedades de este script. No lo compartas por chat.', ui.ButtonSet.OK_CANCEL);
  if (sc.getSelectedButton() !== ui.Button.OK || !sc.getResponseText().trim()) return;
  props.setProperty('tiktok_client_key', k.getResponseText().trim());
  props.setProperty('tiktok_client_secret', sc.getResponseText().trim());
  ['tiktok_access', 'tiktok_access_exp', 'tiktok_refresh', 'tiktok_refresh_exp', 'tiktok_usuario', 'tiktok_open_id'].forEach(function (c) { props.deleteProperty(c); });
  ui.alert('Claves de TikTok guardadas', 'Ahora entra a Central → Marketing → Conectar TikTok.', ui.ButtonSet.OK);
}

function tiktokProp_(k) { return String(PropertiesService.getScriptProperties().getProperty(k) || ''); }

function tiktokEstado_() {
  const configurado = tiktokProp_('tiktok_client_key').length > 5 && tiktokProp_('tiktok_client_secret').length > 5;
  const conectado = configurado && !!tiktokProp_('tiktok_refresh');
  const k = tiktokProp_('tiktok_client_key');
  // Pista de la clave en uso (no es secreta, pero no se muestra entera): ayuda a ver si es la de producción o la del sandbox ('sb…').
  const pista = k.length > 8 ? k.slice(0, 4) + '…' + k.slice(-4) : '';
  return { configurado: configurado, conectado: conectado, usuario: conectado ? tiktokProp_('tiktok_usuario') : '', redirect: TIKTOK_REDIRECT, pista: pista, sandbox: /^sb/i.test(k) };
}

/** Dirección de autorización de TikTok; el state queda 10 min en caché atado al correo que la pidió. */
function tiktokUrl_(email) {
  const e = tiktokEstado_();
  if (!e.configurado) return { error: 'sin_claves', mensaje: 'Faltan las claves de TikTok: en el Apps Script, menú SaaS Reservas → "TikTok: guardar claves de la app".' };
  const state = Utilities.getUuid().replace(/-/g, '');
  CacheService.getScriptCache().put('tt_' + state, email, 600);
  const q = 'client_key=' + encodeURIComponent(tiktokProp_('tiktok_client_key')) + '&scope=' + encodeURIComponent(TIKTOK_SCOPES) +
    '&response_type=code&redirect_uri=' + encodeURIComponent(TIKTOK_REDIRECT) + '&state=' + state;
  return { url: 'https://www.tiktok.com/v2/auth/authorize/?' + q };
}

function tiktokPost_(url, opciones) {
  const r = UrlFetchApp.fetch(url, Object.assign({ muteHttpExceptions: true }, opciones));
  let cuerpo = {};
  try { cuerpo = JSON.parse(r.getContentText() || '{}'); } catch (_) { cuerpo = {}; }
  return { codigo: r.getResponseCode(), cuerpo: cuerpo, crudo: r };
}

function tiktokGuardarTokens_(t, ahoraMs) {
  const props = PropertiesService.getScriptProperties();
  props.setProperty('tiktok_access', String(t.access_token));
  props.setProperty('tiktok_access_exp', String(ahoraMs + (Number(t.expires_in) || 86400) * 1000));
  props.setProperty('tiktok_refresh', String(t.refresh_token));
  props.setProperty('tiktok_refresh_exp', String(ahoraMs + (Number(t.refresh_expires_in) || 31536000) * 1000));
  if (t.open_id) props.setProperty('tiktok_open_id', String(t.open_id));
}

function tiktokFormToken_(campos) {
  return tiktokPost_(TIKTOK_API + 'oauth/token/', {
    method: 'post', contentType: 'application/x-www-form-urlencoded',
    payload: Object.assign({ client_key: tiktokProp_('tiktok_client_key'), client_secret: tiktokProp_('tiktok_client_secret') }, campos),
  });
}

function tiktokConectar_(data, email, ahoraMs) {
  const state = String(data.state || '');
  const cache = CacheService.getScriptCache();
  const dueno = state ? cache.get('tt_' + state) : null;
  if (!dueno || dueno !== email) return { error: 'estado_invalido', mensaje: 'La conexión venció o no es la misma sesión. Pulsa "Conectar TikTok" otra vez.' };
  cache.remove('tt_' + state);
  const r = tiktokFormToken_({ code: String(data.code || ''), grant_type: 'authorization_code', redirect_uri: TIKTOK_REDIRECT });
  if (!r.cuerpo.access_token) return { error: 'tiktok', mensaje: 'TikTok no aceptó la conexión: ' + limpiarTexto_(r.cuerpo.error_description || r.cuerpo.error || ('HTTP ' + r.codigo), 160) };
  if (String(r.cuerpo.scope || '').indexOf('video.upload') === -1) return { error: 'tiktok', mensaje: 'Falta el permiso video.upload: acepta todos los permisos al conectar.' };
  tiktokGuardarTokens_(r.cuerpo, ahoraMs);
  // El nombre de la cuenta (TikTok pide mostrarlo donde se envía el video).
  let usuario = '';
  try {
    const u = tiktokPost_(TIKTOK_API + 'user/info/?fields=open_id,display_name', { method: 'get', headers: { Authorization: 'Bearer ' + r.cuerpo.access_token } });
    usuario = limpiarTexto_(u.cuerpo && u.cuerpo.data && u.cuerpo.data.user && u.cuerpo.data.user.display_name || '', 60);
  } catch (_) { /* sin nombre: se conecta igual */ }
  PropertiesService.getScriptProperties().setProperty('tiktok_usuario', usuario || 'tu cuenta');
  return { ok: true, usuario: usuario || 'tu cuenta' };
}

function tiktokDesconectar_() {
  const props = PropertiesService.getScriptProperties();
  ['tiktok_access', 'tiktok_access_exp', 'tiktok_refresh', 'tiktok_refresh_exp', 'tiktok_usuario', 'tiktok_open_id'].forEach(function (c) { props.deleteProperty(c); });
  return { ok: true };
}

/** Access token vigente (lo renueva con el refresh token 5 min antes de que venza); null si hay que reconectar. */
function tiktokToken_(ahoraMs) {
  const exp = Number(tiktokProp_('tiktok_access_exp')) || 0;
  if (tiktokProp_('tiktok_access') && exp - ahoraMs > 5 * 60 * 1000) return tiktokProp_('tiktok_access');
  const refresh = tiktokProp_('tiktok_refresh');
  if (!refresh || (Number(tiktokProp_('tiktok_refresh_exp')) || 0) < ahoraMs) return null;
  const r = tiktokFormToken_({ grant_type: 'refresh_token', refresh_token: refresh });
  if (!r.cuerpo.access_token) return null;
  tiktokGuardarTokens_(r.cuerpo, ahoraMs);
  return String(r.cuerpo.access_token);
}

const TIKTOK_FOTOS_BASE = 'https://bookeaa.com/fotos-tiktok/';
const TIKTOK_NOTA = 'En borradores de TikTok';

/**
 * TikTok solo baja fotos de un dominio que tú verificaste en su portal (url_ownership_unverified si no),
 * así que las láminas del carrusel se leen de bookeaa.com/fotos-tiktok/ con el mismo nombre de archivo que en Cloudinary.
 * Se puede cambiar con la propiedad tiktok_fotos_base.
 */
function fotosTikTok_(enlaces) {
  const base = (tiktokProp_('tiktok_fotos_base') || TIKTOK_FOTOS_BASE).replace(/\/?$/, '/');
  return enlaces.slice(0, 35).map(function (u) { return base + String(u).split('?')[0].split('/').pop(); });
}

/** Deja la marca del envío al principio de las notas (así sobrevive al recorte de 300 caracteres). */
function tiktokNota_(pub, texto, ahoraMs) {
  const previa = String(pub.notas || '').replace(/^(En borradores de TikTok|Error TikTok)[^·]*(·\s*)?/, '');
  marketingGuardar_({ id: pub.id, notas: texto + ' (' + Utilities.formatDate(new Date(ahoraMs), ZONA, 'yyyy-MM-dd HH:mm') + ')' + (previa ? ' · ' + previa : '') }, 'TikTok', ahoraMs);
}

/** Manda un video (subida en un solo bloque) o un carrusel (como fotos) de la cola a los borradores de TikTok. */
function tiktokEnviar_(data, ahoraMs) {
  const pub = marketingCentral_().publicaciones.filter(function (p) { return p.id === String(data.id || ''); })[0];
  if (!pub) return { error: 'no_existe', mensaje: 'Esa publicación ya no está en la cola.' };
  const esCarrusel = pub.tipo === 'carrusel';
  if (!esCarrusel && String(pub.tipo).indexOf('video') !== 0) return { error: 'datos_invalidos', mensaje: 'Solo se envían videos y carruseles a TikTok.' };
  const enlaces = enlacesMedia_(pub.media);
  if (!enlaces.length) return { error: 'datos_invalidos', mensaje: 'Esta publicación no tiene link de ' + (esCarrusel ? 'imágenes.' : 'video.') };
  const token = tiktokToken_(ahoraMs);
  if (!token) return { error: 'sin_conexion', mensaje: 'TikTok no está conectado (o la conexión venció). Pulsa "Conectar TikTok".' };
  const cabecera = { Authorization: 'Bearer ' + token };

  if (esCarrusel) {
    const ini = tiktokPost_(TIKTOK_API + 'post/publish/content/init/', {
      method: 'post', contentType: 'application/json; charset=UTF-8', headers: cabecera,
      payload: JSON.stringify({
        post_info: { title: limpiarTexto_(pub.titulo, 90), description: [pub.caption, pub.hashtags].filter(Boolean).join('\n\n').slice(0, 4000) },
        source_info: { source: 'PULL_FROM_URL', photo_cover_index: 0, photo_images: fotosTikTok_(enlaces) },
        post_mode: 'MEDIA_UPLOAD', media_type: 'PHOTO',
      }),
    });
    const e = ini.cuerpo && ini.cuerpo.error || {};
    const d = ini.cuerpo && ini.cuerpo.data;
    if (!d || !d.publish_id || (e.code && e.code !== 'ok')) {
      const sinVerificar = e.code === 'url_ownership_unverified';
      return { error: 'tiktok', codigo: String(e.code || ''), mensaje: 'TikTok no aceptó las fotos: ' + (sinVerificar ? 'falta verificar bookeaa.com como propiedad de URL en el portal de TikTok.' : limpiarTexto_(e.message || e.code || ('HTTP ' + ini.codigo), 200)) };
    }
    tiktokNota_(pub, TIKTOK_NOTA, ahoraMs);
    return { ok: true, publishId: String(d.publish_id), usuario: tiktokProp_('tiktok_usuario') };
  }

  const archivo = UrlFetchApp.fetch(enlaces[0], { muteHttpExceptions: true });
  if (archivo.getResponseCode() !== 200) return { error: 'media', mensaje: 'No pude descargar el video (HTTP ' + archivo.getResponseCode() + ').' };
  const bytes = archivo.getBlob().getBytes();
  if (!bytes.length || bytes.length > TIKTOK_MAX_BYTES) return { error: 'media', mensaje: 'El video debe pesar menos de 64 MB.' };

  const ini = tiktokPost_(TIKTOK_API + 'post/publish/inbox/video/init/', {
    method: 'post', contentType: 'application/json; charset=UTF-8', headers: cabecera,
    payload: JSON.stringify({ source_info: { source: 'FILE_UPLOAD', video_size: bytes.length, chunk_size: bytes.length, total_chunk_count: 1 } }),
  });
  const d = ini.cuerpo && ini.cuerpo.data;
  if (!d || !d.upload_url || (ini.cuerpo.error && ini.cuerpo.error.code && ini.cuerpo.error.code !== 'ok')) {
    const e = ini.cuerpo && ini.cuerpo.error || {};
    return { error: 'tiktok', codigo: String(e.code || ''), mensaje: 'TikTok no aceptó el envío: ' + limpiarTexto_(e.message || e.code || ('HTTP ' + ini.codigo), 200) };
  }
  const sube = UrlFetchApp.fetch(d.upload_url, {
    method: 'put', contentType: 'video/mp4', payload: bytes, muteHttpExceptions: true,
    headers: { 'Content-Range': 'bytes 0-' + (bytes.length - 1) + '/' + bytes.length },
  });
  if (sube.getResponseCode() >= 300) return { error: 'tiktok', mensaje: 'TikTok no recibió el archivo (HTTP ' + sube.getResponseCode() + ').' };

  tiktokNota_(pub, TIKTOK_NOTA, ahoraMs);
  return { ok: true, publishId: String(d.publish_id || ''), usuario: tiktokProp_('tiktok_usuario') };
}

/**
 * Envío automático a los borradores de TikTok (lo llama Make en cada ronda, con op "tiktok").
 * Toma videos y carruseles con link que ya tocan: aprobados (de ayer o antes de hoy) o de hoy (aprobados o ya publicados
 * en Instagram), y que aún no tengan la marca de TikTok en las notas. Máximo 2 por llamada.
 * Si TikTok falla se anota "Error TikTok" y no se reintenta solo (queda el botón manual de Central); con el tope de
 * 5 borradores pendientes por día se corta y se reintenta en la siguiente ronda.
 */
function tiktokAutomatico_(ahoraMs) {
  const hoy = Utilities.formatDate(new Date(ahoraMs), ZONA, 'yyyy-MM-dd');
  const ayer = Utilities.formatDate(new Date(ahoraMs - 86400000), ZONA, 'yyyy-MM-dd');
  const hora = Utilities.formatDate(new Date(ahoraMs), ZONA, 'HH:mm');
  if (!tiktokToken_(ahoraMs)) return { ok: true, enviadas: [], errores: {}, motivo: 'sin_conexion' };
  const lista = marketingCentral_().publicaciones.filter(function (p) {
    const tipoOk = p.tipo === 'carrusel' || String(p.tipo).indexOf('video') === 0;
    const toca = p.fecha === hoy ? p.hora <= hora : p.fecha >= ayer && p.fecha < hoy;
    const estadoOk = p.fecha === hoy ? (p.estado === 'aprobado' || p.estado === 'publicado') : p.estado === 'aprobado';
    return tipoOk && toca && estadoOk && enlacesMedia_(p.media).length && !/borradores de TikTok|Error TikTok/.test(p.notas);
  }).sort(function (a, b) { return (a.fecha + a.hora).localeCompare(b.fecha + b.hora); }).slice(0, 2);
  const enviadas = [];
  const errores = {};
  for (let k = 0; k < lista.length; k++) {
    const r = tiktokEnviar_({ id: lista[k].id }, ahoraMs);
    if (r.ok) { enviadas.push(lista[k].id); continue; }
    if (r.error === 'sin_conexion' || r.codigo === 'spam_risk_too_many_pending_share') break; // el tope de borradores pendientes se libera solo: se reintenta en la siguiente ronda
    errores[lista[k].id] = r.mensaje || r.error;
    tiktokNota_(lista[k], 'Error TikTok: ' + limpiarTexto_(r.mensaje || r.error, 120), ahoraMs);
  }
  return { ok: true, enviadas: enviadas, errores: errores };
}

// ============================================================================
// Cobros de bookeaa: corte mensual, Pago Móvil reportado y conciliación
// ============================================================================
// - El corte es el día de ingreso de cada mes (el primer mes es gratis). Después del
//   corte hay DIAS_GRACIA para pagar; al día siguiente revisarCortes suspende la página
//   (Suspendido_Auto = si) y al aprobarse un pago se reactiva sola.
// - El negocio reporta su Pago Móvil desde Mi negocio (pestaña PagosNegocio).
// - Los movimientos del banco llegan del estado de cuenta (lo sube la central) o de
//   los correos de aviso del banco en el Gmail de bookeaa (leerCorreosBanco, cada
//   10 min). conciliar_ cruza referencia, monto y fecha y aprueba lo que coincide.
// Propiedades: pm_banco, pm_telefono, pm_cedula, pm_titular (el Pago Móvil de bookeaa)
// y correo_banco_query (la búsqueda de Gmail de los avisos del banco).

const DIAS_GRACIA = 3;
const PAGOS_NEGOCIO_HEADERS = [
  'ID', 'Fecha_Registro', 'Slug', 'Negocio', 'Fecha_Pago', 'Banco_Origen', 'Telefono_Origen', 'Referencia',
  'Monto_Bs', 'Tasa', 'Monto_USD', 'Meses', 'Estado', 'Conciliado_Con', 'Motivo', 'Revisado_Por', 'Fecha_Revision',
];
const MOVIMIENTOS_HEADERS = ['Clave', 'Fecha', 'Referencia', 'Descripcion', 'Monto', 'Fuente', 'Cargado', 'Pago_ID'];
const CORREO_BANCO_QUERY = 'from:(bdvenlinea OR banvenez OR bancodevenezuela) newer_than:7d';

function hojaCon_(nombre, headers) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(nombre);
  if (!sheet) {
    sheet = ss.insertSheet(nombre);
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

/** Filas de una pestaña como objetos (con su número de fila). */
function objetos_(sheet, headers) {
  const n = sheet.getLastRow() - 1;
  if (n < 1) return [];
  return sheet.getRange(2, 1, n, headers.length).getValues().map(function (r, i) {
    const o = { fila: i + 2 };
    headers.forEach(function (h, j) { o[h] = r[j]; });
    return o;
  });
}

function escribirFila_(sheet, headers, fila, campos) {
  Object.keys(campos).forEach(function (h) {
    const c = headers.indexOf(h);
    if (c !== -1) sheet.getRange(fila, c + 1).setValue(campos[h]);
  });
}

const soloDigitos_ = function (v) { return String(v == null ? '' : v).replace(/\D/g, ''); };

/** Misma referencia: coinciden los últimos dígitos (al menos 4; los bancos recortan distinto). */
function refCoincide_(a, b) {
  const da = soloDigitos_(a).replace(/^0+/, ''), db = soloDigitos_(b).replace(/^0+/, '');
  const n = Math.min(6, da.length, db.length);
  return n >= 4 && da.slice(-n) === db.slice(-n);
}

/** Mismo monto, con medio bolívar o 0,5 % de holgura (redondeos de la tasa). */
function montoCoincide_(a, b) {
  const x = Number(a), y = Number(b);
  return x > 0 && y > 0 && Math.abs(x - y) <= Math.max(0.5, y * 0.005);
}

/** "1.234,56" / "1234.56" / 1234.56 → 1234.56 */
function montoVe_(v) {
  if (typeof v === 'number') return v;
  let t = String(v || '').replace(/[^\d.,-]/g, '');
  if (t.indexOf(',') !== -1) t = t.replace(/\./g, '').replace(',', '.');
  else if ((t.match(/\./g) || []).length > 1) t = t.replace(/\./g, '');
  const n = Number(t);
  return isFinite(n) ? n : 0;
}

function datosPagoMovil_() {
  const p = PropertiesService.getScriptProperties();
  return {
    banco: p.getProperty('pm_banco') || 'Banco de Venezuela (0102)',
    telefono: p.getProperty('pm_telefono') || '',
    cedula: p.getProperty('pm_cedula') || '',
    titular: p.getProperty('pm_titular') || '',
  };
}

function tasaUsd_() {
  try {
    const t = getTasa('USD', null);
    return t && t.valor > 0 ? t.valor : 0;
  } catch (err) {
    return 0;
  }
}

function pagoNegocioJson_(o) {
  return {
    id: String(o.ID), registrado: o.Fecha_Registro instanceof Date ? Utilities.formatDate(o.Fecha_Registro, ZONA, "yyyy-MM-dd'T'HH:mm") : String(o.Fecha_Registro),
    slug: String(o.Slug), negocio: String(o.Negocio), fecha: ymd_(o.Fecha_Pago) || '', banco: String(o.Banco_Origen),
    telefono: String(o.Telefono_Origen), referencia: String(o.Referencia), montoBs: toNumber_(o.Monto_Bs), tasa: toNumber_(o.Tasa),
    montoUsd: toNumber_(o.Monto_USD), meses: toNumber_(o.Meses) || 1, estado: String(o.Estado), conciliado: String(o.Conciliado_Con || ''),
    motivo: String(o.Motivo || ''),
  };
}

function movimientoJson_(o) {
  return {
    clave: String(o.Clave), fecha: ymd_(o.Fecha) || '', referencia: String(o.Referencia), descripcion: String(o.Descripcion),
    monto: toNumber_(o.Monto), fuente: String(o.Fuente), pagoId: String(o.Pago_ID || ''),
  };
}

/** Avisa al negocio en su teléfono (Mi negocio). Nunca lanza. */
function avisarNegocio_(slug, titulo, cuerpo) {
  llamarWorker_('/push/evento', { tipo: 'aviso', slug: slug, titulo: titulo, cuerpo: cuerpo });
}

// ---------- Lo que ve el negocio ----------

function planNegocio_(tenant, ahoraMs) {
  const hoy = Utilities.formatDate(new Date(ahoraMs), ZONA, 'yyyy-MM-dd');
  const fila = filasTenants_().filter(function (o) { return normKey_(o.Slug) === normKey_(tenant.slug); })[0] || {};
  const n = negocioCentral_(fila, hoy);
  const tasa = tasaUsd_();
  const pagos = objetos_(hojaCon_('PagosNegocio', PAGOS_NEGOCIO_HEADERS), PAGOS_NEGOCIO_HEADERS)
    .filter(function (o) { return normKey_(o.Slug) === normKey_(tenant.slug); })
    .map(pagoNegocioJson_).reverse().slice(0, 12);
  return {
    estado: n.estado, vence: n.vence, dias: n.dias, gracia: DIAS_GRACIA,
    corteDia: n.creado ? Number(n.creado.slice(8, 10)) : (n.vence ? Number(n.vence.slice(8, 10)) : null),
    limite: n.vence ? sumarDias_(n.vence, DIAS_GRACIA) : '',
    precio: n.precio, plan: n.plan, personas: n.personas, tasa: tasa, montoBs: tasa ? round2_(n.precio * tasa) : 0,
    pagoMovil: datosPagoMovil_(), pagos: pagos,
    porVerificar: pagos.some(function (p) { return p.estado === 'Por verificar'; }),
  };
}

function reportarPago_(tenant, email, data, ahoraMs) {
  const hoy = Utilities.formatDate(new Date(ahoraMs), ZONA, 'yyyy-MM-dd');
  const fecha = String(data.fecha || '');
  const referencia = soloDigitos_(data.referencia);
  const telefono = soloDigitos_(data.telefono);
  const montoBs = round2_(montoVe_(data.montoBs));
  const meses = Math.max(1, Math.min(12, Math.floor(Number(data.meses) || 1)));
  const errores = [];
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha) || fecha > hoy || diasEntre_(fecha, hoy) > 15) errores.push('Revisa la fecha del pago (de los últimos 15 días).');
  if (referencia.length < 4 || referencia.length > 20) errores.push('Escribe el número de referencia completo (solo números).');
  if (telefono.length < 10) errores.push('Escribe el teléfono desde el que pagaste.');
  if (!(montoBs > 0)) errores.push('Escribe el monto que pagaste en bolívares.');
  if (!String(data.banco || '').trim()) errores.push('Elige el banco desde el que pagaste.');
  if (errores.length) return { error: 'datos_invalidos', mensaje: errores.join(' ') };

  const hoja = hojaCon_('PagosNegocio', PAGOS_NEGOCIO_HEADERS);
  const repetido = objetos_(hoja, PAGOS_NEGOCIO_HEADERS).some(function (o) {
    return String(o.Estado) !== 'Rechazado' && refCoincide_(o.Referencia, referencia) && montoCoincide_(o.Monto_Bs, montoBs);
  });
  if (repetido) return { error: 'datos_invalidos', mensaje: 'Ese pago ya está reportado.' };

  const tasa = tasaUsd_();
  const id = 'P' + Utilities.getUuid().replace(/-/g, '').slice(0, 10).toUpperCase();
  hoja.appendRow([id, new Date(ahoraMs), tenant.slug, tenant.nombre, fecha, limpiarTexto_(data.banco, 60), "'" + telefono, "'" + referencia,
    montoBs, tasa || '', tasa ? round2_(montoBs / tasa) : '', meses, 'Por verificar', '', '', email, '']);
  const r = conciliar_(ahoraMs);
  const aprobado = r.aprobados.indexOf(id) !== -1;
  if (!aprobado) {
    botAvisar_('Pago Móvil por verificar: ' + tenant.nombre, [
      tenant.nombre + ' reportó un pago de Bs. ' + montoBs + ' (' + meses + (meses === 1 ? ' mes' : ' meses') + ').',
      'Referencia: ' + referencia + ' · ' + String(data.banco) + ' · ' + fecha,
      'Apruébalo o recházalo en bookeaa.com/central → Cobros.',
    ]);
  }
  return { ok: true, id: id, estado: aprobado ? 'Aprobado' : 'Por verificar' };
}

// ---------- Aprobar, rechazar, conciliar ----------

function aprobarPago_(fila, fuente, revisor, ahoraMs) {
  const hoja = hojaCon_('PagosNegocio', PAGOS_NEGOCIO_HEADERS);
  const pago = objetos_(hoja, PAGOS_NEGOCIO_HEADERS).filter(function (o) { return o.fila === fila; })[0];
  if (!pago || String(pago.Estado) !== 'Por verificar') return null;
  const hoy = Utilities.formatDate(new Date(ahoraMs), ZONA, 'yyyy-MM-dd');
  const t = filasTenants_().filter(function (o) { return normKey_(o.Slug) === normKey_(pago.Slug); })[0];
  if (!t) return null;
  const meses = Math.max(1, toNumber_(pago.Meses) || 1);
  const antes = ymd_(t.Vence) || '';
  const nuevo = extenderVence_(antes, meses, hoy);
  escribirFila_(hoja, PAGOS_NEGOCIO_HEADERS, fila, { Estado: 'Aprobado', Conciliado_Con: fuente, Revisado_Por: revisor, Fecha_Revision: new Date(ahoraMs) });
  hojaPagos_().appendRow([new Date(ahoraMs), String(t.Slug), String(t.Nombre), toNumber_(pago.Monto_USD) || PRECIO_MENSUAL * meses, meses,
    'Pago Móvil', "'" + soloDigitos_(pago.Referencia), antes, nuevo, revisor]);
  const campos = { Vence: nuevo, Ultimo_Pago: hoy, Suspendido_Auto: '' };
  // Solo se reactiva sola si la suspendió el cobro (no si la suspendiste tú a mano).
  if (String(t.Suspendido_Auto || '') === 'si') campos.Activo = 'si';
  escribirTenant_(t.Slug, campos);
  avisarNegocio_(String(t.Slug), '✅ Pago aprobado', 'Tu plan de bookeaa queda al día hasta el ' + nuevo.split('-').reverse().join('/') + '. ¡Gracias!');
  return nuevo;
}

/** Cruza los pagos por verificar con los movimientos del banco. Devuelve los aprobados. */
function conciliar_(ahoraMs) {
  const hojaP = hojaCon_('PagosNegocio', PAGOS_NEGOCIO_HEADERS);
  const hojaM = hojaCon_('MovimientosBanco', MOVIMIENTOS_HEADERS);
  const libres = objetos_(hojaM, MOVIMIENTOS_HEADERS).filter(function (m) { return !String(m.Pago_ID || ''); });
  const aprobados = [];
  objetos_(hojaP, PAGOS_NEGOCIO_HEADERS).forEach(function (p) {
    if (String(p.Estado) !== 'Por verificar') return;
    const fechaPago = ymd_(p.Fecha_Pago);
    const m = libres.filter(function (x) {
      if (String(x.Pago_ID || '')) return false;
      const f = ymd_(x.Fecha);
      return refCoincide_(x.Referencia, p.Referencia) && montoCoincide_(x.Monto, p.Monto_Bs) && (!f || !fechaPago || Math.abs(diasEntre_(f, fechaPago)) <= 3);
    })[0];
    if (!m) return;
    if (aprobarPago_(p.fila, String(m.Fuente) === 'correo' ? 'Correo del banco' : 'Estado de cuenta', 'conciliación automática', ahoraMs)) {
      escribirFila_(hojaM, MOVIMIENTOS_HEADERS, m.fila, { Pago_ID: String(p.ID) });
      m.Pago_ID = String(p.ID);
      aprobados.push(String(p.ID));
    }
  });
  return { aprobados: aprobados };
}

/** Guarda movimientos (créditos) sin repetir. `filas`: [{fecha, referencia, descripcion, monto, clave?}] */
function guardarMovimientos_(filas, fuente, ahoraMs) {
  const hoja = hojaCon_('MovimientosBanco', MOVIMIENTOS_HEADERS);
  const existentes = {};
  objetos_(hoja, MOVIMIENTOS_HEADERS).forEach(function (m) { existentes[String(m.Clave)] = true; });
  const nuevas = [];
  (filas || []).slice(0, 3000).forEach(function (f) {
    const monto = round2_(montoVe_(f.monto));
    const ref = soloDigitos_(f.referencia);
    const fecha = ymd_(f.fecha) || '';
    if (!(monto > 0) || ref.length < 4) return;
    const clave = String(f.clave || (fecha + '|' + ref + '|' + monto));
    if (existentes[clave]) return;
    existentes[clave] = true;
    nuevas.push([clave, fecha, "'" + ref, paraCelda_(limpiarTexto_(f.descripcion || '', 120)), monto, fuente, new Date(ahoraMs), '']);
  });
  if (nuevas.length) hoja.getRange(hoja.getLastRow() + 1, 1, nuevas.length, MOVIMIENTOS_HEADERS.length).setValues(nuevas);
  return nuevas.length;
}

// ---------- Correos del banco ----------

/** Saca monto, referencia y fecha de un aviso de Pago Móvil recibido. null si no es un abono. */
function parsearCorreoBanco_(texto) {
  const t = String(texto || '').replace(/\s+/g, ' ');
  if (!/(recib|abon|acredit|ingres|te (?:han )?(?:enviado|pagado)|le (?:han )?(?:enviado|transferido))/i.test(t)) return null;
  if (/(has enviado|enviaste|realizaste un pago|d[eé]bito a tu cuenta|cargo a su cuenta)/i.test(t)) return null;
  const monto = /(?:Bs\.?\s*S?\.?|VES|monto(?: de)?:?)\s*([\d.]+,\d{2}|\d+(?:\.\d{2})?)/i.exec(t);
  const ref = /(?:referencia|ref\.?|n[uú]mero de (?:operaci[oó]n|referencia)|operaci[oó]n|comprobante)\s*(?:n[°º.o]*)?\s*:?\s*#?\s*(\d{4,20})/i.exec(t);
  if (!monto || !ref) return null;
  const f = /(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})/.exec(t);
  let fecha = '';
  if (f) {
    const anio = f[3].length === 2 ? '20' + f[3] : f[3];
    fecha = anio + '-' + ('0' + f[2]).slice(-2) + '-' + ('0' + f[1]).slice(-2);
  }
  return { monto: montoVe_(monto[1]), referencia: ref[1], fecha: fecha };
}

/** Lee los avisos del banco en el Gmail de bookeaa y concilia. La llama un disparador cada 10 min. */
function leerCorreosBanco() {
  const ahoraMs = Date.now();
  const props = PropertiesService.getScriptProperties();
  const query = props.getProperty('correo_banco_query') || CORREO_BANCO_QUERY;
  const filas = [];
  let leidos = 0, sinDatos = 0;
  GmailApp.search(query, 0, 30).forEach(function (hilo) {
    hilo.getMessages().forEach(function (msg) {
      leidos++;
      const datos = parsearCorreoBanco_(msg.getSubject() + ' ' + msg.getPlainBody());
      if (!datos) { sinDatos++; return; }
      filas.push({
        clave: 'correo:' + msg.getId(), fecha: datos.fecha || Utilities.formatDate(msg.getDate(), ZONA, 'yyyy-MM-dd'),
        referencia: datos.referencia, monto: datos.monto, descripcion: msg.getSubject(),
      });
    });
  });
  const nuevos = guardarMovimientos_(filas, 'correo', ahoraMs);
  const r = conciliar_(ahoraMs);
  const resumen = { fecha: new Date(ahoraMs).toISOString(), leidos: leidos, abonos: filas.length, nuevos: nuevos, sinDatos: sinDatos, aprobados: r.aprobados.length };
  props.setProperty('correo_banco_ultima', JSON.stringify(resumen));
  return resumen;
}

// ---------- Cortes diarios ----------

/** Recordatorios de pago y suspensión al pasar la gracia. La llama un disparador diario (7:00). */
function revisarCortes() {
  const ahoraMs = Date.now();
  const hoy = Utilities.formatDate(new Date(ahoraMs), ZONA, 'yyyy-MM-dd');
  const suspendidos = [];
  filasTenants_().forEach(function (o) {
    const vence = ymd_(o.Vence);
    const t = { activo: String(o.Activo || 'si') };
    if (!vence || !tenantActivo_(t)) return;
    const slug = String(o.Slug), dias = diasEntre_(hoy, vence);
    const fechaTxt = vence.split('-').reverse().join('/');
    const monto = '$' + negocioCentral_(o, hoy).precio;
    if (dias === 3 || dias === 1) avisarNegocio_(slug, '🗓️ Tu pago de bookeaa vence el ' + fechaTxt, 'Son ' + monto + ' por Pago Móvil. Repórtalo en Configurar → Mi plan y pagos.');
    else if (dias === 0) avisarNegocio_(slug, '🗓️ Hoy es tu fecha de corte', 'Tienes ' + DIAS_GRACIA + ' días para pagar ' + monto + ' y seguir recibiendo reservas.');
    else if (dias < 0 && -dias <= DIAS_GRACIA) {
      const quedan = DIAS_GRACIA + dias;
      avisarNegocio_(slug, '⚠️ Tu pago de bookeaa está pendiente', quedan ? 'Te quedan ' + quedan + (quedan === 1 ? ' día' : ' días') + ' para pagar antes de que tu página se pause.' : 'Hoy es el último día para pagar antes de que tu página se pause.');
    } else if (dias < 0) {
      escribirTenant_(slug, { Activo: 'no', Suspendido_Auto: 'si' });
      avisarNegocio_(slug, '⏸️ Tu página de reservas está en pausa', 'Pasaron ' + DIAS_GRACIA + ' días del corte sin pago. Reporta tu Pago Móvil y se reactiva al aprobarse.');
      suspendidos.push(String(o.Nombre || slug));
    }
  });
  if (suspendidos.length) botAvisar_('Negocios suspendidos por falta de pago', suspendidos);
  return { suspendidos: suspendidos };
}

/** Crea los disparadores de cobros (correos cada 10 min y cortes a las 7:00). Sin duplicar. */
function instalarCobros() {
  const existentes = ScriptApp.getProjectTriggers().map(function (t) { return t.getHandlerFunction(); });
  if (existentes.indexOf('leerCorreosBanco') === -1) ScriptApp.newTrigger('leerCorreosBanco').timeBased().everyMinutes(10).create();
  if (existentes.indexOf('revisarCortes') === -1) ScriptApp.newTrigger('revisarCortes').timeBased().atHour(7).everyDays(1).inTimezone(ZONA).create();
  return { ok: true };
}

function cobrosActivos_() {
  const h = ScriptApp.getProjectTriggers().map(function (t) { return t.getHandlerFunction(); });
  return { correos: h.indexOf('leerCorreosBanco') !== -1, cortes: h.indexOf('revisarCortes') !== -1 };
}

// ---------- Lo que ve la central ----------

function cobrosCentral_(ahoraMs) {
  const props = PropertiesService.getScriptProperties();
  const pagos = objetos_(hojaCon_('PagosNegocio', PAGOS_NEGOCIO_HEADERS), PAGOS_NEGOCIO_HEADERS);
  const movs = objetos_(hojaCon_('MovimientosBanco', MOVIMIENTOS_HEADERS), MOVIMIENTOS_HEADERS);
  const libres = movs.filter(function (m) { return !String(m.Pago_ID || ''); });
  const porVerificar = pagos.filter(function (p) { return String(p.Estado) === 'Por verificar'; }).map(function (p) {
    const j = pagoNegocioJson_(p);
    // Pista para revisar a mano: un movimiento con el mismo monto o la misma referencia.
    const pista = libres.filter(function (m) { return montoCoincide_(m.Monto, p.Monto_Bs) || refCoincide_(m.Referencia, p.Referencia); })[0];
    j.pista = pista ? movimientoJson_(pista) : null;
    return j;
  }).reverse();
  let ultima = null;
  try { ultima = JSON.parse(props.getProperty('correo_banco_ultima') || 'null'); } catch (_) { /* nada */ }
  let activos = { correos: false, cortes: false };
  try { activos = cobrosActivos_(); } catch (_) { /* sin permiso de ScriptApp */ }
  return {
    porVerificar: porVerificar,
    revisados: pagos.filter(function (p) { return String(p.Estado) !== 'Por verificar'; }).map(pagoNegocioJson_).reverse().slice(0, 40),
    movimientos: libres.map(movimientoJson_).reverse().slice(0, 60),
    tasa: tasaUsd_(),
    ajustes: {
      pagoMovil: datosPagoMovil_(), correoQuery: props.getProperty('correo_banco_query') || CORREO_BANCO_QUERY,
      ultimaLectura: ultima, automaticos: activos,
    },
  };
}

function guardarAjustesCobro_(data) {
  const p = PropertiesService.getScriptProperties();
  const pm = data.pagoMovil || {};
  ['banco', 'telefono', 'cedula', 'titular'].forEach(function (k) {
    if (k in pm) p.setProperty('pm_' + k, limpiarTexto_(pm[k], 80));
  });
  if ('correoQuery' in data) p.setProperty('correo_banco_query', limpiarTexto_(data.correoQuery, 300) || CORREO_BANCO_QUERY);
  return { ok: true };
}

// ---------- Central: métricas (vista de computadora) ----------

const METRICAS_MESES = 12;
const DIAS_SEMANA_CORTO = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];

/** Los últimos `n` meses hasta el de `hoy`, como 'yyyy-MM' (el más viejo primero). */
function ultimosMeses_(hoy, n) {
  const p = hoy.split('-').map(Number);
  const out = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(p[0], p[1] - 1 - i, 1, 12));
    out.push(d.getUTCFullYear() + '-' + ('0' + (d.getUTCMonth() + 1)).slice(-2));
  }
  return out;
}

/** Día de la semana de 'yyyy-MM-dd' (0 = domingo). */
function diaSemana_(ymd) {
  const p = ymd.split('-').map(Number);
  return new Date(Date.UTC(p[0], p[1] - 1, p[2], 12)).getUTCDay();
}

function sumarConteo_(obj, clave, n) {
  const k = String(clave || '').trim() || '—';
  obj[k] = (obj[k] || 0) + (n == null ? 1 : n);
}

/** { clave: n } → [{ nombre, n }] de mayor a menor, máximo `max`. */
function rankingConteo_(obj, max) {
  return Object.keys(obj).map(function (k) { return { nombre: k, n: round2_(obj[k]) }; })
    .sort(function (a, b) { return b.n - a.n || a.nombre.localeCompare(b.nombre); })
    .slice(0, max);
}

/**
 * Estadísticas de las reservas de un negocio (filas de Reservaciones). Las canceladas
 * se cuentan aparte y no suman en lo demás. `completo` agrega servicios, horas,
 * métodos, modalidades y estados (para el detalle de un negocio).
 */
function estadisticasReservas_(filas, hoy, completo) {
  const meses = ultimosMeses_(hoy, METRICAS_MESES);
  const idx = {};
  meses.forEach(function (m, i) { idx[m] = i; });
  const cero = function () { return meses.map(function () { return 0; }); };
  const porMes = cero(), ingresosMes = cero(), canceladasMes = cero(), clientesNuevosMes = cero();
  const hace30 = sumarDias_(hoy, -30), hace60 = sumarDias_(hoy, -60), en30 = sumarDias_(hoy, 30);
  const r = { total: 0, canceladas: 0, ultimos30: 0, previos30: 0, ingresos30: 0, ingresosPrevios30: 0, proximas: 0, ultimaSolicitud: '', conCupon: 0 };
  const clientes = {}, primeraVez = {};
  const servicios = {}, ingresosServicio = {}, metodos = {}, modalidades = {}, estados = {};
  const porPersona = {}, ingresosPersona = {};
  const mapa = [0, 1, 2, 3, 4, 5, 6].map(function () { return []; });

  filas.forEach(function (f) {
    const fecha = ymd_(f.Fecha_Cita);
    if (!fecha) return;
    const solicitud = ymd_(f.Fecha_Solicitud) || fecha;
    if (solicitud > r.ultimaSolicitud) r.ultimaSolicitud = solicitud;
    const estado = String(f.Estado || '');
    if (completo) sumarConteo_(estados, estado || 'Sin estado');
    const mes = fecha.slice(0, 7);
    if (/cancel/i.test(estado)) {
      r.canceladas++;
      if (mes in idx) canceladasMes[idx[mes]]++;
      return;
    }
    r.total++;
    const monto = toNumber_(f.Total) || 0;
    if (mes in idx) { porMes[idx[mes]]++; ingresosMes[idx[mes]] += monto; }
    if (fecha > hace30 && fecha <= hoy) { r.ultimos30++; r.ingresos30 += monto; }
    else if (fecha > hace60 && fecha <= hace30) { r.previos30++; r.ingresosPrevios30 += monto; }
    if (fecha > hoy && fecha <= en30) r.proximas++;
    const cliente = String(f.Telefono || '').replace(/\D/g, '').slice(-10) || String(f.Cliente || '').trim().toLowerCase();
    if (cliente) {
      clientes[cliente] = (clientes[cliente] || 0) + 1;
      if (!primeraVez[cliente] || fecha < primeraVez[cliente]) primeraVez[cliente] = fecha;
    }
    if (!completo) return;
    const cupon = String(f.Cupon || '').trim();
    if (cupon && cupon !== 'N/A') r.conCupon++;
    const lineas = String(f.Servicios || '').split(/\s*,\s*/).filter(String);
    lineas.forEach(function (s) {
      sumarConteo_(servicios, s);
      sumarConteo_(ingresosServicio, s, lineas.length ? monto / lineas.length : 0);
    });
    sumarConteo_(metodos, f.Metodo_Pago);
    sumarConteo_(modalidades, f.Modalidad);
    // bookeaa team: citas y facturación de cada persona.
    if (String(f.Profesional || '').trim()) {
      sumarConteo_(porPersona, f.Profesional);
      sumarConteo_(ingresosPersona, f.Profesional, monto);
    }
    const hora = horaTexto_(f.Hora_Cita);
    if (hora) {
      const h = Number(hora.slice(0, 2));
      const d = diaSemana_(fecha);
      mapa[d][h] = (mapa[d][h] || 0) + 1;
    }
  });

  const ids = Object.keys(clientes);
  ids.forEach(function (c) { const m = primeraVez[c].slice(0, 7); if (m in idx) clientesNuevosMes[idx[m]]++; });
  const out = {
    meses: meses, porMes: porMes, ingresosMes: ingresosMes.map(round2_), canceladasMes: canceladasMes,
    total: r.total, canceladas: r.canceladas, ultimos30: r.ultimos30, previos30: r.previos30,
    ingresos30: round2_(r.ingresos30), ingresosPrevios30: round2_(r.ingresosPrevios30),
    proximas: r.proximas, ultimaSolicitud: r.ultimaSolicitud,
    clientes: ids.length, recurrentes: ids.filter(function (c) { return clientes[c] > 1; }).length,
  };
  if (!completo) return out;
  // Horas con alguna cita (para no dibujar la madrugada vacía).
  let hMin = 24, hMax = -1;
  mapa.forEach(function (fila) { fila.forEach(function (n, h) { if (n) { hMin = Math.min(hMin, h); hMax = Math.max(hMax, h); } }); });
  if (hMax < 0) { hMin = 8; hMax = 18; }
  out.clientesNuevosMes = clientesNuevosMes;
  out.conCupon = r.conCupon;
  out.ticket = r.total ? round2_(ingresosMes.reduce(function (a, b) { return a + b; }, 0) / Math.max(1, porMes.reduce(function (a, b) { return a + b; }, 0))) : 0;
  out.servicios = rankingConteo_(servicios, 10).map(function (s) { return { nombre: s.nombre, n: s.n, ingresos: round2_(ingresosServicio[s.nombre] || 0) }; });
  out.metodos = rankingConteo_(metodos, 8);
  out.modalidades = rankingConteo_(modalidades, 6);
  out.estados = rankingConteo_(estados, 8);
  out.porPersona = rankingConteo_(porPersona, 30).map(function (p) { return { nombre: p.nombre, n: p.n, ingresos: round2_(ingresosPersona[p.nombre] || 0) }; });
  out.horas = { desde: hMin, hasta: hMax, dias: DIAS_SEMANA_CORTO, mapa: mapa.map(function (fila) { const v = []; for (let h = hMin; h <= hMax; h++) v.push(fila[h] || 0); return v; }) };
  return out;
}

/** Lo cobrado por bookeaa por mes (pestaña Pagos, en USD). */
function ingresosBookeaa_(meses) {
  const idx = {};
  meses.forEach(function (m, i) { idx[m] = i; });
  const total = meses.map(function () { return 0; });
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Pagos');
  if (!sheet || sheet.getLastRow() < 2) return total;
  sheet.getRange(2, 1, sheet.getLastRow() - 1, 4).getValues().forEach(function (f) {
    const m = (ymd_(f[0]) || '').slice(0, 7);
    if (m in idx) total[idx[m]] = round2_(total[idx[m]] + toNumber_(f[3]));
  });
  return total;
}

/**
 * Panel de la central en computadora: ingresos de bookeaa, altas, reservas de toda la
 * plataforma y la actividad de cada negocio. Abre la hoja de cada negocio, así que se
 * guarda 10 minutos en caché (`fresco` la recalcula).
 */
function metricasCentral_(ahoraMs, fresco) {
  const cache = CacheService.getScriptCache();
  if (!fresco) {
    const hit = cache.get('central_metricas');
    if (hit) { try { return JSON.parse(hit); } catch (_) { /* recalcula */ } }
  }
  const hoy = Utilities.formatDate(new Date(ahoraMs), ZONA, 'yyyy-MM-dd');
  const meses = ultimosMeses_(hoy, METRICAS_MESES);
  const idx = {};
  meses.forEach(function (m, i) { idx[m] = i; });
  const filas = filasTenants_();
  const tenants = {};
  getTenants_().forEach(function (t) { tenants[t.slug] = t; });
  const altas = meses.map(function () { return 0; });
  const reservas = meses.map(function () { return 0; });
  const negocios = filas.map(function (o) {
    const n = negocioCentral_(o, hoy);
    const m = (n.creado || '').slice(0, 7);
    if (m in idx) altas[idx[m]]++;
    const t = tenants[n.slug];
    let e = null, error = '';
    try {
      if (t) e = estadisticasReservas_(getSheetData_(openTenant_(t), 'Reservaciones'), hoy, false);
    } catch (err) {
      error = String(err && err.message || err).slice(0, 120);
    }
    if (e) e.porMes.forEach(function (v, i) { reservas[i] += v; });
    return {
      slug: n.slug, nombre: n.nombre, estado: n.estado, creado: n.creado, vence: n.vence, dias: n.dias, plan: n.plan, personas: n.personas, precio: n.precio,
      reservas30: e ? e.ultimos30 : null, previas30: e ? e.previos30 : null, proximas: e ? e.proximas : null,
      clientes: e ? e.clientes : null, ultimaReserva: e ? e.ultimaSolicitud : '', porMes: e ? e.porMes.slice(-6) : [],
      error: error,
    };
  });
  const out = {
    hoy: hoy, generado: new Date(ahoraMs).toISOString(), precio: PRECIO_MENSUAL, meses: meses,
    ingresos: ingresosBookeaa_(meses), altas: altas, reservas: reservas, negocios: negocios,
  };
  try { cache.put('central_metricas', JSON.stringify(out), 600); } catch (_) { /* muy grande para la caché */ }
  return out;
}

/** Un negocio a fondo: su cobro, su configuración, sus reservas y sus pagos a bookeaa. */
function negocioDetalleCentral_(slug, ahoraMs) {
  const hoy = Utilities.formatDate(new Date(ahoraMs), ZONA, 'yyyy-MM-dd');
  const fila = filasTenants_().filter(function (o) { return normKey_(o.Slug) === normKey_(slug || ''); })[0];
  const t = getTenants_().filter(function (x) { return normKey_(x.slug) === normKey_(slug || ''); })[0];
  if (!fila || !t) return { error: 'no_existe', mensaje: 'Ese negocio no existe.' };
  const negocio = negocioCentral_(fila, hoy);
  const libro = openTenant_(t);
  const config = getConfig_(libro);
  const filasReservas = getSheetData_(libro, 'Reservaciones');
  const est = estadisticasReservas_(filasReservas, hoy, true);
  const recientes = filasReservas.slice(-12).reverse().map(function (f) {
    return {
      cliente: String(f.Cliente || ''), servicios: String(f.Servicios || ''), total: toNumber_(f.Total) || 0,
      fecha: ymd_(f.Fecha_Cita) || '', hora: horaTexto_(f.Hora_Cita), estado: String(f.Estado || ''), metodo: String(f.Metodo_Pago || ''),
    };
  });
  const pagos = pagosRecientes_(500).filter(function (p) { return normKey_(p.slug) === normKey_(negocio.slug); });
  const reportes = objetos_(hojaCon_('PagosNegocio', PAGOS_NEGOCIO_HEADERS), PAGOS_NEGOCIO_HEADERS)
    .filter(function (o) { return normKey_(o.Slug) === normKey_(negocio.slug); }).map(pagoNegocioJson_).reverse().slice(0, 20);
  return {
    negocio: negocio,
    config: {
      marca: config.marca || config.nombre_negocio || negocio.nombre, moneda: normalizarMoneda_(config.moneda),
      whatsapp: String(config.whatsapp || ''), lugar: String(config.lugar_tipo || ''), metodos: String(config.metodos_pago || ''),
      servicios: getSheetData_(libro, 'Servicios').length, ticket: String(config.ticket_reserva || '') === 'si',
    },
    estadisticas: est,
    recientes: recientes,
    pagos: pagos,
    reportes: reportes,
  };
}

// ============================================================================
// bookeaa team: varias personas, una agenda (calendario) por persona
// ============================================================================
// Pestaña Equipo de la hoja del negocio. Con equipo_activo = si y al menos una persona
// activa, la página pide con quién (o "Cualquiera disponible") y cada cita va al
// calendario de esa persona. Los bloqueos y los eventos del calendario del negocio
// siguen ocupando a todos.

const DIAS_CORTOS_EQUIPO = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];

/** "lun 09:00-18:00, sáb 09:00-14:00" → [{dia, inicio, fin}]. null si algo no se entiende. */
function parsearHorarioEquipo_(texto) {
  const out = [];
  const partes = String(texto || '').split(/[,;\n]+/).map(function (x) { return x.trim(); }).filter(Boolean);
  for (let i = 0; i < partes.length; i++) {
    const m = /^(\S+)\s+(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})$/.exec(partes[i]);
    const dia = m ? parseDia_(m[1]) : null;
    if (!m || dia === null) return null;
    const a = toMinutes_(m[2]), b = toMinutes_(m[3]);
    if (isNaN(a) || isNaN(b) || b <= a) return null;
    out.push({ dia: dia, inicio: hhmm_(a), fin: hhmm_(b) });
  }
  return out;
}

function horarioEquipoTexto_(lista) {
  return (lista || []).slice().sort(function (x, y) { return (x.dia + 6) % 7 - (y.dia + 6) % 7 || (x.inicio < y.inicio ? -1 : 1); })
    .map(function (h) { return DIAS_CORTOS_EQUIPO[h.dia] + ' ' + h.inicio + '-' + h.fin; }).join(', ');
}

/** Las personas de la pestaña Equipo (todas, activas o no). */
function equipoLeer_(ss) {
  const sheet = ss.getSheetByName('Equipo');
  if (!sheet || sheet.getLastRow() < 2) return [];
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(String);
  const col = function (h) { return headers.indexOf(h); };
  return sheet.getRange(2, 1, sheet.getLastRow() - 1, headers.length).getDisplayValues().map(function (r, i) {
    const v = function (h) { return col(h) === -1 ? '' : String(r[col(h)] || '').trim(); };
    return {
      fila: i + 2, id: v('ID'), nombre: v('Nombre'), email: v('Email').toLowerCase(), calendarioId: v('Calendario_Id'),
      foto: /^https:\/\//.test(v('Foto_URL')) ? v('Foto_URL') : '', cargo: v('Cargo'),
      servicios: v('Servicios').split(/[,;]+/).map(function (x) { return x.trim(); }).filter(Boolean),
      horario: parsearHorarioEquipo_(v('Horario')) || [], activo: !/^(no|false|0)$/i.test(v('Activo')),
      compartido: v('Compartido'),
    };
  }).filter(function (p) { return p.id && p.nombre; });
}

/** Las personas que atienden hoy por la página (vacío = el negocio trabaja con una sola agenda). */
function equipoActivo_(ss, config) {
  if (String(config.equipo_activo || '').toLowerCase() !== 'si') return [];
  return equipoLeer_(ss).filter(function (p) { return p.activo; });
}

/** Lo que ve el navegador: sin correo ni calendario. */
function equipoPublico_(equipo) {
  return equipo.map(function (p) {
    return { id: p.id, nombre: p.nombre, foto: p.foto, cargo: p.cargo, servicios: p.servicios, horarios: p.horario.length ? p.horario : null };
  });
}

/** ¿Hace todos estos servicios? Lista vacía = hace todos. */
function haceServicios_(persona, ids) {
  if (!persona.servicios.length) return true;
  const propios = persona.servicios.map(normKey_);
  return ids.every(function (id) { return propios.indexOf(normKey_(id)) !== -1; });
}

/** IDs de los servicios de un pedido (los sueltos y los de las promociones). */
function idsServiciosPedido_(ss, items, servicios) {
  items = items || {};
  const ids = (Array.isArray(items.servicios) ? items.servicios : []).map(String);
  if (Array.isArray(items.promos) && items.promos.length) {
    getPromociones_(ss, servicios || getServicios_(ss)).forEach(function (p) {
      if (items.promos.map(String).indexOf(p.ID) !== -1) p.Servicios_Incluidos.forEach(function (id) { ids.push(id); });
    });
  }
  return ids.filter(function (x, i, a) { return x && a.indexOf(x) === i; });
}

function calendarioPersona_(p) {
  if (!p.calendarioId) return null;
  try {
    return CalendarApp.getCalendarById(p.calendarioId);
  } catch (_) {
    return null;
  }
}

/** Ocupación de cada persona (solo inicio y fin): { id: [{inicio, fin}] }. */
function getOcupacionEquipo_(equipo, dias) {
  const desde = new Date();
  const hasta = new Date(desde.getTime() + (dias + 1) * 86400000);
  const out = {};
  equipo.forEach(function (p) {
    const cal = calendarioPersona_(p);
    out[p.id] = cal ? cal.getEvents(desde, hasta).map(function (ev) {
      return { inicio: ev.getStartTime().toISOString(), fin: ev.getEndTime().toISOString() };
    }) : [];
  });
  return out;
}

/**
 * A quién se le agenda la cita: la persona pedida, o con "Cualquiera" la que esté libre
 * y tenga menos citas ese día. Revisa su horario (o el del negocio) y su calendario.
 * Devuelve { persona, calendario } o { error }.
 */
function asignarPersona_(equipo, pedida, cualquiera, idsServicios, inicio, fin, fechaCita, minInicio, minFin, horariosNegocio) {
  const aptos = equipo.filter(function (p) { return haceServicios_(p, idsServicios); });
  let candidatos;
  if (pedida && pedida !== '*') {
    candidatos = aptos.filter(function (p) { return normKey_(p.id) === normKey_(pedida); });
    if (!candidatos.length) return { error: 'datos_invalidos', mensaje: 'Esa persona no hace estos servicios. Elige otra.' };
  } else {
    if (!cualquiera) return { error: 'datos_invalidos', mensaje: 'Elige con quién quieres tu cita.' };
    candidatos = aptos;
    if (!candidatos.length) return { error: 'datos_invalidos', mensaje: 'Nadie del equipo hace todos estos servicios juntos. Sepáralos en dos citas.' };
  }
  const diaSemana = Number(Utilities.formatDate(inicio, ZONA, 'u')) % 7;
  const libres = [];
  candidatos.forEach(function (p) {
    const tramos = (p.horario.length ? p.horario : horariosNegocio).filter(function (t) { return t.dia === diaSemana; });
    const dentro = tramos.some(function (t) { return minInicio >= toMinutes_(t.inicio) && minFin <= toMinutes_(t.fin); });
    if (!dentro) return;
    const cal = calendarioPersona_(p);
    if (!cal) return;
    const eventos = cal.getEvents(new Date(inicio.getTime() - 86400000), new Date(fin.getTime() + 86400000));
    if (eventos.some(function (ev) { return ev.getStartTime() < fin && ev.getEndTime() > inicio; })) return;
    const delDia = eventos.filter(function (ev) { return Utilities.formatDate(ev.getStartTime(), ZONA, 'yyyy-MM-dd') === fechaCita; }).length;
    libres.push({ persona: p, calendario: cal, carga: delDia });
  });
  if (!libres.length) {
    return { error: 'cupo_ocupado', mensaje: pedida && pedida !== '*' ? 'Ese horario de ' + candidatos[0].nombre + ' acaba de ocuparse.' : 'Ese horario acaba de ocuparse.' };
  }
  libres.sort(function (a, b) { return a.carga - b.carga; });
  return libres[0];
}

/** "Carla Pérez" → "carla-perez" (único dentro del equipo): sirve para el link ?con=. */
function idPersona_(nombre, usados) {
  const base = slug_(nombre).slice(0, 30) || 'persona';
  let id = base, n = 2;
  while (usados.indexOf(id) !== -1) id = base + '-' + n++;
  return id;
}

/**
 * Comparte un calendario con un Gmail (lo ve y lo edita en su Google Calendar y le llega un
 * correo de Google). Usa el servicio avanzado Calendar si está activado en el proyecto; si no,
 * la misma API por UrlFetchApp con el permiso de calendario que ya tiene el script.
 * Nunca lanza: devuelve {ok, error}.
 */
function compartirCalendario_(calendarioId, email, rol) {
  if (!calendarioId || !email) return { ok: false, error: 'Falta el calendario o el correo.' };
  const regla = { role: rol || 'writer', scope: { type: 'user', value: email } };
  let error = '';
  if (typeof Calendar !== 'undefined' && Calendar.Acl) {
    try {
      Calendar.Acl.insert(regla, calendarioId, { sendNotifications: true });
      return { ok: true, error: '' };
    } catch (err) {
      error = String(err && err.message || err);
    }
  }
  try {
    const r = UrlFetchApp.fetch('https://www.googleapis.com/calendar/v3/calendars/' + encodeURIComponent(calendarioId) + '/acl?sendNotifications=true', {
      method: 'post', contentType: 'application/json', payload: JSON.stringify(regla),
      headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() }, muteHttpExceptions: true,
    });
    if (r.getResponseCode() < 300) return { ok: true, error: '' };
    let msg = '';
    try { msg = JSON.parse(r.getContentText()).error.message; } catch (_) { msg = 'HTTP ' + r.getResponseCode(); }
    error = msg || error;
  } catch (err) {
    error = error || String(err && err.message || err);
  }
  console.warn('No se pudo compartir el calendario ' + calendarioId + ' con ' + email + ': ' + error);
  return { ok: false, error: String(error).slice(0, 200) };
}

/**
 * Guarda la foto de una persona del equipo subida desde Mi negocio ("data:image/jpeg;base64,…")
 * en la carpeta del negocio, visible con el enlace, y devuelve la dirección que ve la página.
 * Si no se puede, devuelve '' (se queda la foto anterior).
 */
function guardarFotoEquipo_(dataUrl, nombre, carpetaId) {
  const m = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(String(dataUrl || ''));
  if (!m) return '';
  try {
    let carpeta = null;
    try { carpeta = carpetaId ? DriveApp.getFolderById(carpetaId) : null; } catch (_) { carpeta = null; }
    const ext = m[1] === 'image/png' ? 'png' : m[1] === 'image/webp' ? 'webp' : 'jpg';
    const blob = Utilities.newBlob(Utilities.base64Decode(m[2]), m[1], 'Foto ' + limpiarTexto_(nombre, 60) + '.' + ext);
    const archivo = carpeta ? carpeta.createFile(blob) : DriveApp.createFile(blob);
    archivo.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    return 'https://lh3.googleusercontent.com/d/' + archivo.getId() + '=w400';
  } catch (err) {
    console.warn('No se pudo guardar la foto de ' + nombre + ': ' + err);
    return '';
  }
}

/** Cómo va el calendario de una persona, para Mi negocio. */
function estadoCalendarioEquipo_(p) {
  if (!p.calendarioId) return { estado: 'sin_crear', error: '' };
  if (p.compartido && p.compartido.toLowerCase() === p.email) return { estado: 'compartido', error: '' };
  if (/^error:/i.test(p.compartido || '')) return { estado: 'error', error: p.compartido.replace(/^error:\s*/i, '') };
  return { estado: 'pendiente', error: '' };
}

/**
 * Guarda el equipo desde Mi negocio o el conector: crea el calendario de cada persona nueva
 * ("Citas Carla · Spa Sol") y se lo comparte; las que salen de la lista quedan inactivas
 * (su calendario y su historial no se borran).
 */
function equipoGuardar_(ss, tenant, lista) {
  const sheet = cfgHoja_(ss, 'Equipo');
  const actuales = equipoLeer_(ss);
  const porId = {};
  actuales.forEach(function (p) { porId[p.id] = p; });
  const usados = [];
  const negocio = getConfig_(ss).marca || getConfig_(ss).nombre_negocio || tenant.nombre;
  const filas = [];
  const vistos = {};
  lista.forEach(function (n) {
    const previa = n.id && porId[n.id] ? porId[n.id] : null;
    const id = previa ? previa.id : idPersona_(n.nombre, usados.concat(Object.keys(porId)));
    usados.push(id);
    vistos[id] = true;
    const email = String(n.email || '').trim().toLowerCase();
    let calendarioId = previa ? previa.calendarioId : '';
    let compartido = previa ? previa.compartido : '';
    if (!calendarioId) {
      try {
        calendarioId = CalendarApp.createCalendar('Citas ' + limpiarTexto_(n.nombre, 60) + ' · ' + negocio, { timeZone: ZONA }).getId();
      } catch (err) {
        compartido = 'error: No se pudo crear su calendario (' + String(err && err.message || err).slice(0, 150) + ')';
      }
    }
    // Se comparte (y se reintenta en cada guardado) hasta que Google lo confirme con su correo
    // actual. Al dueño del negocio también, para que vea la agenda de cada quien.
    if (calendarioId && compartido.toLowerCase() !== email) {
      const r = compartirCalendario_(calendarioId, email, 'writer');
      compartido = r.ok ? email : 'error: ' + r.error;
      if (r.ok && tenant.email && tenant.email.toLowerCase() !== email) compartirCalendario_(calendarioId, tenant.email.toLowerCase(), 'writer');
    }
    let foto = String(n.foto || '').trim();
    if (/^data:image\//.test(foto)) foto = guardarFotoEquipo_(foto, n.nombre, tenant.carpetaId) || (previa ? previa.foto : '');
    const servicios = (Array.isArray(n.servicios) ? n.servicios : []).map(function (x) { return limpiarTexto_(x, 60); }).filter(Boolean);
    filas.push([id, paraCelda_(limpiarTexto_(n.nombre, 60)), email, calendarioId, /^https:\/\//.test(foto) ? foto.slice(0, 500) : '',
      paraCelda_(limpiarTexto_(n.cargo || '', 60)), servicios.join(', '), horarioEquipoTexto_((n.horarios || []).map(function (h) {
        return { dia: parseDia_(h.dia), inicio: hhmm_(toMinutes_(h.inicio)), fin: hhmm_(toMinutes_(h.fin)) };
      })), n.activo === false ? 'no' : 'si', compartido]);
  });
  actuales.forEach(function (p) {
    if (vistos[p.id]) return;
    filas.push([p.id, p.nombre, p.email, p.calendarioId, p.foto, p.cargo, p.servicios.join(', '), horarioEquipoTexto_(p.horario), 'no', p.compartido]);
  });
  sheet.getRange(1, 1, 1, EQUIPO_HEADERS.length).setValues([EQUIPO_HEADERS]);
  sheet.getRange(1, 1, sheet.getMaxRows(), EQUIPO_HEADERS.length).setNumberFormat('@');
  cfgReemplazar_(sheet, EQUIPO_HEADERS.length, filas);
  actualizarIndiceEquipo_(tenant.slug, filas.map(function (f) {
    return { id: f[0], nombre: f[1], email: f[2], activo: f[8] !== 'no' };
  }));
  return filas.length;
}

/** Errores del equipo antes de guardar (mismas reglas para Mi negocio y el conector). */
function equipoValidar_(datos) {
  const errores = [];
  const c = datos.config || {};
  if (c.equipo_modo && ['servicio', 'persona', 'ambos'].indexOf(String(c.equipo_modo)) === -1) errores.push('Modo: servicio, persona o ambos.');
  const lista = Array.isArray(datos.equipo) ? datos.equipo : [];
  if (lista.length > MAX_EQUIPO) errores.push('Máximo ' + MAX_EQUIPO + ' personas.');
  const correos = [];
  lista.forEach(function (p) {
    const nombre = String(p.nombre || '').trim();
    if (!nombre) { errores.push('Cada persona necesita su nombre.'); return; }
    const email = String(p.email || '').trim().toLowerCase();
    if (!/^[^\s@,]+@[^\s@,]+\.[a-z]{2,}$/i.test(email)) errores.push(nombre + ': escribe su Gmail.');
    else if (correos.indexOf(email) !== -1) errores.push(nombre + ': ese correo ya está en el equipo.');
    correos.push(email);
    const foto = String(p.foto || '').trim();
    if (foto && !/^https:\/\//.test(foto) && !/^data:image\/(jpeg|png|webp);base64,/.test(foto)) errores.push(nombre + ': la foto tiene que ser una imagen o un enlace https://');
    else if (foto.length > MAX_FOTO_EQUIPO) errores.push(nombre + ': la foto pesa mucho, prueba con otra.');
    (p.horarios || []).forEach(function (h) {
      if (parseDia_(h.dia) === null || isNaN(toMinutes_(h.inicio)) || isNaN(toMinutes_(h.fin)) || toMinutes_(h.fin) <= toMinutes_(h.inicio)) {
        errores.push(nombre + ': revisa su horario (' + (h.dia || '?') + ').');
      }
    });
  });
  if (String(c.equipo_activo || '') === 'si' && !lista.some(function (p) { return p.activo !== false; })) {
    errores.push('Para activar el equipo agrega al menos una persona activa.');
  }
  return errores;
}

// ---------- bookeaa team: quién entra a Mi negocio y qué ve ----------

// Pestaña del archivo maestro con todas las personas de todos los equipos (la llena
// equipoGuardar_). Sirve para saber, al entrar con Google, de qué negocio es cada correo
// sin abrir la hoja de cada negocio.
const EQUIPO_INDICE_HEADERS = ['Email', 'Slug', 'Persona_ID', 'Nombre', 'Activo'];
let equipoIndiceMemo_ = null;

function hojaEquipoIndice_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName('Equipo_Indice');
  if (!sheet) {
    sheet = ss.insertSheet('Equipo_Indice');
    sheet.getRange(1, 1, 1, EQUIPO_INDICE_HEADERS.length).setValues([EQUIPO_INDICE_HEADERS]).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

/** [{email, slug, id, nombre, activo}] de todos los equipos (10 min en caché). */
function equipoIndice_() {
  if (equipoIndiceMemo_) return equipoIndiceMemo_;
  const cache = CacheService.getScriptCache();
  const hit = cache.get('equipo_indice');
  if (hit) {
    try { return (equipoIndiceMemo_ = JSON.parse(hit)); } catch (_) { /* se relee */ }
  }
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Equipo_Indice');
  const filas = !sheet || sheet.getLastRow() < 2 ? [] : sheet.getRange(2, 1, sheet.getLastRow() - 1, EQUIPO_INDICE_HEADERS.length).getDisplayValues();
  equipoIndiceMemo_ = filas.map(function (r) {
    return { email: String(r[0]).trim().toLowerCase(), slug: String(r[1]).trim(), id: String(r[2]).trim(), nombre: String(r[3]).trim(), activo: !/^no$/i.test(String(r[4]).trim()) };
  }).filter(function (x) { return x.email && x.slug && x.id; });
  try { cache.put('equipo_indice', JSON.stringify(equipoIndiceMemo_), 600); } catch (_) { /* muy grande */ }
  return equipoIndiceMemo_;
}

/** Reemplaza las filas de un negocio en el índice. */
function actualizarIndiceEquipo_(slug, personas) {
  const sheet = hojaEquipoIndice_();
  const resto = sheet.getLastRow() < 2 ? [] : sheet.getRange(2, 1, sheet.getLastRow() - 1, EQUIPO_INDICE_HEADERS.length).getValues()
    .filter(function (r) { return String(r[1]).trim() && normKey_(r[1]) !== normKey_(slug); });
  const nuevas = personas.filter(function (p) { return p.email; }).map(function (p) { return [p.email, slug, p.id, p.nombre, p.activo ? 'si' : 'no']; });
  const filas = resto.concat(nuevas);
  if (sheet.getLastRow() > 1) sheet.getRange(2, 1, sheet.getLastRow() - 1, EQUIPO_INDICE_HEADERS.length).clearContent();
  if (filas.length) sheet.getRange(2, 1, filas.length, EQUIPO_INDICE_HEADERS.length).setValues(filas);
  equipoIndiceMemo_ = null;
  try { CacheService.getScriptCache().remove('equipo_indice'); } catch (_) { /* nada */ }
}

/** Cuántas personas activas tiene el equipo de un negocio (para el precio de bookeaa team). */
function personasActivas_(slug) {
  return equipoIndice_().filter(function (x) { return x.activo && normKey_(x.slug) === normKey_(slug); }).length;
}

/**
 * A qué negocios entra un correo y con qué rol: 'admin' (el correo del negocio o un
 * administrador de bookeaa) o 'equipo' (una persona del equipo: ve solo lo suyo).
 */
function accesosDe_(email, tenants) {
  const out = negociosDe_(email, tenants).map(function (t) { return { tenant: t, rol: 'admin', persona: null }; });
  equipoIndice_().forEach(function (x) {
    if (!x.activo || x.email !== email) return;
    if (out.some(function (a) { return a.tenant.slug === x.slug; })) return; // el admin ve todo
    const t = tenants.filter(function (y) { return y.slug === x.slug && tenantActivo_(y); })[0];
    if (t) out.push({ tenant: t, rol: 'equipo', persona: { id: x.id, nombre: x.nombre } });
  });
  return out;
}

/** Calendario de una persona del equipo (por id), o null. */
function calendarioDeEquipo_(libro, personaId) {
  const p = equipoLeer_(libro).filter(function (x) { return x.id === personaId; })[0];
  return p ? calendarioPersona_(p) : null;
}

/** Bloqueos de una persona: eventos de su calendario marcados por bookeaa. */
function bloqueosPersona_(cal, ahoraMs) {
  const desde = new Date(ahoraMs - 86400000);
  const hasta = new Date(ahoraMs + 120 * 86400000);
  return cal.getEvents(desde, hasta).filter(function (ev) { return ev.getTag('bookeaa') === 'bloqueo'; }).map(function (ev) {
    const todoElDia = ev.isAllDayEvent();
    return {
      id: ev.getId(), fecha: Utilities.formatDate(ev.getStartTime(), ZONA, 'yyyy-MM-dd'),
      inicio: todoElDia ? '' : Utilities.formatDate(ev.getStartTime(), ZONA, 'HH:mm'),
      fin: todoElDia ? '' : Utilities.formatDate(ev.getEndTime(), ZONA, 'HH:mm'),
      motivo: String(ev.getTitle()).replace(/^🚫\s*/, ''), todoElDia: todoElDia,
    };
  });
}

/** Crea un bloqueo en el calendario de una persona: todo el día o de inicio a fin. */
function bloquearPersona_(cal, data) {
  const fecha = String(data.fecha || '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return { error: 'datos_invalidos', mensaje: 'Elige el día.' };
  const motivo = limpiarTexto_(data.motivo || '', 80) || 'No disponible';
  let ev;
  if (data.inicio || data.fin) {
    const a = toMinutes_(data.inicio), b = toMinutes_(data.fin);
    if (isNaN(a) || isNaN(b) || b <= a) return { error: 'datos_invalidos', mensaje: 'La hora de fin va después de la de inicio.' };
    ev = cal.createEvent('🚫 ' + motivo, Utilities.parseDate(fecha + ' ' + hhmm_(a), ZONA, 'yyyy-MM-dd HH:mm'), Utilities.parseDate(fecha + ' ' + hhmm_(b), ZONA, 'yyyy-MM-dd HH:mm'));
  } else {
    ev = cal.createAllDayEvent('🚫 ' + motivo, Utilities.parseDate(fecha + ' 12:00', ZONA, 'yyyy-MM-dd HH:mm'));
  }
  ev.setTag('bookeaa', 'bloqueo');
  return { ok: true, id: ev.getId() };
}

/**
 * Lo que puede hacer una persona del equipo en Mi negocio: ver sus citas, confirmar el
 * pago de las suyas, bloquear sus horas y sus avisos. Nada de precios ni de la página.
 */
function atenderEquipo_(op, data, acceso, email, ahoraMs) {
  const tenant = acceso.tenant;
  const persona = acceso.persona;
  if (op === 'citas') {
    const desde = /^\d{4}-\d{2}-\d{2}$/.test(String(data.desde || '')) ? String(data.desde) : Utilities.formatDate(new Date(ahoraMs), ZONA, 'yyyy-MM-dd');
    const dias = Math.max(1, Math.min(62, Math.floor(Number(data.dias) || 14)));
    const libro = openTenant_(tenant);
    const config = getConfig_(libro);
    return {
      negocio: { slug: tenant.slug, nombre: config.marca || config.nombre_negocio || tenant.nombre, moneda: normalizarMoneda_(config.moneda) },
      hoy: Utilities.formatDate(new Date(ahoraMs), ZONA, 'yyyy-MM-dd'),
      citas: citasEntre_(getSheetData_(libro, 'Reservaciones'), desde, sumarDias_(desde, dias - 1))
        .filter(function (c) { return c.profesionalId === persona.id; }),
    };
  }
  if (op === 'confirmar_pago') {
    const libro = openTenant_(tenant);
    const cita = getSheetData_(libro, 'Reservaciones').filter(function (r) { return String(r.ID) === String(data.id || ''); })[0];
    if (!cita || String(cita.Profesional_ID || '') !== persona.id) return { error: 'no_existe', mensaje: 'No encontramos esa reserva entre las tuyas.' };
    if (String(cita.Estado) !== ESTADO_POR_VERIFICAR) return { ok: true, estado: String(cita.Estado) };
    actualizarReserva_(libro, cita.ID, { Estado: 'Confirmada' });
    return { ok: true, estado: 'Confirmada' };
  }
  if (op === 'bloqueos' || op === 'bloquear' || op === 'desbloquear') return atenderBloqueos_(op, data, openTenant_(tenant), tenant, persona.id, ahoraMs);
  if (op === 'vapid') return { vapid: claveVapid_(), servidor: /^https:/.test(urlWorker_()) };
  if (op === 'probar_avisos') {
    const r = llamarWorkerDetalle_('/push/evento', { tipo: 'prueba', slug: tenant.slug, persona: persona.id });
    if (r.error) return { error: 'servidor', mensaje: r.error };
    return { ok: true, equipos: r.json.equipos || 0, enviadas: r.json.enviadas || 0, fallos: r.json.fallos || [] };
  }
  if (op === 'avisos') {
    const s = data.suscripcion || {};
    if (!/^https:/.test(String(s.endpoint || ''))) return { error: 'datos_invalidos', mensaje: 'Suscripción inválida.' };
    const r = llamarWorkerDetalle_(data.quitar ? '/push/quitar' : '/push/suscribir', { slug: tenant.slug, email: email, persona: persona.id, suscripcion: s });
    return r.json && r.json.ok ? { ok: true } : { error: 'servidor', mensaje: 'No se pudieron activar los avisos. ' + (r.error || 'Intenta de nuevo.') };
  }
  return { error: 'no_autorizado', mensaje: 'Eso lo hace el administrador del negocio.' };
}

/** Ver, crear y quitar bloqueos del calendario de una persona (ella misma o el administrador). */
function atenderBloqueos_(op, data, libro, tenant, personaId, ahoraMs) {
  const cal = calendarioDeEquipo_(libro, personaId);
  if (!cal) return { error: 'no_existe', mensaje: 'Esa persona no tiene calendario todavía.' };
  if (op === 'bloquear') {
    const r = bloquearPersona_(cal, data);
    if (r.error) return r;
    limpiarCacheCatalogo_(tenant.slug);
  }
  if (op === 'desbloquear') {
    const ev = cal.getEventById(String(data.id || ''));
    if (!ev || ev.getTag('bookeaa') !== 'bloqueo') return { error: 'no_existe', mensaje: 'Ese bloqueo ya no está.' };
    ev.deleteEvent();
    limpiarCacheCatalogo_(tenant.slug);
  }
  return { ok: true, bloqueos: bloqueosPersona_(cal, ahoraMs) };
}

// ---------- Mi negocio: panel de control (cuánto hizo según sus reservas) ----------

/** yyyy-MM-dd del último día del mes de `ymd`. */
function finDeMes_(ymd) {
  const p = ymd.split('-').map(Number);
  return Utilities.formatDate(new Date(Date.UTC(p[0], p[1], 0, 12)), 'UTC', 'yyyy-MM-dd');
}

/** yyyy-MM-dd del primer día del mes `meses` atrás (0 = este mes). */
function inicioDeMes_(ymd, meses) {
  const p = ymd.split('-').map(Number);
  return Utilities.formatDate(new Date(Date.UTC(p[0], p[1] - 1 - (meses || 0), 1, 12)), 'UTC', 'yyyy-MM-dd');
}

/**
 * Rango de un período del panel y el anterior del mismo largo (para comparar):
 * hoy | semana (lunes a domingo) | mes | mes_pasado | 30 | 12m.
 */
function periodoPanel_(periodo, hoy) {
  const dif = function (a, b) { return Math.round((Date.parse(b + 'T12:00:00Z') - Date.parse(a + 'T12:00:00Z')) / 86400000); };
  let desde, hasta;
  if (periodo === 'hoy') { desde = hoy; hasta = hoy; }
  else if (periodo === 'semana') { desde = sumarDias_(hoy, -((diaSemana_(hoy) + 6) % 7)); hasta = sumarDias_(desde, 6); }
  else if (periodo === 'mes_pasado') { desde = inicioDeMes_(hoy, 1); hasta = finDeMes_(desde); }
  else if (periodo === '30') { desde = sumarDias_(hoy, -29); hasta = hoy; }
  else if (periodo === '12m') { desde = inicioDeMes_(hoy, 11); hasta = finDeMes_(hoy); }
  else { periodo = 'mes'; desde = inicioDeMes_(hoy, 0); hasta = finDeMes_(hoy); }
  let anterior;
  if (periodo === 'mes' || periodo === 'mes_pasado') {
    const ini = inicioDeMes_(desde, 1);
    anterior = { desde: ini, hasta: finDeMes_(ini) };
  } else if (periodo === '12m') {
    anterior = { desde: inicioDeMes_(desde, 12), hasta: sumarDias_(desde, -1) };
  } else {
    const largo = dif(desde, hasta) + 1;
    anterior = { desde: sumarDias_(desde, -largo), hasta: sumarDias_(desde, -1) };
  }
  return { periodo: periodo, desde: desde, hasta: hasta, anterior: anterior, porMes: periodo === '12m' };
}

/**
 * Lo que dejaron las reservas entre `desde` y `hasta`: atendidas (hasta hoy) y agendadas
 * (desde mañana), por persona del equipo, servicio, forma de pago y día (o mes). Las
 * canceladas se cuentan aparte. El dinero es el total de cada reserva en la moneda del negocio.
 */
function resumenPeriodo_(filas, desde, hasta, hoy, porMes) {
  const r = {
    reservas: 0, ingresos: 0, atendidas: 0, ingresosAtendidas: 0, agendadas: 0, ingresosAgendadas: 0,
    porVerificar: 0, ingresosPorVerificar: 0, canceladas: 0, ingresosCancelados: 0,
  };
  const personas = {}, servicios = {}, metodos = {}, tramos = {}, clientes = {};
  const sumar = function (obj, clave, monto) {
    const k = String(clave || '').trim() || '—';
    if (!obj[k]) obj[k] = { nombre: k, n: 0, ingresos: 0 };
    obj[k].n++;
    obj[k].ingresos += monto;
  };
  filas.forEach(function (f) {
    const fecha = ymd_(f.Fecha_Cita);
    if (!fecha || fecha < desde || fecha > hasta) return;
    const monto = toNumber_(f.Total) || 0;
    if (/cancel/i.test(String(f.Estado || ''))) { r.canceladas++; r.ingresosCancelados += monto; return; }
    r.reservas++;
    r.ingresos += monto;
    if (fecha <= hoy) { r.atendidas++; r.ingresosAtendidas += monto; } else { r.agendadas++; r.ingresosAgendadas += monto; }
    if (String(f.Estado || '') === ESTADO_POR_VERIFICAR) { r.porVerificar++; r.ingresosPorVerificar += monto; }
    if (String(f.Profesional || '').trim()) sumar(personas, f.Profesional, monto);
    const lineas = String(f.Servicios || '').split(/\s*,\s*/).filter(String);
    lineas.forEach(function (s) { sumar(servicios, s, lineas.length ? monto / lineas.length : 0); });
    sumar(metodos, f.Metodo_Pago, monto);
    sumar(tramos, porMes ? fecha.slice(0, 7) : fecha, monto);
    const cliente = String(f.Telefono || '').replace(/\D/g, '').slice(-10) || String(f.Cliente || '').trim().toLowerCase();
    if (cliente) clientes[cliente] = true;
  });
  const lista = function (obj, max) {
    return Object.keys(obj).map(function (k) { return { nombre: k, n: obj[k].n, ingresos: round2_(obj[k].ingresos) }; })
      .sort(function (a, b) { return b.ingresos - a.ingresos || b.n - a.n; }).slice(0, max);
  };
  // Todos los días (o meses) del rango, también los vacíos, para dibujar la serie completa.
  const serie = [];
  if (porMes) {
    for (let m = desde.slice(0, 7), i = 0; m <= hasta.slice(0, 7) && i < 24; i++) {
      serie.push({ clave: m, n: tramos[m] ? tramos[m].n : 0, ingresos: tramos[m] ? round2_(tramos[m].ingresos) : 0 });
      m = inicioDeMes_(m + '-01', -1).slice(0, 7);
    }
  } else {
    for (let d = desde, i = 0; d <= hasta && i < 400; i++, d = sumarDias_(d, 1)) {
      serie.push({ clave: d, n: tramos[d] ? tramos[d].n : 0, ingresos: tramos[d] ? round2_(tramos[d].ingresos) : 0 });
    }
  }
  Object.keys(r).forEach(function (k) { if (/^ingresos/.test(k)) r[k] = round2_(r[k]); });
  r.ticket = r.reservas ? round2_(r.ingresos / r.reservas) : 0;
  r.clientes = Object.keys(clientes).length;
  r.porPersona = lista(personas, 30);
  r.porServicio = lista(servicios, 12);
  r.porMetodo = lista(metodos, 8);
  r.serie = serie;
  return r;
}

/** Panel de Mi negocio (solo el administrador). */
function panelNegocio_(tenant, data, ahoraMs) {
  const hoy = Utilities.formatDate(new Date(ahoraMs), ZONA, 'yyyy-MM-dd');
  const p = periodoPanel_(String(data.periodo || 'mes'), hoy);
  const libro = openTenant_(tenant);
  const config = getConfig_(libro);
  const filas = getSheetData_(libro, 'Reservaciones');
  const actual = resumenPeriodo_(filas, p.desde, p.hasta, hoy, p.porMes);
  const previo = resumenPeriodo_(filas, p.anterior.desde, p.anterior.hasta, hoy, p.porMes);
  return {
    periodo: p.periodo, desde: p.desde, hasta: p.hasta, hoy: hoy, porMes: p.porMes,
    moneda: normalizarMoneda_(config.moneda),
    equipo: String(config.equipo_activo || '').toLowerCase() === 'si',
    actual: actual,
    anterior: { desde: p.anterior.desde, hasta: p.anterior.hasta, reservas: previo.reservas, ingresos: previo.ingresos, clientes: previo.clientes, canceladas: previo.canceladas },
  };
}
