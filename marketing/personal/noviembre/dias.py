# Contenido de noviembre de bookeaa: 19 días hábiles (4 al 30), cada uno con 4 piezas:
#   MG (motion graphics sin voz) · VOZ (voz A, cálida) · VOZ2 (voz B, clara y profesional) · carrusel.
# Técnica nueva (ver ESTRATEGIA-NOVIEMBRE.md): un nicho por semana, un formato por día de la semana
# y UNA palabra clave de comentario por semana, para saber qué mueve a quién.
#
# Reglas de escritura (no negociables):
#   - Nada de testimonios, clientes ni cifras inventadas. Los ejemplos van marcados ("imagina", "un ejemplo")
#     y las cuentas se hacen con números que están a la vista (20 × 1,2 = 24).
#   - Solo se promete lo que bookeaa hace hoy (docs/MI-NEGOCIO.md, docs/TEAM.md): página con tu nombre, 8 estilos,
#     reservas 24 h, Google Calendar, Pago Móvil con capture y "Pago recibido", avisos al teléfono del dueño
#     (reserva nueva, 30 min antes, resumen de las 7:00), reagendar, cupones, sedes, domicilio (+20 % y traslado),
#     QR de mostrador, equipo con una agenda por persona. $10 al mes, primer mes gratis.
#   - Voz A (José Manuel, cálida): historia y emoción. Voz B (Joseph Corona, clara): explica, hace la cuenta, cierra.
#   - En los guiones de voz "bookeaa" se escribe "bukéa" para ElevenLabs; el generador lo vuelve a "bookeaa" para alinear.

SEMANAS = {
    1: ('Barberías', 'BARBERO', '#barberia #barberos #barbershop #agendaonline #bookeaa'),
    2: ('Uñas y estética', 'UÑAS', '#uñas #manicurista #nailsvenezuela #agendaonline #bookeaa'),
    3: ('Spas, consultorios y salud', 'CONSULTA', '#spa #estetica #consultorio #bienestar #agendaonline #bookeaa'),
    4: ('Negocios con equipo, sedes y domicilio', 'EQUIPO', '#emprendedores #negociosvenezuela #agendaonline #bookeaa'),
    5: ('Cierre de mes', 'AGENDA', '#emprendedores #negociosvenezuela #agendaonline #bookeaa'),
}
FORMATOS = {'MIE': 'Objeción', 'JUE': 'Caso', 'VIE': 'Oferta', 'LUN': 'Dolor', 'MAR': 'Cómo funciona'}

F = 'flujo/'
AGENDA = F + '4-agenda.jpg'
SERVICIOS = F + '2-servicios.jpg'
INICIO = F + '1-inicio.jpg'
LISTO = F + '6-listo.jpg'


def S(tag, texto, *titulo, kicker=None, extra=None):
    """Un tramo de guion: etiqueta de ElevenLabs, lo que se dice y (opcional) la pantalla que arranca ahí."""
    return {'tag': tag, 'texto': texto, 'titulo': list(titulo), 'kicker': kicker, 'extra': extra or {}}


def phone(img, y=780, ancho=330, x=375, en=0.9):
    return {'telefonos': [{'img': img, 'ancho': ancho, 'x': x, 'y': y, 'en': en}]}


DIAS = []


def dia(fecha, sem, d, tema, gancho, mg, A, B, car):
    DIAS.append(dict(fecha=fecha, sem=sem, dia=d, tema=tema, gancho=gancho, mg=mg, A=A, B=B, car=car))


# ═══ SEMANA 1 · BARBERÍAS (BARBERO) ═══════════════════════════════════════════
dia('2026-11-04', 1, 'MIE', 'Mis clientes prefieren WhatsApp', 'Tus clientes no prefieren WhatsApp: prefieren que les respondas.',
    mg=dict(kicker='Barbero, ¿te suena?', beats=[['“MIS CLIENTES', 'PREFIEREN', 'WHATSAPP”.'], ['PREFIEREN QUE', 'LES RESPONDAS.'], ['Y TÚ ESTÁS', 'CORTANDO.'], ['TU LINK', 'RESPONDE', 'POR TI.']]),
    A=[S('tranquilo', 'Barbero, ¿tus clientes te escriben por WhatsApp para pedir hora?', '¿TE ESCRIBEN', 'PARA PEDIR', 'HORA?', kicker='Barbero, ¿te suena?'),
       S('serio', 'Y tú, con la máquina en la mano, no puedes contestar. [pausa corta] Cuando por fin respondes, ya reservaron en otra barbería.', 'TÚ ESTÁS', 'CORTANDO.', extra=None),
       S('con energía', 'Con bukéa tu cliente entra a tu link, ve las horas libres y reserva solo.', 'ENTRA.', 'VE TUS HORAS.', 'RESERVA SOLO.', extra=phone(AGENDA)),
       S('cálido, con una sonrisa', 'Y tú sigues cortando. Comenta BARBERO y te armo tu página gratis.', 'COMENTA', 'BARBERO.')],
    B=[S('serio', 'Dices que tus clientes prefieren WhatsApp.', '“PREFIEREN', 'WHATSAPP”.', kicker='Mito de barbería'),
       S('tranquilo', 'En realidad prefieren una respuesta rápida.', 'PREFIEREN', 'UNA RESPUESTA', 'RÁPIDA.'),
       S('con energía', 'Con bukéa, el WhatsApp queda para atender, no para agendar. Tu cliente reserva en tu link y a ti te llega un aviso en el teléfono.', 'EL LINK', 'AGENDA.', 'TÚ ATIENDES.'),
       S('cálido', 'Escríbeme BARBERO y te la dejo lista, gratis.', 'ESCRÍBEME', 'BARBERO.')],
    car=dict(titulo='Tus clientes no prefieren WhatsApp', portada=('Barberos', ['NO PREFIEREN', 'WHATSAPP.', 'PREFIEREN', 'RESPUESTA.'], 'Y la respuesta más rápida es tu link'),
             senales=[(['“¿TIENES', 'HORA HOY?”'], 'Te llega mientras tienes la máquina en la mano.'),
                      (['NO PUEDES', 'CONTESTAR.'], 'Pasan 20 minutos. El cliente ya preguntó en otra barbería.'),
                      (['QUIEN RESPONDE', 'PRIMERO SE', 'QUEDA LA CITA.'], 'No es cuestión de precio: es cuestión de rapidez.')],
             lista=(['CON TU LINK,', 'EL CLIENTE:'], ['Ve tus horas libres', 'Elige corte, barba o combo', 'Reserva en segundos', 'Tú recibes el aviso']),
             caption='Tus clientes no prefieren WhatsApp: prefieren que les respondas rápido. Con tu link de reservas la respuesta está siempre lista 📅 Comenta BARBERO 👇 y te armo tu página gratis.'))

