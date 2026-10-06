/**
 * Servicios del bot sobre Apps Script (Code.gs, rama accion: 'bot'): horas libres,
 * agendar la cita de afiliación con Google Calendar/Meet, guardar en la hoja y avisar por correo.
 */
import { descargarMedia, type EnvWhatsApp } from './whatsapp'
import type { Afiliacion, Cita, Conversacion, Dia, Modalidad, ResultadoCita, Servicios } from './tipos'

export type EnvApps = EnvWhatsApp & { APPS_SCRIPT_URL: string; BOT_TOKEN: string }

async function llamar(env: EnvApps, op: string, datos: Record<string, unknown>): Promise<any> {
  const r = await fetch(env.APPS_SCRIPT_URL, {
    method: 'POST',
    // text/plain: Apps Script lo lee igual y no hay preflight.
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ accion: 'bot', token: env.BOT_TOKEN, op, ...datos }),
    redirect: 'follow',
  })
  const crudo = await r.text()
  let json: any = null
  try {
    json = JSON.parse(crudo)
  } catch {}
  if (!r.ok || !json) {
    // Página HTML de Google: implementación sin acceso "Cualquier usuario" o URL equivocada.
    const titulo = crudo.match(/<title>([^<]*)<\/title>/i)?.[1]?.trim()
    throw new Error(`Apps Script respondió ${r.status} sin JSON${titulo ? ` (${titulo})` : ''}`)
  }
  if (json.error) throw new Error(`Apps Script: ${json.error}${json.mensaje ? ` · ${json.mensaje}` : ''}`)
  return json
}

/** Una imagen de WhatsApp en base64 para que Apps Script la guarde en Drive. */
async function imagen(env: EnvApps, mediaId: string | undefined) {
  if (!mediaId) return null
  try {
    const { bytes, mime } = await descargarMedia(env, mediaId)
    if (bytes.byteLength > 8 * 1024 * 1024) return null
    let bin = ''
    const u = new Uint8Array(bytes)
    for (let i = 0; i < u.length; i += 0x8000) bin += String.fromCharCode(...u.subarray(i, i + 0x8000))
    return { base64: btoa(bin), mime }
  } catch {
    return null
  }
}

const quien = (c: Conversacion) => ({ telefono: c.telefono, nombre: c.nombre })

function resultado(json: any): ResultadoCita {
  if (json.ok && json.cita) return { ok: true, cita: json.cita as Cita }
  return { ok: false, motivo: json.motivo === 'ocupado' ? 'ocupado' : 'error', mensaje: json.mensaje ? String(json.mensaje) : undefined }
}

export function serviciosAppsScript(env: EnvApps): Servicios {
  return {
    async disponibilidad(modalidad: Modalidad): Promise<Dia[]> {
      return (await llamar(env, 'disponibilidad', { modalidad })).dias || []
    },
    async agendar(conv: Conversacion, af: Afiliacion) {
      return resultado(await llamar(env, 'agendar', { ...quien(conv), af }))
    },
    async reprogramar(conv: Conversacion, cita: Cita, fecha: string, hora: string) {
      return resultado(await llamar(env, 'reprogramar', { ...quien(conv), cita, fecha, hora }))
    },
    async cancelar(conv: Conversacion, cita: Cita) {
      return !!(await llamar(env, 'cancelar', { ...quien(conv), cita })).ok
    },
    async soporte(conv: Conversacion, sop) {
      const captura = await imagen(env, sop.captura)
      return (await llamar(env, 'soporte', { ...quien(conv), sop: { ...sop, captura: undefined }, captura })).caso ?? null
    },
    async persona(conv: Conversacion) {
      await llamar(env, 'persona', quien(conv))
    },
  }
}
