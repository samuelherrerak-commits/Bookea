import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { capitalize, formatLongDate } from '../lib/format'
import { prepararApp } from '../lib/pwa'
import { Entrar, Logo } from '../negocio/NegocioApp'
import type { Sesion } from '../negocio/api'
import * as api from './api'
import { Cobros } from './Cobros'
import { Marketing } from './Marketing'
import { Metricas } from './Metricas'
import { NegocioAFondo } from './NegocioAFondo'
import { Minibarras } from './graficos'
import { ETIQUETA, fechaCorta, haceDias, textoVence } from './estados'

/**
 * Central de bookeaa (bookeaa.com/central): para el dueño de bookeaa. Ve todos los
 * negocios con su estado de cobro, registra pagos, da de alta negocios nuevos,
 * suspende o reactiva, concilia los Pago Móvil que reportan (Cobros) y ve los prospectos
 * que agendó el bot de WhatsApp.
 */

const CLAVE_SESION = 'bookeaa-central-sesion'

function leerSesion(): Sesion | null {
  try {
    const s = JSON.parse(localStorage.getItem(CLAVE_SESION) || 'null') as Sesion | null
    return s?.sesion ? s : null
  } catch {
    return null
  }
}

function guardarSesion(s: Sesion | null) {
  try {
    if (s) localStorage.setItem(CLAVE_SESION, JSON.stringify(s))
    else localStorage.removeItem(CLAVE_SESION)
  } catch {
    /* modo privado */
  }
}

export default function CentralApp() {
  const [sesion, setSesion] = useState<Sesion | null>(leerSesion)
  useEffect(() => {
    document.title = 'Central · bookeaa'
    prepararApp({ nombre: 'bookeaa Central', ruta: '/central', color: '#FDFBF7' })
  }, [])
  const salir = useCallback(() => {
    guardarSesion(null)
    setSesion(null)
  }, [])
  if (!sesion) {
    return (
      <Entrar
        titulo="Central bookeaa"
        bajada="Tus negocios, quién está al día y quién debe, en un solo lugar."
        nota="Solo para los administradores de bookeaa."
        alEntrar={(s) => {
          guardarSesion(s)
          setSesion(s)
        }}
      />
    )
  }
  return <Panel sesion={sesion} alSalir={salir} />
}

// ---------- Panel ----------

type Pestana = 'panel' | 'negocios' | 'cobros' | 'prospectos' | 'pagos' | 'marketing'

const TITULO: Record<Pestana, string> = { panel: 'Panel', negocios: 'Negocios', cobros: 'Cobros', prospectos: 'Prospectos', pagos: 'Pagos', marketing: 'Marketing' }
const ICONO: Record<Pestana, string> = {
  panel: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
  negocios: 'M4 21V8l8-5 8 5v13M9 21v-6h6v6',
  cobros: 'M12 3v18M17 7.5C17 5.6 14.8 4.5 12 4.5S7 5.6 7 7.5s2 2.7 5 3.4 5 1.6 5 3.6-2.2 3-5 3-5-1.1-5-3',
  prospectos: 'M16 21v-2a4 4 0 0 0-8 0v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M19 8v6M22 11h-6',
  pagos: 'M3 7h18v10H3zM3 11h18M7 15h3',
  marketing: 'M4 5h16v15H4zM4 10h16M9 3v4M15 3v4',
}

const ES_ESCRITORIO = '(min-width: 1024px)'
const esEscritorio = () => typeof matchMedia === 'function' && matchMedia(ES_ESCRITORIO).matches

/** true en pantallas de computadora (≥ 1024 px); se actualiza al cambiar el tamaño. */
function useEscritorio() {
  const [si, setSi] = useState(esEscritorio)
  useEffect(() => {
    if (typeof matchMedia !== 'function') return
    const m = matchMedia(ES_ESCRITORIO)
    const cambio = () => setSi(m.matches)
    m.addEventListener('change', cambio)
    return () => m.removeEventListener('change', cambio)
  }, [])
  return si
}
type Filtro = 'todos' | 'pendiente' | 'por_vencer' | 'prueba' | 'activo' | 'suspendido'

function mensajeCobro(n: api.Negocio, precio: number) {
  const nombre = n.nombre
  if (n.estado === 'pendiente' || n.estado === 'vencido') return `Hola, ${nombre} 👋 Tu plan de bookeaa venció el ${fechaCorta(n.vence)}. Para seguir recibiendo reservas son $${precio} al mes. ¿Te paso los datos de Pago Móvil?`
  if (n.estado === 'prueba') return `Hola, ${nombre} 👋 Tu mes gratis de bookeaa termina el ${fechaCorta(n.vence)}. Para seguir con tu página de reservas son $${precio} al mes. ¿Te paso los datos de Pago Móvil?`
  return `Hola, ${nombre} 👋 Tu plan de bookeaa vence el ${fechaCorta(n.vence)} ($${precio} al mes). ¿Te paso los datos de Pago Móvil para renovarlo?`
}

