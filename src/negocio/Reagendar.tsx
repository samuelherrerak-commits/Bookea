import { useEffect, useMemo, useState } from 'react'
import { BottomSheet } from '../components/ui/BottomSheet'
import { capitalize, formatLongDate, formatMonthShort, formatTime12, formatWeekdayShort } from '../lib/format'
import * as api from './api'

/**
 * Reagendar una cita desde Mi negocio (el cliente no puede ir): se elige otro día, una de las
 * horas libres (o otra a mano) y, con equipo, otra persona. Al moverla se ofrece avisarle al
 * cliente por WhatsApp con el mensaje listo.
 */

const DIAS_A_LA_VISTA = 45

function sumarDias(ymd: string, n: number) {
  const [y, m, d] = ymd.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10)
}

/** El mensaje para el cliente con la cita nueva. */
export function mensajeReagendada(p: { cliente: string; negocio: string; servicios: string; fecha: string; hora: string; persona?: string }) {
  const nombre = p.cliente.trim().split(/\s+/)[0] || ''
  const cuando = `${formatLongDate(p.fecha)} a las ${formatTime12(p.hora)}${p.persona ? ` con ${p.persona.split(/\s+/)[0]}` : ''}`
  // "9:00 a. m." ya termina en punto.
  return `Hola${nombre ? ' ' + nombre : ''}, te escribimos de ${p.negocio}. Tu cita de ${p.servicios} quedó para el ${cuando}${cuando.endsWith('.') ? '' : '.'} ¿Te queda bien?`
}

