/**
 * bookeaa · Configurador de la hoja de cada negocio (ventana de configuración y QR).
 *
 * Es un proyecto de Apps Script APARTE del maestro (apps-script/Code.gs): va pegado
 * en la hoja de cada negocio (Extensiones → Apps Script) junto con Sidebar.html.
 * Solo lee y escribe ESTA hoja. Preparar la hoja (pestañas, claves, plantillas)
 * es trabajo del maestro: "Actualizar un negocio" / "Actualizar todos los negocios".
 *
 * Instalación: péguelo una vez en la hoja PLANTILLA y todos los negocios nuevos lo
 * heredan (crearTenant copia la hoja con su script). En hojas ya creadas se pega a mano.
 */

const DIAS_SEMANA = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

/** Las pestañas que la ventana necesita; si falta alguna, pide actualizar la hoja. */
const PESTANAS = ['Configuracion', 'Horarios', 'Sedes', 'Mensajes'];

/** Qué claves de Configuracion puede escribir cada sección. Nada fuera de esta lista. */
const CLAVES_POR_SECCION = {
  marca: ['nombre_negocio', 'marca', 'logo_url', 'hero_titulo', 'hero_subtitulo'],
  estilo: ['tema_estilo', 'color_principal', 'color_fondo', 'paleta'],
  lugar: ['lugar_tipo', 'lugar_nombre', 'permite_domicilio', 'recargo_domicilio_pct', 'minutos_extra_domicilio'],
  mensaje: ['mensaje_plantilla'],
  horario: ['intervalo_min', 'dias_anticipacion', 'anticipacion_min_horas', 'zona_horaria', 'recordatorio_minutos'],
  pagos: ['whatsapp', 'moneda', 'metodos_pago', 'pm_banco', 'pm_telefono', 'pm_cedula', 'tasa_eur_manual', 'tasa_usd_manual'],
  comprobantes: ['facturacion_modo', 'facturacion_rif', 'facturacion_razon_social', 'facturacion_proveedor'],
};

/** Mismo texto que Code.gs y src/lib/mensajes.ts: "Restaurar las originales" las vuelve a escribir. */
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

// ---------- Menú y ventana ----------

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('bookeaa')
    .addItem('Configurar mi página', 'abrirConfigurador')
    .addItem('Generar código QR', 'abrirQr')
    .addToUi();
}

function abrirConfigurador() {
  abrirVentana_('marca');
}

function abrirQr() {
  abrirVentana_('qr');
}

/**
 * La configuración se abre como ventana grande dentro de la hoja (antes era una
 * barra lateral angosta). Si la pantalla es más chica, Sheets la achica sola.
 * `inicio` es la sección con la que abre.
 */
function abrirVentana_(inicio) {
  const plantilla = HtmlService.createTemplateFromFile('Sidebar');
  plantilla.inicio = inicio;
  const html = plantilla.evaluate().setWidth(1200).setHeight(780);
  SpreadsheetApp.getUi().showModalDialog(html, 'bookeaa · Mi página');
}

// ---------- Lectura ----------

/** Todo lo que la ventana muestra, en una sola llamada. */
function leerTodo() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const faltan = PESTANAS.filter(function (n) { return !ss.getSheetByName(n); });
  const config = leerConfig_(ss);
  return {
    config: config,
    horarios: filas_(ss, 'Horarios', 3).map(function (r) {
      return { dia: String(r[0]).trim(), inicio: hhmm_(r[1]), fin: hhmm_(r[2]) };
    }),
    sedes: filas_(ss, 'Sedes', 4).map(function (r) {
      return { nombre: String(r[0]).trim(), direccion: String(r[1]).trim(), mapsUrl: String(r[2]).trim(), activa: activa_(r[3]) };
    }).filter(function (s) { return s.nombre || s.direccion; }),
    mensajes: filas_(ss, 'Mensajes', 2).map(function (r) {
      return { nombre: String(r[0]).trim(), texto: String(r[1]) };
    }).filter(function (m) { return m.nombre; }),
    faltan: faltan,
    paginaUrl: paginaUrl_(config),
    logoData: leerLogo_(ss),
  };
}

// ---------- Escritura ----------

/**
 * Guarda una sección. `datos.config` trae claves de Configuracion (solo las de la
 * sección); `datos.sedes`, `datos.mensajes` y `datos.horarios` reemplazan esas tablas.
 * Devuelve { ok, refrescada, errores }.
 */
