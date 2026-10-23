import { useEffect, useState } from 'react'
import { formatMonto } from '../lib/ticket'
import * as api from './api'

/**
 * Mi plan y pagos (Mi negocio → Configurar): el estado del plan de bookeaa, la fecha de
 * corte, cuánto pagar en bolívares, los datos de Pago Móvil de bookeaa y el reporte del
 * pago. Si el banco ya lo muestra (correo o estado de cuenta), se aprueba solo.
 */

export const BANCOS_VE = [
  'Banco de Venezuela (0102)', 'Banesco (0134)', 'Mercantil (0105)', 'BBVA Provincial (0108)', 'Bancaribe (0114)', 'Banco Exterior (0115)',
  'BNC (0191)', 'Bicentenario (0175)', 'Banco del Tesoro (0163)', 'Banco Plaza (0138)', 'Bancamiga (0172)', 'Banplus (0174)',
  'Sofitasa (0137)', 'Banco Activo (0171)', 'Venezolano de Crédito (0104)', 'Banco Caroní (0128)', 'BFC Fondo Común (0151)',
  '100% Banco (0156)', 'DelSur (0157)', 'Mi Banco (0169)', 'Banfanb (0177)', 'Banco Agrícola (0166)', 'Otro',
]

const fechaLarga = (ymd: string) => {
  if (!ymd) return ''
  const [, m, d] = ymd.split('-').map(Number)
  return `${d} de ${['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'][m - 1]}`
}
const bs = (n: number) => formatMonto(n, 'BS')
const hoy = () => new Date(Date.now() - 4 * 3600_000).toISOString().slice(0, 10)
const claseInput = 'w-full min-w-0 rounded-2xl bg-surface px-3.5 py-3 text-[16px] ring-1 ring-line outline-none focus:ring-2 focus:ring-ink'

/** Título y color del estado (también lo usa el aviso de la pestaña Hoy). */
export function resumenPlan(p: api.Plan): { titulo: string; detalle: string; tono: 'ok' | 'aviso' | 'alerta' } {
  const limite = fechaLarga(p.limite)
  switch (p.estado) {
    case 'prueba':
      return { titulo: 'Mes gratis', detalle: `Tu primer pago es el ${fechaLarga(p.vence)}.`, tono: (p.dias ?? 99) <= 3 ? 'aviso' : 'ok' }
    case 'activo':
      return { titulo: 'Al día', detalle: `Pagado hasta el ${fechaLarga(p.vence)}.`, tono: (p.dias ?? 99) <= 3 ? 'aviso' : 'ok' }
    case 'pendiente':
      return { titulo: 'Pago pendiente', detalle: `Tu corte fue el ${fechaLarga(p.vence)}. Paga antes del ${limite} para que tu página no se pause.`, tono: 'alerta' }
    case 'vencido':
    case 'suspendido':
      return { titulo: 'Página en pausa', detalle: 'No está recibiendo reservas. Paga y repórtalo: se reactiva apenas se apruebe.', tono: 'alerta' }
    default:
      return { titulo: 'Plan sin fecha', detalle: 'Escríbenos para activar tu fecha de corte.', tono: 'aviso' }
  }
}

