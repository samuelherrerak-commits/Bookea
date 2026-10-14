import { useMemo, useState } from 'react'
import type * as api from './api'
import { ETIQUETA, fechaCorta, haceDias } from './estados'
import { BarrasMes, Cambio, Cifra, Minibarras, Proporcion, Tarjeta, mesLargo } from './graficos'

/**
 * Panel de la central (pensado para computadora): cuánto entra a bookeaa, cómo crece la
 * plataforma y qué negocios necesitan atención. Las métricas salen de la hoja de cada
 * negocio; el servidor las guarda 10 minutos.
 */

const usd = (n: number) => `$${n.toLocaleString('es-VE', { maximumFractionDigits: 0 })}`
const suma = (v: number[]) => v.reduce((a, b) => a + b, 0)

type Orden = 'reservas30' | 'cambio' | 'ultimaReserva' | 'vence' | 'nombre'

/** Por qué un negocio necesita atención (o null si va bien). */
export function alerta(n: api.NegocioMetricas, hoy: string): string | null {
  if (n.estado === 'suspendido') return null
  if (n.error) return 'No se pudo leer su hoja'
  if (n.estado === 'vencido') return 'Vencido: se pausa sin pago'
  if (n.estado === 'pendiente') return `Por cobrar: su corte fue ${haceDias(n.vence, hoy)}`
  const dias = n.ultimaReserva ? Math.round((Date.parse(hoy) - Date.parse(n.ultimaReserva)) / 86400_000) : null
  if (n.reservas30 === 0) return dias === null ? 'Nunca ha recibido una reserva' : `Sin reservas en 30 días (la última ${haceDias(n.ultimaReserva, hoy)})`
  if ((n.previas30 ?? 0) >= 6 && (n.reservas30 ?? 0) <= (n.previas30 ?? 0) / 2) return `Bajó a la mitad: ${n.reservas30} reservas (antes ${n.previas30})`
  if (n.estado === 'prueba' && n.dias !== null && n.dias <= 5) return `Su prueba termina ${n.dias === 0 ? 'hoy' : `en ${n.dias} ${n.dias === 1 ? 'día' : 'días'}`}`
  return null
}

