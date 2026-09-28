/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { derivarAcento, derivarNeutros } from '../lib/color'
import { LUGAR_TIPOS } from '../lib/lugar'
import { PLANTILLAS_MENSAJE, renderMensaje, VARIABLES_MENSAJE } from '../lib/mensajes'
import { ESTILO_DEF, ESTILOS, PALETAS, themeVars } from '../lib/theme'
import { constanteGs } from './appsScript'

const raw = (glob: Record<string, unknown>) => (Object.values(glob)[0] as string | undefined) ?? ''
const html = raw(import.meta.glob('../../apps-script/cliente/Sidebar.html', { query: '?raw', import: 'default', eager: true }))
const configurador = raw(
  import.meta.glob('../../apps-script/cliente/Configurador.gs', { query: '?raw', import: 'default', eager: true }),
)
const codeGs = raw(import.meta.glob('../../apps-script/Code.gs', { query: '?raw', import: 'default', eager: true }))
// Vitest no entrega el CSS como texto con ?raw: se lee del disco.
const css = readFileSync(resolve(process.cwd(), 'src/index.css'), 'utf8')

interface EstiloSidebar {
  id: string
  display: string
  sans: string
  peso: number
  mayus: boolean
  radio: number
}
interface LogicaSidebar {
  ESTILOS: EstiloSidebar[]
  PALETAS: unknown
  LUGAR_TIPOS: unknown
  VARIABLES: string[]
  derivarAcento: typeof derivarAcento
  derivarNeutros: typeof derivarNeutros
  textoSobre: (hex: string) => string
  renderMensaje: typeof renderMensaje
  etiquetaLugar: (tipo: string, nombre?: string) => string
}

/** El <script id="logica"> de la barra lateral, evaluado tal cual. */
const Logica = (() => {
  const m = /<script id="logica">([\s\S]*?)<\/script>/.exec(html)
  if (!m) throw new Error('Sidebar.html no tiene <script id="logica">')
  return new Function(`${m[1]}\nreturn Logica;`)() as LogicaSidebar
})()

const familia = (stack: string) => (/'([^']+)'/.exec(stack)?.[1] ?? stack).replace(/ Variable$/, '')

/** Peso, mayúsculas y radio de cada estilo según index.css (lo que ve la página). */
function formaCss(id: string) {
  const bloque = new RegExp(`\\[data-estilo='${id}'\\]\\s*\\{([^}]*)\\}`).exec(css)?.[1] ?? ''
  const valor = (v: string) => new RegExp(`${v}:\\s*([^;]+);`).exec(bloque)?.[1]?.trim()
  const radio = valor('--radius-2xl')
  return {
    peso: Number(valor('--display-weight') ?? 400),
    mayus: valor('--display-case') === 'uppercase',
    radio: radio ? Math.round(parseFloat(radio) * 16) : 16,
  }
}

describe('barra lateral: listas iguales a la página', () => {
  it('estilos: mismos ids, fuentes y forma que theme.ts e index.css', () => {
    expect(Logica.ESTILOS.map((e) => e.id)).toEqual(ESTILOS)
    for (const e of Logica.ESTILOS) {
      const def = ESTILO_DEF[e.id as keyof typeof ESTILO_DEF]
      expect(e.display, e.id).toBe(familia(def.display))
      expect(e.sans, e.id).toBe(familia(def.sans))
      expect({ peso: e.peso, mayus: e.mayus, radio: e.radio }, e.id).toEqual(formaCss(e.id))
    }
  })

  it('las fuentes de la vista previa están en el enlace de Google Fonts', () => {
    for (const e of Logica.ESTILOS) {
      for (const f of [e.display, e.sans]) expect(html, f).toContain(`family=${f.replace(/ /g, '+')}`)
    }
  })

  it('paletas, tipos de lugar y variables del mensaje', () => {
    expect(Logica.PALETAS).toEqual(PALETAS)
    expect(Logica.LUGAR_TIPOS).toEqual(LUGAR_TIPOS)
    expect(Logica.VARIABLES).toEqual([...VARIABLES_MENSAJE])
  })
})

describe('barra lateral: mismos cálculos que la página', () => {
  const principales = ['#F2C94C', '#E5B8C1', '#1F6F5C', '#FF5A36', '#111111', '#C6F432']
  const fondos = ['#FFFFFF', '#FDFBF7', '#F4EFE6', '#111111', '#1E2A3A']

  it('colores derivados', () => {
    for (const f of fondos) {
      expect(Logica.derivarNeutros(f), f).toEqual(derivarNeutros(f))
      for (const p of principales) expect(Logica.derivarAcento(p, f), `${p} sobre ${f}`).toEqual(derivarAcento(p, f))
    }
  })

  it('texto sobre el color de acento', () => {
    for (const p of principales) {
      const vars = themeVars({ base: p, soft: p, deep: p, estilo: 'moderno' })
      expect(Logica.textoSobre(p), p).toBe(vars['--color-on-rose'])
    }
  })

  it('mensaje de ejemplo con las 3 plantillas', () => {
    const vars = {
      negocio: 'Estudio', nombre: 'Ana', telefono: '0412', fecha: 'Lunes 1', hora: '9:00 a. m.', duracion: '1 h',
      servicios: '• Corte — 10 €', lugar: 'En el estudio', direccion: '', cupon: '', total: '10 €', pago: 'En la cita',
      comprobante: '', calendario: 'https://c', reserva: '#AB',
    }
    for (const p of PLANTILLAS_MENSAJE) expect(Logica.renderMensaje(p.texto, vars), p.nombre).toBe(renderMensaje(p.texto, vars))
  })
})

describe('Configurador.gs', () => {
  it('usa el mismo token y las mismas plantillas que el maestro', () => {
    expect(constanteGs(configurador, 'TOKEN')).toBe(constanteGs(codeGs, 'TOKEN'))
    expect(constanteGs(configurador, 'PLANTILLAS_MENSAJE')).toEqual(PLANTILLAS_MENSAJE)
  })

  it('las claves que guarda cada sección son las mismas en la barra lateral y existen en la hoja', () => {
    const servidor = constanteGs<Record<string, string[]>>(configurador, 'CLAVES_POR_SECCION')
    const cliente = new Function(`${/var CLAVES = \{[\s\S]*?\n {2}\};/.exec(html)?.[0]}\nreturn CLAVES;`)()
    expect(cliente).toEqual(servidor)
    const defaults = constanteGs<[string, string][]>(codeGs, 'CONFIG_DEFAULTS', ['ZONA']).map(([k]) => k)
    for (const k of Object.values(servidor).flat()) expect(defaults, k).toContain(k)
  })
})
