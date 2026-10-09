import { describe, expect, it } from 'vitest'
import { b64u, cabeceraVapid, cifrar, crearClavesVapid, desdeB64u } from './webpush'

// RFC 8291, apéndice A.
const RFC = {
  mensaje: 'When I grow up, I want to be a watermelon',
  asPublica: 'BP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A8',
  asPrivada: 'yfWPiYE-n46HLnH0KqZOF1fJJU3MYrct3AELtAQ-oRw',
  uaPublica: 'BCVxsr7N_eNgVRqvHtD0zTZsEc6-VV-JvLexhqUzORcxaOzi6-AYWXvTBHm4bjyPjs7Vd8pZGH6SRpkNtoIAiw4',
  uaPrivada: 'q1dXpw3UpT5VOmu_cf_v6ih07Aems3njxI-JWgLcM94',
  auth: 'BTBZMqHH6r4Tts7J_aSIgg',
  sal: 'DGv6ra1nlYgDCS1FRnbzlw',
  cuerpo:
    'DGv6ra1nlYgDCS1FRnbzlwAAEABBBP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A_yl95bQpu6cVPTpK4Mqgkf1CXztLVBSt2Ks3oZwbuwXPXLWyouBWLVWGNWQexSgSxsj_Qulcy4a-fN',
}

async function parDesde(publica: string, privada: string): Promise<CryptoKeyPair> {
  const p = desdeB64u(publica)
  const jwk = { kty: 'EC', crv: 'P-256', x: b64u(p.slice(1, 33)), y: b64u(p.slice(33, 65)), d: privada }
  return {
    privateKey: await crypto.subtle.importKey('jwk', jwk, { name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']),
    publicKey: await crypto.subtle.importKey('raw', p, { name: 'ECDH', namedCurve: 'P-256' }, true, []),
  }
}

/** Descifra como lo haría el navegador (para comprobar la ida y vuelta). */
async function descifrar(cuerpo: Uint8Array, ua: CryptoKeyPair, uaPublica: Uint8Array, auth: Uint8Array) {
  const sal = cuerpo.slice(0, 16)
  const idlen = cuerpo[20]
  const asPublica = cuerpo.slice(21, 21 + idlen)
  const as = await crypto.subtle.importKey('raw', asPublica, { name: 'ECDH', namedCurve: 'P-256' }, false, [])
  const compartido = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: as } as unknown as SubtleCryptoDeriveKeyAlgorithm, ua.privateKey, 256))
  const enc = new TextEncoder()
  const hk = async (s: Uint8Array, k: Uint8Array, info: Uint8Array, n: number) =>
    new Uint8Array(await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt: s, info }, await crypto.subtle.importKey('raw', k, 'HKDF', false, ['deriveBits']), n * 8))
  const ikm = await hk(auth, compartido, new Uint8Array([...enc.encode('WebPush: info\0'), ...uaPublica, ...asPublica]), 32)
  const cek = await hk(sal, ikm, enc.encode('Content-Encoding: aes128gcm\0'), 16)
  const nonce = await hk(sal, ikm, enc.encode('Content-Encoding: nonce\0'), 12)
  const plano = new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: nonce }, await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['decrypt']), cuerpo.slice(21 + idlen)))
  expect(plano[plano.length - 1]).toBe(2)
  return new TextDecoder().decode(plano.slice(0, -1))
}

describe('Web Push', () => {
  it('cifra igual que el ejemplo del RFC 8291', async () => {
    const cuerpo = await cifrar(new TextEncoder().encode(RFC.mensaje), RFC.uaPublica, RFC.auth, {
      efimera: await parDesde(RFC.asPublica, RFC.asPrivada),
      sal: desdeB64u(RFC.sal),
    })
    expect(b64u(cuerpo)).toBe(RFC.cuerpo)
    // Cabecera: sal, tamaño de registro 4096 y la clave pública efímera.
    expect(b64u(cuerpo.slice(0, 16))).toBe(RFC.sal)
    expect([...cuerpo.slice(16, 21)]).toEqual([0, 0, 16, 0, 65])
    expect(b64u(cuerpo.slice(21, 86))).toBe(RFC.asPublica)
    const ua = await parDesde(RFC.uaPublica, RFC.uaPrivada)
    expect(await descifrar(cuerpo, ua, desdeB64u(RFC.uaPublica), desdeB64u(RFC.auth))).toBe(RFC.mensaje)
  })

  it('ida y vuelta con claves nuevas', async () => {
    const ua = (await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits'])) as CryptoKeyPair
    const uaPublica = new Uint8Array((await crypto.subtle.exportKey('raw', ua.publicKey)) as ArrayBuffer)
    const auth = crypto.getRandomValues(new Uint8Array(16))
    const texto = JSON.stringify({ titulo: 'Nueva reserva', cuerpo: 'Carlos · Corte y barba · 2:00 p. m.' })
    const cuerpo = await cifrar(new TextEncoder().encode(texto), b64u(uaPublica), b64u(auth))
    expect(await descifrar(cuerpo, ua, uaPublica, auth)).toBe(texto)
  })

  it('la cabecera VAPID lleva un JWT ES256 válido para el origen del endpoint', async () => {
    const claves = await crearClavesVapid()
    expect(desdeB64u(claves.publica)).toHaveLength(65)
    const cab = await cabeceraVapid('https://fcm.googleapis.com/fcm/send/abc', claves, 'mailto:hola@bookeaa.com', 1_800_000_000_000)
    const [, jwt, k] = /^vapid t=([^,]+), k=(.+)$/.exec(cab)!
    expect(k).toBe(claves.publica)
    const [h, c, f] = jwt.split('.')
    expect(JSON.parse(new TextDecoder().decode(desdeB64u(c)))).toEqual({ aud: 'https://fcm.googleapis.com', exp: 1_800_000_000 + 43200, sub: 'mailto:hola@bookeaa.com' })
    const pub = await crypto.subtle.importKey('raw', desdeB64u(claves.publica), { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify'])
    expect(await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, pub, desdeB64u(f), new TextEncoder().encode(`${h}.${c}`))).toBe(true)
  })
})