dia('2026-11-05', 1, 'JUE', 'Un sábado en la barbería', 'Imagina un sábado en tu barbería: 14 clientes y el teléfono sonando.',
    mg=dict(kicker='Imagina un sábado', beats=[['SÁBADO.', '14 CLIENTES.', '1 BARBERO.'], ['Y EL TELÉFONO', 'NO PARA.'], ['CON LINK,', 'RESERVAN', 'SOLOS.']]),
    A=[S('tranquilo', 'Imagina un sábado en tu barbería.', 'SÁBADO.', '14 CLIENTES.', '1 BARBERO.', kicker='Imagina'),
       S('serio', 'Catorce clientes agendados, el teléfono sonando, y tú con la máquina en la mano. [pausa corta] Cada mensaje sin responder es un cliente que se va a otro lado.', 'MENSAJES', 'SIN RESPONDER.'),
       S('con energía', 'Con bukéa tu agenda ya está en un link: tus clientes reservan solos y el sábado se llena sin que tengas que soltar la máquina.', 'RESERVAN', 'SOLOS.', extra=phone(AGENDA)),
       S('cálido, con una sonrisa', 'Comenta BARBERO y te armo tu página gratis.', 'COMENTA', 'BARBERO.')],
    B=[S('serio', 'Un ejemplo con números.', 'UN EJEMPLO', 'CON NÚMEROS.', kicker='Haz la cuenta'),
       S('tranquilo', 'Si cada cita te lleva tres mensajes y atiendes quince clientes, son cuarenta y cinco mensajes.', '15 × 3 =', '45 MENSAJES.'),
       S('con energía', 'Con bukéa, tu cliente elige su hora en el link y esos mensajes desaparecen. Tú recuperas ese tiempo para cortar.', 'ESOS MENSAJES', 'DESAPARECEN.'),
       S('cálido', 'Escríbeme BARBERO y te dejo la página lista gratis.', 'ESCRÍBEME', 'BARBERO.')],
    car=dict(titulo='Cuántos mensajes te cuesta agendar', portada=('Haz esta cuenta', ['¿CUÁNTOS', 'MENSAJES', 'POR CITA?'], 'Un ejemplo con números fáciles'),
             senales=[(['CITAS AL DÍA', '× MENSAJES', 'POR CITA.'], 'Pregunta, hora, confirmación, cambio… suelen ser 3 o más.'),
                      (['15 × 3 =', '45 MENSAJES.'], 'Es un ejemplo: pon tus números.'),
                      (['45 MINUTOS', 'AL DÍA.'], 'Si cada mensaje te toma 1 minuto, es casi una hora sin atender.')],
             lista=(['CON TU LINK:'], ['El cliente elige servicio y hora', 'No hay ida y vuelta', 'La cita queda en tu calendario', 'Ese tiempo es para cortar']),
             caption='¿Cuántos mensajes escribes para agendar un solo día? 15 clientes × 3 mensajes = 45. Con tu link de reservas son casi cero 📅 Comenta BARBERO 👇 y te armo tu página gratis.'))

dia('2026-11-06', 1, 'VIE', 'Te armo tu página de barbería', 'Barbero: te armo tu página de reservas gratis y te dejo tu cartel con QR.',
    mg=dict(kicker='Para barberos', beats=[['TU BARBERÍA', 'CON SU PROPIA', 'PÁGINA.'], ['TUS SERVICIOS.', 'TUS PRECIOS.', 'TUS HORAS.'], ['CARTEL CON', 'TU QR PARA EL', 'MOSTRADOR.']]),
    A=[S('animado', 'Barbero, esto es para ti.', 'BARBERO,', 'ESTO ES', 'PARA TI.', kicker='Viernes'),
       S('tranquilo', 'Te armo tu página de reservas gratis: tu nombre, tus servicios, tus precios y tus horas libres.', 'TU NOMBRE.', 'TUS PRECIOS.', 'TUS HORAS.', extra=phone(SERVICIOS)),
       S('con energía', 'Y te dejo un cartel con tu código QR para el mostrador: el cliente lo escanea y reserva desde la silla.', 'CARTEL CON', 'TU QR.'),
       S('cálido, con una sonrisa', 'El primer mes es gratis. Comenta BARBERO y te la armo hoy.', 'COMENTA', 'BARBERO.')],
    B=[S('serio', 'Cómo funciona, en tres pasos.', 'TRES PASOS.', kicker='Así de simple'),
       S('tranquilo', 'Uno: me dices tus servicios y tus horas. Dos: yo configuro tu página. Tres: la compartes con un link o con tu código QR.', '1 · ME DICES.', '2 · YO LA ARMO.', '3 · COMPARTES.'),
       S('con energía', 'Si te gusta, sigues por diez dólares al mes.', '10 DÓLARES', 'AL MES.'),
       S('cálido', 'Si no, no pasó nada. Escríbeme BARBERO.', 'ESCRÍBEME', 'BARBERO.')],
    car=dict(titulo='Lo que incluye tu página de barbería', portada=('Para barberos', ['TU BARBERÍA,', 'CON SU PROPIA', 'PÁGINA.'], 'Esto es lo que incluye'),
             senales=[(['TU NOMBRE.', 'TUS SERVICIOS.', 'TUS PRECIOS.'], 'Corte, barba, combo: cada uno con su duración y su precio.'),
                      (['CARTEL CON', 'TU QR.'], 'Para el mostrador: tu cliente lo escanea y reserva desde la silla.'),
                      (['PAGO MÓVIL', 'DENTRO DE', 'LA CITA.'], 'Reporta el pago con su capture y tú confirmas con un toque.')],
             lista=(['ADEMÁS:'], ['8 estilos para tu marca', 'Conectada a tu Google Calendar', 'Cupones para clientes nuevos', 'Avisos en tu teléfono']),
             caption='Barbero: te armo tu página de reservas gratis, con tus servicios, tus precios y tu cartel con QR para el mostrador. Primer mes gratis, después $10 al mes 📅 Comenta BARBERO 👇'))

# ═══ SEMANA 2 · UÑAS Y ESTÉTICA (UÑAS) ═══════════════════════════════════════
dia('2026-11-09', 2, 'LUN', 'Dos clientas, la misma hora', 'Manicurista, ¿alguna vez agendaste a dos clientas a la misma hora?',
    mg=dict(kicker='Manicurista, ¿te pasó?', beats=[['DOS CLIENTAS.', 'LA MISMA', 'HORA.'], ['UNA SE VA', 'MOLESTA.'], ['UNA HORA.', 'UNA CITA.']]),
    A=[S('tranquilo', 'Manicurista, ¿alguna vez agendaste a dos clientas a la misma hora?', 'DOS CLIENTAS.', 'LA MISMA', 'HORA.', kicker='¿Te pasó?'),
       S('serio', 'Una se va molesta, y la otra… ya no vuelve. [pausa corta] Pasa cuando tu agenda vive en la libreta, en el chat y en tu cabeza.', 'LIBRETA.', 'CHAT.', 'TU CABEZA.'),
       S('con energía', 'Con bukéa solo existe una agenda: cuando una hora se ocupa, desaparece del link para todas.', 'UNA HORA.', 'UNA CITA.'),
       S('cálido', 'Comenta UÑAS y te armo tu página gratis.', 'COMENTA', 'UÑAS.')],
    B=[S('serio', 'Un servicio de uñas puede durar dos horas.', '2 HORAS', 'POR CLIENTA.', kicker='Dato de oficio'),
       S('tranquilo', 'Por eso un cruce no es un descuido pequeño: es una clienta menos.', 'UN CRUCE', 'ES UNA', 'CLIENTA MENOS.'),
       S('con energía', 'En bukéa cada servicio tiene su duración, y el calendario bloquea el tiempo exacto. Nadie puede reservar una hora que ya no tienes.', 'EL TIEMPO', 'SE BLOQUEA', 'SOLO.', extra=phone(AGENDA)),
       S('cálido, con una sonrisa', 'Escríbeme UÑAS y la configuro gratis.', 'ESCRÍBEME', 'UÑAS.')],
    car=dict(titulo='Cómo evitar el cruce de citas', portada=('Manicuristas', ['CÓMO EVITAR', 'EL CRUCE', 'DE CITAS.'], 'Guarda este post'),
             senales=[(['01 · CADA SERVICIO', 'CON SU TIEMPO.'], 'Esmaltado, acrílicas, retoque: no duran lo mismo.'),
                      (['02 · UNA SOLA', 'AGENDA.'], 'Libreta + chat + cabeza = dos clientas a la misma hora.'),
                      (['03 · QUE LA HORA', 'OCUPADA', 'DESAPAREZCA.'], 'Si ya no está libre, nadie debería poder pedirla.')],
             lista=(['BOOKEAA', 'HACE LAS 3:'], ['Duración por servicio', 'Una sola agenda', 'Horas ocupadas fuera del link', 'La cita en tu Google Calendar']),
             caption='Dos clientas a la misma hora: pasa cuando la agenda vive en la libreta, el chat y tu cabeza. Con una sola agenda online la hora ocupada desaparece del link 📅 Comenta UÑAS 👇 y te armo tu página gratis.'))

