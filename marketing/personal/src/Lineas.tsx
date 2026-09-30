import type { CSSProperties } from 'react'
import { useCurrentFrame, useVideoConfig } from 'remotion'
import { ease, tw } from './marca'

/**
 * Titular en líneas que suben desde una máscara, una tras otra (igual que lineas() de
 * marketing/video/motor.js). `a` = segundo de entrada; `sale` = segundo en que se van.
 */
export const Lineas: React.FC<{ lineas: string[]; estilo: CSSProperties; a?: number; paso?: number; sale?: number | null }> = ({
  lineas,
  estilo,
  a = 0,
  paso = 0.09,
  sale = null,
}) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const t = frame / fps
  return (
    <div style={estilo}>
      {lineas.map((txt, n) => {
        let y = tw(t, a + n * paso, 0.55, 112, 0)
        if (sale !== null) y += tw(t, sale + n * 0.05, 0.4, 0, -112, ease.in)
        return (
          <span key={n} style={{ display: 'block', overflow: 'hidden', paddingBottom: '0.04em' }}>
            <span style={{ display: 'block', transform: `translateY(${y}%)` }}>{txt}</span>
          </span>
        )
      })}
    </div>
  )
}
