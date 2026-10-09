import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { DEMO_MODE, GOOGLE_CLIENT_ID } from '../config'
import { capitalize, formatLongDate, formatTime12 } from '../lib/format'
import { prepararApp } from '../lib/pwa'
import { formatMonto } from '../lib/ticket'
import * as api from './api'
import { Configurar } from './Configurar'
import { botonGoogle } from './google'
import { activarAvisos, apagarAvisos, esIOS, estadoAvisos, instalada, type EstadoAvisos } from './push'

/**
 * "Mi negocio" (bookeaa.com/negocio): la app del dueño. Se agrega a inicio y abre
 * a pantalla completa. Muestra las citas de hoy, las próximas, y activa los avisos.
 * Los datos salen de la hoja del negocio (Reservaciones) vía Apps Script.
 */

const CLAVE_SESION = 'bookeaa-negocio-sesion'
const CLAVE_NEGOCIO = 'bookeaa-negocio-slug'
const DIAS_PROXIMOS = 14

function leerSesion(): api.Sesion | null {
  try {
    const s = JSON.parse(localStorage.getItem(CLAVE_SESION) || 'null') as api.Sesion | null
    return s?.sesion && Array.isArray(s.negocios) ? s : null
  } catch {
    return null
  }
}

function guardar(clave: string, valor: unknown) {
  try {
    if (valor === null) localStorage.removeItem(clave)
    else localStorage.setItem(clave, typeof valor === 'string' ? valor : JSON.stringify(valor))
  } catch {
    /* modo privado: la sesión dura lo que la pestaña */
  }
}

/** "0412 555 1234" → "584125551234" para wa.me. */
export function telefonoWa(tel: string): string {
  const d = tel.replace(/\D/g, '')
  if (d.startsWith('0')) return '58' + d.slice(1)
  return d
}

export default function NegocioApp() {
  const [sesion, setSesion] = useState<api.Sesion | null>(leerSesion)

  useEffect(() => {
    document.title = 'Mi negocio · bookeaa'
    prepararApp({ nombre: 'Mi negocio', ruta: '/negocio', color: '#FDFBF7' })
  }, [])

  const salir = useCallback(() => {
    guardar(CLAVE_SESION, null)
    setSesion(null)
  }, [])

  if (!sesion) {
    return (
      <Entrar
        alEntrar={(s) => {
          guardar(CLAVE_SESION, s)
          setSesion(s)
        }}
      />
    )
  }
  return <Panel sesion={sesion} alSalir={salir} />
}

// ---------- Entrar ----------

function Entrar({ alEntrar }: { alEntrar: (s: api.Sesion) => void }) {
  const boton = useRef<HTMLDivElement>(null)
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)

  const conCredencial = useCallback(
    async (credencial: string) => {
      setCargando(true)
      setError('')
      try {
        alEntrar(await api.entrar(credencial))
      } catch (e) {
        setError((e as Error).message)
        setCargando(false)
      }
    },
    [alEntrar],
  )

  useEffect(() => {
    if (DEMO_MODE || !GOOGLE_CLIENT_ID || !boton.current) return
    botonGoogle(boton.current, GOOGLE_CLIENT_ID, (c) => void conCredencial(c)).catch((e) => setError((e as Error).message))
  }, [conCredencial])

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6 pb-safe text-center">
      <Logo className="size-16" />
      <h1 className="mt-6 font-display text-[36px] leading-tight">Mi negocio</h1>
      <p className="mt-2 max-w-[30ch] text-[15px] text-muted">Tus citas de hoy, tus reservas y avisos en el teléfono.</p>
      <div className="mt-10 grid min-h-11 place-items-center">
        {DEMO_MODE ? (
          <button type="button" className="rounded-full bg-ink px-6 py-3 text-[15px] font-semibold text-bg" onClick={() => void conCredencial('demo')}>
            Entrar (demo)
          </button>
        ) : GOOGLE_CLIENT_ID ? (
          <div ref={boton} aria-busy={cargando} />
        ) : (
          <p className="text-[14px] text-danger">Falta configurar el acceso con Google (VITE_GOOGLE_CLIENT_ID).</p>
        )}
      </div>
      {cargando && <p className="mt-4 text-[14px] text-muted">Entrando…</p>}
      {error && (
        <p role="alert" className="mt-4 max-w-[34ch] text-[14px] text-danger">
          {error}
        </p>
      )}
      <p className="mt-10 max-w-[34ch] text-[13px] text-muted">Entra con el Gmail que diste al afiliarte a bookeaa.</p>
    </main>
  )
}