function Panel({ sesion, alSalir }: { sesion: Sesion; alSalir: () => void }) {
  const [datos, setDatos] = useState<api.Resumen | null>(null)
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)
  const escritorio = useEscritorio()
  const [pestana, setPestana] = useState<Pestana>(() => (new URLSearchParams(location.search).get('state') ? 'marketing' : esEscritorio() ? 'panel' : 'negocios'))
  const [aFondo, setAFondo] = useState<string | null>(null)
  const [metricas, setMetricas] = useState<api.Metricas | null>(null)
  const [cargandoM, setCargandoM] = useState(false)
  const [filtro, setFiltro] = useState<Filtro>('todos')
  const [busqueda, setBusqueda] = useState('')
  const [abierto, setAbierto] = useState<api.Negocio | null>(null)
  const [nuevo, setNuevo] = useState<Partial<{ nombre: string; email: string; telefono: string }> | null>(null)
  const [porVerificar, setPorVerificar] = useState(0)
  // TikTok devuelve al usuario a /central?code=…&state=… (o ?error=…): se pasa a Marketing y se limpia la URL.
  const [retornoTikTok, setRetornoTikTok] = useState<{ code: string; state: string } | { error: string } | null>(() => {
    const q = new URLSearchParams(location.search)
    if (q.get('code') && q.get('state')) return { code: q.get('code')!, state: q.get('state')! }
    if (q.get('error') && q.get('state')) return { error: q.get('error_description') || q.get('error')! }
    return null
  })

  const cargar = useCallback(async () => {
    setCargando(true)
    setError('')
    try {
      api.cobros(sesion.sesion).then((c) => setPorVerificar(c.porVerificar.length), () => {})
      const r = await api.resumen(sesion.sesion)
      setDatos(r)
      setAbierto((a) => (a ? r.negocios.find((n) => n.slug === a.slug) ?? null : a))
    } catch (e) {
      if (e instanceof api.ErrorCentral && e.codigo === 'sesion') return alSalir()
      setError((e as Error).message)
    } finally {
      setCargando(false)
    }
  }, [sesion.sesion, alSalir])

  useEffect(() => {
    void cargar()
  }, [cargar])

  const cargarMetricas = useCallback(async (fresco = false) => {
    setCargandoM(true)
    try {
      setMetricas(await api.metricas(sesion.sesion, fresco))
    } catch (e) {
      if (e instanceof api.ErrorCentral && e.codigo === 'sesion') return alSalir()
      setError((e as Error).message)
    } finally {
      setCargandoM(false)
    }
  }, [sesion.sesion, alSalir])

  // Las métricas abren la hoja de cada negocio: se piden solo al verlas (panel o tabla de escritorio).
  const pideMetricas = pestana === 'panel' || (pestana === 'negocios' && escritorio)
  useEffect(() => {
    if (pideMetricas && !metricas && !cargandoM) void cargarMetricas()
  }, [pideMetricas, metricas, cargandoM, cargarMetricas])

  const ir = (p: Pestana) => {
    setPestana(p)
    setAFondo(null)
  }
  const verAFondo = (slug: string) => {
    setAbierto(null)
    setAFondo(slug)
    window.scrollTo({ top: 0 })
  }
  const porSlug = useMemo(() => new Map((metricas?.negocios ?? []).map((m) => [m.slug, m])), [metricas])
  const ancho = aFondo || pestana === 'panel' || pestana === 'negocios' ? 'lg:max-w-[1320px]' : 'lg:max-w-3xl'

  const lista = useMemo(() => {
    if (!datos) return []
    const q = busqueda.trim().toLowerCase()
    return datos.negocios
      .filter((n) =>
        filtro === 'todos' ? true
        : filtro === 'por_vencer' ? (n.estado === 'activo' || n.estado === 'prueba') && n.dias !== null && n.dias <= 5
        : filtro === 'pendiente' ? n.estado === 'pendiente' || n.estado === 'vencido'
        : n.estado === filtro,
      )
      .filter((n) => !q || `${n.nombre} ${n.slug} ${n.email} ${n.telefono}`.toLowerCase().includes(q))
      .sort((a, b) => orden(a) - orden(b) || (a.dias ?? 9999) - (b.dias ?? 9999))
  }, [datos, filtro, busqueda])

  const pestanas: Pestana[] = ['panel', 'negocios', 'cobros', 'prospectos', 'pagos', 'marketing']
  const contador = (p: Pestana) => (p === 'cobros' ? porVerificar : p === 'prospectos' ? datos?.prospectos.length : undefined)

  return (
    <div className="lg:flex">
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-line bg-surface/70 px-4 py-6 lg:flex">
        <div className="flex items-center gap-2.5 px-2">
          <Logo className="size-9 shrink-0" />
          <div>
            <p className="text-[16px] font-semibold leading-tight">bookeaa</p>
            <p className="text-[12px] text-muted">Central</p>
          </div>
        </div>
        <nav className="mt-8 space-y-1" aria-label="Secciones">
          {pestanas.map((p) => (
            <button key={p} type="button" onClick={() => ir(p)} aria-current={pestana === p && !aFondo ? 'page' : undefined}
              className={'flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-[15px] ' + (pestana === p ? 'bg-ink font-semibold text-bg' : 'text-ink hover:bg-sand')}>
              <svg viewBox="0 0 24 24" className="size-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d={ICONO[p]} /></svg>
              <span className="flex-1">{TITULO[p]}</span>
              {!!contador(p) && <span className="grid min-w-5 place-items-center rounded-full bg-danger px-1.5 text-[11px] font-bold text-white">{contador(p)}</span>}
            </button>
          ))}
        </nav>
        <button type="button" onClick={() => { setAFondo(null); setNuevo({}) }} className="mt-6 rounded-full bg-ink px-4 py-2.5 text-[14px] font-semibold text-bg">+ Nuevo negocio</button>
        <div className="mt-auto px-2 text-[12px] text-muted">
          <p className="truncate">{sesion.email}</p>
          <button type="button" onClick={alSalir} className="mt-1 underline underline-offset-4">Cerrar sesión</button>
        </div>
      </aside>

      <div className="mx-auto flex min-h-dvh max-w-xl flex-col lg:mx-0 lg:min-w-0 lg:max-w-none lg:flex-1">
      <header className="sticky top-0 z-10 flex items-center gap-3 bg-bg/90 px-5 pb-3 pt-[max(1rem,env(safe-area-inset-top))] backdrop-blur lg:px-8 lg:pt-5">
        <Logo className="size-9 shrink-0 lg:hidden" />
        <div className="min-w-0 flex-1">
          <p className="text-[17px] font-semibold leading-tight lg:hidden">Central bookeaa</p>
          <p className="hidden font-display text-[30px] leading-tight lg:block">{aFondo ? 'Negocio a fondo' : TITULO[pestana]}</p>
          <p className="text-[13px] text-muted">{datos ? capitalize(formatLongDate(datos.hoy)) : ' '}</p>
        </div>
        <button type="button" onClick={() => { void cargar(); if (pideMetricas) void cargarMetricas(true) }} disabled={cargando} aria-label="Actualizar" className="grid size-10 place-items-center rounded-full ring-1 ring-line disabled:opacity-50">
          <svg viewBox="0 0 24 24" className={'size-5' + (cargando ? ' animate-spin' : '')} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><path d="M20 12a8 8 0 1 1-2.3-5.6M20 4v4h-4" /></svg>
        </button>
      </header>

      <main className="flex-1 px-5 pb-28 lg:px-8 lg:pb-12">
        <div className={'mx-auto w-full ' + ancho}>
        {error && (
          <div role="alert" className="mb-4 rounded-2xl bg-danger/10 px-4 py-3 text-[14px] text-danger">
            {error}
            {/no es administrador/.test(error) && <button type="button" onClick={alSalir} className="mt-2 block underline underline-offset-4">Entrar con otra cuenta</button>}
          </div>
        )}
        {aFondo && (
          <NegocioAFondo sesion={sesion.sesion} slug={aFondo} hoy={datos?.hoy ?? ''} alVolver={() => setAFondo(null)} alSalir={alSalir}
            alGestionar={() => { const n = datos?.negocios.find((x) => x.slug === aFondo); if (n) setAbierto(n) }} />
        )}
        {!aFondo && <>
        {!datos && !error && pestana !== 'panel' && pestana !== 'cobros' && pestana !== 'marketing' && <div className="mt-2 h-[420px] animate-pulse rounded-3xl bg-sand" aria-busy="true" />}

        {pestana === 'panel' && <Metricas datos={metricas} cargando={cargandoM} onRecalcular={() => void cargarMetricas(true)} onAbrir={verAFondo} />}

        {datos && pestana === 'negocios' && (
          <>
            <section className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
              <Cifra valor={datos.totales.activos} etiqueta="Activos" activo={filtro === 'activo'} onClick={() => setFiltro(filtro === 'activo' ? 'todos' : 'activo')} />
              <Cifra valor={datos.totales.prueba} etiqueta="En prueba" activo={filtro === 'prueba'} onClick={() => setFiltro(filtro === 'prueba' ? 'todos' : 'prueba')} />
              <Cifra valor={datos.totales.pendientes} etiqueta="Por cobrar" alerta={datos.totales.pendientes > 0} activo={filtro === 'pendiente'} onClick={() => setFiltro(filtro === 'pendiente' ? 'todos' : 'pendiente')} />
              <Cifra valor={datos.totales.porVencer} etiqueta="Vencen en 5 días" activo={filtro === 'por_vencer'} onClick={() => setFiltro(filtro === 'por_vencer' ? 'todos' : 'por_vencer')} />
            </section>
            <p className="mt-3 text-[14px] text-muted">
              Ingreso mensual: <b className="text-ink">${datos.totales.mrr ?? datos.totales.activos * datos.precio}</b>
              {datos.totales.prueba > 0 && <> · +${datos.totales.mrrPrueba ?? datos.totales.prueba * datos.precio} si pagan los que están en prueba</>}
              {!!datos.totales.team && <> · {datos.totales.team} en bookeaa team</>}
              {datos.totales.suspendidos > 0 && <> · {datos.totales.suspendidos} {datos.totales.suspendidos === 1 ? "suspendido" : "suspendidos"}</>}
            </p>

            <div className="mt-4 flex gap-2 lg:max-w-xl">
              <input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar negocio, correo o teléfono" aria-label="Buscar"
                className="min-w-0 flex-1 rounded-full bg-surface px-4 py-2.5 text-[15px] ring-1 ring-line outline-none focus:ring-2 focus:ring-ink" />
              <button type="button" onClick={() => setNuevo({})} className="shrink-0 rounded-full bg-ink px-4 py-2.5 text-[15px] font-semibold text-bg">+ Nuevo</button>
            </div>
            <div className="-mx-5 mt-3 flex gap-2 overflow-x-auto px-5 pb-1 no-scrollbar">
              {(['todos', 'pendiente', 'por_vencer', 'prueba', 'activo', 'suspendido'] as Filtro[]).map((f) => (
                <button key={f} type="button" aria-pressed={filtro === f} onClick={() => setFiltro(f)}
                  className={'shrink-0 rounded-full px-3.5 py-1.5 text-[14px] ring-1 ' + (filtro === f ? 'bg-ink text-bg ring-ink' : 'ring-line')}>
                  {{ todos: 'Todos', pendiente: 'Por cobrar', por_vencer: 'Por vencer', prueba: 'En prueba', activo: 'Activos', suspendido: 'Suspendidos' }[f]}
                </button>
              ))}
            </div>

            <TablaNegocios lista={lista} metricas={porSlug} hoy={datos.hoy} onAFondo={verAFondo} onGestionar={setAbierto} />

            <ul className="mt-3 space-y-2.5 lg:hidden">
              {lista.map((n) => (
                <li key={n.slug}>
                  <button type="button" onClick={() => setAbierto(n)} className="flex w-full items-center gap-3 rounded-3xl bg-surface p-4 text-left shadow-card ring-1 ring-line">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-[16px] font-semibold">{n.nombre}</p>
                        <span className={'shrink-0 rounded-full px-2 py-0.5 text-[12px] font-semibold ' + ETIQUETA[n.estado].clase}>{ETIQUETA[n.estado].texto}</span>
                        {n.plan === 'team' && <EtiquetaTeam n={n} />}
                      </div>
                      <p className={'mt-0.5 text-[13px] ' + (n.dias !== null && n.dias <= 5 && n.estado !== 'suspendido' ? 'font-semibold text-danger' : 'text-muted')}>{textoVence(n)}</p>
                      <p className="truncate text-[13px] text-muted">/u/{n.slug}{n.email ? ` · ${n.email}` : ''}</p>
                    </div>
                    <svg viewBox="0 0 24 24" className="size-5 shrink-0 text-muted" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><path d="M9 6l6 6-6 6" /></svg>
                  </button>
                </li>
              ))}
              {lista.length === 0 && <p className="mt-6 text-center text-[15px] text-muted">No hay negocios con ese filtro.</p>}
            </ul>
          </>
        )}

        {datos && pestana === 'prospectos' && (
          <Prospectos lista={datos.prospectos} onCrear={(p) => setNuevo({ nombre: p.negocio, email: p.correo, telefono: p.telefono })} />
        )}
        {datos && pestana === 'pagos' && <Pagos lista={datos.pagos} hoy={datos.hoy} />}
        {pestana === 'marketing' && <Marketing retornoTikTok={retornoTikTok} alTerminarRetorno={() => { setRetornoTikTok(null); history.replaceState(null, '', location.pathname) }} sesion={sesion.sesion} hoy={datos?.hoy ?? new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Caracas' }).format(new Date())} alSalir={alSalir} />}
        {pestana === 'cobros' && <Cobros sesion={sesion.sesion} alSalir={alSalir} alCambiar={() => void cargar()} />}
        </>}

        <p className="mt-10 text-center text-[13px] text-muted lg:hidden">
          {sesion.email} · <button type="button" onClick={alSalir} className="underline underline-offset-4">Cerrar sesión</button>
        </p>
        </div>
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-10 border-t border-line bg-bg/95 pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur lg:hidden" aria-label="Secciones">
        <div className="mx-auto grid max-w-xl grid-cols-6">
          {pestanas.map((p) => (
            <Tab key={p} activa={pestana === p} onClick={() => ir(p)} d={ICONO[p]} contador={contador(p)}>{TITULO[p]}</Tab>
          ))}
        </div>
      </nav>
      </div>

      {abierto && datos && (
        <Detalle negocio={abierto} precio={datos.precio} sesion={sesion.sesion} onCerrar={() => setAbierto(null)} onCambio={cargar} onAFondo={aFondo ? undefined : () => verAFondo(abierto.slug)} />
      )}
      {nuevo && <NuevoNegocio inicial={nuevo} sesion={sesion.sesion} onCerrar={() => setNuevo(null)} onCreado={async () => { setNuevo(null); await cargar() }} />}
    </div>
  )
}

function TablaNegocios({ lista, metricas, hoy, onAFondo, onGestionar }: {
  lista: api.Negocio[]
  metricas: Map<string, api.NegocioMetricas>
  hoy: string
  onAFondo: (slug: string) => void
  onGestionar: (n: api.Negocio) => void
}) {
  if (!lista.length) return <p className="mt-6 hidden text-center text-[15px] text-muted lg:block">No hay negocios con ese filtro.</p>
  return (
    <div className="relative mt-4 hidden overflow-x-auto rounded-3xl bg-surface shadow-card ring-1 ring-line lg:block">
      <table className="w-full text-left text-[14px]">
        <thead className="whitespace-nowrap border-b border-line text-[12px] text-muted">
          <tr>
            <th scope="col" className="py-3 pl-5 pr-3 font-medium">Negocio</th>
            <th scope="col" className="px-3 py-3 font-medium">Estado</th>
            <th scope="col" className="px-3 py-3 font-medium">Plan</th>
            <th scope="col" className="px-3 py-3 text-right font-medium">Reservas 30 d</th>
            <th scope="col" className="px-3 py-3 font-medium">6 meses</th>
            <th scope="col" className="px-3 py-3 font-medium">Última reserva</th>
            <th scope="col" className="px-3 py-3 font-medium">Contacto</th>
            <th scope="col" className="py-3 pl-3 pr-5"><span className="sr-only">Acciones</span></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {lista.map((n) => {
            const m = metricas.get(n.slug)
            return (
              <tr key={n.slug} className="hover:bg-sand/40">
                <td className="max-w-[240px] py-3 pl-5 pr-3">
                  <button type="button" onClick={() => onAFondo(n.slug)} className="block max-w-full truncate text-left font-semibold hover:underline">{n.nombre}</button>
                  <span className="block truncate text-[12px] text-muted">/u/{n.slug} · desde {fechaCorta(n.creado) || '—'}</span>
                </td>
                <td className="px-3 py-3">
                  <span className={'whitespace-nowrap rounded-full px-2 py-0.5 text-[12px] font-semibold ' + ETIQUETA[n.estado].clase}>{ETIQUETA[n.estado].texto}</span>
                  {n.plan === 'team' && <span className="ml-1.5"><EtiquetaTeam n={n} /></span>}
                </td>
                <td className={'px-3 py-3 text-[13px] ' + (n.dias !== null && n.dias <= 5 && n.estado !== 'suspendido' ? 'font-semibold text-danger' : 'text-muted')}>{textoVence(n)}</td>
                <td className="px-3 py-3 text-right font-semibold tabular-nums">{m ? (m.reservas30 ?? '—') : <span className="inline-block h-4 w-8 animate-pulse rounded bg-sand" />}</td>
                <td className="px-3 py-3">{m && <Minibarras valores={m.porMes} etiqueta={`Reservas de los últimos 6 meses: ${m.porMes.join(', ')}`} />}</td>
                <td className="whitespace-nowrap px-3 py-3 text-[13px] text-muted">{m ? haceDias(m.ultimaReserva, hoy) || 'nunca' : ''}</td>
                <td className="max-w-[200px] px-3 py-3 text-[13px] text-muted"><span className="block truncate">{n.email || '—'}</span><span className="block truncate">{n.telefono}</span></td>
                <td className="whitespace-nowrap py-3 pl-3 pr-5 text-right">
                  <button type="button" onClick={() => onGestionar(n)} className="rounded-full px-3 py-1.5 text-[13px] font-semibold ring-1 ring-line hover:bg-sand">Gestionar</button>
                  <button type="button" onClick={() => onAFondo(n.slug)} className="ml-2 rounded-full bg-ink px-3 py-1.5 text-[13px] font-semibold text-bg">Ver a fondo</button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

const orden = (n: api.Negocio) => ({ vencido: 0, pendiente: 1, prueba: 2, activo: 3, sin_fecha: 4, suspendido: 5 })[n.estado]

function Cifra({ valor, etiqueta, alerta, activo, onClick }: { valor: number; etiqueta: string; alerta?: boolean; activo: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={activo}
      className={'rounded-3xl p-4 text-left ring-1 ' + (activo ? 'bg-ink text-bg ring-ink' : 'bg-surface shadow-card ring-line')}>
      <span className={'block font-display text-[34px] leading-none ' + (alerta && !activo ? 'text-danger' : '')}>{valor}</span>
      <span className={'mt-1 block text-[13px] ' + (activo ? 'opacity-80' : 'text-muted')}>{etiqueta}</span>
    </button>
  )
}

function Tab({ activa, onClick, d, contador, children }: { activa: boolean; onClick: () => void; d: string; contador?: number; children: ReactNode }) {
  return (
    <button type="button" onClick={onClick} aria-current={activa ? 'page' : undefined} className={'relative flex flex-col items-center gap-1 py-2 text-[12px] ' + (activa ? 'font-semibold text-ink' : 'text-muted')}>
      <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth={activa ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d={d} /></svg>
      {children}
      {!!contador && <span className="absolute right-[calc(50%-22px)] top-1 grid min-w-5 place-items-center rounded-full bg-danger px-1 text-[11px] font-bold text-white">{contador}</span>}
    </button>
  )
}

// ---------- Hojas (detalle y alta) ----------

function Hoja({ titulo, onCerrar, children }: { titulo: string; onCerrar: () => void; children: ReactNode }) {
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onCerrar()
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [onCerrar])
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 lg:items-center lg:p-6" role="dialog" aria-modal="true" aria-label={titulo} onClick={onCerrar}>
      <div className="max-h-[92dvh] w-full max-w-xl overflow-y-auto rounded-t-[28px] bg-bg lg:rounded-[28px] lg:pb-6 px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-3" onClick={(e) => e.stopPropagation()}>
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-line lg:hidden" />
        <div className="mb-4 flex items-start justify-between gap-3">
          <h2 className="font-display text-[28px] leading-tight">{titulo}</h2>
          <button type="button" onClick={onCerrar} aria-label="Cerrar" className="grid size-10 shrink-0 place-items-center rounded-full ring-1 ring-line">×</button>
        </div>
        {children}
      </div>
    </div>
  )
}

const claseInput = 'w-full min-w-0 rounded-2xl bg-surface px-3.5 py-3 text-[16px] ring-1 ring-line outline-none focus:ring-2 focus:ring-ink'

function Campo({ etiqueta, ayuda, children }: { etiqueta: string; ayuda?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[14px] font-semibold">{etiqueta}</span>
      {children}
      {ayuda && <span className="mt-1 block text-[13px] text-muted">{ayuda}</span>}
    </label>
  )
}

const METODOS = ['Pago Móvil', 'Zelle', 'Binance', 'Efectivo', 'Transferencia', 'Otro']

function Detalle({ negocio: n, precio, sesion, onCerrar, onCambio, onAFondo }: { negocio: api.Negocio; precio: number; sesion: string; onCerrar: () => void; onCambio: () => Promise<void>; onAFondo?: () => void }) {
  const [vista, setVista] = useState<'info' | 'pago' | 'editar'>('info')
  const [meses, setMeses] = useState(1)
  // Cada negocio paga según su plan (bookeaa team cobra por personas).
  precio = n.precio ?? precio
  const [monto, setMonto] = useState(String(precio))
  const [metodo, setMetodo] = useState('Pago Móvil')
  const [referencia, setReferencia] = useState('')
  const [ed, setEd] = useState({ email: n.email, telefono: n.telefono, vence: n.vence, notas: n.notas })
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState('')
  const [hecho, setHecho] = useState('')

  const hacer = async (accion: () => Promise<unknown>, listo: string) => {
    setOcupado(true)
    setError('')
    try {
      await accion()
      await onCambio()
      setHecho(listo)
      setVista('info')
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setOcupado(false)
    }
  }

  const wa = n.telefono ? `https://wa.me/${api.telefonoWa(n.telefono)}?text=${encodeURIComponent(mensajeCobro(n, precio))}` : ''

  return (
    <Hoja titulo={n.nombre} onCerrar={onCerrar}>
      <div className="flex flex-wrap items-center gap-2">
        <span className={'rounded-full px-2.5 py-1 text-[13px] font-semibold ' + ETIQUETA[n.estado].clase}>{ETIQUETA[n.estado].texto}</span>
        {n.plan === 'team' && <EtiquetaTeam n={n} />}
        <span className="text-[14px] text-muted">{textoVence(n)}</span>
      </div>
      {hecho && <p role="status" className="mt-3 rounded-2xl bg-ok/12 px-4 py-3 text-[14px] text-ok">{hecho}</p>}
      {error && <p role="alert" className="mt-3 rounded-2xl bg-danger/10 px-4 py-3 text-[14px] text-danger">{error}</p>}

      {vista === 'info' && (
        <>
          <dl className="mt-4 divide-y divide-line rounded-3xl bg-surface px-4 text-[14px] ring-1 ring-line">
            {[
              ['Página', `bookeaa.com/u/${n.slug}`],
              ['Gmail', n.email || '—'],
              ['WhatsApp', n.telefono || '—'],
              ['Alta', n.creado ? fechaCorta(n.creado) : '—'],
              ['Último pago', n.ultimoPago ? fechaCorta(n.ultimoPago) : 'Nunca'],
              ['Plan', n.plan === 'team' ? `bookeaa team · ${n.personas ?? 0} personas · $${n.precio ?? precio}/mes` : `Individual · $${n.precio ?? precio}/mes`],
              ...(n.notas ? [['Notas', n.notas]] : []),
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4 py-3">
                <dt className="text-muted">{k}</dt>
                <dd className="min-w-0 truncate text-right font-medium">{v}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-4 grid gap-2">
            {onAFondo && <button type="button" onClick={onAFondo} className="rounded-full px-5 py-3.5 text-[15px] font-semibold ring-1 ring-line">📊 Ver el negocio a fondo</button>}
            <button type="button" onClick={() => { setVista('pago'); setHecho('') }} className="rounded-full bg-ink px-5 py-3.5 text-[15px] font-semibold text-bg">Registrar pago</button>
            {wa && (
              <a href={wa} target="_blank" rel="noopener noreferrer" className="rounded-full px-5 py-3.5 text-center text-[15px] font-semibold ring-1 ring-line">
                {n.estado === 'pendiente' || n.estado === 'vencido' ? 'Cobrar por WhatsApp' : 'Escribir por WhatsApp'}
              </a>
            )}
            {n.estado === 'sin_fecha' && n.creado && (
              <button type="button" disabled={ocupado} onClick={() => void hacer(async () => { const r = await api.usarIngreso(sesion, n.slug); setEd((x) => ({ ...x, vence: r.vence })) }, `Fecha de corte: el día ${Number(n.creado.slice(8, 10))} de cada mes, como su fecha de ingreso.`)}
                className="rounded-full px-5 py-3.5 text-[15px] font-semibold ring-1 ring-line disabled:opacity-50">
                Usar fecha de ingreso como corte (día {Number(n.creado.slice(8, 10))})
              </button>
            )}
            <div className="grid grid-cols-2 gap-2">
              <a href={`/u/${n.slug}`} target="_blank" rel="noopener noreferrer" className="rounded-full px-4 py-3 text-center text-[14px] font-semibold ring-1 ring-line">Ver página</a>
              {n.hoja ? <a href={n.hoja} target="_blank" rel="noopener noreferrer" className="rounded-full px-4 py-3 text-center text-[14px] font-semibold ring-1 ring-line">Abrir hoja</a> : <span />}
            </div>
            <button type="button" disabled={ocupado}
              onClick={() => void hacer(() => api.editar(sesion, n.slug, { plan: n.plan === 'team' ? 'individual' : 'team' }), n.plan === 'team' ? 'Ahora es individual ($10 al mes).' : 'Ahora es bookeaa team: ya puede armar su equipo en Mi negocio.')}
              className="rounded-full px-5 py-3.5 text-[15px] font-semibold ring-1 ring-line disabled:opacity-50">
              {n.plan === 'team' ? 'Pasar a individual' : '👥 Pasar a bookeaa team'}
            </button>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setVista('editar')} className="rounded-full px-4 py-3 text-[14px] font-semibold ring-1 ring-line">Editar datos</button>
              <button type="button" disabled={ocupado} onClick={() => void hacer(() => api.cambiarActivo(sesion, n.slug, !n.activo), n.activo ? 'Página suspendida: ya no recibe reservas.' : 'Página reactivada.')}
                className={'rounded-full px-4 py-3 text-[14px] font-semibold ring-1 disabled:opacity-50 ' + (n.activo ? 'text-danger ring-danger/40' : 'ring-line')}>
                {n.activo ? 'Suspender' : 'Reactivar'}
              </button>
            </div>
          </div>
        </>
      )}

      {vista === 'pago' && (
        <div className="mt-4 space-y-4">
          <div>
            <span className="mb-1.5 block text-[14px] font-semibold">Meses</span>
            <div className="flex items-center gap-3">
              <button type="button" aria-label="Menos" onClick={() => { const m = Math.max(1, meses - 1); setMeses(m); setMonto(String(m * precio)) }} className="grid size-12 place-items-center rounded-2xl text-[22px] ring-1 ring-line">−</button>
              <span className="w-10 text-center text-[24px] font-semibold tabular-nums">{meses}</span>
              <button type="button" aria-label="Más" onClick={() => { const m = Math.min(12, meses + 1); setMeses(m); setMonto(String(m * precio)) }} className="grid size-12 place-items-center rounded-2xl text-[22px] ring-1 ring-line">+</button>
            </div>
          </div>
          <Campo etiqueta="Monto (USD)"><input inputMode="decimal" value={monto} onChange={(e) => setMonto(e.target.value)} className={claseInput} /></Campo>
          <div>
            <span className="mb-1.5 block text-[14px] font-semibold">Método</span>
            <div className="flex flex-wrap gap-2">
              {METODOS.map((m) => (
                <button key={m} type="button" aria-pressed={metodo === m} onClick={() => setMetodo(m)} className={'rounded-full px-3.5 py-2 text-[14px] ring-1 ' + (metodo === m ? 'bg-ink text-bg ring-ink' : 'ring-line')}>{m}</button>
              ))}
            </div>
          </div>
          <Campo etiqueta="Referencia" ayuda="Opcional: número de operación o nota."><input value={referencia} onChange={(e) => setReferencia(e.target.value)} className={claseInput} /></Campo>
          <p className="rounded-2xl bg-sand px-4 py-3 text-[14px]">
            Queda pagado hasta el <b>{fechaCorta(sumarMeses(n.vence && n.dias !== null && n.dias >= 0 ? n.vence : hoyLocal(), meses))}</b>
            {!n.activo && ' y la página se reactiva.'}
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setVista('info')} className="rounded-full px-4 py-3.5 text-[15px] font-semibold ring-1 ring-line">Cancelar</button>
            <button type="button" disabled={ocupado} onClick={() => void hacer(() => api.registrarPago(sesion, { slug: n.slug, meses, monto: Number(monto.replace(',', '.')) || 0, metodo, referencia }), 'Pago registrado.')}
              className="rounded-full bg-ink px-4 py-3.5 text-[15px] font-semibold text-bg disabled:opacity-50">{ocupado ? 'Guardando…' : 'Guardar pago'}</button>
          </div>
        </div>
      )}

      {vista === 'editar' && (
        <div className="mt-4 space-y-4">
          <Campo etiqueta="Gmail del dueño" ayuda="Con este correo entra a Mi negocio. Varios, separados por coma.">
            <input inputMode="email" value={ed.email} onChange={(e) => setEd({ ...ed, email: e.target.value })} className={claseInput} />
          </Campo>
          <Campo etiqueta="WhatsApp" ayuda="Con código de país: 584121234567"><input inputMode="tel" value={ed.telefono} onChange={(e) => setEd({ ...ed, telefono: e.target.value })} className={claseInput} /></Campo>
          <Campo etiqueta="Pagado / prueba hasta" ayuda="Solo si necesitas corregirlo a mano."><input type="date" value={ed.vence} onChange={(e) => setEd({ ...ed, vence: e.target.value })} className={claseInput} /></Campo>
          <Campo etiqueta="Notas (solo las ves tú)"><textarea rows={3} value={ed.notas} onChange={(e) => setEd({ ...ed, notas: e.target.value })} className={claseInput} /></Campo>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setVista('info')} className="rounded-full px-4 py-3.5 text-[15px] font-semibold ring-1 ring-line">Cancelar</button>
            <button type="button" disabled={ocupado} onClick={() => void hacer(() => api.editar(sesion, n.slug, ed), 'Datos guardados.')} className="rounded-full bg-ink px-4 py-3.5 text-[15px] font-semibold text-bg disabled:opacity-50">
              {ocupado ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
        </div>
      )}
    </Hoja>
  )
}

const hoyLocal = () => new Date(Date.now() - 4 * 3600_000).toISOString().slice(0, 10)

/** Igual que sumarMeses_ del Apps Script (respeta el fin de mes). */
export function sumarMeses(ymd: string, meses: number): string {
  const [a, m, d] = ymd.split('-').map(Number)
  const destino = new Date(Date.UTC(a, m - 1 + meses, 1))
  const ultimo = new Date(Date.UTC(destino.getUTCFullYear(), destino.getUTCMonth() + 1, 0)).getUTCDate()
  destino.setUTCDate(Math.min(d, ultimo))
  return destino.toISOString().slice(0, 10)
}

function NuevoNegocio({ inicial, sesion, onCerrar, onCreado }: { inicial: Partial<{ nombre: string; email: string; telefono: string }>; sesion: string; onCerrar: () => void; onCreado: () => Promise<void> }) {
  const [nombre, setNombre] = useState(inicial.nombre ?? '')
  const [slug, setSlug] = useState(api.slugDe(inicial.nombre ?? ''))
  const [slugTocado, setSlugTocado] = useState(false)
  const [email, setEmail] = useState(inicial.email ?? '')
  const [telefono, setTelefono] = useState(inicial.telefono ?? '')
  const [dias, setDias] = useState('30')
  const [notas, setNotas] = useState('')
  const [plan, setPlan] = useState<'individual' | 'team'>('individual')
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState('')

  const crear = async () => {
    setError('')
    if (!nombre.trim()) return setError('Escribe el nombre del negocio.')
    if (!/^[a-z0-9](?:[a-z0-9-]{0,30}[a-z0-9])?$/.test(slug)) return setError('El link solo lleva minúsculas, números y guiones.')
    setOcupado(true)
    try {
      await api.crear(sesion, { nombre: nombre.trim(), slug, email: email.trim(), telefono, diasPrueba: Number(dias) || 0, notas, plan })
      await onCreado()
    } catch (e) {
      setError((e as Error).message)
      setOcupado(false)
    }
  }

  return (
    <Hoja titulo="Nuevo negocio" onCerrar={ocupado ? () => {} : onCerrar}>
      <div className="space-y-4">
        <Campo etiqueta="Nombre del negocio">
          <input value={nombre} autoFocus onChange={(e) => { setNombre(e.target.value); if (!slugTocado) setSlug(api.slugDe(e.target.value)) }} className={claseInput} />
        </Campo>
        <Campo etiqueta="Link" ayuda={`bookeaa.com/u/${slug || '…'}`}>
          <input value={slug} onChange={(e) => { setSlugTocado(true); setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')) }} className={claseInput + ' font-mono'} />
        </Campo>
        <Campo etiqueta="Gmail del dueño" ayuda="Recibe su hoja, su calendario y entra a Mi negocio con este correo.">
          <input inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="negocio@gmail.com" className={claseInput} />
        </Campo>
        <Campo etiqueta="WhatsApp del dueño" ayuda="Para cobrarle y escribirle desde aquí."><input inputMode="tel" value={telefono} onChange={(e) => setTelefono(e.target.value)} placeholder="584121234567" className={claseInput} /></Campo>
        <div>
          <span className="mb-1.5 block text-[14px] font-semibold">Plan</span>
          <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Plan">
            {([['individual', 'Individual', '$10 al mes'], ['team', 'bookeaa team', '$25 hasta 5 personas']] as const).map(([id, t, d]) => (
              <button key={id} type="button" role="radio" aria-checked={plan === id} onClick={() => setPlan(id)}
                className={'rounded-2xl px-3 py-3 text-left ring-1 ' + (plan === id ? 'bg-sand ring-ink' : 'ring-line')}>
                <span className="block text-[15px] font-semibold">{t}</span>
                <span className="block text-[13px] text-muted">{d}</span>
              </button>
            ))}
          </div>
        </div>
        <Campo etiqueta="Días de prueba gratis"><input inputMode="numeric" value={dias} onChange={(e) => setDias(e.target.value.replace(/\D/g, ''))} className={claseInput} /></Campo>
        <Campo etiqueta="Notas (opcional)"><textarea rows={2} value={notas} onChange={(e) => setNotas(e.target.value)} className={claseInput} /></Campo>
        {error && <p role="alert" className="rounded-2xl bg-danger/10 px-4 py-3 text-[14px] text-danger">{error}</p>}
        <button type="button" disabled={ocupado} onClick={() => void crear()} className="w-full rounded-full bg-ink px-5 py-3.5 text-[16px] font-semibold text-bg disabled:opacity-60">
          {ocupado ? 'Creando hoja, calendario y carpeta… (≈ 30 s)' : 'Crear negocio'}
        </button>
      </div>
    </Hoja>
  )
}

function EtiquetaTeam({ n }: { n: Pick<api.Negocio, 'personas'> }) {
  return <span className="shrink-0 rounded-full bg-ink px-2 py-0.5 text-[12px] font-semibold text-bg">team · {n.personas ?? 0}</span>
}

// ---------- Prospectos y pagos ----------

function Prospectos({ lista, onCrear }: { lista: api.Prospecto[]; onCrear: (p: api.Prospecto) => void }) {
  if (!lista.length) return <p className="mt-10 text-center text-[15px] text-muted">No hay prospectos pendientes. Aquí salen los que agendan su afiliación con el bot de WhatsApp.</p>
  return (
    <>
      <p className="mt-1 text-[14px] text-muted">Agendaron su afiliación con el bot y todavía no son negocio.</p>
      <ul className="mt-3 space-y-2.5">
        {lista.map((p, i) => (
          <li key={i} className="rounded-3xl bg-surface p-4 shadow-card ring-1 ring-line">
            <p className="text-[16px] font-semibold">{p.negocio}</p>
            <p className="text-[13px] text-muted">
              {[p.nombre, p.correo, p.modalidad].filter(Boolean).join(' · ')}
            </p>
            {p.cita && <p className="mt-1 text-[14px]">📅 Cita: {fechaCorta(p.cita.slice(0, 10))}{p.cita.length > 10 ? ` · ${p.cita.slice(11, 16)}` : ''} {p.estado && <span className="text-muted">· {p.estado}</span>}</p>}
            <div className="mt-3 grid grid-cols-2 gap-2">
              {p.telefono ? (
                <a href={`https://wa.me/${api.telefonoWa(p.telefono)}`} target="_blank" rel="noopener noreferrer" className="rounded-full px-4 py-2.5 text-center text-[14px] font-semibold ring-1 ring-line">WhatsApp</a>
              ) : <span />}
              <button type="button" onClick={() => onCrear(p)} className="rounded-full bg-ink px-4 py-2.5 text-[14px] font-semibold text-bg">Crear negocio</button>
            </div>
          </li>
        ))}
      </ul>
    </>
  )
}

function Pagos({ lista, hoy }: { lista: api.Pago[]; hoy: string }) {
  const mes = hoy.slice(0, 7)
  const delMes = lista.filter((p) => p.fecha.slice(0, 7) === mes).reduce((t, p) => t + p.monto, 0)
  return (
    <>
      <section className="rounded-3xl bg-ink px-5 py-5 text-bg">
        <p className="text-[13px] uppercase tracking-[0.12em] opacity-70">Cobrado este mes</p>
        <p className="mt-1 font-display text-[40px] leading-none">${delMes.toLocaleString('es-VE', { maximumFractionDigits: 2 })}</p>
      </section>
      <ul className="mt-4 divide-y divide-line overflow-hidden rounded-3xl bg-surface ring-1 ring-line">
        {lista.length === 0 && <li className="px-4 py-6 text-center text-[15px] text-muted">Todavía no hay pagos registrados.</li>}
        {lista.map((p, i) => (
          <li key={i} className="flex items-center justify-between gap-3 px-4 py-3">
            <div className="min-w-0">
              <p className="truncate text-[15px] font-semibold">{p.negocio}</p>
              <p className="truncate text-[13px] text-muted">{fechaCorta(p.fecha.slice(0, 10))} · {p.metodo}{p.referencia ? ` · ${p.referencia}` : ''} · hasta {fechaCorta(p.venceNuevo)}</p>
            </div>
            <p className="shrink-0 text-[16px] font-semibold tabular-nums">${p.monto}{p.meses > 1 ? <span className="text-[12px] font-normal text-muted"> · {p.meses} m</span> : null}</p>
          </li>
        ))}
      </ul>
    </>
  )
}