dia('2026-11-10', 2, 'MAR', 'El tiempo se bloquea solo', 'Tu clienta elige el servicio y el tiempo se bloquea solo.',
    mg=dict(kicker='Cada servicio, su tiempo', beats=[['ESMALTADO.', 'ACRÍLICAS.', 'RETOQUE.'], ['CADA UNO CON', 'SU DURACIÓN', 'Y SU PRECIO.'], ['ELLA ELIGE.', 'TÚ ATIENDES.']]),
    A=[S('intrigante', '¿Y si tu clienta pudiera elegir su servicio sin escribirte?', '¿Y SI ELLA', 'ELIGE SIN', 'ESCRIBIRTE?', kicker='Imagina'),
       S('tranquilo', 'Esmaltado, acrílicas, retoque: cada uno con su precio y cuánto dura.', 'ESMALTADO.', 'ACRÍLICAS.', 'RETOQUE.', extra=phone(SERVICIOS)),
       S('con energía', 'Ella elige, ve las horas que de verdad caben, y reserva.', 'ELLA ELIGE.', 'TÚ ATIENDES.'),
       S('cálido, con una sonrisa', 'La cita cae en tu calendario y a ti te llega un aviso. Comenta UÑAS y te la configuro gratis.', 'COMENTA', 'UÑAS.')],
    B=[S('serio', 'Esto es lo que pasa cuando una clienta reserva en tu link.', 'ASÍ RESERVA', 'UNA CLIENTA.', kicker='Paso a paso'),
       S('tranquilo', 'Elige el servicio, y solo ve horas donde cabe el tiempo completo.', 'SOLO VE HORAS', 'DONDE CABE.', extra=phone(AGENDA)),
       S('con energía', 'Tú recibes un aviso en el teléfono, treinta minutos antes un recordatorio, y a las siete de la mañana el resumen de tus citas.', 'AVISO.', 'RECORDATORIO.', 'RESUMEN 7 A. M.'),
       S('cálido', 'Escríbeme UÑAS y lo dejamos listo.', 'ESCRÍBEME', 'UÑAS.')],
    car=dict(titulo='Así reserva tu clienta, paso a paso', portada=('Cómo funciona', ['ASÍ RESERVA', 'TU CLIENTA.'], 'En 4 pasos'),
             senales=[(['01 · ELIGE', 'EL SERVICIO.'], 'Con su precio y su duración a la vista.'),
                      (['02 · VE SOLO', 'HORAS REALES.'], 'Las que caben completas en tu agenda.'),
                      (['03 · RESERVA.'], 'Sin escribirte, sin esperar respuesta.')],
             lista=(['04 · TÚ:'], ['Recibes el aviso en el teléfono', 'La cita cae en tu calendario', 'Recordatorio 30 min antes', 'Resumen a las 7:00 a. m.']),
             caption='Así reserva tu clienta: elige el servicio, ve solo horas reales y reserva sin escribirte. A ti te llega el aviso y la cita cae en tu calendario 📅 Comenta UÑAS 👇 y te armo tu página gratis.'))

dia('2026-11-11', 2, 'MIE', 'Ya tengo mis clientas fijas', '“Ya tengo mis clientas fijas”. Qué bueno. Pero las fijas también cancelan.',
    mg=dict(kicker='Manicurista, ¿te suena?', beats=[['“YA TENGO', 'MIS CLIENTAS', 'FIJAS”.'], ['LAS FIJAS', 'TAMBIÉN', 'CANCELAN.'], ['¿QUIÉN LLENA', 'ESE HUECO?']]),
    A=[S('tranquilo', '“Ya tengo mis clientas fijas”.', '“YA TENGO', 'MIS CLIENTAS', 'FIJAS”.', kicker='Manicurista, ¿te suena?'),
       S('serio', 'Qué bueno. Pero las fijas también cancelan, también cambian de hora, y también se olvidan. [pausa corta] Y cuando eso pasa, ese hueco se queda vacío.', 'LAS FIJAS', 'TAMBIÉN', 'CANCELAN.'),
       S('con energía', 'Con bukéa esa hora libre aparece en tu link y alguien nuevo puede tomarla.', 'ESA HORA', 'LA TOMA', 'ALGUIEN NUEVO.', extra=phone(AGENDA)),
       S('cálido, con una sonrisa', 'Comenta UÑAS y te armo tu página gratis.', 'COMENTA', 'UÑAS.')],
    B=[S('serio', 'Tener clientas fijas es la mejor base que puedes tener.', 'LAS FIJAS', 'SON TU BASE.', kicker='Sin reemplazar nada'),
       S('tranquilo', 'Una agenda online no las reemplaza: las ordena.', 'NO LAS', 'REEMPLAZA.', 'LAS ORDENA.'),
       S('con energía', 'Tus fijas reservan en dos toques, y las horas que quedan libres las ve quien todavía no te conoce.', 'LAS FIJAS:', '2 TOQUES.', 'LAS LIBRES:', 'PARA NUEVAS.'),
       S('cálido', 'Es el mismo negocio, con menos mensajes. Escríbeme UÑAS y probamos gratis.', 'ESCRÍBEME', 'UÑAS.')],
    car=dict(titulo='3 huecos que se pueden llenar', portada=('Manicuristas', ['“YA TENGO', 'CLIENTAS', 'FIJAS”.'], 'Y aun así, tu agenda tiene huecos'),
             senales=[(['LA QUE', 'CANCELA.'], 'Avisa tarde y esa hora queda vacía.'),
                      (['LA QUE', 'CAMBIA DE HORA.'], 'Y la hora de antes ya no se vende.'),
                      (['LA QUE', 'NUNCA TE', 'ENCONTRÓ.'], 'No te escribe porque no sabe si tienes espacio.')],
             lista=(['CON TU LINK:'], ['Tus fijas reservan en dos toques', 'Las horas libres se ven', 'Una clienta nueva puede tomarlas', 'Tú no contestas nada']),
             caption='Las clientas fijas también cancelan, cambian de hora o se olvidan. Con tu link, esa hora libre la puede tomar una clienta nueva 📅 Comenta UÑAS 👇 y te armo tu página gratis.'))

