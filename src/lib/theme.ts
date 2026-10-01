import type { BusinessConfig, Tema, ThemeEstilo } from '../types'
import { contrast, derivarNeutros } from './color'
import { loadEstiloFonts } from './fonts'

export interface Paleta {
  id: string
  nombre: string
  base: string
  soft: string
  deep: string
}

/**
 * Paletas predefinidas. La misma lista vive en `apps-script/Code.gs` (dropdown de la
 * hoja); `theme.test.ts` falla si las dos se desincronizan.
 */
export const PALETAS: readonly Paleta[] = [
  { id: 'rosa-clasico', nombre: 'Rosa Clásico', base: '#E5B8C1', soft: '#F6E6E9', deep: '#B97A88' },
  { id: 'rosa-palo', nombre: 'Rosa Palo', base: '#D9B3B8', soft: '#F7ECEE', deep: '#9E6B72' },
  { id: 'coral', nombre: 'Coral', base: '#F0A08C', soft: '#FCE8E2', deep: '#C45A3C' },
  { id: 'terracota', nombre: 'Terracota', base: '#D9A08C', soft: '#F7E9E2', deep: '#A65E43' },
  { id: 'salvia', nombre: 'Salvia', base: '#A8BFA8', soft: '#E8F0E8', deep: '#5F7A5F' },
  { id: 'bosque', nombre: 'Bosque', base: '#7FA894', soft: '#E4F0E9', deep: '#3E6B55' },
  { id: 'azul-noche', nombre: 'Azul Noche', base: '#8FA8C8', soft: '#E6EDF6', deep: '#3E5A80' },
  { id: 'lavanda', nombre: 'Lavanda', base: '#B8A8D0', soft: '#EEE9F6', deep: '#6E5A96' },
  { id: 'dorado', nombre: 'Dorado', base: '#D9BC7A', soft: '#F7EFD9', deep: '#A8862F' },
  { id: 'carbon', nombre: 'Carbón', base: '#9A9A9A', soft: '#EDEDED', deep: '#3A3A3A' },
]

/** "Rosa Clásico" y "rosa-clasico" apuntan al mismo lado. */
const norm = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')

export function paletaPorNombre(value: string): Paleta | null {
  const key = norm(value)
  if (!key) return null
  return PALETAS.find((p) => norm(p.id) === key || norm(p.nombre) === key) ?? null
}

export interface EstiloDef {
  nombre: string
  /** Para quien elige en la hoja: a qué tipo de negocio le queda. */
  descripcion: string
  display: string
  sans: string
}

const SANS_FALLBACK = 'ui-sans-serif, system-ui, -apple-system, sans-serif'
const SERIF_FALLBACK = 'ui-serif, Georgia, serif'

/**
 * Cada estilo es un par de fuentes más unos detalles de forma (esquinas, mayúsculas,
 * sombras) que viven en index.css bajo `[data-estilo]`. La distribución de la página
 * es la misma en todos. La lista y el orden se repiten en `apps-script/Code.gs`.
 */
export const ESTILO_DEF: Record<ThemeEstilo, EstiloDef> = {
  elegante: {
    nombre: 'Elegante',
    descripcion: 'Serif fina con acento en cursiva. Uñas, estética, novias.',
    display: `'Instrument Serif', ${SERIF_FALLBACK}`,
    sans: `'Inter Variable', ${SANS_FALLBACK}`,
  },
  moderno: {
    nombre: 'Moderno',
    descripcion: 'Sans geométrica y firme. Barberías, estudios, fitness.',
    display: `'Plus Jakarta Sans', ${SANS_FALLBACK}`,
    sans: `'Inter Variable', ${SANS_FALLBACK}`,
  },
  editorial: {
    nombre: 'Editorial',
    descripcion: 'Serif de revista y filetes finos. Consultas, terapias, estudios creativos.',
    display: `'Newsreader', ${SERIF_FALLBACK}`,
    sans: `'Source Sans 3', ${SANS_FALLBACK}`,
  },
  amable: {
    nombre: 'Amable',
    descripcion: 'Redondeada y cercana. Mascotas, niños, spa familiar.',
    display: `'Nunito', ${SANS_FALLBACK}`,
    sans: `'Nunito', ${SANS_FALLBACK}`,
  },
  audaz: {
    nombre: 'Audaz',
    descripcion: 'Condensada, gruesa y en mayúsculas, como bookeaa. Barberías, tatuajes, entrenadores.',
    display: `'Barlow Condensed', 'Arial Narrow', ${SANS_FALLBACK}`,
    sans: `'Barlow', ${SANS_FALLBACK}`,
  },
  clasico: {
    nombre: 'Clásico',
    descripcion: 'Serif de contraste alto, sobria. Peluquerías de siempre, sastrería, spa.',
    display: `'Playfair Display', ${SERIF_FALLBACK}`,
    sans: `'Lato', ${SANS_FALLBACK}`,
  },
  minimal: {
    nombre: 'Minimal',
    descripcion: 'Una sola sans, mucho aire y sin sombras. Estudios, clínicas, diseño.',
    display: `'DM Sans', ${SANS_FALLBACK}`,
    sans: `'DM Sans', ${SANS_FALLBACK}`,
  },
  retro: {
    nombre: 'Retro',
    descripcion: 'Serif cálida y suave, esquinas muy redondas. Cafés, pastelería, bienestar.',
    display: `'Fraunces', ${SERIF_FALLBACK}`,
    sans: `'Figtree', ${SANS_FALLBACK}`,
  },
}

