import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion'
import { Lineas } from './Lineas'
import { MARGEN, TIPO, clamp, enLineas, tw } from './marca'

/**
 * Titular de énfasis arriba, sobre un degradado oscuro, a la izquierda (sin cajas).
 * Si es un número corto ("12", "7:00") usa el tamaño reloj de la marca.
 */
export const Enfasis: React.FC<{ texto: string; kicker?: string }> = ({ texto, kicker }) => {
  const frame = useCurrentFrame()
  const { fps, durationInFrames } = useVideoConfig()
  const t = frame / fps
  const dur = durationInFrames / fps
  const sale = dur - 0.45
  const esNumero = /^[\d:.,%$+]{1,5}$/.test(texto.trim())
  const [estilo, ancho] = esNumero ? [TIPO.reloj, 5] : texto.length <= 10 ? [TIPO.mega, 9] : texto.length <= 26 ? [TIPO.grande, 12] : [TIPO.medio, 17]
  const velo = clamp(tw(t, 0, 0.3, 0, 1)) * clamp(tw(t, sale + 0.1, 0.35, 1, 0))
  const k = clamp(tw(t, 0.02, 0.35, 0, 1)) * clamp(tw(t, sale, 0.3, 1, 0))
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ background: 'linear-gradient(to bottom, rgba(15,15,14,0.82) 0%, rgba(15,15,14,0.55) 34%, rgba(15,15,14,0) 52%)', opacity: velo }} />
      <AbsoluteFill style={{ top: 170, padding: `0 ${MARGEN}px`, color: '#fff' }}>
        {kicker ? <div style={{ ...TIPO.kicker, opacity: 0.6 * k, marginBottom: 26 }}>{kicker}</div> : null}
        <Lineas lineas={enLineas(texto, ancho)} estilo={estilo} a={0.04} sale={sale} />
      </AbsoluteFill>
    </AbsoluteFill>
  )
}