dia('2026-11-12', 2, 'JUE', '11:02 p. m., reserva sola', 'Son las once de la noche y una clienta quiere agendar.',
    mg=dict(kicker='Imagina', beats=[['11:02 P. M.'], ['ELLA QUIERE', 'UNA HORA.'], ['TÚ DUERMES.', 'TU LINK LA', 'ATIENDE.']]),
    A=[S('intrigante', 'Son las once de la noche.', '11:02', 'P. M.', kicker='Imagina'),
       S('tranquilo', 'Una clienta ve tus uñas en una foto y quiere agendar. [serio] Si tiene que esperar a que despiertes, quizá ya no quiera.', 'ELLA QUIERE', 'UNA HORA.'),
       S('con energía', 'Pero si tienes tu link, entra, elige su servicio, y reserva en dos minutos.', 'ENTRA.', 'ELIGE.', 'RESERVA.', extra=phone(SERVICIOS)),
       S('cálido, con una sonrisa', 'Tú despiertas con la cita ya en tu calendario. Comenta UÑAS.', 'COMENTA', 'UÑAS.')],
    B=[S('serio', 'Muchas citas se piden de noche, cuando ya cerraste.', 'LAS CITAS', 'SE PIDEN', 'DE NOCHE.', kicker='Un detalle'),
       S('tranquilo', 'El cliente no espera: reserva donde pueda hacerlo.', 'NO ESPERA.', 'RESERVA.'),
       S('con energía', 'Con bukéa tu página recibe reservas las veinticuatro horas, y tú ves todo en la mañana.', '24 HORAS.', 'TÚ LO VES', 'EN LA MAÑANA.'),
       S('cálido', 'Escríbeme UÑAS y te dejo la página lista, gratis.', 'ESCRÍBEME', 'UÑAS.')],
    car=dict(titulo='Mientras duermes, tu agenda trabaja', portada=('Imagina', ['11:02 P. M.', 'RESERVÓ', 'SOLA.'], 'Mientras tú dormías'),
             senales=[(['10:50 P. M.', 'VE TU FOTO.'], 'Le encantan tus uñas y quiere una cita.'),
                      (['11:00 P. M.', 'ENTRA A TU LINK.'], 'Elige el servicio y una hora que sí está libre.'),
                      (['11:02 P. M.', 'RESERVADO.'], 'Tú sigues durmiendo.')],
             lista=(['A LA MAÑANA:'], ['La cita ya está en tu calendario', 'Recibiste el aviso en el teléfono', 'No contestaste ningún mensaje', 'Tu día empieza con una cita más']),
             caption='Son las 11 de la noche y una clienta quiere agendar. Si tiene que esperar a que despiertes, quizá ya no quiera. Con tu link reserva sola 📅 Comenta UÑAS 👇 y te armo tu página gratis.'))

dia('2026-11-13', 2, 'VIE', 'Tu página con tu marca', 'Manicurista: tu página de reservas puede verse como tu marca.',
    mg=dict(kicker='Para manicuristas', beats=[['TU PÁGINA', 'CON TU', 'ESTILO.'], ['8 ESTILOS.', 'TUS COLORES.', 'TU LOGO.'], ['CUPÓN PARA', 'CLIENTAS', 'NUEVAS.']]),
    A=[S('animado', 'Manicurista, tu página de reservas puede verse como tu marca.', 'TU PÁGINA,', 'TU MARCA.', kicker='Viernes'),
       S('tranquilo', 'Elige entre ocho estilos, tus colores y tu logo.', '8 ESTILOS.', 'TUS COLORES.', 'TU LOGO.', extra=phone(INICIO)),
       S('con energía', 'Y si quieres atraer clientas nuevas, puedes crear un cupón de primera vez.', 'CUPÓN PARA', 'CLIENTAS', 'NUEVAS.'),
       S('cálido, con una sonrisa', 'El primer mes es gratis y yo te ayudo a configurarla. Comenta UÑAS.', 'COMENTA', 'UÑAS.')],
    B=[S('serio', 'Esto es lo que incluye bukéa.', 'LO QUE', 'INCLUYE.', kicker='Todo en uno'),
       S('tranquilo', 'Tu página con tu nombre, ocho estilos, tus servicios con precio y duración, cupones, y reservas todo el día.', 'TU NOMBRE.', 'TUS SERVICIOS.', 'TUS CUPONES.'),
       S('con energía', 'Se conecta a tu Google Calendar.', 'TU GOOGLE', 'CALENDAR.'),
       S('cálido', 'Primer mes gratis; después, diez dólares al mes. Escríbeme UÑAS.', 'ESCRÍBEME', 'UÑAS.')],
    car=dict(titulo='Lo que incluye tu página de uñas', portada=('Para manicuristas', ['TU PÁGINA', 'DE UÑAS,', 'CON TU', 'MARCA.'], 'Esto es lo que incluye'),
             senales=[(['8 ESTILOS', 'Y TUS COLORES.'], 'Elige el que va con tu negocio y ponle tu logo.'),
                      (['SERVICIOS CON', 'PRECIO Y', 'DURACIÓN.'], 'Para que nadie te pregunte “¿cuánto cuesta?”.'),
                      (['CUPONES', 'PARA CLIENTAS', 'NUEVAS.'], 'Un código de primera vez, con sus usos.')],
             lista=(['Y ADEMÁS:'], ['Reservas las 24 horas', 'Conectada a tu Google Calendar', 'Pago Móvil dentro de la cita', 'Cartel con tu QR']),
             caption='Tu página de reservas con tu marca: 8 estilos, tus colores, tus servicios con precio y duración, y cupones para clientas nuevas. Primer mes gratis, después $10 al mes 📅 Comenta UÑAS 👇'))

# ═══ SEMANA 3 · SPAS, CONSULTORIOS Y SALUD (CONSULTA) ═════════════════════════
dia('2026-11-16', 3, 'LUN', 'La cita que no llegó', 'La clienta no llegó y tu hora quedó vacía.',
    mg=dict(kicker='Spas y consultorios', beats=[['LA CLIENTA', 'NO LLEGÓ.'], ['TU HORA', 'QUEDÓ VACÍA.'], ['SE LE', 'OLVIDÓ.']]),
    A=[S('serio', 'La clienta no llegó.', 'NO LLEGÓ.', kicker='Spas y consultorios'),
       S('serio', 'Tu hora quedó vacía, y no hay forma de recuperarla. [tranquilo] Muchas veces no es mala fe: simplemente se le olvidó.', 'TU HORA', 'QUEDÓ VACÍA.'),
       S('con energía', 'Cuando reserva en bukéa, la cita cae en su calendario, y su teléfono se la recuerda solita.', 'LA CITA CAE', 'EN SU', 'CALENDARIO.', extra=phone(LISTO)),
       S('cálido, con una sonrisa', 'Menos olvidos, menos horas perdidas. Comenta CONSULTA y te armo tu página gratis.', 'COMENTA', 'CONSULTA.')],
    B=[S('serio', 'Un consultorio o un spa vive de sus horas.', 'VIVES DE', 'TUS HORAS.', kicker='La cuenta'),
       S('tranquilo', 'Cada hora vacía es dinero que no vuelve.', 'HORA VACÍA =', 'DINERO QUE', 'NO VUELVE.'),
       S('con energía', 'Con bukéa, la cita queda en el calendario del cliente y en el tuyo, y tú recibes un aviso treinta minutos antes y un resumen cada mañana a las siete.', 'SU CALENDARIO.', 'TU CALENDARIO.', 'AVISO 30 MIN.'),
       S('cálido', 'Escríbeme CONSULTA y te la dejo lista, gratis.', 'ESCRÍBEME', 'CONSULTA.')],
    car=dict(titulo='Cuánto vale una hora vacía', portada=('Spas y consultorios', ['CUÁNTO VALE', 'UNA HORA', 'VACÍA.'], 'Haz esta cuenta'),
             senales=[(['PRECIO DE', 'TU SERVICIO', '× HORAS VACÍAS.'], 'Las de la semana: las que se cancelaron o nadie tomó.'),
                      (['× 4 SEMANAS.'], 'Ese es el mes. Ahora mira el número.'),
                      (['MUCHAS SON', 'OLVIDOS.'], 'Y un olvido se arregla con una cita que quede en su calendario.')],
             lista=(['CON BOOKEAA:'], ['La cita cae en su calendario', 'Y en el tuyo', 'Aviso 30 min antes', 'Resumen a las 7:00 a. m.']),
             caption='¿Cuánto vale una hora vacía en tu consultorio o tu spa? Multiplica tu precio por las horas vacías de la semana, y por 4. Con tu link, la cita queda en su calendario y en el tuyo 📅 Comenta CONSULTA 👇'))

