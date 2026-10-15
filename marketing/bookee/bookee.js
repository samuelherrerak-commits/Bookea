// Dibujo del nuevo bookee (SVG). Lo usan bookee-nuevo.html y el guion de ar2.
const C = '#0f0f0e', P = '#ffffff', N = '#f4f4f2', G = '#5b5b57'

// Bookee nuevo, de frente. Origen en el suelo al centro, y hacia abajo. Cuerpo x -15..15, y -36..-9.
export function bookee({ ojos = 'normal', mira = [0, 0], cejas = 0, boca = 'sonrisa', brazos = 'abajo', piernas = 'pie', pecho = 1, inclina = 0 } = {}) {
  let s = ''
  // piernas cortas y zapatos
  const pies = { pie: [[-6.5, 0], [6.5, 0]], tiembla: [[-4, 0], [4, 0]], salto: [[-7, -4], [7, -4]] }[piernas]
  for (const [i, [px, py]] of pies.entries()) {
    const x0 = i ? 5.5 : -5.5
    const ondas = piernas === 'tiembla' ? ` Q${x0 + (i ? -3 : 3)} -6 ${(x0 + px) / 2} -5 Q${px + (i ? 3 : -3)} -4` : ` Q${(x0 + px) / 2 + (i ? 1.5 : -1.5)} -6`
    s += `<path d="M${x0} -9${ondas} ${px} ${py - 2.6}" fill="none" stroke="${C}" stroke-width="2.6" stroke-linecap="round"/>
      <ellipse cx="${px + (i ? 1.2 : -1.2)}" cy="${py - 2.2}" rx="5" ry="2.6" fill="${C}"/><ellipse cx="${px + (i ? 2.4 : -2.4)}" cy="${py - 3.2}" rx="1.4" ry=".7" fill="${P}" opacity=".85"/>`
  }
  let c = ''
  // argollas (como el logo)
  for (const x of [-7, 7]) c += `<path d="M${x} -33 V-38" stroke="${C}" stroke-width="3.4" stroke-linecap="round"/>`
  // cuerpo
  c += `<rect x="${-15 * pecho}" y="-36" width="${30 * pecho}" height="27" rx="9" fill="${C}"/>`
  // mejillas
  c += `<ellipse cx="-10.5" cy="-23.2" rx="2.6" ry="1.5" fill="${G}"/><ellipse cx="10.5" cy="-23.2" rx="2.6" ry="1.5" fill="${G}"/>`
  // ojos
  const [mx, my] = mira
  const ojo = (lado) => {
    const cx = lado * 5.6, cy = -27.3
    const tipo = ojos === 'guiño' && lado > 0 ? 'feliz' : ojos === 'guiño' ? 'normal' : ojos
    if (tipo === 'feliz') return `<path d="M${cx - 3.6} ${cy + 1} Q${cx} ${cy - 4.2} ${cx + 3.6} ${cy + 1}" fill="none" stroke="${P}" stroke-width="1.8" stroke-linecap="round"/>`
    const rx = tipo === 'susto' ? 4.6 : 4.2, ry = tipo === 'susto' ? 5.6 : 5
    const pr = tipo === 'susto' ? 1.5 : 2.9
    const px = cx + mx * 1.4, py = cy + my * 1.6 + (tipo === 'decidido' ? 1 : 0)
    let o = `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${P}"/>
      <circle cx="${px}" cy="${py}" r="${pr}" fill="${C}"/>
      <circle cx="${px - pr * 0.4}" cy="${py - pr * 0.45}" r="${pr * 0.38}" fill="${P}"/><circle cx="${px + pr * 0.4}" cy="${py + pr * 0.35}" r="${pr * 0.18}" fill="${P}"/>`
    if (tipo === 'decidido') o += `<path d="M${cx - rx - .5} ${cy - ry + 1.4} L${cx + rx + .5} ${cy - ry + 1.4} L${cx + rx + .5} ${cy - ry - 1} L${cx - rx - .5} ${cy - ry - 1} Z" fill="${C}"/>`
    return o
  }
  c += ojo(-1) + ojo(1)
  // cejas: 0 neutras, >0 alegres/orgullosas (arriba), <0 preocupado, 'decidido' bajan al centro
  const ceja = (lado) => {
    const cx = lado * 5.6, y = -34
    if (ojos === 'decidido') return `<path d="M${cx - lado * 3.4} ${y - 0.4} L${cx + lado * 2.6} ${y + 1.6}" stroke="${P}" stroke-width="1.5" stroke-linecap="round"/>`
    if (cejas < 0) return `<path d="M${cx - lado * 2.8} ${y + 1.2} Q${cx} ${y - 1.4} ${cx + lado * 2.8} ${y - 1.2}" fill="none" stroke="${P}" stroke-width="1.4" stroke-linecap="round"/>`
    return `<path d="M${cx - 2.8} ${y - cejas * 0.6} Q${cx} ${y - 1.6 - cejas} ${cx + 2.8} ${y - cejas * 0.6}" fill="none" stroke="${P}" stroke-width="1.4" stroke-linecap="round"/>`
  }
  c += ceja(-1) + ceja(1)
  // boca
  const by = -21.2
  c += {
    sonrisa: `<path d="M-3 ${by} Q0 ${by + 2.8} 3 ${by}" fill="none" stroke="${P}" stroke-width="1.4" stroke-linecap="round"/>`,
    grande: `<path d="M-4 ${by - .6} Q0 ${by - 1} 4 ${by - .6} Q3.4 ${by + 3.7} 0 ${by + 3.7} Q-3.4 ${by + 3.7} -4 ${by - .6} Z" fill="${P}"/><path d="M-2.2 ${by + 3} Q0 ${by + 1.4} 2.2 ${by + 3} Q0 ${by + 3.8} -2.2 ${by + 3} Z" fill="${G}"/>`,
    o: `<ellipse cx="0" cy="${by + 1}" rx="1.5" ry="2" fill="${P}"/>`,
    nervioso: `<path d="M-3.6 ${by + 1} q.9 -1 1.8 0 t1.8 0 t1.8 0 t1.8 0" fill="none" stroke="${P}" stroke-width="1.2" stroke-linecap="round"/>`,
    decidida: `<path d="M-3 ${by + .6} Q.5 ${by + 2} 3.4 ${by - .4}" fill="none" stroke="${P}" stroke-width="1.5" stroke-linecap="round"/>`,
    ladeada: `<path d="M-2.6 ${by + .2} Q1 ${by + 3} 3.8 ${by - .8}" fill="none" stroke="${P}" stroke-width="1.5" stroke-linecap="round"/>`,
  }[boca]
  // la «b» calada en la panza
  c += `<path d="M-2.2 -15.4 V-10.9" stroke="${P}" stroke-width="1.4" stroke-linecap="round"/><circle cx=".5" cy="-12.6" r="1.95" fill="none" stroke="${P}" stroke-width="1.4"/>`
  s += `<g transform="rotate(${inclina} 0 -9)">${c}</g>`
  // brazos con guantes blancos
  const guante = (x, y, tipo, lado) => {
    let g = `<circle cx="${x}" cy="${y}" r="3.1" fill="${P}" stroke="${C}" stroke-width="1.2"/>`
    // pulgar arriba: puño ancho con los dedos doblados al frente y el pulgar saliendo del lado de afuera
    if (tipo === 'pulgar') g = `<rect x="${x - 2.4}" y="${y - 7.4}" width="2.5" height="5.6" rx="1.25" fill="${P}" stroke="${C}" stroke-width="1"/>
      <rect x="${x - 3.4}" y="${y - 2.8}" width="7" height="5.6" rx="2.2" fill="${P}" stroke="${C}" stroke-width="1.2"/>
      <path d="M${x - .6} ${y - 1} h3.6 M${x - .6} ${y + .8} h3.6" stroke="${C}" stroke-width=".7" stroke-linecap="round"/>`
    if (tipo === 'abierta') g += `<path d="M${x + lado * 1.6} ${y - 2.6} l${lado * 1.4} -1.6 M${x + lado * 2.8} ${y - .8} l${lado * 1.9} -.4" stroke="${C}" stroke-width=".8" stroke-linecap="round"/>`
    return g
  }
  const B = {
    abajo: [[-19, -12, 'abierta'], [19, -12, 'abierta']],
    arriba: [[-21, -36, 'abierta'], [21, -36, 'abierta']],
    jarras: [[-17.5, -14, 'puño'], [17.5, -14, 'puño']],
    cara: [[-7, -21, 'abierta'], [7, -21, 'abierta']],
    punos: [[-11, -14, 'puño'], [11, -14, 'puño']],
    pulgar: [[-18, -12, 'abierta'], [20, -27, 'pulgar']],
    saluda: [[-19, -12, 'abierta'], [21, -37, 'abierta']],
  }[brazos]
  for (const [i, [x, y, tipo]] of B.entries()) {
    const lado = i ? 1 : -1, x0 = lado * 14.6 * pecho, y0 = -21
    const curva = brazos === 'jarras' ? lado * 7 : brazos === 'cara' || brazos === 'punos' ? lado * 5 : lado * 3
    const q = `Q${(x0 + x) / 2 + curva} ${(y0 + y) / 2 + (brazos === 'cara' ? 5 : -2)}`
    s += `<path d="M${x0} ${y0} ${q} ${x} ${y}" fill="none" stroke="${C}" stroke-width="2.4" stroke-linecap="round"/>` + guante(x, y, tipo, lado)
  }
  return s
}
