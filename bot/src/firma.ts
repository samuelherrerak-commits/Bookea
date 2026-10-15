/** HMAC-SHA256 con Web Crypto (Workers y Node 20+). */
const enc = new TextEncoder()

async function clave(secreto: string) {
  return crypto.subtle.importKey('raw', enc.encode(secreto), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
}

export async function hmacHex(secreto: string, datos: string | ArrayBuffer): Promise<string> {
  const firma = await crypto.subtle.sign('HMAC', await clave(secreto), typeof datos === 'string' ? enc.encode(datos) : datos)
  return [...new Uint8Array(firma)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

/** Compara sin cortar en la primera diferencia, para no filtrar nada por el tiempo. */
export function igual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let d = 0
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return d === 0
}

/** Meta firma el cuerpo crudo con el App Secret: cabecera `X-Hub-Signature-256: sha256=<hex>`. */
export async function firmaMetaValida(appSecret: string, cuerpo: ArrayBuffer, cabecera: string | null): Promise<boolean> {
  if (!appSecret || !cabecera || !cabecera.startsWith('sha256=')) return false
  return igual(await hmacHex(appSecret, cuerpo), cabecera.slice(7).toLowerCase())
}

/** Cookie de la bandeja: "<vence>.<firma>". */
export async function crearSesion(secreto: string, ahora: number, duracionMs = 30 * 24 * 60 * 60 * 1000): Promise<string> {
  const vence = String(ahora + duracionMs)
  return `${vence}.${await hmacHex(secreto, 'bandeja:' + vence)}`
}

export async function sesionValida(secreto: string, valor: string | undefined, ahora: number): Promise<boolean> {
  if (!secreto || !valor) return false
  const [vence, firma] = valor.split('.')
  if (!vence || !firma || Number(vence) < ahora) return false
  return igual(await hmacHex(secreto, 'bandeja:' + vence), firma)
}
