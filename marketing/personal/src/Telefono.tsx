import { Img, staticFile } from 'remotion'
import { COLOR } from './marca'

/** Teléfono con una captura real (390×844), igual que telefono() de marketing/video/motor.js. */
export const Telefono: React.FC<{ img: string; ancho: number; oscuro?: boolean; style?: React.CSSProperties }> = ({ img, ancho, oscuro, style }) => {
  const alto = Math.round((ancho - 28) * (844 / 390)) + 28
  return (
    <div
      style={{
        position: 'absolute',
        width: ancho,
        height: alto,
        borderRadius: 76,
        border: `14px solid ${oscuro ? '#2b2b29' : COLOR.carbon}`,
        background: COLOR.carbon,
        overflow: 'hidden',
        boxShadow: oscuro ? '0 60px 120px -40px rgb(0 0 0 / 0.8)' : '0 60px 120px -50px rgb(15 15 14 / 0.55)',
        ...style,
      }}
    >
      <Img src={staticFile(img)} style={{ display: 'block', width: '100%', height: '100%', objectFit: 'cover', borderRadius: 62 }} />
      <span style={{ position: 'absolute', top: 16, left: '50%', width: '30%', height: 38, transform: 'translateX(-50%)', background: COLOR.carbon, borderRadius: 99 }} />
    </div>
  )
}
