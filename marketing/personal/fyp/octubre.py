# Guiones FYP de octubre: una sola fuente para el plan (md), el calendario (csv) y el Word.
# Cada video es INDEPENDIENTE: gancho → conexión → bookeaa como solución → llamado a la acción.
# Tipos: MG (motion graphics + canción, sin voz), VOZ (MG + voz en off), CAM (Samuel a cámara).

CTA = {
    'link': 'Los negocios que saben organizar su tiempo agendan con un link. Ese link es bookeaa. Pruébalo gratis: link en el perfil.',
    'comenta': 'Comenta AGENDA y te mando el link para probar bookeaa gratis.',
    'comparte': 'Pásale este video a alguien que todavía agenda por WhatsApp. Y si eres tú: bookeaa, link en el perfil.',
    'sigue': 'Sígueme para más tips de agenda. Y si quieres dejar el WhatsApp: bookeaa, link en el perfil.',
}
# Texto final en pantalla de los MG (sin voz)
CTA_MG = {
    'link': 'LOS NEGOCIOS ORGANIZADOS AGENDAN CON UN LINK. → bookeaa · LINK EN EL PERFIL',
    'comenta': 'COMENTA "AGENDA" Y TE MANDO EL LINK 👇',
    'comparte': 'MÁNDASELO A QUIEN AGENDA POR WHATSAPP 📲',
    'sigue': 'SÍGUENOS · bookeaa · LINK EN EL PERFIL',
}

V = []
def v(fecha, dia, tipo, titulo, gancho, visual, cuerpo, cta, hashtags_extra=''):
    V.append(dict(fecha=fecha, dia=dia, tipo=tipo, titulo=titulo, gancho=gancho, visual=visual, cuerpo=cuerpo, cta=cta, extra=hashtags_extra))

UNAS = '#uñas #manicurista #nailsvenezuela'
BARBA = '#barberia #barberos #barbershop'
SPA = '#spa #estetica #bienestar'

# ── SEMANA 0 ─────────────────────────────────────────────
v('2026-10-08', 'Jue', 'MG', 'El link en la bio',
  'SI HUBIERA SABIDO ESTO ANTES… HABRÍA PUESTO UN LINK DE RESERVAS EN MI BIO.',
  'Perfil de Instagram; la bio dice "Escríbeme al DM 📩" y se tacha de un golpe.',
  ['"ESCRÍBEME AL DM" = TU CLIENTE ESPERANDO.', 'EL QUE ESPERA… SE VA.', 'aparece "bookeaa.com/u/tu-negocio" en la bio'], 'link')
v('2026-10-08', 'Jue', 'VOZ', 'El que espera, se va',
  '¿TU BIO DICE "ESCRÍBEME AL DM"?',
  'Chat con "¿tienes hora?" y un reloj que avanza sin respuesta.',
  '¿Tu bio dice "escríbeme al DM"? Eso significa que tu cliente tiene que esperarte… y el que espera, se va. Los negocios que saben organizar su tiempo ponen un link donde el cliente reserva solo, en el momento en que le dieron ganas.', 'comenta')
v('2026-10-08', 'Jue', 'CAM', 'Revisa tu bio hoy',
  'REVISA TU BIO AHORA MISMO.',
  'Tú, plano cerca, señalando el teléfono.',
  'Si tienes un negocio con citas, revisa tu bio ahora mismo. Si dice "escríbeme al DM", estás dejando ir clientes todos los días. Cámbialo por un link donde reserven solos. Yo creé bookeaa justo para eso: el link está en mi perfil y el primer mes es gratis.', 'link')
v('2026-10-09', 'Vie', 'MG', 'Una página con tu nombre',
  'TU NEGOCIO MERECE SU PROPIA PÁGINA DE RESERVAS.',
  'Se escribe "bookeaa.com/u/" letra por letra y, al terminar el nombre, se arma una página completa.',
  ['TU NOMBRE ✓', 'TUS SERVICIOS Y PRECIOS ✓', 'TUS HORAS LIBRES ✓', 'TU CLIENTE RESERVA SOLO ✓'], 'link')
