/*
 * Identidad de bookeaa en un solo lugar: colores, logo, íconos y datos de contacto.
 * Lo usan el manual (marca/index.html), las piezas de redes (marca/piezas.html) y el kit.
 */
;(function () {
  const COLORES = [
    { id: 'coal', nombre: 'Carbón', hex: '#0f0f0e', rgb: '15 15 14', cmyk: '0 0 7 94', uso: 'Fondos, texto y logo. El color de la marca.' },
    { id: 'paper', nombre: 'Papel', hex: '#ffffff', rgb: '255 255 255', cmyk: '0 0 0 0', uso: 'Fondos y logo en negativo.' },
    { id: 'mist', nombre: 'Niebla', hex: '#f4f4f2', rgb: '244 244 242', cmyk: '0 0 1 4', uso: 'Fondos de apoyo, tarjetas y burbujas.' },
    { id: 'rule', nombre: 'Línea', hex: '#e3e3df', rgb: '227 227 223', cmyk: '0 0 2 11', uso: 'Bordes y separadores.' },
    { id: 'graphite', nombre: 'Grafito', hex: '#5b5b57', rgb: '91 91 87', cmyk: '0 0 4 64', uso: 'Texto secundario y etiquetas.' },
  ]

  const WHATSAPP = '584220298203'
  const WHATSAPP_VISIBLE = '+58 422 029 8203'
  const INSTAGRAM = 'bookeaa.app'
  const WEB = 'bookeaa.com'
  const wa = (texto) => `https://wa.me/${WHATSAPP}${texto ? '?text=' + encodeURIComponent(texto) : ''}`
  const ENLACES = {
    web: 'https://bookeaa.com',
    instagram: `https://instagram.com/${INSTAGRAM}`,
    whatsapp: wa(''),
    afiliar: wa('Hola, quiero afiliar mi negocio a bookeaa. Mi negocio es: '),
    prueba: wa('Hola, quiero probar bookeaa 1 mes gratis. Mi negocio es: '),
    soporte: wa('Hola, necesito soporte. Mi negocio es: '),
    demo: 'https://bookeaa.com/u/samuel-herrera',
  }

  /**
   * Ícono: un calendario (las dos argollas arriba) con la "b" calada.
   * Grilla de 32: cuerpo 28 × 26 con radio 7, trazo 2,6, la "b" centrada en el cuerpo.
   */
  function icono(fg = '#0f0f0e', calado = '#ffffff') {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect x="2" y="4" width="28" height="26" rx="7" fill="${fg}"/><path d="M10 2.5v5M22 2.5v5" stroke="${fg}" stroke-width="2.6" stroke-linecap="round"/><path d="M12 11v12M12 17.5a4 4 0 1 1 0 .01" stroke="${calado}" stroke-width="2.6" stroke-linecap="round" fill="none"/></svg>`
  }

  /** Logo horizontal o apilado como HTML (el wordmark usa Barlow Condensed 800). */
  function logo({ claro = false, apilado = false, alto = 40 } = {}) {
    const fg = claro ? '#ffffff' : '#0f0f0e', bg = claro ? '#0f0f0e' : '#ffffff'
    const svg = icono(fg, bg).replace('<svg', `<svg style="width:${alto}px;height:${alto}px;flex:none"`)
    const texto = `<span style="font:800 ${alto * 1.05}px/0.8 'Barlow Condensed',sans-serif;letter-spacing:-0.02em;color:${fg}">bookeaa</span>`
    return apilado
      ? `<span style="display:inline-flex;flex-direction:column;align-items:center;gap:${alto * 0.28}px">${svg.replace(`width:${alto}px;height:${alto}px`, `width:${alto * 1.5}px;height:${alto * 1.5}px`)}${texto}</span>`
      : `<span style="display:inline-flex;align-items:center;gap:${alto * 0.3}px">${svg}${texto}</span>`
  }

  // Íconos lineales de las historias destacadas: grilla de 48, trazo 3, puntas redondas.
  const trazo = (d, extra = '') =>
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">${d}${extra}</svg>`
  const ICONOS = {
    // Teléfono con un check: reservar desde el celular.
    como: trazo('<rect x="13" y="5" width="22" height="38" rx="5"/><path d="M21 9.5h6"/><path d="m18.5 24 4 4 7-8"/>'),
    // Etiqueta de precio.
    precios: trazo('<path d="M6 24.5V8a2 2 0 0 1 2-2h16.5L42 23.5 23.5 42z"/><circle cx="15" cy="15" r="3"/>'),
    // Tienda con un "+".
    afiliate: trazo('<path d="M7 18v22h20"/><path d="M41 18v6"/><path d="M5 18 9 7h30l4 11z"/><path d="M5 18c0 3 2.5 5 5.3 5s5.4-2 5.4-5c0 3 2.5 5 5.3 5s5.4-2 5.4-5c0 3 2.5 5 5.3 5s5.3-2 5.3-5"/><path d="M38 31v12M32 37h12"/>'),
    // Cuatro cuadros: negocios que ya lo usan.
    ejemplos: trazo('<rect x="6" y="6" width="15" height="15" rx="3.5"/><rect x="27" y="6" width="15" height="15" rx="3.5"/><rect x="6" y="27" width="15" height="15" rx="3.5"/><rect x="27" y="27" width="15" height="15" rx="3.5"/>'),
    // Audífonos con micrófono.
    soporte: trazo('<path d="M8 27v-3a16 16 0 0 1 32 0v3"/><rect x="6" y="26" width="8" height="12" rx="3"/><rect x="34" y="26" width="8" height="12" rx="3"/><path d="M38 38c0 3-3 5-8 5h-4"/>'),
    // Burbuja con signo de pregunta.
    preguntas: trazo('<path d="M8 10a4 4 0 0 1 4-4h24a4 4 0 0 1 4 4v18a4 4 0 0 1-4 4H20l-9 8v-8a4 4 0 0 1-3-4z"/><path d="M19.5 14.5a4.5 4.5 0 1 1 6.2 4.2c-1.1.5-1.7 1.4-1.7 2.6v.7"/><path d="M24 26.6v.1"/>'),
    // Destello: lo nuevo.
    novedades: trazo('<path d="M22 6c1.2 8.6 5.4 12.8 14 14-8.6 1.2-12.8 5.4-14 14-1.2-8.6-5.4-12.8-14-14 8.6-1.2 12.8-5.4 14-14z"/><path d="M38 30c.5 3.5 2 5 5.5 5.5-3.5.5-5 2-5.5 5.5-.5-3.5-2-5-5.5-5.5 3.5-.5 5-2 5.5-5.5z"/>'),
    whatsapp: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="currentColor" d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2c-1.5 0-3-.4-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.8 11.9 11.9 0 0 0 4.6 4c1.7.7 2.4.8 3.2.7.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.3-.2-.6-.3Z"/></svg>',
  }

  // Historias destacadas: portada (ícono) + una historia de contenido para que no arranquen vacías.
  const DESTACADAS = [
    { id: 'como', nombre: 'Cómo funciona', kicker: 'Cómo funciona', titulo: ['ASÍ DE', 'FÁCIL.'],
      puntos: ['Te damos tu página: bookeaa.com/u/tu-negocio', 'Tus clientes eligen servicio, día y hora', 'La cita cae en tu Google Calendar y te llega por WhatsApp'] },
    { id: 'precios', nombre: 'Precios', kicker: 'Precios', titulo: ['1 MES', 'GRATIS.'],
      texto: 'Después $10 al mes, todo incluido. Sin contrato: si no sigues, tu página se pausa y no pagas nada.',
      puntos: ['Tu página con tus colores y tu logo', 'Reservas 24/7 en tu Google Calendar', 'Pago Móvil y comprobante de cita', 'Tarjetas QR para tu local'] },
    { id: 'afiliate', nombre: 'Afíliate', kicker: 'Afilia tu negocio', titulo: ['ESCRÍBENOS', 'Y TE LA', 'DEJAMOS LISTA.'],
      texto: 'Por WhatsApp, opción 1. Ten a mano:',
      puntos: ['Nombre de tu negocio', 'Servicios con precio y duración', 'Tu horario', 'Un correo de Gmail'], contacto: true },
    { id: 'ejemplos', nombre: 'Ejemplos', kicker: '¿Para quién es?', titulo: ['SI TRABAJAS', 'CON CITAS,', 'ES PARA TI.'],
      puntos: ['Barberías y peluquerías', 'Uñas, pestañas y cejas', 'Estética y spa', 'Consultorios y terapias', 'Tatuajes, entrenadores y más'], texto: 'Mira un ejemplo real en bookeaa.com' },
    { id: 'soporte', nombre: 'Soporte', kicker: 'Soporte', titulo: ['¿YA ERES', 'CLIENTE?'],
      texto: 'Escríbenos por WhatsApp y elige la opción 3. Para ayudarte más rápido, manda:',
      puntos: ['El nombre de tu negocio', 'Qué pasó y una captura'], contacto: true },
    { id: 'preguntas', nombre: 'Preguntas', kicker: 'Preguntas', titulo: ['LO QUE TODOS', 'PREGUNTAN.'],
      faq: [['¿Mis clientes descargan algo?', 'No. Abren tu link y reservan.'], ['¿Necesito saber de tecnología?', 'No. Te la dejamos lista.'], ['¿Puedo cobrar por Pago Móvil?', 'Sí, con la tasa BCV del día.'], ['¿Y si un día no trabajo?', 'Lo bloqueas y nadie lo reserva.']] },
    { id: 'novedades', nombre: 'Novedades', kicker: 'Lo nuevo', titulo: ['RECIÉN', 'SALIDO.'],
      puntos: ['Sube tu logo desde tu hoja', 'Alerta de cada cita en tu teléfono', 'Comprobante de cita en PDF', 'Generador de QR con tus colores'] },
  ]

  window.Marca = { COLORES, WHATSAPP, WHATSAPP_VISIBLE, INSTAGRAM, WEB, ENLACES, icono, logo, ICONOS, DESTACADAS }
})()
