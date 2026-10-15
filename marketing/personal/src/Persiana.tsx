import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion'
import { COLOR, ease } from './marca'

export const PERSIANA_S = 0.5

/**
 * Transición persiana de la marca: dos barras negras cierran y abren. Se centra en el
 * corte (empieza PERSIANA_S/2 antes) y tapa el salto de imagen.
 */
export const Persiana: React.FC = () => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const k = Math.min(1, frame / fps / PERSIANA_S)
  const c = k < 0.5 ? ease.inOut(k * 2) : 1 - ease.inOut((k - 0.5) * 2)
  const barra: React.CSSProperties = { position: 'absolute', left: 0, right: 0, height: '50.2%', background: COLOR.carbon }
  return (
    <AbsoluteFill>
      <div style={{ ...barra, top: 0, transform: `translateY(${-100 + c * 100}%)` }} />
      <div style={{ ...barra, bottom: 0, transform: `translateY(${100 - c * 100}%)` }} />
    </AbsoluteFill>
  )
}
