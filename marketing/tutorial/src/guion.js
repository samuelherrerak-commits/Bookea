// Guion del tutorial "Configura tu página de reservas" (sin voz: todo se explica en pantalla).
//
// Cada escena tiene su título y una lista de momentos. Cada momento muestra una captura
// real de Mi negocio (public/capturas), señala una cosa (una marca de capturas.json) y
// dice qué hacer. `tap` dibuja el dedo tocando; `mov` dice cómo llega esa pantalla
// ('scroll' = misma sección, más abajo; si no, se navega). **así** va en negrita.
// Este archivo lo leen el video (src/) y el audio (scripts/audio.mjs).

export const FPS = 30
export const PASOS = 9

/** @typedef {{ img: string, texto: string, seg: number, marca?: string, tap?: boolean, mov?: 'scroll', sonido?: string }} Momento */
/** @typedef {{ id: string, tipo?: 'intro' | 'cierre', paso?: number, kicker: string, titulo: string, momentos: Momento[] }} Escena */

/** @type {Escena[]} */
export const ESCENAS = [
  {
    id: 'intro',
    tipo: 'intro',
    kicker: 'Guía rápida · bookeaa',
    titulo: 'Configura tu página de reservas',
    momentos: [{ img: 'cliente-1', texto: 'En **9 pasos**, desde tu teléfono. Así va a quedar.', seg: 5 }],
  },
  {
    id: 'entrar',
    paso: 1,
    kicker: 'Entra',
    titulo: 'Abre Mi negocio',
    momentos: [
      { img: 'entrar', marca: 'boton', tap: true, texto: 'Abre **bookeaa.com/negocio** y toca **Entrar con Google**.', seg: 4.5 },
      { img: 'entrar', marca: 'boton', texto: 'Usa el **mismo Gmail** que nos diste al afiliarte.', seg: 3.5 },
    ],
  },
  {
    id: 'hoy',
    paso: 1,
    kicker: 'Entra',
    titulo: 'Tu panel',
    momentos: [
      { img: 'hoy', marca: 'hero', texto: 'En **Hoy** ves las citas del día. Aquí te llega cada reserva.', seg: 4 },
      { img: 'hoy', marca: 'configurar', tap: true, texto: 'Para armar tu página, toca **Configurar**.', seg: 3.5 },
    ],
  },
  {
    id: 'configurar',
    paso: 1,
    kicker: 'Entra',
    titulo: 'Todo está en Configurar',
    momentos: [
      { img: 'configurar', texto: 'Cada sección se guarda sola. **Vamos en orden.**', seg: 3 },
      { img: 'configurar', marca: 'pagina', tap: true, texto: 'Empieza por **Mi página**.', seg: 2.5 },
    ],
  },
  {
    id: 'pagina',
    paso: 2,
    kicker: 'Tu marca',
    titulo: 'Mi página',
    momentos: [
      { img: 'pagina-1', marca: 'nombre', texto: 'Escribe el **nombre de tu negocio**.', seg: 3 },
      { img: 'pagina-1', marca: 'titulo', texto: 'Y el **título grande** que verán tus clientes.', seg: 3 },
      { img: 'pagina-2', mov: 'scroll', marca: 'logo', tap: true, texto: 'Más abajo, **sube tu logo**.', seg: 3 },
      { img: 'pagina-3', mov: 'scroll', marca: 'estilo', tap: true, texto: 'Elige un **estilo** y tu **color**. Arriba lo ves en vivo.', seg: 3.5 },
      { img: 'pagina-3', marca: 'guardar', tap: true, texto: 'Toca **Guardar cambios**.', seg: 2.5 },
      { img: 'pagina-guardado', marca: 'guardar', texto: '**¡Guardado!** Ya está en tu página.', seg: 2.5, sonido: 'check' },
    ],
  },
  {
    id: 'cliente',
    paso: 2,
    kicker: 'Tu marca',
    titulo: 'Así la ven tus clientes',
    momentos: [
      { img: 'cliente-1', texto: 'Con **Ver en grande** ves tu página tal como la ven tus clientes.', seg: 4 },
      { img: 'cliente-2', mov: 'scroll', texto: 'Tus servicios, con **precio y duración**.', seg: 3.5 },
    ],
  },
  {
    id: 'servicios',
    paso: 3,
    kicker: 'Lo que haces',
    titulo: 'Servicios',
    momentos: [
      { img: 'servicios-1', marca: 'primero', texto: 'Cada servicio con su **nombre, precio y minutos**.', seg: 4 },
      { img: 'servicios-2', mov: 'scroll', marca: 'agregar', tap: true, texto: 'Toca **+ Agregar servicio** para sumar otro.', seg: 3.5 },
      { img: 'servicios-2', marca: 'adicional', texto: 'Lavado, diseño, extras: márcalos como **adicional**.', seg: 3.5 },
    ],
  },
  {
    id: 'horario',
    paso: 4,
    kicker: 'Cuándo atiendes',
    titulo: 'Horario',
    momentos: [
      { img: 'horario-1', marca: 'lunes', texto: 'Prende los **días que trabajas** y pon tus horas.', seg: 4 },
      { img: 'horario-2', mov: 'scroll', marca: 'agenda', texto: '**Cada cuántos minutos** hay cita y con cuánto **aviso** te reservan.', seg: 4.5 },
    ],
  },
  {
    id: 'lugar',
    paso: 5,
    kicker: 'Dónde atiendes',
    titulo: 'Lugar',
    momentos: [{ img: 'lugar', marca: 'sede', texto: 'Tu sede y su **dirección**. Si vas a domicilio, actívalo abajo.', seg: 5 }],
  },
  {
    id: 'cobros',
    paso: 6,
    kicker: 'Muy importante',
    titulo: 'Tu WhatsApp y tus cobros',
    momentos: [
      { img: 'cobros-1', marca: 'whatsapp', texto: 'Tu **WhatsApp con código de país** (58…). Ahí te llega cada reserva.', seg: 4.5 },
      { img: 'cobros-1', marca: 'moneda', texto: 'La **moneda** de tus precios.', seg: 2.5 },
      { img: 'cobros-2', mov: 'scroll', marca: 'metodos', texto: '**Cómo te pagan**: en la cita, Pago Móvil o los dos.', seg: 3.5 },
      { img: 'cobros-2', marca: 'pagomovil', texto: 'Y tus **datos de Pago Móvil** para que te paguen al reservar.', seg: 3.5 },
    ],
  },
  {
    id: 'libres',
    paso: 7,
    kicker: 'Descansos',
    titulo: 'Días libres',
    momentos: [{ img: 'libres', marca: 'dia', texto: '¿Vacaciones o feriado? Agrégalo y **nadie podrá reservar** ese día.', seg: 5 }],
  },
  {
    id: 'qr',
    paso: 8,
    kicker: 'Compártela',
    titulo: 'Tu link y tu QR',
    momentos: [
      { img: 'qr', marca: 'link', texto: 'Este es **tu link de reservas**. Cópialo con un toque.', seg: 3.5 },
      { img: 'qr', marca: 'cartel', texto: 'Y tu **QR** para el mostrador, tus historias o tu tarjeta.', seg: 3.5 },
    ],
  },
  {
    id: 'avisos',
    paso: 9,
    kicker: 'Al instante',
    titulo: 'Avisos en tu teléfono',
    momentos: [
      { img: 'avisos', marca: 'activar', tap: true, texto: 'Toca **Activar avisos**: cada reserva te suena en el teléfono.', seg: 4 },
      { img: 'avisos', marca: 'app', texto: 'Y agrégala a tu **pantalla de inicio** para usarla como app.', seg: 3.5 },
    ],
  },
  {
    id: 'citas',
    paso: 9,
    kicker: 'Día a día',
    titulo: 'Tus citas',
    momentos: [
      { img: 'hoy-citas', marca: 'pago', texto: '¿Te pagaron por Pago Móvil? Toca **Pago recibido**.', seg: 3.5 },
      { img: 'hoy-citas', marca: 'reagendar', texto: '¿El cliente no puede? **Reagenda** su cita…', seg: 3 },
      { img: 'hoy-citas', marca: 'cancelar', texto: '…o **cancélala**, y avísale por WhatsApp.', seg: 3 },
    ],
  },
  {
    id: 'cierre',
    tipo: 'cierre',
    kicker: '¡Listo!',
    titulo: 'Comparte tu link',
    momentos: [{ img: 'cliente-1', texto: 'Ponlo en tu **Instagram** y en tu **WhatsApp**.', seg: 7 }],
  },
]