export function Reagendar({ cita, hoy, negocio, sesion, slug, whatsapp, onCerrar, onMovida, alSalir }: {
  cita: api.Cita | null
  hoy: string
  negocio: string
  sesion: string
  slug: string
  /** Teléfono del cliente para wa.me ("58412…"). */
  whatsapp: string
  onCerrar: () => void
  onMovida: (c: NonNullable<api.Reagendado['cita']>) => void
  alSalir: () => void
}) {
  const [fecha, setFecha] = useState('')
  const [persona, setPersona] = useState<string | undefined>(undefined)
  const [opciones, setOpciones] = useState<api.HorasReagendar | null>(null)
  const [hora, setHora] = useState('')
  const [otra, setOtra] = useState(false)
  const [estado, setEstado] = useState<'eligiendo' | 'moviendo' | 'aviso' | 'lista'>('eligiendo')
  const [mensaje, setMensaje] = useState('')
  const [movida, setMovida] = useState<NonNullable<api.Reagendado['cita']> | null>(null)

  // Cada vez que se abre con otra cita, se arranca de cero en su mismo día (o hoy si ya pasó).
  useEffect(() => {
    if (!cita) return
    setFecha(cita.fecha >= hoy ? cita.fecha : hoy)
    setPersona(undefined)
    setHora('')
    setOtra(false)
    setEstado('eligiendo')
    setMensaje('')
    setMovida(null)
  }, [cita, hoy])

  useEffect(() => {
    if (!cita || !fecha) return
    let vivo = true
    setOpciones(null)
    setHora('')
    api.horasReagendar(sesion, slug, cita.id, fecha, persona).then(
      (o) => vivo && setOpciones(o),
      (e) => {
        if (!vivo) return
        if (e instanceof api.ErrorNegocio && e.codigo === 'sesion') alSalir()
        else setMensaje((e as Error).message)
      },
    )
    return () => {
      vivo = false
    }
  }, [cita, fecha, persona, sesion, slug, alSalir])

  const dias = useMemo(() => Array.from({ length: DIAS_A_LA_VISTA }, (_, i) => sumarDias(hoy, i)), [hoy])
  const personaActual = persona ?? cita?.profesionalId ?? ''
  const nombrePersona = opciones?.personas.find((p) => p.id === personaActual)?.nombre ?? cita?.profesional ?? ''
  const mismaHora = cita && fecha === cita.fecha && hora === cita.hora && personaActual === (cita.profesionalId ?? '')

  const mover = async (forzar = false) => {
    if (!cita || !hora) return
    setEstado('moviendo')
    setMensaje('')
    try {
      const r = await api.reagendar(sesion, slug, { id: cita.id, fecha, hora, ...(persona !== undefined ? { persona } : {}), forzar })
      if (r.ok && r.cita) {
        setMovida(r.cita)
        onMovida(r.cita)
        setEstado('lista')
      } else {
        setMensaje(r.mensaje || 'No se pudo mover la cita.')
        setEstado(r.puedeForzar ? 'aviso' : 'eligiendo')
      }
    } catch (e) {
      if (e instanceof api.ErrorNegocio && e.codigo === 'sesion') return alSalir()
      setMensaje((e as Error).message)
      setEstado('eligiendo')
    }
  }

  const etiquetaDia = (d: string) => (d === hoy ? 'Hoy' : d === sumarDias(hoy, 1) ? 'Mañana' : capitalize(formatWeekdayShort(d)))
  const textoWa = movida && cita
    ? mensajeReagendada({ cliente: cita.cliente, negocio, servicios: cita.servicios, fecha: movida.fecha, hora: movida.hora, persona: movida.profesional })
    : ''

  return (
    <BottomSheet
      open={!!cita}
      onClose={onCerrar}
      title={estado === 'lista' ? 'Cita movida' : 'Reagendar'}
      footer={
        cita && estado !== 'lista' ? (
          <div className="space-y-2">
            {estado === 'aviso' ? (
              <>
                <p role="alert" className="rounded-2xl bg-sand px-4 py-3 text-[14px]">⚠️ {mensaje} ¿La mueves igual?</p>
                <button type="button" onClick={() => void mover(true)}
                  className="w-full rounded-full bg-ink px-5 py-3.5 text-[16px] font-semibold text-bg">Moverla igual</button>
                <button type="button" onClick={() => { setEstado('eligiendo'); setMensaje('') }}
                  className="w-full rounded-full px-5 py-3 text-[15px] font-semibold ring-1 ring-line">Elegir otra hora</button>
              </>
            ) : (
              <button type="button" disabled={!hora || estado === 'moviendo' || !!mismaHora} onClick={() => void mover()}
                className="w-full rounded-full bg-ink px-5 py-3.5 text-[16px] font-semibold text-bg shadow-float disabled:bg-sand disabled:text-muted disabled:shadow-none">
                {estado === 'moviendo' ? 'Moviendo…' : hora ? `Mover al ${formatLongDate(fecha).replace(/^\S+\s/, '')} · ${formatTime12(hora)}` : 'Elige la hora nueva'}
              </button>
            )}
          </div>
        ) : undefined
      }
    >
      {cita && estado === 'lista' && movida && (
        <div className="pb-6">
          <p className="rounded-2xl bg-sand px-4 py-3 text-[15px]">
            ✓ <b>{cita.cliente}</b> quedó para el <b>{formatLongDate(movida.fecha)}</b> a las <b>{formatTime12(movida.hora)}</b>
            {movida.profesional ? <> con <b>{movida.profesional.split(/\s+/)[0]}</b></> : null}. Ya está en el calendario.
          </p>
          {whatsapp && (
            <a href={`https://wa.me/${whatsapp}?text=${encodeURIComponent(textoWa)}`} target="_blank" rel="noopener noreferrer"
              className="mt-4 block w-full rounded-full bg-ink px-5 py-3.5 text-center text-[16px] font-semibold text-bg">
              Avisarle por WhatsApp
            </a>
          )}
          <p className="mt-2 text-[13px] text-muted">“{textoWa}”</p>
          <button type="button" onClick={onCerrar} className="mt-4 w-full rounded-full px-5 py-3 text-[15px] font-semibold ring-1 ring-line">Listo</button>
        </div>
      )}

      {cita && estado !== 'lista' && (
        <div className="space-y-5 pb-4">
          <div className="rounded-2xl bg-sand px-4 py-3 text-[14px]">
            <p className="font-semibold">{cita.cliente} · {cita.servicios}</p>
            <p className="text-muted">
              Ahora: {formatLongDate(cita.fecha)} · {formatTime12(cita.hora)}{cita.profesional ? ` · con ${cita.profesional.split(/\s+/)[0]}` : ''}
              {opciones ? ` · ${opciones.duracion} min` : ''}
            </p>
          </div>

          {opciones && opciones.personas.length > 1 && (
            <div>
              <p className="text-[14px] font-semibold">Con quién</p>
              <div className="-mx-5 mt-2 flex gap-2 overflow-x-auto px-5 pb-1 no-scrollbar" role="radiogroup" aria-label="Con quién">
                {opciones.personas.map((p) => (
                  <button key={p.id} type="button" role="radio" aria-checked={personaActual === p.id} onClick={() => setPersona(p.id === (cita.profesionalId ?? '') ? undefined : p.id)}
                    className={'shrink-0 rounded-full px-3.5 py-1.5 text-[14px] ring-1 ' + (personaActual === p.id ? 'bg-ink text-bg ring-ink' : 'ring-line')}>
                    {p.nombre.split(/\s+/)[0]}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <p className="text-[14px] font-semibold">Día</p>
            <div className="relative -mx-5 mt-2 flex gap-2 overflow-x-auto px-5 pb-1 no-scrollbar" role="radiogroup" aria-label="Día">
              {dias.map((d) => (
                <button key={d} type="button" role="radio" aria-checked={fecha === d} onClick={() => setFecha(d)}
                  className={'w-[64px] shrink-0 rounded-2xl px-2 py-2 text-center ring-1 ' + (fecha === d ? 'bg-ink text-bg ring-ink' : 'ring-line')}>
                  <span className="block text-[12px] opacity-80">{etiquetaDia(d)}</span>
                  <span className="block text-[20px] font-semibold leading-tight tabular-nums">{Number(d.slice(8))}</span>
                  <span className="block text-[11px] opacity-70">{formatMonthShort(d)}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-[14px] font-semibold">
              Hora{nombrePersona && opciones && opciones.personas.length > 1 ? ` libre de ${nombrePersona.split(/\s+/)[0]}` : ' libre'}
            </p>
            {!opciones && !mensaje && <div className="mt-2 h-24 animate-pulse rounded-2xl bg-sand" aria-busy="true" aria-label="Buscando horas libres" />}
            {opciones && (
              opciones.horas.length ? (
                <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4" role="radiogroup" aria-label="Hora">
                  {opciones.horas.map((h) => (
                    <button key={h} type="button" role="radio" aria-checked={!otra && hora === h} onClick={() => { setOtra(false); setHora(h); setEstado('eligiendo'); setMensaje('') }}
                      className={'rounded-full px-2 py-2.5 text-[14px] tabular-nums ring-1 ' + (!otra && hora === h ? 'bg-ink text-bg ring-ink' : 'ring-line')}>
                      {formatTime12(h)}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-[14px] text-muted">{opciones.trabaja ? 'No quedan horas libres ese día.' : 'Ese día no se trabaja.'} Elige otro día o pon otra hora.</p>
              )
            )}
            <button type="button" onClick={() => { setOtra(!otra); setHora(''); setEstado('eligiendo'); setMensaje('') }}
              className="mt-3 text-[14px] text-muted underline underline-offset-4">
              {otra ? 'Ver las horas libres' : 'Otra hora'}
            </button>
            {otra && (
              <label className="mt-2 block">
                <span className="sr-only">Hora nueva</span>
                <input type="time" step={300} value={hora} onChange={(e) => { setHora(e.target.value); setEstado('eligiendo'); setMensaje('') }}
                  className="w-full rounded-2xl bg-surface px-3.5 py-3 text-[16px] ring-1 ring-line outline-none focus:ring-2 focus:ring-ink" />
              </label>
            )}
          </div>

          {mensaje && estado !== 'aviso' && (
            <p role="alert" className="rounded-2xl bg-danger/10 px-4 py-3 text-[14px] text-danger">{mensaje}</p>
          )}
        </div>
      )}
    </BottomSheet>
  )
}
