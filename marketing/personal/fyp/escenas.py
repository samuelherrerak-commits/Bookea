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
}
