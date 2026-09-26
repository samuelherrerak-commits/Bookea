import { describe, expect, it } from 'vitest'
import type { Tema } from '../types'
import { ESTILOS, PALETAS, pageDescription, pageTitle, paletaPorNombre, themeVars } from './theme'
import { DEFAULT_CONFIG } from './normalize'

const HEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i

describe('PALETAS', () => {
  it('tiene ids y nombres únicos con hex válidos', () => {
    expect(new Set(PALETAS.map((p) => p.id)).size).toBe(PALETAS.length)
    expect(new Set(PALETAS.map((p) => p.nombre)).size).toBe(PALETAS.length)
    for (const p of PALETAS) {
      for (const color of [p.base, p.soft, p.deep]) expect(color).toMatch(HEX)
    }
  })
})

describe('paletaPorNombre', () => {
  it('acepta el id, el nombre del dropdown, acentos y mayúsculas', () => {
    expect(paletaPorNombre('Rosa Clásico')?.id).toBe('rosa-clasico')
    expect(paletaPorNombre('rosa-clasico')?.id).toBe('rosa-clasico')
    expect(paletaPorNombre('  AZUL NOCHE ')?.id).toBe('azul-noche')
    expect(paletaPorNombre('carbón')?.id).toBe('carbon')
  })

  it('devuelve null si no la conoce', () => {
    expect(paletaPorNombre('no existe')).toBeNull()
    expect(paletaPorNombre('')).toBeNull()
  })
})

describe('themeVars', () => {
  const tema: Tema = { base: '#111111', soft: '#222222', deep: '#333333', estilo: 'moderno' }

  it('mapea los tres colores a las variables que usa Tailwind', () => {
    const vars = themeVars(tema)
    expect(vars['--color-rose']).toBe('#111111')
    expect(vars['--color-rose-soft']).toBe('#222222')
    expect(vars['--color-rose-deep']).toBe('#333333')
  })

  it('el estilo decide la tipografía del título', () => {
    expect(themeVars({ ...tema, estilo: 'elegante' })['--font-display']).toContain('Instrument Serif')
    expect(themeVars({ ...tema, estilo: 'editorial' })['--font-display']).toContain('Instrument Serif')
    expect(themeVars({ ...tema, estilo: 'amable' })['--font-display']).toContain('Inter Variable')
  })

  it('no toca los colores neutros de fondo y texto', () => {
    expect(Object.keys(themeVars(tema))).toHaveLength(4)
  })
})

describe('título y descripción de la página', () => {
  const config = { ...DEFAULT_CONFIG, marca: 'BySamuelStudio', heroTitulo: 'BySamuelStudio', heroSubtitulo: 'Gorras' }

  it('el título es marca + separador', () => {
    expect(pageTitle(config)).toBe('BySamuelStudio | VirtualStudio')
  })

  it('no repite la marca cuando el título del hero ya la dice', () => {
    expect(pageDescription(config)).toBe('BySamuelStudio. Gorras')
  })

  it('añade la marca cuando el título del hero no la menciona', () => {
    const otro = { ...config, heroTitulo: 'Reserva tu cita en minutos' }
    expect(pageDescription(otro)).toBe('Reserva tu cita en minutos en BySamuelStudio. Gorras')
  })
})

describe('Code.gs y theme.ts tienen la misma lista de paletas', () => {
  // Code.gs se incrusta como texto para comparar las dos listas sin depender de Node.
  const codeGs = import.meta.glob('../../apps-script/Code.gs', { query: '?raw', import: 'default', eager: true })
  const gs = Object.values(codeGs as Record<string, string>)[0] ?? ''

  it('coinciden id, nombre y los tres colores de cada paleta', () => {
    for (const p of PALETAS) {
      expect(gs).toContain(`id: '${p.id}'`)
      expect(gs).toContain(`nombre: '${p.nombre}'`)
      expect(gs).toContain(`base: '${p.base}'`)
      expect(gs).toContain(`soft: '${p.soft}'`)
      expect(gs).toContain(`deep: '${p.deep}'`)
    }
  })

  it('no sobran paletas en el backend', () => {
    expect(gs.match(/id: '[^']+'/g) ?? []).toHaveLength(PALETAS.length)
  })

  it('coinciden los estilos de tipografía', () => {
    for (const e of ESTILOS) expect(gs).toContain(`'${e}'`)
    expect(gs).toContain('elegante | moderno | editorial | amable')
  })
})
