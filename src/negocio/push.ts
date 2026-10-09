/** Avisos en el teléfono (Web Push). En iPhone solo funcionan con la app agregada a inicio (iOS 16.4+). */

export type EstadoAvisos = 'no_soportado' | 'instalar_primero' | 'bloqueados' | 'apagados' | 'activos'

export const esIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
export const instalada = () =>
  window.matchMedia?.('(display-mode: standalone)').matches || (navigator as unknown as { standalone?: boolean }).standalone === true

export async function estadoAvisos(): Promise<EstadoAvisos> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
    return esIOS() && !instalada() ? 'instalar_primero' : 'no_soportado'
  }
  if (Notification.permission === 'denied') return 'bloqueados'
  const reg = await navigator.serviceWorker.getRegistration()
  const sub = await reg?.pushManager.getSubscription()
  return sub && Notification.permission === 'granted' ? 'activos' : 'apagados'
}

function claveBytes(b64u: string): Uint8Array {
  const s = atob(b64u.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((b64u.length + 3) % 4))
  return Uint8Array.from(s, (c) => c.charCodeAt(0))
}

/** Pide permiso y se suscribe. Hay que llamarla desde un toque del usuario (iPhone lo exige). */
export async function activarAvisos(vapid: string): Promise<PushSubscriptionJSON> {
  if (!vapid) throw new Error('Los avisos todavía no están configurados en bookeaa.')
  const permiso = await Notification.requestPermission()
  if (permiso !== 'granted') throw new Error('Sin permiso no podemos avisarte. Actívalo en los ajustes del teléfono.')
  const reg = (await navigator.serviceWorker.getRegistration()) ?? (await navigator.serviceWorker.register('/sw.js'))
  await navigator.serviceWorker.ready
  const previa = await reg.pushManager.getSubscription()
  const sub = previa ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: claveBytes(vapid) as BufferSource }))
  return sub.toJSON()
}

export async function apagarAvisos(): Promise<PushSubscriptionJSON | null> {
  const reg = await navigator.serviceWorker.getRegistration()
  const sub = await reg?.pushManager.getSubscription()
  if (!sub) return null
  const json = sub.toJSON()
  await sub.unsubscribe()
  return json
}
