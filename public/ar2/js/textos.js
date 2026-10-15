// Todo lo que se lee en /ar2, en un solo lugar.

export const CTA = { texto: 'Prueba 1 mes gratis', url: 'https://bookeaa.com' }

// Globos de diálogo (cortos: se leen a tamaño de tarjeta).
export const GLOBOS = {
  oye: '¡Oye, tú!',
  grrr: '¡GRRR!',
  agendado: '¡Agendado!',
  nooo: '¡Nooo…!',
}

// Las hojas de la agenda de papel se vuelven estas citas digitales.
export const CITAS = [
  ['Corte de pelo', 'Hoy · 10:30'],
  ['Manicure', 'Hoy · 12:00'],
  ['Consulta', 'Mañana · 9:00'],
  ['Masaje', 'Mañana · 17:30'],
  ['Tatuaje', 'Vie · 16:00'],
  ['Clase de yoga', 'Sáb · 10:00'],
  ['Barbería', 'Sáb · 11:30'],
  ['Limpieza facial', 'Lun · 15:00'],
]

// Para lectores de pantalla (la animación es un dibujo en canvas).
export const DESCRIPCION =
  'Una agenda de papel malvada rompe la tarjeta y sale del hueco rugiendo. Bookee, el logo de bookeaa, le hace frente, se asusta y, cuando está a punto de comérselo, saca su teléfono: «¡Agendado!». Las hojas de la agenda se vuelven citas digitales y la agenda se encoge y cae por el hueco.'

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
