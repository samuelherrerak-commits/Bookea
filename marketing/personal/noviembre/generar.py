# Genera todo lo de noviembre desde dias.py:
#   python3 marketing/personal/noviembre/generar.py
#
#   ../CALENDARIO-NOVIEMBRE.csv                 calendario (76 piezas)
#   ../guiones/ELEVENLABS-NOV-A-1..4.txt        voz A (cálida): guiones con etiquetas, listos para pegar en ElevenLabs
#   ../guiones/ELEVENLABS-NOV-B-1..4.txt        voz B (clara): ídem
#   ../guiones/ELEVENLABS-NOV-LEEME.md          qué bloque es de qué día y cómo cortarlo
#   ../fyp/videos-noviembre.json                MG y VOZ con sus escenas (lo lee scripts/fyp.mjs)
#   ../../carruseles/carruseles-noviembre.js    carruseles 25–43 (los dibuja marketing/carruseles/index.html)
import csv
import json
import os
import re
import sys

AQUI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, AQUI)
from dias import DIAS, SEMANAS, FORMATOS  # noqa: E402

PERSONAL = os.path.dirname(AQUI)
CARRUSELES = os.path.abspath(os.path.join(PERSONAL, '..', 'carruseles'))
DIA_ES = {'LUN': 'Lun', 'MAR': 'Mar', 'MIE': 'Mié', 'JUE': 'Jue', 'VIE': 'Vie'}
PRIMER_CARRUSEL = 25
BLOQUES_POR_ARCHIVO = [5, 5, 5, 4]  # 19 días → 4 archivos por voz (≈1.700 caracteres cada uno)


def sin_etiquetas(t):
    return re.sub(r'\s+', ' ', re.sub(r'\[[^\]]*\]', '', t)).strip()


def para_alinear(t):
    return sin_etiquetas(t).replace('bukéa', 'bookeaa')


def eleven(segmentos):
    """Texto con etiquetas para ElevenLabs: cada tramo empieza con su etiqueta."""
    return ' '.join(f"[{s['tag']}] {s['texto']}" for s in segmentos)


def voz_texto(segmentos):
    return para_alinear(' '.join(s['texto'] for s in segmentos))


def vid(n, d):
    return f"FYP-N{n:02d}-{d['dia']}"


# ── Escenas ────────────────────────────────────────────────────────────────────
def escenas_mg(d, kw):
    beats = d['mg']['beats']
    dur = 3.4 if len(beats) <= 3 else 2.9
    out = []
    for i, b in enumerate(beats):
        e = {'dur': dur, 'fondo': 'negro' if i % 2 == 0 else 'blanco', 'titulo': b, 'estilo': 'grande'}
        if i == 0:
            e['entrada'] = 'corte'
            e['kicker'] = d['mg']['kicker']
        out.append(e)
    out.append({'fondo': 'negro' if len(beats) % 2 == 0 else 'blanco', 'kicker': 'Tu página de reservas', 'titulo': ['COMENTA', kw + '.'], 'estilo': 'mega', 'pastilla': 'TE LA ARMO GRATIS 👇'})
    return out


def ancla(s):
    palabras = para_alinear(s['texto']).split()
    return ' '.join(palabras[:3])


def escenas_voz(segmentos, kw):
    out = []
    for s in segmentos:
        if not s['titulo']:
            continue
        i = len(out)
        e = {'ancla': ancla(s), 'fondo': 'negro' if i % 2 == 0 else 'blanco', 'titulo': s['titulo'], 'estilo': 'grande'}
        if i == 0:
            e['entrada'] = 'corte'
            if s['kicker']:
                e['kicker'] = s['kicker']
        elif s['kicker']:
            e['kicker'] = s['kicker']
        e.update(s['extra'])
        out.append(e)
    ult = out[-1]
    ult['estilo'] = 'mega'
    ult['pastilla'] = 'TE LA ARMO GRATIS 👇' if ult['titulo'][0] == 'COMENTA' else 'TE LA DEJO LISTA, GRATIS'
    return out


