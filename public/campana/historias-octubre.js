/*
 * Historias de octubre (1080×1920): 9 tríos problema → solución → recompensa.
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
      fecha: 'Mar 6 oct', angulo: 'Profesionaliza tu oficio',
      problema: { titulo: ['¿TODAVÍA', 'AGENDAS CON', '"AMIGA, ¿TIENES', 'HORA?"'], texto: 'Audios, "ya te confirmo" y una libreta: tu talento es de primera, pero tu forma de agendar se ve improvisada.', sticker: TE_PASA('Sí, así mismo 😅', 'Ya no') },
      solucion: { titulo: ['AGENDA DE', 'NEGOCIO', 'GRANDE.'], texto: 'Tu página de reservas con tu nombre, tus servicios, precios y duración. Tus clientes reservan como en una franquicia.', img: F + '1-inicio.jpg' },
      recompensa: { titulo: ['TE TOMAN', 'EN SERIO.'], texto: 'Clientes que respetan tu tiempo, llegan a su hora y pagan lo que vales. Dejas de ser "la que hace uñas" y pasas a ser una marca.', sticker: LINK },
    },
    {
      fecha: 'Vie 9 oct', angulo: 'Tu página web',
      problema: { titulo: ['TU NEGOCIO', 'SOLO EXISTE', 'EN TUS', 'ESTADOS.'], texto: 'El día que no subes historia, nadie sabe qué ofreces ni cuánto cuesta.', sticker: TE_PASA('Total 😩', 'Tengo página') },
      solucion: { titulo: ['TU PROPIA', 'PÁGINA WEB.'], texto: 'bookeaa.com/u/tu-negocio, con tu logo y tus colores. La dejamos lista contigo en una cita.', img: F + '2-servicios.jpg' },
      recompensa: { titulo: ['UN LINK QUE', 'VENDE POR TI.'], texto: 'En tu bio, en tus tarjetas y en un QR en tu local. Te encuentran, ven precios y reservan sin escribirte.', sticker: LINK },
    },
    {
      fecha: 'Lun 12 oct', angulo: 'Agenda 24/7',
      problema: { titulo: ['11:47 P. M.', '"¿TIENES', 'CUPO MAÑANA?"'], texto: 'Y si no contestas rápido, reserva en otro lado. El teléfono manda en tu vida.', sticker: TE_PASA('Todas las noches', 'A veces') },
      solucion: { titulo: ['RESERVAN', 'SOLOS,', '24/7.'], texto: 'Ven tus horas libres y eligen. La cita cae en tu Google Calendar y te llega por WhatsApp.', img: F + '4-agenda.jpg' },
      recompensa: { titulo: ['DUERMES.', 'Y AMANECES', 'CON CITAS.'], texto: 'Comes tranquilo, atiendes sin interrupciones y cierras el día sin chats pendientes.', sticker: LINK },
    },
    {
      fecha: 'Jue 15 oct', angulo: 'Responder tarde = perder',
      problema: { titulo: ['LO VISTE', '3 HORAS', 'DESPUÉS.'], texto: 'Estabas atendiendo. Cuando respondiste, ya había reservado en otro lado.', sticker: TE_PASA('Me ha pasado 💔', 'Nunca') },
      solucion: { titulo: ['TU AGENDA', 'RESPONDE AL', 'INSTANTE.'], texto: 'Aunque estés con un cliente, tu página muestra las horas libres y confirma la cita en un minuto.', img: F + '4-agenda.jpg' },
      recompensa: { titulo: ['NINGUNA CITA', 'SE TE', 'ESCAPA.'], texto: 'Cada cliente que quiso venir, viene. Sin depender de que veas el teléfono a tiempo.', sticker: LINK },
    },
    {
      fecha: 'Dom 18 oct', angulo: 'Citas cruzadas',
      problema: { titulo: ['DOS CLIENTES.', 'MISMA HORA.', 'UNO SE VA', 'MOLESTO.'], texto: 'La libreta no avisa. La memoria tampoco.', sticker: TE_PASA('Sí, qué pena 🙈', 'No') },
      solucion: { titulo: ['TU CALENDARIO', 'DE GOOGLE', 'MANDA.'], texto: 'Cada reserva bloquea su hora. Si anotas algo tú, esa hora deja de ofrecerse sola.', img: F + '6-listo.jpg' },
      recompensa: { titulo: ['AGENDA EN', 'ORDEN.', 'CERO PENA.'], texto: 'Cada cliente llega a su hora, sin choques y sin excusas.', sticker: LINK },
    },
    {
      fecha: 'Mié 21 oct', angulo: 'Precios a la vista',
      problema: { titulo: ['"¿PRECIO?"', 'Y DESPUÉS...', 'VISTO.'], texto: 'Respondes uno por uno lo mismo, y la mitad nunca reserva.', sticker: TE_PASA('Cada día 🙃', 'Pocas veces') },
      solucion: { titulo: ['PRECIOS Y', 'DURACIÓN', 'A LA VISTA.'], texto: 'Cada servicio en tu página con su precio y cuánto dura. Eligen y reservan ahí mismo.', img: F + '2-servicios.jpg' },
      recompensa: { titulo: ['TE ESCRIBE', 'QUIEN YA', 'DECIDIÓ.'], texto: 'Menos preguntas sueltas, más reservas confirmadas. Tu tiempo va a quien sí viene.', sticker: LINK },
    },
    {
      fecha: 'Sáb 24 oct', angulo: 'Cobrar sin enredos',
      problema: { titulo: ['"¿A CUÁNTO', 'ESTÁ LA TASA', 'HOY?"'], texto: 'Calculadora, captura borrosa y "ya te pago". Cobrar se vuelve otra conversación.', sticker: TE_PASA('Siempre 😵', 'Cobro en $') },
      solucion: { titulo: ['EL MONTO EN', 'BS, CON LA', 'TASA BCV.'], texto: 'Al reservar, tu cliente ve cuánto pagar por Pago Móvil y sube la captura. Le llega su comprobante.', img: F + '5-pago.jpg' },
      recompensa: { titulo: ['COBRAS SIN', 'CALCULADORA', 'NI DISCUSIONES.'], texto: 'Cada pago con su captura y su comprobante. Cuentas claras, cliente tranquilo.', sticker: LINK },
    },
    {
      fecha: 'Mar 27 oct', angulo: 'Clientes que no llegan',
      problema: { titulo: ['SE LE OLVIDÓ.', 'TU HORA', 'QUEDÓ VACÍA.'], texto: 'No fue mala intención: anotó mal o nadie se lo recordó. Pero esa hora ya no la recuperas.', sticker: TE_PASA('Esta semana 😤', 'Casi nunca') },
      solucion: { titulo: ['LA CITA EN', 'SU CALENDARIO.'], texto: 'Al reservar la guarda con un toque y su celular le avisa antes. Además recibe su comprobante.', img: F + '6-listo.jpg' },
      recompensa: { titulo: ['MENOS SILLAS', 'VACÍAS.', 'MÁS INGRESOS.'], texto: 'Cada cita cumplida es dinero que sí entra.', sticker: LINK },
    },
    {
      fecha: 'Vie 30 oct', angulo: 'Cierre del mes',
      problema: { titulo: ['¿CUÁNTO TE', 'CUESTA SEGUIR', 'IGUAL?'], texto: 'Horas en el chat, citas perdidas y clientes que no vuelven. Todos los meses.', sticker: { tipo: 'Pregunta', texto: '¿Qué es lo que más te quita tiempo? 👇' } },
      solucion: { titulo: ['BOOKEAA.', 'TU AGENDA', 'ONLINE.'], texto: 'Página propia, reservas 24/7, Google Calendar, Pago Móvil y comprobante. Te la dejamos lista en una cita.', img: F + '1-inicio.jpg' },
      recompensa: { titulo: ['1 MES', 'GRATIS.'], texto: 'Luego $10 al mes. Sin contrato. Empieza noviembre con tu agenda trabajando por ti.', sticker: LINK, oferta: true },
    },
  ]

  const out = []
  TRIOS.forEach((t, i) => {
    ;['problema', 'solucion', 'recompensa'].forEach((fase, j) => {
      out.push({ id: i * 3 + j + 1, trio: i + 1, fecha: t.fecha, angulo: t.angulo, fase, paso: j + 1, ...t[fase] })
    })
  })
  window.HISTORIAS_OCTUBRE = out
})()
