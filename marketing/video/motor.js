/*
 * Motor de video de bookeaa. Cada video es una lista de escenas; cada escena arma
 * su DOM una vez y devuelve update(t), una función PURA del tiempo local. Así el
 * render (marketing/scripts/render-video.mjs) puede pedir cualquier cuadro con
 * window.seek(segundos) y el resultado es exacto, sin depender de requestAnimationFrame.
 */
;(function () {
  const W = 1080
  const H = 1920

  // ---------- Utilidades de animación ----------
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v))
  const lerp = (a, b, t) => a + (b - a) * t
  /** Progreso 0→1 de una animación que empieza en `a` y dura `d` segundos. */
  const p = (t, a, d) => clamp((t - a) / d)
  const ease = {
    out: (x) => 1 - Math.pow(1 - x, 4),
    inOut: (x) => (x < 0.5 ? 8 * x * x * x * x : 1 - Math.pow(-2 * x + 2, 4) / 2),
    in: (x) => x * x * x,
    back: (x) => {
      const c = 1.4
      return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2)
    },
  }
  /** Valor animado: de `from` a `to` entre a y a+d con curva ease.out. */
  const tw = (t, a, d, from, to, curva = ease.out) => lerp(from, to, curva(p(t, a, d)))

  // ---------- DOM ----------
  function h(tag, attrs = {}, ...children) {
    const el = document.createElement(tag)
    for (const [k, v] of Object.entries(attrs)) {
      if (v === undefined || v === null || v === false) continue
      if (k === 'style' && typeof v === 'object') Object.assign(el.style, v)
      else if (k === 'class') el.className = v
      else if (k === 'text') el.textContent = v
      else if (k === 'html') el.innerHTML = v
      else el.setAttribute(k, v)
    }
    for (const c of children.flat()) {
      if (c === null || c === undefined || c === false) continue
      el.appendChild(typeof c === 'string' ? document.createTextNode(c) : c)
    }
    return el
  }

  /**
   * Título grande en líneas que suben desde abajo, una tras otra (máscara por línea).
   * Devuelve { el, update(t) }; entra en `a` y, si se pasa `sale`, se va hacia arriba.
   */
  // ---------- Sonido ----------
  // Mientras una escena se arma, sus efectos se anotan aquí con tiempo LOCAL; montar()
  // los pasa a tiempo absoluto. render-video.mjs los lee (window.cues) y genera el audio.
  let registro = null
  /** Anota un efecto de sonido: tipo = tecla | whoosh | desliza | golpe | pop | texto | ding | check | final. */
  function sonido(t, tipo, extra = {}) {
    if (registro) registro.push({ t, tipo, ...extra })
  }
  /** Teclas para un texto que se escribe entre a y a+d (una por carácter, con algo de azar). */
  function teclear(a, d, caracteres) {
    for (let i = 0; i < caracteres; i++) sonido(a + (d * i) / caracteres + ((i * 7919) % 13) / 1000, 'tecla')
  }

  function lineas(textos, { a = 0, paso = 0.09, clase = 'mega', sale = null, estilo = {}, mudo = false } = {}) {
    if (!mudo) sonido(a + 0.05, 'texto')
    const inner = textos.map((txt) => h('span', { class: 'linea-in', html: txt }))
    const el = h('div', { class: clase, style: estilo }, inner.map((i) => h('span', { class: 'linea' }, i)))
    return {
      el,
      update(t) {
        inner.forEach((i, n) => {
          let y = tw(t, a + n * paso, 0.55, 112, 0)
          if (sale !== null) y += tw(t, sale + n * 0.05, 0.4, 0, -112, ease.in)
          i.style.transform = `translateY(${y}%)`
        })
      },
    }
  }

  /** Aparece con opacidad + desplazamiento corto. */
  function aparece(el, t, a, { d = 0.5, y = 40, x = 0, escala = 1 } = {}) {
    const k = ease.out(p(t, a, d))
    el.style.opacity = k
    el.style.transform = `translate(${lerp(x, 0, k)}px, ${lerp(y, 0, k)}px) scale(${lerp(escala, 1, k)})`
  }

  /** Teléfono con una captura real de la app (390×844). */
  function telefono(src, ancho = 560) {
    const alto = Math.round((ancho - 28) * (844 / 390)) + 28
    return h(
      'div',
      { class: 'tel', style: { width: ancho + 'px', height: alto + 'px' } },
      h('img', { src, alt: '' }),
      h('span', { class: 'isla' }),
    )
  }

  /** Esquinas ⌐ ¬ de la marca alrededor de un bloque. */
  function esquinas(el, claro = false) {
    el.classList.add('esquinas')
    if (claro) el.classList.add('claro')
    el.appendChild(h('i', { class: 'esq a' }))
    el.appendChild(h('i', { class: 'esq b' }))
    return el
  }

  function cruces(claro = false) {
    return h('div', { class: 'cruces' + (claro ? ' claro' : '') }, h('span', { text: '×' }), h('span', { text: '×' }))
  }

  /** Tarjeta de evento de Google Calendar (mismo diseño que la landing). */
  function eventoCalendario({ titulo, cuando, quien }) {
    return h(
      'div',
      { class: 'evento' },
      h('p', { class: 'ev-k', text: 'GOOGLE CALENDAR' }),
      h('div', { class: 'ev-row' }, h('span', { class: 'ev-bar' }), h('div', {}, h('p', { class: 'ev-t', text: titulo }), h('p', { class: 'ev-s', text: cuando }), h('p', { class: 'ev-s', text: quien }))),
      h('p', { class: 'ev-ok', html: '<b>✓</b> Guardado en tu calendario y en el suyo' }),
    )
  }

  function burbuja(texto, propia = false) {
    return h('div', { class: 'burbuja' + (propia ? ' propia' : '') }, h('span', { text: texto }))
  }

  // ---------- Transiciones ----------
  // Cada límite entre escenas usa una. Se ven como bloques que tapan y destapan.
  const TRANS = 0.34
  const transiciones = {
    /** Panel negro con borde de ola que sube, tapa y sigue subiendo. */
    ola(panel, k) {
      panel.style.transform = `translateY(${lerp(100, -100, k)}%)`
    },
    /** Panel que cruza de izquierda a derecha. */
    lado(panel, k) {
      panel.style.transform = `translateX(${lerp(-100, 100, k)}%)`
    },
    /** Dos barras que cierran y abren como una persiana. */
    persiana(panel, k, extra) {
      const c = k < 0.5 ? ease.inOut(k * 2) : 1 - ease.inOut((k - 0.5) * 2)
      panel.style.transform = 'none'
      extra.arriba.style.transform = `translateY(${lerp(-100, 0, c)}%)`
      extra.abajo.style.transform = `translateY(${lerp(100, 0, c)}%)`
    },
    corte() {},
  }

  // ---------- Reproductor ----------
  function montar(video) {
    const stage = document.getElementById('stage')
    stage.textContent = ''
    stage.style.width = W + 'px'
    stage.style.height = H + 'px'

    let inicio = 0
    const escenas = video.escenas.map((esc) => {
      const cont = h('div', { class: 'escena ' + (esc.fondo === 'negro' ? 'negra' : 'blanca') })
      stage.appendChild(cont)
      registro = []
      const update = esc.build(cont)
      const item = { ...esc, cont, update, inicio, sonidos: registro }
      registro = null
      inicio += esc.dur
      return item
    })

    const panel = h('div', { class: 'panel' }, h('div', { class: 'ola' }))
    const arriba = h('div', { class: 'persiana arriba' })
    const abajo = h('div', { class: 'persiana abajo' })
    stage.append(panel, arriba, abajo)

    // Barra de progreso fina arriba, como una historia de Instagram.
    const prog = h('div', { class: 'progreso' }, h('i'))
    stage.appendChild(prog)

    const duracion = inicio

    function seek(T) {
      T = clamp(T, 0, duracion - 1e-4)
      let activa = escenas.length - 1
      for (let i = 0; i < escenas.length; i++) {
        if (T < escenas[i].inicio + escenas[i].dur) {
          activa = i
          break
        }
      }
      escenas.forEach((e, i) => {
        const visible = i === activa
        // display y no visibility: un hijo con visibility: visible se vería igual.
        e.cont.style.display = visible ? '' : 'none'
        if (visible) e.update(T - e.inicio)
      })

      // Transición: cerca de un límite entre escenas.
      // En reposo el panel se esconde entero (su borde de ola asoma por arriba si no).
      panel.style.visibility = 'hidden'
      arriba.style.transform = 'translateY(-100%)'
      abajo.style.transform = 'translateY(100%)'
      for (let i = 1; i < escenas.length; i++) {
        const B = escenas[i].inicio
        if (Math.abs(T - B) < TRANS) {
          const tipo = escenas[i].entrada || 'ola'
          const k = (T - (B - TRANS)) / (2 * TRANS)
          // Si cambia el fondo, el panel es del color que viene: la ola "pinta" la escena
          // nueva y su borde de salida no se ve. Si no cambia, pasa una banda del color
          // contrario para que el corte se note.
          const cambia = escenas[i].fondo !== escenas[i - 1].fondo
          const color = cambia ? escenas[i].fondo : escenas[i].fondo === 'negro' ? 'blanco' : 'negro'
          panel.className = 'panel ' + (color === 'negro' ? 'negro' : 'blanco')
          panel.style.visibility = tipo === 'ola' || tipo === 'lado' ? 'visible' : 'hidden'
          transiciones[tipo](panel, ease.inOut(k), { arriba, abajo })
        }
      }
      prog.firstChild.style.transform = `scaleX(${T / duracion})`
    }

    /** Todos los efectos en tiempo absoluto: los de cada escena y los de las transiciones. */
    function cues() {
      const lista = []
      escenas.forEach((e, i) => {
        e.sonidos.forEach((c) => lista.push({ ...c, t: e.inicio + c.t }))
        if (i === 0) return
        const tipo = e.entrada || 'ola'
        if (tipo === 'ola' || tipo === 'lado') lista.push({ t: e.inicio - TRANS - 0.05, tipo: 'whoosh' })
        if (tipo === 'persiana') lista.push({ t: e.inicio - 0.06, tipo: 'golpe' })
      })
      return lista.filter((c) => c.t >= 0 && c.t < duracion).sort((a, b) => a.t - b.t)
    }

    return { seek, duracion, cues }
  }

  window.Motor = { sonido, teclear, W, H, clamp, lerp, p, ease, tw, h, lineas, aparece, telefono, esquinas, cruces, eventoCalendario, burbuja, montar }
})()
