import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion'
import { LETRA, TEXTO } from './fuentes'
import { COLOR, MARGEN, clamp, ease, p, tw } from './marca'

/**
 * Tarjeta carbón con la lista del día (como la tarjeta de evento de los reels): cada ítem
 * entra y se marca con ✓ cuando se nombra. `en` = segundos desde que aparece la tarjeta.
 */
export const Checklist: React.FC<{ titulo: string; items: { texto: string; en: number }[] }> = ({ titulo, items }) => {
  const frame = useCurrentFrame()
  const { fps, durationInFrames } = useVideoConfig()
  const t = frame / fps
  const sale = durationInFrames / fps - 0.45
  const k = ease.out(p(t, 0, 0.55)) * (1 - ease.in(p(t, sale, 0.4)))
  return (
    <AbsoluteFill style={{ top: 150, padding: `0 ${MARGEN}px` }}>
      <div
        style={{
          background: COLOR.carbon,
          color: COLOR.papel,
          borderRadius: 48,
          padding: '44px 50px 34px',
          width: 760,
          boxShadow: '0 60px 120px -40px rgb(0 0 0 / 0.7)',
          opacity: k,
          transform: `translateY(${(1 - k) * -80}px)`,
        }}
      >
        <p style={{ fontFamily: LETRA, fontWeight: 600, fontSize: 32, letterSpacing: '0.16em', textTransform: 'uppercase', opacity: 0.6, margin: 0 }}>{titulo}</p>
        {items.map((it, i) => {
          const a = clamp(tw(t, it.en, 0.45, 0, 1))
          const marca = ease.out(p(t, it.en + 0.15, 0.35))
          return (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 26,
                marginTop: 26,
                paddingTop: i ? 24 : 4,
                borderTop: i ? '2px solid rgb(127 127 127 / 0.3)' : 'none',
                opacity: 0.35 + 0.65 * a,
              }}
            >
              <span
                style={{
                  flex: 'none',
                  display: 'grid',
                  placeItems: 'center',
                  width: 58,
                  height: 58,
                  borderRadius: 16,
                  border: `5px solid ${COLOR.papel}`,
                  background: marca > 0.5 ? COLOR.papel : 'transparent',
                  color: COLOR.carbon,
                  fontFamily: TEXTO,
                  fontWeight: 600,
                  fontSize: 38,
                  transform: `scale(${1 + Math.sin(marca * Math.PI) * 0.18})`,
                }}
              >
                <span style={{ opacity: marca, transform: `scale(${marca})` }}>✓</span>
              </span>
              <span
                style={{
                  fontFamily: LETRA,
                  fontWeight: 800,
                  fontSize: 58,
                  lineHeight: 1,
                  textTransform: 'uppercase',
                  letterSpacing: '-0.01em',
                  textDecoration: 'none',
                }}
              >
                {it.texto}
              </span>
            </div>
          )
        })}
      </div>
    </AbsoluteFill>
  )
}