# ── Carruseles ─────────────────────────────────────────────────────────────────
def carrusel(n, d, kw):
    c = d['car']
    k, titulo, texto = c['portada']
    laminas = [{'tipo': 'portada', 'fondo': 'negro', 'kicker': k, 'titulo': titulo, 'texto': texto}]
    for i, (t, tx) in enumerate(c['senales']):
        fondo = 'blanco' if i % 2 == 0 else 'negro'
        m = re.match(r'^(\d\d) · ', t[0])
        num = m.group(1) if m else f'{i + 1:02d}'
        t = [t[0][m.end():]] + t[1:] if m else t
        laminas.append({'tipo': 'senal', 'fondo': fondo, 'num': num, 'titulo': t, 'texto': tx})
    lt, items = c['lista']
    laminas.append({'tipo': 'lista', 'fondo': 'blanco' if len(c['senales']) % 2 == 0 else 'negro', 'titulo': lt, 'marca': '✓', 'items': items})
    laminas.append({'tipo': 'cta', 'fondo': 'negro', 'titulo': ['COMENTA', kw + '.'], 'texto': 'Y te armo tu página de bookeaa <b>gratis</b>. Después, <b>$10 al mes</b>.', 'boton': f'Comenta {kw} 👇'})
    return {'id': n, 'nombre': c['titulo'] + f" ({DIA_ES[d['dia']].lower()} {d['fecha'][8:]} nov)", 'laminas': laminas}