export function Metricas({ datos, cargando, onRecalcular, onAbrir }: {
  datos: api.Metricas | null
  cargando: boolean
  onRecalcular: () => void
  onAbrir: (slug: string) => void
}) {
  const [orden, setOrden] = useState<Orden>('reservas30')

  const filas = useMemo(() => {
    if (!datos) return []
    const val = (n: api.NegocioMetricas): number | string => {
      if (orden === 'nombre') return n.nombre.toLowerCase()
      if (orden === 'ultimaReserva') return n.ultimaReserva || ''
      if (orden === 'vence') return n.dias ?? 99999
      if (orden === 'cambio') return n.previas30 ? ((n.reservas30 ?? 0) - n.previas30) / n.previas30 : (n.reservas30 ? 1 : 0)
      return n.reservas30 ?? -1
    }
    return [...datos.negocios].sort((a, b) => {
      const x = val(a), y = val(b)
      const asc = orden === 'nombre' || orden === 'vence'
      return (x < y ? -1 : x > y ? 1 : 0) * (asc ? 1 : -1)
    })
  }, [datos, orden])

  if (!datos) return <div className="h-[520px] animate-pulse rounded-3xl bg-sand" aria-busy="true" aria-label="Cargando métricas" />

  const n = datos.negocios
  const cuenta = (e: api.EstadoCobro) => n.filter((x) => x.estado === e).length
  const pagando = cuenta('activo') + cuenta('pendiente')
  const mrr = pagando * datos.precio
  const enPrueba = cuenta('prueba')
  const mesActual = datos.ingresos[datos.ingresos.length - 1] ?? 0
  const mesPasado = datos.ingresos[datos.ingresos.length - 2] ?? 0
  const r30 = suma(n.map((x) => x.reservas30 ?? 0))
  const p30 = suma(n.map((x) => x.previas30 ?? 0))
  const conActividad = n.filter((x) => (x.reservas30 ?? 0) > 0).length
  const atencion = n.map((x) => ({ n: x, motivo: alerta(x, datos.hoy) })).filter((x) => x.motivo) as { n: api.NegocioMetricas; motivo: string }[]
  const cortes = n
    .filter((x) => x.estado !== 'suspendido' && x.dias !== null && x.dias >= 0 && x.dias <= 7)
    .sort((a, b) => (a.dias ?? 0) - (b.dias ?? 0))
  const minutos = Math.round((Date.now() - Date.parse(datos.generado)) / 60_000)

  const Cabeza = ({ id, children, className = '' }: { id: Orden; children: string; className?: string }) => (
    <th scope="col" className={'px-3 py-2.5 font-medium ' + className} aria-sort={orden === id ? (id === 'nombre' || id === 'vence' ? 'ascending' : 'descending') : 'none'}>
      <button type="button" onClick={() => setOrden(id)} className={'inline-flex items-center gap-1 hover:text-ink ' + (orden === id ? 'text-ink' : '')}>
        {children}{orden === id && <span aria-hidden>{id === 'nombre' || id === 'vence' ? '↑' : '↓'}</span>}
      </button>
    </th>
  )

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[13px] text-muted">
          Datos de {minutos < 1 ? 'hace un momento' : `hace ${minutos} min`} · {conActividad} de {n.length} negocios recibieron reservas en los últimos 30 días
        </p>
        <button type="button" onClick={onRecalcular} disabled={cargando} className="rounded-full px-4 py-2 text-[14px] font-semibold ring-1 ring-line disabled:opacity-50">
          {cargando ? 'Recalculando…' : 'Recalcular ahora'}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Cifra etiqueta="Ingreso mensual recurrente" valor={usd(mrr)} pie={<>{pagando} pagando · {enPrueba > 0 ? `+${usd(enPrueba * datos.precio)} si pagan los ${enPrueba} en prueba` : 'nadie en prueba'}</>} />
        <Cifra etiqueta={`Cobrado en ${mesLargo(datos.meses[datos.meses.length - 1]).split(' ')[0]}`} valor={usd(mesActual)} pie={<>{usd(mesPasado)} el mes pasado</>} />
        <Cifra etiqueta="Reservas en 30 días (todos)" valor={r30.toLocaleString('es-VE')} pie={<><Cambio ahora={r30} antes={p30} /> · antes {p30.toLocaleString('es-VE')}</>} />
        <Cifra etiqueta="Negocios" valor={n.length - cuenta('suspendido')} pie={<>{cuenta('suspendido')} suspendidos · {datos.altas[datos.altas.length - 1]} nuevos este mes</>} />
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        <Tarjeta className="xl:col-span-2" titulo="Cobrado por bookeaa" detalle={`Últimos 12 meses · ${usd(suma(datos.ingresos))} en total. El mes en curso va más claro.`}>
          <BarrasMes nombre="Cobrado por bookeaa" meses={datos.meses} valores={datos.ingresos} formato={usd} />
        </Tarjeta>
        <Tarjeta titulo="Negocios por estado" detalle={`${n.length} en total`}>
          <Proporcion partes={(Object.keys(ETIQUETA) as api.EstadoCobro[]).map((e) => ({ nombre: ETIQUETA[e].texto, n: cuenta(e), color: ETIQUETA[e].color }))} />
          <div className="mt-5 border-t border-line pt-4">
            <p className="text-[13px] font-semibold">Próximos cortes (7 días)</p>
            {cortes.length === 0 ? <p className="mt-1 text-[13px] text-muted">Ninguno esta semana.</p> : (
              <ul className="mt-2 space-y-1.5 text-[13px]">
                {cortes.slice(0, 6).map((x) => (
                  <li key={x.slug} className="flex justify-between gap-3">
                    <button type="button" onClick={() => onAbrir(x.slug)} className="min-w-0 truncate text-left hover:underline">{x.nombre}</button>
                    <span className="shrink-0 text-muted">{x.dias === 0 ? 'hoy' : fechaCorta(x.vence)} · {usd(datos.precio)}</span>
                  </li>
                ))}
              </ul>
            )}
            {cortes.length > 0 && <p className="mt-2 text-[13px] text-muted">Por cobrar: <b className="text-ink">{usd(cortes.length * datos.precio)}</b></p>}
          </div>
        </Tarjeta>
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        <Tarjeta className="xl:col-span-2" titulo="Reservas en toda la plataforma" detalle="Citas agendadas por mes (sin las canceladas)">
          <BarrasMes nombre="Reservas por mes" meses={datos.meses} valores={datos.reservas} formato={(v) => v.toLocaleString('es-VE')} />
        </Tarjeta>
        <Tarjeta titulo="Necesitan atención" detalle={atencion.length ? `${atencion.length} ${atencion.length === 1 ? 'negocio' : 'negocios'}` : 'Todo en orden'}>
          {atencion.length === 0 ? <p className="text-[14px] text-muted">Todos los negocios activos están recibiendo reservas.</p> : (
            <ul className="space-y-2">
              {atencion.slice(0, 8).map(({ n: x, motivo }) => (
                <li key={x.slug}>
                  <button type="button" onClick={() => onAbrir(x.slug)} className="w-full rounded-2xl bg-sand/60 px-3 py-2.5 text-left hover:bg-sand">
                    <span className="block truncate text-[14px] font-semibold">{x.nombre}</span>
                    <span className="block text-[13px] text-muted">⚠️ {motivo}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Tarjeta>
      </div>

      <Tarjeta titulo="Actividad por negocio" detalle="Toca un negocio para verlo a fondo. Toca un título para ordenar.">
        <div className="relative -mx-5 overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-[14px]">
            <thead className="whitespace-nowrap border-b border-line text-[12px] text-muted">
              <tr>
                <Cabeza id="nombre" className="pl-5">Negocio</Cabeza>
                <th scope="col" className="px-3 py-2.5 font-medium">Estado</th>
                <Cabeza id="reservas30" className="text-right">Reservas 30 d</Cabeza>
                <Cabeza id="cambio">Cambio</Cabeza>
                <th scope="col" className="px-3 py-2.5 font-medium">6 meses</th>
                <th scope="col" className="px-3 py-2.5 text-right font-medium">Próximas</th>
                <th scope="col" className="px-3 py-2.5 text-right font-medium">Clientes</th>
                <Cabeza id="ultimaReserva">Última reserva</Cabeza>
                <Cabeza id="vence" className="pr-5">Corte</Cabeza>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {filas.map((x) => (
                <tr key={x.slug} onClick={() => onAbrir(x.slug)} className="cursor-pointer hover:bg-sand/50">
                  <td className="max-w-[220px] py-3 pl-5 pr-3">
                    <button type="button" onClick={(e) => { e.stopPropagation(); onAbrir(x.slug) }} className="block max-w-full truncate text-left font-semibold hover:underline">{x.nombre}</button>
                    <span className="block truncate text-[12px] text-muted">/u/{x.slug}</span>
                  </td>
                  <td className="px-3 py-3"><span className={'whitespace-nowrap rounded-full px-2 py-0.5 text-[12px] font-semibold ' + ETIQUETA[x.estado].clase}>{ETIQUETA[x.estado].texto}</span></td>
                  <td className="px-3 py-3 text-right font-semibold tabular-nums">{x.reservas30 ?? '—'}</td>
                  <td className="px-3 py-3">{x.reservas30 === null ? <span className="text-[13px] text-danger" title={x.error}>sin datos</span> : <Cambio ahora={x.reservas30} antes={x.previas30 ?? 0} />}</td>
                  <td className="px-3 py-3"><Minibarras valores={x.porMes} etiqueta={`Reservas de los últimos 6 meses: ${x.porMes.join(', ')}`} /></td>
                  <td className="px-3 py-3 text-right tabular-nums">{x.proximas ?? '—'}</td>
                  <td className="px-3 py-3 text-right tabular-nums">{x.clientes ?? '—'}</td>
                  <td className="whitespace-nowrap px-3 py-3 text-[13px] text-muted">{haceDias(x.ultimaReserva, datos.hoy) || 'nunca'}</td>
                  <td className={'whitespace-nowrap py-3 pl-3 pr-5 text-[13px] ' + (x.dias !== null && x.dias <= 5 && x.estado !== 'suspendido' ? 'font-semibold text-danger' : 'text-muted')}>
                    {x.vence ? fechaCorta(x.vence) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Tarjeta>

      <Tarjeta titulo="Altas por mes" detalle="Negocios nuevos en bookeaa">
        <BarrasMes nombre="Altas por mes" meses={datos.meses} valores={datos.altas} alto={150} />
      </Tarjeta>
    </div>
  )
}
