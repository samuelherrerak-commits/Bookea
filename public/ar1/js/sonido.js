// Efectos de sonido sintetizados con Web Audio: sin archivos, 0 KB extra.
// El audio se activa en el toque del botón (iPhone no deja sonar nada antes).

let ctx = null
let maestro = null
let ruido = null
let silencio = false
const VOLUMEN = 0.5

try {
  silencio = localStorage.getItem('bookeaa-ar-silencio') === '1'
} catch {
  /* sin almacenamiento: queda con sonido */
}

export function activarAudio() {
  const AC = window.AudioContext || window.webkitAudioContext
  if (!AC) return
  if (!ctx) {
    ctx = new AC()
    maestro = ctx.createGain()
    maestro.gain.value = silencio ? 0 : VOLUMEN
    maestro.connect(ctx.destination)
    ruido = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate)
    const datos = ruido.getChannelData(0)
    for (let i = 0; i < datos.length; i++) datos[i] = Math.random() * 2 - 1
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {})
}

export const silenciado = () => silencio

export function silenciar(valor) {
  silencio = valor
  if (maestro) maestro.gain.setTargetAtTime(valor ? 0 : VOLUMEN, ctx.currentTime, 0.02)
  try {
    localStorage.setItem('bookeaa-ar-silencio', valor ? '1' : '0')
  } catch {
    /* sin almacenamiento */
  }
}

export function sonar(id) {
  if (!ctx || silencio || ctx.state !== 'running') return
  const efecto = EFECTOS[id]
  if (efecto) efecto(ctx.currentTime)
  if (id === 'timbre') navigator.vibrate?.([160, 70, 160])
}

// ── piezas ──
function envolvente(g, t, ataque, duracion, pico) {
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(pico, t + ataque)
  g.gain.exponentialRampToValueAtTime(0.0001, t + duracion)
}

function tono(t, { de, a, dur, tipo = 'sine', vol = 0.3, ataque = 0.005 }) {
  const o = ctx.createOscillator()
  const g = ctx.createGain()
  o.type = tipo
  o.frequency.setValueAtTime(de, t)
  o.frequency.exponentialRampToValueAtTime(a, t + dur)
  envolvente(g, t, ataque, dur, vol)
  o.connect(g).connect(maestro)
  o.start(t)
  o.stop(t + dur + 0.05)
  return o
}

function soplo(t, { dur, filtro = 'bandpass', de = 1000, a = de, q = 1, vol = 0.3, ataque = 0.005 }) {
  const s = ctx.createBufferSource()
  s.buffer = ruido
  const f = ctx.createBiquadFilter()
  f.type = filtro
  f.Q.value = q
  f.frequency.setValueAtTime(de, t)
  f.frequency.exponentialRampToValueAtTime(a, t + dur)
  const g = ctx.createGain()
  envolvente(g, t, ataque, dur, vol)
  s.connect(f).connect(g).connect(maestro)
  s.start(t, Math.random() * 0.5)
  s.stop(t + dur + 0.05)
  return g
}

const EFECTOS = {
  despegue: (t) => tono(t, { de: 480, a: 900, dur: 0.14, vol: 0.22 }),
  boing: (t) => {
    const o = tono(t, { de: 260, a: 620, dur: 0.38, tipo: 'triangle', vol: 0.22 })
    const lfo = ctx.createOscillator()
    const prof = ctx.createGain()
    lfo.frequency.value = 17
    prof.gain.value = 45
    lfo.connect(prof).connect(o.frequency)
    lfo.start(t)
    lfo.stop(t + 0.42)
  },
  salto: (t) => tono(t, { de: 300, a: 760, dur: 0.2, tipo: 'triangle', vol: 0.2 }),
  aterriza: (t) => {
    tono(t, { de: 170, a: 55, dur: 0.16, vol: 0.45 })
    soplo(t, { dur: 0.06, filtro: 'lowpass', de: 900, vol: 0.2 })
  },
  cae: (t) => {
    tono(t, { de: 230, a: 90, dur: 0.1, vol: 0.28 })
    soplo(t, { dur: 0.07, filtro: 'lowpass', de: 1400, vol: 0.12 })
  },
  patada: (t) => {
    tono(t, { de: 150, a: 45, dur: 0.18, vol: 0.6 })
    soplo(t, { dur: 0.05, filtro: 'highpass', de: 2200, vol: 0.25 })
  },
  pisoton: (t) => {
    tono(t, { de: 120, a: 34, dur: 0.28, vol: 0.7 })
    soplo(t, { dur: 0.12, filtro: 'lowpass', de: 700, vol: 0.35 })
  },
  papel: (t) => {
    // papel que se rasga: ruido que salta de volumen a tirones
    const g = soplo(t, { dur: 0.34, filtro: 'bandpass', de: 3200, a: 1400, q: 0.8, vol: 0.32 })
    for (let k = 0; k < 9; k++) g.gain.setValueAtTime(0.06 + Math.random() * 0.3, t + 0.012 + k * 0.034)
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.36)
  },
  timbre: (t) => {
    // campanilla de teléfono antiguo: dos tonos golpeados ~22 veces por segundo
    const g = ctx.createGain()
    g.gain.value = 0.12 // el LFO la mueve entre 0 y 0,24: suena a golpes
    const lfo = ctx.createOscillator()
    lfo.type = 'square'
    lfo.frequency.value = 22
    const prof = ctx.createGain()
    prof.gain.value = 0.12
    lfo.connect(prof).connect(g.gain)
    const salida = ctx.createGain()
    envolvente(salida, t, 0.01, 0.42, 1)
    for (const f of [1180, 1410]) {
      const o = ctx.createOscillator()
      o.type = 'triangle'
      o.frequency.value = f
      o.connect(g)
      o.start(t)
      o.stop(t + 0.45)
    }
    g.connect(salida).connect(maestro)
    lfo.start(t)
    lfo.stop(t + 0.45)
  },
  escribir: (t) => {
    const g = soplo(t, { dur: 0.75, filtro: 'bandpass', de: 4200, a: 3600, q: 2, vol: 0.06, ataque: 0.05 })
    for (let k = 0; k < 14; k++) g.gain.setValueAtTime(k % 2 ? 0.015 : 0.07, t + 0.05 + k * 0.05)
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.78)
  },
  ding: (t) => {
    tono(t, { de: 1318.5, a: 1318.5, dur: 1.1, vol: 0.28 })
    tono(t, { de: 2637, a: 2637, dur: 0.7, vol: 0.09 })
  },
  whoosh: (t) => soplo(t, { dur: 0.34, filtro: 'bandpass', de: 450, a: 2600, q: 1.4, vol: 0.28, ataque: 0.12 }),
  brillo: (t) => [1046.5, 1318.5, 1568].forEach((f, i) => tono(t + i * 0.07, { de: f, a: f, dur: 0.3, vol: 0.16 })),
  pop: (t) => tono(t, { de: 900, a: 1500, dur: 0.07, vol: 0.22 }),
}