v('2026-10-09', 'Vie', 'VOZ', 'Todo en un link',
  '¿TU CLIENTE TIENE QUE PREGUNTARTE TODO?',
  'Burbujas: "¿precio?", "¿dónde quedas?", "¿tienes hora?"… que se convierten en una sola página.',
  'Precio, dirección, horario, si tienes hora… tu cliente te pregunta lo mismo todos los días. Con bookeaa todo eso está en una sola página con tu nombre: entra, elige y reserva. Así se ve un negocio organizado.', 'link')
v('2026-10-09', 'Vie', 'CAM', 'Por qué lancé bookeaa',
  'ESTA SEMANA LANCÉ ESTO.',
  'Tú a cámara; al final, el teléfono con la página de reservas.',
  'Esta semana lancé bookeaa porque vi a demasiados negocios buenos perdiendo clientes por no responder a tiempo. Tu cliente entra a tu link, ve tus horas libres y reserva solo. Sígueme: todos los días te comparto cómo organizar mejor tu agenda.', 'sigue')

# ── SEMANA 1 ─────────────────────────────────────────────
v('2026-10-12', 'Lun', 'MG', 'El cliente fantasma',
  '¿TE HA PASADO QUE TE DICEN "VOY EN CAMINO" Y NUNCA LLEGAN?',
  'Burbuja "Voy en camino 🏃" cae con golpe; el reloj corre de 3:00 a 3:40.',
  ['3:00 · "VOY EN CAMINO"', '3:40 · NADA.', '40 MINUTOS PERDIDOS.', 'UNA CITA EN SU CALENDARIO NO SE OLVIDA.'], 'link')
v('2026-10-12', 'Lun', 'VOZ', 'No es mala suerte',
  'NO ES MALA SUERTE. ES CÓMO AGENDAS.',
  'Una silla vacía que se convierte en un calendario lleno.',
  'Si tus clientes te dejan plantado, no es mala suerte: es cómo agendas. Cuando la cita se queda en un chat, el cliente no la tiene en ningún lado y se le olvida. Con bookeaa la cita queda en su Google Calendar. Por eso los negocios organizados agendan así.', 'link')
v('2026-10-12', 'Lun', 'CAM', 'Cómo dejar de esperar clientes',
  '¿CANSADO DE ESPERAR CLIENTES QUE NO LLEGAN?',
  'Tú a cámara; entra la tarjeta de Google Calendar.',
  '¿Cansado de esperar clientes que no llegan? Haz esto: que la cita no viva en tu WhatsApp, que viva en el calendario de tu cliente. Con bookeaa reserva solo desde tu link y la cita le queda guardada. Comenta AGENDA y te mando el link.', 'comenta')
v('2026-10-13', 'Mar', 'MG', 'Responder tarde',
  '¿SABÍAS QUE ESTÁS PERDIENDO PLATA POR RESPONDER TARDE?',
  'Billetes que salen volando del teléfono cada vez que suena un mensaje.',
  ['9:42 P. M. · "¿TIENES HORA MAÑANA?"', '8:15 A. M. · LO VES.', 'YA RESERVÓ EN OTRO LADO.', 'CON UN LINK, RESERVA AUNQUE DUERMAS.'], 'link')
v('2026-10-13', 'Mar', 'VOZ', 'Hagamos la cuenta',
  'HAGAMOS UNA CUENTA QUE DUELE.',
  'Números gigantes: 1 → 4 → 48, con monedas cayendo.',
  'Si pierdes un solo cliente a la semana por no responder a tiempo, son cuatro al mes, cuarenta y ocho al año. Multiplícalo por lo que cobras. Los negocios que saben organizar su tiempo no compiten contestando más rápido: dejan que el cliente reserve solo. Eso es bookeaa.', 'link')
v('2026-10-13', 'Mar', 'CAM', 'No es contestar más rápido',
  'EL PROBLEMA NO ES QUE CONTESTES LENTO.',
  'Tú a cámara; texto "NO ES CONTESTAR MÁS RÁPIDO."',
  'El problema no es que contestes lento. Es que mientras atiendes a uno, no puedes contestarle a otro. La solución no es vivir pegado al teléfono: es que tu cliente no tenga que esperarte. Con bookeaa reserva solo, a cualquier hora. Link en mi perfil.', 'link')
v('2026-10-14', 'Mié', 'MG', '3 cosas si haces uñas',
  '3 COSAS QUE TIENES QUE SABER SI HACES UÑAS 💅',
  'Tres números golpean la pantalla, uno por uno.',
  ['1 · TU TIEMPO ES TU PRODUCTO.', '2 · UNA CITA SIN CONFIRMAR NO ES UNA CITA.', '3 · TU AGENDA TAMBIÉN VENDE.'], 'comparte', UNAS)
