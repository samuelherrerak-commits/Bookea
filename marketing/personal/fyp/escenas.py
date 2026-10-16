# Escenas de cada video FYP (MG y VOZ). Todos los tiempos `en` son relativos al inicio de la escena.
#  - MG: cada escena lleva `dur` (s); la última no lleva `dur` y se estira hasta los 15 s.
#  - VOZ: cada escena lleva `ancla` (las primeras palabras de la frase donde entra); la voz manda.
# Campos de escena: fondo (negro|blanco), entrada (corte|ola|lado), kicker, titulo[líneas], estilo
# (mega|grande|medio|reloj), tamano, texto, link, pastilla, telefonos[{img,ancho,x,y,rot,en}],
# burbujas[{texto,en,propia}], evento{titulo,cuando,quien,en,x,y}, agenda[{hora,texto,estado}], contador{...}.
F = 'flujo/'
PILL = 'bookeaa · LINK EN EL PERFIL'
LINK_BAJO = [
    {'img': F + '1-inicio.jpg', 'ancho': 420, 'x': 330, 'y': 880, 'en': 0.9},
]

ESCENAS = {
    # ── Jueves 15 · "Si hubiera sabido esto antes…" ──────────────────────────
    'FYP-S01-JUE-MG': [
        {'dur': 3.4, 'fondo': 'negro', 'entrada': 'corte', 'kicker': 'Si hubiera sabido esto antes…', 'titulo': ['NO TENDRÍA', 'MI AGENDA EN', 'UNA LIBRETA.'], 'estilo': 'grande'},
        {'dur': 3.6, 'fondo': 'blanco', 'entrada': 'ola', 'kicker': 'La libreta…', 'titulo': ['SE MOJA.', 'SE PIERDE.'], 'estilo': 'grande', 'agendaY': 760,
         'agenda': [{'hora': '10:00', 'texto': 'Ana · uñas', 'estado': 'ok'}, {'hora': '12:30', 'texto': 'Carlos · corte', 'estado': 'tachado'},
                    {'hora': '3:00', 'texto': '¿¿¿ ??? ', 'estado': 'tachado'}, {'hora': '5:30', 'texto': '(se borró)', 'estado': 'vacio'}]},
        {'dur': 3.4, 'fondo': 'negro', 'entrada': 'lado', 'titulo': ['TU CLIENTE', 'NO LA PUEDE', 'VER.'], 'estilo': 'grande',
         'burbujas': [{'texto': '¿Tienes hora hoy?', 'en': 0.9}, {'texto': '¿Hola?? 👀', 'en': 1.6}]},
        {'fondo': 'blanco', 'entrada': 'ola', 'kicker': 'Tu agenda, en un link', 'titulo': ['LOS ORGANIZADOS', 'AGENDAN CON', 'UN LINK.'], 'estilo': 'grande', 'pastilla': PILL, 'telefonos': LINK_BAJO},
    ],
    'FYP-S01-JUE-VOZ': [
        {'ancla': 'Si tu agenda', 'fondo': 'negro', 'entrada': 'corte', 'kicker': '¿Tu agenda está en un papel?', 'titulo': ['¿TU AGENDA', 'EN UNA', 'LIBRETA?'], 'estilo': 'grande', 'agendaY': 780,
         'agenda': [{'hora': '10:00', 'texto': 'Ana · uñas', 'estado': 'ok'}, {'hora': '12:30', 'texto': 'Carlos · corte', 'estado': 'tachado'}, {'hora': '3:00', 'texto': '(se borró)', 'estado': 'vacio'}]},
        {'ancla': 'Te tiene', 'fondo': 'blanco', 'entrada': 'lado', 'titulo': ['TU CLIENTE', 'NO LA VE.'], 'estilo': 'grande',
         'burbujas': [{'texto': '¿Tienes hora hoy?', 'en': 0.5}, {'texto': '¿Hola?? 👀', 'en': 1.4}]},
        {'ancla': 'Los negocios', 'fondo': 'negro', 'entrada': 'ola', 'titulo': ['LOS NEGOCIOS', 'ORGANIZADOS', 'USAN UN LINK.'], 'estilo': 'grande',
         'telefonos': [{'img': F + '1-inicio.jpg', 'ancho': 380, 'x': 350, 'y': 700, 'en': 0.9}]},
        {'ancla': 'Eso es', 'fondo': 'blanco', 'entrada': 'ola', 'titulo': ['ESO ES', 'bookeaa.'], 'estilo': 'mega', 'pastilla': PILL},
    ],
    # ── Viernes 16 · "bookeaa en 15 segundos" ─────────────────────────────────
    'FYP-S01-VIE-MG': [
        {'dur': 3.0, 'fondo': 'negro', 'entrada': 'corte', 'kicker': 'Así reserva tu cliente', 'titulo': ['ASÍ RESERVA', 'UN CLIENTE EN', '10 SEGUNDOS.'], 'estilo': 'grande'},
        {'dur': 2.6, 'fondo': 'blanco', 'entrada': 'ola', 'kicker': '01 · Entra a tu link', 'titulo': ['ENTRA A', 'TU LINK.'], 'estilo': 'grande', 'link': 'barberia-norte',
         'telefonos': [{'img': F + '1-inicio.jpg', 'ancho': 560, 'x': 260, 'y': 940, 'en': 1.4}]},
        {'dur': 2.6, 'fondo': 'negro', 'entrada': 'lado', 'kicker': '02 · Elige', 'titulo': ['SERVICIO', 'Y HORA.'], 'estilo': 'grande',
         'telefonos': [{'img': F + '2-servicios.jpg', 'ancho': 480, 'x': 40, 'y': 820, 'rot': -5, 'en': 0.6}, {'img': F + '4-agenda.jpg', 'ancho': 480, 'x': 540, 'y': 880, 'rot': 5, 'en': 1.0}]},
        {'dur': 2.4, 'fondo': 'blanco', 'entrada': 'ola', 'kicker': '03 · Listo', 'titulo': ['¡LISTO!'], 'estilo': 'mega',
         'telefonos': [{'img': F + '6-listo.jpg', 'ancho': 540, 'x': 270, 'y': 620, 'en': 0.6}]},
        {'fondo': 'negro', 'entrada': 'ola', 'kicker': 'Los negocios organizados', 'titulo': ['10 SEGUNDOS.', 'CERO MENSAJES.'], 'estilo': 'grande', 'pastilla': PILL,
         'evento': {'titulo': 'Corte y barba', 'cuando': 'Mié 8 oct · 2:00 – 2:45 p. m.', 'quien': 'Carlos M.', 'en': 1.0, 'x': 150, 'y': 1130}},
    ],
    'FYP-S01-VIE-VOZ': [
        {'ancla': 'Cuántos mensajes', 'fondo': 'negro', 'entrada': 'corte', 'titulo': ['¿CUÁNTOS', 'MENSAJES PARA', 'UNA CITA?'], 'estilo': 'grande',
         'burbujas': [{'texto': '¿Tienes hora mañana?', 'en': 0.8}, {'texto': 'Déjame revisar…', 'en': 1.5, 'propia': True}, {'texto': '¿Y a las 4?', 'en': 2.2}]},
        {'ancla': 'Con bookeaa', 'fondo': 'blanco', 'entrada': 'ola', 'kicker': 'Con bookeaa', 'titulo': ['MENSAJES:'], 'estilo': 'grande',
         'contador': {'de': 10, 'a': 0, 'etiqueta': 'para agendar una cita', 'y': 560, 'en': 0.3, 'dur': 0.65}},
        {'ancla': 'tu cliente elige', 'fondo': 'negro', 'entrada': 'lado', 'titulo': ['ELIGE', 'SERVICIO', 'Y HORA.'], 'estilo': 'grande',
         'telefonos': [{'img': F + '2-servicios.jpg', 'ancho': 370, 'x': 90, 'y': 700, 'rot': -4, 'en': 0.5}, {'img': F + '4-agenda.jpg', 'ancho': 370, 'x': 560, 'y': 740, 'rot': 4, 'en': 0.9}]},
        {'ancla': 'y la cita', 'fondo': 'blanco', 'entrada': 'ola', 'titulo': ['LA CITA CAE', 'SOLA EN TU', 'CALENDARIO.'], 'estilo': 'grande',
         'evento': {'titulo': 'Corte y barba', 'cuando': 'Mié 8 oct · 2:00 – 2:45 p. m.', 'quien': 'Carlos M.', 'en': 0.9, 'x': 150, 'y': 800}},
        {'ancla': 'Así trabajan', 'fondo': 'negro', 'entrada': 'ola', 'titulo': ['ASÍ TRABAJAN', 'LOS NEGOCIOS', 'ORGANIZADOS.'], 'estilo': 'grande', 'pastilla': PILL},
    ],

    # ── Sábado 17 · "Tu descanso no es para responder" ──────────────────────────
    'FYP-S01-SAB-MG': [
        {'dur': 3.2, 'fondo': 'negro', 'entrada': 'corte', 'kicker': 'Sábado · 9:42 p. m.', 'titulo': ['TU DESCANSO', 'NO ES PARA', 'RESPONDER', 'MENSAJES.'], 'estilo': 'grande'},
        {'dur': 3.6, 'fondo': 'blanco', 'entrada': 'ola', 'kicker': 'Y llega uno…', 'titulo': ['"¿TIENES HORA', 'EL LUNES?"'], 'estilo': 'grande',
         'burbujas': [{'texto': '¿Tienes hora el lunes?', 'en': 0.8}, {'texto': '¿Hola?? 👀', 'en': 1.8}], 'visto': {'texto': 'Sábado 9:42 p. m.', 'en': 2.6}},
        {'dur': 3.2, 'fondo': 'negro', 'entrada': 'lado', 'kicker': 'Con un link', 'titulo': ['TU CLIENTE', 'RESERVA SOLO.'], 'estilo': 'grande',
         'telefonos': [{'img': F + '4-agenda.jpg', 'ancho': 520, 'x': 280, 'y': 780, 'en': 0.7}]},
        {'fondo': 'blanco', 'entrada': 'ola', 'kicker': 'Los negocios organizados', 'titulo': ['TÚ', 'DESCANSAS.'], 'estilo': 'mega', 'pastilla': PILL},
    ],
    # ── Domingo 18 · "Tu lunes ya está lleno" ───────────────────────────────────
    'FYP-S01-DOM-MG': [
        {'dur': 3.0, 'fondo': 'negro', 'entrada': 'corte', 'kicker': 'Domingo en la noche', 'titulo': ['EL LUNES', 'EMPIEZA HOY.'], 'estilo': 'grande'},
        {'dur': 4.2, 'fondo': 'blanco', 'entrada': 'ola', 'kicker': 'Los organizados…', 'titulo': ['SU LUNES YA', 'ESTÁ LLENO.'], 'estilo': 'grande', 'agendaY': 700,
         'agenda': [{'hora': '9:00', 'texto': 'Ana · uñas', 'estado': 'ok', 'en': 0.8}, {'hora': '11:30', 'texto': 'Carlos · corte y barba', 'estado': 'ok', 'en': 1.3},
                    {'hora': '2:00', 'texto': 'María · spa', 'estado': 'ok', 'en': 1.8}, {'hora': '4:30', 'texto': 'José · consulta', 'estado': 'ok', 'en': 2.3}]},
        {'dur': 3.4, 'fondo': 'negro', 'entrada': 'lado', 'kicker': 'Sin escribir', 'titulo': ['NI UN', 'MENSAJE.'], 'estilo': 'grande',
         'evento': {'titulo': 'Corte y barba', 'cuando': 'Lun 19 oct · 11:30 a. m.', 'quien': 'Carlos M. · reservó solo', 'en': 0.9, 'x': 150, 'y': 800}},
        {'fondo': 'blanco', 'entrada': 'ola', 'kicker': 'Y el tuyo', 'titulo': ['¿YA ESTÁ', 'LLENO?'], 'estilo': 'mega', 'pastilla': 'COMENTA "AGENDA" 👇'},
    ],
    # ── Lunes 19 · "Dos a la misma hora" ────────────────────────────────────────
    'FYP-S02-LUN-MG': [
        {'dur': 3.0, 'fondo': 'negro', 'entrada': 'corte', 'kicker': '¿Te ha pasado?', 'titulo': ['LLEGAN DOS', 'CLIENTES A LA', 'MISMA HORA.'], 'estilo': 'grande'},
        {'dur': 3.8, 'fondo': 'blanco', 'entrada': 'ola', 'kicker': 'Lunes · 3:00 p. m.', 'titulo': ['3:00 P. M.', '3:00 P. M.', '😬'], 'estilo': 'grande', 'agendaY': 880,
         'agenda': [{'hora': '3:00', 'texto': 'Ana · uñas', 'estado': 'ok', 'en': 0.9}, {'hora': '3:00', 'texto': 'Luis · corte', 'estado': 'tachado', 'en': 1.6}]},
        {'dur': 3.2, 'fondo': 'negro', 'entrada': 'lado', 'kicker': 'En una libreta, pasa', 'titulo': ['DOS CITAS.', 'UNA SILLA.'], 'estilo': 'grande',
         'burbujas': [{'texto': 'Oye, ¿y mi hora?', 'en': 0.8}, {'texto': 'Yo llegué primero 😒', 'en': 1.6}]},
        {'fondo': 'blanco', 'entrada': 'ola', 'kicker': 'En un solo calendario…', 'titulo': ['ESO NO', 'PASA.'], 'estilo': 'mega', 'pastilla': 'MÁNDASELO A QUIEN AGENDA POR WHATSAPP',
         'evento': {'titulo': '3:00 p. m. · Ana', 'cuando': 'Una hora, una sola cita', 'quien': 'Hora ocupada · nadie más puede reservarla', 'en': 1.0, 'x': 150, 'y': 860}},
    ],
    # ── Martes 20 · "No mostrar tus precios" ────────────────────────────────────
    'FYP-S02-MAR-MG': [
        {'dur': 3.0, 'fondo': 'negro', 'entrada': 'corte', 'kicker': 'Estás perdiendo plata', 'titulo': ['¿CLIENTES', 'QUE SE VAN', 'SIN PREGUNTAR', 'EL PRECIO?'], 'estilo': 'grande'},
        {'dur': 3.6, 'fondo': 'blanco', 'entrada': 'ola', 'kicker': 'El chat de siempre', 'titulo': ['"¿PRECIO?"'], 'estilo': 'grande',
         'contador': {'de': 0, 'a': 20, 'etiqueta': 'veces al día', 'y': 520, 'en': 0.5, 'dur': 1.8}},
        {'dur': 3.2, 'fondo': 'negro', 'entrada': 'lado', 'kicker': 'El que no pregunta', 'titulo': ['SE VA.'], 'estilo': 'mega',
         'burbujas': [{'texto': '¿Precio?', 'en': 0.6}, {'texto': 'Te escribo luego…', 'en': 1.4}], 'visto': {'texto': 'Visto 4:12 p. m.', 'en': 2.2}},
        {'fondo': 'blanco', 'entrada': 'ola', 'kicker': 'Precios a la vista', 'titulo': ['PRECIOS', 'A LA VISTA =', 'RESERVAS.'], 'estilo': 'grande', 'pastilla': PILL,
         'telefonos': [{'img': F + '2-servicios.jpg', 'ancho': 420, 'x': 330, 'y': 880, 'en': 0.9}]},
    ],
    # ── Miércoles 21 · "3 cosas si eres barbero" ────────────────────────────────
    'FYP-S02-MIE-MG': [
        {'dur': 3.0, 'fondo': 'negro', 'entrada': 'corte', 'kicker': '✂️ Si eres barbero', 'titulo': ['3 COSAS QUE', 'TIENES QUE', 'SABER.'], 'estilo': 'grande'},
        {'dur': 2.8, 'fondo': 'blanco', 'entrada': 'ola', 'kicker': 'Número 1', 'titulo': ['EL CLIENTE FIEL', 'SE CUIDA CON', 'HORARIO FIJO.'], 'estilo': 'grande', 'texto': 'Su hora de siempre, reservada.', 'textoEn': 1.2},
        {'dur': 3.0, 'fondo': 'negro', 'entrada': 'lado', 'kicker': 'Número 2', 'titulo': ['EL DE LAS', '9 P. M. NO', 'ESPERA.'], 'estilo': 'grande',
         'burbujas': [{'texto': '¿Tienes hora mañana?', 'en': 0.9}], 'visto': {'texto': 'Visto 9:15 a. m. · ya reservó en otro lado', 'en': 1.9}},
        {'dur': 2.8, 'fondo': 'blanco', 'entrada': 'ola', 'kicker': 'Número 3', 'titulo': ['TU LINK VALE', 'MÁS QUE', 'TU NÚMERO.'], 'estilo': 'grande', 'link': 'tu-barberia'},
        {'fondo': 'negro', 'entrada': 'ola', 'kicker': 'Organiza tu barbería', 'titulo': ['UN LINK.', 'TODAS TUS', 'CITAS.'], 'estilo': 'grande', 'pastilla': 'MÁNDASELO A QUIEN AGENDA POR WHATSAPP'},
    ],
    # ── Jueves 22 · "Una hora que no cobras" ────────────────────────────────────
    'FYP-S02-JUE-MG': [
        {'dur': 3.2, 'fondo': 'negro', 'entrada': 'corte', 'kicker': 'Si hubiera sabido esto antes…', 'titulo': ['HABRÍA DEJADO', 'DE CONTESTAR', '"TENGO HORA', 'A LAS 4".'], 'estilo': 'grande'},
        {'dur': 3.0, 'fondo': 'blanco', 'entrada': 'ola', 'kicker': 'Todos los días', 'titulo': ['LO MISMO'], 'estilo': 'grande',
         'contador': {'de': 0, 'a': 20, 'etiqueta': 'veces al día', 'y': 520, 'en': 0.4, 'dur': 1.6}},
        {'dur': 2.6, 'fondo': 'negro', 'entrada': 'lado', 'titulo': ['× 3', 'MINUTOS.'], 'estilo': 'mega'},
        {'dur': 2.8, 'fondo': 'blanco', 'entrada': 'ola', 'kicker': 'Y eso es…', 'titulo': ['1 HORA', 'QUE NO COBRAS.'], 'estilo': 'grande'},
        {'fondo': 'negro', 'entrada': 'ola', 'kicker': 'Que tu cliente las vea solo', 'titulo': ['TUS HORAS,', 'A LA VISTA.'], 'estilo': 'grande', 'pastilla': PILL,
         'telefonos': [{'img': F + '4-agenda.jpg', 'ancho': 400, 'x': 340, 'y': 880, 'en': 0.9}]},
    ],

    # ── Viernes 23 · "8 estilos" ───────────────────────────────────────────────
    'FYP-S02-VIE-MG': [
        {'dur': 2.6, 'fondo': 'negro', 'entrada': 'corte', 'kicker': 'Tu página de reservas', 'titulo': ['¿CUÁL VA', 'CON TU', 'NEGOCIO?'], 'estilo': 'grande'},
        {'dur': 1.0, 'fondo': 'blanco', 'entrada': 'corte', 'kicker': 'Minimal', 'titulo': ['1'], 'estilo': 'mega', 'telefonos': [{'img': 'plantillas/minimal.jpg', 'ancho': 500, 'x': 500, 'y': 660, 'en': 0}]},
        {'dur': 1.0, 'fondo': 'negro', 'entrada': 'corte', 'kicker': 'Moderno', 'titulo': ['2'], 'estilo': 'mega', 'telefonos': [{'img': 'plantillas/moderno.jpg', 'ancho': 500, 'x': 500, 'y': 660, 'en': 0}]},
        {'dur': 1.0, 'fondo': 'blanco', 'entrada': 'corte', 'kicker': 'Elegante', 'titulo': ['3'], 'estilo': 'mega', 'telefonos': [{'img': 'plantillas/elegante.jpg', 'ancho': 500, 'x': 500, 'y': 660, 'en': 0}]},
        {'dur': 1.0, 'fondo': 'negro', 'entrada': 'corte', 'kicker': 'Audaz', 'titulo': ['4'], 'estilo': 'mega', 'telefonos': [{'img': 'plantillas/audaz.jpg', 'ancho': 500, 'x': 500, 'y': 660, 'en': 0}]},
        {'dur': 1.0, 'fondo': 'blanco', 'entrada': 'corte', 'kicker': 'Retro', 'titulo': ['5'], 'estilo': 'mega', 'telefonos': [{'img': 'plantillas/retro.jpg', 'ancho': 500, 'x': 500, 'y': 660, 'en': 0}]},
        {'dur': 1.0, 'fondo': 'negro', 'entrada': 'corte', 'kicker': 'Clásico', 'titulo': ['6'], 'estilo': 'mega', 'telefonos': [{'img': 'plantillas/clasico.jpg', 'ancho': 500, 'x': 500, 'y': 660, 'en': 0}]},
        {'dur': 1.0, 'fondo': 'blanco', 'entrada': 'corte', 'kicker': 'Editorial', 'titulo': ['7'], 'estilo': 'mega', 'telefonos': [{'img': 'plantillas/editorial.jpg', 'ancho': 500, 'x': 500, 'y': 660, 'en': 0}]},
        {'dur': 1.0, 'fondo': 'negro', 'entrada': 'corte', 'kicker': 'Amable', 'titulo': ['8'], 'estilo': 'mega', 'telefonos': [{'img': 'plantillas/amable.jpg', 'ancho': 500, 'x': 500, 'y': 660, 'en': 0}]},
        {'fondo': 'blanco', 'entrada': 'ola', 'kicker': 'Ocho estilos', 'titulo': ['TU PÁGINA,', 'TU ESTILO.'], 'estilo': 'grande', 'pastilla': 'COMENTA "AGENDA" 👇'},
    ],
}
