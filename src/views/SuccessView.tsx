import { motion } from 'framer-motion'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Button } from '../components/ui/Button'
import { IconCalendar, IconWhatsApp } from '../components/ui/icons'
import type { Modalidad } from '../types'
import { nombreArchivo, type DatosComprobante } from '../lib/comprobante'
import { spring } from '../lib/motion'

interface SuccessViewProps {
  whatsappUrl: string
  calendarUrl: string
  modalidad: Modalidad
  comprobante: DatosComprobante | null
  onNew: () => void
}

// A domicilio se espera un poco más para que alcance a leer el recordatorio de la ubicación.
const REDIRECT_MS = { local: 1600, domicilio: 3200 } as const

type EstadoComprobante = 'ninguno' | 'preparando' | 'listo' | 'error'

/** Arma el PDF (jsPDF se carga recién acá) y lo baja con un <a download>. */
async function descargarComprobante(datos: DatosComprobante): Promise<void> {
  const { comprobantePdf } = await import('../lib/comprobantePdf')
  const url = URL.createObjectURL(comprobantePdf(datos))
  const a = document.createElement('a')
  a.href = url
  a.download = nombreArchivo(datos)
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 30_000)
}

export function SuccessView({ whatsappUrl, calendarUrl, modalidad, comprobante, onNew }: SuccessViewProps) {
  const [estado, setEstado] = useState<EstadoComprobante>(comprobante ? 'preparando' : 'ninguno')
  const pidio = useRef(false)

  const bajar = useCallback(async () => {
    if (!comprobante) return
    try {
      await descargarComprobante(comprobante)
      setEstado('listo')
    } catch {
      setEstado('error')
    }
  }, [comprobante])

  // Primero el comprobante (si el negocio no factura en modo fiscal) y después
  // WhatsApp. Si la descarga falla (navegadores dentro de apps), igual se sigue.
  useEffect(() => {
    if (pidio.current) return
    pidio.current = true
    if (comprobante) void bajar()
  }, [comprobante, bajar])

  // Si el comprobante tarda demasiado (conexión lenta), no se retiene a la clienta:
  // sigue a WhatsApp y el botón de descarga queda disponible.
  useEffect(() => {
    if (estado !== 'preparando') return
    const t = setTimeout(() => setEstado('error'), 8000)
    return () => clearTimeout(t)
  }, [estado])

  // Redirección automática; los botones quedan como respaldo si el navegador la bloquea.
  useEffect(() => {
    if (estado === 'preparando') return
    const t = setTimeout(() => window.location.assign(whatsappUrl), REDIRECT_MS[modalidad] + (estado === 'listo' ? 400 : 0))
    return () => clearTimeout(t)
  }, [whatsappUrl, modalidad, estado])

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-8 text-center">
      <motion.div
        className="grid size-24 place-items-center rounded-full bg-rose"
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', duration: 0.6, bounce: 0.35 }}
      >
        <svg viewBox="0 0 24 24" className="size-11" fill="none" aria-hidden>
          <motion.path
            d="M5 12.5l4.5 4.5L19 7.5"
            stroke="var(--color-ink)"
            strokeWidth={2.2}
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ delay: 0.25, type: 'spring', duration: 0.5, bounce: 0 }}
          />
        </svg>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ ...spring.gentle, delay: 0.15 }}>
        <h1 className="mt-8 font-display text-[38px] leading-tight tracking-[-0.01em]">¡Tu cita está reservada!</h1>
        <p className="mx-auto mt-3 max-w-[30ch] text-[15px] text-muted" role="status">
          {estado === 'preparando'
            ? 'Descargando tu comprobante de cita…'
            : estado === 'listo'
              ? 'Comprobante descargado. Te llevamos a WhatsApp para enviar el resumen…'
              : 'Te estamos llevando a WhatsApp para enviar el resumen…'}
        </p>
        {modalidad === 'domicilio' && (
          <p className="mx-auto mt-4 max-w-[32ch] rounded-2xl bg-rose-soft px-4 py-3 text-[14px] text-ink">
            📍 No olvides enviar tu <b className="font-semibold">ubicación</b> en el chat para llegar a tu casa.
          </p>
        )}
      </motion.div>

      <motion.div
        className="mt-10 w-full max-w-xs space-y-3"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
      >
        <Button block onClick={() => window.location.assign(whatsappUrl)}>
          <IconWhatsApp size={19} /> Abrir WhatsApp
        </Button>
        {comprobante && (
          <Button block variant="secondary" onClick={() => void bajar()}>
            <IconDescarga /> {estado === 'error' ? 'Reintentar comprobante' : 'Descargar comprobante'}
          </Button>
        )}
        <Button block variant="secondary" onClick={() => window.open(calendarUrl, '_blank', 'noopener')}>
          <IconCalendar size={19} /> Agregar a mi calendario
        </Button>
        <Button block variant="ghost" onClick={onNew}>
          Hacer otra reserva
        </Button>
      </motion.div>
    </div>
  )
}

function IconDescarga() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 4v11M7 10l5 5 5-5M5 20h14" />
    </svg>
  )
}

