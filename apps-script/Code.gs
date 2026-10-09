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

const SHEETS = [
  {
    name: 'Reservaciones',
    headers: ['ID', 'Fecha_Solicitud', 'Cliente', 'Telefono', 'Servicios', 'Total', 'Fecha_Cita', 'Hora_Cita',
      'Metodo_Pago', 'Referencia', 'Cupon', 'Estado', 'Tasa_BCV', 'Total_Bs',
      'Modalidad', 'Direccion', 'Recargo', 'Comprobante', 'Recibo_N'],
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

const TENANT_HEADERS = ['Slug', 'Nombre', 'Spreadsheet_Id', 'Calendario_Id', 'Carpeta_Id', 'Token', 'Activo', 'Email', 'Creado'];

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
    try { calendario.addOwner(email); } catch (_) {}
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
    .addItem('Bot de WhatsApp: generar token', 'promptGenerarTokenBot')
    .addItem('Bot de WhatsApp: avisos y calendario', 'promptAjustesBot')
    .addItem('Bot de WhatsApp: probar agenda', 'probarAgendaBot')
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
    const tramos = getHorarios_(ss, config).filter(function (t) { return t.dia === diaSemana; });
    const dentro = tramos.some(function (t) {
      return minInicio >= toMinutes_(t.inicio) && minFin <= toMinutes_(t.fin);
    });
    if (!dentro) {
      return json_({ error: 'cupo_ocupado', mensaje: 'Ese horario está fuera de nuestro horario de atención.' });
    }
    const bloqueado = getBloqueos_(ss, diasDeReserva_(config)).some(function (b) { return b.inicio < fin && b.fin > inicio; });
    if (bloqueado) {
      return json_({ error: 'cupo_ocupado', mensaje: 'Ese horario no está disponible.' });
    }

    const calendar = getCalendarioTenant_(tenant);
    if (calendar) {
      const choques = calendar.getEvents(new Date(inicio.getTime() - 86400000), new Date(fin.getTime() + 86400000))
        .filter(function (ev) { return ev.getStartTime() < fin && ev.getEndTime() > inicio; });
      if (choques.length > 0) {
        return json_({ error: 'cupo_ocupado', mensaje: 'Ese horario acaba de ocuparse.' });
      }
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
              modalidad === 'domicilio'
                ? 'A domicilio: ' + direccion + ' (incluye ' + config_min_extra_(config) + ' min de traslado)'
                : lugarTexto + (sede.direccion ? ' · ' + sede.direccion : ''),
              lineaTotalEvento_(orden, moneda, esPagoMovil ? totalBs : null, esPagoMovil && tasa ? tasa.valor : null),
              'Pago: ' + metodoPago,
              'Capture: ' + (comprobanteUrl || 'N/A'),
              'Cupón: ' + (orden.cupon ? orden.cupon.codigo : 'N/A'),
              'ID: ' + id,
            ].join('\n'),
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
    const negocios = negociosDe_(email, getTenants_());
    if (!negocios.length) return { error: 'sin_negocio', mensaje: email + ' no tiene un negocio en bookeaa. Entra con el correo que diste al afiliarte.' };
    return {
      sesion: crearSesion_(email, ahoraMs), email: email, vapid: claveVapid_(),
      negocios: negocios.map(function (t) { return { slug: t.slug, nombre: t.nombre }; }),
    };
  }

  const email = leerSesion_(data.sesion, ahoraMs);
  if (!email) return { error: 'sesion', mensaje: 'Tu sesión venció. Entra otra vez.' };
  const tenant = negociosDe_(email, getTenants_()).filter(function (t) { return t.slug === String(data.slug || ''); })[0];
  if (!tenant) return { error: 'no_autorizado', mensaje: 'Ese negocio no es tuyo.' };

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
  if (op === 'avisos') {
    const s = data.suscripcion || {};
    if (!/^https:\/\//.test(String(s.endpoint || ''))) return { error: 'datos_invalidos', mensaje: 'Suscripción inválida.' };
    const r = llamarWorker_(data.quitar ? '/push/quitar' : '/push/suscribir', { slug: tenant.slug, email: email, suscripcion: s });
    return r && r.ok ? { ok: true } : { error: 'servidor', mensaje: 'No se pudieron activar los avisos. Intenta de nuevo.' };
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
        .map(function (c) { return { id: c.id, cliente: c.cliente, servicios: c.servicios, fecha: c.fecha, hora: c.hora, estado: c.estado }; });
    } catch (err) {
      console.warn('agenda ' + t.slug + ': ' + err);
    }
  });
  return { fecha: fecha, agenda: agenda };
}