v('2026-10-14', 'Mié', 'VOZ', 'Dos horas que no vuelven',
  'SI HACES UÑAS, ESTO TE VA A DOLER.',
  'Un reloj de 2 horas que se vacía; una mesa de manicure vacía.',
  'Si haces uñas, un set te ocupa dos horas. Si la clienta no llega, perdiste las dos horas y el material que preparaste. Por eso las manicuristas organizadas confirman cada cita en el calendario de las dos. Con bookeaa pasa solo.', 'link', UNAS)
v('2026-10-14', 'Mié', 'CAM', 'Tu agenda también vende',
  'MANICURISTA: TU AGENDA TAMBIÉN VENDE.',
  'Tú a cámara; entra de lado un teléfono con una página estilo "elegante".',
  'Manicurista, tu agenda también vende. Cuando tu clienta ve tu página con tus servicios, tus precios y tus horas libres, no pregunta: reserva. Eso hace bookeaa. Comenta AGENDA y te mando el link para que lo pruebes gratis.', 'comenta', UNAS)
v('2026-10-15', 'Jue', 'MG', 'La libreta',
  'SI HUBIERA SABIDO ESTO ANTES… NO TENDRÍA MI AGENDA EN UNA LIBRETA.',
  'Una libreta que se moja, se tacha y se rompe.',
  ['SE MOJA.', 'SE PIERDE.', 'TU CLIENTE NO LA PUEDE VER.', 'TU AGENDA, EN UN LINK.'], 'link')
v('2026-10-15', 'Jue', 'VOZ', 'Tu cliente no ve tu libreta',
  '¿TU AGENDA ESTÁ EN UN PAPEL?',
  'Libreta que se transforma en un teléfono con horas libres.',
  'Si tu agenda está en una libreta, tu cliente no la puede ver. Te tiene que escribir solo para saber si tienes hora. Los negocios que saben organizar su tiempo muestran sus horas libres en un link, y el cliente reserva solo. Eso es bookeaa.', 'link')
v('2026-10-15', 'Jue', 'CAM', 'Lo que le diría a quien empieza',
  'SI ESTÁS EMPEZANDO UN NEGOCIO, ESCUCHA ESTO.',
  'Tú a cámara, cercano.',
  'Si estás empezando un negocio con citas, te digo lo que yo habría querido saber: pon tu agenda donde tus clientes la vean. En un link. Deja de anotar y empieza a recibir reservas. Por eso hice bookeaa. Sígueme para más.', 'sigue')
v('2026-10-16', 'Vie', 'MG', 'Reservar en 10 segundos',
  'ASÍ RESERVA UN CLIENTE EN 10 SEGUNDOS ⏱️',
  'Demo con teléfonos reales: link → servicio → hora → "¡Tu cita está reservada!", con cronómetro.',
  ['ENTRA A TU LINK', 'ELIGE SERVICIO', 'ELIGE HORA', '¡LISTO! 10 SEGUNDOS.'], 'link')
v('2026-10-16', 'Vie', 'VOZ', 'Cero mensajes',
  '¿CUÁNTOS MENSAJES ESCRIBES PARA UNA CITA?',
  'Contador de mensajes que baja de 10 a 0; tarjeta de Google Calendar.',
  '¿Cuántos mensajes escribes para agendar una cita? ¿Diez? Con bookeaa son cero: tu cliente elige servicio y hora, y la cita cae sola en tu Google Calendar y en el suyo. Así trabajan los negocios que valoran su tiempo.', 'comenta')
v('2026-10-16', 'Vie', 'CAM', 'Pruébalo gratis',
  'SI TRABAJAS CON CITAS, ESTO ES PARA TI.',
  'Tú a cámara; texto "COMENTA AGENDA".',
  'Si trabajas con citas, barbería, uñas, spa o consultorio, esto es para ti. Con bookeaa tienes tu página de reservas con tu nombre y tus clientes reservan solos. El primer mes es gratis. Comenta AGENDA y te mando el link.', 'comenta')

