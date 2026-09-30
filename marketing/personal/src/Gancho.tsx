import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion'
import { Cruces, Esquinas } from './Adornos'
import { Lineas } from './Lineas'
import { COLOR, MARGEN, OLA, TIPO, clamp, ease, enLineas, p, tw } from './marca'

export const GANCHO_S = 1.6
const SALE = 1.2

/**
 * Tarjeta negra del gancho: kicker + titular enorme a la izquierda con esquinas, como la
 * primera escena de los reels de la marca. Se va hacia arriba con borde de ola y descubre
 * la cámara; la voz sigue sonando debajo, así no hay tiempo muerto.
 */
export const Gancho: React.FC<{ texto: string; serie?: string }> = ({ texto, serie }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const t = frame / fps
  const largo = texto.length
  const [estilo, ancho] = largo <= 22 ? [TIPO.mega, 9] : largo <= 40 ? [TIPO.grande, 13] : [TIPO.medio, 19]
  const sube = ease.inOut(p(t, SALE, GANCHO_S - SALE))
  const kicker = clamp(tw(t, 0.05, 0.4, 0, 1))
  return (
    <AbsoluteFill style={{ transform: `translateY(${-sube * 118}%)` }}>
      <AbsoluteFill style={{ background: COLOR.carbon, color: COLOR.papel, padding: `0 ${MARGEN}px`, justifyContent: 'center' }}>
        <Cruces opacidad={kicker} />
        <div style={{ marginTop: -120 }}>
          {serie ? (
            <div style={{ ...TIPO.kicker, opacity: 0.6 * kicker, transform: `translateY(${(1 - kicker) * 20}px)`, marginBottom: 34 }}>{serie}</div>
          ) : null}
          <Esquinas opacidad={clamp(tw(t, 0.35, 0.4, 0, 1))}>
            <Lineas lineas={enLineas(texto, ancho)} estilo={estilo} a={0.08} />
          </Esquinas>
        </div>
      </AbsoluteFill>
      {/* Borde de ola que arrastra la tarjeta al salir. */}
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: -159, height: 160, background: COLOR.carbon, WebkitMask: `${OLA} bottom/100% 100% no-repeat`, mask: `${OLA} bottom/100% 100% no-repeat`, transform: 'scaleY(-1)' }} />
    </AbsoluteFill>
  )
}
