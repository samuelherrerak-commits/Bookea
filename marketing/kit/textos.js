/*
 * Textos listos para copiar: perfil de Instagram y configuración de WhatsApp Business.
 * Los usa marketing/kit/index.html (con botón de copiar) y render-marca.mjs (los .md del ZIP).
 * Cada bloque: { titulo, texto (lo que se copia), donde (dónde se pega), nota }.
 */
;(function () {
  const M = window.Marca
  const NUM = M.WHATSAPP_VISIBLE
  // Horario de atención: cámbialo aquí y se actualiza en todos los textos.
  const HORARIO = 'lunes a sábado, de 8:00 a. m. a 6:00 p. m.'

  const INSTAGRAM = [
    { seccion: 'Perfil' },
    { titulo: 'Usuario', texto: M.INSTAGRAM, donde: 'Editar perfil → Usuario' },
    { titulo: 'Nombre', texto: 'bookeaa | Agenda y reservas online', donde: 'Editar perfil → Nombre',
      nota: 'El nombre también sale en las búsquedas: por eso lleva "reservas" y "agenda".' },
    { titulo: 'Biografía (opción 1, directa)', donde: 'Editar perfil → Presentación',
      texto: 'Tu agenda online, sin libreta 📅\nTus clientes reservan 24/7 y la cita cae en tu Google Calendar\n🎁 1 mes gratis · luego $10/mes\n👇 Afilia tu negocio' },
    { titulo: 'Biografía (opción 2, por rubro)', donde: 'Editar perfil → Presentación',
      texto: 'Reservas online para barberías, uñas, spa y consultorios ✂️💅\nTe llega cada cita por WhatsApp\n1 mes gratis 🎁\n👇 Escríbenos' },
    { titulo: 'Enlace 1', texto: M.ENLACES.web, donde: 'Editar perfil → Enlaces → Agregar enlace externo', nota: 'Título del enlace: "Mira cómo funciona".' },
    { titulo: 'Enlace 2', texto: M.ENLACES.afiliar, donde: 'Editar perfil → Enlaces → Agregar enlace externo',
      nota: 'Título del enlace: "Afilia tu negocio". Abre WhatsApp con el mensaje ya escrito.' },
    { titulo: 'Categoría', texto: 'Software', donde: 'Editar perfil → Categoría', nota: 'Si no aparece, usa "Producto/servicio". Activa "Mostrar categoría".' },
    { titulo: 'Botón de WhatsApp', texto: NUM, donde: 'Editar perfil → Opciones de contacto → WhatsApp',
      nota: 'Vincula el WhatsApp Business: así aparece el botón "WhatsApp" en tu perfil.' },
    { titulo: 'Correo de contacto', texto: '', donde: 'Editar perfil → Opciones de contacto → Correo', nota: 'Pon el correo de bookeaa (por ejemplo hola@bookeaa.com si lo creas con tu dominio).' },

    { seccion: 'Historias destacadas' },
    { titulo: 'Orden y nombres', donde: 'Perfil → Nueva (+) → elige la historia → Editar portada',
      texto: M.DESTACADAS.map((d, i) => `${i + 1}. ${d.nombre}`).join('\n'),
      nota: 'Primero sube cada historia de la carpeta instagram/historias, después créale su destacada y como portada usa la de instagram/destacadas con el mismo nombre.' },

    { seccion: 'Mensajes directos' },
    { titulo: 'Preguntas frecuentes del chat (hasta 4)', donde: 'Configuración → Herramientas para empresas → Preguntas frecuentes',
      texto: 'Quiero afiliar mi negocio\n¿Cuánto cuesta?\n¿Cómo funciona?\nYa soy cliente, necesito ayuda' },
    { titulo: 'Respuesta: Quiero afiliar mi negocio', donde: 'Respuesta automática de la pregunta 1',
      texto: `¡Genial! 🙌 Te dejamos tu página lista. Escríbenos al WhatsApp ${NUM} o toca aquí: ${M.ENLACES.afiliar}\n\nTen a mano: nombre del negocio, servicios con precio y duración, tu horario y un correo de Gmail.` },
    { titulo: 'Respuesta: ¿Cuánto cuesta?', donde: 'Respuesta automática de la pregunta 2',
      texto: 'El primer mes es gratis 🎁 Después son $10 al mes, todo incluido: tu página con tu logo y colores, reservas 24/7 en tu Google Calendar, Pago Móvil y comprobante de cita. Sin contrato.' },
    { titulo: 'Respuesta: ¿Cómo funciona?', donde: 'Respuesta automática de la pregunta 3',
      texto: `1️⃣ Te damos tu página: bookeaa.com/u/tu-negocio\n2️⃣ Tus clientes eligen servicio, día y hora\n3️⃣ La cita cae en tu Google Calendar y te llega por WhatsApp\n\nMira un ejemplo: ${M.ENLACES.demo}` },
    { titulo: 'Respuesta: Ya soy cliente', donde: 'Respuesta automática de la pregunta 4',
      texto: `Te ayudamos por WhatsApp 👉 ${M.ENLACES.soporte}\nMándanos el nombre de tu negocio, qué pasó y una captura. Atendemos ${HORARIO}` },
    { titulo: 'Respuestas guardadas', donde: 'Configuración → Herramientas para empresas → Respuestas guardadas',
      texto: '/precio → la respuesta de "¿Cuánto cuesta?"\n/como → la de "¿Cómo funciona?"\n/afiliar → la de "Quiero afiliar mi negocio"\n/soporte → la de "Ya soy cliente"',
      nota: 'Escribe el atajo en cualquier chat y Instagram te sugiere el texto completo.' },

    { seccion: 'Primeras 9 publicaciones' },
    { titulo: 'Orden para la cuadrícula', donde: 'Publícalas en este orden (la 1 queda abajo a la derecha)',
      texto: [
        '1. Carrusel 1 · Tu agenda, sin libreta (qué es bookeaa)',
        '2. Reel 1',
        '3. Carrusel 3 · Cómo funciona en 3 pasos',
        '4. Carrusel 7 · ¿Cuánto cuesta?',
        '5. Reel 2',
        '6. Carrusel 6 · ¿Consultorio? ¿Barbería? ¿Spa?',
        '7. Carrusel 2 · 5 señales de que tu agenda necesita ayuda',
        '8. Reel 3',
        '9. Carrusel 5 · 8 estilos para tu página',
      ].join('\n'),
      nota: 'Están en marketing/salida/carruseles y marketing/salida/videos. Fija (📌) arriba el 1, el 3 y el 4.' },
  ]

  const MENU = [
    ['1', 'Quiero afiliar mi negocio'],
    ['2', 'Precios y prueba gratis'],
    ['3', 'Soporte (ya soy cliente)'],
    ['4', 'Cómo funciona / ver un ejemplo'],
    ['5', 'Hablar con una persona'],
  ]

  const GUIA = 'https://github.com/samuelherrerak-commits/Bookea/blob/main/bot/README.md'

  // WhatsApp: bot propio con la API oficial (bot/ en el repo). Los textos del bot viven en bot/src/textos.ts.
  const WHATSAPP = [
    { seccion: 'Cómo funciona el bot' },
    { titulo: 'Menú', texto: '1. Afiliar mi negocio\n2. Precios y prueba gratis\n3. Soporte\n4. Cómo funciona\n5. Hablar con una persona',
      nota: 'Llega como una lista con botones. También entiende si escriben el número o palabras como "precio" o "soporte". "menú" vuelve al inicio desde cualquier punto.' },
    { titulo: 'Afiliar mi negocio', texto: 'Pide uno por uno: nombre del negocio, rubro, servicios con precio y duración (sirve una foto de la lista), horario, correo de Gmail y logo (o Saltar).\n\nDespués agenda la cita de configuración e inducción:\n🏪 Presencial: solo sábados, en el negocio (pide la dirección o la ubicación).\n💻 Google Meet: de lunes a viernes, con enlace automático.\n\nMuestra solo las horas libres de tu calendario "Afiliaciones bookeaa", confirma y le llega la invitación al Gmail del negocio.',
      nota: 'Cada afiliación queda en la hoja Prospectos del archivo maestro y te llega un correo. Si el negocio escribe otra vez, el menú le ofrece ver, cambiar o cancelar su cita.' },
    { titulo: 'Horarios de afiliación', texto: 'Sábados presencial: 8:00 a. m. a 5:00 p. m., citas de 1 h 30 min (con traslado)\nGoogle Meet: lunes a viernes, 9:00 a. m. a 5:00 p. m., citas de 1 h\nCon al menos 12 h de anticipación',
      donde: 'Apps Script → Configuración del proyecto → Propiedades del script (claves bot_*)',
      nota: 'Para bloquear un día u horas, crea un evento en el calendario "Afiliaciones bookeaa": el bot deja de ofrecer esa hora.' },
    { titulo: 'Soporte', texto: 'Pide el nombre del negocio y el tema. Logo, horario, reservas, alerta y Pago Móvil los responde solo y pregunta si se resolvió. Si no, pide la descripción y una captura, abre un caso (#número), te avisa por correo y te pasa el chat.' },
    { titulo: 'Hablar con una persona', texto: `El bot avisa al equipo y se calla. Fuera de horario (${HORARIO}) responde que se atiende al abrir.` },

    { seccion: 'La bandeja' },
    { titulo: 'Dónde se atiende', texto: 'https://bookeaa-bot.<tu-cuenta>.workers.dev/bandeja', nota: 'Entras con tu clave (BANDEJA_CLAVE). Ahí ves todos los chats, respondes a mano, devuelves el chat al bot, cambias la etiqueta, cierras casos y mandas plantillas. Funciona en el teléfono: agrégala a tu pantalla de inicio.' },
    { titulo: 'Etiquetas', texto: [
        '🟡 Nuevo prospecto · empezó la afiliación',
        '📅 Cita de afiliación · agendó su cita (la pone el bot)',
        '🔵 Prueba gratis · ya tiene página, está en su mes gratis',
        '🟠 Pendiente de pago · terminó la prueba o venció el mes',
        '🟢 Cliente activo · pagó este mes',
        '🔴 Soporte abierto · el bot abrió un caso',
        '⚪ Soporte resuelto · al tocar "Cerrar caso"',
      ].join('\n') },

    { seccion: 'Cuánto cuesta' },
    { titulo: 'Tarifas de Meta (Venezuela, desde el 1 de octubre de 2026)', texto: [
        'Mensajes que te escriben: gratis.',
        'Lo que responde el bot o tú, dentro de las 24 h desde su último mensaje: 1.000 gratis al mes; después ≈ $0,0113 c/u.',
        'Escribirle a alguien que no te ha escrito en 24 h (aunque lo escribas tú a mano): solo con plantilla aprobada. Aviso ≈ $0,0113; promoción ≈ $0,074.',
        'Si te escriben desde un anuncio de Instagram o Facebook: 72 h gratis.',
        'Cloudflare, Apps Script, Google Calendar y Meet: $0.',
      ].join('\n'),
      nota: 'Ejemplo: 80 negocios al mes que conversan con el bot ≈ 960 mensajes = $0. Con 250 negocios ≈ $23 al mes. La bandeja muestra cuántos llevas del mes.' },
    { titulo: 'Plantillas (para escribir fuera de las 24 h)', texto: 'seguimiento_prospecto · promoción ≈ $0,074\nfin_prueba · aviso ≈ $0,0113\nrecordatorio_pago · aviso ≈ $0,0113',
      donde: 'Bandeja → Ajustes → Crear plantillas en Meta', nota: 'Meta las revisa (minutos u horas). Después se mandan desde el chat con el botón Plantilla.' },

    { seccion: 'Perfil de WhatsApp' },
    { titulo: 'Descripción', texto: 'Reservas online para negocios que trabajan con citas: barberías, uñas, estética, spa, consultorios y más. Tus clientes reservan 24/7 desde tu página, la cita cae en tu Google Calendar y te llega por WhatsApp. 1 mes gratis, luego $10 al mes.',
      donde: 'Bandeja → Ajustes → Configurar perfil (lo pone solo, con la web e Instagram)' },
    { titulo: 'Foto de perfil', texto: '', donde: 'Meta Business Suite → WhatsApp Manager → Números de teléfono → Perfil', nota: 'Usa whatsapp/perfil.png. El nombre visible que se pide a Meta: bookeaa.' },

    { seccion: 'Enlaces y QR' },
    { titulo: 'Enlace para afiliarse', texto: M.ENLACES.afiliar, nota: 'Para la bio, anuncios y estados. QR listo en whatsapp/qr-afiliar.png.' },
    { titulo: 'Enlace de soporte', texto: M.ENLACES.soporte, nota: 'Para mandárselo a tus clientes al entregar la página. QR en whatsapp/qr-soporte.png.' },

    { seccion: 'Puesta en marcha' },
    { titulo: 'Guía paso a paso', texto: GUIA, nota: 'Cloudflare (gratis), la app de Meta con el número, los secretos en GitHub y el Apps Script. Ojo: el número deja de funcionar en la app de WhatsApp; todo se atiende desde la bandeja.' },
  ]

  window.TEXTOS = { HORARIO, MENU, INSTAGRAM, WHATSAPP }
})()
