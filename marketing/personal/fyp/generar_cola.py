"""Datos iniciales de la cola de Marketing de Central (src/central/marketing-semilla.json).

    python3 fyp/generar_cola.py

Toma el calendario de octubre (CALENDARIO-OCTUBRE.csv) desde hoy y le suma los carruseles diarios.
Central los importa una sola vez (botón "Importar calendario"); lo que ya existe no se pisa.
"""
import csv
import json
import os
from datetime import date

AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.abspath(os.path.join(AQUI, "..", "..", ".."))
DESDE = os.environ.get("COLA_DESDE", "2026-10-15")
HASHTAGS = "#bookeaa #emprendimiento #agendaonline #emprendedoresvenezolanos #negocios"

# Un carrusel por día hábil (láminas en marketing/carruseles/carruseles.js, salida en marketing/salida/carruseles).
CARRUSELES = [
    {"n": 16, "fecha": "2026-10-15", "titulo": "La libreta", "caption": "¿Tu agenda está en un papel? Tu cliente no la puede ver, y por eso te escribe. Los negocios que saben organizar su tiempo agendan con bookeaa 📅 Pruébalo gratis: link en el perfil."},
    {"n": 17, "fecha": "2026-10-16", "titulo": "Cero mensajes", "caption": "¿Cuántos mensajes escribes para agendar una cita? Con bookeaa son cero. Comenta AGENDA 👇 y te mando el link para probar gratis."},
]
# Ya salieron en Instagram (pruebas de Make): se importan como publicados para no repetirlos.
PUBLICADOS = {"FYP-S01-JUE-MG": "Publicado como prueba de Make el 15 oct", "CARRUSEL-16": "Publicado como prueba de Make el 15 oct"}
DIAS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"]


def medios():
    """Links públicos (Cloudinary) de lo ya subido: { id: url | [urls] } en fyp/medios.json."""
    ruta = os.path.join(AQUI, "medios.json")
    return json.load(open(ruta, encoding="utf-8")) if os.path.exists(ruta) else {}


def tipo(archivo):
    return {"MG": "video-mg", "VOZ": "video-voz", "CAM": "video-cam"}.get(archivo.rsplit("-", 1)[-1], "campana")


def main():
    filas = []
    links = medios()
    with open(os.path.join(AQUI, "..", "CALENDARIO-OCTUBRE.csv"), encoding="utf-8-sig") as f:
        for r in csv.DictReader(f):
            if r["fecha"] < DESDE:
                continue
            t = tipo(r["archivo / id"])
            ident = r["archivo / id"] if t != "campana" else "CAMPANA-" + r["fecha"].replace("-", "")
            filas.append({
                "id": ident, "fecha": r["fecha"], "hora": r["hora (Caracas)"], "tipo": t,
                "titulo": r["título"], "plataforma": r["plataforma"],
                "caption": r["caption"] if t != "campana" else "", "hashtags": r["hashtags"] if t != "campana" else "",
                "media": " ".join(l if isinstance(l, str) else " ".join(l) for l in [links.get(ident, "")]), "estado": "borrador",
                "notas": "Texto y piezas en bookeaa.com/campana" if t == "campana" else "",
            })
    for c in CARRUSELES:
        if c["fecha"] >= DESDE:
            filas.append({
                "id": f"CARRUSEL-{c['n']}", "fecha": c["fecha"], "hora": "17:00", "tipo": "carrusel",
                "titulo": c["titulo"], "plataforma": "Instagram", "caption": c["caption"], "hashtags": HASHTAGS,
                "media": " ".join(links.get(f"CARRUSEL-{c['n']}", [])), "estado": "borrador", "notas": f"7 láminas · marketing/salida/carruseles/carrusel-{c['n']}",
            })
    for f in filas:
        if f["id"] in PUBLICADOS:
            f["estado"], f["notas"] = "publicado", PUBLICADOS[f["id"]]
    filas.sort(key=lambda x: (x["fecha"], x["hora"], x["id"]))
    destino = os.path.join(RAIZ, "src", "central", "marketing-semilla.json")
    json.dump(filas, open(destino, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(len(filas), "publicaciones →", os.path.relpath(destino, RAIZ))


if __name__ == "__main__":
    main()
