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

/**
 * Cada texto es un mensaje del bot, y cada mensaje cuenta para los 1.000 gratis del mes:
 * un mensaje por turno, cortos y que pidan todo lo que se pueda de una vez.
 */
export const T = {
  bienvenida: (nombre: string) =>
    `¡Hola${nombre ? ' ' + nombre.split(' ')[0] : ''}! 👋 Soy *bookeaa*: tus clientes reservan solos y la cita te llega a tu Google Calendar y por WhatsApp.\n\n🎁 *1 mes gratis*, luego $10 al mes. ¿Qué necesitas?`,
  menuOtraVez: '¿En qué más te ayudo? 👇',
  noEntendi: 'No te entendí 🙈 Elige una opción 👇',
  usaBotones: 'Toca una de las opciones de arriba 👆 o escribe *menú*.',

  info:
    'Te damos tu página de reservas (bookeaa.com/u/tu-negocio): tus clientes eligen servicio, día y hora, y la cita cae en tu Google Calendar y te avisa por WhatsApp. ' +
    `Con tu logo, tus colores, Pago Móvil y comprobante.\n\n🎁 *1 mes gratis*, luego *$10 al mes*. Sin contrato.\n\nMira un ejemplo: ${MARCA.demo}`,

  // --- Afiliación: lo mínimo para agendar; el resto se toma en la inducción ---
  afDatos:
    '¡Vamos! 🙌 Tu mes gratis empieza con una *cita de configuración* (1 h): ahí dejamos tu página lista contigo.\n\n' +
    'Escríbeme en un solo mensaje el *nombre de tu negocio* y tu *correo Gmail*.\nEj: _Barbería El Corte, elcorte@gmail.com_',
  afFaltaNombre: '¿Y cómo se llama tu negocio?',
  afFaltaCorreo: (negocio: string) => `Perfecto, *${negocio}*. Ahora tu *correo Gmail* (ahí te llega la invitación) ✉️`,
  afCorreoMal: 'Ese correo no parece válido. Escríbelo completo, ej: minegocio@gmail.com',
  afModalidad: (negocio: string) => `Listo, *${negocio}* ✅ ¿Cómo prefieres la cita?\n\n🏪 *Presencial*: vamos a tu negocio, los *sábados*.\n💻 *Google Meet*: de *lunes a viernes*.`,
  afDireccion: '¿Cuál es la *dirección* de tu negocio? Con un punto de referencia, o mándame tu ubicación 📍',
  afDireccionCorta: 'Escríbeme la dirección completa (o manda tu ubicación 📍).',
  afHoras: (modalidad: 'presencial' | 'meet') => (modalidad === 'presencial' ? 'Elige día y hora para visitarte 👇' : 'Elige día y hora para la videollamada 👇'),
  afSinHoras: 'Ahorita no tengo horas libres para esa opción 😕 Ya le aviso al equipo para que te escriba y cuadremos la cita.',
  afHoraTomada: 'Uy, esa hora se acaba de ocupar 😅 Elige otra 👇',
  afError: 'Tuve un problema para agendar 😕 Intenta de nuevo en un momento, o escribe *persona* y te atiende alguien del equipo.',

  // --- Cita ya agendada ---
  citaCancelada: 'Listo, cancelé tu cita. Cuando quieras otra, escribe *menú* → *Afiliar mi negocio*.',
  citaNoCancelada: 'No pude cancelarla 😕 Escribe *persona* y lo resolvemos.',

  // --- Soporte ---
  sopTema: '¿Con qué te ayudo? 🛠️',
  sopDescripcion: 'Cuéntame en un mensaje qué pasó y el *nombre de tu negocio*. Si tienes captura, mándala con el texto 📸',
  sopGracias: '¡Genial! Cualquier cosa, escribe *menú* 🙌',
  sopAbierto: (caso: number | null) =>
    `Listo, abrí tu caso${caso ? ` *#${caso}*` : ''} ✅ Alguien del equipo te escribe por aquí.`,

  // --- Persona ---
  persona: 'Listo, ya le aviso al equipo 🙋 Te escribimos por aquí en breve.',
  personaFuera: `Ya le aviso al equipo 🙋 Ahora estamos fuera de horario (atendemos ${ATENCION.texto}): te escribimos apenas abramos.`,
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
