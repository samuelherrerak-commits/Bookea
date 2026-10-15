// Dibujo de la agenda malvada (SVG). Lo usan agenda.html y bookee-nuevo.html.
export const C = '#0f0f0e', P = '#ffffff', N = '#f4f4f2', G = '#5b5b57', R = '#e3261c', RO = '#5c0b07'

// De frente, origen en el suelo al centro, y hacia abajo. Cuerpo de x -22..22, y -64..-12.
export function villana({ brazos = 'amenaza', piernas = 'pie', boca = 'grande', ojos = 'malo', inclina = 0 } = {}) {
  let s = ''
  // ── piernas y botas ──
  const P2 = { pie: [[-11, 0], [11, 0]], corre: [[-19, -4], [15, 0]], vencida: [[-4, 0], [5, 0]] }[piernas]
  for (const [i, [px, py]] of P2.entries()) {
    const x0 = i ? 9 : -9
    s += `<path d="M${x0} -13 Q${(x0 + px) / 2 + (i ? 4 : -4)} ${(py - 13) / 2} ${px} ${py - 3}" fill="none" stroke="${C}" stroke-width="4.4" stroke-linecap="round"/>
      <path d="M${px - 7 + (i ? 2 : -2)} ${py} q0 -6 7 -6 q8 0 8 6 Z" fill="${C}"/><rect x="${px - 8 + (i ? 2 : -2)}" y="${py - 1.4}" width="17" height="1.6" rx=".8" fill="${G}"/>`
  }
  // ── cuerpo ──
  let cuerpo = ''
  // bloque de hojas que asoma por la derecha y abajo
  cuerpo += `<rect x="-20" y="-61" width="45" height="51" rx="6" fill="${P}" stroke="${C}" stroke-width="1.6"/>`
  for (let k = 1; k <= 4; k++) cuerpo += `<path d="M${22 + k * 0.6 - 3} -58 L${22 + k * 0.6 - 3} -15" stroke="${G}" stroke-width=".5"/><path d="M-16 ${-13.6 + k * 0.6} L20 ${-13.6 + k * 0.6}" stroke="${G}" stroke-width=".5"/>`
  // tapa
  cuerpo += `<rect x="-22" y="-64" width="44" height="52" rx="8" fill="${C}"/>`
  // brillo del canto
  cuerpo += `<path d="M-18 -60 Q-19 -40 -18 -20" fill="none" stroke="${G}" stroke-width="1.2" stroke-linecap="round" opacity=".8"/>`
  // elástico
  cuerpo += `<rect x="14" y="-64" width="3.6" height="52" fill="${G}"/><rect x="14" y="-64" width="3.6" height="52" fill="none" stroke="${C}" stroke-width=".6"/>`
  // pestaña
  cuerpo += `<path d="M22 -50 h4.5 a1.5 1.5 0 0 1 1.5 1.5 v5 a1.5 1.5 0 0 1 -1.5 1.5 h-4.5 Z" fill="${N}" stroke="${C}" stroke-width="1"/>`
  // ── ojos ──
  const ojo = (lado) => {
    // triángulo con el borde de arriba bajando hacia el centro
    const pts = lado < 0 ? [[-17.5, -52], [-3.5, -46.5], [-14, -41]] : [[17.5, -52], [3.5, -46.5], [14, -41]]
    if (ojos === 'x') {
      const cx = lado * 10, cy = -46.5
      return `<path d="M${cx - 4} ${cy - 4} l8 8 M${cx + 4} ${cy - 4} l-8 8" stroke="${R}" stroke-width="2.4" stroke-linecap="round"/>`
    }
    const d = `M${pts.map((p) => p.join(' ')).join(' L')} Z`
    const [gx, gy] = [(pts[0][0] + pts[1][0] + pts[2][0]) / 3 + lado * 1.5, (pts[0][1] + pts[1][1] + pts[2][1]) / 3]
    return `<path d="${d}" fill="${R}" stroke="${P}" stroke-width="1.1" stroke-linejoin="round"/>
      <path d="${d}" fill="none" stroke="${R}" stroke-width="4" stroke-linejoin="round" opacity=".25"/>
      <ellipse cx="${gx}" cy="${gy}" rx=".9" ry="2.2" fill="${RO}"/><circle cx="${gx - lado * 2.2}" cy="${gy - 1.6}" r=".8" fill="${P}"/>`
  }
  cuerpo += ojo(-1) + ojo(1)
  // cejas
  if (ojos === 'malo') cuerpo += `<path d="M-19 -56.5 L-3 -49.5" stroke="${G}" stroke-width="3" stroke-linecap="round"/><path d="M19 -56.5 L3 -49.5" stroke="${G}" stroke-width="3" stroke-linecap="round"/>`
  // ── boca ──
  const dientes = (x0, x1, y, dir, n) => { let d = ''; const w = (x1 - x0) / n; for (let k = 0; k < n; k++) d += `<path d="M${x0 + k * w} ${y} L${x0 + k * w + w / 2} ${y + dir * 2.6} L${x0 + (k + 1) * w} ${y} Z" fill="${P}" stroke="${C}" stroke-width=".5"/>`; return d }
  const colmillo = (x, y, dir, largo) => `<path d="M${x - 2.6} ${y} Q${x - 1.4} ${y + dir * largo * 0.6} ${x + 0.3} ${y + dir * largo} Q${x + 1.4} ${y + dir * largo * 0.5} ${x + 2.6} ${y} Z" fill="${P}" stroke="${C}" stroke-width=".7" stroke-linejoin="round"/>`
  if (boca === 'vencida') {
    cuerpo += `<path d="M-14 -27 q3.5 -3 7 0 t7 0 t7 0 t7 0" fill="none" stroke="${P}" stroke-width="1.8" stroke-linecap="round"/>
      <path d="M5 -26.5 q0 6 3 6.5 q3 .3 3 -6" fill="${R}" stroke="${C}" stroke-width=".7"/>`
  } else {
    const [arr, aba] = boca === 'rugido' ? [-39, -16] : [-36, -21]
    const forma = `M-19 ${arr + 1} Q0 ${arr - 3} 19 ${arr + 1} Q17 ${aba + 2} 0 ${aba} Q-17 ${aba + 2} -19 ${arr + 1} Z`
    cuerpo += `<clipPath id="b${boca}"><path d="${forma}"/></clipPath>
      <path d="${forma}" fill="${RO}"/>
      <g clip-path="url(#b${boca})">
        <ellipse cx="2" cy="${aba + 1}" rx="10" ry="${boca === 'rugido' ? 7 : 5}" fill="${R}"/>
        <path d="M2 ${aba - 4} v4" stroke="${RO}" stroke-width=".8"/>
        ${dientes(-18, 18, arr - 1.6, 1, 12)}${dientes(-15, 15, aba + 1.2, -1, 10)}
      </g>
      ${colmillo(-10, arr - 1, 1, boca === 'rugido' ? 10 : 8)}${colmillo(10, arr - 1, 1, boca === 'rugido' ? 10 : 8)}
      ${colmillo(-14, aba + 0.5, -1, 5.5)}${colmillo(14, aba + 0.5, -1, 5.5)}
      <path d="${forma}" fill="none" stroke="${P}" stroke-width="1.3" stroke-linejoin="round"/>`
  }
  // ── argollas de espiral (encima de la tapa) ──
  for (let k = 0; k < 7; k++) {
    const x = -16.5 + k * 5.5
    cuerpo += `<path d="M${x} -59 V-67 a2.2 2.2 0 0 1 4.4 0 V-62" fill="none" stroke="${C}" stroke-width="2.8" stroke-linecap="round"/>
      <path d="M${x} -60 V-67 a2.2 2.2 0 0 1 4.4 0 V-62" fill="none" stroke="${G}" stroke-width="1.1" stroke-linecap="round"/>`
  }
  s += `<g transform="rotate(${inclina} 0 -12)">${cuerpo}</g>`
  // ── brazos con guantes negros y garras ──
  const brazo = (lado, mano, garra) => {
    const x0 = lado * 21.5, y0 = -36, [x2, y2] = mano
    const mx = (x0 + x2) / 2 + lado * 6, my = (y0 + y2) / 2 - 4
    let g = `<path d="M${x0} ${y0} Q${mx} ${my} ${x2} ${y2}" fill="none" stroke="${C}" stroke-width="4.2" stroke-linecap="round"/>
      <circle cx="${x2}" cy="${y2}" r="5.2" fill="${C}"/><path d="M${x2 - lado * 3} ${y2 + 3.4} q${lado * 3} 2 ${lado * 6} 0" fill="none" stroke="${G}" stroke-width="1.1" stroke-linecap="round"/>`
    if (garra) for (const a of [-40, 0, 40]) {
      const ang = ((garra + a) * Math.PI) / 180, bx = x2 + Math.cos(ang) * 4.6, by = y2 + Math.sin(ang) * 4.6
      g += `<path d="M${bx - Math.sin(ang) * 1.2} ${by + Math.cos(ang) * 1.2} L${bx + Math.cos(ang) * 4} ${by + Math.sin(ang) * 4} L${bx + Math.sin(ang) * 1.2} ${by - Math.cos(ang) * 1.2} Z" fill="${P}" stroke="${C}" stroke-width=".6" stroke-linejoin="round"/>`
    }
    return g
  }
  const B = {
    amenaza: [[[-34, -50], -110], [[34, -50], -70]],
    rugido: [[[-38, -62], -120], [[38, -62], -60]],
    corre: [[[-34, -24], 160], [[33, -52], -40]],
    vencida: [[[-27, -16], 0], [[27, -16], 0]],
  }[brazos]
  s = brazo(-1, ...B[0]) + brazo(1, ...B[1]) + s
  return s
}
