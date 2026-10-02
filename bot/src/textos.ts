/**
 * Todo lo que dice el bot. Mismo tono y datos que el kit de marca
 * (marketing/kit/textos.js): tuteo, frases cortas, precio $10.
 */
export const MARCA = {
  web: 'https://bookeaa.com',
  demo: 'https://bookeaa.com/u/samuel-herrera',
  instagram: 'https://instagram.com/bookeaa.app',
  precio: '$10',
}

/** Horario en que responde una persona (hora de Caracas). */
export const ATENCION = {
  texto: 'lunes a sábado, de 8:00 a. m. a 6:00 p. m.',
  dias: [1, 2, 3, 4, 5, 6],
  desde: 8 * 60,
  hasta: 18 * 60,
}

export const RUBROS: [string, string][] = [
  ['barberia', 'Barbería o peluquería'],
  ['unas', 'Uñas, pestañas o cejas'],
  ['estetica', 'Estética o spa'],
  ['consultorio', 'Consultorio o terapia'],
  ['otro', 'Otro'],
]

export const T = {
  bienvenida: (nombre: string) =>
    `¡Hola${nombre ? ' ' + nombre : ''}! 👋 Soy el asistente de *bookeaa*, tu agenda online.\n\n¿En qué te ayudo? Toca *Ver opciones* 👇`,
  menuOtraVez: '¿En qué más te ayudo? Toca *Ver opciones* 👇',
  noEntendi: 'No te entendí 🙈 Elige una opción del menú 👇',
  usaBotones: 'Toca una de las opciones de arriba 👆 (o escribe *menú* para empezar de nuevo).',

  precios:
    `El *primer mes es gratis* 🎁 y después son *${MARCA.precio} al mes*, todo incluido:\n\n` +
    '✓ Tu página con tu logo y colores\n✓ Reservas 24/7 en tu Google Calendar\n✓ Aviso de cada cita por WhatsApp\n' +
    '✓ Pago Móvil con la tasa BCV del día\n✓ Comprobante de cita y QR para tu local\n\n' +
    'Sin contrato: si no sigues, tu página se pausa y no pagas nada.',
  como:
    'Así de fácil 👇\n\n1️⃣ Te damos tu página: bookeaa.com/u/tu-negocio\n2️⃣ Tus clientes eligen servicio, día y hora\n' +
    `3️⃣ La cita cae en tu Google Calendar y te llega por WhatsApp\n\nMira un ejemplo real: ${MARCA.demo}`,

  // --- Afiliación ---
  afInicio:
    '¡Qué bueno! 🙌 Te hago unas preguntas rápidas y agendamos tu *cita de configuración e inducción*: ahí dejamos tu página lista contigo.\n\n' +
    'Primero: ¿cómo se llama tu negocio?',
  afNombreCorto: 'Escríbeme el nombre de tu negocio (al menos 2 letras).',
  afRubro: (negocio: string) => `Perfecto, *${negocio}*. ¿A qué se dedica?`,
  afRubroOtro: 'Cuéntame en pocas palabras a qué se dedica tu negocio.',
  afServicios:
    'Ahora tus *servicios*, con el precio y cuánto dura cada uno. Por ejemplo:\n\nCorte · $5 · 30 min\nCorte y barba · $8 · 45 min\n\nPuedes mandarlos en un solo mensaje.',
  afServiciosCorto: 'Mándame al menos un servicio con su precio y duración.',
  afHorario: '¿Cuál es tu *horario de trabajo*? Por ejemplo: lunes a sábado de 9:00 a 7:00.',
  afCorreo: 'Necesito un *correo de Gmail*: ahí te llega la invitación a la cita y luego tu calendario de reservas.',
  afCorreoMal: 'Ese correo no parece válido. Escríbelo completo, por ejemplo: minegocio@gmail.com',
  afCorreoNoGmail: (correo: string) =>
    `${correo} no es de Gmail. Para el calendario necesitamos una cuenta de Google. ¿Ese correo es de Google (Workspace)?`,
  afLogo: 'Si tienes *logo*, mándamelo como imagen 🖼️ (mejor PNG con fondo transparente). Si no, toca *Saltar*.',
  afLogoRecibido: '¡Recibido el logo! ✅',
  afModalidad:
    'Última parte: la *cita de configuración e inducción* (1 hora aprox.). ¿Cómo la prefieres?\n\n' +
    '🏪 *Presencial*: vamos a tu negocio, solo los *sábados*.\n💻 *Google Meet*: por videollamada, de *lunes a viernes*.',
  afDireccion: '¿Cuál es la *dirección* de tu negocio? Escríbela con un punto de referencia, o mándame tu ubicación 📍.',
  afDireccionCorta: 'Escríbeme la dirección completa (o manda tu ubicación 📍).',
  afDia: (modalidad: 'presencial' | 'meet') =>
    modalidad === 'presencial' ? 'Elige el *sábado* que te quede mejor 👇' : 'Elige el *día* para la videollamada 👇',
  afSinDias: 'Ahorita no tengo horas libres para esa opción 😕 Ya le aviso al equipo para que te escriba y cuadremos la cita.',
  afHora: (dia: string) => `Horas libres del ${dia} 👇`,
  afHoraTomada: 'Uy, esa hora se acaba de ocupar 😅 Elige otra 👇',
  afError: 'Tuve un problema para agendar 😕 Intenta de nuevo en un momento, o escribe *persona* y te atiende alguien del equipo.',
  afCorregir: '¿Qué dato quieres corregir?',

  // --- Cita ya agendada ---
  citaCancelada: 'Listo, cancelé tu cita. Cuando quieras agendar otra, escribe *menú* y toca *Afiliar mi negocio*.',
  citaNoCancelada: 'No pude cancelarla 😕 Escribe *persona* y lo resolvemos.',

  // --- Soporte ---
  sopNegocio: 'Claro, te ayudo 🛠️ ¿Cuál es el nombre de tu negocio o tu link (bookeaa.com/u/…)?',
  sopTema: '¿Con qué necesitas ayuda?',
  sopResuelto: '¿Con eso se resolvió?',
  sopGracias: '¡Genial! Cualquier otra cosa, escribe *menú* 🙌',
  sopDescripcion: 'Cuéntame qué pasó, con el mayor detalle que puedas.',
  sopCaptura: 'Si tienes una *captura de pantalla*, mándamela 📸. Si no, toca *Enviar sin captura*.',
  sopAbierto: (caso: number | null) =>
    `Listo, abrí tu caso${caso ? ` *#${caso}*` : ''} ✅ Alguien del equipo lo revisa y te escribe por aquí.`,

  // --- Persona ---
  persona: 'Listo, ya le aviso al equipo 🙋 Te escribimos por aquí en breve.',
  personaFuera: `Ya le aviso al equipo 🙋 Ahora estamos fuera de horario (atendemos ${ATENCION.texto}): te escribimos apenas abramos.`,
  humanoEspera: 'Ya le avisé al equipo y te escribimos por aquí. Si quieres volver al menú, escribe *menú*.',
}

