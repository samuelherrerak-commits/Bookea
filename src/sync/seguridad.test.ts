import { describe, expect, it } from 'vitest'
import { funcionesGs } from './appsScript'

const archivos = import.meta.glob('../../apps-script/Code.gs', { query: '?raw', import: 'default', eager: true })
const gs = Object.values(archivos as Record<string, string>)[0] ?? ''

/** CacheService de mentira: un Map con la misma API que usa el script. */
function cacheFalsa() {
  const datos = new Map<string, string>()
  const cache = { get: (k: string) => datos.get(k) ?? null, put: (k: string, v: string) => void datos.set(k, v) }
  return { CacheService: { getScriptCache: () => cache } }
}

type Fn = (...args: never[]) => unknown
const f = funcionesGs<Record<string, Fn>>(gs, ['limpiarTexto_', 'paraCelda_', 'esImagen_'])
const limpiarTexto_ = f.limpiarTexto_ as (v: unknown, max: number) => string
const paraCelda_ = f.paraCelda_ as (v: unknown) => unknown
const esImagen_ = f.esImagen_ as (b: number[]) => boolean

/** Bytes con signo, como los devuelve Utilities.base64Decode en Apps Script. */
const conSigno = (bytes: number[]) => bytes.map((b) => (b > 127 ? b - 256 : b))
const ascii = (t: string) => [...t].map((c) => c.charCodeAt(0))

describe('Code.gs · textos que escribe la clienta', () => {
  it('quita saltos y caracteres de control, junta espacios y corta al máximo', () => {
    expect(limpiarTexto_('  Ana\n\tMaría\u0000  López ', 80)).toBe('Ana María López')
    expect(limpiarTexto_('x'.repeat(300), 80)).toHaveLength(80)
    expect(limpiarTexto_(null, 80)).toBe('')
  })

  it('lo que empieza como fórmula entra a la hoja como texto', () => {
    expect(paraCelda_('=IMPORTXML("http://x","//a")')).toBe('\'=IMPORTXML("http://x","//a")')
    expect(paraCelda_('+58 412 555 1234')).toBe("'+58 412 555 1234")
    expect(paraCelda_('-1')).toBe("'-1")
    expect(paraCelda_('@ana')).toBe("'@ana")
    expect(paraCelda_('Ana')).toBe('Ana')
    expect(paraCelda_(12.5)).toBe(12.5)
  })
})

describe('Code.gs · el capture tiene que ser una imagen de verdad', () => {
  const relleno = new Array(12).fill(0)
  it('acepta JPEG, PNG, WEBP y HEIC por sus primeros bytes', () => {
    expect(esImagen_(conSigno([0xff, 0xd8, 0xff, 0xe0, ...relleno]))).toBe(true)
    expect(esImagen_(conSigno([0x89, ...ascii('PNG'), ...relleno]))).toBe(true)
    expect(esImagen_([...ascii('RIFF'), 0, 0, 0, 0, ...ascii('WEBP'), ...relleno])).toBe(true)
    expect(esImagen_([0, 0, 0, 24, ...ascii('ftypheic'), ...relleno])).toBe(true)
  })

  it('rechaza un PDF, un HTML o datos cortos', () => {
    expect(esImagen_([...ascii('%PDF-1.7'), ...relleno])).toBe(false)
    expect(esImagen_([...ascii('<html><body>'), ...relleno])).toBe(false)
    expect(esImagen_(conSigno([0xff, 0xd8]))).toBe(false)
    expect(esImagen_([])).toBe(false)
  })
})

describe('Code.gs · topes anti-spam', () => {
  it('limite_ deja pasar hasta el máximo por ventana y después frena', () => {
    const { limite_ } = funcionesGs<{ limite_: (c: string, max: number, seg: number) => boolean }>(
      gs,
      ['limite_', 'contador_', 'sumar_'],
      cacheFalsa(),
    )
    const res = Array.from({ length: 5 }, () => limite_('post_x', 3, 60))
    expect(res).toEqual([false, false, false, true, true])
    expect(limite_('post_otro', 3, 60)).toBe(false) // cada negocio tiene su propio tope
  })

  it('el contador por teléfono solo sube cuando se suma', () => {
    const { contador_, sumar_ } = funcionesGs<{ contador_: (c: string) => number; sumar_: (c: string, s: number) => number }>(
      gs,
      ['contador_', 'sumar_'],
      cacheFalsa(),
    )
    expect(contador_('tel_x_584125551234')).toBe(0)
    sumar_('tel_x_584125551234', 86400)
    sumar_('tel_x_584125551234', 86400)
    expect(contador_('tel_x_584125551234')).toBe(2)
  })

  it('sin token configurado no se atiende a nadie; el anterior vale 24 h', () => {
    const conProps = (valores: Record<string, string>) => ({
      ...cacheFalsa(),
      PROPIEDAD_TOKEN: 'api_token',
      PropertiesService: { getScriptProperties: () => ({ getProperty: (k: string) => valores[k] ?? null }) },
    })
    type T = { tokenValido_: (t: string) => boolean }
    const nombres = ['tokenValido_', 'tokensValidos_']
    const sin = funcionesGs<T>(gs, nombres, conProps({}))
    expect(sin.tokenValido_('')).toBe(false)
    expect(sin.tokenValido_('cualquiera-de-16-letras')).toBe(false)

    const nuevo = 'bk_0123456789abcdef0123'
    const viejo = 'bk_viejo0123456789abcd'
    const enGracia = funcionesGs<T>(gs, nombres, conProps({ api_token: nuevo, api_token_anterior: viejo, api_token_anterior_hasta: String(Date.now() + 60_000) }))
    expect(enGracia.tokenValido_(nuevo)).toBe(true)
    expect(enGracia.tokenValido_(viejo)).toBe(true)
    expect(enGracia.tokenValido_('bk_otro')).toBe(false)

    const vencido = funcionesGs<T>(gs, nombres, conProps({ api_token: nuevo, api_token_anterior: viejo, api_token_anterior_hasta: String(Date.now() - 1) }))
    expect(vencido.tokenValido_(viejo)).toBe(false)
  })
})
