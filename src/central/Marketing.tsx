import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { capitalize, formatLongDate, formatWeekdayShort } from '../lib/format'
import * as api from './api'
import { crearIcs, paraAlarmas } from './ics'
import semilla from './marketing-semilla.json'
import { ESTADO_PUB, atrasada, contar, mesAnterior, mesSiguiente, ordenar, porDia, semanasDelMes, textoParaPublicar, tipoPub } from './marketing'
import { fechaCorta } from './estados'

/**
 * Marketing (Central): el calendario y la cola de publicaciones. Cada publicación pasa por
 * borrador → aprobado → publicado (u omitido). Aquí se aprueba y se edita el texto; la
 * producción (videos, voz, carruseles) sigue en la carpeta marketing/ del repositorio.
 */

const claseInput = 'w-full min-w-0 rounded-2xl bg-surface px-3.5 py-3 text-[16px] ring-1 ring-line outline-none focus:ring-2 focus:ring-ink'
const FILTROS = [
  ['pendientes', 'Por publicar'],
  ['borrador', 'Borradores'],
  ['aprobado', 'Aprobadas'],
  ['publicado', 'Publicadas'],
  ['todas', 'Todas'],
] as const
type Filtro = (typeof FILTROS)[number][0]

const horaCaracas = () => new Intl.DateTimeFormat('en-GB', { timeZone: 'America/Caracas', hour: '2-digit', minute: '2-digit' }).format(new Date())

type Retorno = { code: string; state: string } | { error: string } | null

