import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion'
import { LETRA } from './fuentes'
import { COLOR, MARGEN, clamp, ease, p, tw } from './marca'

/**
 * Etiqueta de capítulo arriba a la izquierda: número en círculo + pastilla con borde,
 * como las pastillas de los reels ("SIN BOOKEAA"). Entra deslizando y sale hacia arriba.
 */
export const Capitulo: React.FC<{ numero?: string; texto: string }> = ({ numero, texto }) => {
  const frame = useCurrentFrame()
  const { fps, durationInFrames } = useVideoConfig()
  const t = frame / fps
  const sale = durationInFrames / fps - 0.4
  const k = ease.out(p(t, 0, 0.5)) * (1 - ease.in(p(t, sale, 0.35)))
  const ancho = clamp(tw(t, 0.12, 0.55, 0, 1))
  return (
    <AbsoluteFill style={{ top: 150, left: MARGEN, alignItems: 'flex-start' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, opacity: k, transform: `translateX(${(1 - k) * -60}px)` }}>
        {numero ? (
          <span style={{ display: 'grid', placeItems: 'center', width: 76, height: 76, borderRadius: 99, background: COLOR.papel, color: COLOR.carbon, fontFamily: LETRA, fontWeight: 800, fontSize: 42 }}>{numero}</span>
        ) : null}
        <span
          style={{
            display: 'inline-block',
            overflow: 'hidden',
            clipPath: `inset(0 ${(1 - ancho) * 100}% 0 0 round 999px)`,
            fontFamily: LETRA,
            fontWeight: 800,
            fontSize: 40,
            lineHeight: 1,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: COLOR.papel,
            padding: '14px 26px',
            border: `6px solid ${COLOR.papel}`,
            borderRadius: 999,
            background: 'rgba(15,15,14,0.35)',
            textShadow: '0 2px 12px rgba(0,0,0,0.3)',
          }}
        >
          {texto}
        </span>
      </div>
    </AbsoluteFill>
  )
}
