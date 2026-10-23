import { motion } from 'framer-motion'
import { useEffect, useRef } from 'react'
import { iniciales } from '../lib/equipo'
import { haptic, spring, tap } from '../lib/motion'
import type { Profesional } from '../types'
import { CUALQUIERA } from '../types'

/**
 * bookeaa team: con quién reservar. Tarjetas en fila (se desliza de lado) con la foto o las
 * iniciales, el nombre y el cargo. "Cualquiera disponible" va primero si el negocio la ofrece.
 */

export function Avatar({ persona, size = 56 }: { persona: Pick<Profesional, 'nombre' | 'foto'> | null; size?: number }) {
  const estilo = { width: size, height: size }
  if (!persona) {
    return (
      <span style={estilo} className="grid shrink-0 place-items-center rounded-full bg-rose-soft text-rose-deep ring-1 ring-rose/40" aria-hidden>
        <svg viewBox="0 0 24 24" width={size * 0.46} height={size * 0.46} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <circle cx="9" cy="8" r="3.2" />
          <path d="M3.5 19a5.5 5.5 0 0 1 11 0M15.5 5.2a3.2 3.2 0 0 1 0 5.6M17.5 19a5.5 5.5 0 0 0-2.4-4.5" />
        </svg>
      </span>
    )
  }
  if (persona.foto) {
    return <img src={persona.foto} alt="" style={estilo} className="shrink-0 rounded-full object-cover ring-1 ring-line" loading="lazy" />
  }
  return (
    <span style={{ ...estilo, fontSize: size * 0.34 }} className="grid shrink-0 place-items-center rounded-full bg-rose-soft font-semibold text-rose-deep ring-1 ring-rose/40" aria-hidden>
      {iniciales(persona.nombre)}
    </span>
  )
}

interface EquipoPickerProps {
  personas: Profesional[]
  cualquiera: boolean
  selected: string | null
  onSelect: (id: string) => void
  /** Texto bajo "Cualquiera" (ej. "La primera hora libre"). */
  label?: string
}

export function EquipoPicker({ personas, cualquiera, selected, onSelect, label = 'Con quien esté libre' }: EquipoPickerProps) {
  const opciones: Array<{ id: string; persona: Profesional | null }> = [
    ...(cualquiera && personas.length > 1 ? [{ id: CUALQUIERA, persona: null }] : []),
    ...personas.map((p) => ({ id: p.id, persona: p })),
  ]
  // La elegida (por ejemplo, la del link ?con=) siempre a la vista, aunque esté al final de la fila.
  const fila = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = fila.current?.querySelector<HTMLElement>('[aria-checked="true"]')
    const cont = fila.current
    if (!el || !cont) return
    const izq = el.offsetLeft - cont.offsetLeft - 20
    if (izq < cont.scrollLeft || el.offsetLeft - cont.offsetLeft + el.offsetWidth > cont.scrollLeft + cont.clientWidth) cont.scrollTo({ left: Math.max(0, izq) })
  }, [selected])
  return (
    <div ref={fila} className="-mx-5 flex snap-x scroll-px-5 gap-2.5 overflow-x-auto px-5 pb-1 no-scrollbar" role="radiogroup" aria-label="Con quién">
      {opciones.map(({ id, persona }) => {
        const activa = selected === id
        return (
          <motion.button
            key={id}
            type="button"
            role="radio"
            aria-checked={activa}
            whileTap={tap}
            transition={spring.snappy}
            onClick={() => {
              haptic()
              onSelect(id)
            }}
            className={`flex w-[118px] shrink-0 snap-start flex-col items-center gap-2 rounded-2xl px-2 py-3.5 text-center shadow-card ring-1 transition-[background-color,box-shadow] duration-200 ${
              activa ? 'bg-rose-soft ring-2 ring-rose' : 'bg-surface ring-line'
            }`}
          >
            <Avatar persona={persona} />
            <span className="w-full truncate text-[14px] font-medium leading-tight">{persona ? persona.nombre.split(/\s+/)[0] : 'Cualquiera'}</span>
            <span className="-mt-1.5 line-clamp-2 min-h-[2.4em] w-full text-[12px] leading-tight text-muted">{persona ? persona.cargo || ' ' : label}</span>
          </motion.button>
        )
      })}
    </div>
  )
}
