// Audio de los videos: música original y efectos, sintetizados aquí mismo.
//
// Nada sale de una librería de sonidos: la música (un groove house suave en La
// menor, 116 bpm) y cada efecto (teclas, whoosh, pop, ding, golpe) se generan
// muestra a muestra. Por eso no hay derechos de autor de terceros de por medio.
// Todo es determinista: el mismo video da siempre el mismo audio.
//
//   import { generarAudio } from './audio.mjs'
//   await generarAudio({ duracion: 35, cues: [{ t: 1.2, tipo: 'whoosh' }], destino: 'x.wav' })

import { writeFile } from 'node:fs/promises'

const SR = 44100
const BPM = 116
const BEAT = 60 / BPM

// ---------- Utilidades ----------

/** PRNG determinista (mulberry32). */
function azar(semilla) {
  let a = semilla >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const hz = (midi) => 440 * Math.pow(2, (midi - 69) / 12)
const TAU = Math.PI * 2

/** Suma una fuente mono a un bus estéreo con paneo (-1 izquierda … 1 derecha). */
function mezclar(bus, inicio, muestras, ganancia = 1, pan = 0) {
  const i0 = Math.round(inicio * SR)
  const gl = ganancia * Math.cos(((pan + 1) * Math.PI) / 4)
  const gr = ganancia * Math.sin(((pan + 1) * Math.PI) / 4)
  for (let i = 0; i < muestras.length; i++) {
    const j = i0 + i
    if (j < 0 || j >= bus.L.length) continue
    bus.L[j] += muestras[i] * gl
    bus.R[j] += muestras[i] * gr
  }
}

/** Filtro de un polo (pasa bajos) in place; `corte` puede ser función del índice. */
function pasaBajos(x, corte) {
  let y = 0
  for (let i = 0; i < x.length; i++) {
    const fc = typeof corte === 'function' ? corte(i) : corte
    const a = 1 - Math.exp((-TAU * fc) / SR)
    y += a * (x[i] - y)
    x[i] = y
  }
  return x
}

function pasaAltos(x, corte) {
  const lp = pasaBajos(Float32Array.from(x), corte)
  for (let i = 0; i < x.length; i++) x[i] -= lp[i]
  return x
}

// ---------- Instrumentos de la música ----------

function bombo(r) {
  const n = Math.round(0.32 * SR)
  const x = new Float32Array(n)
  let fase = 0
  for (let i = 0; i < n; i++) {
    const t = i / SR
    const f = 48 + 110 * Math.exp(-t * 28)
    fase += (TAU * f) / SR
    x[i] = Math.sin(fase) * Math.exp(-t * 9) + (i < 90 ? (r() * 2 - 1) * 0.25 * (1 - i / 90) : 0)
  }
  return x
}

function palmas(r) {
  const n = Math.round(0.22 * SR)
  const x = new Float32Array(n)
  for (let i = 0; i < n; i++) {
    const t = i / SR
    // Tres golpecitos muy juntos y una cola: suena a palmas más que a un solo ruido.
    const env = [0, 0.011, 0.022].reduce((s, d) => s + (t >= d ? Math.exp(-(t - d) * 90) : 0), 0) * 0.5 + Math.exp(-t * 18) * 0.5
    x[i] = (r() * 2 - 1) * env
  }
  pasaAltos(x, 900)
  return pasaBajos(x, 6000)
}

function hat(r, abierto = false) {
  const n = Math.round((abierto ? 0.18 : 0.05) * SR)
  const x = new Float32Array(n)
  for (let i = 0; i < n; i++) x[i] = (r() * 2 - 1) * Math.exp((-i / SR) * (abierto ? 22 : 70))
  return pasaAltos(x, 7000)
}

/** Nota de bajo: dos osciladores cuadrados suaves y un filtro que se cierra. */
function bajo(midi, dur) {
  const n = Math.round(dur * SR)
  const x = new Float32Array(n)
  const f = hz(midi)
  for (let i = 0; i < n; i++) {
    const t = i / SR
    const s = Math.sin(TAU * f * t) + 0.35 * Math.sign(Math.sin(TAU * f * t))
    x[i] = s * Math.min(1, t * 200) * Math.exp(-t * 3.2) * Math.min(1, (dur - t) * 60)
  }
  return pasaBajos(x, (i) => 280 + 900 * Math.exp((-i / SR) * 14))
}

/** Acorde de pad: tres sierras desafinadas por nota, ataque suave. */
function pad(notas, dur, r) {
  const n = Math.round(dur * SR)
  const x = new Float32Array(n)
  for (const m of notas) {
    for (const det of [-0.08, 0, 0.07]) {
      const f = hz(m + det)
      let fase = r()
      for (let i = 0; i < n; i++) {
        fase += f / SR
        x[i] += ((fase % 1) * 2 - 1) * 0.12
      }
    }
  }
  for (let i = 0; i < n; i++) {
    const t = i / SR
    x[i] *= Math.min(1, t / 0.35) * Math.min(1, (dur - t) / 0.25)
  }
  return pasaBajos(pasaBajos(x, 1500), 2400)
}

/** Pluck corto para el arpegio (triángulo que decae rápido). */
function pluck(midi) {
  const n = Math.round(0.28 * SR)
  const x = new Float32Array(n)
  const f = hz(midi)
  for (let i = 0; i < n; i++) {
    const t = i / SR
    const ph = (f * t) % 1
    x[i] = (4 * Math.abs(ph - 0.5) - 1) * Math.exp(-t * 16)
  }
  return pasaBajos(x, 3500)
}

// La menor: Am – F – C – G (i–VI–III–VII), un acorde por compás.
const ACORDES = [
  { raiz: 45, notas: [57, 60, 64] },
  { raiz: 41, notas: [57, 60, 65] },
  { raiz: 48, notas: [55, 60, 64] },
  { raiz: 43, notas: [55, 59, 62] },
]
const ARPEGIO = [0, 1, 2, 1, 2, 1, 0, 2]

function musica(duracion, bus, semilla = 7) {
  const r = azar(semilla)
  const compas = BEAT * 4
  const kick = bombo(r)
  const clap = palmas(r)
  const hh = hat(r)
  const oh = hat(r, true)
  const total = Math.ceil(duracion / compas) + 1
  // Bus propio para aplicar el "pumping" (el pad baja cuando entra el bombo).
  const pads = { L: new Float32Array(bus.L.length), R: new Float32Array(bus.R.length) }

  for (let c = 0; c < total; c++) {
    const t0 = c * compas
    const ac = ACORDES[c % ACORDES.length]
    const intro = c === 0 // el primer compás sin bombo: entra "respirando"
    mezclar(pads, t0, pad(ac.notas, compas + 0.1, r), 0.55, 0)
    for (let b = 0; b < 4; b++) {
      const tb = t0 + b * BEAT
      if (!intro) mezclar(bus, tb, kick, 0.9)
      if (!intro && (b === 1 || b === 3)) mezclar(bus, tb, clap, 0.32, 0.1)
      mezclar(bus, tb + BEAT / 2, b === 3 ? oh : hh, 0.16, 0.35)
      if (!intro) mezclar(bus, tb + BEAT / 2, bajo(ac.raiz - 12 + 12, BEAT / 2 - 0.02), 0.42, 0)
    }
    if (c >= 2) {
      for (let k = 0; k < 8; k++) {
        const nota = ac.notas[ARPEGIO[k]] + 12
        mezclar(bus, t0 + k * (BEAT / 2), pluck(nota), 0.07, k % 2 ? 0.45 : -0.45)
      }
    }
  }

  // Pumping: el pad se agacha un poco en cada tiempo.
  for (let i = 0; i < pads.L.length; i++) {
    const t = i / SR
    const enBeat = (t % BEAT) / BEAT
    const g = t < compas ? 1 : 0.55 + 0.45 * Math.min(1, enBeat * 3)
    bus.L[i] += pads.L[i] * g
    bus.R[i] += pads.R[i] * g
  }
}

// ---------- Efectos ----------

const EFECTOS = {
  /** Una tecla: click brillante con un poco de cuerpo. */
  tecla(r) {
    const n = Math.round(0.045 * SR)
    const x = new Float32Array(n)
    const f = 1700 + r() * 900
    for (let i = 0; i < n; i++) {
      const t = i / SR
      x[i] = ((r() * 2 - 1) * 0.6 + Math.sin(TAU * f * t) * 0.4) * Math.exp(-t * 140)
    }
    return { x: pasaAltos(x, 1200), g: 0.5, pan: (r() - 0.5) * 0.4 }
  },
  /** Whoosh: ruido cuyo filtro abre y cierra, cruzando de un lado al otro. */
  whoosh(r) {
    const dur = 0.62
    const n = Math.round(dur * SR)
    const x = new Float32Array(n)
    for (let i = 0; i < n; i++) {
      const k = i / n
      x[i] = (r() * 2 - 1) * Math.sin(Math.PI * Math.pow(k, 0.8)) ** 2
    }
    pasaBajos(x, (i) => 300 + 5200 * Math.sin(Math.PI * (i / n)) ** 3)
    return { x, g: 0.75, pan: 0, barrido: true }
  },
  /** Barrido corto (teléfonos que entran). */
  desliza(r) {
    const n = Math.round(0.34 * SR)
    const x = new Float32Array(n)
    for (let i = 0; i < n; i++) {
      const k = i / n
      x[i] = (r() * 2 - 1) * Math.sin(Math.PI * k) ** 2
    }
    pasaAltos(pasaBajos(x, (i) => 900 + 6000 * (i / n)), 500)
    return { x, g: 0.4, pan: 0.2 }
  },
  /** Golpe seco de la persiana. */
  golpe(r) {
    const n = Math.round(0.4 * SR)
    const x = new Float32Array(n)
    let fase = 0
    for (let i = 0; i < n; i++) {
      const t = i / SR
      fase += (TAU * (40 + 70 * Math.exp(-t * 30))) / SR
      x[i] = Math.sin(fase) * Math.exp(-t * 8) + (r() * 2 - 1) * Math.exp(-t * 60) * 0.5
    }
    return { x: pasaBajos(x, 4000), g: 0.8, pan: 0 }
  },
  /** Pop de burbuja de chat. */
  pop() {
    const n = Math.round(0.09 * SR)
    const x = new Float32Array(n)
    let fase = 0
    for (let i = 0; i < n; i++) {
      const t = i / SR
      fase += (TAU * (1100 - 5000 * t)) / SR
      x[i] = Math.sin(fase) * Math.exp(-t * 45)
    }
    return { x, g: 0.42, pan: 0 }
  },
  /** Golpecito grave cuando sube un título. */
  texto(r) {
    const n = Math.round(0.16 * SR)
    const x = new Float32Array(n)
    for (let i = 0; i < n; i++) {
      const t = i / SR
      x[i] = Math.sin(TAU * (160 - 200 * t) * t) * Math.exp(-t * 26) + (r() * 2 - 1) * Math.exp(-t * 200) * 0.3
    }
    return { x, g: 0.55, pan: 0 }
  },
  /** Notificación: dos parciales brillantes que se apagan. */
  ding() {
    const n = Math.round(1.1 * SR)
    const x = new Float32Array(n)
    for (let i = 0; i < n; i++) {
      const t = i / SR
      const b = t >= 0.09 ? t - 0.09 : -1
      x[i] =
        (Math.sin(TAU * 1318.5 * t) * 0.6 + Math.sin(TAU * 2637 * t) * 0.15) * Math.exp(-t * 7) +
        (b >= 0 ? (Math.sin(TAU * 1975.5 * b) * 0.6 + Math.sin(TAU * 3951 * b) * 0.12) * Math.exp(-b * 5) : 0)
    }
    return { x, g: 0.28, pan: 0 }
  },
  /** Confirmación: dos notas ascendentes cortas. */
  check() {
    const n = Math.round(0.3 * SR)
    const x = new Float32Array(n)
    for (let i = 0; i < n; i++) {
      const t = i / SR
      const f = t < 0.08 ? 880 : 1318.5
      const tt = t < 0.08 ? t : t - 0.08
      x[i] = Math.sin(TAU * f * t) * Math.exp(-tt * 18) * 0.8
    }
    return { x, g: 0.3, pan: 0 }
  },
  /** Cierre: impacto con cola. */
  final(r) {
    const n = Math.round(1.4 * SR)
    const x = new Float32Array(n)
    let fase = 0
    for (let i = 0; i < n; i++) {
      const t = i / SR
      fase += (TAU * (38 + 60 * Math.exp(-t * 18))) / SR
      x[i] = Math.sin(fase) * Math.exp(-t * 3.5) + (r() * 2 - 1) * Math.exp(-t * 6) * 0.35
    }
    return { x: pasaBajos(x, (i) => 6000 * Math.exp((-i / SR) * 3) + 200), g: 0.7, pan: 0 }
  },
}

export const TIPOS_SONIDO = Object.keys(EFECTOS)

/**
 * Genera el WAV (44,1 kHz, estéreo, 16 bits): música + efectos en los tiempos `cues`.
 * cue = { t: segundos, tipo: 'whoosh' | 'tecla' | … }.
 */
export async function generarAudio({ duracion, cues = [], destino, semilla = 7, volumenMusica = 0.34 }) {
  const n = Math.ceil(duracion * SR)
  const musicaBus = { L: new Float32Array(n), R: new Float32Array(n) }
  const fx = { L: new Float32Array(n), R: new Float32Array(n) }
  musica(duracion, musicaBus, semilla)

  const r = azar(semilla * 31 + 5)
  for (const cue of cues) {
    const hacer = EFECTOS[cue.tipo]
    if (!hacer) continue
    const s = hacer(r)
    if (s.barrido) {
      // El whoosh cruza de izquierda a derecha.
      const i0 = Math.round(cue.t * SR)
      for (let i = 0; i < s.x.length; i++) {
        const j = i0 + i
        if (j < 0 || j >= n) continue
        const pan = -0.7 + 1.4 * (i / s.x.length)
        fx.L[j] += s.x[i] * s.g * Math.cos(((pan + 1) * Math.PI) / 4)
        fx.R[j] += s.x[i] * s.g * Math.sin(((pan + 1) * Math.PI) / 4)
      }
    } else {
      mezclar(fx, cue.t, s.x, s.g * (cue.g ?? 1), s.pan)
    }
  }

  // Mezcla: la música baja un poco mientras suena un efecto (ducking suave),
  // entra con fundido y sale con fundido en el último segundo y medio.
  const salida = new Int16Array(n * 2)
  let env = 0
  let pico = 0
  const L = new Float32Array(n)
  const R = new Float32Array(n)
  for (let i = 0; i < n; i++) {
    const t = i / SR
    const nivelFx = Math.abs(fx.L[i]) + Math.abs(fx.R[i])
    env = Math.max(nivelFx, env * 0.9995)
    const duck = 1 - Math.min(0.45, env * 0.6)
    const fade = Math.min(1, t / 0.6) * Math.min(1, (duracion - t) / 1.5)
    L[i] = musicaBus.L[i] * volumenMusica * duck * fade + fx.L[i]
    R[i] = musicaBus.R[i] * volumenMusica * duck * fade + fx.R[i]
    pico = Math.max(pico, Math.abs(L[i]), Math.abs(R[i]))
  }
  const norm = pico > 0 ? 0.89 / pico : 1
  for (let i = 0; i < n; i++) {
    // Saturación suave para que los golpes no recorten feo.
    salida[i * 2] = Math.round(Math.tanh(L[i] * norm * 1.1) * 32767)
    salida[i * 2 + 1] = Math.round(Math.tanh(R[i] * norm * 1.1) * 32767)
  }

  const datos = Buffer.from(salida.buffer)
  const cab = Buffer.alloc(44)
  cab.write('RIFF', 0)
  cab.writeUInt32LE(36 + datos.length, 4)
  cab.write('WAVE', 8)
  cab.write('fmt ', 12)
  cab.writeUInt32LE(16, 16)
  cab.writeUInt16LE(1, 20)
  cab.writeUInt16LE(2, 22)
  cab.writeUInt32LE(SR, 24)
  cab.writeUInt32LE(SR * 4, 28)
  cab.writeUInt16LE(4, 32)
  cab.writeUInt16LE(16, 34)
  cab.write('data', 36)
  cab.writeUInt32LE(datos.length, 40)
  await writeFile(destino, Buffer.concat([cab, datos]))
}
