/*
 * Los 4 videos de la primera campaña. Cada escena: { dur, fondo, entrada, build(root) }.
 * build arma el DOM y devuelve update(t) con t = segundos desde que empezó la escena.
 * `entrada` es la transición con la que ENTRA la escena (ola, lado, persiana, corte).
 */
;(function () {
  const { sonido, teclear, h, lineas, aparece, telefono, esquinas, cruces, eventoCalendario, burbuja, tw, p, ease, lerp } = Motor

  const FLUJO = '../assets/flujo/'
  const PLANT = '../../public/landing/plantillas/'
  const COLOR = '../../public/landing/colores/'

  // ---------- Piezas reutilizables ----------

  function logoSvg(claro) {
    const fg = claro ? '#ffffff' : '#0f0f0e'
    const bg = claro ? '#0f0f0e' : '#ffffff'
    return `<svg viewBox="0 0 32 32"><rect x="2" y="4" width="28" height="26" rx="7" fill="${fg}"/><path d="M10 2.5v5M22 2.5v5" stroke="${fg}" stroke-width="2.6" stroke-linecap="round"/><path d="M12 11v12M12 17.5a4 4 0 1 1 0 .01" stroke="${bg}" stroke-width="2.6" stroke-linecap="round" fill="none"/></svg>`
  }
  function logo(claro, escala = 1) {
    return h('div', { class: 'logo', style: { transform: `scale(${escala})`, transformOrigin: 'left center' }, html: logoSvg(claro) + '<b>bookeaa</b>' })
  }

  /** Posiciona con estilos absolutos en px. */
  const pos = (el, estilo) => (Object.assign(el.style, { position: 'absolute', ...estilo }), el)

  /** Escena final común: 1 mes gratis + link en la bio. */
  function cta({ kicker = 'EMPIEZA HOY', dur = 5 } = {}) {
    return {
      dur,
      fondo: 'negro',
      entrada: 'persiana',
      build(root) {
        const k = pos(h('p', { class: 'kicker', text: kicker }), { top: '300px', left: '90px' })
        const t = lineas(['1 MES', 'GRATIS.'], { a: 0.25, clase: 'mega' })
        const tEl = pos(esquinas(t.el, true), { top: '370px', left: '90px' })
        const sub = pos(h('p', { class: 'texto', html: 'Después, <b>$10 al mes</b>.<br>Todo incluido. Sin tarjeta.' }), { top: '860px', left: '90px' })
        const pill = pos(h('span', { class: 'pill', text: 'Escríbenos · link en la bio' }), { top: '1110px', left: '90px' })
        const lg = pos(logo(true, 0.62), { bottom: '170px', left: '90px' })
        root.append(k, tEl, sub, pill, lg, cruces(true))
        sonido(1.25, 'check')
        sonido(1.6, 'final')
        return (s) => {
          aparece(k, s, 0.05, { y: 20 })
          t.update(s)
          aparece(sub, s, 0.9)
          aparece(pill, s, 1.25, { y: 30, escala: 0.9 })
          aparece(lg, s, 1.6, { y: 30 })
        }
      },
    }
  }

  /** Paso numerado con captura real: número hueco, título, subtítulo y teléfono subiendo. */
  function paso(num, titulo, sub, img, { fondo = 'blanco', entrada = 'lado', dur = 3.6 } = {}) {
    return {
      dur,
      fondo,
      entrada,
      build(root) {
        const n = pos(h('div', { class: 'num', text: num }), { top: '150px', left: '80px' })
        const t = lineas(titulo, { a: 0.15, clase: 'grande' })
        const tEl = pos(t.el, { top: '420px', left: '90px', width: '900px' })
        const s = pos(h('p', { class: 'texto', text: sub }), { top: `${440 + titulo.length * 120}px`, left: '90px', width: '880px' })
        const tel = pos(telefono(FLUJO + img, 640), { left: '220px', top: '0px' })
        root.append(n, tEl, s, tel)
        sonido(0.35, 'desliza')
        return (x) => {
          aparece(n, x, 0, { y: 0, x: -60 })
          t.update(x)
          aparece(s, x, 0.45)
          const y = tw(x, 0.35, 0.8, 1920, 880) + tw(x, 1.2, dur, 0, -60, (k) => k)
          tel.style.transform = `translateY(${y}px) rotate(${tw(x, 0.35, 0.9, 6, 0)}deg)`
        }
      },
    }
  }

  // ---------- VIDEO 1 · ¿Qué es bookeaa? ----------
  const video1 = {
    id: 1,
    titulo: '¿Qué es bookeaa?',
    escenas: [
      {
        dur: 3.4,
        fondo: 'blanco',
        build(root) {
          const k = pos(h('p', { class: 'kicker', text: 'Para negocios que trabajan con cita' }), { top: '420px', left: '90px' })
          const t = lineas(['¿TODAVÍA', 'AGENDAS EN', 'UNA <span class="tachado">LIBRETA</span>?'], { a: 0.2, clase: 'mega' })
          const tEl = pos(esquinas(t.el), { top: '500px', left: '90px' })
          root.append(k, tEl, cruces())
          const tachado = tEl.querySelector('.tachado')
          sonido(1.4, 'desliza', { g: 0.7 })
          return (s) => {
            aparece(k, s, 0, { y: 20 })
            t.update(s)
            tachado.style.setProperty('--tacha', tw(s, 1.4, 0.5, 0, 1))
          }
        },
      },
      {
        dur: 4,
        fondo: 'negro',
        build(root) {
          const msgs = [
            ['¿Tienes hora mañana?', false],
            ['Déjame revisar…', true],
            ['¿Y a las 4?', false],
            ['Esa ya la di 😅', true],
            ['¿Y el jueves?', false],
          ]
          const col = pos(h('div', { style: { display: 'flex', flexDirection: 'column', gap: '28px', width: '900px' } }), { top: '240px', left: '90px' })
          const bs = msgs.map(([m, propia]) => {
            const b = burbuja(m, propia)
            b.style.alignSelf = propia ? 'flex-end' : 'flex-start'
            col.appendChild(b)
            return b
          })
          const t = lineas(['10 MENSAJES', 'PARA UNA CITA.'], { a: 2.3, clase: 'grande' })
          const tEl = pos(t.el, { bottom: '240px', left: '90px' })
          root.append(col, tEl)
          bs.forEach((_, i) => sonido(0.15 + i * 0.36, 'pop'))
          return (s) => {
            bs.forEach((b, i) => aparece(b, s, 0.15 + i * 0.36, { y: 50, escala: 0.92, d: 0.4 }))
            t.update(s)
          }
        },
      },
      {
        dur: 3.4,
        fondo: 'blanco',
        entrada: 'persiana',
        build(root) {
          const lg = pos(logo(false, 1.2), { top: '720px', left: '110px' })
          const k = pos(h('p', { class: 'kicker', text: 'Tu agenda online' }), { top: '1000px', left: '110px' })
          const r = pos(h('i', { class: 'regla' }), { top: '1070px', left: '110px' })
          const tx = pos(h('p', { class: 'texto', html: 'Tus clientes reservan solos.<br><b>Tú solo atiendes.</b>' }), { top: '1120px', left: '110px' })
          root.append(lg, k, r, tx, cruces())
          sonido(0.05, 'check')
          return (s) => {
            aparece(lg, s, 0.05, { y: 0, escala: 0.85, d: 0.6 })
            aparece(k, s, 0.5, { y: 20 })
            r.style.transform = `scaleX(${tw(s, 0.6, 0.5, 0, 1)})`
            aparece(tx, s, 0.8)
          }
        },
      },
      {
        dur: 4.8,
        fondo: 'negro',
        entrada: 'ola',
        build(root) {
          const k = pos(h('p', { class: 'kicker', text: '01 · Tu link' }), { top: '200px', left: '90px' })
          const t = lineas(['COMPARTE', 'TU LINK'], { a: 0.15, clase: 'mega' })
          const tEl = pos(t.el, { top: '270px', left: '90px' })
          const escrito = h('b')
          const cursor = h('span', { class: 'cursor' })
          const link = pos(
            h('div', { class: 'link' }, h('span', {}, 'bookeaa.com/u/', escrito, cursor), h('span', { class: 'copiar' }, h('span', { text: 'COPIAR' }))),
            { top: '700px', left: '90px' },
          )
          const tel = pos(telefono(FLUJO + '1-inicio.jpg', 600), { left: '240px', top: '0px' })
          root.append(k, tEl, link, tel)
          const nombre = 'barberia-norte'
          teclear(0.9, 1.1, nombre.length)
          sonido(1.9, 'desliza')
          return (s) => {
            aparece(k, s, 0, { y: 20 })
            t.update(s)
            aparece(link, s, 0.5, { y: 30 })
            escrito.textContent = nombre.slice(0, Math.round(tw(s, 0.9, 1.1, 0, nombre.length, (x) => x)))
            cursor.style.opacity = Math.floor(s * 3) % 2 ? 0 : 1
            tel.style.transform = `translateY(${tw(s, 1.9, 0.9, 1920, 930)}px)`
          }
        },
      },
      {
        dur: 5.2,
        fondo: 'blanco',
        entrada: 'lado',
        build(root) {
          const k = pos(h('p', { class: 'kicker', text: '02 · Tu cliente reserva' }), { top: '200px', left: '90px' })
          const t = lineas(['ELIGE SERVICIO', 'Y HORA'], { a: 0.15, clase: 'grande' })
          const tEl = pos(t.el, { top: '270px', left: '90px' })
          const a = pos(telefono(FLUJO + '2-servicios.jpg', 500), { left: '40px', top: '0' })
          const b = pos(telefono(FLUJO + '4-agenda.jpg', 500), { left: '540px', top: '0' })
          const nota = pos(h('p', { class: 'texto', text: 'Solo ve las horas que de verdad tienes libres.' }), { top: '560px', left: '90px' })
          root.append(k, tEl, nota, a, b)
          sonido(0.4, 'desliza')
          sonido(0.7, 'desliza', { g: 0.8 })
          return (s) => {
            aparece(k, s, 0, { y: 20 })
            t.update(s)
            aparece(nota, s, 0.5)
            a.style.transform = `translateY(${tw(s, 0.4, 0.9, 1920, 760)}px) rotate(${tw(s, 0.4, 0.9, -12, -5)}deg)`
            b.style.transform = `translateY(${tw(s, 0.7, 0.9, 1920, 820)}px) rotate(${tw(s, 0.7, 0.9, 12, 5)}deg)`
          }
        },
      },
      {
        dur: 4.8,
        fondo: 'negro',
        entrada: 'ola',
        build(root) {
          const k = pos(h('p', { class: 'kicker', text: '03 · Queda agendada' }), { top: '200px', left: '90px' })
          const t = lineas(['Y CAE EN TU', 'GOOGLE', 'CALENDAR'], { a: 0.15, clase: 'mega' })
          const tEl = pos(t.el, { top: '270px', left: '90px' })
          const ev = pos(eventoCalendario({ titulo: 'Corte y barba', cuando: 'Mié 30 sep · 2:00 – 2:45 p. m.', quien: 'Carlos M. · 0412 555 1234' }), { top: '980px', left: '150px' })
          const pie = pos(h('p', { class: 'texto', text: 'Sin choques. Tu cliente también la guarda en el suyo.' }), { top: '1600px', left: '90px' })
          root.append(k, tEl, ev, pie)
          sonido(0.8, 'ding')
          return (s) => {
            aparece(k, s, 0, { y: 20 })
            t.update(s)
            aparece(ev, s, 0.8, { y: 120, escala: 0.9, d: 0.6 })
            aparece(pie, s, 1.5)
          }
        },
      },
      {
        dur: 4.4,
        fondo: 'blanco',
        entrada: 'persiana',
        build(root) {
          const t = lineas(['TU MARCA.', 'TUS COLORES.'], { a: 0.15, clase: 'grande' })
          const tEl = pos(esquinas(t.el), { top: '250px', left: '90px' })
          const sub = pos(h('p', { class: 'texto', text: '8 estilos para que tu página se vea como tu negocio.' }), { top: '560px', left: '90px' })
          const tels = ['audaz', 'moderno', 'retro'].map((e, i) => pos(telefono(PLANT + e + '.jpg', 440), { left: `${60 + i * 270}px`, top: '0', zIndex: i === 1 ? 3 : 1 }))
          root.append(tEl, sub, ...tels)
          tels.forEach((_, i) => sonido(0.45 + i * 0.12, 'desliza', { g: 0.7 }))
          return (s) => {
            t.update(s)
            aparece(sub, s, 0.45)
            tels.forEach((el, i) => {
              const k = ease.out(p(s, 0.45 + i * 0.12, 0.8))
              const rot = [-9, 0, 9][i]
              el.style.transform = `translateY(${lerp(1920, i === 1 ? 760 : 840, k)}px) rotate(${lerp(0, rot, k)}deg)`
            })
          }
        },
      },
      cta(),
    ],
  }

  // ---------- VIDEO 2 · Así reserva tu cliente ----------
  const mensajeEjemplo =
    '✨ ¡Nueva reserva en Barbería Norte! ✨\n\n👤 Carlos Méndez\n🗓️ Miércoles 30 de septiembre\n⏰ 2:00 p. m. (45 min)\n\n💫 • Corte y barba — 16,00 €\n📍 En Sede Centro\n💰 Total: 16,00 € · En la cita\n\n🔖 Reserva #B3C521A8'

  const video2 = {
    id: 2,
    titulo: 'Así reserva tu cliente',
    escenas: [
      {
        dur: 3.2,
        fondo: 'negro',
        build(root) {
          const k = pos(h('p', { class: 'kicker', text: 'En menos de un minuto' }), { top: '560px', left: '90px' })
          const t = lineas(['ASÍ', 'RESERVAN', 'TUS CLIENTES'], { a: 0.15, clase: 'mega' })
          const tEl = pos(esquinas(t.el, true), { top: '640px', left: '90px' })
          root.append(k, tEl, cruces(true))
          return (s) => {
            aparece(k, s, 0, { y: 20 })
            t.update(s)
          }
        },
      },
      paso('01', ['ABRE', 'TU LINK'], 'Desde tu Instagram, tu estado o un mensaje.', '1-inicio.jpg', { entrada: 'ola' }),
      paso('02', ['ELIGE', 'SERVICIOS'], 'Con precio y duración a la vista.', '2-servicios.jpg'),
      paso('03', ['ELIGE', 'DÓNDE'], 'Tu local, una de tus sedes o a domicilio.', '3-lugar.jpg'),
      paso('04', ['DÍA', 'Y HORA'], 'Solo ve las horas que de verdad tienes libres.', '4-agenda.jpg'),
      paso('05', ['CONFIRMA'], 'Nombre, teléfono y cómo va a pagar.', '5-pago.jpg'),
      {
        dur: 5,
        fondo: 'negro',
        entrada: 'ola',
        build(root) {
          const t = lineas(['TE LLEGA POR', 'WHATSAPP'], { a: 0.15, clase: 'grande' })
          const tEl = pos(t.el, { top: '200px', left: '90px' })
          const wa = pos(
            h('div', { class: 'wa' }, h('div', { class: 'cab' }, h('i'), 'Carlos Méndez'), h('div', { class: 'burbuja', text: mensajeEjemplo })),
            { top: '520px', left: '90px', width: '900px' },
          )
          const pie = pos(h('p', { class: 'texto', text: 'Con todo el detalle. Y el mensaje lo eliges tú.' }), { top: '1640px', left: '90px' })
          root.append(tEl, wa, pie)
          sonido(0.5, 'ding')
          return (s) => {
            t.update(s)
            aparece(wa, s, 0.5, { y: 100, escala: 0.94, d: 0.6 })
            aparece(pie, s, 1.4)
          }
        },
      },
      {
        dur: 4,
        fondo: 'blanco',
        entrada: 'persiana',
        build(root) {
          const t = lineas(['Y QUEDA EN', 'TU CALENDARIO'], { a: 0.15, clase: 'grande' })
          const tEl = pos(esquinas(t.el), { top: '300px', left: '90px' })
          const ev = pos(eventoCalendario({ titulo: 'Corte y barba', cuando: 'Mié 30 sep · 2:00 – 2:45 p. m.', quien: 'Sede Centro · Carlos M.' }), { top: '760px', left: '150px' })
          root.append(tEl, ev, cruces())
          sonido(0.6, 'ding')
          return (s) => {
            t.update(s)
            aparece(ev, s, 0.6, { y: 120, escala: 0.9, d: 0.6 })
          }
        },
      },
      cta({ kicker: 'Así de fácil' }),
    ],
  }

  // ---------- VIDEO 3 · Tu marca, tu estilo ----------
  const ESTILOS = [
    ['elegante', 'Elegante', 'Instrument Serif + Inter'],
    ['moderno', 'Moderno', 'Plus Jakarta Sans + Inter'],
    ['editorial', 'Editorial', 'Newsreader + Source Sans 3'],
    ['amable', 'Amable', 'Nunito'],
    ['audaz', 'Audaz', 'Barlow Condensed + Barlow'],
    ['clasico', 'Clásico', 'Playfair Display + Lato'],
    ['minimal', 'Minimal', 'DM Sans'],
    ['retro', 'Retro', 'Fraunces + Figtree'],
  ]
  const POR_ESTILO = 1.2

  const video3 = {
    id: 3,
    titulo: 'Tu marca, tu estilo',
    escenas: [
      {
        dur: 3.4,
        fondo: 'blanco',
        build(root) {
          const t = lineas(['UNA PÁGINA', 'QUE SE VE', 'COMO TU', 'NEGOCIO'], { a: 0.15, clase: 'mega' })
          const tEl = pos(esquinas(t.el), { top: '470px', left: '90px' })
          root.append(tEl, cruces())
          return (s) => t.update(s)
        },
      },
      {
        dur: ESTILOS.length * POR_ESTILO + 0.4,
        fondo: 'blanco',
        entrada: 'ola',
        build(root) {
          const k = pos(h('p', { class: 'kicker', text: '8 estilos' }), { top: '200px', left: '90px' })
          const contador = pos(h('p', { class: 'kicker', style: { opacity: 1 } }), { top: '200px', right: '90px' })
          const nombres = ESTILOS.map(([, n]) => pos(h('div', { class: 'mega', text: n.toUpperCase() }), { top: '270px', left: '90px' }))
          const fuentes = ESTILOS.map(([, , f]) => pos(h('p', { class: 'texto', text: f }), { top: '470px', left: '90px' }))
          const tels = ESTILOS.map(([id]) => pos(telefono(PLANT + id + '.jpg', 640), { left: '220px', top: '640px' }))
          root.append(k, contador, ...nombres, ...fuentes, ...tels)
          ESTILOS.forEach((_, i) => sonido(i === 0 ? 0.1 : i * POR_ESTILO, 'desliza', { g: 0.8 }))
          return (s) => {
            aparece(k, s, 0, { y: 20 })
            const i = Math.min(ESTILOS.length - 1, Math.floor(s / POR_ESTILO))
            const local = s - i * POR_ESTILO
            contador.textContent = String(i + 1).padStart(2, '0') + ' / 08'
            ESTILOS.forEach((_, j) => {
              const activo = j === i
              const anterior = j === i - 1 && local < 0.35
              nombres[j].style.opacity = activo ? 1 : 0
              nombres[j].style.clipPath = activo ? `inset(${tw(local, 0, 0.3, 100, 0)}% 0 0 0)` : 'none'
              fuentes[j].style.opacity = activo ? tw(local, 0.1, 0.3, 0, 1) : 0
              if (activo) {
                const x = j === 0 ? tw(s, 0.1, 0.7, 1300, 0) : tw(local, 0, 0.35, 1100, 0)
                tels[j].style.transform = `translateX(${x}px)`
                tels[j].style.zIndex = 2
                tels[j].style.visibility = 'visible'
              } else if (anterior) {
                tels[j].style.transform = `translateX(${tw(local, 0, 0.35, 0, -1100)}px)`
                tels[j].style.zIndex = 1
                tels[j].style.visibility = 'visible'
              } else {
                tels[j].style.visibility = 'hidden'
              }
            })
          }
        },
      },
      {
        dur: 5.2,
        fondo: 'negro',
        entrada: 'persiana',
        build(root) {
          const t = lineas(['TU COLOR.', 'TU FONDO.'], { a: 0.15, clase: 'mega' })
          const tEl = pos(esquinas(t.el, true), { top: '220px', left: '90px' })
          const sub = pos(h('p', { class: 'texto', text: 'Claro u oscuro. Los textos se ajustan solos.' }), { top: '600px', left: '90px' })
          const combos = [
            ['azul', '#2F5BEA', '#FFFFFF'],
            ['coral', '#E4572E', '#FFF4EA'],
            ['lima', '#C6F432', '#111111'],
          ]
          const tels = combos.map(([f], i) => pos(telefono(COLOR + f + '.jpg', 400), { left: `${50 + i * 330}px`, top: '0', zIndex: 3 - i }))
          const chips = combos.map(([, c, f], i) =>
            pos(h('div', { style: { display: 'flex', flexDirection: 'column', gap: '14px' } }, h('span', { class: 'chip', html: `<i style="background:${c}"></i>${c}` }), h('span', { class: 'chip', html: `<i style="background:${f}"></i>${f}` })), {
              left: `${70 + i * 330}px`, top: '1640px',
            }),
          )
          root.append(tEl, sub, ...tels, ...chips)
          tels.forEach((_, i) => sonido(0.5 + i * 0.15, 'desliza', { g: 0.7 }))
          chips.forEach((_, i) => sonido(1.3 + i * 0.12, 'pop', { g: 0.6 }))
          return (s) => {
            t.update(s)
            aparece(sub, s, 0.4)
            tels.forEach((el, i) => {
              el.style.transform = `translateY(${tw(s, 0.5 + i * 0.15, 0.8, 1920, 760)}px) rotate(${tw(s, 0.5 + i * 0.15, 0.8, 8, 0)}deg)`
            })
            chips.forEach((el, i) => aparece(el, s, 1.3 + i * 0.12, { y: 30 }))
          }
        },
      },
      {
        dur: 3.4,
        fondo: 'blanco',
        entrada: 'ola',
        build(root) {
          const filas = ['8 ESTILOS', 'TUS COLORES', 'TU LOGO', 'TU NOMBRE']
          const t = lineas(filas, { a: 0.1, paso: 0.18, clase: 'mega' })
          const tEl = pos(t.el, { top: '520px', left: '90px' })
          root.append(tEl, cruces())
          return (s) => t.update(s)
        },
      },
      cta({ kicker: 'Tu página, lista hoy' }),
    ],
  }

  // ---------- VIDEO 4 · Para quién es y cuánto cuesta ----------
  const RUBROS = ['BARBERÍAS', 'UÑAS', 'CONSULTORIOS', 'ESTÉTICA', 'SPAS', 'TATUAJES', 'ENTRENADORES']

  const video4 = {
    id: 4,
    titulo: 'Para quién es y cuánto cuesta',
    escenas: [
      {
        dur: 3,
        fondo: 'negro',
        build(root) {
          const t = lineas(['¿ATIENDES', 'CON CITA?'], { a: 0.15, clase: 'mega' })
          const tEl = pos(esquinas(t.el, true), { top: '720px', left: '90px' })
          root.append(tEl, cruces(true))
          return (s) => t.update(s)
        },
      },
      {
        dur: 4.4,
        fondo: 'blanco',
        entrada: 'ola',
        build(root) {
          const k = pos(h('p', { class: 'kicker', text: 'bookeaa es para' }), { top: '220px', left: '90px' })
          const filas = RUBROS.map((r) =>
            pos(h('div', { class: 'grande', style: { padding: '6px 22px', marginLeft: '-22px' } }, r), { left: '90px' }),
          )
          filas.forEach((f, i) => (f.style.top = `${300 + i * 176}px`))
          const y = pos(h('p', { class: 'texto', html: '…y cualquier negocio que viva de su agenda.' }), { top: '1560px', left: '90px' })
          root.append(k, ...filas, y)
          filas.forEach((_, i) => sonido(0.15 + i * 0.16, 'pop', { g: 0.7 }))
          return (s) => {
            aparece(k, s, 0, { y: 20 })
            filas.forEach((f, i) => {
              aparece(f, s, 0.15 + i * 0.16, { y: 60, d: 0.4 })
              // Uno a uno se "resalta" en negro, como un marcador que pasa.
              const activo = Math.floor(tw(s, 1.6, 2.2, 0, RUBROS.length, (x) => x)) === i
              f.style.background = activo ? '#0f0f0e' : 'transparent'
              f.style.color = activo ? '#ffffff' : '#0f0f0e'
            })
            aparece(y, s, 1.4)
          }
        },
      },
      {
        dur: 4.4,
        fondo: 'negro',
        entrada: 'lado',
        build(root) {
          const t = lineas(['UNA O VARIAS', 'SEDES.', 'O A DOMICILIO.'], { a: 0.15, clase: 'grande' })
          const tEl = pos(t.el, { top: '200px', left: '90px' })
          const sub = pos(h('p', { class: 'texto', text: 'Consultorio, barbería o spa: tu página dice el nombre de tu lugar.' }), { top: '620px', left: '90px' })
          const tel = pos(telefono(FLUJO + '3-lugar.jpg', 620), { left: '230px', top: '0' })
          root.append(tEl, sub, tel)
          sonido(0.5, 'desliza')
          return (s) => {
            t.update(s)
            aparece(sub, s, 0.5)
            tel.style.transform = `translateY(${tw(s, 0.5, 0.9, 1920, 860)}px)`
          }
        },
      },
      {
        dur: 4.2,
        fondo: 'blanco',
        entrada: 'ola',
        build(root) {
          const t = lineas(['TU MENSAJE', 'DE WHATSAPP'], { a: 0.15, clase: 'grande' })
          const tEl = pos(t.el, { top: '200px', left: '90px' })
          const sub = pos(h('p', { class: 'texto', text: 'Cálido, formal o breve. Elige cómo te llega cada reserva.' }), { top: '480px', left: '90px' })
          const tonos = [
            ['Cálida', '✨ ¡Nueva reserva! Quiero confirmar mi cita 😊'],
            ['Formal', 'Buen día. Quisiera confirmar la siguiente cita.'],
            ['Breve', 'Hola 👋 Reservé para el jueves a las 4.'],
          ].map(([n, m], i) =>
            pos(h('div', { class: 'wa', style: { padding: '30px 34px' } }, h('p', { class: 'kicker', style: { color: '#111b21', marginBottom: '18px', fontSize: '32px' }, text: n }), h('div', { class: 'burbuja', text: m })), {
              top: `${700 + i * 330}px`, left: '90px', width: '900px',
            }),
          )
          root.append(tEl, sub, ...tonos)
          tonos.forEach((_, i) => sonido(0.7 + i * 0.22, 'pop'))
          return (s) => {
            t.update(s)
            aparece(sub, s, 0.45)
            tonos.forEach((el, i) => aparece(el, s, 0.7 + i * 0.22, { y: 60, d: 0.5 }))
          }
        },
      },
      {
        dur: 5.4,
        fondo: 'negro',
        entrada: 'persiana',
        build(root) {
          const k = pos(h('p', { class: 'kicker', text: 'Precio' }), { top: '240px', left: '90px' })
          const cero = pos(h('div', { class: 'mega', style: { fontSize: '420px' }, text: '$0' }), { top: '330px', left: '80px' })
          const ceroTxt = pos(h('p', { class: 'medio', text: 'POR 30 DÍAS' }), { top: '720px', left: '90px' })
          const diez = pos(h('div', { class: 'mega', style: { fontSize: '420px' }, text: '$10' }), { top: '330px', left: '80px' })
          const diezTxt = pos(h('p', { class: 'medio', text: 'AL MES · TODO INCLUIDO' }), { top: '720px', left: '90px' })
          const lista = ['Reservas ilimitadas', 'Google Calendar', 'Tu link y tu página', 'Los 8 estilos', 'Sedes y domicilio', 'Soporte por WhatsApp'].map((x, i) =>
            pos(h('p', { class: 'texto', html: `<b>✓</b>&nbsp; ${x}` }), { top: `${960 + i * 92}px`, left: '90px' }),
          )
          root.append(k, cero, ceroTxt, diez, diezTxt, ...lista)
          sonido(1.8, 'golpe', { g: 0.7 })
          lista.forEach((_, i) => sonido(2.2 + i * 0.12, 'tecla', { g: 1.4 }))
          return (s) => {
            aparece(k, s, 0, { y: 20 })
            const cambio = p(s, 1.8, 0.35)
            cero.style.opacity = ceroTxt.style.opacity = String(1 - cambio)
            cero.style.transform = `translateY(${tw(s, 0.1, 0.5, 80, 0) - cambio * 120}px)`
            ceroTxt.style.transform = `translateY(${-cambio * 60}px)`
            diez.style.opacity = diezTxt.style.opacity = String(cambio)
            diez.style.transform = `translateY(${(1 - cambio) * 120}px)`
            lista.forEach((el, i) => aparece(el, s, 2.2 + i * 0.12, { y: 30, d: 0.35 }))
          }
        },
      },
      cta(),
    ],
  }


  // =====================================================================
  // NOVIEMBRE · Cómo mejora tu negocio con bookeaa
  // =====================================================================


  /** Notificación tipo celular: se ve clara en fondo blanco y oscura en fondo negro. */
  function notificacion({ titulo, texto, hora }) {
    const ico = h('span', { class: 'ico', html: logoSvg(true) })
    return h('div', { class: 'notif' }, ico, h('div', {}, h('b', { text: titulo }), h('span', { text: texto })), h('time', { text: hora }))
  }

  function diaLista(eventos) {
    return h('div', { class: 'dia-v' }, eventos.map(([hora, que]) => h('p', {}, h('b', { text: hora }), que)))
  }

  /** Escena "hora del día": reloj gigante, etiqueta SIN/CON y un bloque abajo. */
  function momento({ hora, con, titulo, fondo, entrada = 'lado', dur = 3.8, cuerpo }) {
    return {
      dur,
      fondo,
      entrada,
      build(root) {
        const et = pos(h('span', { class: 'etiqueta', text: con ? 'Con bookeaa' : 'Sin bookeaa' }), { top: '180px', left: '90px' })
        const reloj = pos(h('div', { class: 'reloj', text: hora }), { top: '270px', left: '80px' })
        const t = lineas(titulo, { a: 0.35, clase: 'grande' })
        const tEl = pos(t.el, { top: '580px', left: '90px', width: '920px' })
        root.append(et, reloj, tEl)
        const upd = cuerpo(root)
        sonido(0.05, con ? 'check' : 'tecla', con ? {} : { g: 1.5 })
        return (s) => {
          aparece(et, s, 0, { y: 20 })
          aparece(reloj, s, 0.05, { y: 0, escala: 1.08, d: 0.45 })
          t.update(s)
          upd(s)
        }
      },
    }
  }

  // ---------- VIDEO 5 · Un día sin vs con bookeaa ----------
  const video5 = {
    id: 5,
    titulo: 'Un día sin y con bookeaa',
    escenas: [
      {
        dur: 3.2,
        fondo: 'blanco',
        build(root) {
          const k = pos(h('p', { class: 'kicker', text: 'El mismo negocio' }), { top: '600px', left: '90px' })
          const t = lineas(['DOS DÍAS.', 'UNA', 'DIFERENCIA.'], { a: 0.15, clase: 'mega' })
          const tEl = pos(esquinas(t.el), { top: '680px', left: '90px' })
          root.append(k, tEl, cruces())
          return (s) => { aparece(k, s, 0, { y: 20 }); t.update(s) }
        },
      },
      momento({
        hora: '7:00', con: false, fondo: 'negro', entrada: 'ola', titulo: ['14 CHATS', 'SIN RESPONDER.'],
        cuerpo(root) {
          const badge = pos(h('span', { class: 'badge', text: '14' }), { top: '980px', left: '90px' })
          const msgs = ['¿Tienes hora hoy?', '¿Cuánto cuesta el corte?', '¿Y mañana a las 5?'].map((m, i) =>
            pos(burbuja(m), { top: `${960 + i * 150}px`, left: '380px' }))
          root.append(badge, ...msgs)
          sonido(0.7, 'pop'); msgs.forEach((_, i) => sonido(0.95 + i * 0.25, 'pop'))
          return (s) => { aparece(badge, s, 0.7, { y: 0, escala: 0.6, d: 0.4 }); msgs.forEach((m, i) => aparece(m, s, 0.95 + i * 0.25, { y: 40 })) }
        },
      }),
      momento({
        hora: '7:00', con: true, fondo: 'blanco', titulo: ['3 RESERVAS', 'NUEVAS.'],
        cuerpo(root) {
          const ns = [['Corte y barba', 'Hoy · 10:30 a. m.'], ['Fade con diseño', 'Hoy · 2:00 p. m.'], ['Corte clásico', 'Mañana · 9:00 a. m.']].map(([a, b], i) =>
            pos(notificacion({ titulo: 'Nueva reserva · ' + a, texto: b, hora: ['6:12', '6:40', '6:55'][i]}), { top: `${960 + i * 200}px`, left: '90px' }))
          root.append(...ns)
          ns.forEach((_, i) => sonido(0.7 + i * 0.3, 'ding', { g: 0.8 }))
          return (s) => ns.forEach((n, i) => aparece(n, s, 0.7 + i * 0.3, { y: -40, d: 0.4 }))
        },
      }),
      momento({
        hora: '12:00', con: false, fondo: 'negro', entrada: 'ola', titulo: ['SE TE CRUZAN', 'DOS CITAS.'],
        cuerpo(root) {
          const a = pos(eventoCalendario({ titulo: 'Manicure', cuando: '12:00 – 1:00 p. m.', quien: 'María G.' }), { top: '930px', left: '90px', transform: 'rotate(-4deg)' })
          const b = pos(eventoCalendario({ titulo: 'Pedicure', cuando: '12:30 – 1:30 p. m.', quien: 'Ana P.' }), { top: '1180px', left: '210px' })
          root.append(a, b)
          sonido(0.7, 'desliza'); sonido(1.0, 'golpe', { g: 0.8 })
          return (s) => { aparece(a, s, 0.7, { y: 60 }); aparece(b, s, 1.0, { y: 60, escala: 1.05 }) }
        },
      }),
      momento({
        hora: '12:00', con: true, fondo: 'blanco', titulo: ['UNA HORA,', 'UNA CITA.'],
        cuerpo(root) {
          const d = pos(diaLista([['10:30', 'Corte y barba'], ['12:00', 'Manicure'], ['14:00', 'Fade con diseño'], ['16:30', 'Corte clásico']]), { top: '930px', left: '90px' })
          root.append(d)
          sonido(0.7, 'desliza', { g: 0.7 })
          return (s) => aparece(d, s, 0.7, { y: 60 })
        },
      }),
      momento({
        hora: '21:00', con: false, fondo: 'negro', entrada: 'ola', titulo: ['SIGUES', 'RESPONDIENDO.'],
        cuerpo(root) {
          const escrito = h('span')
          const b = pos(h('div', { class: 'burbuja propia' }, escrito, h('span', { class: 'cursor' })), { top: '1000px', left: '90px' })
          root.append(b)
          const txt = 'Sí, mañana tengo a las 4, ¿te la…'
          teclear(0.8, 1.9, txt.length)
          return (s) => { aparece(b, s, 0.6, { y: 30 }); escrito.textContent = txt.slice(0, Math.round(tw(s, 0.8, 1.9, 0, txt.length, (x) => x))) }
        },
      }),
      momento({
        hora: '21:00', con: true, fondo: 'blanco', titulo: ['MAÑANA', 'YA ESTÁ LLENA.'],
        cuerpo(root) {
          const tel = pos(telefono(FLUJO + '4-agenda.jpg', 560), { left: '260px', top: '0' })
          root.append(tel)
          sonido(0.6, 'desliza')
          return (s) => (tel.style.transform = `translateY(${tw(s, 0.6, 0.8, 1920, 930)}px)`)
        },
      }),
      cta({ kicker: 'Elige tu día' }),
    ],
  }

  // ---------- VIDEO 6 · ¿Cuánto tiempo pierdes agendando? ----------
  function contador(root, { de, a, desde, dur, sufijo = '', top, clase = 'mega', tamano = '360px' }) {
    const el = pos(h('div', { class: clase, style: { fontSize: tamano } }), { top, left: '80px' })
    root.appendChild(el)
    const pasos = Math.min(20, a - de)
    for (let i = 1; i <= pasos; i++) sonido(desde + (dur * i) / pasos, 'tecla', { g: 1.2 })
    return (s) => (el.textContent = Math.round(tw(s, desde, dur, de, a, ease.inOut)) + sufijo)
  }

  const video6 = {
    id: 6,
    titulo: '¿Cuánto tiempo pierdes agendando?',
    escenas: [
      {
        dur: 3.2,
        fondo: 'negro',
        build(root) {
          const t = lineas(['¿CUÁNTO', 'TIEMPO', 'PIERDES', 'AGENDANDO?'], { a: 0.15, clase: 'mega' })
          const tEl = pos(esquinas(t.el, true), { top: '520px', left: '90px' })
          root.append(tEl, cruces(true))
          return (s) => t.update(s)
        },
      },
      {
        dur: 3.6,
        fondo: 'blanco',
        entrada: 'ola',
        build(root) {
          const k = pos(h('p', { class: 'kicker', text: 'Hagamos la cuenta · ejemplo' }), { top: '420px', left: '90px' })
          const upd = contador(root, { de: 0, a: 20, desde: 0.3, dur: 1.4, top: '500px' })
          const t = lineas(['CHATS AL DÍA', 'PARA AGENDAR.'], { a: 1.2, clase: 'grande' })
          const tEl = pos(t.el, { top: '860px', left: '90px' })
          root.append(k, tEl)
          return (s) => { aparece(k, s, 0, { y: 20 }); upd(s); t.update(s) }
        },
      },
      {
        dur: 3.6,
        fondo: 'negro',
        entrada: 'lado',
        build(root) {
          const k = pos(h('p', { class: 'kicker', text: '3 minutos cada uno' }), { top: '420px', left: '90px' })
          const upd = contador(root, { de: 0, a: 60, desde: 0.3, dur: 1.4, sufijo: ' MIN', top: '500px', tamano: '300px' })
          const t = lineas(['AL DÍA.'], { a: 1.2, clase: 'grande' })
          const tEl = pos(t.el, { top: '800px', left: '90px' })
          root.append(k, tEl)
          return (s) => { aparece(k, s, 0, { y: 20 }); upd(s); t.update(s) }
        },
      },
      {
        dur: 4,
        fondo: 'blanco',
        entrada: 'persiana',
        build(root) {
          const k = pos(h('p', { class: 'kicker', text: '6 días a la semana' }), { top: '420px', left: '90px' })
          const upd = contador(root, { de: 0, a: 6, desde: 0.3, dur: 1.0, sufijo: ' HORAS', top: '500px', tamano: '300px' })
          const t = lineas(['A LA SEMANA,', 'SOLO AGENDANDO.'], { a: 1.1, clase: 'grande' })
          const tEl = pos(t.el, { top: '800px', left: '90px' })
          const nota = pos(h('p', { class: 'texto', text: 'Casi un día entero de trabajo que no cobras.' }), { top: '1080px', left: '90px' })
          root.append(k, tEl, nota)
          sonido(1.35, 'golpe', { g: 0.6 })
          return (s) => { aparece(k, s, 0, { y: 20 }); upd(s); t.update(s); aparece(nota, s, 1.6) }
        },
      },
      {
        dur: 4.4,
        fondo: 'negro',
        entrada: 'ola',
        build(root) {
          const t = lineas(['CON BOOKEAA,', 'TU LINK', 'RESPONDE', 'POR TI.'], { a: 0.15, clase: 'grande' })
          const tEl = pos(t.el, { top: '200px', left: '90px' })
          const tel = pos(telefono(FLUJO + '1-inicio.jpg', 560), { left: '260px', top: '0' })
          root.append(tEl, tel)
          sonido(0.7, 'desliza')
          return (s) => { t.update(s); tel.style.transform = `translateY(${tw(s, 0.7, 0.9, 1920, 850)}px)` }
        },
      },
      {
        dur: 3.4,
        fondo: 'blanco',
        entrada: 'lado',
        build(root) {
          const t = lineas(['USA ESAS', 'HORAS EN LO', 'QUE COBRAS.'], { a: 0.15, clase: 'mega' })
          const tEl = pos(esquinas(t.el), { top: '560px', left: '90px' })
          root.append(tEl, cruces())
          return (s) => t.update(s)
        },
      },
      cta({ kicker: 'Recupera tu tiempo' }),
    ],
  }

  // ---------- VIDEO 7 · Clientes que sí llegan ----------
  const video7 = {
    id: 7,
    titulo: 'Clientes que sí llegan',
    escenas: [
      {
        dur: 3,
        fondo: 'negro',
        build(root) {
          const t = lineas(['¿TE DEJAN', 'PLANTADO?'], { a: 0.15, clase: 'mega' })
          const tEl = pos(esquinas(t.el, true), { top: '720px', left: '90px' })
          root.append(tEl, cruces(true))
          return (s) => t.update(s)
        },
      },
      {
        dur: 4,
        fondo: 'blanco',
        entrada: 'ola',
        build(root) {
          const k = pos(h('p', { class: 'kicker', text: 'Casi siempre es por esto' }), { top: '380px', left: '90px' })
          const filas = [['SE LE OLVIDÓ.'], ['ANOTÓ MAL', 'LA HORA.'], ['NADIE SE LO', 'RECORDÓ.']].map((l, i) => {
            const t = lineas(l, { a: 0.3 + i * 0.5, clase: 'grande', mudo: true })
            sonido(0.3 + i * 0.5, 'pop')
            return { t, el: pos(t.el, { top: `${470 + [0, 190, 470][i]}px`, left: '90px' }) }
          })
          root.append(k, ...filas.map((f) => f.el))
          return (s) => { aparece(k, s, 0, { y: 20 }); filas.forEach((f) => f.t.update(s)) }
        },
      },
      {
        dur: 4.2,
        fondo: 'negro',
        entrada: 'lado',
        build(root) {
          const t = lineas(['LA CITA QUEDA', 'EN SU', 'CALENDARIO.'], { a: 0.15, clase: 'grande' })
          const tEl = pos(t.el, { top: '200px', left: '90px' })
          const tel = pos(telefono(FLUJO + '6-listo.jpg', 560), { left: '260px', top: '0' })
          root.append(tEl, tel)
          sonido(0.6, 'desliza'); sonido(1.5, 'check')
          return (s) => { t.update(s); tel.style.transform = `translateY(${tw(s, 0.6, 0.9, 1920, 760)}px)` }
        },
      },
      {
        dur: 4,
        fondo: 'blanco',
        entrada: 'ola',
        build(root) {
          const t = lineas(['Y SU CELULAR', 'LE AVISA.'], { a: 0.15, clase: 'grande' })
          const tEl = pos(t.el, { top: '300px', left: '90px' })
          const n = pos(notificacion({ titulo: 'Corte y barba · en 1 hora', texto: 'Barbería Norte · Sede Centro', hora: '1:00 p. m.' }), { top: '760px', left: '90px' })
          const pie = pos(h('p', { class: 'texto', text: 'Con el aviso de su propio calendario, sin que tú escribas nada.' }), { top: '1040px', left: '90px' })
          root.append(tEl, n, pie)
          sonido(0.7, 'ding')
          return (s) => { t.update(s); aparece(n, s, 0.7, { y: -60, d: 0.45 }); aparece(pie, s, 1.3) }
        },
      },
      {
        dur: 3.4,
        fondo: 'negro',
        entrada: 'persiana',
        build(root) {
          const t = lineas(['MENOS', 'HUECOS EN', 'TU AGENDA.'], { a: 0.15, clase: 'mega' })
          const tEl = pos(esquinas(t.el, true), { top: '600px', left: '90px' })
          root.append(tEl, cruces(true))
          return (s) => t.update(s)
        },
      },
      cta({ kicker: 'Que lleguen todos' }),
    ],
  }

  // ---------- VIDEO 8 · Reservas mientras duermes ----------
  const video8 = {
    id: 8,
    titulo: 'Reservas mientras duermes',
    escenas: [
      {
        dur: 3.2,
        fondo: 'negro',
        build(root) {
          const t = lineas(['RESERVAS', 'MIENTRAS', 'DUERMES.'], { a: 0.15, clase: 'mega' })
          const tEl = pos(esquinas(t.el, true), { top: '620px', left: '90px' })
          root.append(tEl, cruces(true))
          return (s) => t.update(s)
        },
      },
      {
        dur: 5.2,
        fondo: 'negro',
        entrada: 'lado',
        build(root) {
          const reloj = pos(h('div', { class: 'reloj' }), { top: '200px', left: '80px' })
          const horas = [['23:04', 'Corte y barba', 'Mañana · 10:30 a. m.'], ['1:17', 'Manicure semipermanente', 'Mañana · 12:00 p. m.'], ['6:42', 'Limpieza facial', 'Hoy · 4:00 p. m.']]
          const ns = horas.map(([hr, a, b], i) => pos(notificacion({ titulo: 'Nueva reserva · ' + a, texto: b, hora: hr }), { top: `${640 + i * 210}px`, left: '90px' }))
          const pie = pos(h('p', { class: 'texto', text: 'Tú descansas. Tu agenda sigue abierta.' }), { top: '1320px', left: '90px' })
          root.append(reloj, ...ns, pie)
          ns.forEach((_, i) => sonido(0.4 + i * 1.3, 'ding'))
          return (s) => {
            const i = Math.min(horas.length - 1, Math.max(0, Math.floor((s - 0.4) / 1.3)))
            reloj.textContent = horas[i][0]
            ns.forEach((n, j) => aparece(n, s, 0.4 + j * 1.3, { y: -50, d: 0.4 }))
            aparece(pie, s, 4)
          }
        },
      },
      {
        dur: 4,
        fondo: 'blanco',
        entrada: 'ola',
        build(root) {
          const t = lineas(['TU NEGOCIO', 'ABIERTO 24/7.'], { a: 0.15, clase: 'grande' })
          const tEl = pos(t.el, { top: '200px', left: '90px' })
          const sub = pos(h('p', { class: 'texto', text: 'Sin contestar un solo mensaje.' }), { top: '470px', left: '90px' })
          const tel = pos(telefono(FLUJO + '4-agenda.jpg', 580), { left: '250px', top: '0' })
          root.append(tEl, sub, tel)
          sonido(0.5, 'desliza')
          return (s) => { t.update(s); aparece(sub, s, 0.4); tel.style.transform = `translateY(${tw(s, 0.5, 0.9, 1920, 700)}px)` }
        },
      },
      {
        dur: 4,
        fondo: 'negro',
        entrada: 'persiana',
        build(root) {
          const k = pos(h('p', { class: 'kicker', text: '7:00 a. m.' }), { top: '240px', left: '90px' })
          const t = lineas(['TU DÍA,', 'YA ARMADO.'], { a: 0.15, clase: 'grande' })
          const tEl = pos(t.el, { top: '310px', left: '90px' })
          const d = pos(diaLista([['10:30', 'Corte y barba'], ['12:00', 'Manicure'], ['16:00', 'Limpieza facial']]), { top: '720px', left: '90px' })
          root.append(k, tEl, d)
          sonido(0.8, 'check')
          return (s) => { aparece(k, s, 0, { y: 20 }); t.update(s); aparece(d, s, 0.8, { y: 60 }) }
        },
      },
      cta({ kicker: 'Abre tu agenda' }),
    ],
  }

  window.VIDEOS = { 1: video1, 2: video2, 3: video3, 4: video4, 5: video5, 6: video6, 7: video7, 8: video8 }
})()
