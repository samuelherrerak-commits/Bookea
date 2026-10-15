import { COLOR } from './marca'
import { LETRA } from './fuentes'

/** Esquinas ⌐ ¬ de la marca alrededor de un bloque (como .esquinas en estilos.css). */
export const Esquinas: React.FC<{ color?: string; opacidad?: number; children: React.ReactNode }> = ({ color = COLOR.papel, opacidad = 1, children }) => {
  const base: React.CSSProperties = { position: 'absolute', width: 56, height: 56, borderStyle: 'solid', borderColor: color, borderWidth: 0, opacity: opacidad }
  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      {children}
      <i style={{ ...base, top: -34, right: -60, borderTopWidth: 9, borderRightWidth: 9 }} />
      <i style={{ ...base, bottom: -18, left: -42, borderBottomWidth: 9, borderLeftWidth: 9 }} />
    </div>
  )
}

/** Dos × arriba a la derecha. */
export const Cruces: React.FC<{ color?: string; opacidad?: number }> = ({ color = COLOR.papel, opacidad = 1 }) => (
  <div style={{ position: 'absolute', right: 70, top: 190, display: 'flex', flexDirection: 'column', gap: 30, fontFamily: LETRA, fontWeight: 800, fontSize: 52, lineHeight: 1, color, opacity: opacidad }}>
    <span>×</span>
    <span>×</span>
  </div>
)
