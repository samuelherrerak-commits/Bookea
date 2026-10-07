# Genera FYP-15S.md, CALENDARIO-OCTUBRE.csv y guiones.json (para el Word) desde octubre.py.
#   python3 -I marketing/personal/fyp/generar.py
import csv, json, os, sys
AQUI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, AQUI)
from octubre import V, TIPO, CTA, CTA_MG

RAIZ = os.path.dirname(AQUI)
DIAS = {'Lun': 'lunes', 'Mar': 'martes', 'Mié': 'miércoles', 'Jue': 'jueves', 'Vie': 'viernes'}
HORA = {'08:00': '8:00 a. m.', '13:00': '1:00 p. m.', '20:30': '8:30 p. m.'}
fecha = lambda x: f"{DIAS[x['dia']]} {int(x['fecha'][8:])}"

MARCA = [('2026-10-09', 'Vie', 'Carrusel 2 · 5 señales de que tu agenda necesita ayuda'), ('2026-10-12', 'Lun', 'Carrusel 3 · Cómo funciona en 3 pasos'),
         ('2026-10-14', 'Mié', 'Reel 2 · Así reserva tu cliente'), ('2026-10-16', 'Vie', 'Carrusel 4 · Conectado a Google Calendar'),
         ('2026-10-19', 'Lun', 'Carrusel 5 · 8 estilos para tu página'), ('2026-10-21', 'Mié', 'Reel 3 · Tu marca, tu estilo'),
         ('2026-10-23', 'Vie', 'Carrusel 6 · Hecho para tu tipo de negocio'), ('2026-10-27', 'Mar', 'Reel 4 · Para quién es y cuánto cuesta'),
         ('2026-10-29', 'Jue', 'Carrusel 7 · Precio y preguntas')]

# ── CSV ───────────────────────────────────────────
filas = [[x['fecha'], x['dia'], x['hora'], 'TikTok + Reels', x['id'], x['titulo'], TIPO[x['tipo']][0], TIPO[x['tipo']][1], x['archivo'], x['caption'], x['hashtags']] for x in V]
filas += [[f, d, '19:00', 'Instagram (marca)', 'CAMPAÑA', t, 'Campaña de lanzamiento', 'Ya está hecho (public/campana)', 'descargar de /campana/', 'Texto en la página de la campaña', ''] for f, d, t in MARCA]
filas.sort(key=lambda r: (r[0], r[2]))
with open(os.path.join(RAIZ, 'CALENDARIO-OCTUBRE.csv'), 'w', newline='', encoding='utf-8-sig') as fh:
    w = csv.writer(fh)
    w.writerow(['fecha', 'día', 'hora (Caracas)', 'plataforma', 'archivo / id', 'título', 'formato', 'quién lo hace', 'archivo a subir a Drive', 'caption', 'hashtags'])
    w.writerows(filas)

# ── JSON para el Word ─────────────────────────────
json.dump([x for x in V if x['tipo'] != 'MG'], open(os.path.join(AQUI, 'guiones.json'), 'w'), ensure_ascii=False, indent=1)

# ── Markdown ──────────────────────────────────────
L = []
a = L.append
a('# Estrategia FYP · 3 videos de 15 s por día hábil')
a('')
a('Esto va **aparte** de la campaña de la marca y de los vlogs. La meta es la **viralidad**: llenar el "Para ti" de TikTok y Reels con videos cortos que conecten con quienes trabajan con citas. **Cada video funciona solo**: ninguno dice "parte 1", ni manda a ver otro, ni necesita contexto.')
a('')
a('## Cómo es cada video (15 s)')
a('')
a('1. **Gancho visual (0–1 s):** algo se mueve, choca o se rompe en el primer cuadro. Nunca arranca con un logo.')
a('2. **Gancho de texto (0–3 s):** una frase grande que se entiende sin sonido: "¿Te ha pasado que…?", "¿Sabías que estás perdiendo plata por…?", "Si hubiera sabido esto antes…", "3 cosas que tienes que saber si…".')
a('3. **Gancho auditivo:** la firma sonora de bookeaa (golpe + "ding"), la misma en todos, con la canción de tendencia de la semana debajo.')
a('4. **Conexión (3–11 s):** el problema contado desde el lado del negocio. Que diga "eso me pasa a mí".')
a('5. **Solución + llamado a la acción (11–15 s):** bookeaa como **lo que usan los negocios que saben organizar su tiempo**, y una acción concreta: link en el perfil, comentar "AGENDA", compartir o seguir.')
a('6. **En loop:** el último cuadro empalma con el primero, para que se repita.')
a('')
a('**Llamados a la acción (rotan para no cansar):**')
for k, t in CTA.items():
    a(f'- **{k}:** "{t}"')
