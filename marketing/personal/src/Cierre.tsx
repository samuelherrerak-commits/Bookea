import { AbsoluteFill, Img, staticFile, useCurrentFrame, useVideoConfig } from 'remotion'
import { TEXTO } from './fuentes'
import { Lineas } from './Lineas'
import { COLOR, MARGEN, TIPO, clamp, tw } from './marca'

/** Cierre como el de los reels de la marca: logo + "bookeaa" gigante, kicker, regla y @. */
export const Cierre: React.FC<{ usuario?: string }> = ({ usuario = '@bookeaa.app' }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const t = frame / fps
  const fondo = clamp(tw(t, 0, 0.25, 0, 1))
  const logo = clamp(tw(t, 0.12, 0.5, 0, 1))
  const regla = clamp(tw(t, 0.55, 0.45, 0, 1))
  const texto = clamp(tw(t, 0.7, 0.45, 0, 1))
  return (
    <AbsoluteFill style={{ background: COLOR.carbon, opacity: fondo, color: COLOR.papel, padding: `0 ${MARGEN}px`, justifyContent: 'center' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 26, marginTop: -80 }}>
        <div style={{ width: 150, height: 150, opacity: logo, transform: `scale(${0.7 + logo * 0.3})`, filter: 'invert(1)' }}>
          <Img src={staticFile('bookeaa.svg')} style={{ width: '100%', height: '100%' }} />
        </div>
        <Lineas lineas={['bookeaa']} estilo={{ ...TIPO.mega, fontSize: 210, lineHeight: 0.8, textTransform: 'none', letterSpacing: '-0.02em' }} a={0.15} />
      </div>
      <div style={{ ...TIPO.kicker, marginTop: 70, opacity: 0.6 * texto }}>Tu agenda online</div>
      <i style={{ display: 'block', width: 90, height: 8, background: COLOR.papel, marginTop: 30, transform: `scaleX(${regla})`, transformOrigin: 'left' }} />
      <div style={{ fontFamily: TEXTO, fontSize: 44, lineHeight: 1.35, marginTop: 40, opacity: texto, transform: `translateY(${(1 - texto) * 30}px)` }}>
        Tus clientes reservan solos.
        <br />
        <b style={{ fontWeight: 600 }}>{usuario}</b>
      </div>
    </AbsoluteFill>
  )
}