// ---------- Panel ----------

type Pestana = 'hoy' | 'proximas' | 'configurar' | 'ajustes'

function Panel({ sesion, alSalir }: { sesion: api.Sesion; alSalir: () => void }) {
  const pedido = new URLSearchParams(location.search).get('n')
  const inicial = [pedido, (() => { try { return localStorage.getItem(CLAVE_NEGOCIO) } catch { return null } })()]
    .find((s) => s && sesion.negocios.some((n) => n.slug === s)) || sesion.negocios[0]?.slug || ''
  const [slug, setSlug] = useState(inicial)
  const [pestana, setPestana] = useState<Pestana>('hoy')
  const [agenda, setAgenda] = useState<api.Agenda | null>(null)
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)

  const cargar = useCallback(async () => {
    if (!slug) return
    setCargando(true)
    setError('')
    try {
      setAgenda(await api.citas(sesion.sesion, slug, api.hoyCaracas(), DIAS_PROXIMOS))
    } catch (e) {
      if (e instanceof api.ErrorNegocio && e.codigo === 'sesion') return alSalir()
      setError((e as Error).message)
    } finally {
      setCargando(false)
    }
  }, [sesion.sesion, slug, alSalir])

  useEffect(() => {
    guardar(CLAVE_NEGOCIO, slug)
    setAgenda(null)
    void cargar()
  }, [slug, cargar])

  // Al volver a la app (o tocar un aviso) se recargan las citas.
  useEffect(() => {
    const alVolver = () => document.visibilityState === 'visible' && void cargar()
    const alMensaje = (e: MessageEvent) => e.data?.tipo === 'recargar' && void cargar()
    document.addEventListener('visibilitychange', alVolver)
    navigator.serviceWorker?.addEventListener('message', alMensaje)
    return () => {
      document.removeEventListener('visibilitychange', alVolver)
      navigator.serviceWorker?.removeEventListener('message', alMensaje)
    }
  }, [cargar])

  const confirmar = async (id: string) => {
    try {
      await api.confirmarPago(sesion.sesion, slug, id)
      setAgenda((a) => (a ? { ...a, citas: a.citas.map((c) => (c.id === id ? { ...c, estado: 'Confirmada' } : c)) } : a))
    } catch (e) {
      setError((e as Error).message)
    }
  }

  const nombre = agenda?.negocio.nombre || sesion.negocios.find((n) => n.slug === slug)?.nombre || ''

  return (
    <div className="mx-auto flex min-h-dvh max-w-xl flex-col">
      <header className="sticky top-0 z-10 flex items-center gap-3 bg-bg/90 px-5 pb-3 pt-[max(1rem,env(safe-area-inset-top))] backdrop-blur">
        <Logo className="size-9 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[17px] font-semibold leading-tight">{nombre || 'Mi negocio'}</p>
          <p className="text-[13px] text-muted">{agenda ? capitalize(formatLongDate(agenda.hoy)) : ' '}</p>
        </div>
        <button
          type="button"
          onClick={() => void cargar()}
          disabled={cargando}
          aria-label="Actualizar"
          className="grid size-10 place-items-center rounded-full ring-1 ring-line disabled:opacity-50"
        >
          <svg viewBox="0 0 24 24" className={'size-5' + (cargando ? ' animate-spin' : '')} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
            <path d="M20 12a8 8 0 1 1-2.3-5.6M20 4v4h-4" />
          </svg>
        </button>
      </header>

      <main className="flex-1 px-5 pb-28">
        {error && (
          <p role="alert" className="mb-4 rounded-2xl bg-danger/10 px-4 py-3 text-[14px] text-danger">
            {error}
          </p>
        )}
        {pestana === 'hoy' && <Hoy agenda={agenda} onConfirmar={confirmar} />}
        {pestana === 'proximas' && <Proximas agenda={agenda} onConfirmar={confirmar} />}
        {pestana === 'configurar' && <Configurar sesion={sesion.sesion} slug={slug} alSalir={alSalir} />}
        {pestana === 'ajustes' && (
          <Ajustes sesion={sesion} slug={slug} onSlug={setSlug} onSalir={alSalir} />
        )}
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-10 border-t border-line bg-bg/95 pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur" aria-label="Secciones">
        <div className="mx-auto grid max-w-xl grid-cols-4">
          <BotonPestana activa={pestana === 'hoy'} onClick={() => setPestana('hoy')} icono="hoy">Hoy</BotonPestana>
          <BotonPestana activa={pestana === 'proximas'} onClick={() => setPestana('proximas')} icono="proximas">Próximas</BotonPestana>
          <BotonPestana activa={pestana === 'configurar'} onClick={() => setPestana('configurar')} icono="configurar">Configurar</BotonPestana>
          <BotonPestana activa={pestana === 'ajustes'} onClick={() => setPestana('ajustes')} icono="ajustes">Avisos</BotonPestana>
        </div>
      </nav>
    </div>
  )
}

