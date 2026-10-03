/** Lo que llega de WhatsApp, ya simplificado. */
export type Entrada =
  | { tipo: 'texto'; texto: string }
  | { tipo: 'opcion'; id: string; titulo: string }
  | { tipo: 'imagen'; mediaId: string; texto?: string }
  | { tipo: 'ubicacion'; lat: number; lng: number; nombre?: string; direccion?: string }
  | { tipo: 'otro' }

/** Lo que el bot responde. Los límites son los de WhatsApp. */
export type Salida =
  | { tipo: 'texto'; texto: string }
  /** Hasta 3 botones; cada título hasta 20 caracteres. */
  | { tipo: 'botones'; texto: string; botones: Boton[] }
  /** Hasta 10 filas; título de fila hasta 24, descripción hasta 72, botón hasta 20. */
  | { tipo: 'lista'; texto: string; boton: string; filas: Fila[] }

export type Boton = { id: string; titulo: string }
export type Fila = { id: string; titulo: string; descripcion?: string }

export type Modalidad = 'presencial' | 'meet'
export type Modo = 'bot' | 'humano'
export type Etiqueta = '' | 'prospecto' | 'cita' | 'prueba' | 'pago' | 'activo' | 'soporte' | 'resuelto'

export type Paso =
  | 'inicio'
  | 'af_nombre' | 'af_rubro' | 'af_rubro_otro' | 'af_servicios' | 'af_horario' | 'af_correo' | 'af_correo_confirmar'
  | 'af_logo' | 'af_modalidad' | 'af_direccion' | 'af_dia' | 'af_hora' | 'af_confirmar' | 'af_corregir'
  | 'cita_menu' | 'cita_cancelar'
  | 'sop_negocio' | 'sop_tema' | 'sop_resuelto' | 'sop_descripcion' | 'sop_captura'

/** Un día con horas libres, como lo devuelve Apps Script. */
export type Dia = { fecha: string; horas: string[] }

export type Cita = {
  idEvento: string
  modalidad: Modalidad
  /** "2026-10-03" y "09:30", hora de Caracas. */
  fecha: string
  hora: string
  direccion?: string
  meet?: string
}

export type Afiliacion = {
  negocio?: string
  rubro?: string
  servicios?: string
  serviciosFoto?: string // id de la imagen si mandó foto de la lista
  horario?: string
  correo?: string
  logo?: string // id de la imagen en WhatsApp
  sinLogo?: boolean
  modalidad?: Modalidad
  direccion?: string
  ubicacion?: { lat: number; lng: number }
  fecha?: string
  hora?: string
}

export type DatosConversacion = {
  af?: Afiliacion
  /** Días ofrecidos en la última consulta, para no volver a pedirlos. */
  dias?: Dia[]
  /** Al corregir un dato se vuelve directo al resumen. */
  volverAResumen?: boolean
  /** Elegir día y hora para mover la cita que ya existe. */
  reprogramando?: boolean
  sop?: { negocio?: string; tema?: string; descripcion?: string; captura?: string }
}

export type Conversacion = {
  telefono: string
  nombre: string
  paso: Paso
  datos: DatosConversacion
  modo: Modo
  etiqueta: Etiqueta
  cita: Cita | null
  /** ms del último mensaje del cliente (antes del actual): abre la ventana de 24 h. */
  ultimoEntrante: number | null
}

export type ResultadoCita = { ok: true; cita: Cita } | { ok: false; motivo: 'ocupado' | 'error' }

/** Lo que el bot le pide al mundo (Apps Script). En las pruebas son dobles. */
export interface Servicios {
  disponibilidad(modalidad: Modalidad): Promise<Dia[]>
  agendar(conv: Conversacion, af: Afiliacion): Promise<ResultadoCita>
  reprogramar(conv: Conversacion, cita: Cita, fecha: string, hora: string): Promise<ResultadoCita>
  cancelar(conv: Conversacion, cita: Cita): Promise<boolean>
  soporte(conv: Conversacion, sop: NonNullable<DatosConversacion['sop']>): Promise<number | null>
  persona(conv: Conversacion): Promise<void>
}
