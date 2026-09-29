/*
 * Los 7 carruseles de la primera campaña (1080×1350, formato 4:5 de Instagram).
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
  ]
})()
