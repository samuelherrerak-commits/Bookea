/*
 * Los carruseles de Instagram (1080×1350, formato 4:5).
 * 1–7: lanzamiento (octubre). 8–15: cómo mejora tu negocio (noviembre).
 * Cada lámina es { tipo, fondo, ...datos }; index.html la dibuja según su tipo.
 * El texto de cada post (caption y hashtags) está en la página de la campaña y en marketing/README.md.
 */
;(function () {
  const F = '../assets/flujo/'
  const P = '../../public/landing/plantillas/'
  const C = '../../public/landing/colores/'

  const cta = (titulo = ['1 MES', 'GRATIS.']) => ({
    tipo: 'cta',
    fondo: 'negro',
    titulo,
    texto: 'Después, <b>$15 al mes</b>. Todo incluido. Sin tarjeta.',
    boton: 'Escríbenos · link en la bio',
  })

  window.CARRUSELES = [
    {
      id: 1,
      nombre: 'Presentamos bookeaa',
      laminas: [
        { tipo: 'portada', fondo: 'negro', kicker: 'Nuevo', titulo: ['TU AGENDA,', 'SIN', 'LIBRETA.'], texto: 'Te contamos qué es bookeaa' },
        {
          tipo: 'texto', fondo: 'blanco', kicker: '¿Qué es?', titulo: ['UNA PÁGINA', 'DE RESERVAS', 'CON TU NOMBRE.'],
          texto: 'Tus clientes eligen servicio, día y hora desde el celular. La cita queda guardada en tu Google Calendar. Tú solo atiendes.',
        },
        { tipo: 'telefono', fondo: 'blanco', kicker: '01', titulo: ['COMPARTE', 'TU LINK'], texto: 'bookeaa.com/u/tu-negocio. En tu bio, tus estados o por mensaje.', img: F + '1-inicio.jpg' },
        { tipo: 'telefono', fondo: 'negro', kicker: '02', titulo: ['RESERVAN', 'SOLOS, 24/7'], texto: 'Sin llamadas ni mensajes de ida y vuelta. Solo ven tus horas libres.', img: F + '4-agenda.jpg' },
        {
          tipo: 'evento', fondo: 'blanco', kicker: '03', titulo: ['Y QUEDA EN', 'TU CALENDARIO'],
          evento: { titulo: 'Corte y barba', cuando: 'Mié 30 sep · 2:00 – 2:45 p. m.', quien: 'Carlos M. · 0412 555 1234' },
          texto: 'Y te llega el detalle por WhatsApp.',
        },
        cta(),
      ],
    },
    {
      id: 2,
      nombre: '5 señales de que tu agenda necesita ayuda',
      laminas: [
        { tipo: 'portada', fondo: 'blanco', kicker: 'Guarda este post', titulo: ['5 SEÑALES', 'DE QUE TU', 'AGENDA', 'NECESITA', 'AYUDA'], texto: '¿Cuántas te pasan?' },
        { tipo: 'senal', fondo: 'negro', num: '01', titulo: ['RESPONDES', '"¿TIENES HORA?"', '20 VECES AL DÍA.'], texto: 'Y cada respuesta es un rato que no estás atendiendo.' },
        { tipo: 'senal', fondo: 'blanco', num: '02', titulo: ['TU AGENDA', 'VIVE EN UNA', 'LIBRETA.'], texto: 'O en tu cabeza. O en diez chats distintos.' },
        { tipo: 'senal', fondo: 'negro', num: '03', titulo: ['SE TE CRUZAN', 'DOS CITAS.'], texto: 'Y uno de los dos clientes se va molesto.' },
        { tipo: 'senal', fondo: 'blanco', num: '04', titulo: ['TUS CLIENTES', 'SE OLVIDAN', 'DE LA CITA.'], texto: 'Hora vacía que ya no puedes llenar.' },
        { tipo: 'senal', fondo: 'negro', num: '05', titulo: ['PIERDES', 'RESERVAS', 'MIENTRAS', 'TRABAJAS.'], texto: 'Nadie contesta, el cliente reserva en otro lado.' },
        {
          tipo: 'lista', fondo: 'blanco', titulo: ['BOOKEAA', 'ARREGLA', 'LAS 5.'], marca: '✓',
          items: ['Tu link responde por ti', 'Agenda online, siempre al día', 'Sin choques: una hora, una cita', 'La cita queda en su calendario', 'Reservas 24/7, aunque estés ocupado'],
        },
        cta(),
      ],
    },
    {
      id: 3,
      nombre: 'Cómo funciona en 3 pasos',
      laminas: [
        { tipo: 'portada', fondo: 'negro', kicker: 'Así de simple', titulo: ['CÓMO', 'FUNCIONA', 'EN 3 PASOS'], texto: 'Configúralo una vez. Tu agenda se llena sola.' },
        { tipo: 'telefono', fondo: 'blanco', kicker: 'Paso 01', titulo: ['COMPARTE', 'TU LINK'], texto: 'Tu página con tus servicios, precios y horario.', img: F + '1-inicio.jpg' },
        { tipo: 'telefono', fondo: 'negro', kicker: 'Paso 02', titulo: ['TU CLIENTE', 'ELIGE LA HORA'], texto: 'Servicio, lugar, día y hora. En menos de un minuto.', img: F + '4-agenda.jpg' },
        {
          tipo: 'whatsapp', fondo: 'blanco', kicker: 'Paso 03', titulo: ['TE LLEGA', 'LA RESERVA'],
          mensaje: '✨ ¡Nueva reserva en Barbería Norte! ✨\n\n👤 Carlos Méndez\n🗓️ Miércoles 30 de septiembre\n⏰ 2:00 p. m. (45 min)\n💫 • Corte y barba — 16,00 €\n📍 En Sede Centro',
          texto: 'Por WhatsApp, y ya guardada en tu Google Calendar.',
        },
        cta(),
      ],
    },
    {
      id: 4,
      nombre: 'Conectado a Google Calendar',
      laminas: [
        { tipo: 'portada', fondo: 'blanco', kicker: 'Función', titulo: ['TU GOOGLE', 'CALENDAR,', 'LLENO SOLO.'], texto: 'Cada reserva se agenda sin que muevas un dedo.' },
        {
          tipo: 'dia', fondo: 'negro', titulo: ['CADA RESERVA', 'ES UN EVENTO'],
          eventos: [['10:30', 'Manicure semipermanente', 'María G.'], ['12:00', 'Bloqueado · almuerzo', ''], ['14:00', 'Corte y barba', 'Carlos M.'], ['16:30', 'Fade con diseño', 'Luis R.']],
          texto: 'Con el servicio, el nombre y el teléfono del cliente.',
        },
        {
          tipo: 'texto', fondo: 'blanco', kicker: 'Sin choques', titulo: ['¿AGREGAS ALGO', 'TÚ? ESA HORA', 'DEJA DE', 'ESTAR LIBRE.'],
          texto: 'Un almuerzo, una diligencia, vacaciones: lo que pongas en tu calendario bloquea tu página.',
        },
        { tipo: 'telefono', fondo: 'negro', kicker: 'Y del otro lado', titulo: ['TU CLIENTE', 'TAMBIÉN', 'LA GUARDA'], texto: 'Con un toque en su calendario. Así llega a tiempo.', img: F + '6-listo.jpg' },
        cta(),
      ],
    },
    {
      id: 5,
      nombre: '8 estilos para tu página',
      laminas: [
        { tipo: 'portada', fondo: 'negro', kicker: 'Plantillas', titulo: ['8 ESTILOS', 'PARA TU', 'PÁGINA'], texto: 'Desliza y elige el tuyo' },
        { tipo: 'grilla', fondo: 'blanco', titulo: ['ELEGANTE · MODERNO', 'EDITORIAL · AMABLE'], imgs: ['elegante', 'moderno', 'editorial', 'amable'].map((e) => P + e + '.jpg'), nombres: ['Elegante', 'Moderno', 'Editorial', 'Amable'] },
        { tipo: 'grilla', fondo: 'blanco', titulo: ['AUDAZ · CLÁSICO', 'MINIMAL · RETRO'], imgs: ['audaz', 'clasico', 'minimal', 'retro'].map((e) => P + e + '.jpg'), nombres: ['Audaz', 'Clásico', 'Minimal', 'Retro'] },
        {
          tipo: 'colores', fondo: 'negro', titulo: ['TU COLOR.', 'TU FONDO.'], texto: 'Claro u oscuro: los textos se ajustan solos.',
          imgs: ['azul', 'coral', 'lima'].map((c) => C + c + '.jpg'), chips: [['#2F5BEA', '#FFFFFF'], ['#E4572E', '#FFF4EA'], ['#C6F432', '#111111']],
        },
        {
          tipo: 'lista', fondo: 'blanco', titulo: ['TODO CON', 'TU MARCA'], marca: '✓',
          items: ['Tu nombre y tu logo', 'Tu color principal y tu fondo', 'Tus servicios, precios y promos', 'Tu mensaje de WhatsApp', 'Tu link: bookeaa.com/u/tu-negocio'],
        },
        cta(),
      ],
    },
    {
      id: 6,
      nombre: 'Hecho para tu tipo de negocio',
      laminas: [
        { tipo: 'portada', fondo: 'blanco', clase: 'grande', kicker: 'Para ti', titulo: ['¿CONSULTORIO?', '¿BARBERÍA?', '¿SPA?'], texto: 'bookeaa se adapta a cómo trabajas.' },
        {
          tipo: 'lista', fondo: 'negro', titulo: ['BOOKEAA', 'ES PARA'], marca: '→',
          items: ['Barberías y peluquerías', 'Uñas y pestañas', 'Consultorios y terapias', 'Estética y spa', 'Tatuajes y entrenadores', '…cualquiera que viva de su agenda'],
        },
        { tipo: 'telefono', fondo: 'blanco', kicker: 'Lugar', titulo: ['UNA O VARIAS', 'SEDES'], texto: 'Tu página dice "En el consultorio" o "En la barbería". Con varias sedes, tu cliente elige.', img: F + '3-lugar.jpg' },
        {
          tipo: 'texto', fondo: 'negro', kicker: 'Domicilio', titulo: ['¿VAS A', 'DOMICILIO?', 'ACTÍVALO.'],
          texto: 'Con tu recargo y los minutos de traslado, que se reservan solos en tu agenda.', pastilla: '+20 % · +15 min',
        },
        {
          tipo: 'tonos', fondo: 'blanco', titulo: ['TU MENSAJE,', 'TU TONO'], texto: 'Elige cómo te llega cada reserva por WhatsApp.',
          tonos: [['Cálida', '✨ ¡Nueva reserva! Quiero confirmar mi cita 😊'], ['Formal', 'Buen día. Quisiera confirmar la siguiente cita.'], ['Breve', 'Hola 👋 Reservé para el jueves a las 4.']],
        },
        cta(),
      ],
    },
    {
      id: 7,
      nombre: 'Precio y preguntas',
      laminas: [
        { tipo: 'portada', fondo: 'negro', kicker: 'Precio', titulo: ['¿CUÁNTO', 'CUESTA?'], texto: 'Spoiler: el primer mes, nada.' },
        { tipo: 'precio', fondo: 'blanco', monto: '$0', detalle: 'POR 30 DÍAS', items: ['Todo lo de Pro desde el primer día', 'Te ayudamos a configurarlo', 'Sin tarjeta, sin permanencia'] },
        { tipo: 'precio', fondo: 'negro', monto: '$15', detalle: 'AL MES · TODO INCLUIDO', items: ['Reservas ilimitadas', 'Google Calendar', 'Tu link y tu página con tu marca', 'Los 8 estilos y tus colores', 'Sedes, domicilio y mensaje propio', 'Soporte por WhatsApp'] },
        {
          tipo: 'faq', fondo: 'blanco', titulo: ['PREGUNTAS', 'RÁPIDAS'],
          items: [
            ['¿Mis clientes descargan algo?', 'No. Abren tu link y reservan.'],
            ['¿Necesito saber de tecnología?', 'No. Te lo dejamos listo.'],
            ['¿Y si un día no trabajo?', 'Lo bloqueas y desaparece de tu página.'],
          ],
        },
        cta(['EMPIEZA', 'HOY.']),
      ],
    },
    // ---------------- NOVIEMBRE · Cómo mejora tu negocio ----------------
    {
      id: 8,
      nombre: 'Así cambia tu día',
      laminas: [
        { tipo: 'portada', fondo: 'negro', kicker: 'Antes y después', titulo: ['ASÍ', 'CAMBIA', 'TU DÍA.'], texto: 'Mismo negocio, otra agenda.' },
        {
          tipo: 'comparar', fondo: 'blanco', titulo: ['POR LA', 'MAÑANA'],
          sin: ['Te despiertas con 14 chats', 'Respondes uno por uno', 'Todavía no sabes cómo es tu día'],
          con: ['Te despiertas con 3 reservas', 'Ya están en tu calendario', 'Sabes a quién atiendes y a qué hora'],
        },
        {
          tipo: 'comparar', fondo: 'negro', titulo: ['AL', 'MEDIODÍA'],
          sin: ['Anotas en la libreta entre cliente y cliente', 'Se te cruzan dos citas'],
          con: ['Una hora, una cita', 'Si bloqueas tu almuerzo, nadie reserva ahí'],
        },
        {
          tipo: 'comparar', fondo: 'blanco', titulo: ['EN LA', 'NOCHE'],
          sin: ['Sigues respondiendo "¿tienes hora mañana?"', 'Tu día de trabajo no termina'],
          con: ['Tu link agenda por ti', 'Mañana ya está armado'],
        },
        { tipo: 'telefono', fondo: 'negro', kicker: 'La diferencia', titulo: ['UN LINK', 'QUE AGENDA', 'POR TI'], texto: 'Tus clientes ven tus horas libres y reservan solos.', img: F + '4-agenda.jpg' },
        cta(),
      ],
    },
    {
      id: 9,
      nombre: '¿Cuántas horas pierdes agendando?',
      laminas: [
        { tipo: 'portada', fondo: 'blanco', kicker: 'Haz la cuenta', titulo: ['¿CUÁNTAS', 'HORAS', 'PIERDES', 'AGENDANDO?'], texto: 'Te sorprende el número.' },
        { tipo: 'cuenta', fondo: 'negro', kicker: 'Ejemplo', monto: '20', unidad: 'CHATS AL DÍA', texto: 'Cada uno para preguntar precio, horario o si tienes espacio.' },
        { tipo: 'cuenta', fondo: 'blanco', kicker: '× 3 minutos', monto: '60', unidad: 'MINUTOS AL DÍA', texto: 'Una hora diaria solo respondiendo para agendar.' },
        { tipo: 'cuenta', fondo: 'negro', kicker: '× 6 días', monto: '6', unidad: 'HORAS A LA SEMANA', texto: 'Casi un día de trabajo entero que no cobras.' },
        {
          tipo: 'texto', fondo: 'blanco', kicker: 'Tu turno', titulo: ['HAZ TU', 'PROPIA', 'CUENTA.'],
          texto: 'Chats al día × minutos por chat × días que trabajas. Cuéntanos en los comentarios cuánto te dio.',
        },
        {
          tipo: 'lista', fondo: 'negro', titulo: ['CON BOOKEAA,', 'ESE TIEMPO', 'VUELVE A TI'], marca: '✓',
          items: ['Tu link responde servicios y precios', 'Tus clientes ven tus horas libres', 'Reservan solos, a cualquier hora', 'Tú solo atiendes'],
        },
        cta(),
      ],
    },
    {
      id: 10,
      nombre: '3 errores que te hacen perder clientes',
      laminas: [
        { tipo: 'portada', fondo: 'negro', kicker: 'Guarda este post', titulo: ['3 ERRORES', 'QUE TE HACEN', 'PERDER', 'CLIENTES'], clase: 'grande', texto: '¿Cometes alguno?' },
        { tipo: 'senal', fondo: 'blanco', num: '01', titulo: ['RESPONDER', 'TARDE.'], texto: 'Quien escribe para reservar quiere respuesta ya. Si tardas, reserva en otro lado.' },
        { tipo: 'senal', fondo: 'negro', num: '02', titulo: ['NO MOSTRAR', 'TUS PRECIOS.'], texto: 'Si tienen que preguntar cuánto cuesta, muchos ni preguntan.' },
        { tipo: 'senal', fondo: 'blanco', num: '03', titulo: ['SOLO AGENDAR', 'EN TU HORARIO.'], texto: 'Muchos clientes deciden de noche. Si nadie contesta, se enfrían.' },
        {
          tipo: 'lista', fondo: 'negro', titulo: ['CÓMO LO', 'RESUELVE', 'BOOKEAA'], marca: '→',
          items: ['Respuesta inmediata: tu link muestra tus horas', 'Servicios con precio y duración a la vista', 'Reservas 24/7, aunque estés dormido'],
        },
        cta(),
      ],
    },
    {
      id: 11,
      nombre: 'Por qué tus clientes faltan',
      laminas: [
        { tipo: 'portada', fondo: 'blanco', kicker: 'Hablemos de esto', titulo: ['¿POR QUÉ', 'TUS CLIENTES', 'FALTAN?'], clase: 'grande', texto: 'Casi nunca es mala intención.' },
        { tipo: 'senal', fondo: 'negro', num: '01', titulo: ['SE LES', 'OLVIDA.'], texto: 'Reservaron hace una semana por chat y el mensaje quedó enterrado.' },
        { tipo: 'senal', fondo: 'blanco', num: '02', titulo: ['ANOTARON', 'MAL LA HORA.'], texto: '"¿No era a las 5?" Una cita de palabra se confunde fácil.' },
        { tipo: 'senal', fondo: 'negro', num: '03', titulo: ['NADIE LES', 'RECORDÓ.'], texto: 'Sin un aviso, la cita compite con todo lo demás de su día.' },
        { tipo: 'telefono', fondo: 'blanco', kicker: 'Con bookeaa', titulo: ['LA CITA QUEDA', 'EN SU', 'CALENDARIO'], texto: 'Con un toque la agrega, y su propio celular le avisa antes.', img: F + '6-listo.jpg' },
        {
          tipo: 'texto', fondo: 'negro', kicker: 'Y además', titulo: ['EL DETALLE', 'LLEGA POR', 'WHATSAPP.'],
          texto: 'Servicio, día, hora y lugar, por escrito. Sin "¿a qué hora era?".',
        },
        cta(),
      ],
    },
    {
      id: 12,
      nombre: 'Dónde poner tu link de reservas',
      laminas: [
        { tipo: 'portada', fondo: 'negro', kicker: 'Guía rápida', titulo: ['DÓNDE', 'PONER TU', 'LINK'], texto: '5 lugares donde tus clientes ya te buscan.' },
        { tipo: 'senal', fondo: 'blanco', num: '01', titulo: ['EN TU BIO', 'DE INSTAGRAM.'], texto: 'Y di "reserva en el link de la bio" en cada post y cada historia.' },
        { tipo: 'senal', fondo: 'negro', num: '02', titulo: ['EN TUS', 'ESTADOS.'], texto: 'Una vez por semana: "¿Quieres hora esta semana? Reserva aquí".' },
        { tipo: 'senal', fondo: 'blanco', num: '03', titulo: ['EN WHATSAPP', 'BUSINESS.'], texto: 'En tu perfil y en la respuesta automática: "Reserva tu hora aquí".' },
        { tipo: 'senal', fondo: 'negro', num: '04', titulo: ['EN GOOGLE', 'MAPS.'], texto: 'En tu Perfil de Empresa de Google, como enlace para reservar.' },
        { tipo: 'senal', fondo: 'blanco', num: '05', titulo: ['EN UN QR', 'EN TU LOCAL.'], texto: 'En la caja o el espejo: el cliente reserva la próxima antes de irse.' },
        cta(),
      ],
    },
    {
      id: 13,
      nombre: 'Tu negocio se ve más profesional',
      laminas: [
        { tipo: 'portada', fondo: 'blanco', kicker: 'Imagen', titulo: ['TU NEGOCIO', 'SE VE MÁS', 'PRO.'], texto: 'La primera impresión empieza en tu link.' },
        { tipo: 'telefono', fondo: 'negro', kicker: 'Tu página', titulo: ['CON TU', 'NOMBRE', 'Y TU MARCA'], texto: 'Tu logo, tus colores, tus servicios y precios.', img: F + '1-inicio.jpg' },
        { tipo: 'grilla', fondo: 'blanco', titulo: ['8 ESTILOS', 'PARA ELEGIR'], imgs: ['elegante', 'moderno', 'audaz', 'minimal'].map((e) => P + e + '.jpg'), nombres: ['Elegante', 'Moderno', 'Audaz', 'Minimal'] },
        {
          tipo: 'comparar', fondo: 'negro', titulo: ['LO QUE VE', 'TU CLIENTE'],
          sin: ['"Escríbeme por DM"', 'Precios por preguntar', 'Espera tu respuesta'],
          con: ['Un link con tu nombre', 'Servicios y precios claros', 'Reserva en un minuto'],
        },
        {
          tipo: 'whatsapp', fondo: 'blanco', kicker: 'Hasta el mensaje', titulo: ['CON TU', 'TONO'],
          mensaje: '✨ ¡Nueva reserva en Barbería Norte! ✨\n\n👤 Carlos Méndez\n🗓️ Jueves 12 de noviembre\n⏰ 4:00 p. m. (45 min)\n💫 • Corte y barba\n📍 En Sede Centro',
          texto: 'Cálido, formal o breve: tú eliges.',
        },
        cta(),
      ],
    },
    {
      id: 14,
      nombre: 'Checklist: activa tu agenda en 1 día',
      laminas: [
        { tipo: 'portada', fondo: 'negro', kicker: 'Checklist', titulo: ['TU AGENDA', 'ONLINE', 'EN 1 DÍA'], texto: 'Guárdalo y ve marcando.' },
        {
          tipo: 'lista', fondo: 'blanco', titulo: ['ANTES DE', 'EMPEZAR'], marca: '□',
          items: ['Lista de servicios con precio', 'Duración de cada uno', 'Tu horario de atención', 'Tu logo (si tienes)'],
        },
        {
          tipo: 'lista', fondo: 'negro', titulo: ['EN BOOKEAA'], marca: '□',
          items: ['Conecta tu Google Calendar', 'Elige tu estilo y tus colores', 'Sedes o domicilio, si aplica', 'Tu mensaje de WhatsApp'],
        },
        {
          tipo: 'lista', fondo: 'blanco', titulo: ['Y A', 'COMPARTIR'], marca: '□',
          items: ['Link en tu bio', 'Historia anunciando que ya reservas online', 'Estado de WhatsApp', 'QR en tu local'],
        },
        {
          tipo: 'texto', fondo: 'negro', kicker: 'No lo haces solo', titulo: ['TE AYUDAMOS', 'A DEJARLO', 'LISTO.'],
          texto: 'Escríbenos y lo configuramos contigo por WhatsApp.',
        },
        cta(),
      ],
    },
    {
      id: 15,
      nombre: 'Cierre de mes: 1 mes gratis',
      laminas: [
        { tipo: 'portada', fondo: 'blanco', kicker: 'Diciembre llega', titulo: ['EMPIEZA', 'DICIEMBRE', 'CON AGENDA.'], clase: 'grande', texto: 'Tu temporada más movida, sin libreta.' },
        {
          tipo: 'lista', fondo: 'negro', titulo: ['LO QUE VIMOS', 'ESTE MES'], marca: '✓',
          items: ['Menos tiempo respondiendo chats', 'Menos citas cruzadas', 'Clientes que sí llegan', 'Reservas mientras duermes', 'Un negocio que se ve pro'],
        },
        { tipo: 'precio', fondo: 'blanco', monto: '$0', detalle: 'EL PRIMER MES', items: ['Todo incluido desde el día uno', 'Te ayudamos a configurarlo', 'Sin tarjeta, sin permanencia'] },
        { tipo: 'precio', fondo: 'negro', monto: '$15', detalle: 'AL MES · DESPUÉS', items: ['Reservas ilimitadas', 'Google Calendar', 'Tu página con tu marca', 'Soporte por WhatsApp'] },
        cta(['ESCRÍBENOS', 'HOY.']),
      ],
    },
  ]
})()
