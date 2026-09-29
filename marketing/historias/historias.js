/*
 * Historias de Instagram de noviembre (1080×1920), una por día hábil.
 * Cada historia deja libre la zona del sticker (pregunta, encuesta, quiz, slider o cuenta regresiva):
 * el sticker se agrega al subirla, con el texto de `sticker`. Arriba y abajo se respetan
 * las zonas que tapa la interfaz de Instagram.
 */
;(function () {
  const V = '../salida/videos/bookeaa-video-'

  window.HISTORIAS = [
    // Semana 1 · Así cambia tu día
    { id: 1, fecha: 'Lun 2 nov', tipo: 'encuesta', fondo: 'negro', kicker: 'Encuesta', titulo: ['¿CÓMO', 'AGENDAS A TUS', 'CLIENTES HOY?'], sticker: { tipo: 'Encuesta', texto: '', opciones: ['Por chat 💬', 'En libreta 📓'] } },
    { id: 2, fecha: 'Mar 3 nov', tipo: 'pregunta', fondo: 'blanco', kicker: 'Cuéntanos', titulo: ['¿QUÉ ES LO', 'QUE MÁS TE', 'CANSA DE', 'AGENDAR?'], sticker: { tipo: 'Preguntas', texto: 'Escríbelo aquí 👇' } },
    { id: 3, fecha: 'Mié 4 nov', tipo: 'nuevo', fondo: 'negro', kicker: 'Nuevo reel', titulo: ['UN DÍA SIN', 'Y CON', 'BOOKEAA'], img: V + '5-portada.jpg', sticker: { tipo: 'Compartir el reel', texto: 'Comparte el reel en tu historia y colócalo sobre el recuadro' } },
    { id: 4, fecha: 'Jue 5 nov', tipo: 'quiz', fondo: 'blanco', kicker: 'Quiz', titulo: ['20 CHATS AL DÍA', '× 3 MINUTOS', '× 6 DÍAS', '= ¿CUÁNTO?'], sticker: { tipo: 'Quiz', texto: '¿Cuánto tiempo a la semana?', opciones: ['2 horas', '6 horas ✓', '10 horas'] } },
    { id: 5, fecha: 'Vie 6 nov', tipo: 'slider', fondo: 'negro', kicker: 'Sé sincero', titulo: ['¿CUÁNTO TIEMPO', 'PASAS EN EL CHAT', 'AGENDANDO?'], sticker: { tipo: 'Slider', texto: 'Muévelo 👉', emoji: '😩' } },

    // Semana 2 · Tiempo y clientes
    { id: 6, fecha: 'Lun 9 nov', tipo: 'encuesta', fondo: 'blanco', kicker: 'Encuesta', titulo: ['¿ALGUNA VEZ', 'RESPONDISTE TARDE', 'Y PERDISTE', 'LA CITA?'], sticker: { tipo: 'Encuesta', texto: '', opciones: ['Sí, seguido 😅', 'A veces'] } },
    { id: 7, fecha: 'Mar 10 nov', tipo: 'tip', fondo: 'negro', kicker: 'Tip del día', titulo: ['PON TUS', 'PRECIOS', 'A LA VISTA.'], texto: 'Si tienen que preguntar cuánto cuesta, muchos ni preguntan. En tu página de bookeaa cada servicio muestra precio y duración.', sticker: { tipo: 'Reacción (opcional)', texto: 'Agrega el sticker de emoji 🔥 o "Link" a tu perfil' } },
    { id: 8, fecha: 'Mié 11 nov', tipo: 'nuevo', fondo: 'blanco', kicker: 'Nuevo reel', titulo: ['¿CUÁNTO', 'TIEMPO PIERDES', 'AGENDANDO?'], img: V + '6-portada.jpg', sticker: { tipo: 'Compartir el reel', texto: 'Comparte el reel en tu historia y colócalo sobre el recuadro' } },
    { id: 9, fecha: 'Jue 12 nov', tipo: 'pregunta', fondo: 'negro', kicker: 'Pregunta', titulo: ['¿CUÁNTOS', 'CLIENTES TE', 'DEJAN PLANTADO', 'AL MES?'], sticker: { tipo: 'Preguntas', texto: 'Dinos un número 👇' } },
    { id: 10, fecha: 'Vie 13 nov', tipo: 'quiz', fondo: 'blanco', kicker: 'Quiz', titulo: ['¿POR QUÉ FALTA', 'LA MAYORÍA', 'DE LOS CLIENTES?'], sticker: { tipo: 'Quiz', texto: 'Adivina', opciones: ['Mala intención', 'Se les olvida ✓', 'No les gustó'] } },

    // Semana 3 · Tu link y tu imagen
    { id: 11, fecha: 'Lun 16 nov', tipo: 'encuesta', fondo: 'negro', kicker: 'Encuesta', titulo: ['¿TIENES UN LINK', 'DE RESERVAS', 'EN TU BIO?'], sticker: { tipo: 'Encuesta', texto: '', opciones: ['Sí ✅', 'Todavía no'] } },
    { id: 12, fecha: 'Mar 17 nov', tipo: 'tip', fondo: 'blanco', kicker: 'Tip del día', titulo: ['UN QR', 'EN TU CAJA.'], texto: 'Tu cliente reserva la próxima cita antes de irse. Imprímelo con tu link de bookeaa y pégalo donde pagan.', sticker: { tipo: 'Reacción (opcional)', texto: 'Agrega el sticker de emoji 🙌' } },
    { id: 13, fecha: 'Mié 18 nov', tipo: 'nuevo', fondo: 'negro', kicker: 'Nuevo reel', titulo: ['CLIENTES', 'QUE SÍ', 'LLEGAN'], img: V + '7-portada.jpg', sticker: { tipo: 'Compartir el reel', texto: 'Comparte el reel en tu historia y colócalo sobre el recuadro' } },
    { id: 14, fecha: 'Jue 19 nov', tipo: 'slider', fondo: 'blanco', kicker: 'Del 1 al 🔥', titulo: ['¿QUÉ TAN PRO', 'SE VE TU FORMA', 'DE AGENDAR?'], sticker: { tipo: 'Slider', texto: 'Califícate 👉', emoji: '🔥' } },
    { id: 15, fecha: 'Vie 20 nov', tipo: 'encuesta', fondo: 'negro', kicker: 'Elige', titulo: ['¿QUÉ ESTILO', 'VA CON TU', 'NEGOCIO?'], sticker: { tipo: 'Encuesta', texto: '', opciones: ['Elegante ✨', 'Audaz ⚡'] } },

    // Semana 4 · Activa tu agenda
    { id: 16, fecha: 'Lun 23 nov', tipo: 'pregunta', fondo: 'blanco', kicker: 'Sin pena', titulo: ['¿QUÉ TE FRENA', 'PARA TENER', 'AGENDA ONLINE?'], sticker: { tipo: 'Preguntas', texto: 'Pregúntanos lo que quieras 👇' } },
    { id: 17, fecha: 'Mar 24 nov', tipo: 'respuesta', fondo: 'negro', kicker: 'Respondemos', titulo: ['TUS', 'PREGUNTAS'], sticker: { tipo: 'Responder pregunta', texto: 'Usa este fondo para responder las del lunes: comparte la respuesta, pega la pregunta arriba y escribe abajo' } },
    { id: 18, fecha: 'Mié 25 nov', tipo: 'nuevo', fondo: 'blanco', kicker: 'Nuevo reel', titulo: ['RESERVAS', 'MIENTRAS', 'DUERMES'], img: V + '8-portada.jpg', sticker: { tipo: 'Compartir el reel', texto: 'Comparte el reel en tu historia y colócalo sobre el recuadro' } },
    { id: 19, fecha: 'Jue 26 nov', tipo: 'cuenta', fondo: 'negro', kicker: 'Se viene diciembre', titulo: ['TU AGENDA', 'LISTA PARA', 'DICIEMBRE.'], sticker: { tipo: 'Cuenta regresiva', texto: 'Diciembre · 1 dic 2026, 12:00 a. m.' } },
    { id: 20, fecha: 'Vie 27 nov', tipo: 'encuesta', fondo: 'blanco', kicker: '1 mes gratis', titulo: ['¿TE AYUDAMOS', 'A ACTIVAR', 'TU AGENDA?'], sticker: { tipo: 'Encuesta', texto: '', opciones: ['¡Sí, escríbanme!', 'Más adelante'] } },
  ]
})()