function guardar(seccion, datos) {
  const permitidas = CLAVES_POR_SECCION[seccion];
  if (!permitidas) throw new Error('Sección desconocida: ' + seccion);
  datos = datos || {};
  const errores = validar_(seccion, datos);
  if (errores.length) return { ok: false, errores: errores, refrescada: false };

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const lock = LockService.getDocumentLock();
  lock.waitLock(20000);
  try {
    const config = ss.getSheetByName('Configuracion');
    const valores = datos.config || {};
    permitidas.forEach(function (k) {
      if (k in valores) setClave_(config, k, valores[k]);
    });
    if (seccion === 'lugar' && Array.isArray(datos.sedes)) escribirSedes_(ss, datos.sedes);
    if (seccion === 'mensaje' && Array.isArray(datos.mensajes)) escribirMensajes_(ss, datos.mensajes);
    if (seccion === 'horario' && Array.isArray(datos.horarios)) escribirHorarios_(ss, datos.horarios);
    SpreadsheetApp.flush();
  } finally {
    lock.releaseLock();
  }
  return { ok: true, errores: [], refrescada: refrescarPagina_(leerConfig_(ss)) };
}

// ---------- Logo ----------
// La ventana comprime el logo en el navegador (≤ 320 px) y lo manda como data URL.
// Se guarda en la pestaña oculta "Logo" (A2); el maestro lo lee de ahí y lo sirve con la página.
const LOGO_MAX = 45000;

function leerLogo_(ss) {
  const sheet = ss.getSheetByName('Logo');
  const v = sheet ? String(sheet.getRange('A2').getValue() || '').trim() : '';
  return logoValido_(v) ? v : '';
}

/** JPEG, PNG o WEBP de verdad (por sus bytes), en data URL y de tamaño razonable. */
function logoValido_(valor) {
  const v = String(valor || '').trim();
  const m = /^data:image\/(png|webp|jpeg);base64,([A-Za-z0-9+\/=]+)$/.exec(v);
  if (!m || v.length > LOGO_MAX) return false;
  let bytes;
  try { bytes = Utilities.base64Decode(m[2]); } catch (_) { return false; }
  if (!bytes || bytes.length < 12) return false;
  const b = function (i) { return bytes[i] & 0xff; };
  const ascii = function (i, n) { let t = ''; for (let k = i; k < i + n; k++) t += String.fromCharCode(b(k)); return t; };
  return (b(0) === 0xff && b(1) === 0xd8 && b(2) === 0xff) ||
    (b(0) === 0x89 && ascii(1, 3) === 'PNG') ||
    (ascii(0, 4) === 'RIFF' && ascii(8, 4) === 'WEBP');
}

function guardarLogo(dataUrl) {
  if (!logoValido_(dataUrl)) {
    return { ok: false, errores: ['La imagen no se pudo guardar. Prueba con un PNG o JPG más liviano.'], refrescada: false };
  }
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName('Logo');
  if (!sheet) {
    sheet = ss.insertSheet('Logo');
    sheet.getRange('A1').setValue('Logo (lo maneja la ventana de configuración; no lo edites)');
    sheet.hideSheet();
  }
  sheet.getRange('A2').setValue(String(dataUrl).trim());
  SpreadsheetApp.flush();
  return { ok: true, errores: [], refrescada: refrescarPagina_(leerConfig_(ss)) };
}

function quitarLogo() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Logo');
  if (sheet) sheet.getRange('A2').clearContent();
  SpreadsheetApp.flush();
  return { ok: true, errores: [], refrescada: refrescarPagina_(leerConfig_(ss)) };
}

/** Vuelve a escribir las 3 plantillas originales (reemplaza las filas con el mismo nombre). */
function restaurarPlantillas() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const actuales = leerTodo().mensajes.filter(function (m) {
    return !PLANTILLAS_MENSAJE.some(function (p) { return norm_(p.nombre) === norm_(m.nombre); });
  });
  escribirMensajes_(ss, PLANTILLAS_MENSAJE.concat(actuales));
  return leerTodo().mensajes;
}

// ---------- Validación ----------

