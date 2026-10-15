import type { Caption } from '@remotion/captions'
import { AbsoluteFill, Audio, Sequence, staticFile, useVideoConfig } from 'remotion'
import { Escena } from './Escena'
import { COLOR } from './marca'
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