def main():
    nicho_kw = {s: (SEMANAS[s][0], SEMANAS[s][1], SEMANAS[s][2]) for s in SEMANAS}
    videos, filas, carr = [], [], []
    for n, d in enumerate(DIAS, 1):
        nicho, kw, tags = nicho_kw[d['sem']]
        base = vid(n, d)
        formato = FORMATOS[d['dia']]
        cta = f'Comenta {kw} 👇 y te armo tu página de reservas gratis.'
        cap_mg = f"{d['gancho']} 📅 {cta}"
        cap_a = f"{sin_etiquetas(d['A'][0]['texto'])} {cta}"
        cap_b = f"{sin_etiquetas(d['B'][0]['texto'])} Primer mes gratis, después $10 al mes. Escríbeme {kw} 📅"
        cada = [
            ('MG', base + '-MG', '08:00', d['tema'], cap_mg, None),
            ('VOZ', base + '-VOZ', '13:00', d['tema'] + ' (voz A)', cap_a, d['A']),
            ('VOZ2', base + '-VOZ2', '18:00', d['tema'] + ' (voz B)', cap_b, d['B']),
        ]
        for tipo, vid_id, hora, titulo, caption, segs in cada:
            v = {'id': vid_id, 'tipo': 'VOZ' if tipo != 'MG' else 'MG', 'fecha': d['fecha'], 'dia': DIA_ES[d['dia']], 'hora': hora, 'titulo': titulo, 'gancho': d['gancho'],
                 'caption': caption, 'hashtags': tags, 'estilo2': True}
            if segs is None:
                v['escenas'] = escenas_mg(d, kw)
            else:
                v['vozTexto'] = voz_texto(segs)
                v['escenas'] = escenas_voz(segs, kw)
            videos.append(v)
            filas.append({'fecha': d['fecha'], 'día': DIA_ES[d['dia']], 'hora (Caracas)': hora, 'plataforma': 'TikTok + Reels',
                          'archivo / id': vid_id, 'título': titulo, 'formato': {'MG': 'Motion graphics + canción · sin voz', 'VOZ': 'Motion graphics + voz de IA (A)', 'VOZ2': 'Motion graphics + voz de IA (B)'}[tipo],
                          'semana · nicho': f"S{d['sem']} · {nicho}", 'día de la semana': formato, 'palabra clave': kw, 'caption': caption, 'hashtags': tags})
        nc = PRIMER_CARRUSEL + n - 1
        c = carrusel(nc, d, kw)
        carr.append(c)
        filas.append({'fecha': d['fecha'], 'día': DIA_ES[d['dia']], 'hora (Caracas)': '17:00', 'plataforma': 'Instagram + TikTok (fotos)',
                      'archivo / id': f'CARRUSEL-{nc}', 'título': d['car']['titulo'], 'formato': f'Carrusel de {len(c["laminas"])} láminas',
                      'semana · nicho': f"S{d['sem']} · {nicho}", 'día de la semana': formato, 'palabra clave': kw, 'caption': d['car']['caption'], 'hashtags': tags})

    filas.sort(key=lambda r: (r['fecha'], r['hora (Caracas)']))
    with open(os.path.join(PERSONAL, 'CALENDARIO-NOVIEMBRE.csv'), 'w', encoding='utf-8-sig', newline='') as f:
        w = csv.DictWriter(f, fieldnames=list(filas[0].keys()))
        w.writeheader()
        w.writerows(filas)

    json.dump(videos, open(os.path.join(PERSONAL, 'fyp', 'videos-noviembre.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)

    with open(os.path.join(CARRUSELES, 'carruseles-noviembre.js'), 'w', encoding='utf-8') as f:
        f.write('/* Carruseles de noviembre (25–43). Los genera marketing/personal/noviembre/generar.py: no se editan a mano. */\n')
        f.write(';(function () {\n  window.CARRUSELES.push(...' + json.dumps(carr, ensure_ascii=False, indent=2).replace('\n', '\n  ') + ')\n})()\n')

    # ── Guiones de ElevenLabs ──
    gdir = os.path.join(PERSONAL, 'guiones')
    mapa = []
    for voz, clave, etiqueta in (('A', 'A', 'Voz A · José Manuel (cálida)'), ('B', 'B', 'Voz B · Joseph Corona (clara y profesional)')):
        i = 0
        for k, cuantos in enumerate(BLOQUES_POR_ARCHIVO, 1):
            bloques = []
            for j in range(cuantos):
                d = DIAS[i]
                bloques.append(eleven(d[clave]))
                mapa.append((voz, k, j + 1, i + 1, d))
                i += 1
            texto = '\n\n'.join(bloques) + '\n'
            open(os.path.join(gdir, f'ELEVENLABS-NOV-{voz}-{k}.txt'), 'w', encoding='utf-8').write(texto)
    L = ['# ElevenLabs · guiones de noviembre', '',
         'Cada archivo `ELEVENLABS-NOV-A-n.txt` (voz A) y `ELEVENLABS-NOV-B-n.txt` (voz B) tiene 4 o 5 bloques separados por una línea en blanco. '
         'Pega el archivo **entero** en ElevenLabs (modelo **Eleven v4**, mismos ajustes de siempre) y descarga **un solo MP3**: yo lo corto por los silencios entre bloques, '
         'alineo las palabras y monto cada video. No hace falta generar un audio por bloque.', '',
         '- **Voz A:** José Manuel · Warm Natural Narrator. **Voz B:** Joseph Corona · Clear and Professional.',
         '- Las etiquetas entre corchetes (`[serio]`, `[con energía]`…) son para ElevenLabs: no las leas ni las borres. "bukéa" se escribe así para que la voz diga bien "bookeaa".',
         '- Cada audio de 4–5 bloques gasta ≈1.700 caracteres; los 8 archivos suman ≈13.000. Si tu plan no alcanza, genera primero el 1 de cada voz (semana 1 y comienzo de la 2).', '',
         '| Archivo | Bloque | Día | Video | Tema |', '|---|---|---|---|---|']
    for voz, k, b, i, d in mapa:
        L.append(f"| `ELEVENLABS-NOV-{voz}-{k}.txt` | {b} | {DIA_ES[d['dia']]} {int(d['fecha'][8:])} nov | `{vid(i, d)}-{'VOZ' if voz == 'A' else 'VOZ2'}` | {d['tema']} |")
    L += ['', '## Cómo me los pasas', '', 'Súbeme los MP3 de a uno o todos juntos. Si pasas varios, nómbralos por archivo (ej. `A1.mp3`, `B1.mp3`) para no confundirlos. '
          'Primero te digo si los bloques salieron completos y en orden; después los monto.']
    open(os.path.join(gdir, 'ELEVENLABS-NOV-LEEME.md'), 'w', encoding='utf-8').write('\n'.join(L) + '\n')
    print(f'{len(videos)} videos, {len(carr)} carruseles, {len(filas)} filas de calendario')
    for voz in 'AB':
        for k in range(1, 5):
            t = open(os.path.join(gdir, f'ELEVENLABS-NOV-{voz}-{k}.txt'), encoding='utf-8').read()
            print(f'  {voz}{k}: {len(t)} caracteres, {t.count(chr(10) + chr(10)) + 1} bloques')


main()
