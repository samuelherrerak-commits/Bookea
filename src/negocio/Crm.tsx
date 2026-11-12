import { useEffect, useMemo, useState } from 'react'
import { BottomSheet } from '../components/ui/BottomSheet'
import { Cifra } from '../central/graficos'
import { capitalize, formatLongDate, formatTime12 } from '../lib/format'
import { formatMonto } from '../lib/ticket'
import * as api from './api'

/**
 * CRM de Mi negocio (dentro del Panel): los clientes agrupados por teléfono, con quién es fiel,
 * quién es nuevo y a quién le toca volver; la ficha de cada uno con su historia; y el historial
 * de citas mes a mes. Todo sale de las reservas del negocio.
 */

type Props = { sesion: string; slug: string; alSalir: () => void }

const SEGMENTOS: Record<api.SegmentoCliente, { nombre: string; clase: string }> = {
  frecuente: { nombre: 'Frecuente', clase: 'bg-ink text-bg' },
  por_volver: { nombre: 'Por volver', clase: 'bg-danger/15 text-danger' },
  nuevo: { nombre: 'Nuevo', clase: 'bg-ok/15 text-ok' },
  inactivo: { nombre: 'Inactivo', clase: 'bg-sand text-muted' },
  ocasional: { nombre: 'Ocasional', clase: 'bg-sand text-ink' },
}

const FILTROS: [string, string][] = [['todos', 'Todos'], ['frecuente', 'Frecuentes'], ['nuevo', 'Nuevos'], ['por_volver', 'Por volver'], ['inactivo', 'Inactivos']]

/** "0412 555 1234" → "584125551234" para wa.me. */
const wa = (tel: string) => {
  const d = tel.replace(/\D/g, '')
  return d.startsWith('0') ? '58' + d.slice(1) : d.length === 10 ? '58' + d : d
}

const haceDias = (n: number | null) => (n === null ? '' : n === 0 ? 'hoy' : n === 1 ? 'ayer' : n < 0 ? `en ${-n} días` : n < 60 ? `hace ${n} días` : `hace ${Math.round(n / 30)} meses`)

/** Mensaje de WhatsApp según cómo va el cliente: a quien le toca volver se le invita a reservar. */
export function mensajeCliente(c: api.Cliente, negocio: string, link: string) {
  const nombre = c.nombre.trim().split(/\s+/)[0]
  const servicio = c.servicios[0]?.nombre
  if (c.segmento === 'por_volver' || c.segmento === 'inactivo') {
    return `Hola ${nombre}, te escribimos de ${negocio}. ${servicio ? `Ya te va tocando tu ${servicio.toLowerCase()}. ` : ''}¿Te apartamos un espacio? Reserva aquí en 1 minuto: ${link}`
  }
  return `Hola ${nombre}, te escribimos de ${negocio}. `
}

const busca = (q: string, ...campos: string[]) => {
  const n = (v: string) => v.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  const t = n(q.trim())
  const digitos = q.replace(/\D/g, '')
  return !t || campos.some((c) => n(c).includes(t)) || (digitos.length >= 3 && campos.some((c) => c.replace(/\D/g, '').includes(digitos)))
}

function Aviso({ e }: { e: string }) {
  return <p role="alert" className="rounded-2xl bg-danger/10 px-4 py-3 text-[14px] text-danger">{e}</p>
}

