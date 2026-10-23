import { useEffect, useState } from 'react'
import { formatMonto } from '../lib/ticket'
import * as api from './api'
import { ETIQUETA, fechaCorta, haceDias, textoVence } from './estados'
import { BarrasH, BarrasMes, Cambio, Cifra, MapaCalor, Tarjeta } from './graficos'

/**
 * Un negocio a fondo (Central): sus reservas mes a mes, lo que factura, sus clientes,
 * a qué horas y qué le piden, cómo le pagan y su historial de pagos a bookeaa.
 */

const METODO: Record<string, string> = { pago_movil: 'Pago Móvil', efectivo: 'Efectivo', zelle: 'Zelle', binance: 'Binance', transferencia: 'Transferencia', punto: 'Punto de venta' }
const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0)

export function NegocioAFondo({ sesion, slug, hoy, alVolver, alGestionar, alSalir }: {
  sesion: string
  slug: string
  hoy: string
  alVolver: () => void
  /** Abre la hoja de acciones (registrar pago, editar, suspender…). */
  alGestionar: () => void
  alSalir: () => void
}) {
  const [d, setD] = useState<api.DetalleNegocio | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let vivo = true
    setD(null)
    setError('')
    api.detalleNegocio(sesion, slug).then(
      (r) => vivo && setD(r),
      (e) => {
        if (!vivo) return
        if (e instanceof api.ErrorCentral && e.codigo === 'sesion') alSalir()
        else setError((e as Error).message)
      },
    )
    return () => {
      vivo = false
    }
  }, [sesion, slug, alSalir])

  const volver = (
    <button type="button" onClick={alVolver} className="inline-flex items-center gap-1.5 text-[14px] text-muted hover:text-ink">
      <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><path d="M15 6l-6 6 6 6" /></svg>
      Volver
    </button>
  )
  if (error) return <div className="space-y-4">{volver}<p role="alert" className="rounded-2xl bg-danger/10 px-4 py-3 text-[14px] text-danger">{error}</p></div>
  if (!d) return <div className="space-y-4">{volver}<div className="h-[560px] animate-pulse rounded-3xl bg-sand" aria-busy="true" aria-label="Cargando el negocio" /></div>

  const { negocio: n, config: c, estadisticas: e } = d
  const dinero = (v: number) => formatMonto(v, c.moneda)
  const dineroCorto = (v: number) => (c.moneda === 'BS' ? `Bs. ${Math.round(v).toLocaleString('es-VE')}` : c.moneda === 'EUR' ? `${Math.round(v).toLocaleString('es-VE')} €` : `$${Math.round(v).toLocaleString('es-VE')}`)
  const canceladasPct = pct(e.canceladas, e.total + e.canceladas)
  const metodos = c.metodos.split(',').map((m) => METODO[m.trim()] ?? m.trim()).filter(Boolean)

  return (
    <div className="space-y-5">
      {volver}
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="font-display text-[34px] leading-tight lg:text-[40px]">{c.marca || n.nombre}</h1>
            <span className={'rounded-full px-2.5 py-1 text-[13px] font-semibold ' + ETIQUETA[n.estado].clase}>{ETIQUETA[n.estado].texto}</span>
          </div>
          <p className="mt-1 text-[14px] text-muted">
            {textoVence(n)} · en bookeaa desde el {fechaCorta(n.creado) || '—'} · última reserva {haceDias(e.ultimaSolicitud, hoy) || 'nunca'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a href={`/u/${n.slug}`} target="_blank" rel="noopener noreferrer" className="rounded-full px-4 py-2.5 text-[14px] font-semibold ring-1 ring-line">Ver página</a>
          {n.hoja && <a href={n.hoja} target="_blank" rel="noopener noreferrer" className="rounded-full px-4 py-2.5 text-[14px] font-semibold ring-1 ring-line">Abrir hoja</a>}
          {n.telefono && <a href={`https://wa.me/${api.telefonoWa(n.telefono)}`} target="_blank" rel="noopener noreferrer" className="rounded-full px-4 py-2.5 text-[14px] font-semibold ring-1 ring-line">WhatsApp</a>}
          <button type="button" onClick={alGestionar} className="rounded-full bg-ink px-4 py-2.5 text-[14px] font-semibold text-bg">Pagos y estado</button>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Cifra etiqueta="Reservas en 30 días" valor={e.ultimos30} pie={<><Cambio ahora={e.ultimos30} antes={e.previos30} /> · {e.proximas} próximas</>} />
        <Cifra etiqueta="Facturó en 30 días" valor={dineroCorto(e.ingresos30)} pie={<><Cambio ahora={e.ingresos30} antes={e.ingresosPrevios30} /> · ticket promedio {dinero(e.ticket)}</>} />
        <Cifra etiqueta="Clientes" valor={e.clientes} pie={<>{pct(e.recurrentes, e.clientes)} % volvió más de una vez</>} />
        <Cifra etiqueta="Cancelaciones" valor={`${canceladasPct} %`} pie={<>{e.canceladas} de {e.total + e.canceladas} reservas{e.conCupon ? ` · ${e.conCupon} con cupón` : ''}</>} />
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <Tarjeta titulo="Reservas por mes" detalle={`${e.total.toLocaleString('es-VE')} en total, sin las canceladas`}>
          <BarrasMes nombre="Reservas por mes" meses={e.meses} valores={e.porMes} />
        </Tarjeta>
        <Tarjeta titulo={`Facturación por mes (${c.moneda === 'BS' ? 'Bs.' : c.moneda})`} detalle="Lo que suman sus reservas, según el precio de cada servicio">
          <BarrasMes nombre="Facturación por mes" meses={e.meses} valores={e.ingresosMes} formato={dineroCorto} />
        </Tarjeta>
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        <Tarjeta className="xl:col-span-2" titulo="Cuándo le reservan" detalle="Citas por día y hora (sin las canceladas)">
          <MapaCalor dias={e.horas.dias} desde={e.horas.desde} mapa={e.horas.mapa} />
        </Tarjeta>
        <Tarjeta titulo="Servicios más pedidos" detalle={`${c.servicios} servicios publicados`}>
          <BarrasH items={e.servicios} extra={(i) => dineroCorto(e.servicios[i].ingresos)} />
        </Tarjeta>
      </div>

      {!!e.porPersona?.length && (
        <Tarjeta titulo="Por persona del equipo" detalle={`bookeaa team · ${n.personas ?? e.porPersona.length} personas activas · $${n.precio ?? 25} al mes`}>
          <div className="grid gap-x-8 md:grid-cols-2">
            <BarrasH items={e.porPersona} formato={(v) => `${v} ${v === 1 ? 'cita' : 'citas'}`} extra={(i) => dineroCorto(e.porPersona![i].ingresos)} />
            <p className="mt-4 text-[13px] text-muted md:mt-0">
              Citas y facturación de los últimos 12 meses, sin las canceladas. Con “Cualquiera disponible”, cuenta para quien la atendió.
            </p>
          </div>
        </Tarjeta>
      )}

      <div className="grid gap-5 md:grid-cols-3">
        <Tarjeta titulo="Clientes nuevos por mes">
          <BarrasMes nombre="Clientes nuevos por mes" meses={e.meses} valores={e.clientesNuevosMes} alto={150} />
        </Tarjeta>
        <Tarjeta titulo="Cómo le pagan">
          <BarrasH items={e.metodos} />
        </Tarjeta>
        <Tarjeta titulo="Estado de las reservas">
          <BarrasH items={e.estados} />
          {e.modalidades.length > 1 && (
            <div className="mt-4 border-t border-line pt-4">
              <p className="mb-2 text-[13px] font-semibold">Dónde</p>
              <BarrasH items={e.modalidades} />
            </div>
          )}
        </Tarjeta>
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        <Tarjeta className="xl:col-span-2" titulo="Últimas reservas">
          {d.recientes.length === 0 ? <p className="text-[14px] text-muted">Todavía no tiene reservas.</p> : (
            <div className="relative -mx-5 overflow-x-auto">
              <table className="w-full min-w-[560px] text-left text-[14px]">
                <thead className="border-b border-line text-[12px] text-muted">
                  <tr>
                    <th scope="col" className="py-2 pl-5 pr-3 font-medium">Cita</th>
                    <th scope="col" className="px-3 py-2 font-medium">Cliente</th>
                    <th scope="col" className="px-3 py-2 font-medium">Servicios</th>
                    <th scope="col" className="px-3 py-2 text-right font-medium">Total</th>
                    <th scope="col" className="py-2 pl-3 pr-5 font-medium">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {d.recientes.map((r, i) => (
                    <tr key={i}>
                      <td className="whitespace-nowrap py-2.5 pl-5 pr-3 tabular-nums">{fechaCorta(r.fecha)} · {r.hora}</td>
                      <td className="max-w-[160px] truncate px-3 py-2.5">{r.cliente}</td>
                      <td className="max-w-[200px] truncate px-3 py-2.5 text-muted">{r.servicios}</td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-right tabular-nums">{dinero(r.total)}</td>
                      <td className={'whitespace-nowrap py-2.5 pl-3 pr-5 text-[13px] ' + (/cancel/i.test(r.estado) ? 'text-danger' : /verificar/i.test(r.estado) ? 'font-semibold' : 'text-muted')}>{r.estado} · {r.metodo}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Tarjeta>
        <Tarjeta titulo="Su plan en bookeaa" detalle={textoVence(n)}>
          <dl className="space-y-1.5 text-[14px]">
            {[
              ['Plan', n.plan === 'team' ? `bookeaa team · ${n.personas ?? 0} personas · $${n.precio ?? 25}/mes` : `Individual · $${n.precio ?? 10}/mes`],
              ['Último pago', n.ultimoPago ? fechaCorta(n.ultimoPago) : 'Nunca'],
              ['Pagó en total', `$${d.pagos.reduce((a, p) => a + p.monto, 0).toLocaleString('es-VE')} · ${d.pagos.length} ${d.pagos.length === 1 ? 'pago' : 'pagos'}`],
              ['Gmail', n.email || '—'],
              ['WhatsApp', n.telefono || c.whatsapp || '—'],
              ['Cobra con', metodos.join(', ') || '—'],
              ['Ticket de reserva', c.ticket ? 'Activo' : 'Apagado'],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4">
                <dt className="text-muted">{k}</dt>
                <dd className="min-w-0 truncate text-right font-medium">{v}</dd>
              </div>
            ))}
          </dl>
          {(d.pagos.length > 0 || d.reportes.length > 0) && (
            <ul className="mt-4 divide-y divide-line border-t border-line text-[13px]">
              {d.reportes.filter((p) => p.estado !== 'Aprobado').slice(0, 3).map((p) => (
                <li key={p.id} className="flex justify-between gap-3 py-2">
                  <span>{fechaCorta(p.fecha)} · reportó {formatMonto(p.montoBs, 'BS')}</span>
                  <span className={p.estado === 'Rechazado' ? 'text-danger' : 'font-semibold'}>{p.estado}</span>
                </li>
              ))}
              {d.pagos.slice(0, 6).map((p, i) => (
                <li key={i} className="flex justify-between gap-3 py-2">
                  <span>{fechaCorta(p.fecha.slice(0, 10))} · {p.metodo}</span>
                  <span className="font-semibold tabular-nums">${p.monto} · {p.meses} {p.meses === 1 ? 'mes' : 'meses'}</span>
                </li>
              ))}
            </ul>
          )}
          {n.notas && <p className="mt-4 rounded-2xl bg-sand px-3 py-2 text-[13px]">📝 {n.notas}</p>}
        </Tarjeta>
      </div>
    </div>
  )
}
