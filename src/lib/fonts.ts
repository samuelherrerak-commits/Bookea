import type { ThemeEstilo } from '../types'

/**
 * Cada estilo descarga solo sus dos fuentes. Vite convierte cada import() de CSS en
 * un archivo aparte, así que un negocio "moderno" nunca baja Fraunces ni Playfair.
 * Inter e Instrument Serif ya vienen en main.tsx: son las del esqueleto de carga.
 */
const LOADERS: Record<ThemeEstilo, () => Promise<unknown>[]> = {
  elegante: () => [],
  moderno: () => [import('@fontsource/plus-jakarta-sans/600.css'), import('@fontsource/plus-jakarta-sans/700.css')],
  editorial: () => [
    import('@fontsource/newsreader/500.css'),
    import('@fontsource/newsreader/500-italic.css'),
    import('@fontsource/source-sans-3/400.css'),
    import('@fontsource/source-sans-3/600.css'),
  ],
  amable: () => [
    import('@fontsource/nunito/400.css'),
    import('@fontsource/nunito/600.css'),
    import('@fontsource/nunito/800.css'),
  ],
  audaz: () => [
    import('@fontsource/barlow-condensed/700.css'),
    import('@fontsource/barlow-condensed/800.css'),
    import('@fontsource/barlow/400.css'),
    import('@fontsource/barlow/500.css'),
    import('@fontsource/barlow/600.css'),
  ],
  clasico: () => [
    import('@fontsource/playfair-display/600.css'),
    import('@fontsource/playfair-display/600-italic.css'),
    import('@fontsource/lato/400.css'),
    import('@fontsource/lato/700.css'),
  ],
  minimal: () => [
    import('@fontsource/dm-sans/400.css'),
    import('@fontsource/dm-sans/500.css'),
    import('@fontsource/dm-sans/600.css'),
  ],
  retro: () => [
    import('@fontsource/fraunces/600.css'),
    import('@fontsource/fraunces/600-italic.css'),
    import('@fontsource/figtree/400.css'),
    import('@fontsource/figtree/600.css'),
  ],
}

const cargados = new Set<ThemeEstilo>()

export async function loadEstiloFonts(estilo: ThemeEstilo): Promise<void> {
  if (cargados.has(estilo) || !LOADERS[estilo]) return
  cargados.add(estilo)
  try {
    await Promise.all(LOADERS[estilo]())
  } catch {
    // Sin la fuente se ve el respaldo del sistema; la página sigue funcionando.
    cargados.delete(estilo)
  }
}