a('')
a('> El posicionamiento es "los negocios organizados agendan con un link". Evitamos decir "miles de negocios ya usan bookeaa" hasta que sea verdad.')
a('')
a('## Los 3 formatos de cada día')
a('')
a('| Formato | Qué es | Quién | Hora (Caracas) |')
a('|---|---|---|---|')
a('| **MG** | Motion graphics + canción, **sin voz** | Yo lo armo | **8:00 a. m.** |')
a('| **VOZ** | Motion graphics + **tu voz en off** | Grabas solo el audio | **1:00 p. m.** |')
a('| **CAM** | **Tú a cámara** + motion graphics | Grabas el video | **8:30 p. m.** |')
a('')
a('Los tres de un día comparten tema, pero cada uno se sostiene solo. Apareces a cámara al menos una vez al día. La campaña de la marca sigue a las 7 p. m.')
a('')
a('**Horarios:** los estudios de 2026 se contradicen. Buffer ve el pico de TikTok de 6 a 11 p. m.; Sprout Social, de martes a jueves entre 2 y 6 p. m. Para Reels, unos dicen mañana y otros noche. Por eso cubrimos los tres momentos en que el dueño del negocio mira el teléfono: antes de abrir, en el almuerzo y al cerrar. A las 2 semanas ajustamos con TikTok Studio y el panel de Instagram.')
a('')
a('**Música:** las cuentas de empresa en TikTok solo pueden usar la **Biblioteca de Música Comercial**. Cada lunes eliges ahí 2 canciones de *Trending* (una con energía y una suave). La firma sonora de bookeaa va siempre al inicio.')
a('')
a('**Nombres de archivo:** `FYP-S01-LUN-VOZ.m4a` (audio) y `FYP-S01-LUN-CAM.mp4` (video). Los MG los hago yo.')
a('')
a('---')
a('')
a('# CALENDARIO DE OCTUBRE (8–30)')
a('')
a('La tabla completa con captions y hashtags está en `CALENDARIO-OCTUBRE.csv`.')
a('')
a('| Fecha | 8:00 a. m. · MG | 1:00 p. m. · VOZ | 7:00 p. m. · Marca | 8:30 p. m. · CAM |')
a('|---|---|---|---|---|')
for f in sorted(set(r[0] for r in filas)):
    rs = [r for r in filas if r[0] == f]
    g = lambda h: next((r[5] for r in rs if r[2] == h), '—')
    a(f"| **{rs[0][1]} {int(f[8:])}** | {g('08:00')} | {g('13:00')} | {g('19:00')} | {g('20:30')} |")
a('')
a('# PLAN DE GRABACIÓN')
a('')
a(f"Grabas **{sum(1 for x in V if x['tipo']=='VOZ')} audios** y **{sum(1 for x in V if x['tipo']=='CAM')} videos a cámara**. Los guiones para leer están en `Guiones-octubre-bookeaa.docx`.")
a('')
a('| Sesión | Cuándo | Qué grabas |')
a('|---|---|---|')
a('| **1 · urgente** | Hoy | Semana 0 (jueves 8 y viernes 9): 2 audios + 2 videos |')
a('| **2** | Sábado 10 o domingo 11 | Semanas 1 y 2 (12–23 oct): 10 audios + 10 videos |')
a('| **3** | Fin de semana del 24 | Semana 3 (26–30 oct): 5 audios + 5 videos |')
a('')
a('---')
a('')
a('# GUIONES')
sem_nombre = {'S00': 'SEMANA 0 · 8–9 de octubre', 'S01': 'SEMANA 1 · 12–16 de octubre', 'S02': 'SEMANA 2 · 19–23 de octubre', 'S03': 'SEMANA 3 · 26–30 de octubre'}
ultima_sem = ultimo_dia = None
for x in V:
    s = x['id'].split('-')[1]
    if s != ultima_sem:
        a(''); a(f'## {sem_nombre[s]}'); ultima_sem = s
    if x['fecha'] != ultimo_dia:
        a(''); a(f"### {fecha(x).capitalize()} de octubre"); ultimo_dia = x['fecha']
    a('')
    a(f"#### {x['id']} · {x['titulo']}  _({TIPO[x['tipo']][0]}, {HORA[x['hora']]})_")
    a(f"- **Gancho de texto:** {x['gancho']}")
    a(f"- **Gancho visual:** {x['visual']}")
    if x['tipo'] == 'MG':
        a(f"- **Secuencia en pantalla:** " + ' → '.join(x['cuerpo']))
        a(f"- **Cierre en pantalla:** {x['cta_texto']}")
    else:
        a(f"- **{'Tu voz' if x['tipo']=='VOZ' else 'Dices a cámara'}:** \"{x['cuerpo']}\"")
        a(f"- **Llamado a la acción** ({x['cta']}, va incluido en lo que dices o como texto al final).")
    a(f"- **Caption:** {x['caption']}")
a('')
a('---')
a('')
a('# NOVIEMBRE · banco de temas')
a('')
a('| Semana | "3 cosas que tienes que saber si…" | Otras ideas |')
a('|---|---|---|')
a('| 4 | …eres odontólogo | "¿Te ha pasado que tu recepcionista no da abasto?" · "Si hubiera sabido esto antes… no daría mi número personal" |')
a('| 5 | …haces pestañas o cejas | "¿Te ha pasado que no sabes cuánto ganaste en la semana?" · demo de Google Calendar |')
a('| 6 | …eres entrenador personal | "…perdiendo plata por horas muertas" · "Si hubiera sabido… pondría un QR" |')
a('| 7 | …eres tatuador | "¿Te ha pasado que te piden cita por 4 apps distintas?" · reto: "cuenta tus mensajes de hoy" |')
a('| 8 | …tienes una peluquería | cierre de los 2 meses: números reales y lo que aprendí |')
open(os.path.join(RAIZ, 'FYP-15S.md'), 'w').write('\n'.join(L) + '\n')
print('ok', len(V), 'videos')
