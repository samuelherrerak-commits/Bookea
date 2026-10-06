import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { brotliCompressSync, constants } from 'node:zlib'
import { describe, expect, it } from 'vitest'

// /ar2 (la agenda malvada) es JavaScript sin build (public/ar2/js). Se importa por URL para que
// tsc no la revise. Las librerías y fuentes compartidas están en public/ar-comun.
const AR = resolve(process.cwd(), 'public/ar2')
const COMUN = resolve(process.cwd(), 'public/ar-comun')
const cargar = (archivo: string) => import(/* @vite-ignore */ new URL(`../public/ar2/js/${archivo}`, import.meta.url).href)
const guion = await cargar('guion.js')
const textos = await cargar('textos.js')
const sonido = await cargar('sonido.js')
const tarjeta = JSON.parse(readFileSync(join(AR, 'tarjeta.json'), 'utf8'))
const d = guion.disposicion(tarjeta)

function estadoEn(t: number) {
  return guion.evaluar(t, d, guion.crearEstado())
}
const distancia = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y)

describe('guion de /ar2', () => {
  it('dura 15 s, en las 8 escenas del guion gráfico, seguidas', () => {
    expect(guion.DURACION).toBe(15)
    const escenas = guion.ESCENAS as { nombre: string; inicio: number; fin: number }[]
    expect(escenas.map((e) => e.nombre)).toEqual([
      'Algo se mueve',
      'La villana rompe la tarjeta',
      'Bookee le hace frente',
      'Ruge y bookee se asusta',
      'Está a punto de comérselo',
      '¡Agendado!',
      'Se encoge y cae',
      'Su firma',
    ])
    expect(escenas[0].inicio).toBe(0)
    expect(escenas.at(-1)!.fin).toBe(guion.DURACION)
    for (let i = 1; i < escenas.length; i++) expect(escenas[i].inicio).toBe(escenas[i - 1].fin)
  })

  it('el bucle empalma: al empezar y al terminar la tarjeta está entera y no hay nadie', () => {
    for (const t of [0, guion.DURACION - 1e-4]) {
      const e = estadoEn(t)
      expect(e.b.visible).toBe(0)
      expect(e.v.visible).toBe(0)
      expect(e.hueco.apertura).toBeCloseTo(0, 3)
      expect(e.hueco.interior).toBe(0)
      expect(e.hueco.solapas).toBeCloseTo(0, 3)
      expect(e.citas.every((c: { visible: number }) => !c.visible)).toBe(true)
    }
  })

  it('la villana sale desde el centro de la tarjeta, rompiéndola', () => {
    const grieta = estadoEn(1.0)
    expect(grieta.hueco.grieta).toBeGreaterThan(0.5)
    expect(grieta.v.visible).toBe(0)
    const sale = estadoEn(1.9)
    expect(sale.hueco.apertura).toBeGreaterThan(0.9)
    expect(sale.v.visible).toBe(1)
    expect(sale.v.z).toBeLessThan(0) // todavía dentro del hueco
    expect(distancia(sale.v, d.hueco)).toBeLessThan(1)
    expect(Math.abs(d.hueco.x)).toBeLessThan(5)
    expect(Math.abs(d.hueco.y)).toBeLessThan(5)
    const afuera = estadoEn(3.2)
    expect(afuera.v.z).toBe(0)
    expect(distancia(afuera.v, d.villana)).toBeLessThan(1)
  })

  it('bookee entra por un costado de la tarjeta, desafiante', () => {
    const entra = estadoEn(3.5)
    expect(entra.b.visible).toBe(1)
    expect(entra.b.x).toBeLessThan(-tarjeta.ancho / 2) // afuera de la tarjeta
    const plantado = estadoEn(4.6)
    expect(distancia(plantado.b, d.bookee)).toBeLessThan(1)
    expect(plantado.b.ojos).toBe(3) // decidido
  })

  it('se asusta, la villana casi se lo come y bookee la vence con «¡Agendado!»', () => {
    expect(estadoEn(5.6).b.ojos).toBe(2) // susto
    const casi = estadoEn(9.3)
    expect(casi.v.boca).toBe(1) // rugido
    expect(distancia(casi.v, casi.b)).toBeLessThan(26)
    const agendado = estadoEn(10.6)
    expect(agendado.globos.agendado).toBeGreaterThan(0.5)
    expect(agendado.v.ojos).toBe(1) // ojos en X
    expect(agendado.v.hojas).toBe(0)
    expect(agendado.citas.filter((c: { visible: number }) => c.visible).length).toBe(textos.CITAS.length)
    const cae = estadoEn(12.45)
    expect(cae.v.z).toBeLessThan(-10)
    expect(estadoEn(12.7).v.visible).toBe(0)
    const firma = estadoEn(14)
    expect(firma.b.ojos).toBe(4) // guiño
    expect(firma.b.manos[1].tipo).toBe(2) // pulgar arriba
    expect(firma.boton).toBe(1)
  })

  it('es determinista: el mismo segundo da el mismo estado', () => {
    for (const t of [0.4, 2.1, 4.6, 8.8, 10.2, 12.3, 14.2]) expect(estadoEn(t)).toEqual(estadoEn(t))
  })

  it('los sonidos caen dentro del bucle y todos existen', () => {
    for (const s of guion.SONIDOS) {
      expect(s.t).toBeGreaterThanOrEqual(0)
      expect(s.t).toBeLessThan(guion.DURACION)
      expect(sonido.existe(s.id), s.id).toBe(true)
    }
  })
})

describe('página de /ar2', () => {
  it('entra directo a la realidad aumentada, sin pantalla inicial', () => {
    const html = readFileSync(join(AR, 'index.html'), 'utf8')
    expect(html).not.toContain('id="inicio"')
    expect(html).not.toContain('id="ver-ar"')
    expect(html).toContain('<body data-pantalla="cargando"')
    expect(html).toContain('sobre una mesa')
    expect(html).toContain('<a id="cta" href="https://bookeaa.com">Prueba 1 mes gratis</a>')
    const app = readFileSync(join(AR, 'js/app.js'), 'utf8')
    expect(app).toMatch(/if \(PRUEBA\) verSinCamara\('elegido'\)\nelse verEnAR\(\)\s*$/)
  })

  it('los globos y las citas se leen a tamaño de tarjeta', () => {
    for (const g of Object.values(textos.GLOBOS) as string[]) expect(g.length).toBeLessThanOrEqual(12)
    for (const [titulo, hora] of textos.CITAS as string[][]) {
      expect(titulo.length).toBeLessThanOrEqual(16)
      expect(hora.length).toBeLessThanOrEqual(14)
    }
  })

  it('el objetivo es la tarjeta 2 sin esquinas y está compilado', () => {
    expect(tarjeta.tarjeta).toBe(2)
    expect(tarjeta.quitar).toEqual(['.esq'])
    expect(statSync(join(AR, 'tarjeta.mind')).size).toBeGreaterThan(50_000)
    expect(existsSync(join(AR, 'tarjeta.webp'))).toBe(true)
  })

  // Igual que /ar1: lo que es texto viaja con brotli, el resto tal cual.
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
    recorrer(COMUN)
    expect(transferido).toBeLessThan(3 * 1024 * 1024)
  })

  it('render.yaml manda /ar2 a /ar2/', () => {
    const yaml = readFileSync(resolve(process.cwd(), 'render.yaml'), 'utf8')
    expect(yaml).toMatch(/type: redirect\s+source: \/ar2\s+destination: \/ar2\//)
  })
})