function useCarga<T>(pedir: () => Promise<T>, deps: unknown[], alSalir: () => void) {
  const [datos, setDatos] = useState<T | null>(null)
  const [error, setError] = useState('')
  useEffect(() => {
    let vivo = true
    setDatos(null)
    setError('')
    pedir().then(
      (d) => vivo && setDatos(d),
      (e) => {
        if (!vivo) return
        if (e instanceof api.ErrorNegocio && e.codigo === 'sesion') alSalir()
        else setError((e as Error).message)
      },
    )
    return () => {
      vivo = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
  return { datos, error }
}

// ---------- Clientes ----------

export function Clientes({ sesion, slug, alSalir, negocio }: Props & { negocio: string }) {
  const { datos, error } = useCarga(() => api.clientes(sesion, slug), [sesion, slug], alSalir)
  const [filtro, setFiltro] = useState('todos')
  const [q, setQ] = useState('')
  const [ver, setVer] = useState(40)
  const [abierto, setAbierto] = useState<string | null>(null)

  const lista = useMemo(() => {
    if (!datos) return []
    return datos.clientes.filter((c) => (filtro === 'todos' || (filtro === 'frecuente' ? c.frecuente : c.segmento === filtro)) && busca(q, c.nombre, c.telefono))
  }, [datos, filtro, q])

  if (error) return <Aviso e={error} />
  if (!datos) return <div className="h-[520px] animate-pulse rounded-3xl bg-sand" aria-busy="true" aria-label="Cargando clientes" />
  const t = datos.totales
  const cuenta: Record<string, number> = { todos: t.clientes, frecuente: t.frecuentes, nuevo: t.nuevos, por_volver: t.porVolver, inactivo: t.inactivos }
  const dinero = (n: number) => formatMonto(n, datos.moneda)

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Cifra etiqueta="Clientes" valor={t.clientes} pie={`${t.nuevos} nuevos en 30 días`} />
        <Cifra etiqueta="Frecuentes" valor={t.frecuentes} pie="3 visitas o más" />
        <Cifra etiqueta="Por volver" valor={t.porVolver} pie="Ya les toca y no han reservado" />
        <Cifra etiqueta="Vuelven" valor={`${t.regresan} %`} pie="De cada 100 que vienen, vuelven" />
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 no-scrollbar lg:mx-0 lg:px-0" role="group" aria-label="Filtrar clientes">
          {FILTROS.map(([id, nombre]) => (
            <button key={id} type="button" aria-pressed={filtro === id} onClick={() => { setFiltro(id); setVer(40) }}
              className={'shrink-0 rounded-full px-3.5 py-1.5 text-[14px] ring-1 ' + (filtro === id ? 'bg-ink text-bg ring-ink' : 'ring-line')}>
              {nombre} <span className="opacity-60">{cuenta[id]}</span>
            </button>
          ))}
        </div>
        <label className="block lg:ml-auto lg:w-72">
          <span className="sr-only">Buscar cliente</span>
          <input value={q} onChange={(e) => { setQ(e.target.value); setVer(40) }} placeholder="Buscar por nombre o teléfono" inputMode="search"
            className="w-full rounded-full bg-surface px-4 py-2.5 text-[15px] ring-1 ring-line outline-none focus:ring-2 focus:ring-ink" />
        </label>
      </div>

      {filtro === 'por_volver' && lista.length > 0 && (
        <p className="rounded-2xl bg-sand px-4 py-3 text-[14px]">💡 Estos clientes suelen volver y ya pasó su tiempo. Escríbeles por WhatsApp: el mensaje ya trae el link para reservar.</p>
      )}

      {lista.length === 0 ? (
        <p className="py-10 text-center text-[15px] text-muted">{datos.clientes.length ? 'Nadie con ese filtro.' : 'Todavía no hay clientes: aparecen con la primera reserva.'}</p>
      ) : (
        <ul className="grid gap-3 lg:grid-cols-2">
          {lista.slice(0, ver).map((c) => (
            <li key={c.clave} className="flex items-center gap-3 rounded-3xl bg-surface p-4 shadow-card ring-1 ring-line">
              <button type="button" onClick={() => setAbierto(c.clave)} className="min-w-0 flex-1 text-left">
                <span className="flex items-center gap-2">
                  <span className="truncate text-[16px] font-semibold">{c.nombre}</span>
                  <span className={'shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.04em] ' + SEGMENTOS[c.segmento].clase}>{SEGMENTOS[c.segmento].nombre}</span>
                </span>
                <span className="mt-0.5 block truncate text-[13px] text-muted">
                  {c.visitas} {c.visitas === 1 ? 'visita' : 'visitas'} · {dinero(c.gastado)}{c.cadaDias ? ` · cada ${c.cadaDias} días` : ''}
                </span>
                <span className="block truncate text-[13px] text-muted">
                  {c.proxima ? `Próxima: ${formatLongDate(c.proxima.slice(0, 10))}` : c.ultima ? `Última: ${haceDias(c.sinVenir)}` : 'Aún no viene'}
                  {c.servicios[0] ? ` · ${c.servicios[0].nombre}` : ''}
                </span>
              </button>
              {c.telefono && (
                <a href={`https://wa.me/${wa(c.telefono)}?text=${encodeURIComponent(mensajeCliente(c, negocio, `${location.origin}/u/${slug}`))}`} target="_blank" rel="noopener noreferrer"
                  aria-label={`Escribir a ${c.nombre} por WhatsApp`} className="grid size-11 shrink-0 place-items-center rounded-full bg-sand">
                  <IconoWa />
                </a>
              )}
            </li>
          ))}
        </ul>
      )}
      {lista.length > ver && (
        <button type="button" onClick={() => setVer(ver + 40)} className="w-full rounded-full px-5 py-3 text-[15px] font-semibold ring-1 ring-line">
          Ver más ({lista.length - ver})
        </button>
      )}

      <Ficha clave={abierto} sesion={sesion} slug={slug} negocio={negocio} alSalir={alSalir} onCerrar={() => setAbierto(null)} />
    </div>
  )
}

// ---------- Ficha de un cliente ----------

const ESTADO: (c: api.Cita, hoy: string) => { texto: string; clase: string } = (c, hoy) =>
  /cancel/i.test(c.estado) ? { texto: 'Cancelada', clase: 'text-danger' }
    : /verificar/i.test(c.estado) ? { texto: 'Pago por verificar', clase: 'text-ink' }
      : c.fecha > hoy ? { texto: 'Agendada', clase: 'text-ink' } : { texto: 'Atendida', clase: 'text-muted' }

export function Ficha({ clave, sesion, slug, negocio, alSalir, onCerrar }: Props & { clave: string | null; negocio: string; onCerrar: () => void }) {
  const [datos, setDatos] = useState<api.FichaCliente | null>(null)
  const [error, setError] = useState('')
  useEffect(() => {
    if (!clave) return
    let vivo = true
    setDatos(null)
    setError('')
    api.fichaCliente(sesion, slug, clave).then(
      (d) => vivo && setDatos(d),
      (e) => {
        if (!vivo) return
        if (e instanceof api.ErrorNegocio && e.codigo === 'sesion') alSalir()
        else setError((e as Error).message)
      },
    )
    return () => {
      vivo = false
    }
  }, [clave, sesion, slug, alSalir])

  const c = datos?.cliente
  const dinero = (n: number) => formatMonto(n, datos?.moneda ?? 'USD')
  return (
    <BottomSheet open={!!clave} onClose={onCerrar} title={c ? c.nombre.split(/\s+/).slice(0, 2).join(' ') : 'Cliente'}>
      <div className="space-y-4 pb-6">
        {error && <Aviso e={error} />}
        {!c && !error && <div className="h-64 animate-pulse rounded-2xl bg-sand" aria-busy="true" />}
        {c && datos && (
          <>
            <p className="flex flex-wrap items-center gap-2 text-[14px] text-muted">
              <span className={'rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.04em] ' + SEGMENTOS[c.segmento].clase}>{SEGMENTOS[c.segmento].nombre}</span>
              {c.telefono} · cliente desde {formatLongDate(c.primera).replace(/^\S+\s/, '')}
            </p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {[
                ['Visitas', String(c.visitas)],
                ['Ha gastado', dinero(c.gastado)],
                ['Viene cada', c.cadaDias ? `${c.cadaDias} días` : '—'],
                ['Última visita', c.ultima ? capitalize(haceDias(c.sinVenir)) : '—'],
                ['Próxima cita', c.proxima ? `${formatLongDate(c.proxima.slice(0, 10)).replace(/^\S+\s/, '')} · ${formatTime12(c.proxima.slice(11))}` : 'Sin cita'],
                ['Canceladas', String(c.canceladas)],
              ].map(([k, v]) => (
                <div key={k} className="rounded-2xl bg-sand px-3 py-2.5">
                  <p className="text-[12px] text-muted">{k}</p>
                  <p className="truncate text-[15px] font-semibold">{v}</p>
                </div>
              ))}
            </div>
            {(c.servicios.length > 0 || c.persona) && (
              <p className="text-[14px]">
                {c.servicios.length > 0 && <>Se hace: <b>{c.servicios.map((s) => `${s.nombre} (${s.n})`).join(', ')}</b>. </>}
                {c.persona && <>Lo atiende casi siempre <b>{c.persona.split(/\s+/)[0]}</b>.</>}
              </p>
            )}
            {c.telefono && (
              <a href={`https://wa.me/${wa(c.telefono)}?text=${encodeURIComponent(mensajeCliente(c, negocio, `${location.origin}/u/${slug}`))}`} target="_blank" rel="noopener noreferrer"
                className="flex w-full items-center justify-center gap-2 rounded-full bg-ink px-5 py-3.5 text-[16px] font-semibold text-bg">
                <IconoWa /> {c.segmento === 'por_volver' || c.segmento === 'inactivo' ? 'Invitarlo a volver' : 'Escribirle por WhatsApp'}
              </a>
            )}
            <div>
              <h3 className="text-[13px] font-semibold uppercase tracking-[0.12em] text-muted">Su historia ({datos.citas.length})</h3>
              <ol className="mt-2 space-y-2">
                {datos.citas.map((x) => {
                  const e = ESTADO(x, datos.hoy)
                  return (
                    <li key={x.id} className="rounded-2xl px-4 py-3 ring-1 ring-line">
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="text-[14px] font-semibold">{capitalize(formatLongDate(x.fecha))} · {formatTime12(x.hora)}</span>
                        <span className={'shrink-0 text-[13px] font-semibold ' + e.clase}>{e.texto}</span>
                      </div>
                      <p className="text-[14px] text-muted">
                        {x.servicios} · {dinero(x.total)}{x.profesional ? ` · con ${x.profesional.split(/\s+/)[0]}` : ''} · {x.metodo}
                      </p>
                      {x.motivo && <p className="text-[13px] text-muted">Motivo: {x.motivo}</p>}
                      {x.reagendada && <p className="text-[13px] text-muted">🔁 Reagendada (antes {x.reagendada})</p>}
                    </li>
                  )
                })}
              </ol>
            </div>
          </>
        )}
      </div>
    </BottomSheet>
  )
}

// ---------- Historial ----------

const nombreMes = (m: string) => capitalize(new Intl.DateTimeFormat('es-VE', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(m + '-15T12:00:00Z')))
const mesMas = (m: string, n: number) => new Date(Date.UTC(Number(m.slice(0, 4)), Number(m.slice(5, 7)) - 1 + n, 1)).toISOString().slice(0, 7)

/** El mes en CSV (se abre en Excel o Google Sheets). */
export function csvHistorial(citas: api.Cita[], hoy: string) {
  const celda = (v: unknown) => {
    const t = String(v ?? '')
    return /[",;\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t
  }
  const filas = [['Fecha', 'Hora', 'Cliente', 'Teléfono', 'Servicios', 'Total', 'Pago', 'Estado', 'Atiende', 'Motivo']]
  for (const c of [...citas].sort((a, b) => (a.fecha + a.hora).localeCompare(b.fecha + b.hora))) {
    filas.push([c.fecha, c.hora, c.cliente, c.telefono, c.servicios, String(c.total), c.metodo, ESTADO(c, hoy).texto, c.profesional ?? '', c.motivo ?? ''])
  }
  return '﻿' + filas.map((f) => f.map(celda).join(',')).join('\n')
}

export function Historial({ sesion, slug, alSalir, negocio }: Props & { negocio: string }) {
  const [mes, setMes] = useState<string | undefined>(undefined)
  const { datos, error } = useCarga(() => api.historial(sesion, slug, mes), [sesion, slug, mes], alSalir)
  const [estado, setEstado] = useState('todas')
  const [persona, setPersona] = useState('')
  const [q, setQ] = useState('')
  const [abierto, setAbierto] = useState<string | null>(null)

  const personas = useMemo(() => [...new Set((datos?.citas ?? []).map((c) => c.profesional || '').filter(Boolean))].sort(), [datos])
  const lista = useMemo(() => {
    if (!datos) return []
    return datos.citas.filter((c) => {
      const e = ESTADO(c, datos.hoy).texto
      const okEstado = estado === 'todas' || (estado === 'atendidas' ? e === 'Atendida' : estado === 'canceladas' ? e === 'Cancelada' : e === 'Agendada' || e === 'Pago por verificar')
      return okEstado && (!persona || c.profesional === persona) && busca(q, c.cliente, c.telefono, c.servicios)
    })
  }, [datos, estado, persona, q])

  if (error) return <Aviso e={error} />
  if (!datos) return <div className="h-[520px] animate-pulse rounded-3xl bg-sand" aria-busy="true" aria-label="Cargando historial" />
  const dinero = (n: number) => formatMonto(n, datos.moneda)
  const validas = lista.filter((c) => !/cancel/i.test(c.estado))
  const porDia = lista.reduce((m, c) => m.set(c.fecha, [...(m.get(c.fecha) ?? []), c]), new Map<string, api.Cita[]>())
  const tope = datos.ultimoMes > datos.hoy.slice(0, 7) ? datos.ultimoMes : datos.hoy.slice(0, 7)

  const descargar = () => {
    const url = URL.createObjectURL(new Blob([csvHistorial(lista, datos.hoy)], { type: 'text/csv;charset=utf-8' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `${slug}-citas-${datos.mes}.csv`
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <button type="button" disabled={datos.mes <= datos.primerMes} onClick={() => setMes(mesMas(datos.mes, -1))} aria-label="Mes anterior"
          className="grid size-11 place-items-center rounded-full ring-1 ring-line disabled:opacity-30">‹</button>
        <p className="font-display text-[26px] leading-none">{nombreMes(datos.mes)}</p>
        <button type="button" disabled={datos.mes >= tope} onClick={() => setMes(mesMas(datos.mes, 1))} aria-label="Mes siguiente"
          className="grid size-11 place-items-center rounded-full ring-1 ring-line disabled:opacity-30">›</button>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 no-scrollbar lg:mx-0 lg:px-0" role="group" aria-label="Filtrar citas">
          {[['todas', 'Todas'], ['atendidas', 'Atendidas'], ['proximas', 'Agendadas'], ['canceladas', 'Canceladas']].map(([id, t]) => (
            <button key={id} type="button" aria-pressed={estado === id} onClick={() => setEstado(id)}
              className={'shrink-0 rounded-full px-3.5 py-1.5 text-[14px] ring-1 ' + (estado === id ? 'bg-ink text-bg ring-ink' : 'ring-line')}>{t}</button>
          ))}
          {personas.length > 1 && (
            <select value={persona} onChange={(e) => setPersona(e.target.value)} aria-label="Quién atiende" className="shrink-0 rounded-full bg-surface px-3.5 py-1.5 text-[14px] ring-1 ring-line">
              <option value="">Todo el equipo</option>
              {personas.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          )}
        </div>
        <label className="block lg:ml-auto lg:w-72">
          <span className="sr-only">Buscar en el mes</span>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar cliente, teléfono o servicio" inputMode="search"
            className="w-full rounded-full bg-surface px-4 py-2.5 text-[15px] ring-1 ring-line outline-none focus:ring-2 focus:ring-ink" />
        </label>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[14px] text-muted">
          {lista.length} {lista.length === 1 ? 'cita' : 'citas'} · {dinero(validas.reduce((a, c) => a + c.total, 0))}
          {lista.length !== validas.length ? ` · ${lista.length - validas.length} ${lista.length - validas.length === 1 ? 'cancelada' : 'canceladas'}` : ''}
        </p>
        {lista.length > 0 && (
          <button type="button" onClick={descargar} className="rounded-full px-4 py-2 text-[14px] font-semibold ring-1 ring-line">Descargar Excel (CSV)</button>
        )}
      </div>

      {lista.length === 0 ? (
        <p className="py-10 text-center text-[15px] text-muted">No hay citas {estado === 'todas' && !q && !persona ? 'este mes' : 'con ese filtro'}.</p>
      ) : (
        [...porDia.entries()].map(([fecha, citas]) => (
          <section key={fecha}>
            <h3 className="text-[13px] font-semibold uppercase tracking-[0.12em] text-muted">{fecha === datos.hoy ? 'Hoy' : capitalize(formatLongDate(fecha))}</h3>
            <ul className="mt-2 divide-y divide-line overflow-hidden rounded-3xl bg-surface shadow-card ring-1 ring-line">
              {citas.map((c) => {
                const e = ESTADO(c, datos.hoy)
                return (
                  <li key={c.id}>
                    <button type="button" onClick={() => setAbierto(api.claveCliente(c.telefono, c.cliente))} className="flex w-full items-center gap-3 px-4 py-3 text-left">
                      <span className="w-[74px] shrink-0 whitespace-nowrap text-[14px] font-semibold tabular-nums">{formatTime12(c.hora)}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[15px] font-semibold">{c.cliente}</span>
                        <span className="block truncate text-[13px] text-muted">{c.servicios}{c.profesional ? ` · ${c.profesional.split(/\s+/)[0]}` : ''}</span>
                      </span>
                      <span className="shrink-0 text-right">
                        <span className="block text-[14px] font-semibold tabular-nums">{dinero(c.total)}</span>
                        <span className={'block text-[12px] ' + e.clase}>{e.texto}</span>
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </section>
        ))
      )}

      <Ficha clave={abierto} sesion={sesion} slug={slug} negocio={negocio} alSalir={alSalir} onCerrar={() => setAbierto(null)} />
    </div>
  )
}

function IconoWa() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" fill="currentColor" aria-hidden>
      <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.3-.4.8-1.4.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6a2.7 2.7 0 0 0 1.7-1.2 2.2 2.2 0 0 0 .2-1.2c-.1-.1-.3-.2-.5-.3z" />
    </svg>
  )
}