function BotonPestana({ activa, onClick, icono, children }: { activa: boolean; onClick: () => void; icono: 'hoy' | 'proximas' | 'configurar' | 'ajustes'; children: ReactNode }) {
  const d = {
    hoy: 'M4 7h16M4 7v12a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V7M4 7V5a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v2M8 2v4M16 2v4M9 14l2 2 4-4',
    proximas: 'M4 6h16M4 12h16M4 18h10',
    configurar: 'M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0M14 4v4M8 10v4M16 16v4',
    ajustes: 'M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.9 1.9 0 0 0 3.4 0',
  }[icono]
  return (
    <button type="button" onClick={onClick} aria-current={activa ? 'page' : undefined} className={'flex flex-col items-center gap-1 py-2 text-[12px] ' + (activa ? 'font-semibold text-ink' : 'text-muted')}>
      <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth={activa ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d={d} />
      </svg>
      {children}
    </button>
  )
}

// ---------- Hoy ----------

const minutosAhora = () => {
  const d = new Date(Date.now() - 4 * 3600_000)
  return d.getUTCHours() * 60 + d.getUTCMinutes()
}
const minutos = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5))
const activa = (c: api.Cita) => !/cancel/i.test(c.estado)

function Hoy({ agenda, onConfirmar }: { agenda: api.Agenda | null; onConfirmar: (id: string) => void }) {
  if (!agenda) return <Cargando />
  const hoy = agenda.citas.filter((c) => c.fecha === agenda.hoy && activa(c))
  const manana = agenda.citas.filter((c) => c.fecha > agenda.hoy && activa(c))
  const ahora = minutosAhora()
  const pendientes = hoy.filter((c) => minutos(c.hora) >= ahora - 30)
  const siguiente = pendientes[0]
  const porVerificar = agenda.citas.filter((c) => /verificar/i.test(c.estado)).length

  return (
    <>
      <section className="mt-2 rounded-3xl bg-ink px-5 py-5 text-bg">
        <p className="text-[13px] uppercase tracking-[0.12em] opacity-70">Hoy</p>
        <p className="mt-1 font-display text-[40px] leading-none">
          {hoy.length === 0 ? 'Sin citas' : hoy.length === 1 ? '1 cita' : `${hoy.length} citas`}
        </p>
        {siguiente ? (
          <p className="mt-3 text-[15px] opacity-90">
            Próxima: <b>{formatTime12(siguiente.hora)}</b> · {siguiente.cliente}
          </p>
        ) : hoy.length > 0 ? (
          <p className="mt-3 text-[15px] opacity-90">Ya pasaron todas las de hoy.</p>
        ) : null}
        {porVerificar > 0 && (
          <p className="mt-3 inline-block rounded-full bg-bg/15 px-3 py-1 text-[13px]">
            💸 {porVerificar === 1 ? '1 pago por verificar' : `${porVerificar} pagos por verificar`}
          </p>
        )}
      </section>

      <ListaCitas citas={hoy} moneda={agenda.negocio.moneda} onConfirmar={onConfirmar} ahora={ahora} vacio="Hoy no tienes citas agendadas." />

      {manana.length > 0 && (
        <>
          <h2 className="mt-8 text-[13px] font-semibold uppercase tracking-[0.12em] text-muted">
            {capitalize(formatLongDate(manana[0].fecha))}
          </h2>
          <ListaCitas citas={manana.filter((c) => c.fecha === manana[0].fecha)} moneda={agenda.negocio.moneda} onConfirmar={onConfirmar} />
        </>
      )}
    </>
  )
}