dia('2026-11-17', 3, 'MAR', 'Pago Móvil dentro de la cita', 'Pago Móvil: el cliente reporta y tú confirmas con un toque.',
    mg=dict(kicker='Cobrar en bolívares', beats=[['EL CLIENTE', 'REPORTA SU', 'PAGO MÓVIL.'], ['SUBE EL', 'CAPTURE.'], ['TÚ TOCAS:', '“PAGO', 'RECIBIDO”.']]),
    A=[S('intrigante', '¿Cuántas veces un cliente te dijo «ya te pagué» y tú no lo veías por ningún lado?', '“YA TE', 'PAGUÉ”.', kicker='¿Te pasó?'),
       S('tranquilo', 'En bukéa el cliente reporta su Pago Móvil al reservar y sube el capture.', 'REPORTA', 'SU PAGO', 'MÓVIL.', extra=phone(LISTO)),
       S('con energía', 'A ti te llega el aviso, lo revisas, y con un toque confirmas el pago. Todo en la misma cita.', 'UN TOQUE:', '“PAGO', 'RECIBIDO”.'),
       S('cálido, con una sonrisa', 'Comenta CONSULTA y te lo configuro gratis.', 'COMENTA', 'CONSULTA.')],
    B=[S('serio', 'Cobrar en bolívares tiene su ciencia.', 'COBRAR EN', 'BOLÍVARES.', kicker='Pago Móvil'),
       S('tranquilo', 'Bukéa calcula el monto a la tasa oficial del día, y el cliente reporta el Pago Móvil con su capture.', 'MONTO A LA', 'TASA DEL DÍA.'),
       S('con energía', 'Tú ves los pagos por verificar en tu teléfono y los confirmas con un toque.', 'VERIFICAS', 'EN TU', 'TELÉFONO.'),
       S('cálido', 'Escríbeme CONSULTA y lo dejamos listo.', 'ESCRÍBEME', 'CONSULTA.')],
    car=dict(titulo='El camino del Pago Móvil en tu agenda', portada=('Cobrar en bolívares', ['EL PAGO', 'MÓVIL', 'DENTRO DE', 'LA CITA.'], 'Así funciona'),
             senales=[(['01 · EL CLIENTE', 'ELIGE Y', 'RESERVA.'], 'Ve el monto en bolívares a la tasa del día.'),
                      (['02 · REPORTA', 'SU PAGO.'], 'Con su número de referencia y el capture.'),
                      (['03 · TE LLEGA', 'EL AVISO.'], 'En tu teléfono, con el capture a la vista.')],
             lista=(['04 · TÚ:'], ['Revisas el capture', 'Tocas “Pago recibido”', 'La cita queda confirmada', 'Sin perseguir a nadie']),
             caption='Pago Móvil dentro de la cita: el cliente reporta con su capture y tú confirmas con un toque en el teléfono. Sin “ya te pagué” por WhatsApp 📅 Comenta CONSULTA 👇 y te armo tu página gratis.'))

dia('2026-11-18', 3, 'MIE', 'Es caro / no tengo tiempo', '“No tengo tiempo para configurar nada”. Por eso la configuro yo.',
    mg=dict(kicker='Dos excusas comunes', beats=[['“NO TENGO', 'TIEMPO PARA', 'CONFIGURAR”.'], ['LA CONFIGURO', 'YO.'], ['10 DÓLARES', 'AL MES.', 'PRIMER MES', 'GRATIS.']]),
    A=[S('serio', '«No tengo tiempo para configurar nada».', '“NO TENGO', 'TIEMPO”.', kicker='Dos excusas comunes'),
       S('tranquilo', 'Lo entiendo. Por eso la configuro yo.', 'LA CONFIGURO', 'YO.'),
       S('con energía', 'Me mandas tus servicios, tus precios y tus horas, y el mismo día tu página está lista.', 'SERVICIOS.', 'PRECIOS.', 'HORAS.', extra=phone(SERVICIOS)),
       S('cálido, con una sonrisa', 'El primer mes es gratis, y después son diez dólares al mes. Comenta CONSULTA y empezamos hoy.', 'COMENTA', 'CONSULTA.')],
    B=[S('serio', 'Hagamos la cuenta.', 'HAGAMOS', 'LA CUENTA.', kicker='¿Está caro?'),
       S('tranquilo', 'Si cobras más de diez dólares por una cita, con evitar perder una al mes ya se pagó.', '10 DÓLARES', 'AL MES.'),
       S('con energía', 'Y el primer mes es gratis, para que lo compruebes tú mismo.', 'PRIMER MES', 'GRATIS.'),
       S('cálido', 'Escríbeme CONSULTA.', 'ESCRÍBEME', 'CONSULTA.')],
    car=dict(titulo='¿Cuánto cuesta y qué incluye?', portada=('Sin sorpresas', ['¿CUÁNTO', 'CUESTA', 'BOOKEAA?'], 'Precio y qué incluye'),
             senales=[(['1 MES', 'GRATIS.'], 'Pruebas todo sin pagar un dólar.'),
                      (['DESPUÉS,', '$10 AL MES.'], 'En bolívares a la tasa del día, por Pago Móvil.'),
                      (['LA CONFIGURO', 'YO.'], 'Me mandas tus servicios y tus horas; la dejo lista.')],
             lista=(['INCLUYE:'], ['Tu página con tu nombre', '8 estilos y tus colores', 'Reservas las 24 horas', 'Google Calendar y avisos']),
             caption='“No tengo tiempo para configurar” y “está caro”: las dos se resuelven. La configuro yo, el primer mes es gratis y después son $10 al mes 📅 Comenta CONSULTA 👇'))

