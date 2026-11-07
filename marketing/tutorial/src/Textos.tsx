import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion'
import { linea, PASOS } from './guion'
import { clamp, tema } from './tema'

const { color } = tema

/** "**así** no" → partes con negrita. */
function partes(texto: string) {
  return texto.split('**').map((t, i) => ({ t, negrita: i % 2 === 1 }))
}

/** Palabras que entran una tras otra (subir + aparecer), y salen más rápido. */
const Palabras: React.FC<{ texto: string; desde: number; hasta: number; cada: number; estilo: React.CSSProperties; negrita?: React.CSSProperties; sinSalida?: boolean }> = ({
  texto,
  desde,
  hasta,
  cada,
  estilo,
  negrita,
  sinSalida,
}) => {
  const f = useCurrentFrame()
  const { fps } = useVideoConfig()
  const salida = sinSalida ? 0 : interpolate(f, [hasta - 9, hasta - 1], [0, 1], { ...clamp, easing: tema.ease.in })
  let n = 0
  return (
    <div style={{ ...estilo, opacity: 1 - salida, transform: `translateY(${-24 * salida}px)` }}>
      {partes(texto).map((p, j) =>
        p.t.split(/(\s+)/).map((w, k) => {
          if (!w.trim()) return <span key={`${j}-${k}`}>{w}</span>
          const pw = spring({ frame: f - desde - n++ * cada, fps, config: tema.resorte.agil })
          return (
            <span
              key={`${j}-${k}`}
              style={{ display: 'inline-block', opacity: pw, transform: `translateY(${interpolate(pw, [0, 1], [26, 0])}px)`, ...(p.negrita ? negrita : null) }}
            >
              {w}
            </span>
          )
        }),
      )}
    </div>
  )
}

/** Barra de los 9 pasos: los hechos en carbón, el actual se llena. */
const Progreso: React.FC<{ paso: number; desde: number }> = ({ paso, desde }) => {
  const f = useCurrentFrame()
  const lleno = interpolate(f, [desde + 4, desde + 22], [0, 1], { ...clamp, easing: tema.ease.out })
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      {Array.from({ length: PASOS }, (_, i) => (
        <div key={i} style={{ width: 32, height: 8, borderRadius: 99, background: color.raya, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${(i + 1 < paso ? 1 : i + 1 === paso ? lleno : 0) * 100}%`, background: color.carbon }} />
        </div>
      ))}
    </div>
  )
}

/** Esquinas "⌐ ¬" de bookeaa.com alrededor del título. */
const Esquinas: React.FC<{ p: number }> = ({ p }) => (
  <>
    <span style={{ position: 'absolute', top: -16, right: -26, width: 30, height: 30, borderTop: `4px solid ${color.carbon}`, borderRight: `4px solid ${color.carbon}`, opacity: p, transform: `translate(${(1 - p) * -14}px, ${(1 - p) * 14}px)` }} />
    <span style={{ position: 'absolute', bottom: -6, left: -22, width: 30, height: 30, borderBottom: `4px solid ${color.carbon}`, borderLeft: `4px solid ${color.carbon}`, opacity: p, transform: `translate(${(1 - p) * 14}px, ${(1 - p) * -14}px)` }} />
  </>
)

/** Arriba del teléfono: paso, título de la escena y lo que hay que hacer en este momento. */
export const Textos: React.FC = () => {
  const f = useCurrentFrame()
  const { fps } = useVideoConfig()
  const { escenas, total } = linea(fps)
  const e = escenas.find((x) => f >= x.inicio && f < x.fin) ?? escenas[escenas.length - 1]
  const m = e.momentos.find((x) => f >= x.inicio && f < x.fin) ?? e.momentos[e.momentos.length - 1]
  const grande = e.tipo === 'intro' || e.tipo === 'cierre'
  const ultima = e.fin >= total
  const pk = spring({ frame: f - e.inicio, fps, config: tema.resorte.suave })
  const pe = spring({ frame: f - e.inicio - 12, fps, config: tema.resorte.suave })
  const salidaKicker = ultima ? 0 : interpolate(f, [e.fin - 9, e.fin - 1], [0, 1], { ...clamp, easing: tema.ease.in })
  // Si la escena siguiente sigue en el mismo paso, el kicker y la barra se quedan quietos.
  const siguiente = escenas[escenas.indexOf(e) + 1]
  const mismoKicker = siguiente && siguiente.paso === e.paso && siguiente.kicker === e.kicker
  const anterior = escenas[escenas.indexOf(e) - 1]
  const veniaIgual = anterior && anterior.paso === e.paso && anterior.kicker === e.kicker
  const kickerVisible = veniaIgual ? 1 : pk
  const kickerSale = mismoKicker ? 0 : salidaKicker

  return (
    <div style={{ position: 'absolute', left: tema.margen, right: tema.margen, top: grande ? 150 : 104 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', opacity: kickerVisible * (1 - kickerSale), transform: `translateY(${(1 - kickerVisible) * 20 - kickerSale * 16}px)` }}>
        <span style={{ fontFamily: tema.letra.titulo, fontWeight: 700, fontSize: 32, letterSpacing: '0.14em', textTransform: 'uppercase', color: color.grafito }}>
          {e.paso ? `Paso ${e.paso} de ${PASOS} · ${e.kicker}` : e.kicker}
        </span>
        {e.paso ? <Progreso paso={e.paso} desde={veniaIgual ? -999 : e.inicio} /> : null}
      </div>
      <div style={{ position: 'relative', display: 'inline-block', marginTop: 22 }}>
        <Palabras
          texto={e.titulo}
          desde={e.inicio + 3}
          hasta={e.fin}
          cada={3}
          sinSalida={ultima}
          estilo={{
            fontFamily: tema.letra.titulo,
            fontWeight: 800,
            fontSize: grande ? 150 : 100,
            lineHeight: 0.88,
            letterSpacing: '-0.012em',
            textTransform: 'uppercase',
            color: color.carbon,
            maxWidth: grande ? 900 : 940,
          }}
        />
        {grande && <Esquinas p={pe} />}
      </div>
      <Palabras
        key={`${m.inicio}`}
        texto={m.texto}
        desde={m.inicio + (m.inicio === e.inicio ? 10 : 2)}
        hasta={m.fin}
        cada={2}
        sinSalida={m.fin >= total}
        estilo={{ marginTop: 30, fontFamily: tema.letra.texto, fontWeight: 500, fontSize: 48, lineHeight: 1.22, color: color.grafito, maxWidth: 940 }}
        negrita={{ color: color.carbon, fontWeight: 700 }}
      />
    </div>
  )
}