function validar_(seccion, datos) {
  const c = datos.config || {};
  const errores = [];
  const hex = /^#?(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;
  const numero = function (k, min, max) {
    if (!(k in c) || String(c[k]).trim() === '') return;
    const n = Number(String(c[k]).replace(',', '.'));
    if (!isFinite(n) || n < min || n > max) errores.push(k + ' debe ser un número entre ' + min + ' y ' + max + '.');
  };
  if (seccion === 'estilo') {
    ['color_principal', 'color_fondo'].forEach(function (k) {
      if (c[k] && !hex.test(String(c[k]).trim())) errores.push(k + ': escribe un color en hex, como #1F6F5C.');
    });
  }
  if (seccion === 'marca' && c.logo_url && !/^https?:\/\//i.test(String(c.logo_url).trim())) {
    errores.push('El logo tiene que ser un enlace que empiece por https://');
  }
  if (seccion === 'lugar') {
    numero('recargo_domicilio_pct', 0, 300);
    numero('minutos_extra_domicilio', 0, 240);
    const sedes = (datos.sedes || []).filter(function (s) { return String(s.nombre || '').trim(); });
    if (!sedes.some(function (s) { return s.activa !== false; })) errores.push('Deja al menos una sede activa.');
    const nombres = sedes.map(function (s) { return norm_(s.nombre); });
    if (nombres.some(function (n, i) { return nombres.indexOf(n) !== i; })) errores.push('Dos sedes tienen el mismo nombre.');
    sedes.forEach(function (s) {
      if (s.mapsUrl && !/^https?:\/\//i.test(String(s.mapsUrl).trim())) {
        errores.push('El enlace de Maps de "' + s.nombre + '" tiene que empezar por https://');
      }
    });
    if (norm_(c.lugar_tipo) === 'otro' && !String(c.lugar_nombre || '').trim()) {
      errores.push('Con "Otro", escribe cómo se llama tu lugar.');
    }
  }
  if (seccion === 'mensaje') {
    const mensajes = (datos.mensajes || []).filter(function (m) { return String(m.nombre || '').trim(); });
    if (!mensajes.length) errores.push('Deja al menos una plantilla de mensaje.');
    if (!mensajes.some(function (m) { return norm_(m.nombre) === norm_(c.mensaje_plantilla); })) {
      errores.push('Elige una de tus plantillas como la que se usa.');
    }
  }
  if (seccion === 'horario') {
    numero('intervalo_min', 5, 240);
    numero('dias_anticipacion', 1, 365);
    numero('anticipacion_min_horas', 0, 168);
    if (!alertasValidas_(c.recordatorio_minutos)) {
      errores.push('Alerta: elige hasta 5 tiempos, de 0 minutos a 4 semanas antes de la cita.');
    }
    (datos.horarios || []).forEach(function (h) {
      if (!h.inicio && !h.fin) return;
      if (!/^\d{1,2}:\d{2}$/.test(h.inicio || '') || !/^\d{1,2}:\d{2}$/.test(h.fin || '') || minutos_(h.fin) <= minutos_(h.inicio)) {
        errores.push(h.dia + ': revisa las horas (la de cierre va después de la de apertura).');
      }
    });
  }
  if (seccion === 'comprobantes') {
    const modo = String(c.facturacion_modo || 'interno').trim().toLowerCase();
    if (modo !== 'interno' && modo !== 'fiscal') errores.push('Elige un modo: control interno o facturación fiscal.');
    if (modo === 'fiscal') {
      if (!/^[VJEGP]-?\d{6,9}-?\d$/i.test(String(c.facturacion_rif || '').trim())) {
        errores.push('Escribe tu RIF completo, por ejemplo J-12345678-9.');
      }
      if (!String(c.facturacion_razon_social || '').trim()) errores.push('Escribe tu nombre o razón social como sale en el RIF.');
    }
  }
  if (seccion === 'pagos' && c.whatsapp && String(c.whatsapp).replace(/\D/g, '').length < 10) {
    errores.push('El WhatsApp necesita el código de país, por ejemplo 584121234567.');
  }
  return errores;
}

// ---------- Tablas ----------

function escribirSedes_(ss, sedes) {
  const filas = sedes
    .filter(function (s) { return String(s.nombre || '').trim(); })
    .map(function (s) {
      return [String(s.nombre).trim(), String(s.direccion || '').trim(), String(s.mapsUrl || '').trim(), s.activa !== false];
    });
  reemplazarFilas_(ss.getSheetByName('Sedes'), 4, filas);
  const sheet = ss.getSheetByName('Sedes');
  if (filas.length) sheet.getRange(2, 4, filas.length, 1).insertCheckboxes();
}

function escribirMensajes_(ss, mensajes) {
  const filas = mensajes
    .filter(function (m) { return String(m.nombre || '').trim(); })
    .map(function (m) { return [String(m.nombre).trim(), String(m.texto || '')]; });
  reemplazarFilas_(ss.getSheetByName('Mensajes'), 2, filas);
}

