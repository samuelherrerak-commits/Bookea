import { AbsoluteFill, Audio, OffthreadVideo, Sequence, staticFile, useCurrentFrame, useVideoConfig, interpolate } from 'remotion'
import { Cierre } from './Cierre'
import { Enfasis } from './Enfasis'
import { GANCHO_S, Gancho } from './Gancho'
import { PERSIANA_S, Persiana } from './Persiana'
import { Subtitulos } from './Subtitulos'
import { duracionSegmento, inicios, remapearCaptions } from './tiempo'
import { CIERRE_S, type Edicion, type Segmento } from './tipos'

/** Un tramo de cámara. Los cortes alternan un zoom leve para disimular el salto (jump cut). */
const Tramo: React.FC<{ video: string; s: Segmento; indice: number }> = ({ video, s, indice }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const base = indice % 2 === 0 ? 1 : 1.09
  // Deriva muy lenta para que el plano respire.
  const deriva = interpolate(frame, [0, duracionSegmento(s) * fps], [0, 0.025], { extrapolateRight: 'clamp' })
  const cubrir: React.CSSProperties = { width: '100%', height: '100%', objectFit: 'cover' }
  return (
    <AbsoluteFill style={{ transform: `scale(${base + deriva})` }}>
      {video ? <OffthreadVideo src={staticFile(video)} trimBefore={Math.round(s.desde * fps)} style={cubrir} /> : <AbsoluteFill style={{ background: '#2a2a28' }} />}
      {s.broll ? (
        <AbsoluteFill>
          <OffthreadVideo src={staticFile(s.broll)} muted style={cubrir} />
        </AbsoluteFill>
      ) : null}
    </AbsoluteFill>
  )
}

export const Vlog: React.FC<Edicion> = (e) => {
  const { fps } = useVideoConfig()
  const ini = inicios(e.segmentos)
  const captions = remapearCaptions(e.captions, e.segmentos)
  const finCortes = e.segmentos.reduce((a, s) => a + duracionSegmento(s), 0)
  const f = (s: number) => Math.round(s * fps)

  return (
    <AbsoluteFill style={{ background: '#0f0f0e' }}>
      {e.segmentos.map((s, i) => (
        <Sequence key={i} from={f(ini[i])} durationInFrames={Math.max(1, f(ini[i] + duracionSegmento(s)) - f(ini[i]))}>
          <Tramo video={e.video} s={s} indice={i} />
        </Sequence>
      ))}

      {/* Oscurece un poco abajo para que el subtítulo siempre se lea. */}
      <AbsoluteFill style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0) 22%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.35) 100%)' }} />

      <Sequence durationInFrames={f(finCortes)}>
        <Subtitulos captions={captions} />
      </Sequence>

      {(e.enfasis ?? []).map((x, i) => (
        <Sequence key={i} from={f(x.t)} durationInFrames={f(x.dur ?? 1.6)}>
          <Enfasis texto={x.texto} kicker={x.kicker} />
        </Sequence>
      ))}

      {e.segmentos.map((s, i) =>
        s.bloque && i > 0 ? (
          <Sequence key={`p${i}`} from={f(ini[i] - PERSIANA_S / 2)} durationInFrames={f(PERSIANA_S)}>
            <Persiana />
          </Sequence>
        ) : null,
      )}

      {e.gancho ? (
        <Sequence durationInFrames={f(Math.min(GANCHO_S, finCortes))}>
          <Gancho texto={e.gancho} serie={e.serie} />
        </Sequence>
      ) : null}

      {e.cierre ? (
        <Sequence from={f(finCortes)} durationInFrames={f(CIERRE_S)}>
          <Cierre />
        </Sequence>
      ) : null}

      {e.musica ? <Audio src={staticFile(e.musica)} volume={e.volumenMusica ?? 0.1} /> : null}
      {e.efectos ? <Audio src={staticFile(e.efectos)} volume={0.55} /> : null}
    </AbsoluteFill>
  )
}
