import { Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion'
import capturas from '../public/capturas/capturas.json'
import { CAMARA, linea, TRANSICION, tiempos } from './guion'
import { clamp, tema } from './tema'

const { color, telefono: T } = tema
// La pantalla se arma en px de la captura (390×844, como la app) y se escala entera.
const W = capturas.ancho
const H = capturas.alto
const K = (T.ancho - T.borde * 2) / W
export const ALTO_TELEFONO = Math.round((T.barra + H) * K) + T.borde * 2

type Caja = { x: number; y: number; w: number; h: number }
type Momento = ReturnType<typeof linea>['momentos'][number]
const cajas = capturas.pantallas as Record<string, Record<string, Caja | null>>
const cajaDe = (m: Momento): Caja | null => (m.marca ? cajas[m.img]?.[m.marca] ?? null : null)

/** A dónde mira la cámara en un momento: se acerca a lo señalado sin salirse de la pantalla. */
function objetivo(m: Momento) {
  const b = cajaDe(m)
  if (!b) return { s: 1, x: 0, y: 0 }
  const s = Math.min(1.4, Math.max(1, Math.min((W * 0.98) / b.w, (H * 0.45) / b.h)))
  const cx = b.x + b.w / 2
  const cy = b.y + b.h / 2
  const x = Math.min(0, Math.max(W - W * s, W / 2 - cx * s))
  const y = Math.min(0, Math.max(H - H * s, H * 0.5 - cy * s))
  return { s, x, y }
}

const mezcla = (a: number, b: number, t: number) => a + (b - a) * t

/** Una captura con la cámara puesta, su marca y el dedo. */
const Captura: React.FC<{ m: Momento; previo?: Momento; local: number; cam: { s: number; x: number; y: number }; conMarca: boolean }> = ({ m, previo, local, cam, conMarca }) => {
  const { fps } = useVideoConfig()
  const b = cajaDe(m)
  const t = tiempos(m, previo)
  // Si el momento anterior señalaba lo mismo en la misma pantalla, la marca ya está puesta.
  const sigue = previo && !t.cambia && previo.marca === m.marca
  const pm = sigue ? 1 : spring({ frame: local - t.marca, fps, config: tema.resorte.agil })
  const pulso = 0.5 + 0.5 * Math.sin(local / 7)
  const pd = spring({ frame: local - t.dedo, fps, config: tema.resorte.suave })
  const presion = interpolate(local - t.toque, [0, 4, 12], [1, 0.78, 1], { ...clamp, easing: tema.ease.out })
  const onda = interpolate(local - t.toque, [0, 18], [0, 1], { ...clamp, easing: tema.ease.out })
  // El dedo se retira antes del siguiente momento.
  const salida = interpolate(local, [m.fin - m.inicio - 10, m.fin - m.inicio - 2], [1, 0], { ...clamp, easing: tema.ease.in })
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', background: color.papel }}>
      <div style={{ position: 'absolute', width: W, height: H, transformOrigin: '0 0', transform: `translate(${cam.x}px, ${cam.y}px) scale(${cam.s})` }}>
        <Img src={staticFile(`capturas/${m.img}.jpg`)} style={{ width: W, height: H, display: 'block' }} />
        {b && conMarca && (
          <div
            style={{
              position: 'absolute',
              left: b.x - 6,
              top: b.y - 6,
              width: b.w + 12,
              height: b.h + 12,
              borderRadius: 14,
              border: `3px solid ${color.senal}`,
              opacity: pm,
              transform: `scale(${interpolate(pm, [0, 1], [1.12, 1])})`,
              // Foco: todo lo demás se oscurece un poco.
              boxShadow: `0 0 0 2000px rgba(15,15,14,${0.26 * pm}), 0 0 ${18 + pulso * 14}px ${color.senalSuave}`,
            }}
          />
        )}
        {b && conMarca && m.tap && (
          <>
            <div
              style={{
                position: 'absolute',
                left: b.x + b.w / 2 - 34 * onda,
                top: b.y + b.h / 2 - 34 * onda,
                width: 68 * onda,
                height: 68 * onda,
                borderRadius: '50%',
                border: `3px solid ${color.senal}`,
                opacity: (1 - onda) * (local >= t.toque ? 1 : 0),
              }}
            />
            <div
              style={{
                position: 'absolute',
                left: b.x + b.w / 2 - 18 + interpolate(pd, [0, 1], [46, 0]),
                top: b.y + b.h / 2 - 18 + interpolate(pd, [0, 1], [70, 0]),
                width: 36,
                height: 36,
                borderRadius: '50%',
                background: 'rgba(15,15,14,0.42)',
                border: '3px solid rgba(255,255,255,0.95)',
                boxShadow: '0 6px 16px rgba(15,15,14,0.35)',
                opacity: pd * salida,
                transform: `scale(${interpolate(pd, [0, 1], [0.6, 1]) * presion})`,
              }}
            />
          </>
        )}
      </div>
    </div>
  )
}