/** Una fila por tramo; un día sin tramos queda con las horas vacías (cerrado). */
function escribirHorarios_(ss, horarios) {
  const orden = [1, 2, 3, 4, 5, 6, 0].map(function (d) { return DIAS_SEMANA[d]; });
  const filas = [];
  orden.forEach(function (dia) {
    const tramos = horarios.filter(function (h) { return norm_(h.dia) === norm_(dia) && h.inicio && h.fin; });
    if (!tramos.length) filas.push([dia, '', '']);
    tramos.forEach(function (t) { filas.push([dia, normHora_(t.inicio), normHora_(t.fin)]); });
  });
  const sheet = ss.getSheetByName('Horarios');
  sheet.getRange('A:C').setNumberFormat('@');
  reemplazarFilas_(sheet, 3, filas);
}

function reemplazarFilas_(sheet, columnas, filas) {
  const ultima = sheet.getLastRow();
  if (ultima > 1) sheet.getRange(2, 1, ultima - 1, columnas).clearContent();
  if (filas.length) sheet.getRange(2, 1, filas.length, columnas).setValues(filas);
}

// ---------- Refrescar la página ----------

/**
 * La página cachea el catálogo 15 minutos. Con fresh=1 el maestro lo vuelve a leer
 * y lo guarda, así el cambio se ve apenas se recarga. Si falla, se ve en 15 minutos.
 * La URL y el token los escribe el maestro en Configuracion (api_url, api_token) al
 * crear o actualizar el negocio: acá no hay ninguna clave escrita en el código.
 */
function refrescarPagina_(config) {
  const url = String(config.api_url || '').trim();
  const slug = String(config.slug || '').trim();
  const token = String(config.api_token || '').trim();
  if (!url || !slug || !token) return false;
  try {
    const res = UrlFetchApp.fetch(
      url + '?token=' + encodeURIComponent(token) + '&slug=' + encodeURIComponent(slug) + '&fresh=1',
      { muteHttpExceptions: true, followRedirects: true }
    );
    return res.getResponseCode() === 200;
  } catch (err) {
    console.warn('No se pudo refrescar la página: ' + err);
    return false;
  }
}

/** La escribe el maestro (escribirEnlaces_). Sin ella, la ventana no muestra "Ver mi página". */
function paginaUrl_(config) {
  const url = String(config.pagina_url || '').trim();
  return /^https?:\/\//i.test(url) ? url : '';
}

// ---------- Utilidades ----------

function leerConfig_(ss) {
  const out = {};
  filas_(ss, 'Configuracion', 2).forEach(function (r) {
    const k = String(r[0]).trim().toLowerCase();
    if (k) out[k] = String(r[1]).trim();
  });
  return out;
}

/** recordatorio_minutos: vacío, "no" o hasta 5 minutos (0–40320) separados por comas. Igual que Code.gs. */
function alertasValidas_(valor) {
  const v = String(valor === undefined || valor === null ? '' : valor).trim().toLowerCase();
  if (v === '' || v === 'no') return true;
  const partes = v.split(/[\s,;]+/);
  return partes.length <= 5 && partes.every(function (t) { return /^\d{1,5}$/.test(t) && Number(t) <= 40320; });
}

function setClave_(sheet, clave, valor) {
  const datos = sheet.getDataRange().getValues();
  for (let i = 1; i < datos.length; i++) {
    if (norm_(datos[i][0]) === norm_(clave)) {
      sheet.getRange(i + 1, 2).setValue(String(valor === undefined || valor === null ? '' : valor).trim());
      return;
    }
  }
  sheet.appendRow([clave, String(valor === undefined || valor === null ? '' : valor).trim()]);
}

/** Filas de datos como texto visible (getDisplayValues evita horas convertidas a fechas). */
function filas_(ss, nombre, columnas) {
  const sheet = ss.getSheetByName(nombre);
  if (!sheet || sheet.getLastRow() < 2) return [];
  const valores = sheet.getRange(2, 1, sheet.getLastRow() - 1, columnas).getDisplayValues();
  return valores.filter(function (r) { return r.some(function (c) { return String(c).trim() !== ''; }); });
}

function activa_(v) {
  const t = String(v).trim().toLowerCase();
  return !(t === 'false' || t === 'falso' || t === 'no' || t === '0');
}

function hhmm_(v) {
  const m = /^(\d{1,2}):(\d{2})/.exec(String(v || '').trim());
  return m ? ('0' + m[1]).slice(-2) + ':' + m[2] : '';
}

function normHora_(v) {
  return hhmm_(v) || String(v || '').trim();
}

function minutos_(hhmm) {
  const p = String(hhmm).split(':');
  return Number(p[0]) * 60 + Number(p[1]);
}

function norm_(v) {
  return String(v || '').normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase();
}
