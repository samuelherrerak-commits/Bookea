import { AbsoluteFill, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig, Easing } from 'remotion'
import { LETRA } from './fuentes'

/** Tarjeta final: logo + @bookeaa sobre negro. */
export const Cierre: React.FC = () => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const fondo = interpolate(frame, [0, 6], [0, 1], { extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) })
  const logo = spring({ frame: frame - 3, fps, config: { damping: 12, stiffness: 180 } })
  const texto = spring({ frame: frame - 9, fps, config: { damping: 14, stiffness: 180 } })
  return (
    <AbsoluteFill style={{ background: `rgba(15,15,14,${fondo})`, justifyContent: 'center', alignItems: 'center', gap: 36 }}>
      <div
        style={{
          width: 260,
          height: 260,
          borderRadius: 60,
          background: '#fff',
          display: 'grid',
          placeItems: 'center',
          opacity: logo,
          transform: `scale(${0.6 + logo * 0.4}) rotate(${(1 - logo) * -12}deg)`,
        }}
      >
        <Img src={staticFile('bookeaa.svg')} style={{ width: 190, height: 190 }} />
      </div>
      <div
        style={{
          fontFamily: LETRA,
          fontWeight: 800,
          fontSize: 96,
          color: '#fff',
          letterSpacing: '-0.01em',
          opacity: texto,
          transform: `translateY(${(1 - texto) * 30}px)`,
        }}
      >
        @bookeaa
      </div>
    </AbsoluteFill>
  )
}