/** Barra de estado del teléfono (hora, señal, wifi y batería). */
const Barra: React.FC = () => (
  <div style={{ position: 'relative', height: T.barra, background: color.papel, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 26px 0 30px', fontFamily: tema.letra.texto, fontWeight: 600, fontSize: 15, color: color.carbon }}>
    <span>9:41</span>
    <span style={{ position: 'absolute', left: '50%', top: 9, width: 112, height: 28, transform: 'translateX(-50%)', background: color.carbon, borderRadius: 99 }} />
    <svg width={64} height={14} viewBox="0 0 64 14" aria-hidden>
      {[0, 1, 2, 3].map((i) => (
        <rect key={i} x={i * 5} y={10 - i * 3} width={3.4} height={4 + i * 3} rx={1} fill={color.carbon} />
      ))}
      <path d="M27 5.5a9 9 0 0 1 12 0M29.5 8.2a5.4 5.4 0 0 1 7 0M32 11l1 1.2 1-1.2a1.4 1.4 0 0 0-2 0" stroke={color.carbon} strokeWidth={1.6} fill="none" strokeLinecap="round" />
      <rect x={43} y={2} width={18} height={10} rx={3} stroke={color.carbon} strokeWidth={1.3} fill="none" />
      <rect x={45} y={4} width={12} height={6} rx={1.5} fill={color.carbon} />
      <rect x={62} y={5} width={1.6} height={4} rx={0.8} fill={color.carbon} />
    </svg>
  </div>
)

/**
 * El teléfono con la pantalla del momento actual. Al cambiar de pantalla, la nueva entra
 * desde la derecha (navegar) o desde abajo (scroll en la misma sección); después la cámara
 * se acerca a lo señalado.
 */
export const Telefono: React.FC<{ estilo?: React.CSSProperties }> = ({ estilo }) => {
  const f = useCurrentFrame()
  const { fps } = useVideoConfig()
  const { momentos } = linea(fps)
  const i = Math.max(0, momentos.findIndex((m) => f >= m.inicio && f < m.fin))
  const m = momentos[i]
  const previo = i > 0 ? momentos[i - 1] : undefined
  const local = f - m.inicio
  const t = tiempos(m, previo)

  // Cámara: del encuadre anterior (o neutro si la pantalla es nueva) al de este momento.
  const desde = t.cambia ? { s: 1, x: 0, y: 0 } : objetivo(previo!)
  const hacia = objetivo(m)
  const pc = interpolate(local, [t.camara, t.camara + CAMARA], [0, 1], { ...clamp, easing: tema.ease.inOut })
  const cam = { s: mezcla(desde.s, hacia.s, pc), x: mezcla(desde.x, hacia.x, pc), y: mezcla(desde.y, hacia.y, pc) }

  // Transición entre pantallas.
  const pt = t.cambia && previo ? interpolate(local, [0, TRANSICION], [0, 1], { ...clamp, easing: tema.ease.inOut }) : 1
  const scroll = m.mov === 'scroll'
  const desenfoque = Math.sin(pt * Math.PI) * 2.2
  const nueva = scroll ? { x: 0, y: (1 - pt) * H * 0.6 } : { x: (1 - pt) * W, y: 0 }
  const vieja = scroll ? { x: 0, y: -pt * H * 0.6 } : { x: -pt * W * 0.3, y: 0 }

  return (
    <div
      style={{
        position: 'absolute',
        left: (tema.ancho - T.ancho) / 2,
        top: T.arriba,
        width: T.ancho,
        height: ALTO_TELEFONO,
        borderRadius: 74,
        border: `${T.borde}px solid ${color.carbon}`,
        background: color.carbon,
        overflow: 'hidden',
        boxShadow: '0 60px 120px -50px rgba(15,15,14,0.55), 0 0 0 2px rgba(15,15,14,0.08)',
        ...estilo,
      }}
    >
      <div style={{ width: W, height: T.barra + H, transformOrigin: '0 0', transform: `scale(${K})`, borderRadius: 60 / K, overflow: 'hidden', background: color.papel, position: 'relative' }}>
        <Barra />
        <div style={{ position: 'absolute', top: T.barra, left: 0, width: W, height: H, overflow: 'hidden' }}>
          {previo && pt < 1 && (
            <div style={{ position: 'absolute', inset: 0, transform: `translate(${vieja.x}px, ${vieja.y}px)`, filter: `blur(${desenfoque}px) brightness(${1 - pt * 0.15})` }}>
              <Captura m={previo} previo={i > 1 ? momentos[i - 2] : undefined} local={previo.fin - previo.inicio} cam={objetivo(previo)} conMarca={false} />
            </div>
          )}
          <div style={{ position: 'absolute', inset: 0, transform: `translate(${nueva.x}px, ${nueva.y}px)`, filter: desenfoque > 0.05 ? `blur(${desenfoque}px)` : undefined, boxShadow: pt < 1 ? '-20px 0 40px rgba(15,15,14,0.2)' : undefined }}>
            <Captura m={m} previo={previo} local={local} cam={cam} conMarca={pt >= 1} />
          </div>
        </div>
      </div>
    </div>
  )
}
