import { AbsoluteFill, useCurrentFrame } from 'remotion'
import { tema } from './tema'

const { color } = tema

/** Fondo: papel con dos manchas de niebla que se mueven despacio y las cruces de la landing. */
export const Fondo: React.FC = () => {
  const f = useCurrentFrame()
  const a = Math.sin(f / 70) * 60
  const b = Math.cos(f / 90) * 50
  return (
    <AbsoluteFill style={{ background: color.papel }}>
      <div style={{ position: 'absolute', width: 1300, height: 1300, borderRadius: '50%', top: -520, left: -420 + a, filter: 'blur(60px)', background: `radial-gradient(circle, ${color.niebla}, transparent 64%)` }} />
      <div style={{ position: 'absolute', width: 1100, height: 1100, borderRadius: '50%', bottom: -380, right: -380 - b, filter: 'blur(70px)', background: `radial-gradient(circle, ${color.raya}, transparent 66%)` }} />
      {[
        [88, 1180],
        [992, 780],
        [960, 1700],
      ].map(([x, y], i) => (
        <Cruz key={i} x={x} y={y + Math.sin(f / 40 + i) * 6} />
      ))}
    </AbsoluteFill>
  )
}

const Cruz: React.FC<{ x: number; y: number }> = ({ x, y }) => (
  <svg width={28} height={28} viewBox="0 0 28 28" style={{ position: 'absolute', left: x - 14, top: y - 14, opacity: 0.35 }}>
    <path d="M14 2v24M2 14h24" stroke={color.carbon} strokeWidth={2} />
  </svg>
)

/** Grado: une las capturas y los gráficos (tema claro: muy sutil). */
export const Grado: React.FC = () => (
  <AbsoluteFill style={{ pointerEvents: 'none', background: 'linear-gradient(180deg, rgba(15,15,14,0.05), transparent 22%, transparent 78%, rgba(15,15,14,0.08))' }} />
)

/** Grano procedural, sin archivos. */
export const Grano: React.FC = () => {
  const f = useCurrentFrame()
  const ruido =
    "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='220' height='220'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='220' height='220' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E\")"
  return (
    <AbsoluteFill
      style={{
        pointerEvents: 'none',
        backgroundImage: ruido,
        backgroundSize: '220px',
        backgroundPosition: `${(f * 7) % 220}px ${(f * 13) % 220}px`,
        opacity: 0.04,
        mixBlendMode: 'multiply',
      }}
    />
  )
}

/** Viñeta suave (capa de arriba). */
export const Vineta: React.FC = () => (
  <AbsoluteFill style={{ pointerEvents: 'none', background: 'radial-gradient(ellipse at center, transparent 60%, rgba(15,15,14,0.12) 100%)' }} />
)
