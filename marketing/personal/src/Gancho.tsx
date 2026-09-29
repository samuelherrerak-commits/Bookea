import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig, Easing } from 'remotion'
import { LETRA } from './fuentes'

/** Frase gancho arriba, palabra por palabra, como etiquetas blancas (estilo bookeaa). */
export const Gancho: React.FC<{ texto: string }> = ({ texto }) => {
  const frame = useCurrentFrame()
  const { fps, durationInFrames } = useVideoConfig()
  const palabras = texto.split(/\s+/)
  const sale = interpolate(frame, [durationInFrames - 8, durationInFrames], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.in(Easing.cubic),
  })
  return (
    <AbsoluteFill style={{ top: 260, padding: '0 80px', alignItems: 'center', opacity: sale }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '10px 14px', maxWidth: 900 }}>
        {palabras.map((p, i) => {
          const s = spring({ frame: frame - i * 3, fps, config: { damping: 13, stiffness: 200 } })
          return (
            <span
              key={i}
              style={{
                fontFamily: LETRA,
                fontWeight: 800,
                fontSize: 104,
                lineHeight: 1,
                textTransform: 'uppercase',
                background: '#fff',
                color: '#0f0f0e',
                padding: '6px 18px 2px',
                borderRadius: 14,
                boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
                opacity: s,
                transform: `translateY(${(1 - s) * 40}px) scale(${0.85 + s * 0.15}) rotate(${(1 - s) * (i % 2 ? 4 : -4)}deg)`,
              }}
            >
              {p}
            </span>
          )
        })}
      </div>
    </AbsoluteFill>
  )
}
