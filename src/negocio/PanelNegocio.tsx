import { useEffect, useState } from 'react'
import { BarrasH, BarrasMes, Cambio, Cifra, Tarjeta, mesLargo } from '../central/graficos'
import { capitalize, formatLongDate } from '../lib/format'
import { formatMonto } from '../lib/ticket'
import * as api from './api'

/**
 * Panel de control de Mi negocio (solo el administrador): cuánto dinero dejaron las reservas
 * en un período, qué ya se atendió y qué falta, y de dónde salió: persona del equipo,
 * servicio y forma de pago. Las cifras son las de cada reserva (lo que marcó la página).
 */

const PERIODOS: [api.PeriodoPanel, string][] = [
  ['hoy', 'Hoy'],
  ['semana', 'Semana'],
  ['mes', 'Este mes'],
  ['mes_pasado', 'Mes pasado'],
  ['30', '30 días'],
  ['12m', '12 meses'],
]
const CLAVE_PERIODO = 'bookeaa-panel-periodo'

const DIAS_SEMANA = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb']
const diaCorto = (ymd: string) => String(Number(ymd.slice(8, 10)))
const diaLargo = (ymd: string) => `${DIAS_SEMANA[new Date(ymd + 'T12:00:00Z').getUTCDay()]} ${capitalize(formatLongDate(ymd)).replace(/^\w+\s/, '')}`

