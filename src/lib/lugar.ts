import type { BusinessConfig, Modalidad, Sede } from '../types'

/**
 * Tipos de lugar que ofrece la hoja (clave `lugar_tipo`). La etiqueta va con su
 * artículo porque se usa en frases: "En el consultorio", "Ver ubicación de la barbería".
 * La misma lista vive en apps-script/Code.gs y en el configurador de la hoja.
 */
export const LUGAR_TIPOS = {
  spa: 'el spa',
  consultorio: 'el consultorio',
  barberia: 'la barbería',
  estudio: 'el estudio',
  salon: 'el salón',
  clinica: 'la clínica',
  local: 'el local',
} as const

export type LugarTipo = keyof typeof LUGAR_TIPOS | 'otro'

const norm = (v: string) =>
  v
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toLowerCase()

/**
 * "consultorio" → "el consultorio". Con `otro`, el negocio escribe la frase en
 * `lugar_nombre` tal como va después de "En": "la clínica", "Casa Ana".
 */
export function etiquetaLugar(tipo: string, nombre = ''): string {
  const t = norm(tipo)
  if (t in LUGAR_TIPOS) return LUGAR_TIPOS[t as keyof typeof LUGAR_TIPOS]
  return nombre.trim() || LUGAR_TIPOS.local
}

export function capitalizar(texto: string): string {
  return texto.charAt(0).toUpperCase() + texto.slice(1)
}

export function sedeId(nombre: string): string {
  return norm(nombre).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'principal'
}

export interface OpcionLugar {
  modalidad: Modalidad
  sedeId: string | null
  titulo: string
  detalle: string
  mapsUrl: string
}

/**
 * Lo que el cliente puede elegir: una opción por sede y, si el negocio lo ofrece,
 * "A domicilio". Con una sola sede el título es "En el consultorio"; con varias,
 * el nombre de cada sede.
 */
export function opcionesLugar(config: Pick<BusinessConfig, 'lugar' | 'permiteDomicilio' | 'domicilio'>): OpcionLugar[] {
  const { sedes, etiqueta } = config.lugar
  const varias = sedes.length > 1
  const opciones: OpcionLugar[] = sedes.map((s) => ({
    modalidad: 'local',
    sedeId: s.id,
    titulo: varias ? s.nombre : `En ${etiqueta}`,
    detalle: s.direccion || (varias ? `En ${etiqueta}` : 'Sin recargo'),
    mapsUrl: s.mapsUrl,
  }))
  if (config.permiteDomicilio) {
    const { recargoPct, minutosExtra } = config.domicilio
    const partes = [recargoPct > 0 ? `+${recargoPct} %` : 'Sin recargo', minutosExtra > 0 ? `+${minutosExtra} min` : '']
    opciones.push({
      modalidad: 'domicilio',
      sedeId: null,
      titulo: 'A domicilio',
      detalle: partes.filter(Boolean).join(' · '),
      mapsUrl: '',
    })
  }
  return opciones
}

export interface LugarElegido {
  /** "En el consultorio", "En Sede Norte" o "A domicilio". */
  titulo: string
  sede: Sede | null
}

export function lugarElegido(
  config: Pick<BusinessConfig, 'lugar'>,
  modalidad: Modalidad,
  id: string | null,
): LugarElegido {
  if (modalidad === 'domicilio') return { titulo: 'A domicilio', sede: null }
  const { sedes, etiqueta } = config.lugar
  const sede = sedes.find((s) => s.id === id) ?? sedes[0] ?? null
  return { titulo: sede && sedes.length > 1 ? `En ${sede.nombre}` : `En ${etiqueta}`, sede }
}

/** ¿La elección guardada sigue existiendo con la configuración actual? */
export function eleccionValida(
  config: Pick<BusinessConfig, 'lugar' | 'permiteDomicilio' | 'domicilio'>,
  modalidad: Modalidad | null,
  id: string | null,
): boolean {
  if (!modalidad) return false
  return opcionesLugar(config).some((o) => o.modalidad === modalidad && (modalidad === 'domicilio' || o.sedeId === id))
}
