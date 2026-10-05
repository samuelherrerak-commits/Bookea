// Todo lo que se lee en /ar, en un solo lugar. Las frases van en líneas de ≤ 22 caracteres
// para que se lean a tamaño de tarjeta (un test lo comprueba).

export const CTA = { texto: 'Prueba 1 mes gratis', url: 'https://bookeaa.com' }

// Salen disparadas desde la tarjeta, una por una, en este orden.
export const FRASES = [
  ['Tus clientes reservan', 'desde tu link'],
  ['La cita llega sola', 'a tu Google Calendar'],
  ['Adiós libreta'],
  ['Te llega cada cita', 'por WhatsApp'],
  ['Reservas 24/7,', 'sin llamadas'],
  ['Tu página con tu', 'logo y colores'],
  ['1 mes gratis,', 'luego $10 al mes'],
]

// La cita que el personaje anota mientras habla por teléfono (como en la tarjeta 3).
export const CITA = { titulo: 'Nueva reserva', detalle: 'Hoy · 10:30 a. m.' }
export const GLOBO = '¡Agendado!'
export const AGENDA = 'Agenda'

// Los textos fijos de la página (pantalla inicial, "Apunta a la tarjeta", etc.) están en index.html.
export const MENSAJES = {
  abriendo: 'Abriendo la cámara…',
  preparando: 'Preparando la magia…',
  motivos: {
    elegido: '',
    permiso: 'No diste permiso para usar la cámara. Puedes activarlo en los ajustes del navegador y reintentar.',
    sinCamara: 'No encontramos una cámara disponible en este dispositivo.',
    ocupada: 'La cámara está ocupada por otra app. Ciérrala y reintenta.',
    navegador: 'Este navegador no permite la cámara aquí. Abre el enlace en Safari (iPhone) o Chrome (Android).',
    error: 'No pudimos iniciar la realidad aumentada en este dispositivo.',
  },
}