# ── SEMANA 2 ─────────────────────────────────────────────
v('2026-10-19', 'Lun', 'MG', 'Dos a la misma hora',
  '¿TE HA PASADO QUE LLEGAN DOS CLIENTES A LA MISMA HORA?',
  'Dos tarjetas de cita que chocan y sueltan chispas.',
  ['3:00 P. M.', '3:00 P. M.', '😬', 'EN UN SOLO CALENDARIO, ESO NO PASA.'], 'comparte')
v('2026-10-19', 'Lun', 'VOZ', 'Tres agendas = caos',
  'WHATSAPP + INSTAGRAM + TU CABEZA = CAOS.',
  'Tres íconos que se juntan y explotan; queda un solo calendario.',
  'Si te cruzan citas, es porque agendas en tres lugares a la vez: WhatsApp, Instagram y tu cabeza. Los negocios organizados tienen un solo calendario, y el cliente solo ve las horas que de verdad están libres. Eso es bookeaa.', 'link')
v('2026-10-19', 'Lun', 'CAM', 'Me pasó como cliente',
  'ME PASÓ Y ME FUI.',
  'Tú a cámara contando la historia.',
  'Una vez llegué a cortarme y había otro esperando para la misma hora. Me fui. Y el barbero ni se enteró de que perdió un cliente. Por eso en bookeaa tu cliente solo ve las horas que de verdad tienes libres. Link en mi perfil.', 'link')
v('2026-10-20', 'Mar', 'MG', 'No mostrar tus precios',
  '¿SABÍAS QUE ESTÁS PERDIENDO PLATA POR NO MOSTRAR TUS PRECIOS?',
  'Un chat con "¿precio?" que se repite hasta llenar la pantalla.',
  ['"¿PRECIO?" ×20', 'EL QUE NO PREGUNTA… SE VA.', 'PRECIOS A LA VISTA = RESERVAS.'], 'link')
v('2026-10-20', 'Mar', 'VOZ', 'El cliente que no pregunta',
  'EL CLIENTE QUE NO PREGUNTA, SE VA.',
  'Una persona que mira el perfil, duda y se va.',
  'Muchos clientes no preguntan el precio por pena, y se van con alguien que sí lo muestra. Los negocios que saben vender ponen sus servicios con precio a la vista. En bookeaa tu cliente ve todo, elige y reserva, sin preguntas incómodas.', 'link')
v('2026-10-20', 'Mar', 'CAM', 'Muestra tus precios',
  'MUESTRA TUS PRECIOS. TE EXPLICO POR QUÉ.',
  'Tú a cámara; entra el teléfono con la pantalla de servicios.',
  'Muestra tus precios. El cliente que sabe cuánto va a pagar, reserva más rápido y llega seguro. En bookeaa pones cada servicio con su precio y su duración, y tu cliente reserva solo. Comenta AGENDA y te paso el link.', 'comenta')
v('2026-10-21', 'Mié', 'MG', '3 cosas si eres barbero',
  '3 COSAS QUE TIENES QUE SABER SI ERES BARBERO ✂️',
  'Tres números golpean la pantalla con sonido de tijera.',
  ['1 · EL CLIENTE FIEL SE CUIDA CON HORARIO FIJO.', '2 · EL DE LAS 9 P. M. NO ESPERA RESPUESTA.', '3 · TU LINK VALE MÁS QUE TU NÚMERO.'], 'comparte', BARBA)
v('2026-10-21', 'Mié', 'VOZ', 'El cliente de las 9 p. m.',
  'BARBERO: EL CLIENTE DE LAS 9 P. M. NO TE VA A ESPERAR.',
  'Reloj 9:00 p. m., chat sin respuesta, otra barbería que responde.',
  'El cliente que te escribe a las nueve de la noche quiere reservar ya. Si no le respondes, mañana se corta con otro. Los barberos organizados tienen un link donde reservan aunque ellos estén dormidos. Eso es bookeaa.', 'link', BARBA)
v('2026-10-21', 'Mié', 'CAM', 'Dónde poner tu link',
  'BARBERO: PON TU LINK EN ESTOS 3 LUGARES.',
  'Tú a cámara; aparecen bio, estado de WhatsApp y un código QR.',
  'Barbero, pon tu link de reservas en tres lugares: tu bio de Instagram, tu estado de WhatsApp y un código QR en el espejo. Tu link trabaja mientras tú cortas. Con bookeaa lo tienes listo en minutos. Link en mi perfil.', 'link', BARBA)
