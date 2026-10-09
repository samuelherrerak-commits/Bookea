/** Botón "Acceder con Google" (Google Identity Services). Devuelve el ID token. */
const SCRIPT = 'https://accounts.google.com/gsi/client'

interface Gsi {
  accounts: {
    id: {
      initialize(o: { client_id: string; callback: (r: { credential: string }) => void; ux_mode?: string; auto_select?: boolean; use_fedcm_for_prompt?: boolean }): void
      renderButton(el: HTMLElement, o: Record<string, unknown>): void
    }
  }
}

let carga: Promise<Gsi> | null = null

function cargarGoogle(): Promise<Gsi> {
  const w = window as unknown as { google?: Gsi }
  if (w.google?.accounts?.id) return Promise.resolve(w.google)
  carga ??= new Promise((ok, mal) => {
    const s = document.createElement('script')
    s.src = SCRIPT
    s.async = true
    s.onload = () => (w.google ? ok(w.google) : mal(new Error('Google no cargó')))
    s.onerror = () => {
      carga = null
      mal(new Error('No se pudo cargar el acceso con Google. Revisa tu conexión.'))
    }
    document.head.appendChild(s)
  })
  return carga
}

export async function botonGoogle(el: HTMLElement, clientId: string, alEntrar: (credencial: string) => void): Promise<void> {
  const g = await cargarGoogle()
  g.accounts.id.initialize({ client_id: clientId, callback: (r) => alEntrar(r.credential), auto_select: true })
  g.accounts.id.renderButton(el, { theme: 'filled_black', size: 'large', shape: 'pill', text: 'continue_with', locale: 'es', width: 280 })
}
