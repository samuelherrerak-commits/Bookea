import { useEffect, useState } from 'react'
import { capitalize, formatLongDate, formatTime12 } from '../lib/format'
import * as api from './api'

/**
 * bookeaa team: una persona del equipo bloquea sus días u horas (vacaciones, una cita
 * médica). Cada bloqueo es un evento en su calendario de bookeaa: la página deja de
 * ofrecer esas horas con ella, y lo ve también en su Google Calendar.
 */

const claseInput = 'w-full min-w-0 rounded-2xl bg-surface px-3.5 py-3 text-[16px] ring-1 ring-line outline-none focus:ring-2 focus:ring-ink'

export function MisBloqueos({ sesion, slug, persona = '', alSalir }: { sesion: string; slug: string; persona?: string; alSalir: () => void }) {
  const [lista, setLista] = useState<api.BloqueoPersona[] | null>(null)
  const [error, setError] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const [nuevo, setNuevo] = useState({ fecha: api.hoyCaracas(), todoElDia: true, inicio: '09:00', fin: '12:00', motivo: '' })

  const hacer = async (accion: () => Promise<{ bloqueos: api.BloqueoPersona[] }>) => {
    setOcupado(true)
    setError('')
    try {
      setLista((await accion()).bloqueos)
      return true
    } catch (e) {
      if (e instanceof api.ErrorNegocio && e.codigo === 'sesion') alSalir()
      else setError((e as Error).message)
      return false
    } finally {
      setOcupado(false)
    }
  }

  useEffect(() => {
    setLista(null)
    void hacer(() => api.bloqueosPersona(sesion, slug, persona))
  }, [sesion, slug, persona])

  const agregar = async () => {
    const ok = await hacer(() =>
      api.bloquear(sesion, slug, { fecha: nuevo.fecha, inicio: nuevo.todoElDia ? '' : nuevo.inicio, fin: nuevo.todoElDia ? '' : nuevo.fin, motivo: nuevo.motivo.trim() }, persona),
    )
    if (ok) setNuevo((n) => ({ ...n, motivo: '' }))
  }

  return (
    <div className="mt-2 space-y-5">
      <div>
        <h2 className="font-display text-[28px] leading-tight">Mis bloqueos</h2>
        <p className="mt-1 text-[14px] text-muted">Los días u horas que no puedes atender. Nadie podrá reservar contigo en ese tiempo.</p>
      </div>

      {error && <p role="alert" className="rounded-2xl bg-danger/10 px-4 py-3 text-[14px] text-danger">{error}</p>}

      <section className="space-y-3 rounded-3xl bg-surface p-4 shadow-card ring-1 ring-line">
        <h3 className="text-[16px] font-semibold">Bloquear</h3>
        <label className="block">
          <span className="mb-1.5 block text-[14px] font-semibold">Día</span>
          <input type="date" min={api.hoyCaracas()} value={nuevo.fecha} onChange={(e) => setNuevo({ ...nuevo, fecha: e.target.value })} className={claseInput} />
        </label>
        <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Cuánto tiempo">
          {[true, false].map((v) => (
            <button key={String(v)} type="button" role="radio" aria-checked={nuevo.todoElDia === v} onClick={() => setNuevo({ ...nuevo, todoElDia: v })}
              className={'rounded-2xl px-3 py-3 text-[14px] font-semibold ring-1 ' + (nuevo.todoElDia === v ? 'bg-ink text-bg ring-ink' : 'ring-line')}>
              {v ? 'Todo el día' : 'Unas horas'}
            </button>
          ))}
        </div>
        {!nuevo.todoElDia && (
          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              <span className="mb-1.5 block text-[14px] font-semibold">Desde</span>
              <input type="time" step={900} value={nuevo.inicio} onChange={(e) => setNuevo({ ...nuevo, inicio: e.target.value })} className={claseInput} />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[14px] font-semibold">Hasta</span>
              <input type="time" step={900} value={nuevo.fin} onChange={(e) => setNuevo({ ...nuevo, fin: e.target.value })} className={claseInput} />
            </label>
          </div>
        )}
        <label className="block">
          <span className="mb-1.5 block text-[14px] font-semibold">Motivo (opcional)</span>
          <input value={nuevo.motivo} maxLength={80} placeholder="Vacaciones, cita médica…" onChange={(e) => setNuevo({ ...nuevo, motivo: e.target.value })} className={claseInput} />
        </label>
        <button type="button" disabled={ocupado || !nuevo.fecha} onClick={() => void agregar()} className="w-full rounded-full bg-ink px-5 py-3.5 text-[15px] font-semibold text-bg disabled:opacity-50">
          {ocupado ? 'Guardando…' : 'Bloquear'}
        </button>
      </section>

      <section>
        <h3 className="text-[13px] font-semibold uppercase tracking-[0.12em] text-muted">Próximos</h3>
        {!lista ? (
          <div className="mt-2 h-24 animate-pulse rounded-3xl bg-sand" aria-busy="true" />
        ) : lista.length === 0 ? (
          <p className="mt-2 rounded-3xl bg-surface px-4 py-5 text-center text-[15px] text-muted ring-1 ring-line">No tienes bloqueos. Todas tus horas están disponibles.</p>
        ) : (
          <ul className="mt-2 divide-y divide-line overflow-hidden rounded-3xl bg-surface ring-1 ring-line">
            {lista.map((b) => (
              <li key={b.id} className="flex items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] font-semibold">{capitalize(formatLongDate(b.fecha))}</p>
                  <p className="truncate text-[13px] text-muted">
                    {b.todoElDia ? 'Todo el día' : `${formatTime12(b.inicio)} – ${formatTime12(b.fin)}`} · {b.motivo}
                  </p>
                </div>
                <button type="button" disabled={ocupado} onClick={() => void hacer(() => api.desbloquear(sesion, slug, b.id, persona))}
                  className="shrink-0 rounded-full px-3 py-1.5 text-[13px] font-semibold text-danger ring-1 ring-danger/40 disabled:opacity-50">
                  Quitar
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