v('2026-10-22', 'Jue', 'MG', 'Dejar de contestar lo mismo',
  'SI HUBIERA SABIDO ESTO ANTES… HABRÍA DEJADO DE CONTESTAR "TENGO HORA A LAS 4".',
  'El mismo mensaje copiado y pegado 30 veces.',
  ['20 VECES AL DÍA.', '× 3 MINUTOS.', '= 1 HORA QUE NO COBRAS.', 'QUE TU CLIENTE VEA TUS HORAS SOLO.'], 'link')
v('2026-10-22', 'Jue', 'VOZ', 'Una hora que no cobras',
  '¿CUÁNTAS VECES AL DÍA ESCRIBES "TENGO HORA A LAS 4"?',
  'Contador que suma minutos hasta llegar a 1 hora.',
  'Escribir "tengo hora a las cuatro" parece poco. Pero hazlo veinte veces al día y se te va una hora entera. Una hora que no cobras. Los negocios que valoran su tiempo dejan que el cliente vea sus horas y reserve solo. Eso es bookeaa.', 'link')
v('2026-10-22', 'Jue', 'CAM', 'Lo primero que haría',
  'SI EMPEZARA MI NEGOCIO HOY, HARÍA ESTO PRIMERO.',
  'Tú a cámara.',
  'Si empezara mi negocio hoy, lo primero que haría es dejar de agendar a mano. No por flojo, sino porque ese tiempo vale plata. Pon tu agenda en un link y dedícate a atender. Sígueme, que todos los días te doy un tip.', 'sigue')
v('2026-10-23', 'Vie', 'MG', '8 estilos',
  '¿CUÁL VA CON TU NEGOCIO? 1 AL 8',
  'Ocho teléfonos con ocho estilos que pasan rápido, al ritmo de la canción.',
  ['1', '2', '3', '4', '5', '6', '7', '8', 'TU PÁGINA DE RESERVAS, CON TU ESTILO.'], 'comenta')
v('2026-10-23', 'Vie', 'VOZ', 'Que se vea como tu marca',
  'TU AGENDA NO TIENE QUE VERSE COMO LA DE TODOS.',
  'Una página genérica que cambia de estilo varias veces.',
  'Tu página de reservas no tiene que verse como la de todos. Los negocios que cuidan su marca la cuidan también al momento de agendar. En bookeaa eliges entre ocho estilos, pones tu nombre y queda como tú.', 'link')
v('2026-10-23', 'Vie', 'CAM', 'Elige tu estilo',
  '¿CUÁL ELEGIRÍAS PARA TU NEGOCIO?',
  'Tú a cámara; los 8 estilos detrás de ti.',
  'Si tuvieras que elegir un estilo para tu página de reservas, ¿cuál sería? Comenta el número del uno al ocho. En bookeaa los tienes todos y el primer mes es gratis.', 'comenta')

# ── SEMANA 3 ─────────────────────────────────────────────
v('2026-10-26', 'Lun', 'MG', 'Te cancelan una hora antes',
  '¿TE HA PASADO QUE TE CANCELAN UNA HORA ANTES?',
  'Notificación "Disculpa, no voy a poder 🙏" que rompe la pantalla como un vidrio.',
  ['1 HORA LIBRE.', '¿Y AHORA QUIÉN LA LLENA?', 'SI TUS HORAS SE VEN, ALGUIEN LA TOMA.'], 'link')
v('2026-10-26', 'Lun', 'VOZ', 'Esa hora no se pierde',
  'UNA CANCELACIÓN NO TIENE QUE SER UNA HORA PERDIDA.',
  'La hora libre aparece en el calendario y se llena con "Nueva reserva".',
  'Cuando te cancelan, esa hora no tiene que perderse. Si tus horarios están en un link, la hora libre se ve al instante y alguien que estaba mirando la puede tomar sin escribirte. Así trabajan los negocios organizados, con bookeaa.', 'link')
v('2026-10-26', 'Lun', 'CAM', 'La hora que se llena sola',
  'IMAGÍNATE ESTO.',
  'Tú a cámara; reloj de 3:00 a 3:10 y una notificación de reserva.',
  'Imagínate esto: te cancelan a las tres y a las tres y diez alguien ya reservó esa hora desde tu link, sin escribirte. Una hora libre que se llena sola es plata que no perdiste. Eso es bookeaa. Comenta AGENDA.', 'comenta')
