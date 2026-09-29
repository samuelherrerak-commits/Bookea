import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('../config', async (original) => ({
  ...(await original<typeof import('../config')>()),
  API_URL: 'https://script.google.com/macros/s/PRUEBA/exec',
  API_TOKEN: 'bk_prueba',
  DEMO_MODE: false,
}))

const { fetchData } = await import('./api')

const URL_CATALOGO = 'https://script.google.com/macros/s/PRUEBA/exec?token=bk_prueba'
const crudo = { negocio: 'Barbería Norte', servicios: [], promociones: [], config: { nombre_negocio: 'Barbería Norte' }, horarios: [], sedes: [], citasAgendadas: [] }
const respuesta = () => new Response(JSON.stringify(crudo), { headers: { 'Content-Type': 'application/json' } })
const g = globalThis as { __catalogoTemprano?: { url: string; respuesta: Promise<Response> } }

afterEach(() => {
  delete g.__catalogoTemprano
  vi.unstubAllGlobals()
})

describe('fetchData y el pedido temprano de index.html', () => {
  it('usa la respuesta que ya pidió index.html, una sola vez', async () => {
    const red = vi.fn(async () => respuesta())
    vi.stubGlobal('fetch', red)
    g.__catalogoTemprano = { url: URL_CATALOGO, respuesta: Promise.resolve(respuesta()) }

    expect((await fetchData()).config.nombreNegocio).toBe('Barbería Norte')
    expect(red).not.toHaveBeenCalled()

    await fetchData()
    expect(red).toHaveBeenCalledTimes(1)
  })

  it('si el pedido temprano falló por la red, vuelve a pedir', async () => {
    const red = vi.fn(async () => respuesta())
    vi.stubGlobal('fetch', red)
    const fallida = Promise.reject(new TypeError('Failed to fetch'))
    fallida.catch(() => {})
    g.__catalogoTemprano = { url: URL_CATALOGO, respuesta: fallida }

    expect((await fetchData()).config.nombreNegocio).toBe('Barbería Norte')
    expect(red).toHaveBeenCalledTimes(1)
  })

  it('no lo usa para un pedido fresco ni para otra URL', async () => {
    const red = vi.fn(async () => respuesta())
    vi.stubGlobal('fetch', red)
    g.__catalogoTemprano = { url: URL_CATALOGO + '&shop=otro', respuesta: Promise.resolve(respuesta()) }
    await fetchData()
    expect(red).toHaveBeenCalledTimes(1)

    g.__catalogoTemprano = { url: URL_CATALOGO, respuesta: Promise.resolve(respuesta()) }
    await fetchData({ fresh: true })
    expect(red).toHaveBeenCalledTimes(2)
    expect(g.__catalogoTemprano).toBeDefined()
  })
})
