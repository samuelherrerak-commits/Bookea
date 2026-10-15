import { AbsoluteFill, Img, staticFile } from 'remotion'
import { Esquinas } from './Adornos'
import { LETRA } from './fuentes'
import { COLOR, TIPO } from './marca'

/** Foto de perfil (1080×1080): el logo de bookeaa en blanco sobre carbón. Facebook la recorta en círculo. */
export const Perfil: React.FC = () => (
  <AbsoluteFill style={{ background: COLOR.carbon, justifyContent: 'center', alignItems: 'center' }}>
    <div style={{ width: 600, height: 600, filter: 'invert(1)' }}>
      <Img src={staticFile('bookeaa.svg')} style={{ width: '100%', height: '100%' }} />
    </div>
  </AbsoluteFill>
)

/**
 * Portada de Facebook (1640×624, el doble de 820×312). En el teléfono se recorta a 16:9, así que
 * todo lo importante queda en la franja central (x entre 265 y 1375).
 */
export const Portada: React.FC = () => (
  <AbsoluteFill style={{ background: COLOR.carbon, color: COLOR.papel, padding: '0 330px', justifyContent: 'center' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 22, marginBottom: 46 }}>
      <div style={{ width: 80, height: 80, filter: 'invert(1)' }}>
        <Img src={staticFile('bookeaa.svg')} style={{ width: '100%', height: '100%' }} />
      </div>
      <span style={{ fontFamily: LETRA, fontWeight: 800, fontSize: 88, lineHeight: 1, letterSpacing: '-0.02em' }}>bookeaa</span>
      <span style={{ ...(TIPO.kicker as React.CSSProperties), fontSize: 30, marginLeft: 18 }}>Tu agenda online</span>
    </div>
    <Esquinas>
      <div style={{ ...(TIPO.grande as React.CSSProperties), fontSize: 124 }}>
        Tus clientes
        <br />
        reservan solos.
      </div>
    </Esquinas>
    <div
      style={{
        alignSelf: 'flex-start',
        marginTop: 54,
        borderRadius: 999,
        padding: '18px 34px',
        background: COLOR.papel,
        color: COLOR.carbon,
        fontFamily: LETRA,
        fontWeight: 700,
        fontSize: 36,
        lineHeight: 1,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
      }}
    >
      Primer mes gratis
    </div>
  </AbsoluteFill>
)