v('2026-10-27', 'Mar', 'MG', 'Las horas muertas',
  '¿SABÍAS QUE ESTÁS PERDIENDO PLATA POR TUS HORAS MUERTAS?',
  'Una semana de calendario con huecos grises que parpadean.',
  ['MARTES 3 P. M. · VACÍO.', 'JUEVES 11 A. M. · VACÍO.', 'NO FALTAN CLIENTES: NO VEN TUS HORAS.'], 'link')
v('2026-10-27', 'Mar', 'VOZ', 'Si lo ven, lo toman',
  'LOS HUECOS EN TU AGENDA TIENEN UNA RAZÓN.',
  'Huecos del calendario que se llenan uno por uno.',
  'Los huecos en tu agenda no son porque falten clientes. Son porque tus clientes no saben que tienes ese espacio. Si lo ven, lo toman. Con bookeaa tus horas libres están a la vista en tu link, todo el día.', 'link')
v('2026-10-27', 'Mar', 'CAM', 'Muestra tus horas',
  'ESE MARTES A LAS 3 QUE NADIE TE PIDE…',
  'Tú a cámara.',
  'Ese martes a las tres que nadie te pide no es mala suerte: nadie sabe que está libre. Pon tus horas a la vista y alguien lo va a tomar. Con bookeaa se ven en tiempo real. Link en mi perfil, el primer mes es gratis.', 'link')
v('2026-10-28', 'Mié', 'MG', '3 cosas si tienes un spa',
  '3 COSAS QUE TIENES QUE SABER SI TIENES UN SPA 🧖‍♀️',
  'Tres números que entran suaves, con canción tranquila.',
  ['1 · LA EXPERIENCIA EMPIEZA AL RESERVAR.', '2 · CADA SERVICIO TIENE SU DURACIÓN.', '3 · TU CLIENTA QUIERE ELEGIR SIN PREGUNTAR.'], 'comparte', SPA)
v('2026-10-28', 'Mié', 'VOZ', 'La experiencia empieza antes',
  'SI TIENES UN SPA, TU EXPERIENCIA EMPIEZA ANTES DE LO QUE CREES.',
  'Una clienta relajada que se estresa esperando respuesta… y luego reserva en un link.',
  'Tu clienta busca relajarse. Si para reservar tiene que esperar respuestas por WhatsApp, la experiencia ya empezó mal. Los spas que cuidan cada detalle tienen una página bonita y fácil para reservar. Con bookeaa la tienes.', 'link', SPA)
v('2026-10-28', 'Mié', 'CAM', 'Cada servicio, su tiempo',
  'SPA: ASÍ NO SE TE CRUZA NI UNA CITA.',
  'Tú a cámara; teléfono con servicios y duraciones.',
  'En un spa cada servicio dura distinto: un masaje una hora, un facial cuarenta y cinco minutos. En bookeaa cada servicio tiene su duración y la agenda se arma sola, sin cruces. Comenta AGENDA y te mando el link.', 'comenta', SPA)
v('2026-10-29', 'Jue', 'MG', 'Tu número personal',
  'SI HUBIERA SABIDO ESTO ANTES… NO HABRÍA DADO MI NÚMERO PERSONAL PARA AGENDAR.',
  'Un teléfono que vibra sin parar: 11 p. m., 6 a. m., domingo.',
  ['11 P. M. 📳', '6 A. M. 📳', 'DOMINGO 📳', 'TU LINK TRABAJA. TÚ DESCANSAS.'], 'link')
v('2026-10-29', 'Jue', 'VOZ', 'Tu descanso también cuenta',
  '¿TE ESCRIBEN PARA AGENDAR HASTA EN VACACIONES?',
  'Un teléfono en la playa que no para de sonar.',
  'Cuando tu número es tu agenda, nunca descansas: te escriben de noche, en domingo, en tus vacaciones. Los negocios que saben organizar su tiempo usan un link para agendar y el WhatsApp solo para atender. Eso es bookeaa.', 'link')
