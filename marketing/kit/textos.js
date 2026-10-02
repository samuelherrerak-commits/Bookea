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
      texto: 'Tu agenda online, sin libreta 📅\nTus clientes reservan 24/7 y la cita cae en tu Google Calendar\n🎁 1 mes gratis · luego $15/mes\n👇 Afilia tu negocio' },
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
      texto: 'El primer mes es gratis 🎁 Después son $15 al mes, todo incluido: tu página con tu logo y colores, reservas 24/7 en tu Google Calendar, Pago Móvil y comprobante de cita. Sin contrato.' },
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

  const WHATSAPP = [
    { seccion: 'Perfil de empresa' },
    { titulo: 'Nombre', texto: 'bookeaa', donde: 'Herramientas para la empresa → Perfil de empresa → Nombre' },
    { titulo: 'Categoría', texto: 'Software', donde: 'Perfil de empresa → Categoría', nota: 'Si no aparece, "Servicios de TI" o "Otra empresa".' },
    { titulo: 'Descripción', donde: 'Perfil de empresa → Descripción',
      texto: 'Reservas online para negocios que trabajan con citas: barberías, uñas, estética, spa, consultorios y más. Tus clientes reservan 24/7 desde tu página, la cita cae en tu Google Calendar y te llega por WhatsApp. 1 mes gratis, luego $15 al mes.' },
    { titulo: 'Horario', texto: HORARIO, donde: 'Perfil de empresa → Horario', nota: 'Cámbialo si atiendes en otro horario: el mensaje de ausencia usa el mismo.' },
    { titulo: 'Sitio web', texto: M.ENLACES.web, donde: 'Perfil de empresa → Sitio web' },
    { titulo: 'Instagram', texto: M.ENLACES.instagram, donde: 'Perfil de empresa → Sitio web (segundo enlace) o "Cuentas vinculadas"' },
    { titulo: 'Dirección', texto: 'Atención online en toda Venezuela', donde: 'Perfil de empresa → Dirección', nota: 'Si no quieres poner una dirección física, déjalo así o vacío.' },
    { titulo: 'Fotos', texto: '', donde: 'Perfil de empresa → foto de perfil y portada', nota: 'Usa whatsapp/perfil.png y whatsapp/portada.png.' },

    { seccion: 'Menú automático (mensaje de bienvenida)' },
    { titulo: 'Mensaje de bienvenida', donde: 'Herramientas para la empresa → Mensaje de bienvenida → Activar · Destinatarios: "Todos"',
      texto: `¡Hola! 👋 Gracias por escribir a *bookeaa*, tu agenda online.\n\nResponde con el *número* de lo que necesitas:\n\n${MENU.map(([n, t]) => `*${n}* · ${t}`).join('\n')}\n\nAtendemos ${HORARIO}`,
      nota: 'WhatsApp lo manda solo cuando alguien escribe por primera vez o después de 14 días sin hablar.' },
    { titulo: 'Cómo responder cada opción', texto: '',
      donde: 'Cuando te respondan con un número, escribe / + ese número y toca la respuesta rápida',
      nota: 'La app gratis no contesta sola cada número: tú tocas el atajo y la respuesta sale completa en 2 segundos. Si un día recibes más de ~30 chats al día, conviene pasar a un bot con la API de WhatsApp.' },

    { seccion: 'Respuestas rápidas · el menú' },
    { atajo: '1', titulo: 'Afiliar mi negocio',
      texto: '¡Qué bueno! 🙌 Te dejamos tu agenda online lista, sin que tengas que configurar nada.\n\nMándame por aquí:\n1. Nombre de tu negocio\n2. Tus servicios, con precio y cuánto dura cada uno\n3. Tu horario de trabajo\n4. Un correo de Gmail (ahí te llega el calendario)\n5. Tu logo, si tienes\n\nCon eso te armo la página y te paso el link. El primer mes es gratis 🎁' },
    { atajo: '2', titulo: 'Precios',
      texto: 'El *primer mes es gratis* 🎁 y después son *$15 al mes*, todo incluido:\n\n✓ Tu página con tu logo y colores\n✓ Reservas 24/7 en tu Google Calendar\n✓ Aviso de cada cita por WhatsApp\n✓ Pago Móvil con la tasa BCV del día\n✓ Comprobante de cita y QR para tu local\n\nSin contrato: si no sigues, tu página se pausa y no pagas nada. ¿Te la armo? Responde *1*' },
    { atajo: '3', titulo: 'Soporte',
      texto: 'Claro, te ayudo 🛠️ Mándame:\n\n1. El nombre de tu negocio (o tu link bookeaa.com/u/…)\n2. Qué pasó\n3. Una captura de pantalla\n\nTe respondo en cuanto lo revise.' },
    { atajo: '4', titulo: 'Cómo funciona',
      texto: `Así de fácil 👇\n\n1️⃣ Te damos tu página: bookeaa.com/u/tu-negocio\n2️⃣ Tus clientes eligen servicio, día y hora\n3️⃣ La cita cae en tu Google Calendar y te llega por WhatsApp\n\nMira un ejemplo real: ${M.ENLACES.demo}\n¿Quieres la tuya? Responde *1*` },
    { atajo: '5', titulo: 'Hablar con una persona',
      texto: 'Listo, ya te atiendo yo 🙋 Cuéntame en qué te ayudo.' },

    { seccion: 'Respuestas rápidas · afiliación' },
    { atajo: 'datos', titulo: 'Faltan datos', texto: '¡Gracias! Para terminar tu página me falta: ___\nApenas me lo mandes, te la dejo lista.' },
    { atajo: 'listo', titulo: 'Página lista',
      texto: '¡Tu página está lista! 🎉\n👉 bookeaa.com/u/___\n\nPruébala tú haciendo una reserva. Después compártela en tu bio de Instagram, tus estados y con tus clientes.\n\nPara cambiar colores, logo, horario o precios: abre tu hoja de Google → menú *bookeaa* → *Configurar mi página*.' },
    { atajo: 'pago', titulo: 'Fin de la prueba / pago',
      texto: 'Hola 👋 Tu mes gratis termina el ___. Para seguir con bookeaa son $15 al mes.\n\nPuedes pagar por Pago Móvil:\nBanco: ___\nTeléfono: ___\nCédula/RIF: ___\n\nMándame la captura y listo. Si no quieres seguir, no pasa nada: tu página se pausa y no se cobra nada.' },
    { atajo: 'gracias', titulo: 'Pago recibido', texto: '¡Recibido, gracias! ✅ Tu plan queda activo hasta el ___. Cualquier cosa, me escribes por aquí.' },

    { seccion: 'Respuestas rápidas · soporte' },
    { atajo: 'logo', titulo: 'No se ve el logo',
      texto: 'Para que se vea tu logo: abre tu hoja de Google → menú *bookeaa* → *Configurar mi página* → *Marca* → *Subir logo*. Mejor si es PNG con fondo transparente. Se ve en tu página al instante.' },
    { atajo: 'horario', titulo: 'Cambiar horario o bloquear días',
      texto: 'Tu horario se cambia en *Configurar mi página* → *Horario*. Para un día libre o vacaciones, usa la pestaña *Bloqueos* o crea un evento de día completo en tu Google Calendar: esa hora deja de estar disponible.' },
    { atajo: 'noaparece', titulo: 'No aparece una reserva',
      texto: 'Revisemos 🔎 ¿Me pasas el nombre del cliente y la hora que reservó? Mientras, mira en tu Google Calendar el calendario "Citas ___": todas las reservas se guardan ahí y en la hoja, pestaña Reservaciones.' },
    { atajo: 'alerta', titulo: 'Alerta de las citas',
      texto: 'Para que te suene una alerta antes de cada cita: *Configurar mi página* → *Horario* → *Alerta de cada cita* y marca cuánto antes (por ejemplo 1 día y 1 h). Aplica a las citas nuevas.' },
    { atajo: 'pagomovil', titulo: 'Pago Móvil y tasa',
      texto: 'Los datos de tu Pago Móvil se ponen en *Configurar mi página* → *Pagos*. Tu cliente ve el monto en bolívares con la tasa BCV del día y sube la captura al reservar.' },
    { atajo: 'config', titulo: 'Dónde se configura todo',
      texto: 'Todo se cambia desde tu hoja de Google → menú *bookeaa* → *Configurar mi página*: Marca, Estilo, Lugar, Mensaje, Horario, Pagos, Comprobantes y QR. Después de guardar, tu página se actualiza sola.' },
    { atajo: 'escalado', titulo: 'Lo estamos revisando', texto: 'Gracias por avisar 🙏 Ya lo estoy revisando. Te escribo apenas esté resuelto, a más tardar ___.' },
    { atajo: 'cerrado', titulo: 'Caso resuelto', texto: '¡Listo, quedó resuelto! ✅ Si vuelve a pasar o necesitas otra cosa, escríbeme por aquí. Gracias por usar bookeaa.' },

    { seccion: 'Seguimiento' },
    { atajo: 'seguir2', titulo: 'Prospecto: a los 2 días', texto: 'Hola 👋 ¿Pudiste ver lo de bookeaa? Si me mandas tus servicios y horario, hoy mismo te armo la página para que la pruebes gratis un mes.' },
    { atajo: 'seguir7', titulo: 'Prospecto: a los 7 días', texto: `Hola, te escribo por última vez para no molestarte 🙂 Si en algún momento quieres que tus clientes reserven solos, aquí estoy. Mira un ejemplo: ${M.ENLACES.demo}` },
    { atajo: 'aviso', titulo: 'Prueba gratis: 3 días antes de terminar', texto: 'Hola 👋 Te cuento que tu mes gratis termina en 3 días. ¿Cómo te ha ido con las reservas? Si quieres seguir, te paso los datos para el pago ($15/mes).' },

    { seccion: 'Mensaje de ausencia' },
    { titulo: 'Mensaje de ausencia', donde: 'Herramientas para la empresa → Mensaje de ausencia → Activar · Horario: "Fuera del horario de atención"',
      texto: `¡Hola! 👋 Ahora estamos fuera de horario. Atendemos ${HORARIO}.\n\nDéjanos tu mensaje y te respondemos apenas abramos. Mientras, mira cómo funciona: ${M.ENLACES.web}` },

    { seccion: 'Etiquetas' },
    { titulo: 'Etiquetas y cuándo usarlas', donde: 'Herramientas para la empresa → Etiquetas',
      texto: [
        '🟡 Nuevo prospecto · escribió y todavía no manda datos',
        '🔵 Prueba gratis · ya tiene página, está en su mes gratis',
        '🟠 Pendiente de pago · terminó la prueba o venció el mes',
        '🟢 Cliente activo · pagó este mes',
        '🔴 Soporte abierto · reportó algo y no está resuelto',
        '⚪ Soporte resuelto · caso cerrado',
      ].join('\n'),
      nota: 'Flujo: Nuevo prospecto → (/listo) Prueba gratis → (/aviso, /pago) Pendiente de pago → (/gracias) Cliente activo. En soporte: Soporte abierto → (/cerrado) Soporte resuelto. Cada lunes filtra por etiqueta y manda los seguimientos.' },

    { seccion: 'Catálogo' },
    { titulo: 'Producto 1: Plan Pro', donde: 'Herramientas para la empresa → Catálogo → Agregar artículo',
      texto: 'Nombre: Plan Pro · 1 mes gratis\nPrecio: 15 USD\nDescripción: Tu página de reservas con tu logo y colores, reservas 24/7 en tu Google Calendar, aviso por WhatsApp, Pago Móvil y comprobante de cita. El primer mes es gratis. Sin contrato.\nEnlace: https://bookeaa.com\nImagen: whatsapp/catalogo/plan.png' },
    { titulo: 'Producto 2: Cómo funciona', donde: 'Catálogo → Agregar artículo (sin precio)',
      texto: `Nombre: Cómo funciona bookeaa\nDescripción: 1) Te damos tu página. 2) Tus clientes eligen servicio, día y hora. 3) La cita cae en tu Google Calendar y te llega por WhatsApp.\nEnlace: ${M.ENLACES.demo}\nImagen: whatsapp/catalogo/como.png` },
    { titulo: 'Producto 3: QR para tu local', donde: 'Catálogo → Agregar artículo (sin precio)',
      texto: 'Nombre: QR para tu local (incluido)\nDescripción: Genera el QR de tu página con tus colores desde tu hoja y ponlo en el mostrador, la puerta o tus tarjetas.\nImagen: whatsapp/catalogo/qr.png' },

    { seccion: 'Enlaces y QR' },
    { titulo: 'Enlace para afiliarse', texto: M.ENLACES.afiliar, nota: 'Para la bio, anuncios y estados. QR listo en whatsapp/qr-afiliar.png.' },
    { titulo: 'Enlace de soporte', texto: M.ENLACES.soporte, nota: 'Para mandárselo a tus clientes al entregar la página. QR en whatsapp/qr-soporte.png.' },
    { titulo: 'Lista de difusión "Clientes activos"', donde: 'Chats → ⋮ → Nueva difusión', texto: '',
      nota: 'Agrega a los clientes que pagan y úsala para avisar novedades (como lo nuevo de la destacada "Novedades"). Solo les llega a quienes tienen tu número guardado: pídeles que te agreguen.' },
  ]

  window.TEXTOS = { HORARIO, MENU, INSTAGRAM, WHATSAPP }
})()