export function MiPlan({ sesion, slug, alSalir }: { sesion: string; slug: string; alSalir: () => void }) {
  const [plan, setPlan] = useState<api.Plan | null>(null)
  const [error, setError] = useState('')
  const [meses, setMeses] = useState(1)
  const [form, setForm] = useState<api.Reporte>({ fecha: hoy(), banco: '', telefono: '', referencia: '', montoBs: '', meses: 1 })
  const [enviando, setEnviando] = useState(false)
  const [resultado, setResultado] = useState('')
  const [copiado, setCopiado] = useState('')

  const cargar = async () => {
    try {
      const p = await api.plan(sesion, slug)
      setPlan(p)
      setForm((f) => ({ ...f, montoBs: f.montoBs || (p.montoBs ? p.montoBs.toFixed(2).replace('.', ',') : '') }))
    } catch (e) {
      if (e instanceof api.ErrorNegocio && e.codigo === 'sesion') alSalir()
      else setError((e as Error).message)
    }
  }
  useEffect(() => {
    void cargar()
  }, [sesion, slug])

  if (error) return <p role="alert" className="mt-4 rounded-2xl bg-danger/10 px-4 py-3 text-[14px] text-danger">{error}</p>
  if (!plan) return <div className="mt-4 h-[420px] animate-pulse rounded-3xl bg-sand" aria-busy="true" />

  const r = resumenPlan(plan)
  const total = plan.montoBs * meses
  const copiar = async (clave: string, texto: string) => {
    await navigator.clipboard?.writeText(texto).catch(() => {})
    setCopiado(clave)
    setTimeout(() => setCopiado(''), 1500)
  }
  const pm = plan.pagoMovil
  const datosPm = [
    ['Banco', pm.banco],
    ['Teléfono', pm.telefono],
    ['Cédula / RIF', pm.cedula],
    ...(pm.titular ? [['Titular', pm.titular]] : []),
  ] as [string, string][]

  const enviar = async () => {
    setEnviando(true)
    setResultado('')
    try {
      const res = await api.reportarPago(sesion, slug, { ...form, meses })
      setResultado(res.estado === 'Aprobado' ? '✅ ¡Pago aprobado! Tu plan ya está al día.' : '📨 Recibido. Lo verificamos con el banco y te avisamos (normalmente en minutos).')
      setForm({ fecha: hoy(), banco: form.banco, telefono: form.telefono, referencia: '', montoBs: '', meses: 1 })
      await cargar()
    } catch (e) {
      setResultado((e as Error).message)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="mt-4 space-y-5">
      <section className={'rounded-3xl px-5 py-5 ' + (r.tono === 'alerta' ? 'bg-danger text-white' : r.tono === 'aviso' ? 'bg-sand' : 'bg-ink text-bg')}>
        <p className="text-[13px] uppercase tracking-[0.12em] opacity-75">Plan bookeaa{plan.plan === 'team' ? ` team (${plan.personas ?? 0} personas)` : ''} · ${plan.precio} al mes</p>
        <p className="mt-1 font-display text-[34px] leading-tight">{r.titulo}</p>
        <p className="mt-1 text-[15px] opacity-90">{r.detalle}</p>
        {plan.corteDia && <p className="mt-3 text-[13px] opacity-75">Tu fecha de corte es el día {plan.corteDia} de cada mes. Tienes {plan.gracia} días para pagar.</p>}
      </section>

      {plan.porVerificar && (
        <p className="rounded-2xl bg-sand px-4 py-3 text-[14px]">📨 Tienes un pago por verificar. Te avisamos apenas se confirme.</p>
      )}

      <section className="space-y-3 rounded-3xl bg-surface p-4 shadow-card ring-1 ring-line">
        <h3 className="text-[17px] font-semibold">1. Paga por Pago Móvil</h3>
        <div className="flex items-center justify-between gap-3">
          <span className="text-[14px] text-muted">Meses</span>
          <div className="flex items-center gap-2">
            <button type="button" aria-label="Menos meses" onClick={() => setMeses(Math.max(1, meses - 1))} className="grid size-10 place-items-center rounded-xl ring-1 ring-line">−</button>
            <span className="w-6 text-center font-semibold tabular-nums">{meses}</span>
            <button type="button" aria-label="Más meses" onClick={() => setMeses(Math.min(6, meses + 1))} className="grid size-10 place-items-center rounded-xl ring-1 ring-line">+</button>
          </div>
        </div>
        <div className="rounded-2xl bg-sand px-4 py-3">
          <p className="text-[13px] text-muted">Monto a pagar</p>
          <p className="font-display text-[30px] leading-tight">{plan.montoBs ? bs(total) : `$${plan.precio * meses}`}</p>
          {plan.tasa > 0 && <p className="text-[13px] text-muted">${plan.precio * meses} a la tasa BCV de hoy ({plan.tasa.toLocaleString('es-VE', { minimumFractionDigits: 2 })})</p>}
        </div>
        <dl className="divide-y divide-line rounded-2xl ring-1 ring-line">
          {datosPm.map(([k, v]) => (
            <div key={k} className="flex items-center justify-between gap-3 px-4 py-2.5">
              <dt className="text-[13px] text-muted">{k}</dt>
              <dd className="flex min-w-0 items-center gap-2">
                <span className="truncate text-[15px] font-semibold">{v || '—'}</span>
                {v && <button type="button" onClick={() => void copiar(k, v.replace(/\s*\(\d{4}\)$/, ''))} className="shrink-0 rounded-full px-2.5 py-1 text-[12px] ring-1 ring-line">{copiado === k ? '✓' : 'Copiar'}</button>}
              </dd>
            </div>
          ))}
        </dl>
        <button type="button" onClick={() => void copiar('todo', `${datosPm.map(([k, v]) => `${k}: ${v}`).join('\n')}\nMonto: ${bs(total)}`)} className="w-full rounded-full px-5 py-3 text-[14px] font-semibold ring-1 ring-line">
          {copiado === 'todo' ? '✓ Copiado' : 'Copiar todos los datos'}
        </button>
      </section>

      <section className="space-y-3 rounded-3xl bg-surface p-4 shadow-card ring-1 ring-line">
        <h3 className="text-[17px] font-semibold">2. Reporta tu pago</h3>
        <div className="grid grid-cols-2 gap-3">
          <label className="block"><span className="mb-1.5 block text-[14px] font-semibold">Fecha</span>
            <input type="date" max={hoy()} value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} className={claseInput} /></label>
          <label className="block"><span className="mb-1.5 block text-[14px] font-semibold">Monto (Bs.)</span>
            <input inputMode="decimal" value={form.montoBs} placeholder={total ? total.toFixed(2).replace('.', ',') : ''} onChange={(e) => setForm({ ...form, montoBs: e.target.value })} className={claseInput} /></label>
        </div>
        <label className="block"><span className="mb-1.5 block text-[14px] font-semibold">Tu banco</span>
          <select value={form.banco} onChange={(e) => setForm({ ...form, banco: e.target.value })} className={claseInput}>
            <option value="">Elige el banco desde el que pagaste</option>
            {BANCOS_VE.map((b) => <option key={b} value={b}>{b}</option>)}
          </select></label>
        <label className="block"><span className="mb-1.5 block text-[14px] font-semibold">Teléfono desde el que pagaste</span>
          <input inputMode="tel" value={form.telefono} placeholder="04121234567" onChange={(e) => setForm({ ...form, telefono: e.target.value })} className={claseInput} /></label>
        <label className="block"><span className="mb-1.5 block text-[14px] font-semibold">Número de referencia</span>
          <input inputMode="numeric" value={form.referencia} placeholder="Completo, como sale en tu comprobante" onChange={(e) => setForm({ ...form, referencia: e.target.value.replace(/\D/g, '') })} className={claseInput + ' font-mono'} /></label>
        {resultado && <p role="status" className="rounded-2xl bg-sand px-4 py-3 text-[14px]">{resultado}</p>}
        <button type="button" disabled={enviando} onClick={() => void enviar()} className="w-full rounded-full bg-ink px-5 py-3.5 text-[16px] font-semibold text-bg disabled:opacity-50">
          {enviando ? 'Enviando…' : 'Reportar pago'}
        </button>
      </section>

      {plan.pagos.length > 0 && (
        <section>
          <h3 className="text-[13px] font-semibold uppercase tracking-[0.12em] text-muted">Tus pagos</h3>
          <ul className="mt-2 divide-y divide-line overflow-hidden rounded-3xl bg-surface ring-1 ring-line">
            {plan.pagos.map((p) => (
              <li key={p.id} className="px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[15px] font-semibold">{bs(p.montoBs)}{p.meses > 1 ? ` · ${p.meses} meses` : ''}</span>
                  <span className={'rounded-full px-2.5 py-0.5 text-[12px] font-semibold ' + (p.estado === 'Aprobado' ? 'bg-ok/15 text-ok' : p.estado === 'Rechazado' ? 'bg-danger/12 text-danger' : 'bg-sand')}>{p.estado}</span>
                </div>
                <p className="text-[13px] text-muted">{fechaLarga(p.fecha)} · {p.banco} · Ref. {p.referencia}</p>
                {p.motivo && <p className="mt-1 text-[13px] text-danger">{p.motivo}</p>}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
