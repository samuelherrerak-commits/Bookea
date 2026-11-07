// Música y efectos del tutorial, sincronizados con la línea de tiempo del guion.
// Usa el sintetizador de la campaña (marketing/scripts/audio.mjs): sin samples ni derechos.
//   node scripts/audio.mjs   →  public/audio.wav
import { generarAudio } from '../../scripts/audio.mjs'
import { FPS, linea, tiempos } from '../src/guion.js'

const { escenas, momentos, total } = linea(FPS)
const s = (cuadros) => cuadros / FPS
const cues = []

// Golpe del título al empezar y cierre con impacto.
cues.push({ t: s(4), tipo: 'golpe' })
for (const e of escenas.slice(1)) cues.push({ t: s(e.inicio) - 0.08, tipo: e.tipo === 'cierre' ? 'whoosh' : 'whoosh', g: 0.8 })
const cierre = escenas[escenas.length - 1]
cues.push({ t: s(cierre.inicio + 42), tipo: 'final' })

momentos.forEach((m, i) => {
  const previo = momentos[i - 1]
  const t = tiempos(m, previo)
  const inicioEscena = escenas.some((e) => e.inicio === m.inicio)
  // Cambio de pantalla dentro de la escena: se desliza.
  if (t.cambia && previo && !inicioEscena) cues.push({ t: s(m.inicio) - 0.05, tipo: 'desliza', g: 0.7 })
  // La marca aparece (si no venía de antes) y el dedo toca.
  const sigue = previo && !t.cambia && previo.marca === m.marca
  if (m.marca && !sigue) cues.push({ t: s(m.inicio + t.marca) - 0.07, tipo: 'pop', g: 0.55 })
  if (m.tap) cues.push({ t: s(m.inicio + t.toque) - 0.03, tipo: 'tecla', g: 1.4 })
  if (m.sonido) cues.push({ t: s(m.inicio + t.marca), tipo: m.sonido })
})

const destino = new URL('../public/audio.wav', import.meta.url).pathname
await generarAudio({ duracion: s(total) + 0.5, cues, destino, volumenMusica: 0.28 })
console.log(`audio: ${s(total).toFixed(1)} s, ${cues.length} efectos → ${destino}`)
