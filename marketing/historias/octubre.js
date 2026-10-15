/*
 * Historias de octubre (1080×1920): 9 tríos problema → solución → recompensa, y una
 * historia sencilla (encuesta, pregunta, quiz, slider, tip) en cada día hábil restante.
 * Se suben las tres seguidas el mismo día. Cada trío ataca un dolor distinto del
 * dueño del negocio y cierra con lo que gana (la recompensa), no con la función.
 * `sticker`: lo que se agrega al subirla en Instagram (la zona queda libre).
 */
;(function () {
  const F = '../assets/flujo/'
  const LINK = { tipo: 'Enlace', texto: 'Sticker de enlace → wa.me/584220298203 · texto: "Quiero mi mes gratis"' }
  const TE_PASA = (a, b) => ({ tipo: 'Encuesta', texto: '¿Te ha pasado?', opciones: [a, b] })

  const TRIOS = [
    {
      fecha: 'Mar 6 oct', dia: '2026-10-06', angulo: 'Profesionaliza tu oficio',
      problema: { titulo: ['¿TODAVÍA', 'AGENDAS CON', '"AMIGA, ¿TIENES', 'HORA?"'], texto: 'Audios, "ya te confirmo" y una libreta: tu talento es de primera, pero tu forma de agendar se ve improvisada.', sticker: TE_PASA('Sí, así mismo 😅', 'Ya no') },
      solucion: { titulo: ['AGENDA DE', 'NEGOCIO', 'GRANDE.'], texto: 'Tu página de reservas con tu nombre, tus servicios, precios y duración. Tus clientes reservan como en una franquicia.', img: F + '1-inicio.jpg' },
      recompensa: { titulo: ['TE TOMAN', 'EN SERIO.'], texto: 'Clientes que respetan tu tiempo, llegan a su hora y pagan lo que vales. Dejas de ser "la que hace uñas" y pasas a ser una marca.', sticker: LINK },
    },
    {
      fecha: 'Vie 9 oct', dia: '2026-10-09', angulo: 'Tu página web',
      problema: { titulo: ['TU NEGOCIO', 'SOLO EXISTE', 'EN TUS', 'ESTADOS.'], texto: 'El día que no subes historia, nadie sabe qué ofreces ni cuánto cuesta.', sticker: TE_PASA('Total 😩', 'Tengo página') },
      solucion: { titulo: ['TU PROPIA', 'PÁGINA WEB.'], texto: 'bookeaa.com/u/tu-negocio, con tu logo y tus colores. La dejamos lista contigo en una cita.', img: F + '2-servicios.jpg' },
      recompensa: { titulo: ['UN LINK QUE', 'VENDE POR TI.'], texto: 'En tu bio, en tus tarjetas y en un QR en tu local. Te encuentran, ven precios y reservan sin escribirte.', sticker: LINK },
    },
    {
      fecha: 'Lun 12 oct', dia: '2026-10-12', angulo: 'Agenda 24/7',
      problema: { titulo: ['11:47 P. M.', '"¿TIENES', 'CUPO MAÑANA?"'], texto: 'Y si no contestas rápido, reserva en otro lado. El teléfono manda en tu vida.', sticker: TE_PASA('Todas las noches', 'A veces') },
      solucion: { titulo: ['RESERVAN', 'SOLOS,', '24/7.'], texto: 'Ven tus horas libres y eligen. La cita cae en tu Google Calendar y te llega por WhatsApp.', img: F + '4-agenda.jpg' },
      recompensa: { titulo: ['DUERMES.', 'Y AMANECES', 'CON CITAS.'], texto: 'Comes tranquilo, atiendes sin interrupciones y cierras el día sin chats pendientes.', sticker: LINK },
    },
    {
      fecha: 'Jue 15 oct', dia: '2026-10-15', angulo: 'Responder tarde = perder',
      problema: { titulo: ['LO VISTE', '3 HORAS', 'DESPUÉS.'], texto: 'Estabas atendiendo. Cuando respondiste, ya había reservado en otro lado.', sticker: TE_PASA('Me ha pasado 💔', 'Nunca') },
      solucion: { titulo: ['TU AGENDA', 'RESPONDE AL', 'INSTANTE.'], texto: 'Aunque estés con un cliente, tu página muestra las horas libres y confirma la cita en un minuto.', img: F + '4-agenda.jpg' },
      recompensa: { titulo: ['NINGUNA CITA', 'SE TE', 'ESCAPA.'], texto: 'Cada cliente que quiso venir, viene. Sin depender de que veas el teléfono a tiempo.', sticker: LINK },
    },
    {
      fecha: 'Dom 18 oct', dia: '2026-10-18', angulo: 'Citas cruzadas',
      problema: { titulo: ['DOS CLIENTES.', 'MISMA HORA.', 'UNO SE VA', 'MOLESTO.'], texto: 'La libreta no avisa. La memoria tampoco.', sticker: TE_PASA('Sí, qué pena 🙈', 'No') },
      solucion: { titulo: ['TU CALENDARIO', 'DE GOOGLE', 'MANDA.'], texto: 'Cada reserva bloquea su hora. Si anotas algo tú, esa hora deja de ofrecerse sola.', img: F + '6-listo.jpg' },
      recompensa: { titulo: ['AGENDA EN', 'ORDEN.', 'CERO PENA.'], texto: 'Cada cliente llega a su hora, sin choques y sin excusas.', sticker: LINK },
    },
    {
      fecha: 'Mié 21 oct', dia: '2026-10-21', angulo: 'Precios a la vista',
      problema: { titulo: ['"¿PRECIO?"', 'Y DESPUÉS...', 'VISTO.'], texto: 'Respondes uno por uno lo mismo, y la mitad nunca reserva.', sticker: TE_PASA('Cada día 🙃', 'Pocas veces') },
      solucion: { titulo: ['PRECIOS Y', 'DURACIÓN', 'A LA VISTA.'], texto: 'Cada servicio en tu página con su precio y cuánto dura. Eligen y reservan ahí mismo.', img: F + '2-servicios.jpg' },
      recompensa: { titulo: ['TE ESCRIBE', 'QUIEN YA', 'DECIDIÓ.'], texto: 'Menos preguntas sueltas, más reservas confirmadas. Tu tiempo va a quien sí viene.', sticker: LINK },
    },
    {
      fecha: 'Sáb 24 oct', dia: '2026-10-24', angulo: 'Cobrar sin enredos',
      problema: { titulo: ['"¿A CUÁNTO', 'ESTÁ LA TASA', 'HOY?"'], texto: 'Calculadora, captura borrosa y "ya te pago". Cobrar se vuelve otra conversación.', sticker: TE_PASA('Siempre 😵', 'Cobro en $') },
      solucion: { titulo: ['EL MONTO EN', 'BS, CON LA', 'TASA BCV.'], texto: 'Al reservar, tu cliente ve cuánto pagar por Pago Móvil y sube la captura. Le llega su comprobante.', img: F + '5-pago.jpg' },
      recompensa: { titulo: ['COBRAS SIN', 'CALCULADORA', 'NI DISCUSIONES.'], texto: 'Cada pago con su captura y su comprobante. Cuentas claras, cliente tranquilo.', sticker: LINK },
    },
    {
      fecha: 'Mar 27 oct', dia: '2026-10-27', angulo: 'Clientes que no llegan',
      problema: { titulo: ['SE LE OLVIDÓ.', 'TU HORA', 'QUEDÓ VACÍA.'], texto: 'No fue mala intención: anotó mal o nadie se lo recordó. Pero esa hora ya no la recuperas.', sticker: TE_PASA('Esta semana 😤', 'Casi nunca') },
      solucion: { titulo: ['LA CITA EN', 'SU CALENDARIO.'], texto: 'Al reservar la guarda con un toque y su celular le avisa antes. Además recibe su comprobante.', img: F + '6-listo.jpg' },
      recompensa: { titulo: ['MENOS SILLAS', 'VACÍAS.', 'MÁS INGRESOS.'], texto: 'Cada cita cumplida es dinero que sí entra.', sticker: LINK },
    },
    {
      fecha: 'Vie 30 oct', dia: '2026-10-30', angulo: 'Cierre del mes',
      problema: { titulo: ['¿CUÁNTO TE', 'CUESTA SEGUIR', 'IGUAL?'], texto: 'Horas en el chat, citas perdidas y clientes que no vuelven. Todos los meses.', sticker: { tipo: 'Pregunta', texto: '¿Qué es lo que más te quita tiempo? 👇' } },
      solucion: { titulo: ['BOOKEAA.', 'TU AGENDA', 'ONLINE.'], texto: 'Página propia, reservas 24/7, Google Calendar, Pago Móvil y comprobante. Te la dejamos lista en una cita.', img: F + '1-inicio.jpg' },
      recompensa: { titulo: ['1 MES', 'GRATIS.'], texto: 'Luego $10 al mes. Sin contrato. Empieza noviembre con tu agenda trabajando por ti.', sticker: LINK, oferta: true },
    },
  ]

  // Historias sueltas para los días hábiles sin trío: una sola, sencilla, para conversar.
  const SUELTAS = [
    { fecha: 'Mié 7 oct', dia: '2026-10-07', tipo: 'encuesta', fondo: 'blanco', kicker: 'Encuesta', titulo: ['¿CÓMO', 'AGENDAS', 'HOY?'], sticker: { tipo: 'Encuesta', texto: '', opciones: ['Por WhatsApp 💬', 'En libreta 📓'] } },
    { fecha: 'Jue 8 oct', dia: '2026-10-08', tipo: 'pregunta', fondo: 'negro', kicker: 'Cuéntanos', titulo: ['¿QUÉ ES LO QUE', 'MÁS TE CANSA', 'DE AGENDAR?'], sticker: { tipo: 'Pregunta', texto: 'Escríbelo aquí 👇' } },
    { fecha: 'Mar 13 oct', dia: '2026-10-13', tipo: 'tip', fondo: 'blanco', kicker: 'Tip', titulo: ['TU HORARIO', 'NO DEBERÍA', 'SER UN', 'SECRETO.'], texto: 'Si para saber cuándo atiendes hay que escribirte, muchos ni escriben. Pon tu link de reservas en la bio.' },
    { fecha: 'Mié 14 oct', dia: '2026-10-14', tipo: 'slider', fondo: 'negro', kicker: 'Sé sincero', titulo: ['¿CUÁNTOS', '"¿TIENES HORA?"', 'RESPONDES', 'AL DÍA?'], sticker: { tipo: 'Slider', texto: 'Muévelo 👉', emoji: '😩' } },
    { fecha: 'Vie 16 oct', dia: '2026-10-16', tipo: 'encuesta', fondo: 'blanco', kicker: 'Encuesta', titulo: ['¿TUS CLIENTES', 'VEN TUS PRECIOS', 'SIN PREGUNTAR?'], sticker: { tipo: 'Encuesta', texto: '', opciones: ['Sí ✅', 'Todavía no'] } },
    { fecha: 'Lun 19 oct', dia: '2026-10-19', tipo: 'tip', fondo: 'negro', kicker: 'Tip del lunes', titulo: ['COMPARTE', 'TU LINK', 'EL LUNES.'], texto: 'Tus clientes planifican la semana el lunes. Un estado con tu link de reservas y la semana se llena antes.' },
    { fecha: 'Mar 20 oct', dia: '2026-10-20', tipo: 'pregunta', fondo: 'blanco', kicker: 'Queremos saber', titulo: ['¿QUÉ SERVICIO', 'TE PIDEN', 'MÁS?'], sticker: { tipo: 'Pregunta', texto: 'Tu servicio estrella 👇' } },
    { fecha: 'Jue 22 oct', dia: '2026-10-22', tipo: 'quiz', fondo: 'negro', kicker: 'Quiz', titulo: ['¿CUÁNTO CUESTA', 'BOOKEAA', 'AL MES?'], texto: 'Pista: el primer mes es gratis.', sticker: { tipo: 'Quiz', texto: 'Adivina', opciones: ['$30', '$10 ✓', '$50'] } },
    { fecha: 'Vie 23 oct', dia: '2026-10-23', tipo: 'slider', fondo: 'blanco', kicker: 'Del 1 al 🔥', titulo: ['¿QUÉ TAN PRO', 'SE VE TU', 'NEGOCIO?'], sticker: { tipo: 'Slider', texto: 'Califícate 👉', emoji: '🔥' } },
    { fecha: 'Lun 26 oct', dia: '2026-10-26', tipo: 'encuesta', fondo: 'negro', kicker: 'Encuesta', titulo: ['¿TE DEJARON', 'PLANTADO', 'ESTE MES?'], sticker: { tipo: 'Encuesta', texto: '', opciones: ['Sí 😤', 'No, por suerte'] } },
    { fecha: 'Mié 28 oct', dia: '2026-10-28', tipo: 'tip', fondo: 'blanco', kicker: 'Tip', titulo: ['RESPONDE', 'CON TU LINK.'], texto: 'Cuando te pregunten "¿tienes hora?", manda tu link: eligen ellos y tú sigues trabajando.' },
    { fecha: 'Jue 29 oct', dia: '2026-10-29', tipo: 'cuenta', fondo: 'negro', kicker: 'Se viene noviembre', titulo: ['NOVIEMBRE', 'CON AGENDA', 'NUEVA.'], texto: 'Mañana te contamos cómo empezar gratis.', sticker: { tipo: 'Cuenta regresiva', texto: 'Noviembre · 1 nov 2026, 12:00 a. m.' } },
  ]

  const out = []
  TRIOS.forEach((t, i) => {
    ;['problema', 'solucion', 'recompensa'].forEach((fase, j) => {
      out.push({ id: i * 3 + j + 1, trio: i + 1, fecha: t.fecha, dia: t.dia, angulo: t.angulo, fase, paso: j + 1, ...t[fase] })
    })
  })
  SUELTAS.forEach((s, i) => out.push({ id: TRIOS.length * 3 + i + 1, fase: 'sencilla', ...s }))
  window.HISTORIAS_OCTUBRE = out
})()
