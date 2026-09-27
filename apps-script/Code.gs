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
 *   4. Implementar > Nueva implementación > Aplicación web
 *      Ejecutar como: Yo · Quién tiene acceso: Cualquier persona.
 *      Copia la URL (termina en /exec) para usarla como VITE_API_URL en el front.
 *   Cada vez que cambies este código: Implementar > Gestionar implementaciones >
 *   editar > Nueva versión (la URL se mantiene).
 */

const TOKEN = 'Bookeav1.1.1';
const ZONA = 'America/Caracas';
const PAGO_MOVIL = 'Bolívares (Pago Móvil)';
// Etiquetas conocidas. La hoja de cada negocio decide cuáles se ofrecen (config.metodos_pago).
const METODOS_PAGO = ['Pago en la cita', 'Pago en el lugar', PAGO_MOVIL];
const MAX_COMPROBANTE_BYTES = 6 * 1024 * 1024;
const CARPETA_RAIZ = 'SaaS-Reservas';
const NOMBRE_CARPETA_NEGOCIOS = 'Negocios';
const PROPIEDAD_TEMPLATE = 'tenant_plantilla_id';

const SHEETS = [
  {
    name: 'Reservaciones',
    headers: ['ID', 'Fecha_Solicitud', 'Cliente', 'Telefono', 'Servicios', 'Total', 'Fecha_Cita', 'Hora_Cita',
      'Metodo_Pago', 'Referencia', 'Cupon', 'Estado', 'Tasa_BCV', 'Total_Bs',
      'Modalidad', 'Direccion', 'Recargo', 'Comprobante'],
  },
  { name: 'Servicios', headers: ['ID', 'Nombre', 'Precio', 'Duracion_Min', 'Tipo'] },
  { name: 'Promociones', headers: ['ID', 'Nombre', 'Servicios_Incluidos', 'Precio_Promo'] },
  { name: 'Cupones', headers: ['Codigo', 'Descuento_Porcentaje', 'Descuento_Monto', 'Usos_Restantes'] },
  { name: 'Configuracion', headers: ['Clave', 'Valor'] },
  { name: 'Horarios', headers: ['Dia', 'Hora_Inicio', 'Hora_Fin'] },
  { name: 'Bloqueos', headers: ['Fecha', 'Hora_Inicio', 'Hora_Fin', 'Motivo'] },
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
  ['zona_horaria', ZONA],
  ['paleta', 'Rosa Clásico'], // dropdown: aplica base/soft/deep a la vez
  ['tema_base', ''], // hex manual; si está vacío manda la paleta
  ['tema_soft', ''],
  ['tema_deep', ''],
  ['tema_estilo', 'elegante'], // elegante | moderno | editorial | amable
  ['hero_titulo', ''],
  ['hero_subtitulo', ''],
  ['permite_domicilio', 'si'], // si | no
  ['metodos_pago', 'Pago en la cita, Bolívares (Pago Móvil)'],
  ['moneda', 'EUR'], // EUR | USD | Bs
  ['pm_banco', ''],
  ['pm_telefono', ''],
  ['pm_cedula', ''],
  ['tasa_eur_manual', ''],
  ['tasa_usd_manual', ''],
  ['recargo_domicilio_pct', '20'],
  ['minutos_extra_domicilio', '15'],
  ['direccion_spa', ''],
  ['direccion_spa_url', ''],
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

/** Elegante y editorial usan serif; moderno y amable, sans. */
const ESTILOS = ['elegante', 'moderno', 'editorial', 'amable'];

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
    .addItem('Aplicar paleta elegida', 'promptAplicarPaleta')
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

function promptAplicarPaleta() {
  const ui = SpreadsheetApp.getUi();
  const r = ui.prompt('Aplicar paleta elegida', 'Slug del negocio (ej. "mariana")', ui.ButtonSet.OK_CANCEL);
  if (r.getSelectedButton() !== ui.Button.OK) return;
  try {
    ui.alert(aplicarPaletaElegida(r.getResponseText()));
  } catch (err) {
    ui.alert('Error: ' + err.message);
  }
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

/** Prepara una hoja de negocio: pestañas, encabezados, config y formato. */
function prepararHoja_(ss, nombrePorDefecto) {
  // Los encabezados de la hoja toman el color del negocio: hex manual > paleta > rosa.
  const previa = getConfig_(ss);
  const paletaPrevia = paletaPorNombre_(previa.paleta || '');
  const colorCabecera = previa.tema_base || (paletaPrevia && paletaPrevia.base) || PALETAS[0].base;
  SHEETS.forEach(function (s) {
    let sheet = ss.getSheetByName(s.name);
    if (!sheet) {
      sheet = ss.insertSheet(s.name);
      sheet.appendRow(s.headers);
    } else {
      const lastCol = Math.max(sheet.getLastColumn(), 1);
      const current = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(String);
      s.headers.forEach(function (h) {
        if (current.indexOf(h) === -1) sheet.getRange(1, sheet.getLastColumn() + 1).setValue(h);
      });
    }
    sheet.getRange(1, 1, 1, sheet.getLastColumn()).setFontWeight('bold').setBackground(colorCabecera);
    sheet.setFrozenRows(1);
  });

  const config = ss.getSheetByName('Configuracion');
  config.getRange('A:B').setNumberFormat('@');
  const existentes = getConfig_(ss);
  CONFIG_DEFAULTS.forEach(function (kv) {
    if (!(kv[0] in existentes)) config.appendRow(kv);
  });
  if (!(existentes['marca'])) setConfigKey_(config, 'marca', nombrePorDefecto);
  aplicarOpcionesTema_(config);

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
}

/**
 * Dropdown de paleta y de tipografía en Configuracion, más una muestra de color en la
 * celda de la paleta para no tener que imaginarse cómo queda.
 */
function aplicarOpcionesTema_(configSheet) {
  const data = configSheet.getDataRange().getValues();
  let celdaPaleta = null;
  for (let i = 1; i < data.length; i++) {
    const clave = normKey_(data[i][0]);
    if (clave === 'paleta') {
      celdaPaleta = configSheet.getRange(i + 1, 2);
      celdaPaleta.setDataValidation(
        SpreadsheetApp.newDataValidation()
          .requireValueInList(PALETAS.map(function (p) { return p.nombre; }), true)
          .setAllowInvalid(false)
          .build()
      );
      celdaPaleta.setNote(
        'Elige aquí y luego pulsa "SaaS Reservas → Aplicar paleta elegida" en la hoja maestra: eso escribe ' +
        'tema_base, tema_soft y tema_deep.\n\n' +
        'Ojo: si escribes un hex a mano en esas tres filas, ese hex gana sobre esta paleta. Si cambias la ' +
        'paleta y la web no cambia de color, vuelve a pulsar "Aplicar paleta elegida".'
      );
    } else if (clave === 'temaestilo') {
      configSheet.getRange(i + 1, 2).setDataValidation(
        SpreadsheetApp.newDataValidation().requireValueInList(ESTILOS, true).setAllowInvalid(false).build()
      );
    }
  }
  if (!celdaPaleta) return;
  const nombres = PALETAS.map(function (p) { return p.nombre; });
  const viejas = configSheet.getConditionalFormatRules().filter(function (r) {
    return nombres.indexOf(r.getText()) !== -1;
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

/** Escribe los tres hex de la paleta para que la hoja quede documentada. */
function aplicarPaleta(slug, nombrePaleta) {
  const tenant = getTenantPorSlug_(String(slug || '').trim());
  if (!tenant) throw new Error('No encontré el negocio: ' + slug);
  const paleta = paletaPorNombre_(nombrePaleta);
  if (!paleta) {
    throw new Error(
      'No reconocí la paleta "' + nombrePaleta + '".\n\nElige una del dropdown de la fila "paleta" ' +
      'en Configuracion. Opciones:\n' + PALETAS.map(function (p) { return p.nombre; }).join(' · ')
    );
  }
  const config = openTenant_(tenant).getSheetByName('Configuracion');
  setConfigKey_(config, 'paleta', paleta.nombre);
  setConfigKey_(config, 'tema_base', paleta.base);
  setConfigKey_(config, 'tema_soft', paleta.soft);
  setConfigKey_(config, 'tema_deep', paleta.deep);
  limpiarCacheCatalogo_(tenant.slug); // el color se ve al instante, sin esperar el TTL
  Logger.log('Paleta "' + paleta.nombre + '" aplicada a ' + tenant.nombre);
  return paleta.nombre;
}

/** Lee la paleta de la propia celda del negocio y la materializa. El menú usa esta. */
function aplicarPaletaElegida(slug) {
  const tenant = getTenantPorSlug_(String(slug || '').trim());
  if (!tenant) throw new Error('No encontré el negocio: ' + slug);
  const elegida = getConfig_(openTenant_(tenant)).paleta || '';
  if (!elegida) {
    throw new Error(
      'La fila "paleta" de ' + tenant.nombre + ' está vacía.\n\n' +
      'Abre su hoja, pestaña Configuracion, y elige una del dropdown. ' +
      'Si no aparece la lista, corre antes "Actualizar un negocio" sobre ' + tenant.slug + '.'
    );
  }
  const paleta = paletaPorNombre_(elegida);
  if (!paleta) {
    throw new Error(
      'No reconocí "' + elegida + '" como una paleta de ' + tenant.nombre + '.\n\n' +
      'Escribe una de estas:\n' + PALETAS.map(function (p) { return '  ' + p.nombre; }).join('\n')
    );
  }
  aplicarPaleta(tenant.slug, paleta.nombre);
  return (
    'Paleta "' + paleta.nombre + '" aplicada a ' + tenant.nombre + '.\n\n' +
    'base ' + paleta.base + ' · soft ' + paleta.soft + ' · deep ' + paleta.deep
  );
}

/** Re-aplica a un negocio ya creado lo que le falte (claves nuevas, dropdowns). No borra datos. */
function actualizarTenant(slug) {
  const tenant = getTenantPorSlug_(String(slug || '').trim());
  if (!tenant) throw new Error('No encontré el negocio: ' + slug);
  const ss = openTenant_(tenant);
  prepararHoja_(ss, tenant.nombre);
  limpiarCacheCatalogo_(tenant.slug);
  limpiarCacheTenants_();
  Logger.log('Hoja actualizada: ' + ss.getUrl());
  return 'Hoja de "' + tenant.nombre + '" actualizada (claves nuevas, dropdowns y colores).\n' + ss.getUrl();
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
    if (p.token !== TOKEN) return json_({ error: 'no_autorizado' });

    if (p.action === 'directorio') return json_({ directorio: directorio_() });

    const tenant = getTenantPorParametro_(p);
    if (!tenant) return json_({ error: 'no_tenant', mensaje: 'Este negocio no existe o está desactivado.' });

    // Catálogo: de la caché si se puede, antes de tocar una sola hoja.
    // fresh=1 salta la lectura pero vuelve a llenar la caché: lo usa la pantalla de
    // agenda para ver la ocupación real sin esperar los 5 minutos de TTL.
    // Solo el catálogo (GET sin action) se cachea; cupon y demás van directo a la hoja.
    if (!p.action && p.fresh !== '1') {
      const hit = leerCacheCatalogo_(tenant.slug);
      if (hit) return jsonDeTexto_(hit);
    }

    const ss = openTenant_(tenant);

    if (p.action === 'cupon') {
      const cupon = buscarCupon_(ss, p.codigo);
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
      config: config, // la lista de cupones NO se envía al navegador
      horarios: getHorarios_(ss, config),
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
    return jsonDeTexto_(texto);
  } catch (err) {
    console.error(err);
    return json_({ error: 'servidor', mensaje: 'Error del servidor. Intenta de nuevo.' });
  }
}

function directorio_() {
  return getTenants_()
    .filter(tenantActivo_)
    .map(function (t) { return { slug: t.slug, nombre: t.nombre }; });
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
  if (data.token !== TOKEN) return json_({ error: 'no_autorizado' });

  const tenant = getTenantPorParametro_(data);
  if (!tenant) return json_({ error: 'no_tenant', mensaje: 'Este negocio no existe o está desactivado.' });

  // Se arman dentro del bloque y se usan después.
  let ss, config, orden, calendar, evento, inicio, fin, serviciosTexto, comprobanteUrl = '';
  let cliente, telefono, fechaCita, horaCita, metodoPago, esPagoMovil, modalidad, direccion, comprobante;
  let moneda, id, tasa = null, totalBs = null;

  try {
    ss = openTenant_(tenant);
    config = getConfig_(ss);
    const zona = config.zona_horaria || ZONA;
    moneda = normalizarMoneda_(config.moneda);

    // --- Validación de datos ---
    cliente = String(data.cliente || '').trim();
    telefono = String(data.telefono || '').trim();
    fechaCita = String(data.fechaCita || '');
    horaCita = String(data.horaCita || '');
    metodoPago = String(data.metodoPago || '');
    esPagoMovil = metodoPago === PAGO_MOVIL;
    modalidad = String(data.modalidad || '');
    // A domicilio la clienta envía su ubicación por WhatsApp; el campo es opcional.
    const direccion = String(data.direccion || '').trim() || (data.modalidad === 'domicilio' ? 'Ubicación por WhatsApp' : '');
    const comprobante = data.comprobante && data.comprobante.base64 ? data.comprobante : null;

    if (cliente.length < 2 || telefono.replace(/\D/g, '').length < 10 ||
        !/^\d{4}-\d{2}-\d{2}$/.test(fechaCita) || !/^\d{2}:\d{2}$/.test(horaCita)) {
      return json_({ error: 'datos_invalidos', mensaje: 'Revisa tus datos e intenta de nuevo.' });
    }
    if (METODOS_PAGO.indexOf(metodoPago) === -1 || !esMetodoPermitido_(config, metodoPago)) {
      return json_({ error: 'datos_invalidos', mensaje: 'Selecciona un método de pago.' });
    }
    const permiteDomicilio = permiteDomicilio_(config);
    if (modalidad !== 'spa' && modalidad !== 'domicilio') {
      return json_({ error: 'datos_invalidos', mensaje: 'Elige si la cita es en el spa o a domicilio.' });
    }
    if (modalidad === 'domicilio' && !permiteDomicilio) {
      return json_({ error: 'datos_invalidos', mensaje: 'Este negocio no ofrece citas a domicilio.' });
    }
    if (esPagoMovil && !comprobante) {
      return json_({ error: 'datos_invalidos', mensaje: 'Falta el capture del Pago Móvil.' });
    }
    if (comprobante && (String(comprobante.base64).length * 3) / 4 > MAX_COMPROBANTE_BYTES) {
      return json_({ error: 'datos_invalidos', mensaje: 'La imagen del capture es demasiado grande.' });
    }

    // --- Reintento de una reserva que ya se guardó ---
    // Si esta misma reservaId ya tiene fila, el cliente se quedó sin respuesta la
    // primera vez y está reintentando. Se devuelve el éxito tal cual: seguir a la
    // comprobación de disponibilidad daría "ocupado" por el evento que él mismo
    // acaba de crear, y la reserva se perdería sin dejar rastro en la hoja.
    const previa = data.reservaId ? buscarReservaPorId_(ss, data.reservaId, fechaCita, horaCita) : null;
    if (previa) return json_(previa);

    // --- El total se recalcula aquí; no se confía en el que manda el navegador ---
    const orden = calcularOrden_(ss, data.items, data.cupon, modalidad, config);
    if (orden.lineas.length === 0 || !orden.hasBase) {
      return json_({ error: 'datos_invalidos', mensaje: 'Tu orden necesita al menos un servicio base.' });
    }
    if (data.cupon && !orden.cupon) {
      return json_({ error: 'cupon_invalido', mensaje: 'El cupón ya no es válido.' });
    }

    // --- Disponibilidad ---
    inicio = Utilities.parseDate(fechaCita + ' ' + horaCita, zona, 'yyyy-MM-dd HH:mm');
    fin = new Date(inicio.getTime() + orden.duracion * 60000);
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

    calendar = getCalendarioTenant_(tenant);
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
    // fresca se busca DESPUÉS de escribir la fila, y si sale se parchea la celda.
    tasa = moneda === 'BS' ? null : tasaCache_(moneda, ss);
    totalBs = moneda === 'BS' ? orden.total : tasa ? round2_(orden.total * tasa.valor) : null;

    id = String(data.reservaId || '') || Utilities.getUuid();
    serviciosTexto = orden.lineas.map(function (l) { return l.nombre; }).join(', ');

    // === Fin de la sección crítica ===
    // Hasta acá solo hay lecturas y validaciones. El cupón se descuenta porque
    // quedarse sin usos es pérdida directa, el evento se crea porque es lo que
    // ocupa el cupo, y la fila se escribe inmediatamente después, sin ninguna
    // llamada externa de por medio. La reserva es el registro que no se puede
    // perder: hasta que su fila no está escrita, el evento se puede deshacer.
    if (orden.cupon) descontarCupon_(ss, orden.cupon);
    evento = calendar
      ? calendar.createEvent(
        (modalidad === 'domicilio' ? '🏠 Domicilio · ' : '') + 'Cita: ' + cliente + ' - ' + serviciosTexto,
        inicio, fin, { location: ubicacionDe_(config, modalidad, direccion) }
      )
      : null;

    appendByHeaders_(ss.getSheetByName('Reservaciones'), {
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
      Modalidad: modalidad === 'domicilio' ? 'A domicilio' : 'En el spa',
      Direccion: modalidad === 'domicilio' ? direccion : 'Spa',
      Recargo: orden.recargo,
      // El capture se sube después; mientras tanto la fila dice que falta.
      Comprobante: comprobante ? 'pendiente' : 'N/A',
    });

    limpiarCacheCatalogo_(tenant.slug); // la ocupación cambió: la próxima carga recalcula
  } catch (err) {
    console.error(err);
    // Quedó un evento sin fila detrás. Es peor que no tener evento: la hora
    // aparecería ocupada con nadie registrado. Se borra para que la clienta
    // pueda reintentar sin nada a medias.
    if (evento) {
      try {
        evento.deleteEvent();
      } catch (e2) {
        console.warn('No se pudo borrar el evento huérfano: ' + e2);
      }
      limpiarCacheCatalogo_(tenant.slug);
    }
    return json_({ error: 'servidor', mensaje: 'No se pudo guardar la reserva. Intenta de nuevo.' });
  }

  // ============ La reserva ya está guardada: esto es extra ============
  // A partir de acá nada puede hacer que la reserva se pierda. Cada paso lleva su
  // propio try/catch: si falla, se avisa con console.warn y se sigue respondiendo
  // éxito, porque la clienta tiene que poder mandarle el resumen por WhatsApp
  // aunque el capture no se haya podido subir.
  const respuesta = {
    success: true,
    id: id,
    total: orden.total,
    totalBs: totalBs,
    tasa: tasa ? tasa.valor : null,
    comprobanteUrl: null,
  };

  if (comprobante) {
    try {
      comprobanteUrl = guardarComprobante_(
        comprobante,
        fechaCita + '_' + horaCita.replace(':', '') + '_' + slug_(cliente) + '_' + id.slice(0, 8),
        tenant.carpetaId
      ) || '';
      actualizarReserva_(ss, id, { Comprobante: comprobanteUrl || 'no se pudo subir' });
      respuesta.comprobanteUrl = comprobanteUrl || null;
    } catch (err) {
      console.warn('No se pudo subir el capture: ' + err);
      try { actualizarReserva_(ss, id, { Comprobante: 'no se pudo subir' }); } catch (e2) { /* nada */ }
    }
  }

  // Tasa fresca: ahora que la reserva está a salvo se puede pedir sin apuro.
  if (moneda !== 'BS') {
    try {
      const fresca = getTasa(moneda, ss);
      if (fresca && (!tasa || fresca.valor !== tasa.valor)) {
        tasa = fresca;
        totalBs = round2_(orden.total * tasa.valor);
        actualizarReserva_(ss, id, { Tasa_BCV: fresca.valor, Total_Bs: totalBs });
        respuesta.totalBs = totalBs;
        respuesta.tasa = fresca.valor;
      }
    } catch (err) {
      console.warn('No se pudo actualizar la tasa: ' + err);
    }
  }

  // El evento nació sin detalle para ocupar el cupo rápido; ahora se completa.
  if (evento) {
    try {
      evento.setLocation(ubicacionDe_(config, modalidad, direccion));
      evento.setDescription([
        'Teléfono: ' + telefono,
        modalidad === 'domicilio'
          ? 'A domicilio: ' + direccion + ' (incluye ' + config_min_extra_(config) + ' min de traslado)'
          : 'En el spa',
        'Total: ' + orden.total.toFixed(2) + ' ' + moneda + (totalBs !== null ? ' (Bs. ' + totalBs.toFixed(2) + ')' : '') +
          (orden.recargo > 0 ? ' · recargo domicilio ' + orden.recargo.toFixed(2) + ' ' + moneda : ''),
        'Pago: ' + metodoPago,
        'Capture: ' + (comprobanteUrl || 'N/A'),
        'Cupón: ' + (orden.cupon ? orden.cupon.codigo : 'N/A'),
        'ID: ' + id,
      ].join('\n'));
    } catch (err) {
      console.warn('No se pudo completar el evento: ' + err);
    }
  }

  // Cada paso de arriba tiene su propio try/catch, así que llegar acá significa que
  // ninguno falló. Si alguno se escapara, la fila ya está escrita y se responde
  // éxito igual: perder la respuesta dejaría a la clienta creyendo que falló algo
  // que sí quedó guardado.
  return json_(respuesta);
}

/** Dirección que se pone en el evento del calendario. */
function ubicacionDe_(config, modalidad, direccion) {
  if (modalidad === 'domicilio') return direccion;
  return (config.direccion_spa ? config.direccion_spa + ' · ' : '') + (config.direccion_spa_url || '');
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
  // DolarApi primero: responde rápido y es el que suele funcionar. El scrape del BCV
  // queda de respaldo porque bcv.org.ve tarda mucho y no tiene timeout configurable.
  const tasa = tasaDolarApi_(moneda) || tasaBCV_(moneda);
  if (tasa) {
    props.setProperty(cacheKey + '_ultima', JSON.stringify(tasa));
    cache.put(cacheKey, JSON.stringify(tasa), 3 * 60 * 60);
    return tasa;
  }

  const ultima = props.getProperty(cacheKey + '_ultima');
  if (ultima) {
    const t = JSON.parse(ultima);
    t.fuente += ' (último valor conocido)';
    cache.put(cacheKey, JSON.stringify(t), 15 * 60);
    return t;
  }

  const manual = toNumber_(getConfig_(ss)['tasa_' + sufijo + '_manual']);
  return manual > 0 ? { valor: round2_(manual), fecha: null, fuente: 'Manual' } : null;
}

/**
 * Tasa desde caché, último valor conocido o valor manual, sin salir a la red.
 * Es la que usa la reserva: el cupo depende de la fila, no del tipo de cambio, y
 * bcv.org.ve no tiene timeout configurable. La versión en fresco se pide después
 * de guardar la fila y solo para mostrarla.
 */
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

function jsonDeTexto_(texto) {
  return ContentService.createTextOutput(texto).setMimeType(ContentService.MimeType.JSON);
}

// ---------- Caché del catálogo ----------

/** 5 minutos: rápido en visitas repetidas y la ocupación nunca se va tan lejos. */
const CACHE_CATALOGO_SEG = 5 * 60;
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
  if (!carpetaId) return '';
  const carpeta = DriveApp.getFolderById(carpetaId);
  const mime = /^image\/(jpeg|png|webp|heic|heif)$/.test(comprobante.mime) ? comprobante.mime : 'image/jpeg';
  const ext = mime === 'image/png' ? '.png' : mime === 'image/webp' ? '.webp' : '.jpg';
  const blob = Utilities.newBlob(Utilities.base64Decode(comprobante.base64), mime, nombreBase + ext);
  return carpeta.createFile(blob).getUrl();
}

// ---------- Catálogo tolerante (misma lógica que src/lib/normalize.ts) ----------

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
  console.log('Estilo: ' + (config.tema_estilo || 'elegante'));
  // El hex escrito a mano gana sobre la paleta, así que pueden quedar despistados.
  if (paleta && (config.tema_base || config.tema_soft || config.tema_deep)) {
    const coinciden = config.tema_base === paleta.base && config.tema_soft === paleta.soft && config.tema_deep === paleta.deep;
    if (!coinciden) {
      console.warn(
        'La paleta dice "' + paleta.nombre + '" pero tema_base/soft/deep tienen otros hex: mandan los hex. ' +
        'Si quieres que mande la paleta, pulsa "Aplicar paleta elegida" o borra los tres hex.'
      );
    }
  }
  console.log('Moneda: ' + normalizarMoneda_(config.moneda));
  console.log('Permite domicilio: ' + (permiteDomicilio_(config) ? 'sí' : 'no'));
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
  sheet.appendRow(headers.map(function (h) { return h in record ? record[h] : ''; }));
}

/** Índice (base 0) de una columna por su encabezado, o -1 si no existe. */
function columna_(headers, nombre) {
  return headers.map(String).indexOf(nombre);
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
    return {
      success: true,
      id: String(reservaId),
      total: total === null || total === '' ? null : toNumber_(total),
      totalBs: totalBs === null || totalBs === '' ? null : toNumber_(totalBs),
      tasa: tasa === null || tasa === '' ? null : toNumber_(tasa),
      // Lo único que sirve de la columna es un enlace a Drive; el resto son
      // marcadores como "pendiente" o "no se pudo subir".
      comprobanteUrl: /^https:\/\//.test(comp) ? comp : null,
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
