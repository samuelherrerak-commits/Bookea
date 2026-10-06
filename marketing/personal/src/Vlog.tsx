import { AbsoluteFill, Audio, OffthreadVideo, Sequence, staticFile, useCurrentFrame, useVideoConfig, interpolate } from 'remotion'
import { Cierre } from './Cierre'
import { Enfasis } from './Enfasis'
import { GANCHO_S, Gancho } from './Gancho'
import { PERSIANA_S, Persiana } from './Persiana'
import { Subtitulos } from './Subtitulos'
import { Capitulo } from './Capitulo'
import { Checklist } from './Checklist'
import { Escena } from './Escena'
import { aSalida, duracionSegmento, inicios, remapearCaptions } from './tiempo'
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
  const escenas = e.escenas ?? []
  // Durante las escenas de marca los titulares reemplazan a los subtítulos.
  const bajoEscena = (ms: number) => escenas.some((x) => ms / 1000 >= x.desde && ms / 1000 < x.hasta)
  const captions = remapearCaptions(e.captions.filter((c) => !bajoEscena((c.startMs + c.endMs) / 2)), e.segmentos)
  const finCortes = e.segmentos.reduce((a, s) => a + duracionSegmento(s), 0)
  const f = (s: number) => Math.round(s * fps)
  const salida = (t: number) => aSalida(t, e.segmentos)
  const sinCamara = e.sinCamaraDesde ?? escenas[0]?.desde

  return (
    <AbsoluteFill style={{ background: '#0f0f0e' }}>
      {e.segmentos.map((s, i) => (
        <Sequence key={i} from={f(ini[i])} durationInFrames={Math.max(1, f(ini[i] + duracionSegmento(s)) - f(ini[i]))}>
          <Tramo video={e.video} s={s} indice={i} />
        </Sequence>
      ))}

      {/* Oscurece un poco abajo para que el subtítulo siempre se lea. */}
      <AbsoluteFill style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0) 22%, rgba(0,0,0,0) 58%, rgba(0,0,0,0.5) 82%, rgba(0,0,0,0.6) 100%)' }} />

      <Sequence durationInFrames={f(finCortes)}>
        <Subtitulos captions={captions} arriba={e.subtitulos?.arriba} tamano={e.subtitulos?.tamano} />
      </Sequence>

      {(e.capitulos ?? []).map((x, i) => (
        <Sequence key={`c${i}`} from={f(salida(x.ts))} durationInFrames={f(x.dur ?? 2.6)}>
          <Capitulo texto={x.texto} numero={x.numero} />
        </Sequence>
      ))}

      {e.checklist
        ? (() => {
            const desde = salida(e.checklist.desde)
            return (
              <Sequence from={f(desde)} durationInFrames={Math.max(1, f(salida(e.checklist.hasta)) - f(desde))}>
                <Checklist titulo={e.checklist.titulo} items={e.checklist.items.map((it) => ({ texto: it.texto, en: salida(Number(it.ts)) - desde }))} />
              </Sequence>
            )
          })()
        : null}

      {(e.enfasis ?? []).map((x, i) => (
        <Sequence key={i} from={f(x.ts != null ? salida(x.ts) : x.t ?? 0)} durationInFrames={f(x.dur ?? 1.6)}>
          <Enfasis texto={x.texto} kicker={x.kicker} />
        </Sequence>
      ))}

      {/* Parte explicando la app: la cámara ya no se ve, fondo negro detrás de las escenas. */}
      {sinCamara != null ? (
        <Sequence from={f(salida(sinCamara))}>
          <AbsoluteFill style={{ background: '#0f0f0e' }} />
        </Sequence>
      ) : null}

      {escenas.map((x, i) => {
        const desde = salida(x.desde)
        // Cada escena sigue visible un poco más, para que la siguiente entre ENCIMA (ola/lado)
        // y no se vea lo de abajo durante la transición.
        const extra = i < escenas.length - 1 ? 0.5 : 0
        return (
          <Sequence key={`e${i}`} from={f(desde)} durationInFrames={Math.max(1, f(Math.min(finCortes, salida(x.hasta) + extra)) - f(desde))}>
            <Escena e={x} rel={(t) => salida(t) - desde} />
          </Sequence>
        )
      })}

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
          <Cierre usuario={e.usuario} />
        </Sequence>
      ) : null}

      {e.musica ? <Audio src={staticFile(e.musica)} volume={e.volumenMusica ?? 0.1} /> : null}
      {e.efectos ? <Audio src={staticFile(e.efectos)} volume={0.55} /> : null}
    </AbsoluteFill>
  )
}
