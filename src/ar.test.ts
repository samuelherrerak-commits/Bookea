import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { brotliCompressSync, constants } from 'node:zlib'
import { describe, expect, it } from 'vitest'

// La página /ar es JavaScript sin build (public/ar/js). Se importa por URL para que tsc no la revise.
const AR = resolve(process.cwd(), 'public/ar')
const cargar = (archivo: string) => import(/* @vite-ignore */ new URL(`../public/ar/js/${archivo}`, import.meta.url).href)
const guion = await cargar('guion.js')
const textos = await cargar('textos.js')
const tarjeta = JSON.parse(readFileSync(join(AR, 'tarjeta.json'), 'utf8'))
const d = guion.disposicion(tarjeta)

function estadoEn(t: number) {
  return guion.evaluar(t, d, guion.crearEstado())
}

describe('guion de /ar', () => {
  it('dura entre 12 y 15 s, en 5 escenas seguidas', () => {
    expect(guion.DURACION).toBeGreaterThanOrEqual(12)
    expect(guion.DURACION).toBeLessThanOrEqual(15)
    const escenas = guion.ESCENAS as { nombre: string; inicio: number; fin: number }[]
    expect(escenas.map((e) => e.nombre)).toEqual(['Despertar', 'Ataque', 'Llamada', 'Funciones', 'Cierre'])
    expect(escenas[0].inicio).toBe(0)
    expect(escenas.at(-1)!.fin).toBe(guion.DURACION)
    for (let i = 1; i < escenas.length; i++) expect(escenas[i].inicio).toBe(escenas[i - 1].fin)
  })

  it('empieza con el logo exactamente sobre el impreso, quieto y sin brazos', () => {
    const { pj, hueco } = estadoEn(0)
    expect(pj.x).toBeCloseTo(d.L.x, 6)
    expect(pj.y).toBeCloseTo(d.L.y, 6)
    expect(pj.lu).toBeCloseTo(tarjeta.logo.lado / 32, 6)
    expect(pj.rot).toBe(0)
    expect(pj.estiro).toBe(0)
    expect(pj.extremidades).toBe(0)
    expect(hueco.abierto).toBe(0)
  })

  it('el último cuadro empalma con el primero (el bucle no salta)', () => {
    const fin = estadoEn(guion.DURACION - 1e-4).pj
    const inicio = estadoEn(0).pj
    for (const k of ['x', 'y', 'z', 'lu', 'estiro', 'extremidades', 'grosor'] as const) expect(fin[k]).toBeCloseTo(inicio[k], 2)
    expect(Math.cos(fin.rot)).toBeCloseTo(1, 3)
  })

  it('es determinista: el mismo segundo da el mismo estado', () => {
    for (const t of [0.4, 3.1, 6.6, 9.9, 13.7]) expect(estadoEn(t)).toEqual(estadoEn(t))
  })

  it('cada frase sale en la escena de funciones y la pila no pasa de 4 a la vez', () => {
    const vistas = new Set<number>()
    for (let t = 7.8; t < 12.8; t += 0.05) {
      const e = estadoEn(t)
      // la que va en vuelo todavía no está en la pila
      const apiladas = e.paneles.filter(
        (p: { visible: number; opacidad: number }, i: number) => p.visible && p.opacidad > 0.99 && t >= guion.LANZAMIENTOS[i] + guion.VUELO,
      )
      expect(apiladas.length).toBeLessThanOrEqual(4)
      e.paneles.forEach((p: { visible: number }, i: number) => p.visible && vistas.add(i))
    }
    expect(vistas.size).toBe(textos.FRASES.length)
  })

  it('los sonidos caen dentro del bucle', () => {
    for (const s of guion.SONIDOS) {
      expect(s.t).toBeGreaterThanOrEqual(0)
      expect(s.t).toBeLessThan(guion.DURACION)
    }
  })
})

describe('textos de /ar', () => {
  it('incluye las frases pedidas, en líneas que se leen a tamaño de tarjeta', () => {
    const frases = (textos.FRASES as string[][]).map((l) => l.join(' '))
    expect(frases.slice(0, 3)).toEqual(['Tus clientes reservan desde tu link', 'La cita llega sola a tu Google Calendar', 'Adiós libreta'])
    for (const lineas of textos.FRASES as string[][]) {
      expect(lineas.length).toBeGreaterThanOrEqual(1)
      expect(lineas.length).toBeLessThanOrEqual(2)
      for (const l of lineas) expect(l.length).toBeLessThanOrEqual(22)
    }
  })

  it('el botón final dice "Prueba 1 mes gratis" y va a bookeaa.com', () => {
    expect(textos.CTA).toEqual({ texto: 'Prueba 1 mes gratis', url: 'https://bookeaa.com' })
    const html = readFileSync(join(AR, 'index.html'), 'utf8')
    expect(html).toContain('<a id="cta" href="https://bookeaa.com">Prueba 1 mes gratis</a>')
    expect(html).toContain('Ver en realidad aumentada')
  })
})

describe('archivos de /ar', () => {
  it('el logo medido cae dentro de la tarjeta y el objetivo compilado existe', () => {
    const { logo, ancho, alto } = tarjeta
    expect(logo.x).toBeGreaterThan(0)
    expect(logo.y).toBeGreaterThan(0)
    expect(logo.x + logo.lado).toBeLessThan(ancho)
    expect(logo.y + logo.lado).toBeLessThan(alto)
    expect(statSync(join(AR, 'tarjeta.mind')).size).toBeGreaterThan(50_000)
    expect(existsSync(join(AR, 'tarjeta.webp'))).toBe(true)
  })

  // El CDN de Render comprime con brotli solo lo que es texto; el .mind, las fuentes y la imagen
  // viajan tal cual. Calidad 5: comprime menos que el máximo, así que el número queda por encima.
  it('pesa menos de 3 MB transferidos (como lo sirve Render)', { timeout: 30_000 }, () => {
    let transferido = 0
    const recorrer = (dir: string) => {
      for (const f of readdirSync(dir, { withFileTypes: true })) {
        const ruta = join(dir, f.name)
        if (f.isDirectory()) recorrer(ruta)
        else if (/\.(js|html|json|css|svg|txt)$/.test(f.name))
          transferido += brotliCompressSync(readFileSync(ruta), { params: { [constants.BROTLI_PARAM_QUALITY]: 5 } }).length
        else transferido += statSync(ruta).size
      }
    }
    recorrer(AR)
    expect(transferido).toBeLessThan(3 * 1024 * 1024)
  })

  it('render.yaml deja usar la cámara en el propio sitio y manda /ar a /ar/', () => {
    const yaml = readFileSync(resolve(process.cwd(), 'render.yaml'), 'utf8')
    expect(yaml).toMatch(/Permissions-Policy\s+value: camera=\(self\)/)
    expect(yaml).toMatch(/type: redirect\s+source: \/ar\s+destination: \/ar\//)
  })
})