/** Duración (cuadros) de la transición entre pantallas y entre escenas. */
export const TRANSICION = 14

/** La línea de tiempo en cuadros: escenas y momentos con su inicio y su fin. */
export function linea(fps = FPS) {
  let t = 0
  const escenas = ESCENAS.map((e) => {
    const inicio = t
    const momentos = e.momentos.map((m) => {
      const ini = t
      t += Math.round(m.seg * fps)
      return { ...m, inicio: ini, fin: t }
    })
    return { ...e, inicio, fin: t, momentos }
  })
  return { escenas, momentos: escenas.flatMap((e) => e.momentos.map((m) => ({ ...m, escena: e.id }))), total: t }
}

/** Cuadros que tarda la cámara en acercarse a lo que se señala. */
export const CAMARA = 20

/**
 * Tiempos dentro de un momento (en cuadros desde su inicio): cuándo arranca la cámara,
 * cuándo aparece la marca y cuándo el dedo toca. Si la pantalla cambia, primero entra.
 */
export function tiempos(m, previo) {
  const cambia = !previo || previo.img !== m.img
  const camara = cambia ? TRANSICION : 0
  const marca = camara + CAMARA - 6
  const dedo = marca + 8
  const toque = dedo + 9
  return { cambia, camara, marca, dedo, toque }
}