function Proximas({ agenda, onConfirmar }: { agenda: api.Agenda | null; onConfirmar: (id: string) => void }) {
  const dias = useMemo(() => {
    const m = new Map<string, api.Cita[]>()
    for (const c of agenda?.citas ?? []) if (activa(c)) m.set(c.fecha, [...(m.get(c.fecha) ?? []), c])
    return [...m.entries()]
  }, [agenda])
  if (!agenda) return <Cargando />
  if (!dias.length) return <p className="mt-10 text-center text-[15px] text-muted">No tienes citas en los próximos {DIAS_PROXIMOS} días.</p>
  return (
    <>
      {dias.map(([fecha, citas]) => (
        <section key={fecha} className="mt-6 first:mt-2">
          <h2 className="flex items-baseline justify-between text-[13px] font-semibold uppercase tracking-[0.12em] text-muted">
            <span>{fecha === agenda.hoy ? 'Hoy' : capitalize(formatLongDate(fecha))}</span>
            <span className="font-normal normal-case tracking-normal">{citas.length === 1 ? '1 cita' : `${citas.length} citas`}</span>
          </h2>
          <ListaCitas citas={citas} moneda={agenda.negocio.moneda} onConfirmar={onConfirmar} ahora={fecha === agenda.hoy ? minutosAhora() : undefined} />
        </section>
      ))}
    </>
  )
}

function ListaCitas({ citas, moneda, onConfirmar, ahora, vacio }: { citas: api.Cita[]; moneda: api.Agenda['negocio']['moneda']; onConfirmar: (id: string) => void; ahora?: number; vacio?: string }) {
  if (!citas.length) return vacio ? <p className="mt-6 text-center text-[15px] text-muted">{vacio}</p> : null
  return (
    <ul className="mt-3 space-y-3">
      {citas.map((c) => (
        <TarjetaCita key={c.id} c={c} moneda={moneda} pasada={ahora !== undefined && minutos(c.hora) + 30 < ahora} onConfirmar={onConfirmar} />
      ))}
    </ul>
  )
}

