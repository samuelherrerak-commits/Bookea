import { motion } from 'framer-motion'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Button } from '../components/ui/Button'
import { IconCalendar, IconWhatsApp } from '../components/ui/icons'
import type { Modalidad } from '../types'
import { nombreArchivo, type DatosTicket } from '../lib/ticket'
import { spring } from '../lib/motion'
import { ImpresoraTicket } from '../components/ticket/TicketReserva'

interface SuccessViewProps {
  whatsappUrl: string
  calendarUrl: string
  modalidad: Modalidad
  /** Ticket de reserva; null si el negocio no lo emite. */
  ticket: DatosTicket | null
  onNew: () => void
}

// A domicilio se espera un poco más para que alcance a leer el recordatorio de la ubicación.
const REDIRECT_MS = { local: 1600, domicilio: 3200 } as const

type EstadoTicket = 'ninguno' | 'imprimiendo' | 'preparando' | 'listo' | 'error'

async function imagen(datos: DatosTicket): Promise<Blob> {
  const { imagenTicket } = await import('../lib/ticketImagen')
  return imagenTicket(datos)
}

/** Dibuja el ticket como PNG y lo baja con un <a download>. */
async function descargarTicket(datos: DatosTicket): Promise<void> {
  const url = URL.createObjectURL(await imagen(datos))
  const a = document.createElement('a')
  a.href = url
  a.download = nombreArchivo(datos)
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 30_000)
}

/** Comparte la imagen del ticket (WhatsApp, Instagram…) donde el navegador lo permite. */
function puedeCompartir(): boolean {
  try {
    const prueba = new File([new Blob(['x'], { type: 'image/png' })], 'x.png', { type: 'image/png' })
    return !!navigator.canShare?.({ files: [prueba] })
  } catch {
    return false
  }
}

export function SuccessView({ whatsappUrl, calendarUrl, modalidad, ticket, onNew }: SuccessViewProps) {
  const [estado, setEstado] = useState<EstadoTicket>(ticket ? 'imprimiendo' : 'ninguno')
  const [compartible] = useState(puedeCompartir)
  const pidio = useRef(false)
  const [seguir, setSeguir] = useState(true)

  const bajar = useCallback(async () => {
    if (!ticket) return
    setEstado('preparando')
    try {
      await descargarTicket(ticket)
      setEstado('listo')
    } catch {
      setEstado('error')
    }
  }, [ticket])

  const compartir = async () => {
    if (!ticket) return
    setSeguir(false) // compartir abre otra hoja: no se le cambia la pantalla a la clienta
    try {
      const archivo = new File([await imagen(ticket)], nombreArchivo(ticket), { type: 'image/png' })
      await navigator.share({ files: [archivo], title: `Ticket de reserva · ${ticket.negocio}` })
    } catch {
      /* canceló o no se pudo: queda el botón de descargar */
    }
  }

  // Primero se imprime el ticket, después se descarga y después WhatsApp.
  // Si la descarga falla (navegadores dentro de apps), igual se sigue.
  const impreso = useCallback(() => {
    if (pidio.current) return
    pidio.current = true
    void bajar()
  }, [bajar])

  // Si el ticket tarda demasiado (conexión lenta), no se retiene a la clienta:
  // sigue a WhatsApp y el botón de descarga queda disponible.
  useEffect(() => {
    if (estado !== 'preparando' && estado !== 'imprimiendo') return
    const t = setTimeout(() => setEstado('error'), 8000)
    return () => clearTimeout(t)
  }, [estado])

  // Redirección automática; los botones quedan como respaldo si el navegador la bloquea.
  useEffect(() => {
    if (!seguir || estado === 'preparando' || estado === 'imprimiendo') return
    // Con ticket se espera un poco más para que alcance a verlo.
    const t = setTimeout(() => window.location.assign(whatsappUrl), REDIRECT_MS[modalidad] + (ticket ? 1800 : 0))
    return () => clearTimeout(t)
  }, [whatsappUrl, modalidad, estado, seguir, ticket])

  const mensaje =
    estado === 'imprimiendo'
      ? 'Imprimiendo tu ticket de reserva…'
      : estado === 'preparando'
        ? 'Descargando tu ticket de reserva…'
        : estado === 'listo'
          ? seguir
            ? 'Ticket descargado. Te llevamos a WhatsApp para enviar el resumen…'
            : 'Ticket descargado.'
          : seguir
            ? 'Te estamos llevando a WhatsApp para enviar el resumen…'
            : 'Cuando quieras, abre WhatsApp para enviar el resumen.'

  return (
    <div className={'flex min-h-dvh flex-col items-center px-6 text-center ' + (ticket ? 'py-10' : 'justify-center px-8')}>
      <motion.div
        className={'grid place-items-center rounded-full bg-rose ' + (ticket ? 'size-14' : 'size-24')}
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', duration: 0.6, bounce: 0.35 }}
      >
        <svg viewBox="0 0 24 24" className={ticket ? 'size-7' : 'size-11'} fill="none" aria-hidden>
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
        <h1 className={(ticket ? 'mt-5 text-[32px]' : 'mt-8 text-[38px]') + ' font-display leading-tight tracking-[-0.01em]'}>
          ¡Tu cita está reservada!
        </h1>
        <p className="mx-auto mt-3 max-w-[30ch] text-[15px] text-muted" role="status">
          {mensaje}
        </p>
        {modalidad === 'domicilio' && (
          <p className="mx-auto mt-4 max-w-[32ch] rounded-2xl bg-rose-soft px-4 py-3 text-[14px] text-ink">
            📍 No olvides enviar tu <b className="font-semibold">ubicación</b> en el chat para llegar a tu casa.
          </p>
        )}
      </motion.div>

      {ticket && (
        <div className="mt-8">
          <ImpresoraTicket datos={ticket} alTerminar={impreso} />
        </div>
      )}

      <motion.div
        className={(ticket ? 'mt-8' : 'mt-10') + ' w-full max-w-xs space-y-3'}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
      >
        <Button block onClick={() => window.location.assign(whatsappUrl)}>
          <IconWhatsApp size={19} /> Abrir WhatsApp
        </Button>
        {ticket && (
          <Button block variant="secondary" disabled={estado === 'imprimiendo'} onClick={() => { setSeguir(false); void bajar() }}>
            <IconDescarga /> {estado === 'error' ? 'Reintentar ticket' : 'Descargar ticket'}
          </Button>
        )}
        {ticket && compartible && (
          <Button block variant="secondary" disabled={estado === 'imprimiendo'} onClick={() => void compartir()}>
            <IconCompartir /> Compartir ticket
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


function IconCompartir() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 15V3M7 8l5-5 5 5M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" />
    </svg>
  )
}
