/** Cliente mínimo de la WhatsApp Cloud API (Graph). */
import type { Entrada, Salida } from './tipos'

export type EnvWhatsApp = { WA_TOKEN: string; WA_PHONE_ID: string; WA_WABA_ID: string; GRAPH_URL?: string }

const VERSION = 'v23.0'
const base = (env: EnvWhatsApp) => `${env.GRAPH_URL || 'https://graph.facebook.com'}/${VERSION}`
const corto = (t: string, n: number) => (t.length > n ? t.slice(0, n - 1) + '…' : t)

/** El JSON que espera /messages para cada tipo de salida, con los límites de WhatsApp. */
export function cuerpoMensaje(para: string, s: Salida): Record<string, unknown> {
  const comun = { messaging_product: 'whatsapp', recipient_type: 'individual', to: para }
  if (s.tipo === 'texto') return { ...comun, type: 'text', text: { body: corto(s.texto, 4096), preview_url: true } }
  if (s.tipo === 'botones') {
    return {
      ...comun,
      type: 'interactive',
      interactive: {
        type: 'button',
        body: { text: corto(s.texto, 1024) },
        action: { buttons: s.botones.slice(0, 3).map((b) => ({ type: 'reply', reply: { id: b.id, title: corto(b.titulo, 20) } })) },
      },
    }
  }
  return {
    ...comun,
    type: 'interactive',
    interactive: {
      type: 'list',
      body: { text: corto(s.texto, 1024) },
      action: {
        button: corto(s.boton, 20),
        sections: [{
          title: 'Opciones',
          rows: s.filas.slice(0, 10).map((f) => ({
            id: f.id.slice(0, 200),
            title: corto(f.titulo, 24),
            ...(f.descripcion ? { description: corto(f.descripcion, 72) } : {}),
          })),
        }],
      },
    },
  }
}

/** Texto plano de una salida, para guardarlo en el historial de la bandeja. */
export function textoDeSalida(s: Salida): string {
  if (s.tipo === 'texto') return s.texto
  if (s.tipo === 'botones') return `${s.texto}\n\n${s.botones.map((b) => `[${b.titulo}]`).join(' ')}`
  return `${s.texto}\n\n${s.filas.map((f) => `• ${f.titulo}`).join('\n')}`
}

async function graph(env: EnvWhatsApp, ruta: string, init: RequestInit = {}): Promise<any> {
  const r = await fetch(`${base(env)}/${ruta}`, {
    ...init,
    headers: { Authorization: `Bearer ${env.WA_TOKEN}`, 'Content-Type': 'application/json', ...(init.headers || {}) },
  })
  const datos = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error(`Graph ${r.status}: ${JSON.stringify((datos as any).error || datos).slice(0, 300)}`)
  return datos
}

/** Envía y devuelve el wamid. */
export async function enviar(env: EnvWhatsApp, cuerpo: Record<string, unknown>): Promise<string> {
  const r = await graph(env, `${env.WA_PHONE_ID}/messages`, { method: 'POST', body: JSON.stringify(cuerpo) })
  return r.messages?.[0]?.id || ''
}

export async function marcarLeido(env: EnvWhatsApp, wamid: string): Promise<void> {
  await graph(env, `${env.WA_PHONE_ID}/messages`, {
    method: 'POST',
    body: JSON.stringify({ messaging_product: 'whatsapp', status: 'read', message_id: wamid }),
  }).catch(() => undefined)
}

/** Descarga una imagen recibida: primero su URL temporal, después los bytes (con el token). */
export async function descargarMedia(env: EnvWhatsApp, mediaId: string): Promise<{ bytes: ArrayBuffer; mime: string }> {
  const info = await graph(env, mediaId)
  const r = await fetch(info.url, { headers: { Authorization: `Bearer ${env.WA_TOKEN}` } })
  if (!r.ok) throw new Error('No se pudo descargar la imagen')
  return { bytes: await r.arrayBuffer(), mime: info.mime_type || r.headers.get('content-type') || 'image/jpeg' }
}

export async function plantillasDeMeta(env: EnvWhatsApp): Promise<{ name: string; status: string; category: string }[]> {
  const r = await graph(env, `${env.WA_WABA_ID}/message_templates?fields=name,status,category,language&limit=100`)
  return r.data || []
}

export async function crearPlantilla(env: EnvWhatsApp, plantilla: Record<string, unknown>): Promise<any> {
  return graph(env, `${env.WA_WABA_ID}/message_templates`, { method: 'POST', body: JSON.stringify(plantilla) })
}

export async function actualizarPerfil(env: EnvWhatsApp, perfil: Record<string, unknown>): Promise<void> {
  await graph(env, `${env.WA_PHONE_ID}/whatsapp_business_profile`, {
    method: 'POST',
    body: JSON.stringify({ messaging_product: 'whatsapp', ...perfil }),
  })
}

export type Recibido = { de: string; nombre: string; wamid: string; ms: number; entrada: Entrada; resumen: string; mediaId?: string }

/** Saca los mensajes de un webhook de Meta (los "statuses" de entrega se ignoran). */
export function mensajesDelWebhook(cuerpo: any): Recibido[] {
  const out: Recibido[] = []
  for (const entry of cuerpo?.entry || []) {
    for (const change of entry?.changes || []) {
      const v = change?.value
      if (change?.field !== 'messages' || !v?.messages) continue
      const nombres: Record<string, string> = {}
      for (const c of v.contacts || []) nombres[c.wa_id] = c.profile?.name || ''
      for (const m of v.messages) {
        let entrada: Entrada = { tipo: 'otro' }
        let resumen = ''
        let mediaId: string | undefined
        if (m.type === 'text') { entrada = { tipo: 'texto', texto: String(m.text?.body || '') }; resumen = entrada.texto }
        else if (m.type === 'interactive') {
          const r = m.interactive?.button_reply || m.interactive?.list_reply
          if (r) { entrada = { tipo: 'opcion', id: String(r.id), titulo: String(r.title || '') }; resumen = `[${r.title}]` }
        } else if (m.type === 'button') {
          // Botón de respuesta rápida de una plantilla: se trata como texto.
          entrada = { tipo: 'texto', texto: String(m.button?.text || '') }
          resumen = entrada.texto
        } else if (m.type === 'image') {
          mediaId = String(m.image?.id || '')
          entrada = { tipo: 'imagen', mediaId, texto: m.image?.caption }
          resumen = m.image?.caption || '📷 Imagen'
        } else if (m.type === 'location') {
          const l = m.location || {}
          entrada = { tipo: 'ubicacion', lat: Number(l.latitude), lng: Number(l.longitude), nombre: l.name, direccion: l.address }
          resumen = `📍 ${[l.name, l.address].filter(Boolean).join(', ') || `${l.latitude}, ${l.longitude}`}`
        } else {
          resumen = `(${m.type})`
          if (m[m.type]?.id) mediaId = String(m[m.type].id)
        }
        out.push({ de: String(m.from), nombre: nombres[m.from] || '', wamid: String(m.id), ms: Number(m.timestamp) * 1000, entrada, resumen, mediaId })
      }
    }
  }
  return out
}
