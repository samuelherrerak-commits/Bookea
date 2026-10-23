import type { Catalog, Cart, Equipo, Profesional } from '../types'
import { CUALQUIERA } from '../types'
import { buildAgenda, type DayOption, type SlotState } from './slots'

/**
 * bookeaa team: con quién se puede reservar y sus días y horas. Cada persona tiene su
 * calendario; `Catalog.citas` (bloqueos y calendario del negocio) ocupa a todos.
 */

/** IDs de los servicios del carrito (los sueltos y los de las promociones). */
export function serviciosDelCarrito(cart: Cart, catalog: Pick<Catalog, 'promociones'>): string[] {
  const ids = [...cart.servicios]
  for (const id of cart.promos) ids.push(...(catalog.promociones.find((p) => p.id === id)?.servicioIds ?? []))
  return [...new Set(ids)]
}

/** ¿Hace todos estos servicios? Sin lista = hace todos. */
export function hace(p: Profesional, ids: string[]): boolean {
  if (!p.servicios.length) return true
  const propios = new Set(p.servicios.map((x) => x.toLowerCase()))
  return ids.every((id) => propios.has(id.toLowerCase()))
}

/** Las personas que pueden atender todo el carrito. */
export function aptos(equipo: Equipo, ids: string[]): Profesional[] {
  return equipo.personas.filter((p) => hace(p, ids))
}

const sinTildes = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()

/** La persona de un link ?con=: por id o por nombre ("carla", "Carla Pérez"). */
export function buscarPersona(equipo: Equipo | null | undefined, con: string | null): Profesional | null {
  if (!equipo || !con) return null
  const q = sinTildes(con).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  if (!q) return null
  return (
    equipo.personas.find((p) => p.id === q) ??
    equipo.personas.find((p) => sinTildes(p.nombre).replace(/[^a-z0-9]+/g, '-') === q) ??
    equipo.personas.find((p) => sinTildes(p.nombre).split(/\s+/)[0] === q) ??
    null
  )
}

/** Días y horas de una persona: su horario (o el del negocio), su calendario y lo que ocupa a todos. */
export function agendaPersona(catalog: Catalog, p: Profesional, duracionMin: number, ahora: Date = new Date()): DayOption[] {
  const config = p.horario ? { ...catalog.config, horario: p.horario } : catalog.config
  return buildAgenda(config, [...catalog.citas, ...(catalog.equipo?.citas[p.id] ?? [])], duracionMin, ahora)
}

const PRIORIDAD: Record<SlotState, number> = { libre: 2, reservado: 1, pasado: 0 }

/** "Cualquiera disponible": una hora está libre si al menos una persona apta la tiene libre. */
export function agendaCualquiera(catalog: Catalog, personas: Profesional[], duracionMin: number, ahora: Date = new Date()): DayOption[] {
  const dias = new Map<string, DayOption>()
  for (const p of personas) {
    for (const d of agendaPersona(catalog, p, duracionMin, ahora)) {
      const previo = dias.get(d.fecha)
      if (!previo) {
        dias.set(d.fecha, { ...d, slots: d.slots.map((s) => ({ ...s })) })
        continue
      }
      for (const s of d.slots) {
        const igual = previo.slots.find((x) => x.minutos === s.minutos)
        if (!igual) previo.slots.push({ ...s })
        else if (PRIORIDAD[s.estado] > PRIORIDAD[igual.estado]) igual.estado = s.estado
      }
    }
  }
  return [...dias.values()]
    .map((d) => {
      const slots = d.slots.sort((a, b) => a.minutos - b.minutos)
      return { ...d, slots, libres: slots.filter((s) => s.estado === 'libre').length }
    })
    .sort((a, b) => (a.fecha < b.fecha ? -1 : 1))
}

/** La agenda que se muestra según la elección: una persona, cualquiera o (sin equipo) la del negocio. */
export function agendaDe(catalog: Catalog, profesional: string | null, ids: string[], duracionMin: number, ahora: Date = new Date()): DayOption[] {
  const equipo = catalog.equipo
  if (!equipo) return buildAgenda(catalog.config, catalog.citas, duracionMin, ahora)
  if (profesional === CUALQUIERA) return agendaCualquiera(catalog, aptos(equipo, ids), duracionMin, ahora)
  const p = equipo.personas.find((x) => x.id === profesional)
  return p ? agendaPersona(catalog, p, duracionMin, ahora) : []
}

/** "Carla Pérez" → "CP" (para la foto que falta). */
export function iniciales(nombre: string): string {
  return nombre
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((x) => x[0]!.toUpperCase())
    .join('')
}
