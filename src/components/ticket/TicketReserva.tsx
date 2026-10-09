import '@fontsource/chivo-mono/400.css'
import '@fontsource/chivo-mono/700.css'
import { useEffect, useRef } from 'react'
import './ticket.css'
import { barras, filasTicket, textoTicket, type DatosTicket, type FilaTicket } from '../../lib/ticket'

/**
 * Ticket de reserva en papel térmico que sale de una impresora (como los cupones de
 * Copa Prosein). Movimiento:
 *  - solo transform y opacity;
 *  - el papel avanza renglón por renglón como una impresora térmica (ease-out corto por línea);
 *  - al cortar, el papel cae unos píxeles y se asienta;
 *  - el sello entra con escala y rotación, como un sello de goma;
 *  - con prefers-reduced-motion, sin impresión: el ticket aparece con un fundido.
 */
const EASE_OUT = 'cubic-bezier(0.23, 1, 0.32, 1)'
const EASE_IN_OUT = 'cubic-bezier(0.77, 0, 0.175, 1)'

const reducirMovimiento = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

async function animar(el: HTMLElement, cuadros: Keyframe[], opciones: KeyframeAnimationOptions) {
  const ultimo = cuadros[cuadros.length - 1]
  if (el.animate) {
    const a = el.animate(cuadros, { fill: 'forwards', ...opciones })
    try {
      await a.finished
    } catch {
      return
    }
    a.cancel()
  }
  if (ultimo.transform !== undefined) el.style.transform = String(ultimo.transform)
  if (ultimo.opacity !== undefined) el.style.opacity = String(ultimo.opacity)
}

function vibrar(patron: number | number[]) {
  try {
    navigator.vibrate?.(patron)
  } catch {
    /* sin acción */
  }
}

/** Imprime el ticket: papel renglón por renglón, corte y sello. */
async function imprimir(maquina: HTMLElement, ticket: HTMLElement) {
  const sello = ticket.querySelector<HTMLElement>('[data-sello]')
  if (reducirMovimiento()) {
    ;[maquina, ticket].forEach((el) => {
      el.style.opacity = '1'
      el.animate?.([{ opacity: 0 }, { opacity: 1 }], { duration: 200, easing: 'ease' })
    })
    if (sello) sello.style.opacity = '1'
    return
  }
  await animar(maquina, [{ opacity: 0, transform: 'translateY(-14px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 250, easing: EASE_OUT })
  vibrar([8, 50, 8, 50, 8])
  const alto = ticket.offsetHeight
  const cimas = [...ticket.querySelectorAll<HTMLElement>('[data-l]')].map((l) => l.offsetTop)
  const pasos = [-alto, ...cimas.reverse().map((t) => -t), 0]
  ticket.style.opacity = '1'
  await animar(
    ticket,
    pasos.map((y, i) => ({ transform: `translateY(${y}px)`, offset: i / (pasos.length - 1), easing: EASE_OUT })),
    { duration: Math.min(1400, 40 * pasos.length) },
  )
  await animar(ticket, [
    { transform: 'translateY(0)', easing: EASE_OUT },
    { transform: 'translateY(7px)', offset: 0.35, easing: EASE_IN_OUT },
    { transform: 'translateY(0)' },
  ], { duration: 280 })
  if (!sello) return
  vibrar(14)
  await Promise.all([
    animar(sello, [
      { opacity: 0, transform: 'rotate(-16deg) scale(1.7)' },
      { opacity: 1, transform: 'rotate(-6deg) scale(0.94)', offset: 0.65 },
      { opacity: 1, transform: 'rotate(-7deg) scale(1)' },
    ], { duration: 320, easing: EASE_OUT }),
    animar(ticket, [
      { transform: 'translateY(0) scale(1)' },
      { transform: 'translateY(1.5px) scale(0.992)', offset: 0.7 },
      { transform: 'translateY(0) scale(1)' },
    ], { duration: 260, delay: 140, easing: EASE_OUT }),
  ])
}

function Fila({ f }: { f: FilaTicket }) {
  switch (f.t) {
    case 'marca':
      return <div className="ticket__marca" data-l>{f.texto}</div>
    case 'sub':
      return <div className="ticket__sub" data-l>{f.texto}</div>
    case 'leyenda':
      return <div className="ticket__leyenda" data-l>{f.texto}</div>
    case 'corte':
      return <hr className="ticket__corte" data-l />
    case 'fila':
      return (
        <div className={'ticket__fila' + (f.fuerte ? ' ticket__fila--fuerte' : '')} data-l>
          <span>{f.a}</span>
          <span>{f.b}</span>
        </div>
      )
    case 'texto':
      return <div className="ticket__texto" data-l>{f.texto}</div>
    case 'sello':
      return (
        <div className="ticket__cupon" data-l>
          <div className="sello" data-sello>
            <small>{f.arriba}</small>
            <strong>{f.abajo}</strong>
          </div>
        </div>
      )
    case 'barras':
      return (
        <div className="ticket__barras" data-l>
          <svg viewBox="0 0 200 40" preserveAspectRatio="none" aria-hidden>
            {barras(f.semilla).map(([x, w]) => (
              <rect key={x} x={x} y={0} width={w} height={40} fill="currentColor" />
            ))}
          </svg>
          <span className="ticket__codigo">{f.codigo}</span>
        </div>
      )
    case 'gracias':
      return <div className="ticket__gracias" data-l>{f.texto}</div>
  }
}

/** El ticket solo (sin impresora): para la vista previa y para volver a verlo. */
export function Ticket({ datos }: { datos: DatosTicket }) {
  return (
    <div className="ticket sombra-papel" role="img" aria-label={textoTicket(datos)} style={{ ['--sello' as string]: datos.color }}>
      <div className="papel">
        {filasTicket(datos).map((f, i) => (
          <Fila key={i} f={f} />
        ))}
      </div>
    </div>
  )
}

/** El ticket saliendo de la impresora. `alTerminar` se llama cuando el sello ya cayó. */
export function ImpresoraTicket({ datos, alTerminar }: { datos: DatosTicket; alTerminar?: () => void }) {
  const maquina = useRef<HTMLDivElement>(null)
  const salida = useRef<HTMLDivElement>(null)
  const avisar = useRef(alTerminar)
  avisar.current = alTerminar

  useEffect(() => {
    const ticket = salida.current?.querySelector<HTMLElement>('.ticket')
    if (!maquina.current || !ticket) return
    let vivo = true
    // Las fuentes del papel primero: si no, los renglones cambian de alto en plena impresión.
    const fuentes = document.fonts?.ready ?? Promise.resolve()
    Promise.race([fuentes, new Promise((r) => setTimeout(r, 800))])
      .then(() => (vivo ? imprimir(maquina.current!, ticket) : undefined))
      .catch(() => {
        ticket.style.opacity = '1'
      })
      .finally(() => vivo && avisar.current?.())
    return () => {
      vivo = false
    }
  }, [])

  return (
    <div className="impresora">
      <div className="impresora__maquina" ref={maquina} aria-hidden />
      <div className="impresora__salida" ref={salida}>
        <Ticket datos={datos} />
      </div>
    </div>
  )
}