/** Respuestas de soporte que el bot da solo (mismas del kit). */
export const SOPORTE: [string, string, string][] = [
  ['logo', 'No se ve mi logo',
    'Para que se vea tu logo: abre tu hoja de Google → menú *bookeaa* → *Configurar mi página* → *Marca* → *Subir logo*. Mejor si es PNG con fondo transparente. Se ve en tu página al instante.'],
  ['horario', 'Horario o días libres',
    'Tu horario se cambia en *Configurar mi página* → *Horario*. Para un día libre o vacaciones, usa la pestaña *Bloqueos* o crea un evento de día completo en tu Google Calendar: esa hora deja de estar disponible.'],
  ['reserva', 'No aparece una reserva',
    'Todas las reservas se guardan en tu Google Calendar (calendario "Citas …") y en tu hoja, pestaña *Reservaciones*. Revisa ahí primero; si no está, cuéntame y lo revisamos.'],
  ['alerta', 'Alerta de las citas',
    'Para que te suene una alerta antes de cada cita: *Configurar mi página* → *Horario* → *Alerta de cada cita* y marca cuánto antes (por ejemplo 1 día y 1 h). Aplica a las citas nuevas.'],
  ['pagomovil', 'Pago Móvil y tasa',
    'Los datos de tu Pago Móvil se ponen en *Configurar mi página* → *Pagos*. Tu cliente ve el monto en bolívares con la tasa BCV del día y sube la captura al reservar.'],
  ['otro', 'Otra cosa', ''],
]