dia('2026-11-19', 3, 'JUE', 'Dos profesionales, un link', 'Imagina un consultorio con dos profesionales y una sola agenda.',
    mg=dict(kicker='bookeaa team', beats=[['2', 'PROFESIONALES.', '1 SOLO LINK.'], ['CADA UNO CON', 'SU CALENDARIO.'], ['EL CLIENTE', 'ELIGE CON', 'QUIÉN.']]),
    A=[S('tranquilo', 'Imagina un consultorio con dos profesionales.', '2', 'PROFESIONALES.', kicker='bookeaa team'),
       S('serio', 'Si agendan por separado, tarde o temprano se cruzan.', 'AGENDAS', 'POR SEPARADO', '= CRUCES.'),
       S('con energía', 'Con bukéa cada profesional tiene su propio calendario, sus servicios y sus horarios, y el cliente elige con quién quiere reservar.', 'CADA UNO,', 'SU CALENDARIO.', extra=phone(AGENDA)),
       S('cálido, con una sonrisa', 'Un solo link, cero cruces. Comenta CONSULTA y te lo armo gratis.', 'COMENTA', 'CONSULTA.')],
    B=[S('serio', 'Un negocio con equipo necesita orden.', 'EQUIPO.', 'ORDEN.', kicker='bookeaa team'),
       S('tranquilo', 'En bukéa agregas a cada persona, eliges qué servicios hace cada una, y cada una recibe sus propios avisos.', 'CADA PERSONA:', 'SUS SERVICIOS.', 'SUS AVISOS.'),
       S('con energía', 'Tú ves todas las citas y puedes pasar una cita de una persona a otra.', 'PASAS UNA CITA', 'A OTRA PERSONA.'),
       S('cálido', 'Escríbeme CONSULTA y lo configuramos.', 'ESCRÍBEME', 'CONSULTA.')],
    car=dict(titulo='Cómo organizar a tu equipo', portada=('bookeaa team', ['CÓMO ORDENAR', 'A TU EQUIPO.'], 'Para consultorios, spas y centros de estética'),
             senales=[(['UNA AGENDA', 'POR PERSONA.'], 'Cada profesional con su propio calendario de Google.'),
                      (['CADA UNA,', 'SUS SERVICIOS.'], 'Y su horario. El cliente solo ve lo que ella hace.'),
                      (['“¿CON QUIÉN?”'], 'El cliente elige a la persona, o “cualquiera disponible”.')],
             lista=(['TÚ:'], ['Ves todas las citas', 'Pasas una cita a otra persona', 'Cada una recibe sus avisos', 'Cada una comparte su propio link']),
             caption='Un solo link, una agenda por persona: cada profesional con su calendario y sus servicios, y el cliente elige con quién reservar. bookeaa team 📅 Comenta CONSULTA 👇'))

dia('2026-11-20', 3, 'VIE', 'Pruébala como cliente', 'Antes de decidir, reserva en una agenda real como lo haría tu cliente.',
    mg=dict(kicker='Antes de decidir', beats=[['PRUÉBALA', 'COMO TU', 'CLIENTE.'], ['ABRE EL', 'LINK DE', 'EJEMPLO.'], ['ELIGE.', 'RESERVA.']]),
    A=[S('animado', 'Si tienes un spa, un consultorio o una clínica estética, esto es para ti.', 'SPA.', 'CONSULTORIO.', 'ESTÉTICA.', kicker='Viernes'),
       S('tranquilo', 'Tu página de reservas con tu nombre, tus servicios y tus horas, y los pagos por Pago Móvil dentro de la misma cita.', 'TU PÁGINA.', 'TUS PAGOS', 'EN LA CITA.', extra=phone(LISTO)),
       S('con energía', 'Yo la configuro contigo.', 'LA CONFIGURO', 'CONTIGO.'),
       S('cálido, con una sonrisa', 'Primer mes gratis. Comenta CONSULTA.', 'COMENTA', 'CONSULTA.')],
    B=[S('serio', 'Antes de decidir, mira cómo se ve una agenda real.', 'MIRA UNA', 'AGENDA REAL.', kicker='Sin compromiso'),
       S('tranquilo', 'Te mando el link de una página de ejemplo, la abres desde tu teléfono, y reservas como lo haría tu cliente.', 'ABRE.', 'RESERVA.', 'COMO TU', 'CLIENTE.'),
       S('con energía', 'Si te gusta, la armamos con tus datos.', 'SI TE GUSTA,', 'LA ARMAMOS.'),
       S('cálido', 'Escríbeme CONSULTA.', 'ESCRÍBEME', 'CONSULTA.')],
    car=dict(titulo='Pruébala como cliente antes de decidir', portada=('Sin compromiso', ['PRUÉBALA', 'COMO TU', 'CLIENTE.'], 'Antes de decidir'),
             senales=[(['01 · TE MANDO', 'UN LINK.'], 'Una página de ejemplo, lista para abrir.'),
                      (['02 · RESERVA', 'COMO CLIENTE.'], 'Elige servicio, día y hora desde tu teléfono.'),
                      (['03 · MIRA', 'EL RESULTADO.'], 'Así lo vería tu cliente. Así lo recibirías tú.')],
             lista=(['SI TE GUSTA:'], ['Armamos la tuya con tus datos', 'Yo la configuro', 'Primer mes gratis', 'Después, $10 al mes']),
             caption='Antes de decidir, reserva en una agenda de ejemplo como lo haría tu cliente. Si te gusta, armamos la tuya. Primer mes gratis 📅 Comenta CONSULTA 👇 y te mando el link.'))

# ═══ SEMANA 4 · EQUIPO, SEDES Y DOMICILIO (EQUIPO) ════════════════════════════
dia('2026-11-23', 4, 'LUN', 'Dos agendas, una cita doble', 'Tienes dos sedes o dos personas atendiendo, cada una con su libreta.',
    mg=dict(kicker='Cuando el negocio crece', beats=[['2 SEDES.', '2 LIBRETAS.'], ['1 CLIENTE', 'EN DOS', 'AGENDAS.'], ['UNA SOLA', 'AGENDA.']]),
    A=[S('serio', 'Tienes dos sedes, o dos personas atendiendo.', '2 SEDES.', '2 LIBRETAS.', kicker='Cuando el negocio crece'),
       S('tranquilo', 'Cada una con su libreta, su chat y su propia agenda. [pausa corta] Un día, dos clientes llegan a la misma hora con la misma persona.', 'LA MISMA', 'HORA.', 'LA MISMA', 'PERSONA.'),
       S('con energía', 'Con bukéa hay una sola agenda: cada persona con su calendario, todo en el mismo lugar.', 'UNA SOLA', 'AGENDA.', extra=phone(AGENDA)),
       S('cálido, con una sonrisa', 'Comenta EQUIPO y te armo tu página gratis.', 'COMENTA', 'EQUIPO.')],
    B=[S('serio', 'Cuando un negocio crece, la agenda se complica.', 'CRECER', 'COMPLICA LA', 'AGENDA.', kicker='Más gente, más cruces'),
       S('tranquilo', 'Más personas, más sedes, más cruces.', 'MÁS PERSONAS.', 'MÁS SEDES.'),
       S('con energía', 'Bukéa permite varias sedes y varios profesionales en un solo negocio, con sus horarios y sus servicios por separado.', 'VARIAS SEDES.', 'VARIAS', 'PERSONAS.'),
       S('cálido', 'Escríbeme EQUIPO y lo organizamos.', 'ESCRÍBEME', 'EQUIPO.')],
    car=dict(titulo='3 señales de que necesitas una agenda de equipo', portada=('Negocios que crecen', ['3 SEÑALES', 'DE QUE NECESITAS', 'AGENDA DE', 'EQUIPO.'], 'Guarda este post'),
             senales=[(['01 · SE CRUZAN', 'LAS CITAS.'], 'Cada persona agenda por su lado.'),
                      (['02 · NO SABES', 'QUIÉN TIENE', 'HORA.'], 'Tienes que preguntar persona por persona.'),
                      (['03 · EL CLIENTE', 'PREGUNTA POR', 'ALGUIEN.'], 'Y esa persona ya no tiene espacio.')],
             lista=(['BOOKEAA TEAM:'], ['Una agenda por persona', 'Un solo link para todos', 'Servicios y horarios por persona', 'Tú ves todo en un lugar']),
             caption='Dos sedes, dos personas, dos libretas: tarde o temprano se cruzan. bookeaa team: una agenda por persona y un solo link 📅 Comenta EQUIPO 👇 y te armo tu página gratis.'))