export const ESTILOS = Object.keys(ESTILO_DEF) as ThemeEstilo[]

/** Texto oscuro o blanco, el que más se lea sobre el color de acento. */
function textoSobre(base: string): string {
  const oscuro = '#1A1816'
  return contrast(base, oscuro) >= contrast(base, '#FFFFFF') ? oscuro : '#FFFFFF'
}

/** Neutros que pisa un `color_fondo`. Sin fondo propio se quitan y vuelven los de index.css. */
const NEUTRAL_VARS = ['--color-bg', '--color-surface', '--color-sand', '--color-line', '--color-ink', '--color-muted'] as const

/**
 * Tailwind v4 compila `text-rose-deep` a `var(--color-rose-deep)`, así que pisar estas
 * variables en `:root` repinta la app sin tocar un solo componente. Los neutros
 * (fondo, superficies y textos) solo se pisan cuando el negocio eligió un fondo.
 */
export function themeVars(tema: Tema): Record<string, string> {
  const def = ESTILO_DEF[tema.estilo] ?? ESTILO_DEF.elegante
  const vars: Record<string, string> = {
    '--color-rose': tema.base,
    '--color-rose-soft': tema.soft,
    '--color-rose-deep': tema.deep,
    '--color-on-rose': textoSobre(tema.base),
    '--font-display': def.display,
    '--font-sans': def.sans,
  }
  if (tema.fondo) {
    const n = derivarNeutros(tema.fondo)
    Object.assign(vars, {
      '--color-bg': n.bg,
      '--color-surface': n.surface,
      '--color-sand': n.sand,
      '--color-line': n.line,
      '--color-ink': n.ink,
      '--color-muted': n.muted,
    })
  }
  return vars
}

export function applyTheme(tema: Tema): void {
  const root = document.documentElement
  for (const key of NEUTRAL_VARS) root.style.removeProperty(key)
  for (const [key, value] of Object.entries(themeVars(tema))) root.style.setProperty(key, value)
  // Las reglas de forma por estilo (esquinas, mayúsculas, sombras) cuelgan de este atributo.
  root.dataset.estilo = tema.estilo
  void loadEstiloFonts(tema.estilo)
}

function setMeta(selector: string, attr: string, value: string) {
  const el = document.head.querySelector(selector)
  if (el) el.setAttribute(attr, value)
}

/** `{marca} | VirtualStudio`, sin repetir la marca si el título del hero ya la menciona. */
export function pageTitle(config: BusinessConfig): string {
  return `${config.marca} | VirtualStudio`
}

export function pageDescription(config: BusinessConfig): string {
  const { marca, heroTitulo, heroSubtitulo } = config
  const titulo = heroTitulo.toLowerCase().includes(marca.toLowerCase())
    ? `${heroTitulo}.`
    : `${heroTitulo} en ${marca}.`
  return `${titulo} ${heroSubtitulo}`.trim()
}

/** Colores, título, descripción y favicon: todo lo que identifica al negocio en el navegador. */
export function applyBranding(config: BusinessConfig): void {
  applyTheme(config.tema)
  document.title = pageTitle(config)
  setMeta('meta[name="description"]', 'content', pageDescription(config))
  setMeta('meta[name="theme-color"]', 'content', config.tema.fondo ?? config.tema.soft)
  if (config.logoUrl && typeof Image !== 'undefined') {
    // Solo si la imagen carga: un logo roto no debe dejar la pestaña sin ícono.
    const prueba = new Image()
    prueba.referrerPolicy = 'no-referrer'
    prueba.onload = () => {
      let icon = document.head.querySelector<HTMLLinkElement>('link[rel="icon"]')
      if (!icon) {
        icon = document.createElement('link')
        icon.rel = 'icon'
        document.head.appendChild(icon)
      }
      icon.removeAttribute('type')
      icon.href = config.logoUrl
    }
    prueba.src = config.logoUrl
  }
}
