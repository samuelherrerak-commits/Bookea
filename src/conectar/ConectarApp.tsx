import { useEffect, useState } from 'react'
import * as central from '../central/api'
import { Entrar, Logo } from '../negocio/NegocioApp'
import type { Sesion } from '../negocio/api'

/**
 * bookeaa.com/conectar: el administrador de bookeaa le da permiso a Claude (el conector MCP del
 * Worker del bot) para administrar bookeaa en su nombre. Entra con Google como en la central
 * y comparte la misma sesión; el Worker comprueba con el Apps Script que sea administrador.
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

const PERMISOS = [
  'Ver tus negocios, sus métricas, citas y configuración',
  'Crear negocios y editar sus datos y su configuración',
  'Registrar pagos y aprobar o rechazar los Pago Móvil',
  'Suspender o reactivar negocios',
]

type Paso =
  | { tipo: 'cargando' }
  | { tipo: 'error'; mensaje: string; otraCuenta?: boolean }
  | { tipo: 'pedir'; cliente: string; destino: string; conector: string; email: string }
  | { tipo: 'listo' }

export default function ConectarApp() {
  const pedido = new URLSearchParams(location.search).get('pedido') || ''
  const [sesion, setSesion] = useState<Sesion | null>(leerSesion)
  const [paso, setPaso] = useState<Paso>({ tipo: 'cargando' })
  const [enviando, setEnviando] = useState(false)

  useEffect(() => {
    document.title = 'Conectar Claude · bookeaa'
  }, [])

  useEffect(() => {
    if (!sesion || !pedido) return
    let vivo = true
    ;(async () => {
      try {
        const yo = await central.yo(sesion.sesion)
        if (!yo.conector) {
          if (vivo) setPaso({ tipo: 'pedir', cliente: 'Claude', destino: 'claude.ai', conector: '', email: yo.email })
          return
        }
        const r = await fetch(`${yo.conector}/oauth/pedido?id=${encodeURIComponent(pedido)}`)
        const info = (await r.json()) as { cliente?: string; destino?: string; error?: string }
        if (!vivo) return
        if (!r.ok) setPaso({ tipo: 'error', mensaje: info.error || 'El pedido venció. Vuelve a conectar desde Claude.' })
        else setPaso({ tipo: 'pedir', cliente: info.cliente || 'Claude', destino: info.destino || '', conector: yo.conector, email: yo.email })
      } catch (e) {
        if (!vivo) return
        if (e instanceof central.ErrorCentral && e.codigo === 'sesion') {
          guardarSesion(null)
          setSesion(null)
        } else {
          setPaso({ tipo: 'error', mensaje: (e as Error).message, otraCuenta: e instanceof central.ErrorCentral && e.codigo === 'no_autorizado' })
        }
      }
    })()
    return () => {
      vivo = false
    }
  }, [sesion, pedido])

  if (!pedido) {
    return (
      <Marco>
        <h1 className="mt-6 font-display text-[32px] leading-tight">Conectar Claude</h1>
        <p className="mt-2 max-w-[34ch] text-[15px] text-muted">Esta página se abre sola cuando agregas el conector de bookeaa en Claude (Configuración → Conectores).</p>
      </Marco>
    )
  }

  if (!sesion) {
    return (
      <Entrar
        titulo="Conectar Claude"
        bajada="Entra con tu Gmail de administrador para que Claude pueda administrar bookeaa contigo."
        nota="Solo los administradores de bookeaa (dueno_admins) pueden conectarlo."
        alEntrar={(s) => {
          guardarSesion(s)
          setSesion(s)
        }}
      />
    )
  }

  const salir = () => {
    guardarSesion(null)
    setSesion(null)
    setPaso({ tipo: 'cargando' })
  }

  const decidir = async (aprobar: boolean) => {
    if (paso.tipo !== 'pedir') return
    if (!paso.conector) return setPaso({ tipo: 'listo' }) // modo demo
    setEnviando(true)
    try {
      const r = await fetch(`${paso.conector}/oauth/aprobar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pedido, sesion: sesion.sesion, aprobar }),
      })
      const d = (await r.json()) as { redirect?: string; error?: string }
      if (!r.ok || !d.redirect) throw new Error(d.error || 'No se pudo completar.')
      setPaso({ tipo: 'listo' })
      location.href = d.redirect
    } catch (e) {
      setPaso({ tipo: 'error', mensaje: (e as Error).message })
      setEnviando(false)
    }
  }

  return (
    <Marco>
      {paso.tipo === 'cargando' && <div className="mt-8 h-64 w-full animate-pulse rounded-3xl bg-sand" aria-busy="true" aria-label="Cargando" />}
      {paso.tipo === 'error' && (
        <>
          <h1 className="mt-6 font-display text-[30px] leading-tight">No se pudo conectar</h1>
          <p role="alert" className="mt-3 rounded-2xl bg-danger/10 px-4 py-3 text-[14px] text-danger">{paso.mensaje}</p>
          {paso.otraCuenta && <button type="button" onClick={salir} className="mt-4 underline underline-offset-4">Entrar con otra cuenta</button>}
        </>
      )}
      {paso.tipo === 'listo' && (
        <>
          <h1 className="mt-6 font-display text-[30px] leading-tight">Listo</h1>
          <p className="mt-2 text-[15px] text-muted">Volviendo a Claude…</p>
        </>
      )}
      {paso.tipo === 'pedir' && (
        <>
          <h1 className="mt-6 font-display text-[30px] leading-tight">{paso.cliente} quiere administrar bookeaa</h1>
          <p className="mt-2 text-[14px] text-muted">Volverás a <b className="text-ink">{paso.destino}</b> al terminar.</p>
          <ul className="mt-6 w-full space-y-2.5 rounded-3xl bg-surface p-5 text-left text-[15px] shadow-card ring-1 ring-line">
            {PERMISOS.map((p) => (
              <li key={p} className="flex gap-3">
                <span aria-hidden className="text-ok">✓</span>
                <span>{p}</span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-[13px] text-muted">
            Lo hará con tu cuenta, <b className="text-ink">{paso.email}</b>, durante 30 días. Para quitarle el permiso, borra el conector en Claude.
          </p>
          <div className="mt-6 grid w-full grid-cols-2 gap-2">
            <button type="button" disabled={enviando} onClick={() => void decidir(false)} className="rounded-full px-5 py-3.5 text-[15px] font-semibold ring-1 ring-line disabled:opacity-50">Cancelar</button>
            <button type="button" disabled={enviando} onClick={() => void decidir(true)} className="rounded-full bg-ink px-5 py-3.5 text-[15px] font-semibold text-bg disabled:opacity-50">{enviando ? 'Conectando…' : 'Permitir'}</button>
          </div>
          <button type="button" onClick={salir} className="mt-5 text-[13px] text-muted underline underline-offset-4">No soy {paso.email}</button>
        </>
      )}
    </Marco>
  )
}

function Marco({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center px-6 py-10 text-center">
      <Logo className="size-16" />
      {children}
    </main>
  )
}