function TarjetaCita({ c, moneda, pasada, onConfirmar }: { c: api.Cita; moneda: api.Agenda['negocio']['moneda']; pasada: boolean; onConfirmar: (id: string) => void }) {
  const porVerificar = /verificar/i.test(c.estado)
  const [confirmando, setConfirmando] = useState(false)
  const texto = formatTime12(c.hora)
  const [h, sufijo] = [texto.slice(0, texto.indexOf(' ')), texto.slice(texto.indexOf(' ') + 1)]
  return (
    <li className={'flex gap-4 rounded-3xl bg-surface p-4 shadow-card ring-1 ring-line ' + (pasada && !porVerificar ? 'opacity-55' : '')}>
      <div className="w-[64px] shrink-0 text-center">
        <p className="text-[22px] font-semibold leading-none tabular-nums">{h}</p>
        <p className="mt-1 text-[12px] text-muted">{sufijo}</p>
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[16px] font-semibold">{c.cliente}</p>
        <p className="truncate text-[14px] text-muted">{c.servicios}</p>
        <p className="mt-1 text-[13px] text-muted">
          {formatMonto(c.total, moneda)}
          {c.lugar ? ` · ${c.lugar}` : ''}
        </p>
        {porVerificar && (
          <div className="mt-3 rounded-2xl bg-sand px-3 py-2 text-[13px]">
            <p className="font-semibold">💸 Pago Móvil por verificar{c.totalBs ? ` · ${formatMonto(c.totalBs, 'BS')}` : ''}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {c.capture && (
                <a href={c.capture} target="_blank" rel="noopener noreferrer" className="rounded-full bg-surface px-3 py-1.5 ring-1 ring-line">
                  Ver capture
                </a>
              )}
              <button
                type="button"
                disabled={confirmando}
                onClick={async () => {
                  setConfirmando(true)
                  await onConfirmar(c.id)
                  setConfirmando(false)
                }}
                className="rounded-full bg-ink px-3 py-1.5 font-semibold text-bg disabled:opacity-50"
              >
                {confirmando ? 'Confirmando…' : 'Pago recibido'}
              </button>
            </div>
          </div>
        )}
      </div>
      {c.telefono && (
        <a
          href={`https://wa.me/${telefonoWa(c.telefono)}`}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Escribir a ${c.cliente} por WhatsApp`}
          className="grid size-11 shrink-0 place-items-center self-center rounded-full bg-sand"
        >
          <svg viewBox="0 0 24 24" className="size-5" fill="currentColor" aria-hidden>
            <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.3-.4.8-1.4.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6a2.7 2.7 0 0 0 1.7-1.2 2.2 2.2 0 0 0 .2-1.2c-.1-.1-.3-.2-.5-.3z" />
          </svg>
        </a>
      )}
    </li>
  )
}

// ---------- Avisos ----------

function Ajustes({ sesion, slug, onSlug, onSalir }: { sesion: api.Sesion; slug: string; onSlug: (s: string) => void; onSalir: () => void }) {
  const [estado, setEstado] = useState<EstadoAvisos | null>(null)
  const [mensaje, setMensaje] = useState('')
  const [ocupado, setOcupado] = useState(false)

  useEffect(() => {
    void estadoAvisos().then(setEstado)
  }, [])

  const activar = async () => {
    setOcupado(true)
    setMensaje('')
    try {
      const sub = await activarAvisos(sesion.vapid)
      // Un mismo teléfono puede recibir los avisos de todos tus negocios.
      for (const n of sesion.negocios) await api.avisos(sesion.sesion, n.slug, sub)
      setEstado('activos')
      setMensaje('Listo: te avisaremos de reservas nuevas, 30 min antes de cada cita y a las 7:00 a. m. con tu día.')
    } catch (e) {
      setMensaje((e as Error).message)
      setEstado(await estadoAvisos())
    } finally {
      setOcupado(false)
    }
  }

  const apagar = async () => {
    setOcupado(true)
    try {
      const sub = await apagarAvisos()
      if (sub) for (const n of sesion.negocios) await api.avisos(sesion.sesion, n.slug, sub, true)
      setEstado('apagados')
      setMensaje('Avisos apagados en este teléfono.')
    } catch (e) {
      setMensaje((e as Error).message)
    } finally {
      setOcupado(false)
    }
  }

  return (
    <div className="mt-2 space-y-6">
      <section className="rounded-3xl bg-surface p-5 shadow-card ring-1 ring-line">
        <h2 className="text-[17px] font-semibold">Avisos en este teléfono</h2>
        <ul className="mt-2 space-y-1 text-[14px] text-muted">
          <li>📅 Cada reserva nueva</li>
          <li>💸 Pagos Móvil por verificar</li>
          <li>⏰ 30 minutos antes de cada cita</li>
          <li>☀️ A las 7:00 a. m., las citas del día</li>
        </ul>
        <div className="mt-4">
          {estado === 'activos' ? (
            <button type="button" disabled={ocupado} onClick={() => void apagar()} className="w-full rounded-full px-5 py-3 text-[15px] font-semibold ring-1 ring-line disabled:opacity-50">
              ✅ Activos · Apagar
            </button>
          ) : estado === 'instalar_primero' ? (
            <InstruccionesInstalar />
          ) : estado === 'bloqueados' ? (
            <p className="text-[14px] text-danger">Los avisos están bloqueados. Actívalos en Ajustes del teléfono → Notificaciones → bookeaa.</p>
          ) : estado === 'no_soportado' ? (
            <p className="text-[14px] text-muted">Este navegador no recibe avisos. Usa Chrome en Android o agrega la app a inicio en iPhone.</p>
          ) : (
            <button type="button" disabled={ocupado || estado === null} onClick={() => void activar()} className="w-full rounded-full bg-ink px-5 py-3 text-[15px] font-semibold text-bg disabled:opacity-50">
              {ocupado ? 'Activando…' : 'Activar avisos'}
            </button>
          )}
        </div>
        {mensaje && <p className="mt-3 text-[14px]" role="status">{mensaje}</p>}
      </section>

      {!instalada() && estado !== 'instalar_primero' && (
        <section className="rounded-3xl bg-surface p-5 shadow-card ring-1 ring-line">
          <h2 className="text-[17px] font-semibold">Tenla como app</h2>
          <InstruccionesInstalar />
        </section>
      )}

      {sesion.negocios.length > 1 && (
        <section className="rounded-3xl bg-surface p-5 shadow-card ring-1 ring-line">
          <h2 className="text-[17px] font-semibold">Tus negocios</h2>
          <div className="mt-3 space-y-2">
            {sesion.negocios.map((n) => (
              <button key={n.slug} type="button" onClick={() => onSlug(n.slug)} aria-pressed={n.slug === slug}
                className={'w-full rounded-2xl px-4 py-3 text-left text-[15px] ring-1 ' + (n.slug === slug ? 'bg-ink text-bg ring-ink' : 'ring-line')}>
                {n.nombre}
              </button>
            ))}
          </div>
        </section>
      )}

      <section className="space-y-3 text-center text-[14px]">
        <a href={`/u/${slug}`} className="block rounded-full px-5 py-3 font-semibold ring-1 ring-line">Ver mi página de reservas</a>
        <p className="text-muted">Entraste como {sesion.email}</p>
        <button type="button" onClick={onSalir} className="text-danger underline underline-offset-4">Cerrar sesión</button>
      </section>
    </div>
  )
}

function InstruccionesInstalar() {
  return esIOS() ? (
    <ol className="mt-2 list-decimal space-y-1 pl-5 text-[14px] text-muted">
      <li>Abre esta página en <b className="text-ink">Safari</b>.</li>
      <li>Toca <b className="text-ink">Compartir</b> (el cuadrito con la flecha).</li>
      <li>Elige <b className="text-ink">Agregar a inicio</b>.</li>
      <li>Abre <b className="text-ink">Mi negocio</b> desde el ícono y activa los avisos.</li>
    </ol>
  ) : (
    <p className="mt-2 text-[14px] text-muted">
      En Chrome toca el menú <b className="text-ink">⋮</b> → <b className="text-ink">Agregar a pantalla principal</b> (o <b className="text-ink">Instalar app</b>).
    </p>
  )
}

function Cargando() {
  return (
    <div className="mt-2 space-y-3" aria-busy="true" aria-label="Cargando citas">
      <div className="h-[132px] animate-pulse rounded-3xl bg-sand" />
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-[84px] animate-pulse rounded-3xl bg-sand/70" />
      ))}
    </div>
  )
}

function Logo({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <rect x="2" y="4" width="28" height="26" rx="7" fill="#0f0f0e" />
      <path d="M10 2.5v5M22 2.5v5" stroke="#0f0f0e" strokeWidth="2.6" strokeLinecap="round" />
      <path d="M12 11v12M12 17.5a4 4 0 1 1 0 .01" stroke="#ffffff" strokeWidth="2.6" strokeLinecap="round" fill="none" />
    </svg>
  )
}
