import type { Caption } from '@remotion/captions'
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame, useVideoConfig } from 'remotion'
import { Escena } from './Escena'
import { LETRA } from './fuentes'
import { COLOR, MARGEN, TIPO, ease, lerp, p as prog } from './marca'
import { Subtitulos } from './Subtitulos'
import type { Escena as TEscena } from './tipos'

export type FypProps = {
  /** Duración total en segundos. */
  duracion: number
  /** Escenas con `desde`/`hasta` en segundos del video (todos los `en` ya vienen absolutos). */
  escenas: TEscena[]
  /** Subtítulos de la voz en off (vacío en los MG sin voz). */
  captions: Caption[]
  subtitulos?: { arriba?: number; tamano?: number }
  /** Rutas dentro de public/. */
  voz?: string
  musica?: string
  volumenMusica?: number
  sfx: { t: number; nombre: string; vol?: number }[]
  /** Estilo con hilo: una línea única que viaja entre escenas (y se vuelve la regla de la agenda, el riel del titular…). */
  hilo?: boolean
  /** Etiquetas fijas en las esquinas: FIG. 02 / 05 y el tiempo. */
  etiquetas?: boolean
}


/** Escena visible en el tiempo `t` y su tinta (la nueva cubre a la anterior recién a los 0,25 s si entra con ola/lado/barrido). */
function visibleEn(escenas: TEscena[], t: number) {
  let i = 0
  escenas.forEach((e, n) => {
    if (t >= e.desde + ((e.entrada ?? 'ola') === 'corte' ? 0 : 0.25)) i = n
  })
  return { i, tinta: escenas[i]?.fondo === 'blanco' ? COLOR.carbon : COLOR.papel }
}

/** Posición del hilo en una escena: bajo el titular, o sobre la regla de la agenda. */
function hiloDe(e: TEscena) {
  const estilo = { ...TIPO[e.estilo ?? 'mega'], ...(e.tamano ? { fontSize: e.tamano } : {}) } as { fontSize: number; lineHeight: number }
  const alto = e.titulo.length * (estilo.fontSize * estilo.lineHeight + 0.04 * estilo.fontSize)
  const bajoTitular = 270 + (e.rieles ? 26 + 22 : 0) + alto + 34
  return { y: e.hilo?.y ?? (e.agenda ? e.agendaY ?? 820 : bajoTitular), x0: e.hilo?.x0 ?? MARGEN, x1: e.hilo?.x1 ?? 1080 - MARGEN, g: e.hilo?.grosor ?? 8 }
}

/** Una sola línea que nunca se va: se dibuja al inicio y en cada escena viaja a su nuevo lugar. */
const Hilo: React.FC<{ escenas: TEscena[] }> = ({ escenas }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const t = frame / fps
  const { i, tinta } = visibleEn(escenas, t)
  const e = escenas[i]
  if (!e) return null
  const a = hiloDe(e)
  const antes = i > 0 ? hiloDe(escenas[i - 1]) : a
  const k = i === 0 ? 1 : ease.inOut(prog(t, e.desde + 0.1, 0.6))
  const dibuja = i === 0 ? ease.out(prog(t, 0.25, 0.7)) : 1
  const y = lerp(antes.y, a.y, k)
  const x0 = lerp(antes.x0, a.x0, k)
  const x1 = lerp(antes.x1, a.x1, k)
  const g = lerp(antes.g, a.g, k)
  return <div style={{ position: 'absolute', left: x0, top: y, width: (x1 - x0) * dibuja, height: g, background: tinta, zIndex: 20 }} />
}

/** Etiquetas de esquina fijas (como "FIG. 07" y "BEAT 27 / 60" de las referencias): FIG. 02 / 05 y el tiempo. */
const Etiquetas: React.FC<{ escenas: TEscena[]; duracion: number }> = ({ escenas, duracion }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const t = frame / fps
  const { i, tinta } = visibleEn(escenas, t)
  const dos = (n: number) => String(n).padStart(2, '0')
  const estilo: React.CSSProperties = { position: 'absolute', top: 118, fontFamily: LETRA, fontWeight: 600, fontSize: 30, letterSpacing: '0.16em', color: tinta, opacity: 0.55, fontVariantNumeric: 'tabular-nums', zIndex: 20 }
  const seg = (s: number) => `0:${dos(Math.min(99, Math.floor(s)))}`
  return (
    <>
      <div style={{ ...estilo, left: MARGEN }}>FIG. {dos(i + 1)} / {dos(escenas.length)}</div>
      <div style={{ ...estilo, right: MARGEN }}>{seg(t)} / {seg(duracion)}</div>
    </>
  )
}

/**
 * Video corto de 15–18 s: solo escenas de marca (sin cámara), con voz en off opcional.
 * Mismas escenas que los reels de la campaña (Escena.tsx) y subtítulos grandes.
 */
export const Fyp: React.FC<FypProps> = (p) => {
  const { fps } = useVideoConfig()
  const f = (s: number) => Math.round(s * fps)
  // Los subtítulos cambian de color según el fondo que SE VE: una escena que entra con ola/lado
  // cubre a la anterior recién a los 0,25 s; la anterior sigue debajo hasta entonces.
  const tinta = (ms: number) => {
    const t = ms / 1000
    let visible: TEscena | undefined
    for (const e of p.escenas) if (t >= e.desde + ((e.entrada ?? 'ola') === 'corte' ? 0 : 0.25)) visible = e
    return visible && visible.fondo === 'blanco' ? COLOR.carbon : '#fff'
  }
  return (
    <AbsoluteFill style={{ background: COLOR.carbon }}>
      {p.escenas.map((x, i) => {
        const sig = p.escenas[i + 1]
        // Si la siguiente entra con ola/lado, esta sigue visible un poco más para que entre ENCIMA.
        const extra = sig && (sig.entrada ?? 'ola') !== 'corte' ? 0.5 : 0
        return (
          <Sequence key={i} from={f(x.desde)} durationInFrames={Math.max(1, f(Math.min(p.duracion, x.hasta + extra)) - f(x.desde))}>
            <Escena e={x} rel={(t) => t - x.desde} />
          </Sequence>
        )
      })}
      {p.hilo ? <Hilo escenas={p.escenas} /> : null}
      {p.etiquetas ? <Etiquetas escenas={p.escenas} duracion={p.duracion} /> : null}
      {p.captions.length ? <Subtitulos captions={p.captions} arriba={p.subtitulos?.arriba} tamano={p.subtitulos?.tamano} tinta={tinta} /> : null}
      {p.voz ? <Audio src={staticFile(p.voz)} volume={1} /> : null}
      {p.musica ? <Audio src={staticFile(p.musica)} volume={p.volumenMusica ?? 0.3} /> : null}
      {p.sfx.map((x, i) => (
        <Sequence key={`s${i}`} from={Math.max(0, f(x.t))} layout="none">
          <Audio src={staticFile(`sfx/${x.nombre}.mp3`)} volume={x.vol ?? 0.5} />
        </Sequence>
      ))}
    </AbsoluteFill>
  )
}