v('2026-10-29', 'Jue', 'CAM', 'Mi regla',
  'MI REGLA PARA CUALQUIER EMPRENDEDOR.',
  'Tú a cámara; texto "WHATSAPP PARA ATENDER. LINK PARA AGENDAR."',
  'Mi regla para cualquier emprendedor con citas: el WhatsApp es para atender, no para agendar. Para agendar, un link. Así recuperas tus noches y tus domingos. Sígueme, que todos los días te doy un tip como este.', 'sigue')
v('2026-10-30', 'Vie', 'MG', 'A domicilio y en varias sedes',
  '¿ATIENDES EN 2 LOCALES O A DOMICILIO? TAMBIÉN.',
  'Mapa con dos sedes y una opción "A domicilio" que se marca.',
  ['SEDE 1 ✓', 'SEDE 2 ✓', 'A DOMICILIO ✓', 'UN SOLO LINK.'], 'link')
v('2026-10-30', 'Vie', 'VOZ', 'Un solo link para todo',
  'UN SOLO LINK. TODAS TUS SEDES.',
  'Dos sedes que se unen en un mismo calendario.',
  'Si tienes dos sedes o vas a domicilio, no necesitas dos agendas. Con bookeaa es un solo link: tu cliente elige dónde y cuándo, y tú lo ves todo en un mismo calendario. Así se organiza un negocio que está creciendo.', 'link')
v('2026-10-30', 'Vie', 'CAM', 'Mi primer mes',
  'MI PRIMER MES COMO EMPRENDEDOR.',
  'Tú a cámara, cerrando el mes.',
  'Se termina mi primer mes con bookeaa. Gracias a todos los que comentaron y compartieron. Si trabajas con citas y quieres organizar tu tiempo como los negocios que crecen, el primer mes es gratis. Link en mi perfil.', 'link')

TIPO = {
    'MG': ('Motion graphics + canción · sin voz', 'Claude lo arma entero', '08:00', None),
    'VOZ': ('Motion graphics + tu voz en off', 'Samuel graba AUDIO', '13:00', 'm4a'),
    'CAM': ('Tú a cámara + motion graphics', 'Samuel graba VIDEO', '20:30', 'mp4'),
}
SEM = {'2026-10-08': 'S00', '2026-10-09': 'S00'}
DIA = {'Lun': 'LUN', 'Mar': 'MAR', 'Mié': 'MIE', 'Jue': 'JUE', 'Vie': 'VIE'}
def semana(f):
    d = int(f[8:])
    return SEM.get(f) or ('S01' if d <= 16 else 'S02' if d <= 23 else 'S03')
import re
PROPIOS = {'whatsapp': 'WhatsApp', 'instagram': 'Instagram', 'dm': 'DM', 'google': 'Google', 'calendar': 'Calendar'}
def frase(t):
    t = t.lower()
    t = re.sub(r"[a-záéíóúñü]+", lambda m: PROPIOS.get(m.group(0), m.group(0)), t)
    # mayúscula al inicio de cada oración (saltando ¿ ¡ " y espacios)
    t = re.sub(r'(^|[.?!]\s+)([¿¡"\s]*)([a-záéíóúñ])', lambda m: m.group(1) + m.group(2) + m.group(3).upper(), t)
    if not re.search(r'[.?!…]\W*$', t):
        t += '.'
    return t
for x in V:
    x['id'] = f"FYP-{semana(x['fecha'])}-{DIA[x['dia']]}-{x['tipo']}"
    x['hora'] = TIPO[x['tipo']][2]
    x['archivo'] = f"{x['id']}.{TIPO[x['tipo']][3]}" if TIPO[x['tipo']][3] else '(lo armo yo)'
    x['cta_texto'] = CTA_MG[x['cta']] if x['tipo'] == 'MG' else CTA[x['cta']]
    x['hashtags'] = '#bookeaa #emprendimiento #agendaonline #emprendedoresvenezolanos #negocios' + (' ' + x['extra'] if x['extra'] else '')
    g = frase(x['gancho'])
    cierre = {'link': 'Los negocios que saben organizar su tiempo agendan con bookeaa 📅 Pruébalo gratis: link en el perfil.',
              'comenta': 'Comenta AGENDA 👇 y te mando el link para probar bookeaa gratis.',
              'comparte': 'Mándaselo a alguien que todavía agenda por WhatsApp 📲 · bookeaa, link en el perfil.',
              'sigue': 'Síguenos para más tips 📅 · bookeaa, link en el perfil.'}[x['cta']]
    x['caption'] = f"{g} {cierre}"
