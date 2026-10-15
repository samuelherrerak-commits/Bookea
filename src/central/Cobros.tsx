import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { formatMonto } from '../lib/ticket'
import * as api from './api'
import { leerEstadoCuenta } from './estadoCuenta'

/**
 * Cobros (Central): los Pago Móvil que reportan los negocios. Se aprueban solos cuando el
 * banco ya los muestra (correos del BDV cada 10 minutos o el estado de cuenta que se sube
 * aquí); los que no, se revisan a mano con la pista del movimiento que más se les parece.
 */

const bs = (n: number) => formatMonto(n, 'BS')
const fechaCorta = (ymd: string) => {
  if (!ymd) return ''
  const [, m, d] = ymd.split('-').map(Number)
  return `${d} ${['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'][m - 1]}`
}
const hace = (iso: string) => {
  const min = Math.round((Date.now() - Date.parse(iso)) / 60_000)
  if (!(min >= 0)) return ''
  if (min < 1) return 'hace un momento'
  if (min < 60) return `hace ${min} min`
  if (min < 48 * 60) return `hace ${Math.round(min / 60)} h`
  return `hace ${Math.round(min / 1440)} días`
}
const claseInput = 'w-full min-w-0 rounded-2xl bg-surface px-3.5 py-3 text-[16px] ring-1 ring-line outline-none focus:ring-2 focus:ring-ink'

