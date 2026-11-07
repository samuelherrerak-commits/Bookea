import { AbsoluteFill, Audio, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion'
import { Fondo, Grado, Grano, Vineta } from './capas'
import { linea } from './guion'
import { Telefono } from './Telefono'
import { Textos } from './Textos'
import { clamp, tema } from './tema'

const { color } = tema

/** Cierre: logo, el link de cada negocio y a dónde escribirnos. */
const Cierre: React.FC<{ desde: number }> = ({ desde }) => {
  const f = useCurrentFrame()
  const { fps } = useVideoConfig()
  const p = (d: number, r: { damping: number; stiffness: number; mass: number } = tema.resorte.suave) => spring({ frame: f - desde - d, fps, config: r })
  const entra = (q: number) => ({ opacity: q, transform: `translateY(${interpolate(q, [0, 1], [40, 0])}px) scale(${interpolate(q, [0, 1], [0.94, 1])})` })
  const respira = 1 + Math.sin(f / 22) * 0.012
  return (
    <div style={{ position: 'absolute', left: 0, right: 0, top: 860, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 46 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 26, ...entra(p(0, tema.resorte.rebote)) }}>
        <svg viewBox="0 0 32 32" width={150} height={150} aria-hidden style={{ transform: `scale(${respira})` }}>
          <rect x="2" y="4" width="28" height="26" rx="7" fill={color.carbon} />
          <path d="M10 2.5v5M22 2.5v5" stroke={color.carbon} strokeWidth="2.6" strokeLinecap="round" />
          <path d="M12 11v12M12 17.5a4 4 0 1 1 0 .01" stroke={color.papel} strokeWidth="2.6" strokeLinecap="round" fill="none" />
        </svg>
        <span style={{ fontFamily: tema.letra.titulo, fontWeight: 800, fontSize: 150, letterSpacing: '-0.01em', color: color.carbon }}>bookeaa</span>
      </div>
      <div
        style={{
          ...entra(p(10)),
          padding: '26px 46px',
          borderRadius: 99,
          background: color.carbon,
          color: color.papel,
          fontFamily: tema.letra.titulo,
          fontWeight: 700,
          fontSize: 58,
          letterSpacing: '0.02em',
          boxShadow: `0 0 0 6px ${color.papel}, 0 0 0 9px ${color.senal}`,
        }}
      >
        bookeaa.com/u/<span style={{ color: color.senal }}>tu-negocio</span>
      </div>
      <div style={{ ...entra(p(20)), textAlign: 'center', fontFamily: tema.letra.texto, fontSize: 44, lineHeight: 1.3, color: color.grafito }}>
        ¿Dudas? Escríbenos por WhatsApp
        <div style={{ fontFamily: tema.letra.titulo, fontWeight: 800, fontSize: 76, color: color.carbon, letterSpacing: '0.01em' }}>+58 422 029 8203</div>
      </div>
    </div>
  )
}

export const Tutorial: React.FC = () => {
  const f = useCurrentFrame()
  const { fps } = useVideoConfig()
  const { escenas } = linea(fps)
  const intro = escenas[0]
  const cierre = escenas[escenas.length - 1]

  // El teléfono sube en la intro (más abajo, para dejar el título grande), se acomoda al
  // empezar el paso 1 y se va hacia abajo en el cierre.
  const sube = spring({ frame: f - 4, fps, config: tema.resorte.suave })
  const acomoda = interpolate(f, [intro.fin - 6, intro.fin + 14], [0, 1], { ...clamp, easing: tema.ease.inOut })
  const baja = interpolate(f, [cierre.inicio + 36, cierre.inicio + 50], [0, 1], { ...clamp, easing: tema.ease.in })
  const y = interpolate(sube, [0, 1], [1300, 330]) * (1 - acomoda) + baja * 1350
  const flota = Math.sin(f / 30) * 4
  const escala = interpolate(sube, [0, 1], [0.9, 1]) * (1 - acomoda * 0) * interpolate(baja, [0, 1], [1, 0.92])

  return (
    <AbsoluteFill style={{ background: color.papel }}>
      <Fondo />
      {baja < 1 && <Telefono estilo={{ transform: `translateY(${y + flota}px) scale(${escala})`, transformOrigin: '50% 0' }} />}
      <Textos />
      {f >= cierre.inicio + 40 && <Cierre desde={cierre.inicio + 44} />}
      <Grado />
      <Grano />
      <Vineta />
      <Audio src={staticFile('audio.wav')} />
    </AbsoluteFill>
  )
}