export function Marketing({ sesion, hoy, alSalir, retornoTikTok, alTerminarRetorno }: {
  sesion: string
  hoy: string
  alSalir: () => void
  retornoTikTok?: Retorno
  alTerminarRetorno?: () => void
}) {
  const [lista, setLista] = useState<api.Publicacion[] | null>(null)
  const [error, setError] = useState('')
  const [vista, setVista] = useState<'cola' | 'calendario'>('cola')
  const [filtro, setFiltro] = useState<Filtro>('pendientes')
  const [mes, setMes] = useState((hoy || new Date().toISOString().slice(0, 10)).slice(0, 7))
  const [dia, setDia] = useState<string | null>(null)
  const [abierta, setAbierta] = useState<api.Publicacion | null>(null)
  const [importando, setImportando] = useState(false)
  const [tt, setTt] = useState<api.EstadoTikTok | null>(null)
  const [avisoTt, setAvisoTt] = useState('')
  const [ocupadoTt, setOcupadoTt] = useState(false)

  const falla = useCallback(
    (e: unknown) => {
      if (e instanceof api.ErrorCentral && e.codigo === 'sesion') return alSalir()
      setError((e as Error).message)
    },
    [alSalir],
  )
  const cargar = useCallback(async () => {
    try {
      setError('')
      setLista(ordenar((await api.marketing(sesion)).publicaciones))
    } catch (e) {
      falla(e)
    }
  }, [sesion, falla])
  useEffect(() => {
    void cargar()
  }, [cargar])

  const cargarTt = useCallback(async () => {
    try {
      setTt(await api.tiktokEstado(sesion))
    } catch (e) {
      falla(e)
    }
  }, [sesion, falla])
  useEffect(() => {
    void cargarTt()
  }, [cargarTt])

  // Vuelta de TikTok tras autorizar: se canjea el código (una sola vez) y se limpia la URL.
  const procesado = useRef(false)
  useEffect(() => {
    if (!retornoTikTok || procesado.current) return
    procesado.current = true
    void (async () => {
      try {
        if ('error' in retornoTikTok) setAvisoTt('TikTok no completó la conexión: ' + retornoTikTok.error)
        else {
          const r = await api.tiktokConectar(sesion, retornoTikTok.code, retornoTikTok.state)
          setAvisoTt(`TikTok conectado como ${r.usuario}.`)
        }
      } catch (e) {
        if (e instanceof api.ErrorCentral && e.codigo === 'sesion') return alSalir()
        setAvisoTt((e as Error).message)
      } finally {
        alTerminarRetorno?.()
        await cargarTt()
      }
    })()
  }, [retornoTikTok, sesion, alSalir, alTerminarRetorno, cargarTt])

  const conectarTt = async () => {
    setOcupadoTt(true)
    try {
      const { url } = await api.tiktokUrl(sesion)
      if (url.startsWith('http')) location.href = url
      else setAvisoTt('Modo demo: no hay conexión real con TikTok.')
    } catch (e) {
      falla(e)
    } finally {
      setOcupadoTt(false)
    }
  }
  const desconectarTt = async () => {
    setOcupadoTt(true)
    try {
      await api.tiktokDesconectar(sesion)
      setAvisoTt('TikTok desconectado.')
      await cargarTt()
    } catch (e) {
      falla(e)
    } finally {
      setOcupadoTt(false)
    }
  }

  const importar = async () => {
    setImportando(true)
    try {
      await api.marketingImportar(sesion, semilla as Omit<api.Publicacion, 'publicadoEn'>[])
      await cargar()
    } catch (e) {
      falla(e)
    } finally {
      setImportando(false)
    }
  }

  const ahora = horaCaracas()
  const alarmas = paraAlarmas(lista ?? [], 'TikTok', hoy)
  const bajarAlarmas = () => {
    const url = URL.createObjectURL(new Blob([crearIcs(alarmas)], { type: 'text/calendar;charset=utf-8' }))
    const a = Object.assign(document.createElement('a'), { href: url, download: 'bookeaa-alarmas-tiktok.ics' })
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 2000)
  }
  const visibles = useMemo(
    () => (lista ?? []).filter((p) => (filtro === 'todas' ? true : filtro === 'pendientes' ? p.estado === 'borrador' || p.estado === 'aprobado' : p.estado === filtro)),
    [lista, filtro],
  )
  const deHoy = (lista ?? []).filter((p) => p.fecha === hoy)
  const atrasadas = (lista ?? []).filter((p) => atrasada(p, hoy, ahora)).length

  if (!lista && !error) return <div className="mt-2 h-[420px] animate-pulse rounded-3xl bg-sand" aria-busy="true" />

  return (
    <div>
      {error && <div role="alert" className="mb-4 rounded-2xl bg-danger/10 px-4 py-3 text-[14px] text-danger">{error}</div>}
      {avisoTt && (
        <div role="status" className="mb-4 flex items-start justify-between gap-3 rounded-2xl bg-sand px-4 py-3 text-[14px]">
          <span>{avisoTt}</span>
          <button type="button" onClick={() => setAvisoTt('')} aria-label="Cerrar aviso" className="shrink-0 text-muted">×</button>
        </div>
      )}
      {tt && (
        <section className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-3xl bg-surface p-4 shadow-card ring-1 ring-line" aria-label="TikTok">
          <div className="min-w-0">
            <p className="text-[15px] font-semibold">TikTok</p>
            <p className="text-[13px] text-muted">
              {tt.conectado ? <>Conectado como <b className="text-ink">{tt.usuario}</b>. Los videos llegan a tus borradores y tú los publicas.</>
                : tt.configurado ? 'Conecta tu cuenta para mandar videos a tus borradores.'
                : 'Faltan las claves: en el Apps Script, menú SaaS Reservas → "TikTok: guardar claves de la app".'}
            </p>
            {tt.configurado && (
              <p className="mt-1 text-[12px] text-muted">
                Client key en uso: <span className="font-mono">{tt.pista || '—'}</span> ({tt.sandbox ? 'sandbox' : 'producción'}) · Redirect URI: <span className="font-mono">{tt.redirect}</span>
              </p>
            )}
          </div>
          {tt.conectado ? (
            <button type="button" onClick={() => void desconectarTt()} disabled={ocupadoTt} className="rounded-full px-4 py-2 text-[14px] ring-1 ring-line disabled:opacity-50">Desconectar</button>
          ) : tt.configurado ? (
            <button type="button" onClick={() => void conectarTt()} disabled={ocupadoTt} className="rounded-full bg-ink px-5 py-2.5 text-[14px] font-semibold text-bg disabled:opacity-50">Conectar TikTok</button>
          ) : null}
        </section>
      )}

      {lista && lista.length === 0 && (
        <section className="rounded-3xl bg-surface p-6 text-center shadow-card ring-1 ring-line">
          <p className="font-display text-[26px] leading-tight">La cola está vacía</p>
          <p className="mt-2 text-[15px] text-muted">Importa el calendario de octubre: {semilla.length} publicaciones con su texto, fecha y hora de Caracas.</p>
          <button type="button" onClick={() => void importar()} disabled={importando} className="mt-4 rounded-full bg-ink px-5 py-3 text-[15px] font-semibold text-bg disabled:opacity-50">
            {importando ? 'Importando…' : 'Importar calendario'}
          </button>
        </section>
      )}

      {lista && lista.length > 0 && (
        <>
          <section className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
            <Cifra valor={deHoy.length} etiqueta="Hoy" nota={deHoy.filter((p) => p.estado === 'publicado').length + ' publicadas'} />
            <Cifra valor={contar(lista, 'borrador')} etiqueta="Por aprobar" alerta={atrasadas > 0} nota={atrasadas > 0 ? `${atrasadas} atrasadas` : undefined} />
            <Cifra valor={contar(lista, 'aprobado')} etiqueta="Aprobadas" />
            <Cifra valor={contar(lista, 'publicado')} etiqueta="Publicadas" />
          </section>

          <div className="mt-4 flex items-center justify-between gap-3">
            <div className="inline-flex rounded-full bg-sand p-1" role="tablist" aria-label="Vista">
              {(['cola', 'calendario'] as const).map((v) => (
                <button key={v} type="button" role="tab" aria-selected={vista === v} onClick={() => setVista(v)}
                  className={'rounded-full px-4 py-1.5 text-[14px] font-semibold ' + (vista === v ? 'bg-ink text-bg' : 'text-muted')}>
                  {v === 'cola' ? 'Cola' : 'Calendario'}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap justify-end gap-x-4 gap-y-1">
              {alarmas.length > 0 && (
                <button type="button" onClick={bajarAlarmas} className="text-[13px] font-semibold underline underline-offset-4">
                  Alarmas de TikTok ({alarmas.length})
                </button>
              )}
              <button type="button" onClick={() => void importar()} disabled={importando} className="text-[13px] text-muted underline underline-offset-4 disabled:opacity-50">
                {importando ? 'Importando…' : 'Importar calendario'}
              </button>
            </div>
          </div>

          {vista === 'cola' && (
            <>
              <div className="-mx-5 mt-3 flex gap-2 overflow-x-auto px-5 pb-1 no-scrollbar lg:mx-0 lg:px-0">
                {FILTROS.map(([f, t]) => (
                  <button key={f} type="button" aria-pressed={filtro === f} onClick={() => setFiltro(f)}
                    className={'shrink-0 rounded-full px-3.5 py-1.5 text-[14px] ring-1 ' + (filtro === f ? 'bg-ink text-bg ring-ink' : 'ring-line')}>
                    {t}
                  </button>
                ))}
              </div>
              <Dias grupos={porDia(visibles)} hoy={hoy} ahora={ahora} onAbrir={setAbierta} vacio="No hay publicaciones con ese filtro." />
            </>
          )}

          {vista === 'calendario' && (
            <Calendario lista={lista} mes={mes} hoy={hoy} dia={dia} ahora={ahora}
              onMes={setMes} onDia={(d) => setDia(dia === d ? null : d)} onAbrir={setAbierta} />
          )}
        </>
      )}

      {abierta && (
        <Detalle tt={tt} pub={abierta} sesion={sesion} onCerrar={() => setAbierta(null)} onCambio={async () => { setAbierta(null); await cargar() }} falla={falla} />
      )}
    </div>
  )
}

function Cifra({ valor, etiqueta, nota, alerta }: { valor: number; etiqueta: string; nota?: string; alerta?: boolean }) {
  return (
    <div className="rounded-3xl bg-surface p-4 shadow-card ring-1 ring-line">
      <p className={'font-display text-[34px] leading-none ' + (alerta ? 'text-danger' : '')}>{valor}</p>
      <p className="mt-1 text-[14px] text-muted">{etiqueta}</p>
      {nota && <p className={'text-[12px] ' + (alerta ? 'font-semibold text-danger' : 'text-muted')}>{nota}</p>}
    </div>
  )
}

function Dias({ grupos, hoy, ahora, onAbrir, vacio }: { grupos: { fecha: string; items: api.Publicacion[] }[]; hoy: string; ahora: string; onAbrir: (p: api.Publicacion) => void; vacio: string }) {
  if (!grupos.length) return <p className="mt-6 text-center text-[15px] text-muted">{vacio}</p>
  return (
    <div className="mt-4 space-y-5">
      {grupos.map((g) => (
        <section key={g.fecha}>
          <h3 className="mb-2 flex items-baseline gap-2 text-[14px] font-semibold">
            <span className={g.fecha === hoy ? 'rounded-full bg-ink px-2.5 py-0.5 text-bg' : ''}>{g.fecha === hoy ? 'Hoy' : capitalize(formatWeekdayShort(g.fecha))}</span>
            <span className="font-normal text-muted">{fechaCorta(g.fecha)}</span>
          </h3>
          <ul className="space-y-2">
            {g.items.map((p) => (
              <li key={p.id}>
                <button type="button" onClick={() => onAbrir(p)} className="flex w-full items-center gap-3 rounded-3xl bg-surface p-3.5 text-left shadow-card ring-1 ring-line">
                  <span className="w-12 shrink-0 text-[15px] font-semibold tabular-nums">{p.hora || '—'}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-semibold">{p.titulo}</span>
                    <span className="block truncate text-[13px] text-muted">{tipoPub(p.tipo)}{p.plataforma ? ` · ${p.plataforma}` : ''}</span>
                  </span>
                  {atrasada(p, hoy, ahora) && <span className="shrink-0 rounded-full bg-danger/12 px-2 py-0.5 text-[12px] font-semibold text-danger">Atrasada</span>}
                  <span className={'shrink-0 rounded-full px-2.5 py-0.5 text-[12px] font-semibold ' + ESTADO_PUB[p.estado].clase}>{ESTADO_PUB[p.estado].texto}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}

function Calendario({ lista, mes, hoy, dia, ahora, onMes, onDia, onAbrir }: {
  lista: api.Publicacion[]
  mes: string
  hoy: string
  dia: string | null
  ahora: string
  onMes: (m: string) => void
  onDia: (d: string) => void
  onAbrir: (p: api.Publicacion) => void
}) {
  const porFecha = useMemo(() => {
    const m = new Map<string, api.Publicacion[]>()
    for (const p of lista) m.set(p.fecha, [...(m.get(p.fecha) ?? []), p])
    return m
  }, [lista])
  const semanas = semanasDelMes(mes)
  const delDia = dia ? porFecha.get(dia) ?? [] : []
  return (
    <div className="mt-4">
      <div className="mb-2 flex items-center justify-between">
        <button type="button" aria-label="Mes anterior" onClick={() => onMes(mesAnterior(mes))} className="grid size-10 place-items-center rounded-full ring-1 ring-line">‹</button>
        <p className="font-display text-[22px]">{capitalize(new Intl.DateTimeFormat('es-VE', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(mes + '-01T00:00:00Z')))}</p>
        <button type="button" aria-label="Mes siguiente" onClick={() => onMes(mesSiguiente(mes))} className="grid size-10 place-items-center rounded-full ring-1 ring-line">›</button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-[12px] text-muted">
        {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((d, i) => <span key={i}>{d}</span>)}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {semanas.flat().map((d) => {
          const items = porFecha.get(d) ?? []
          const fuera = d.slice(0, 7) !== mes
          return (
            <button key={d} type="button" onClick={() => onDia(d)} aria-label={`${fechaCorta(d)}: ${items.length} publicaciones`} aria-pressed={dia === d}
              className={'flex aspect-square min-h-12 flex-col items-center justify-between rounded-2xl p-1.5 text-[14px] ring-1 lg:aspect-auto lg:min-h-20 ' +
                (dia === d ? 'bg-ink text-bg ring-ink' : d === hoy ? 'bg-surface font-bold ring-ink' : 'bg-surface ring-line') + (fuera ? ' opacity-40' : '')}>
              <span>{+d.slice(8)}</span>
              <span className="flex flex-wrap justify-center gap-0.5" aria-hidden>
                {items.slice(0, 6).map((p) => <span key={p.id} className="size-1.5 rounded-full ring-1 ring-bg" style={{ background: ESTADO_PUB[p.estado].color }} />)}
              </span>
            </button>
          )
        })}
      </div>
      <p className="mt-2 flex flex-wrap gap-x-3 text-[12px] text-muted">
        {(Object.keys(ESTADO_PUB) as api.EstadoPublicacion[]).map((e) => (
          <span key={e} className="inline-flex items-center gap-1"><span className="size-2 rounded-full" style={{ background: ESTADO_PUB[e].color }} />{ESTADO_PUB[e].texto}</span>
        ))}
      </p>
      {dia && <Dias grupos={delDia.length ? [{ fecha: dia, items: delDia }] : []} hoy={hoy} ahora={ahora} onAbrir={onAbrir} vacio={`Nada programado el ${fechaCorta(dia)}.`} />}
    </div>
  )
}

function Detalle({ tt, pub, sesion, onCerrar, onCambio, falla }: { tt: api.EstadoTikTok | null; pub: api.Publicacion; sesion: string; onCerrar: () => void; onCambio: () => Promise<void>; falla: (e: unknown) => void }) {
  const [f, setF] = useState({ fecha: pub.fecha, hora: pub.hora, titulo: pub.titulo, caption: pub.caption, hashtags: pub.hashtags, media: pub.media, notas: pub.notas })
  const [guardando, setGuardando] = useState(false)
  const [copiado, setCopiado] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [aviso, setAviso] = useState('')
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onCerrar()
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [onCerrar])

  const cambios = (['fecha', 'hora', 'titulo', 'caption', 'hashtags', 'media', 'notas'] as const).filter((k) => f[k] !== pub[k])
  const guardar = async (extra: api.CamposPublicacion = {}) => {
    setGuardando(true)
    try {
      const campos: api.CamposPublicacion = { ...extra }
      for (const k of cambios) campos[k] = f[k]
      if (Object.keys(campos).length) await api.marketingGuardar(sesion, pub.id, campos)
      await onCambio()
    } catch (e) {
      falla(e)
      setGuardando(false)
    }
  }
  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(textoParaPublicar(f))
      setCopiado(true)
      setTimeout(() => setCopiado(false), 1800)
    } catch {
      /* sin portapapeles: se copia a mano */
    }
  }
  const esVideo = pub.tipo.startsWith('video')
  const puedeTt = esVideo || pub.tipo === 'carrusel'
  const enviarTt = async () => {
    setEnviando(true)
    setAviso('')
    try {
      const r = await api.tiktokEnviar(sesion, pub.id)
      setAviso(`Enviado a los borradores de ${r.usuario || 'tu TikTok'}. Abre TikTok, toca la notificación de tu bandeja y publícalo.`)
    } catch (e) {
      if (e instanceof api.ErrorCentral && e.codigo === 'sesion') return falla(e)
      setAviso((e as Error).message)
    } finally {
      setEnviando(false)
    }
  }
  const estados: [api.EstadoPublicacion, string][] =
    pub.estado === 'borrador' ? [['aprobado', 'Aprobar']]
    : pub.estado === 'aprobado' ? [['publicado', 'Marcar publicado'], ['borrador', 'Volver a borrador']]
    : [['borrador', 'Volver a borrador']]

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 lg:items-center lg:p-6" role="dialog" aria-modal="true" aria-label={pub.titulo} onClick={onCerrar}>
      <div className="max-h-[92dvh] w-full max-w-xl overflow-y-auto rounded-t-[28px] bg-bg px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-3 lg:rounded-[28px] lg:pb-6" onClick={(e) => e.stopPropagation()}>
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-line lg:hidden" />
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="font-display text-[26px] leading-tight">{pub.titulo}</h2>
            <p className="mt-1 flex flex-wrap items-center gap-2 text-[13px] text-muted">
              <span className={'rounded-full px-2.5 py-0.5 text-[12px] font-semibold ' + ESTADO_PUB[pub.estado].clase}>{ESTADO_PUB[pub.estado].texto}</span>
              {tipoPub(pub.tipo)} · {pub.plataforma || 'sin plataforma'}
            </p>
            {pub.publicadoEn && <p className="mt-1 text-[12px] text-muted">Publicado: {pub.publicadoEn}</p>}
          </div>
          <button type="button" onClick={onCerrar} aria-label="Cerrar" className="grid size-10 shrink-0 place-items-center rounded-full ring-1 ring-line">×</button>
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Campo etiqueta="Fecha"><input type="date" value={f.fecha} onChange={(e) => setF({ ...f, fecha: e.target.value })} className={claseInput} /></Campo>
            <Campo etiqueta="Hora (Caracas)"><input type="time" value={f.hora} onChange={(e) => setF({ ...f, hora: e.target.value })} className={claseInput} /></Campo>
          </div>
          <Campo etiqueta="Título"><input value={f.titulo} onChange={(e) => setF({ ...f, titulo: e.target.value })} className={claseInput} /></Campo>
          <Campo etiqueta="Texto de la publicación">
            <textarea value={f.caption} rows={5} maxLength={2200} onChange={(e) => setF({ ...f, caption: e.target.value })} className={claseInput} />
          </Campo>
          <Campo etiqueta="Hashtags"><input value={f.hashtags} onChange={(e) => setF({ ...f, hashtags: e.target.value })} className={claseInput} /></Campo>
          <Campo etiqueta="Link del video o de las imágenes" ayuda="Links públicos (no de Drive): Instagram no los puede descargar de Drive. En un carrusel, un link por lámina y en orden. Make solo publica si hay link.">
            <textarea value={f.media} rows={pub.tipo === 'carrusel' ? 4 : 2} inputMode="url" placeholder="https://…" onChange={(e) => setF({ ...f, media: e.target.value })} className={claseInput + ' text-[14px]'} />
          </Campo>
          <Campo etiqueta="Notas"><input value={f.notas} onChange={(e) => setF({ ...f, notas: e.target.value })} className={claseInput} /></Campo>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {estados.map(([e, t], i) => (
            <button key={e} type="button" disabled={guardando} onClick={() => void guardar({ estado: e })}
              className={'rounded-full px-5 py-3 text-[15px] font-semibold disabled:opacity-50 ' + (i === 0 && e !== 'borrador' ? 'bg-ink text-bg' : 'ring-1 ring-line')}>{t}</button>
          ))}
          {cambios.length > 0 && <button type="button" disabled={guardando} onClick={() => void guardar()} className="rounded-full bg-ink px-5 py-3 text-[15px] font-semibold text-bg disabled:opacity-50">Guardar cambios</button>}
          <button type="button" onClick={() => void copiar()} className="rounded-full px-5 py-3 text-[15px] ring-1 ring-line">{copiado ? '¡Copiado!' : 'Copiar texto'}</button>
          {f.media.trim() && (
            <a href={f.media.trim().split(/\s+/)[0]} target="_blank" rel="noreferrer" className="rounded-full px-5 py-3 text-[15px] ring-1 ring-line">Abrir {pub.tipo === 'carrusel' ? 'primera imagen' : 'video'}</a>
          )}
          {pub.estado !== 'omitido' && pub.estado !== 'publicado' && (
            <button type="button" disabled={guardando} onClick={() => void guardar({ estado: 'omitido' })} className="rounded-full px-5 py-3 text-[15px] text-muted underline underline-offset-4 disabled:opacity-50">Omitir</button>
          )}
        </div>
        {puedeTt && tt?.conectado && f.media.trim() && (
          <div className="mt-4 rounded-3xl bg-sand p-4">
            <p className="text-[14px]">Se enviará como {esVideo ? 'borrador' : 'borrador de fotos'} a <b>{tt.usuario}</b> en TikTok.</p>
            <button type="button" onClick={() => void enviarTt()} disabled={enviando || cambios.includes('media')} className="mt-2 rounded-full bg-ink px-5 py-2.5 text-[14px] font-semibold text-bg disabled:opacity-50">
              {enviando ? 'Enviando…' : esVideo ? 'Enviar a TikTok (borrador)' : 'Enviar fotos a TikTok (borrador)'}
            </button>
            {cambios.includes('media') && <p className="mt-1 text-[12px] text-muted">Guarda el link nuevo antes de enviar.</p>}
            {aviso && <p role="status" className="mt-2 text-[13px]">{aviso}</p>}
          </div>
        )}
        <p className="mt-3 text-[12px] text-muted">{capitalize(formatLongDate(pub.fecha))}</p>
      </div>
    </div>
  )
}

function Campo({ etiqueta, ayuda, children }: { etiqueta: string; ayuda?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[14px] font-semibold">{etiqueta}</span>
      {children}
      {ayuda && <span className="mt-1 block text-[12px] text-muted">{ayuda}</span>}
    </label>
  )
}
