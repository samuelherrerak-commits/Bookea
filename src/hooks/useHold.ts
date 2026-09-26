import { useCallback, useEffect, useRef, useState } from 'react'
import { ApiError, holdSlot, releaseHold } from '../lib/api'
import { segundosRestantes } from '../lib/hold'
import type { Modalidad, ReservationPayload } from '../types'

export interface SlotSelection {
  fechaCita: string
  horaCita: string
}

/** Lo que la agenda necesita para apartar la hora que el cliente tocó. */
export interface HoldRequest extends SlotSelection {
  items: ReservationPayload['items']
  modalidad: Modalidad
}

interface ActiveHold {
  holdId: string
  expira: number
  total: number
}

export interface UseHoldResult {
  /** Segundos que quedan; null si no hay hora apartada. */
  restantes: number | null
  /** Segundos totales que pidió el servidor, para la barra de progreso. */
  total: number | null
  apartando: boolean
  /** Aparta la hora. Devuelve false si alguien la agarró antes. */
  apartar: (req: HoldRequest) => Promise<boolean>
  /** Suelta la hora ahora (cambio de opinión o error). */
  soltar: () => void
  /** La reserva se confirmó: la hora ya es del cliente. */
  confirmar: () => void
}

/**
 * Estado de la hora apartada.
 *
 * Cuando el cliente toca un horario se aparta en el servidor, así que deja de
 * verse libre para los demás. Tiene 90 s para pagar; si se acaban, la hora se
 * libera y se vuelve al catálogo.
 *
 * El servidor es la autoridad: el `expira` que devuelve es el que manda. El
 * reloj de acá solo para mostrar la cuenta y para saber cuándo volver atrás.
 */
export function useHold(onExpired: () => void): UseHoldResult {
  const [restantes, setRestantes] = useState<number | null>(null)
  const [total, setTotal] = useState<number | null>(null)
  const [apartando, setApartando] = useState(false)
  const hold = useRef<ActiveHold | null>(null)
  const expirado = useRef(false)

  // Cuenta regresiva. Se recalcula desde expira en cada tick, no descontando, así
  // que si la pestaña estuvo en background no acumula error.
  useEffect(() => {
    if (restantes === null) return
    const tick = () => {
      const expira = hold.current?.expira ?? 0
      const seg = segundosRestantes(expira)
      if (seg <= 0) {
        hold.current = null
        setRestantes(null)
        if (!expirado.current) {
          expirado.current = true
          onExpired()
        }
        return
      }
      setRestantes(seg)
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [restantes === null, onExpired])

  const apartar = useCallback(async (req: HoldRequest) => {
    setApartando(true)
    try {
      const r = await holdSlot({ fechaCita: req.fechaCita, horaCita: req.horaCita, items: req.items, modalidad: req.modalidad })
      hold.current = { holdId: r.holdId, expira: r.expira, total: r.segundos }
      expirado.current = false
      setTotal(r.segundos)
      setRestantes(Math.max(1, segundosRestantes(r.expira)))
      return true
    } catch (e) {
      // 'cupo_ocupado' no es un error de la app: alguien llegó primero.
      if (e instanceof ApiError && e.code === 'cupo_ocupado') return false
      throw e
    } finally {
      setApartando(false)
    }
  }, [])

  const soltar = useCallback(() => {
    const actual = hold.current
    hold.current = null
    setRestantes(null)
    setTotal(null)
    if (actual) void releaseHold(actual.holdId)
  }, [])

  const confirmar = useCallback(() => {
    hold.current = null
    setRestantes(null)
    setTotal(null)
  }, [])

  return { restantes, total, apartando, apartar, soltar, confirmar }
}