export function Cobros({ sesion, alSalir, alCambiar }: { sesion: string; alSalir: () => void; alCambiar: () => void }) {
  const [datos, setDatos] = useState<api.Cobros | null>(null)
  const [error, setError] = useState('')
  const [aviso, setAviso] = useState('')
  const [ocupado, setOcupado] = useState('')

  const cargar = useCallback(async () => {
    try {
      setDatos(await api.cobros(sesion))
    } catch (e) {
      if (e instanceof api.ErrorCentral && e.codigo === 'sesion') return alSalir()
      setError((e as Error).message)
    }
  }, [sesion, alSalir])
  useEffect(() => {
    void cargar()
  }, [cargar])

  const hacer = async (clave: string, accion: () => Promise<string>) => {
    setOcupado(clave)
    setError('')
    setAviso('')
    try {
      setAviso(await accion())
      await cargar()
      alCambiar()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setOcupado('')
    }
  }

  if (!datos) return error ? <p role="alert" className="mt-2 rounded-2xl bg-danger/10 px-4 py-3 text-[14px] text-danger">{error}</p> : <div className="mt-2 h-[420px] animate-pulse rounded-3xl bg-sand" aria-busy="true" />

  return (
    <div className="space-y-6">
      {aviso && <p role="status" className="rounded-2xl bg-ok/12 px-4 py-3 text-[14px] text-ok">{aviso}</p>}
      {error && <p role="alert" className="rounded-2xl bg-danger/10 px-4 py-3 text-[14px] text-danger">{error}</p>}

      <section>
        <Titulo extra={datos.tasa ? `Tasa BCV ${datos.tasa.toLocaleString('es-VE', { minimumFractionDigits: 2 })}` : ''}>Por verificar ({datos.porVerificar.length})</Titulo>
        {datos.porVerificar.length === 0 && <p className="mt-2 rounded-3xl bg-surface px-4 py-5 text-center text-[15px] text-muted ring-1 ring-line">Nada por verificar. Los pagos que el banco confirma se aprueban solos.</p>}
        <ul className="mt-2 space-y-2.5">
          {datos.porVerificar.map((p) => (
            <PorVerificar key={p.id} pago={p} ocupado={ocupado === p.id}
              onAprobar={() => void hacer(p.id, async () => { const r = await api.aprobar(sesion, p.id); return `Aprobado: ${p.negocio}${r.vence ? ` queda pagado hasta el ${fechaCorta(r.vence)}` : ''}.` })}
              onRechazar={(motivo) => void hacer(p.id, async () => { await api.rechazar(sesion, p.id, motivo); return `Rechazado. Le avisamos a ${p.negocio}.` })} />
          ))}
        </ul>
      </section>

      <EstadoCuenta ocupado={ocupado === 'archivo'} onSubir={(filas) => void hacer('archivo', async () => {
        const r = await api.subirMovimientos(sesion, filas)
        return `${filas.length} abonos leídos · ${r.nuevos} nuevos · ${r.aprobados} ${r.aprobados === 1 ? 'pago aprobado' : 'pagos aprobados'} solos.`
      })} />

      <section className="rounded-3xl bg-surface p-4 shadow-card ring-1 ring-line">
        <h3 className="text-[17px] font-semibold">Correos del banco</h3>
        <p className="mt-1 text-[14px] text-muted">
          {datos.ajustes.automaticos.correos ? '✅ Se leen solos cada 10 minutos.' : 'Todavía no se leen solos.'}
          {datos.ajustes.ultimaLectura && <> Última lectura {hace(datos.ajustes.ultimaLectura.fecha)}: {datos.ajustes.ultimaLectura.abonos} abonos, {datos.ajustes.ultimaLectura.nuevos} nuevos, {datos.ajustes.ultimaLectura.aprobados} aprobados.</>}
        </p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button type="button" disabled={!!ocupado} onClick={() => void hacer('correos', async () => { const r = await api.leerCorreos(sesion); return `Leí ${r.leidos} correos: ${r.abonos} abonos, ${r.nuevos} nuevos, ${r.aprobados} aprobados.` })}
            className="rounded-full px-4 py-3 text-[14px] font-semibold ring-1 ring-line disabled:opacity-50">{ocupado === 'correos' ? 'Leyendo…' : 'Leer ahora'}</button>
          {!(datos.ajustes.automaticos.correos && datos.ajustes.automaticos.cortes) && (
            <button type="button" disabled={!!ocupado} onClick={() => void hacer('instalar', async () => { await api.instalarCobros(sesion); return 'Listo: correos cada 10 minutos y revisión de cortes cada mañana a las 7.' })}
              className="rounded-full bg-ink px-4 py-3 text-[14px] font-semibold text-bg disabled:opacity-50">Activar automáticos</button>
          )}
        </div>
        <p className="mt-2 text-[13px] text-muted">Cada mañana también se revisan los cortes: avisa a quien le toca pagar y pausa la página al 4.º día sin pago.</p>
      </section>

      {datos.movimientos.length > 0 && (
        <section>
          <Titulo>Abonos sin reporte ({datos.movimientos.length})</Titulo>
          <p className="mt-1 text-[13px] text-muted">Entraron al banco, pero ningún negocio los ha reportado todavía (o no son de bookeaa).</p>
          <ul className="mt-2 divide-y divide-line overflow-hidden rounded-3xl bg-surface ring-1 ring-line">
            {datos.movimientos.map((m) => (
              <li key={m.clave} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-[14px]">{m.descripcion || 'Abono'}</p>
                  <p className="text-[13px] text-muted">{fechaCorta(m.fecha)} · Ref. {m.referencia} · {m.fuente}</p>
                </div>
                <span className="shrink-0 font-semibold tabular-nums">{bs(m.monto)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {datos.revisados.length > 0 && (
        <section>
          <Titulo>Revisados</Titulo>
          <ul className="mt-2 divide-y divide-line overflow-hidden rounded-3xl bg-surface ring-1 ring-line">
            {datos.revisados.map((p) => (
              <li key={p.id} className="px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="truncate text-[15px] font-semibold">{p.negocio}</span>
                  <span className={'shrink-0 rounded-full px-2.5 py-0.5 text-[12px] font-semibold ' + (p.estado === 'Aprobado' ? 'bg-ok/15 text-ok' : 'bg-danger/12 text-danger')}>{p.estado}</span>
                </div>
                <p className="text-[13px] text-muted">{fechaCorta(p.fecha)} · {bs(p.montoBs)} · Ref. {p.referencia}{p.conciliado ? ` · ${p.conciliado}` : ''}</p>
                {p.motivo && <p className="text-[13px] text-muted">{p.motivo}</p>}
              </li>
            ))}
          </ul>
        </section>
      )}

      <AjustesPagoMovil inicial={datos.ajustes} ocupado={ocupado === 'ajustes'} onGuardar={(d) => void hacer('ajustes', async () => { await api.ajustesCobro(sesion, d); return 'Datos de cobro guardados.' })} />
    </div>
  )
}

function Titulo({ children, extra }: { children: ReactNode; extra?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <h2 className="text-[13px] font-semibold uppercase tracking-[0.12em] text-muted">{children}</h2>
      {extra && <span className="text-[12px] text-muted">{extra}</span>}
    </div>
  )
}

function PorVerificar({ pago: p, ocupado, onAprobar, onRechazar }: { pago: api.PagoNegocio; ocupado: boolean; onAprobar: () => void; onRechazar: (motivo: string) => void }) {
  const [rechazando, setRechazando] = useState(false)
  const [motivo, setMotivo] = useState('No encontramos el pago en el banco')
  const pista = p.pista
  const igualRef = pista && pista.referencia.slice(-4) === p.referencia.slice(-4)
  const igualMonto = pista && Math.abs(pista.monto - p.montoBs) <= Math.max(0.5, p.montoBs * 0.005)
  return (
    <li className="rounded-3xl bg-surface p-4 shadow-card ring-1 ring-line">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[16px] font-semibold">{p.negocio}</p>
          <p className="text-[13px] text-muted">{fechaCorta(p.fecha)} · {p.banco}</p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-[17px] font-semibold tabular-nums">{bs(p.montoBs)}</p>
          <p className="text-[12px] text-muted">{p.meses > 1 ? `${p.meses} meses · ` : ''}${p.montoUsd ? p.montoUsd.toFixed(2) : '—'}</p>
        </div>
      </div>
      <p className="mt-2 font-mono text-[14px]">Ref. {p.referencia} <span className="font-sans text-[13px] text-muted">· {p.telefono}</span></p>
      <p className={'mt-2 rounded-2xl px-3 py-2 text-[13px] ' + (pista ? 'bg-sand' : 'bg-danger/8 text-danger')}>
        {pista
          ? <>🔎 En el banco: {bs(pista.monto)} · Ref. {pista.referencia} · {fechaCorta(pista.fecha)} ({igualRef && igualMonto ? 'coinciden referencia y monto' : igualRef ? 'misma referencia, otro monto' : 'mismo monto, otra referencia'})</>
          : 'No hay un abono parecido en el banco todavía. Espera el correo o sube el estado de cuenta.'}
      </p>
      {rechazando ? (
        <div className="mt-3 space-y-2">
          <input value={motivo} onChange={(e) => setMotivo(e.target.value)} aria-label="Motivo del rechazo" className={claseInput} />
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setRechazando(false)} className="rounded-full px-4 py-3 text-[14px] font-semibold ring-1 ring-line">Volver</button>
            <button type="button" disabled={ocupado} onClick={() => onRechazar(motivo)} className="rounded-full bg-danger px-4 py-3 text-[14px] font-semibold text-white disabled:opacity-50">Rechazar y avisar</button>
          </div>
        </div>
      ) : (
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button type="button" disabled={ocupado} onClick={() => setRechazando(true)} className="rounded-full px-4 py-3 text-[14px] font-semibold text-danger ring-1 ring-danger/40 disabled:opacity-50">Rechazar</button>
          <button type="button" disabled={ocupado} onClick={onAprobar} className="rounded-full bg-ink px-4 py-3 text-[14px] font-semibold text-bg disabled:opacity-50">{ocupado ? '…' : 'Aprobar'}</button>
        </div>
      )}
    </li>
  )
}

function EstadoCuenta({ ocupado, onSubir }: { ocupado: boolean; onSubir: (filas: api.FilaBanco[]) => void }) {
  const entrada = useRef<HTMLInputElement>(null)
  const [leidas, setLeidas] = useState<{ nombre: string; filas: api.FilaBanco[] } | null>(null)
  const [error, setError] = useState('')
  const elegir = async (f: File | undefined) => {
    setError('')
    setLeidas(null)
    if (!f) return
    try {
      const filas = await leerEstadoCuenta(f)
      if (!filas.length) throw new Error('No encontré abonos en ese archivo.')
      setLeidas({ nombre: f.name, filas })
    } catch (e) {
      setError((e as Error).message)
    } finally {
      if (entrada.current) entrada.current.value = ''
    }
  }
  const total = leidas?.filas.reduce((s, f) => s + f.monto, 0) ?? 0
  return (
    <section className="rounded-3xl bg-surface p-4 shadow-card ring-1 ring-line">
      <h3 className="text-[17px] font-semibold">Estado de cuenta del día</h3>
      <p className="mt-1 text-[14px] text-muted">Descárgalo del banco en Excel o CSV y súbelo: concilio los pagos reportados por referencia, monto y fecha.</p>
      <input ref={entrada} type="file" accept=".xls,.xlsx,.csv,.txt" className="hidden" onChange={(e) => void elegir(e.target.files?.[0])} />
      {error && <p role="alert" className="mt-3 rounded-2xl bg-danger/10 px-4 py-3 text-[14px] text-danger">{error}</p>}
      {leidas ? (
        <div className="mt-3 space-y-2">
          <p className="rounded-2xl bg-sand px-4 py-3 text-[14px]">
            <b>{leidas.nombre}</b>: {leidas.filas.length} {leidas.filas.length === 1 ? 'abono' : 'abonos'} por {bs(total)} (del {fechaCorta(leidas.filas.map((f) => f.fecha).sort()[0])} al {fechaCorta(leidas.filas.map((f) => f.fecha).sort().at(-1)!)}).
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setLeidas(null)} className="rounded-full px-4 py-3 text-[14px] font-semibold ring-1 ring-line">Cancelar</button>
            <button type="button" disabled={ocupado} onClick={() => { onSubir(leidas.filas); setLeidas(null) }} className="rounded-full bg-ink px-4 py-3 text-[14px] font-semibold text-bg disabled:opacity-50">Conciliar</button>
          </div>
        </div>
      ) : (
        <button type="button" disabled={ocupado} onClick={() => entrada.current?.click()} className="mt-3 w-full rounded-full bg-ink px-5 py-3 text-[15px] font-semibold text-bg disabled:opacity-50">
          {ocupado ? 'Conciliando…' : 'Subir estado de cuenta'}
        </button>
      )}
    </section>
  )
}

function AjustesPagoMovil({ inicial, ocupado, onGuardar }: { inicial: api.Cobros['ajustes']; ocupado: boolean; onGuardar: (d: { pagoMovil: api.PagoMovilDatos; correoQuery: string }) => void }) {
  const [pm, setPm] = useState(inicial.pagoMovil)
  const [query, setQuery] = useState(inicial.correoQuery)
  const campos: [keyof api.PagoMovilDatos, string, string][] = [
    ['banco', 'Banco', 'Banco de Venezuela (0102)'],
    ['telefono', 'Teléfono', '04120000000'],
    ['cedula', 'Cédula o RIF', 'V-12345678'],
    ['titular', 'Titular (opcional)', ''],
  ]
  return (
    <details className="rounded-3xl bg-surface p-4 ring-1 ring-line">
      <summary className="cursor-pointer text-[17px] font-semibold">Tus datos de Pago Móvil</summary>
      <p className="mt-1 text-[14px] text-muted">Es lo que ven los negocios en "Mi plan y pagos".</p>
      <div className="mt-3 space-y-3">
        {campos.map(([k, etiqueta, ej]) => (
          <label key={k} className="block">
            <span className="mb-1.5 block text-[14px] font-semibold">{etiqueta}</span>
            <input value={pm[k]} placeholder={ej} onChange={(e) => setPm({ ...pm, [k]: e.target.value })} className={claseInput} />
          </label>
        ))}
        <label className="block">
          <span className="mb-1.5 block text-[14px] font-semibold">Búsqueda de correos del banco (Gmail)</span>
          <input value={query} onChange={(e) => setQuery(e.target.value)} className={claseInput + ' font-mono text-[14px]'} />
          <span className="mt-1 block text-[13px] text-muted">Los avisos de Pago Móvil recibido que manda el banco a tu Gmail.</span>
        </label>
        <button type="button" disabled={ocupado} onClick={() => onGuardar({ pagoMovil: pm, correoQuery: query })} className="w-full rounded-full bg-ink px-5 py-3 text-[15px] font-semibold text-bg disabled:opacity-50">
          {ocupado ? 'Guardando…' : 'Guardar'}
        </button>
      </div>
    </details>
  )
}
