import type { BusinessConfig, Tema, ThemeEstilo } from '../types'

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

/** Elegante y editorial usan serif; moderno y amable, sans. */
export const ESTILOS: readonly ThemeEstilo[] = ['elegante', 'moderno', 'editorial', 'amable']

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

const DISPLAY_FONT: Record<ThemeEstilo, string> = {
  elegante: "'Instrument Serif', ui-serif, Georgia, serif",
  editorial: "'Instrument Serif', ui-serif, Georgia, serif",
  moderno: "'Inter Variable', ui-sans-serif, system-ui, sans-serif",
  amable: "'Inter Variable', ui-sans-serif, system-ui, sans-serif",
}

/**
 * Tailwind v4 compila `text-rose-deep` a `var(--color-rose-deep)`, así que pisar estas
 * cuatro variables en `:root` repinta los ~58 usos de `rose` sin tocar un solo componente.
 * `sand`, `ink`, `muted` y `line` quedan neutros a propósito: son fondo y texto base.
 */
export function themeVars(tema: Tema): Record<string, string> {
  return {
    '--color-rose': tema.base,
    '--color-rose-soft': tema.soft,
    '--color-rose-deep': tema.deep,
    '--font-display': DISPLAY_FONT[tema.estilo],
  }
}

export function applyTheme(tema: Tema): void {
  const root = document.documentElement
  for (const [key, value] of Object.entries(themeVars(tema))) root.style.setProperty(key, value)
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
  setMeta('meta[name="theme-color"]', 'content', config.tema.soft)
  if (config.logoUrl) {
    let icon = document.head.querySelector<HTMLLinkElement>('link[rel="icon"]')
    if (!icon) {
      icon = document.createElement('link')
      icon.rel = 'icon'
      document.head.appendChild(icon)
    }
    icon.type = 'image/png'
    icon.href = config.logoUrl
  }
}
