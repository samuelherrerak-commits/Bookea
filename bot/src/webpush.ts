/**
 * Web Push sin librerías: claves VAPID (RFC 8292) y cifrado aes128gcm (RFC 8291 / 8188)
 * con WebCrypto, que es lo que tiene un Worker de Cloudflare.
 *
 * Las claves VAPID las crea el Worker la primera vez y las guarda en D1 (tabla ajustes):
 * no hay que generar ni cargar ningún secreto a mano.
 */

const enc = new TextEncoder()

export function b64u(bytes: ArrayBuffer | Uint8Array): string {
  const u = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)
  let s = ''
  for (const b of u) s += String.fromCharCode(b)
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function desdeB64u(texto: string): Uint8Array {
  const s = atob(texto.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((texto.length + 3) % 4))
  return Uint8Array.from(s, (c) => c.charCodeAt(0))
}

function unir(...partes: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(partes.reduce((n, p) => n + p.length, 0))
  let i = 0
  for (const p of partes) {
    out.set(p, i)
    i += p.length
  }
  return out
}

export interface ClavesVapid {
  /** Clave pública sin comprimir (65 bytes) en base64url: la que usa el navegador. */
  publica: string
  /** Clave privada en JWK. */
  privada: JsonWebKey
}

export async function crearClavesVapid(): Promise<ClavesVapid> {
  const par = (await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify'])) as CryptoKeyPair
  const publica = new Uint8Array((await crypto.subtle.exportKey('raw', par.publicKey)) as ArrayBuffer)
  return { publica: b64u(publica), privada: (await crypto.subtle.exportKey('jwk', par.privateKey)) as JsonWebKey }
}

/** Cabecera Authorization de VAPID para un endpoint (válida 12 h). */
export async function cabeceraVapid(endpoint: string, claves: ClavesVapid, contacto: string, ahoraMs = Date.now()): Promise<string> {
  const aud = new URL(endpoint).origin
  const cabeza = b64u(enc.encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })))
  const cuerpo = b64u(enc.encode(JSON.stringify({ aud, exp: Math.floor(ahoraMs / 1000) + 12 * 3600, sub: contacto })))
  const clave = await crypto.subtle.importKey('jwk', claves.privada, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign'])
  const firma = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, clave, enc.encode(`${cabeza}.${cuerpo}`))
  return `vapid t=${cabeza}.${cuerpo}.${b64u(firma)}, k=${claves.publica}`
}

async function hkdf(salt: Uint8Array, ikm: Uint8Array, info: Uint8Array, largo: number): Promise<Uint8Array> {
  const clave = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits'])
  return new Uint8Array(await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt, info }, clave, largo * 8))
}

/** Para las pruebas: la clave efímera y la sal fijas. */
export interface Fijos {
  efimera: CryptoKeyPair
  sal: Uint8Array
}

/**
 * Cifra el mensaje para una suscripción (aes128gcm, un solo registro).
 * `p256dh` y `auth` vienen de PushSubscription.toJSON().keys.
 */
export async function cifrar(mensaje: Uint8Array, p256dh: string, auth: string, fijos?: Fijos): Promise<Uint8Array> {
  const uaPublica = desdeB64u(p256dh)
  const secreto = desdeB64u(auth)
  const efimera = fijos?.efimera ?? ((await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits'])) as CryptoKeyPair)
  const asPublica = new Uint8Array((await crypto.subtle.exportKey('raw', efimera.publicKey)) as ArrayBuffer)
  const ua = await crypto.subtle.importKey('raw', uaPublica, { name: 'ECDH', namedCurve: 'P-256' }, false, [])
  // Los tipos de Workers llaman $public a este campo, pero en tiempo de ejecución es `public` (WebCrypto).
  const compartido = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: ua } as unknown as SubtleCryptoDeriveKeyAlgorithm, efimera.privateKey, 256))

  const ikm = await hkdf(secreto, compartido, unir(enc.encode('WebPush: info\0'), uaPublica, asPublica), 32)
  const sal = fijos?.sal ?? crypto.getRandomValues(new Uint8Array(16))
  const cek = await hkdf(sal, ikm, enc.encode('Content-Encoding: aes128gcm\0'), 16)
  const nonce = await hkdf(sal, ikm, enc.encode('Content-Encoding: nonce\0'), 12)

  const aes = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt'])
  // Relleno mínimo: el delimitador 0x02 marca el último (y único) registro.
  const cifrado = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, aes, unir(mensaje, new Uint8Array([2]))))
  const rs = new Uint8Array([0, 0, 16, 0]) // 4096
  return unir(sal, rs, new Uint8Array([asPublica.length]), asPublica, cifrado)
}

export interface Suscripcion {
  endpoint: string
  p256dh: string
  auth: string
}

export type Resultado = 'ok' | 'vencida' | 'error'

/** Envía una notificación. 'vencida' = el navegador ya no la acepta (404/410): hay que borrarla. */
export async function enviarPush(s: Suscripcion, datos: unknown, claves: ClavesVapid, contacto: string): Promise<Resultado> {
  const cuerpo = await cifrar(enc.encode(JSON.stringify(datos)), s.p256dh, s.auth)
  const r = await fetch(s.endpoint, {
    method: 'POST',
    headers: {
      Authorization: await cabeceraVapid(s.endpoint, claves, contacto),
      'Content-Encoding': 'aes128gcm',
      'Content-Type': 'application/octet-stream',
      TTL: String(6 * 3600),
      Urgency: 'high',
    },
    body: cuerpo,
  })
  if (r.ok) return 'ok'
  if (r.status === 404 || r.status === 410) return 'vencida'
  console.warn('Push', r.status, await r.text().catch(() => ''))
  return 'error'
}
