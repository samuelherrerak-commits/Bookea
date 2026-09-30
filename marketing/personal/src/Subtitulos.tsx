import { createTikTokStyleCaptions, type Caption } from '@remotion/captions'
import { useMemo } from 'react'
import { AbsoluteFill, Sequence, useCurrentFrame, useVideoConfig } from 'remotion'
import { LETRA } from './fuentes'
import { MARGEN, tw } from './marca'

// Grupos cortos (2–4 palabras) para que se lean de un vistazo.
const AGRUPAR_MS = 900

type Pagina = ReturnType<typeof createTikTokStyleCaptions>['pages'][number]

/**
 * Subtítulo minimalista de la marca: Barlow Condensed 800 en mayúsculas, blanco, a la
 * izquierda; la palabra que se está diciendo al 100% y el resto atenuado. Sin cajas.
 */
const PaginaSub: React.FC<{ p: Pagina; tamano: number; arriba: number }> = ({ p, tamano, arriba }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const t = frame / fps
  const ahora = p.startMs + t * 1000
  const y = tw(t, 0, 0.35, 60, 0)
  return (
    // Zona segura: arriba de la descripción (último ~20%) y lejos de los botones de la derecha.
    <AbsoluteFill style={{ top: arriba, padding: `0 190px 0 ${MARGEN}px` }}>
      <div style={{ overflow: 'hidden', paddingBottom: '0.06em' }}>
        <div
          style={{
            fontFamily: LETRA,
            fontWeight: 800,
            fontSize: tamano,
            lineHeight: 0.94,
            letterSpacing: '-0.012em',
            textTransform: 'uppercase',
            color: '#fff',
            display: 'flex',
            flexWrap: 'wrap',
            gap: '0 0.22em',
            transform: `translateY(${y}%)`,
            textShadow: '0 2px 24px rgba(0,0,0,0.45), 0 1px 3px rgba(0,0,0,0.35)',
          }}
        >
          {p.tokens.map((tk, i) => {
            const dicha = ahora >= tk.fromMs
            const activa = dicha && ahora < tk.toMs
            return (
              <span key={i} style={{ opacity: activa ? 1 : dicha ? 0.82 : 0.45 }}>
                {tk.text.trim().replace(/[.,;:]+$/, '')}
              </span>
            )
          })}
        </div>
      </div>
    </AbsoluteFill>
  )
}

export const Subtitulos: React.FC<{ captions: Caption[]; tamano?: number; arriba?: number }> = ({ captions, tamano = 88, arriba = 1190 }) => {
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
            <PaginaSub p={p} tamano={tamano} arriba={arriba} />
          </Sequence>
        )
      })}
    </>
  )
}
