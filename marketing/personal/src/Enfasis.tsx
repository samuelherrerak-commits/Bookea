import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig, Easing } from 'remotion'
import { LETRA } from './fuentes'

/** Palabra o cifra clave en grande, arriba (sin tapar la cara) (acompaña un "pop"). */
export const Enfasis: React.FC<{ texto: string }> = ({ texto }) => {
  const frame = useCurrentFrame()
  const { fps, durationInFrames } = useVideoConfig()
  const s = spring({ frame, fps, config: { damping: 11, stiffness: 240, mass: 0.7 } })
  const sale = interpolate(frame, [durationInFrames - 7, durationInFrames], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.in(Easing.cubic),
  })
  return (
    <AbsoluteFill style={{ justifyContent: 'flex-start', alignItems: 'center', top: 300 }}>
      <div
        style={{
          fontFamily: LETRA,
          fontWeight: 800,
          fontSize: texto.length > 10 ? 118 : 170,
          lineHeight: 0.9,
          textTransform: 'uppercase',
          textAlign: 'center',
          color: '#0f0f0e',
          background: '#fff',
          padding: '18px 36px 8px',
          borderRadius: 22,
          maxWidth: 940,
          boxShadow: '0 20px 60px rgba(0,0,0,0.35)',
          opacity: s * sale,
          transform: `scale(${0.6 + s * 0.4}) rotate(${(1 - s) * -6}deg)`,
        }}
      >
        {texto}
      </div>
    </AbsoluteFill>
  )
}
