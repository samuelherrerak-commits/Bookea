import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { CheckIcon } from './icons'
import { EASE_OUT } from './ui'

const DAYS = [
  { d: 'LUN', n: 12 },
  { d: 'MAR', n: 13 },
  { d: 'MIÉ', n: 14 },
  { d: 'JUE', n: 15 },
  { d: 'VIE', n: 16 },
]
const SLOTS = ['09:00', '09:45', '10:30', '11:15', '14:00', '14:45', '15:30', '16:30', '17:15']
const TAKEN = new Set(['09:45', '11:15', '15:30'])
const PICK = '16:30'

/** 0: mirando horas · 1: eligió una · 2: la cita ya está en el calendario. */
type Phase = 0 | 1 | 2
const HOLD: Record<Phase, number> = { 0: 1600, 1: 1100, 2: 3400 }

function useBookingLoop(): Phase {
  const reduce = useReducedMotion()
  const [phase, setPhase] = useState<Phase>(0)
  useEffect(() => {
    if (reduce) return
    const t = window.setTimeout(() => setPhase((p) => ((p + 1) % 3) as Phase), HOLD[phase])
    return () => window.clearTimeout(t)
  }, [phase, reduce])
  // Con movimiento reducido se muestra el final de la historia, quieto.
  return reduce ? 2 : phase
}

export function PhoneMockup() {
  const phase = useBookingLoop()
  const picked = phase >= 1

  return (
    <div className="relative mx-auto w-[272px] sm:w-[292px]" aria-hidden="true">
      <div className="relative overflow-hidden rounded-[46px] border-[9px] border-coal bg-paper shadow-[0_30px_60px_-30px_rgb(15_15_14/0.45)]">
        <div className="mx-auto mt-2 h-[22px] w-[92px] rounded-full bg-coal" />

        <div className="px-4 pt-3 pb-5">
          <div className="flex items-center justify-center rounded-full bg-mist px-3 py-1.5 font-barlow text-[11px] text-graphite">
            bookeaa.com/u/<span className="font-semibold text-coal">estudio-luna</span>
          </div>

          <p className="mt-4 font-condensed text-[28px] leading-none font-extrabold uppercase">Estudio Luna</p>
          <span className="mt-2 block h-[2px] w-6 bg-coal" />

          <div className="mt-3 flex items-center justify-between rounded-xl border border-rule px-3 py-2.5">
            <div>
              <p className="font-barlow text-[13px] font-semibold leading-tight">Corte y barba</p>
              <p className="font-barlow text-[11px] text-graphite">45 min</p>
            </div>
            <span className="font-condensed text-[18px] font-bold">$18</span>
          </div>

          <p className="mt-4 font-condensed text-[12px] font-semibold tracking-[0.12em] text-graphite">OCTUBRE</p>
          <div className="mt-1.5 grid grid-cols-5 gap-1.5">
            {DAYS.map((day) => {
              const on = day.n === 15
              return (
                <div
                  key={day.n}
                  className={`flex flex-col items-center rounded-xl py-1.5 ${on ? 'bg-coal text-paper' : 'bg-mist text-coal'}`}
                >
                  <span className="font-condensed text-[10px] font-semibold tracking-[0.08em] opacity-70">{day.d}</span>
                  <span className="font-condensed text-[19px] leading-tight font-bold">{day.n}</span>
                </div>
              )
            })}
          </div>

          <div className="mt-3 grid grid-cols-3 gap-1.5">
            {SLOTS.map((slot) => {
              const taken = TAKEN.has(slot)
              const on = slot === PICK && picked
              return (
                <div
                  key={slot}
                  className={`relative rounded-lg py-2 text-center font-condensed text-[15px] font-semibold transition-colors duration-200 ease-out ${
                    taken ? 'text-graphite/40 line-through' : on ? 'bg-coal text-paper' : 'border border-rule text-coal'
                  }`}
                >
                  {slot}
                </div>
              )
            })}
          </div>

          <div
            className={`mt-4 flex h-11 items-center justify-center rounded-full font-condensed text-[15px] font-bold uppercase tracking-[0.08em] transition-colors duration-200 ease-out ${
              picked ? 'bg-coal text-paper' : 'bg-mist text-graphite'
            }`}
          >
            {phase === 2 ? 'Reservado' : 'Reservar 16:30'}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {phase === 2 && (
          <motion.div
            key="event"
            initial={{ opacity: 0, y: 14, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.98, transition: { duration: 0.18, ease: 'easeIn' } }}
            transition={{ duration: 0.42, ease: EASE_OUT }}
            className="absolute -right-2 -bottom-12 w-[232px] origin-bottom-left rounded-2xl bg-coal p-4 text-paper shadow-[0_24px_48px_-20px_rgb(15_15_14/0.6)] sm:-right-28 sm:bottom-16 lg:-right-44"
          >
            <p className="font-condensed text-[11px] font-semibold tracking-[0.14em] text-paper/60">GOOGLE CALENDAR</p>
            <div className="mt-2 flex gap-3">
              <span className="w-[3px] shrink-0 rounded-full bg-paper" />
              <div>
                <p className="font-condensed text-[20px] leading-tight font-bold uppercase">Corte y barba</p>
                <p className="font-barlow text-[12px] text-paper/70">Jue 15 oct · 16:30 – 17:15</p>
                <p className="font-barlow text-[12px] text-paper/70">Andrea R. · +58 412 000 0000</p>
              </div>
            </div>
            <p className="mt-3 flex items-center gap-1.5 border-t border-paper/15 pt-2.5 font-barlow text-[12px] font-medium">
              <CheckIcon width={14} height={14} strokeWidth={2.4} /> Guardado en tu calendario y en el suyo
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
