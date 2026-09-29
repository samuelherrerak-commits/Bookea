import { createTikTokStyleCaptions, type Caption } from '@remotion/captions'
import { useMemo } from 'react'
import { AbsoluteFill, Sequence, spring, useCurrentFrame, useVideoConfig } from 'remotion'
import { LETRA } from './fuentes'

// Grupos cortos (2–4 palabras) para que se lean de un vistazo.
const AGRUPAR_MS = 900

type Pagina = ReturnType<typeof createTikTokStyleCaptions>['pages'][number]

const PaginaSub: React.FC<{ p: Pagina }> = ({ p }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const ahora = p.startMs + (frame / fps) * 1000
  const entra = spring({ frame, fps, config: { damping: 14, stiffness: 220, mass: 0.6 } })
  return (
    // Zona segura: arriba de la descripción (último ~20%) y lejos de los botones de la derecha.
    <AbsoluteFill style={{ justifyContent: 'flex-start', alignItems: 'center', top: 1180, padding: '0 150px 0 90px' }}>
      <div
        style={{
          fontFamily: LETRA,
          fontWeight: 800,
          fontSize: 92,
          lineHeight: 1.02,
          textTransform: 'uppercase',
          textAlign: 'center',
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'center',
          gap: '4px 10px',
          color: '#fff',
          transform: `translateY(${(1 - entra) * 24}px) scale(${0.9 + entra * 0.1})`,
          opacity: entra,
          textShadow: '0 4px 18px rgba(0,0,0,0.55)',
          WebkitTextStroke: '3px #0f0f0e',
          paintOrder: 'stroke fill',
        }}
      >
        {p.tokens.map((t, i) => {
          const activa = ahora >= t.fromMs && ahora < t.toMs
          return (
            <span
              key={i}
              style={{
                display: 'inline-block',
                padding: '0 6px',
                borderRadius: 10,
                background: activa ? '#fff' : 'transparent',
                color: activa ? '#0f0f0e' : '#fff',
                WebkitTextStroke: activa ? '0px' : '3px #0f0f0e',
                transform: activa ? 'scale(1.08) rotate(-1.5deg)' : 'none',
              }}
            >
              {t.text.trim()}
            </span>
          )
        })}
      </div>
    </AbsoluteFill>
  )
}

export const Subtitulos: React.FC<{ captions: Caption[] }> = ({ captions }) => {
  const { fps } = useVideoConfig()
  const { pages } = useMemo(() => createTikTokStyleCaptions({ captions, combineTokensWithinMilliseconds: AGRUPAR_MS }), [captions])
  return (
    <>
      {pages.map((p, i) => {
        const siguiente = pages[i + 1]
        const finMs = Math.min(siguiente ? siguiente.startMs : Infinity, p.startMs + p.durationMs)
        const desde = Math.round((p.startMs / 1000) * fps)
        const dur = Math.max(1, Math.round((finMs / 1000) * fps) - desde)
        return (
          <Sequence key={i} from={desde} durationInFrames={dur} layout="none">
            <PaginaSub p={p} />
          </Sequence>
        )
      })}
    </>
  )
}