export function PanelNegocio({ sesion, slug, alSalir }: { sesion: string; slug: string; alSalir: () => void }) {
  const [periodo, setPeriodo] = useState<api.PeriodoPanel>(() => {
    try {
      return (localStorage.getItem(CLAVE_PERIODO) as api.PeriodoPanel) || 'mes'
    } catch {
      return 'mes'
    }
  })
  const [datos, setDatos] = useState<api.Panel | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let vivo = true
    setDatos(null)
    setError('')
    try {
      localStorage.setItem(CLAVE_PERIODO, periodo)
    } catch {
      /* modo privado */
    }
    api.panel(sesion, slug, periodo).then(
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
  }, [sesion, slug, periodo, alSalir])

  const dinero = (n: number) => formatMonto(n, datos?.moneda ?? 'USD')
  const corto = (n: number) => {
    const m = datos?.moneda ?? 'USD'
    const v = Math.round(n).toLocaleString('es-VE')
    return m === 'BS' ? `Bs. ${v}` : m === 'EUR' ? `${v} €` : `$${v}`
  }

  return (
    <div className="mt-2 space-y-4">
      <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 no-scrollbar lg:mx-0 lg:flex-wrap lg:px-0" role="group" aria-label="Período">
        {PERIODOS.map(([id, t]) => (
          <button key={id} type="button" aria-pressed={periodo === id} onClick={() => setPeriodo(id)}
            className={'shrink-0 rounded-full px-3.5 py-1.5 text-[14px] ring-1 ' + (periodo === id ? 'bg-ink text-bg ring-ink' : 'ring-line')}>
            {t}
          </button>
        ))}
      </div>

      {error && <p role="alert" className="rounded-2xl bg-danger/10 px-4 py-3 text-[14px] text-danger">{error}</p>}
      {!datos && !error && <div className="h-[520px] animate-pulse rounded-3xl bg-sand" aria-busy="true" aria-label="Cargando el panel" />}

      {datos && (() => {
        const a = datos.actual
        const rango = datos.porMes
          ? `${capitalize(mesLargo(datos.desde.slice(0, 7)))} a ${mesLargo(datos.hasta.slice(0, 7))}`
          : datos.desde === datos.hasta
            ? capitalize(formatLongDate(datos.desde))
            : `Del ${formatLongDate(datos.desde)} al ${formatLongDate(datos.hasta)}`
        const total = Math.max(a.ingresos, 1)
        return (
          <>
            <p className="text-[13px] text-muted">{rango} · según lo que marcó cada reserva, sin las canceladas</p>

            <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
              <Cifra etiqueta="Facturado" valor={corto(a.ingresos)} pie={<><Cambio ahora={a.ingresos} antes={datos.anterior.ingresos} /> · antes {corto(datos.anterior.ingresos)}</>} />
              <Cifra etiqueta="Ya atendido" valor={corto(a.ingresosAtendidas)} pie={a.agendadas ? <>+{corto(a.ingresosAgendadas)} agendado ({a.agendadas} {a.agendadas === 1 ? 'cita' : 'citas'})</> : <>{a.atendidas} {a.atendidas === 1 ? 'cita' : 'citas'}</>} />
              <Cifra etiqueta="Reservas" valor={a.reservas} pie={<><Cambio ahora={a.reservas} antes={datos.anterior.reservas} /> · {a.canceladas} canceladas</>} />
              <Cifra etiqueta="Ticket promedio" valor={corto(a.ticket)} pie={<>{a.clientes} {a.clientes === 1 ? 'cliente' : 'clientes'}</>} />
            </div>

            {a.porVerificar > 0 && (
              <p className="rounded-2xl bg-sand px-4 py-3 text-[14px]">💸 {a.porVerificar} {a.porVerificar === 1 ? 'Pago Móvil' : 'Pagos Móviles'} por verificar: {dinero(a.ingresosPorVerificar)}. Confírmalos en Hoy o Próximas.</p>
            )}

            <div className="grid gap-4 xl:grid-cols-3">
              <Tarjeta className="xl:col-span-2" titulo={datos.porMes ? 'Facturado por mes' : 'Facturado por día'} detalle={a.reservas ? `${a.reservas} reservas · ${dinero(a.ingresos)}` : 'Sin reservas en este período'}>
                {a.serie.length > 1 ? (
                  <BarrasMes
                    nombre={datos.porMes ? 'Facturado por mes' : 'Facturado por día'}
                    meses={a.serie.map((d) => d.clave)}
                    valores={a.serie.map((d) => d.ingresos)}
                    formato={corto}
                    enCurso={false}
                    {...(datos.porMes ? {} : { etiqueta: diaCorto, etiquetaLarga: diaLargo })}
                  />
                ) : (
                  <p className="font-display text-[44px] leading-none">{dinero(a.ingresos)}</p>
                )}
              </Tarjeta>
              <Tarjeta titulo="Cómo te pagan">
                <BarrasH items={a.porMetodo.map((m) => ({ nombre: m.nombre, n: m.ingresos }))} formato={corto} extra={(i) => `${a.porMetodo[i].n} citas`} vacio="Sin reservas." />
              </Tarjeta>
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
              {(datos.equipo || a.porPersona.length > 0) && (
                <Tarjeta titulo="Cuánto hizo cada persona" detalle="Lo que facturaron sus citas en el período">
                  {a.porPersona.length ? (
                    <ul className="space-y-3">
                      {a.porPersona.map((p) => (
                        <li key={p.nombre}>
                          <div className="flex items-baseline justify-between gap-3 text-[14px]">
                            <span className="min-w-0 truncate font-semibold">{p.nombre}</span>
                            <span className="shrink-0 tabular-nums"><b>{dinero(p.ingresos)}</b> <span className="text-muted">· {p.n} {p.n === 1 ? 'cita' : 'citas'} · {Math.round((p.ingresos / total) * 100)} %</span></span>
                          </div>
                          <div className="mt-1 h-2 rounded-full bg-sand"><div className="h-2 rounded-full bg-ink" style={{ width: `${Math.max(2, (p.ingresos / Math.max(...a.porPersona.map((x) => x.ingresos), 1)) * 100)}%` }} /></div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-[14px] text-muted">Todavía no hay reservas con persona asignada en este período.</p>
                  )}
                </Tarjeta>
              )}
              <Tarjeta titulo="Servicios" detalle="Lo que más te dejó">
                <BarrasH items={a.porServicio.map((s) => ({ nombre: s.nombre, n: s.ingresos }))} formato={corto} extra={(i) => `${a.porServicio[i].n}×`} vacio="Sin reservas." />
              </Tarjeta>
            </div>
          </>
        )
      })()}
    </div>
  )
}
