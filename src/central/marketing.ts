import type { Publicacion, EstadoPublicacion } from './api'

/** Etiquetas del calendario y la cola de Marketing (Central). */
export const ESTADO_PUB: Record<EstadoPublicacion, { texto: string; clase: string; color: string }> = {
  borrador: { texto: 'Borrador', clase: 'bg-sand text-ink', color: '#a99f92' },
  aprobado: { texto: 'Aprobado', clase: 'bg-ok/15 text-ok', color: '#5e8a6a' },
  publicado: { texto: 'Publicado', clase: 'bg-ink text-bg', color: '#1c1a17' },
  omitido: { texto: 'Omitido', clase: 'bg-ink/10 text-muted', color: '#ddd5c9' },
}

export const TIPO_PUB: Record<string, string> = {
  'video-mg': 'Video MG',
  'video-voz': 'Video con voz',
  'video-cam': 'Video en cámara',
  carrusel: 'Carrusel',
  campana: 'Campaña',
}

export const tipoPub = (t: string) => TIPO_PUB[t] ?? t

/** Más cercana primero: por fecha, luego hora, luego id. */
export const ordenar = (lista: Publicacion[]) =>
  [...lista].sort((a, b) => a.fecha.localeCompare(b.fecha) || a.hora.localeCompare(b.hora) || a.id.localeCompare(b.id))

/** Agrupa por día (la lista ya debe venir ordenada). */
export function porDia(lista: Publicacion[]): { fecha: string; items: Publicacion[] }[] {
  const grupos: { fecha: string; items: Publicacion[] }[] = []
  for (const p of lista) {
    const g = grupos[grupos.length - 1]
    if (g && g.fecha === p.fecha) g.items.push(p)
    else grupos.push({ fecha: p.fecha, items: [p] })
  }
  return grupos
}

const MS_DIA = 86400_000
const aUTC = (ymd: string) => Date.parse(ymd + 'T00:00:00Z')
const deUTC = (ms: number) => new Date(ms).toISOString().slice(0, 10)

/** Semanas (lunes a domingo) que cubren el mes `ym` (yyyy-MM), con cada día como yyyy-MM-dd. */
export function semanasDelMes(ym: string): string[][] {
  const primero = aUTC(ym + '-01')
  const lunes = primero - ((new Date(primero).getUTCDay() + 6) % 7) * MS_DIA
  const ultimo = new Date(Date.UTC(+ym.slice(0, 4), +ym.slice(5, 7), 0)).getTime()
  const semanas: string[][] = []
  for (let ini = lunes; ini <= ultimo; ini += 7 * MS_DIA) semanas.push(Array.from({ length: 7 }, (_, i) => deUTC(ini + i * MS_DIA)))
  return semanas
}

export const mesAnterior = (ym: string) => deUTC(Date.UTC(+ym.slice(0, 4), +ym.slice(5, 7) - 2, 1)).slice(0, 7)
export const mesSiguiente = (ym: string) => deUTC(Date.UTC(+ym.slice(0, 4), +ym.slice(5, 7), 1)).slice(0, 7)

export const contar = (lista: Publicacion[], estado: EstadoPublicacion) => lista.filter((p) => p.estado === estado).length

/** Lo que se pega al publicar: texto + hashtags. */
export const textoParaPublicar = (p: Pick<Publicacion, 'caption' | 'hashtags'>) => [p.caption.trim(), p.hashtags.trim()].filter(Boolean).join('\n\n')

/** Se pasó de fecha y no se publicó ni se omitió. */
export const atrasada = (p: Publicacion, hoy: string, ahora = '') =>
  (p.estado === 'borrador' || p.estado === 'aprobado') && (p.fecha < hoy || (p.fecha === hoy && !!ahora && p.hora < ahora))