dia('2026-11-24', 4, 'MAR', 'Agrega a tu equipo', 'Cómo agregar a una persona de tu equipo en bookeaa.',
    mg=dict(kicker='bookeaa team', beats=[['AGREGAS', 'A LA PERSONA.'], ['ELIGES QUÉ', 'SERVICIOS HACE.'], ['TIENE SU', 'PROPIO', 'CALENDARIO.']]),
    A=[S('intrigante', '¿Cómo agregas a una persona de tu equipo?', '¿CÓMO AGREGAS', 'A TU EQUIPO?', kicker='bookeaa team'),
       S('tranquilo', 'La agregas con su nombre, eliges qué servicios hace, y listo: tiene su propio calendario.', 'SU NOMBRE.', 'SUS SERVICIOS.', 'SU CALENDARIO.', extra=phone(AGENDA)),
       S('con energía', 'Y le llegan sus propios avisos: sus reservas, sus recordatorios y el resumen de su mañana.', 'SUS AVISOS.', 'SU RESUMEN.'),
       S('cálido, con una sonrisa', 'Comenta EQUIPO y lo configuramos juntos.', 'COMENTA', 'EQUIPO.')],
    B=[S('serio', 'Tres cosas para ordenar a tu equipo.', 'TRES COSAS.', kicker='Ordena a tu gente'),
       S('tranquilo', 'Una: cada persona con su calendario. Dos: cada persona con sus servicios. Tres: tú ves todo y puedes mover citas entre personas.', 'UN CALENDARIO.', 'SUS SERVICIOS.', 'TÚ VES TODO.'),
       S('con energía', 'Si alguien sale del equipo, su historial no se borra.', 'EL HISTORIAL', 'NO SE BORRA.'),
       S('cálido', 'Escríbeme EQUIPO.', 'ESCRÍBEME', 'EQUIPO.')],
    car=dict(titulo='Agrega a tu equipo en 3 pasos', portada=('bookeaa team', ['AGREGA A', 'TU EQUIPO', 'EN 3 PASOS.'], 'Cada persona, su agenda'),
             senales=[(['01 · SU NOMBRE', 'Y SU CORREO.'], 'Con su Gmail para compartirle su calendario.'),
                      (['02 · QUÉ', 'SERVICIOS', 'HACE.'], 'Y qué horario trabaja.'),
                      (['03 · SU LINK', 'PROPIO.'], 'Para que lo comparta en su Instagram.')],
             lista=(['CADA PERSONA:'], ['Ve solo sus citas', 'Recibe sus avisos', 'Bloquea sus días libres', 'Confirma sus Pago Móvil']),
             caption='Agregar a una persona de tu equipo: su nombre, qué servicios hace y listo, tiene su propio calendario y su propio link. bookeaa team 📅 Comenta EQUIPO 👇 y lo configuramos juntos.'))

dia('2026-11-25', 4, 'MIE', 'Mi gente no es buena con la tecnología', '“Mi gente no es buena con la tecnología”. No necesita serlo.',
    mg=dict(kicker='Dueños de negocio', beats=[['“MI GENTE', 'NO SABE DE', 'TECNOLOGÍA”.'], ['NO NECESITA', 'SABER.'], ['VE SUS CITAS.', 'RECIBE AVISOS.']]),
    A=[S('tranquilo', '«Mi gente no es buena con la tecnología».', '“MI GENTE NO', 'SABE DE', 'TECNOLOGÍA”.', kicker='Dueños de negocio'),
       S('serio', 'No necesita serlo.', 'NO NECESITA', 'SERLO.'),
       S('con energía', 'Bukéa se abre como una app en el teléfono, y lo único que hacen es ver sus citas y recibir los avisos.', 'VER SUS CITAS.', 'RECIBIR AVISOS.', extra=phone(AGENDA)),
       S('cálido, con una sonrisa', 'Si pueden usar WhatsApp, pueden usar esto. Comenta EQUIPO y lo probamos.', 'COMENTA', 'EQUIPO.')],
    B=[S('serio', 'Antes de implementar una herramienta, piensa en quién la va a usar.', '¿QUIÉN LA', 'VA A USAR?', kicker='Piensa en tu equipo'),
       S('tranquilo', 'En bukéa tu equipo solo entra con su cuenta de Google, ve sus citas del día y recibe avisos en el teléfono.', 'CUENTA DE', 'GOOGLE.', 'SUS CITAS.', 'SUS AVISOS.'),
       S('con energía', 'La configuración la haces tú, o la hago yo contigo.', 'LA CONFIGURAS', 'TÚ, O YO.'),
       S('cálido', 'Escríbeme EQUIPO.', 'ESCRÍBEME', 'EQUIPO.')],
    car=dict(titulo='Lo que ve tu equipo (y lo que no)', portada=('Para dueños', ['LO QUE VE', 'TU EQUIPO.'], 'Y lo que no necesita ver'),
             senales=[(['SUS CITAS', 'DE HOY.'], 'Y las próximas, ordenadas por día.'),
                      (['SUS AVISOS.'], 'Reserva nueva, recordatorio y resumen de la mañana.'),
                      (['SUS BLOQUEOS.'], 'Si necesita un día libre, lo marca y aparece en su calendario.')],
             lista=(['NO VE:'], ['Los precios', 'La configuración', 'El plan', 'Nada que pueda romper']),
             caption='Tu equipo no necesita saber de tecnología: entra con su cuenta de Google, ve sus citas del día y recibe sus avisos. No ve precios ni configuración 📅 Comenta EQUIPO 👇'))

