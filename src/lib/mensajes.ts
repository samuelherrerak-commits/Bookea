/**
 * Plantillas del mensaje de WhatsApp que el cliente manda al reservar.
 *
 * Cada negocio tiene la pestaña "Mensajes" (Nombre, Texto) y elige una con la clave
 * `mensaje_plantilla`. El texto usa {variables}; una línea cuyas variables quedan
 * todas vacías se borra entera (así "🎟️ {cupon}" desaparece si no hubo cupón).
 * Las 3 de abajo son las que siembra el backend y el respaldo si la hoja no tiene
 * la pestaña. apps-script/Code.gs y el configurador tienen el mismo texto.
 */

export const VARIABLES_MENSAJE = [
  'negocio',
  'nombre',
  'telefono',
  'fecha',
  'hora',
  'duracion',
  'servicios',
  'lugar',
  'direccion',
  'cupon',
  'total',
  'pago',
  'comprobante',
  'calendario',
  'reserva',
] as const

export type VariableMensaje = (typeof VARIABLES_MENSAJE)[number]
export type VariablesMensaje = Record<VariableMensaje, string>

export interface PlantillaMensaje {
  nombre: string
  texto: string
}

export const PLANTILLAS_MENSAJE: readonly PlantillaMensaje[] = [
  {
    nombre: 'Cálida',
    texto: [
      '✨ ¡Nueva reserva en {negocio}! ✨',
      '',
      '¡Hola! 😊 Quiero confirmar mi cita:',
      '',
      '👤 Nombre: {nombre}',
      '📱 Teléfono: {telefono}',
      '',
      '🗓️ Fecha: {fecha}',
      '⏰ Hora: {hora} ({duracion} aprox.)',
      '',
      '💫 Servicios:',
      '{servicios}',
      '',
      '📍 Lugar: {lugar}',
      '{direccion}',
      '',
      '🎟️ {cupon}',
      '💰 Total: {total}',
      '💳 Pago: {pago}',
      '🧾 Capture: {comprobante}',
      '',
      '📆 Agrégala a tu calendario: {calendario}',
      '',
      '🔖 Reserva {reserva}',
      '¡Gracias! Nos vemos pronto 💕',
    ].join('\n'),
  },
  {
    nombre: 'Formal',
    texto: [
      'Buen día. Quisiera confirmar la siguiente cita en {negocio}:',
      '',
      'Nombre: {nombre}',
      'Teléfono: {telefono}',
      'Fecha: {fecha}',
      'Hora: {hora} (duración aproximada: {duracion})',
      '',
      'Servicios:',
      '{servicios}',
      '',
      'Lugar: {lugar}',
      '{direccion}',
      '{cupon}',
      'Total: {total}',
      'Forma de pago: {pago}',
      'Comprobante: {comprobante}',
      '',
      'Agregar al calendario: {calendario}',
      'Reserva {reserva}',
      '',
      'Quedo atento(a) a su confirmación. Muchas gracias.',
    ].join('\n'),
  },
  {
    nombre: 'Breve',
    texto: [
      'Hola, {negocio} 👋 Reservé para el {fecha} a las {hora}.',
      '{servicios}',
      '{lugar} · Total {total} · {pago}',
      'Soy {nombre} ({telefono}). Reserva {reserva}',
      '{calendario}',
    ].join('\n'),
  },
]

const VAR_RE = /\{([a-z_]+)\}/g

/** Busca por nombre sin importar mayúsculas ni tildes; si no la encuentra, la primera. */
export function elegirPlantilla(plantillas: readonly PlantillaMensaje[], nombre: string): PlantillaMensaje {
  const key = (v: string) =>
    v
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .trim()
      .toLowerCase()
  const lista = plantillas.filter((p) => p.texto.trim())
  const fuente = lista.length ? lista : PLANTILLAS_MENSAJE
  return fuente.find((p) => key(p.nombre) === key(nombre)) ?? fuente[0]
}

/**
 * Reemplaza las {variables}. Las desconocidas se dejan tal cual (así el negocio ve
 * su error en el mensaje de prueba). Una línea con variables que quedaron todas
 * vacías se borra, y nunca quedan más de una línea en blanco seguida.
 */
export function renderMensaje(texto: string, vars: Partial<VariablesMensaje>): string {
  const lineas: string[] = []
  for (const linea of texto.replace(/\r\n?/g, '\n').split('\n')) {
    const usadas = [...linea.matchAll(VAR_RE)].map((m) => m[1]).filter((v) => v in vars || isVariable(v))
    if (usadas.length > 0 && usadas.every((v) => !(vars[v as VariableMensaje] ?? '').trim())) continue
    lineas.push(linea.replace(VAR_RE, (m, v: string) => (isVariable(v) ? (vars[v] ?? '') : m)))
  }
  return lineas
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function isVariable(v: string): v is VariableMensaje {
  return (VARIABLES_MENSAJE as readonly string[]).includes(v)
}