dia('2026-11-26', 4, 'JUE', 'A domicilio, el traslado ya viene sumado', 'Si atiendes a domicilio, sabes lo difícil que es cuadrar las citas.',
    mg=dict(kicker='Si atiendes a domicilio', beats=[['EL TRASLADO', 'SE COME', 'TU TIEMPO.'], ['LA PÁGINA LO', 'SUMA SOLA.'], ['RECARGO +', 'TIEMPO DE', 'TRASLADO.']]),
    A=[S('tranquilo', 'Si atiendes a domicilio, sabes lo difícil que es cuadrar las citas.', 'A DOMICILIO,', 'CUADRAR', 'ES DIFÍCIL.', kicker='A domicilio'),
       S('serio', 'El traslado se come el tiempo, y casi nunca se cobra.', 'EL TRASLADO', 'SE COME', 'TU TIEMPO.'),
       S('con energía', 'En bukéa el cliente elige si quiere la cita en tu local o a domicilio, y el recargo y el tiempo de traslado se suman solos.', 'LOCAL O', 'DOMICILIO.', 'SE SUMA SOLO.'),
       S('cálido, con una sonrisa', 'Comenta EQUIPO y te armo tu página gratis.', 'COMENTA', 'EQUIPO.')],
    B=[S('serio', 'Un ejemplo.', 'UN EJEMPLO.', kicker='La cuenta'),
       S('tranquilo', 'Un servicio de veinte dólares, a domicilio con un veinte por ciento de recargo, son veinticuatro.', '$20 + 20 % =', '$24.'),
       S('con energía', 'Todo lo calcula la página, tú no tienes que explicarlo. Y el tiempo de traslado queda bloqueado en tu agenda.', 'LA PÁGINA', 'LO CALCULA.', 'EL TRASLADO', 'SE BLOQUEA.'),
       S('cálido', 'Escríbeme EQUIPO.', 'ESCRÍBEME', 'EQUIPO.')],
    car=dict(titulo='A domicilio sin perder plata', portada=('A domicilio', ['A DOMICILIO', 'SIN PERDER', 'PLATA.'], 'Traslado y recargo incluidos'),
             senales=[(['EL CLIENTE', 'ELIGE:', 'LOCAL O CASA.'], 'En la misma página de reservas.'),
                      (['EL RECARGO', 'SE SUMA SOLO.'], 'Por defecto 20 %, y tú lo cambias.'),
                      (['EL TRASLADO', 'SE BLOQUEA.'], 'Para que no te agenden pegado.')],
             lista=(['EJEMPLO:'], ['Servicio: $20', 'Recargo a domicilio: 20 %', 'Total: $24', 'Más 15 min de traslado']),
             caption='A domicilio, el recargo y el tiempo de traslado se suman solos en tu página de reservas. Ejemplo: servicio de $20 + 20 % = $24 📅 Comenta EQUIPO 👇 y te armo tu página gratis.'))

dia('2026-11-27', 4, 'VIE', 'Cierra noviembre con tu agenda lista', 'Diciembre ya casi llega: ¿tu agenda sigue en una libreta?',
    mg=dict(kicker='Viernes de decisiones', beats=[['DICIEMBRE', 'YA CASI', 'LLEGA.'], ['TU AGENDA,', 'LISTA ESTA', 'SEMANA.'], ['LA CONFIGURO', 'GRATIS.']]),
    A=[S('animado', 'Viernes de decisiones.', 'VIERNES DE', 'DECISIONES.', kicker='Antes de diciembre'),
       S('tranquilo', 'Diciembre suele ser de los meses más movidos para negocios de belleza y cuidado personal. [serio] Si tu agenda sigue en una libreta, vas a perder clientes justo cuando más llegan.', 'DICIEMBRE:', 'MÁS CLIENTES.', 'MÁS MENSAJES.'),
       S('con energía', 'Esta semana te la configuro gratis, con tu nombre y tus servicios.', 'TE LA', 'CONFIGURO', 'GRATIS.', extra=phone(INICIO)),
       S('cálido, con una sonrisa', 'Comenta AGENDA.', 'COMENTA', 'AGENDA.')],
    B=[S('serio', 'Dos cosas antes de que llegue diciembre.', 'DOS COSAS.', kicker='Antes de diciembre'),
       S('tranquilo', 'Una: tu página de reservas lista. Dos: tus clientes habituales ya saben cómo reservar en ella.', '1 · TU PÁGINA.', '2 · CLIENTES', 'YA SABEN.'),
       S('con energía', 'Te ayudo con las dos.', 'TE AYUDO', 'CON LAS DOS.'),
       S('cálido', 'Primer mes gratis. Escríbeme AGENDA.', 'ESCRÍBEME', 'AGENDA.')],
    car=dict(titulo='Checklist: tu agenda lista para diciembre', portada=('Antes de diciembre', ['TU AGENDA,', 'LISTA PARA', 'DICIEMBRE.'], 'Checklist · guárdalo'),
             senales=[(['01 · TU PÁGINA', 'DE RESERVAS.'], 'Con tus servicios, precios y horas.'),
                      (['02 · TU LINK', 'EN LA BIO.'], 'Y en tus estados de WhatsApp.'),
                      (['03 · TU CARTEL', 'CON QR.'], 'En el mostrador, para quien llega sin cita.')],
             lista=(['04 · AVISA:'], ['A tus clientes habituales', 'Con un mensaje con tu link', 'Sin llamadas', 'Y listo para diciembre']),
             caption='Antes de diciembre: página de reservas, link en tu bio, cartel con QR y avisarle a tus clientes habituales. Esta semana te la configuro gratis 📅 Comenta AGENDA 👇'))

# ═══ SEMANA 5 · CIERRE DE MES (AGENDA) ════════════════════════════════════════
dia('2026-11-30', 5, 'LUN', 'Mañana empieza diciembre', 'Mañana empieza diciembre: ¿cuántas horas libres tienes?',
    mg=dict(kicker='Último día de noviembre', beats=[['MAÑANA', 'EMPIEZA', 'DICIEMBRE.'], ['¿CUÁNTAS', 'HORAS LIBRES', 'TIENES?'], ['TU LINK', 'LAS LLENA.']]),
    A=[S('tranquilo', 'Mañana empieza diciembre.', 'MAÑANA', 'EMPIEZA', 'DICIEMBRE.', kicker='Último día de noviembre'),
       S('serio', 'Más clientes, más mensajes, más horas que cuadrar.', 'MÁS CLIENTES.', 'MÁS MENSAJES.'),
       S('con energía', 'Con tu link, el cliente reserva solo mientras tú trabajas.', 'RESERVA SOLO.', 'TÚ TRABAJAS.', extra=phone(AGENDA)),
       S('cálido, con una sonrisa', 'Comenta AGENDA y empezamos este mes con tu página lista.', 'COMENTA', 'AGENDA.')],
    B=[S('serio', 'Mira tu calendario de diciembre.', 'MIRA TU', 'DICIEMBRE.', kicker='Un minuto'),
       S('tranquilo', '¿Cuántas horas ya están reservadas? ¿Cuántas siguen libres?', '¿CUÁNTAS', 'ESTÁN', 'LIBRES?'),
       S('con energía', 'Si tus clientes pueden reservar en un link, esas horas libres se llenan solas.', 'UN LINK.', 'HORAS QUE', 'SE LLENAN.'),
       S('cálido', 'Escríbeme AGENDA.', 'ESCRÍBEME', 'AGENDA.')],
    car=dict(titulo='Tu calendario de diciembre', portada=('Último día de noviembre', ['MIRA TU', 'CALENDARIO', 'DE DICIEMBRE.'], 'Un minuto, tres preguntas'),
             senales=[(['¿CUÁNTAS HORAS', 'YA ESTÁN', 'RESERVADAS?'], 'Cuéntalas.'),
                      (['¿CUÁNTAS', 'SIGUEN', 'LIBRES?'], 'Esas son tu oportunidad.'),
                      (['¿QUIÉN', 'SABE QUE', 'ESTÁN LIBRES?'], 'Si solo lo sabes tú, no se llenan.')],
             lista=(['TU LINK:'], ['Muestra las horas libres', 'Las llena solo', 'Funciona las 24 horas', 'Primer mes gratis']),
             caption='Mira tu calendario de diciembre: ¿cuántas horas ya están reservadas y cuántas siguen libres? Si solo lo sabes tú, no se llenan. Con tu link, sí 📅 Comenta AGENDA 👇 y te armo tu página gratis.'))
