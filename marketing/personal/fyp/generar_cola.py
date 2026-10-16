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
    {"n": 18, "fecha": "2026-10-17", "titulo": "Tu descanso no es para responder", "caption": "Tu fin de semana no es para contestar mensajes. Los negocios que saben organizar su tiempo dejan que su link responda por ellos 📅 Pruébalo gratis: link en el perfil."},
    {"n": 19, "fecha": "2026-10-18", "titulo": "Tu lunes ya está lleno", "caption": "El lunes empieza hoy. ¿Tu agenda ya está lista? Comenta AGENDA 👇 y te mando el link para probar bookeaa gratis."},
    {"n": 20, "fecha": "2026-10-19", "titulo": "Dos a la misma hora", "caption": "Dos clientes. Una hora. Los negocios que saben organizar su tiempo tienen un solo calendario: una hora, una cita 📅 Pruébalo gratis: link en el perfil."},
    {"n": 21, "fecha": "2026-10-20", "titulo": "Precios a la vista", "caption": "¿Se ven tus precios? El que no pregunta, se va. Los negocios que saben vender muestran sus servicios con precio 📅 Pruébalo gratis: link en el perfil."},
    {"n": 22, "fecha": "2026-10-21", "titulo": "3 cosas si eres barbero", "caption": "3 cosas que tienes que saber si eres barbero ✂️ La 3 es la que casi nadie hace. Organiza tu barbería con bookeaa 📅 Pruébalo gratis: link en el perfil.", "extra": "#barberia #barberos"},
    {"n": 23, "fecha": "2026-10-22", "titulo": "Una hora que no cobras", "caption": "20 veces al día × 3 minutos = 1 hora que no cobras. Que tu cliente vea tus horas solo 📅 bookeaa, pruébalo gratis: link en el perfil."},
    {"n": 24, "fecha": "2026-10-23", "titulo": "8 estilos", "caption": "8 estilos, 1 es tuyo. ¿Cuál va con tu negocio? Comenta AGENDA 👇 y te mando el link para probar bookeaa gratis."},
]
# Ya salieron en Instagram (pruebas de Make): se importan como publicados para no repetirlos.
PUBLICADOS = {"FYP-S01-JUE-MG": "Publicado como prueba de Make el 15 oct", "CARRUSEL-16": "Publicado como prueba de Make el 15 oct"}
DIAS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"]


def medios():
    """Links públicos (Cloudinary) de lo ya subido: { id: url | [urls] } en fyp/medios.json."""
    ruta = os.path.join(AQUI, "medios.json")
    return json.load(open(ruta, encoding="utf-8")) if os.path.exists(ruta) else {}


# Segunda voz del día (guiones/GUION-VOZ-LARGO-2.txt): programada a las 18:00.
VOZ2 = [
    ("2026-10-19", "LUN", "Reservas mientras duermes", "¿Cuántas citas se pierden mientras duermes?", "link"),
    ("2026-10-20", "MAR", "Nunca más una cita olvidada", "Anotar una cita en una libreta es pedirle a tu memoria que no falle.", "link"),
    ("2026-10-21", "MIE", "Tu link en la bio", "¿Tu bio dice \"escríbeme al privado\"?", "comenta"),
    ("2026-10-22", "JUE", "Empieza en minutos", "Dices que no tienes tiempo para organizarte. Justo por eso necesitas organizarte.", "link"),
    ("2026-10-23", "VIE", "El primer mes es gratis", "¿Cuál es el riesgo de probar? Ninguno.", "comenta"),
    ("2026-10-26", "LUN", "Clientes que sí llegan", "Un cliente que elige su propia hora es un cliente que llega.", "link"),
    ("2026-10-27", "MAR", "Tus servicios, tus reglas", "Tu negocio, tus reglas.", "link"),
    ("2026-10-28", "MIE", "Cuánto vale tu tiempo", "¿Cuánto vale una hora de tu trabajo?", "link"),
    ("2026-10-29", "JUE", "Para todo negocio con citas", "Barbería, uñas, spa, consultorio, estética.", "link"),
    ("2026-10-30", "VIE", "Cierre de mes", "Se acaba el mes. Mira tu agenda: ¿cuántas horas libres se quedaron vacías?", "comenta"),
]
CIERRE_VOZ2 = {
    "link": "Los negocios que saben organizar su tiempo agendan con bookeaa 📅 Pruébalo gratis: link en el perfil.",
    "comenta": "Comenta AGENDA 👇 y te mando el link para probar bookeaa gratis.",
}


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
    # Tu video personal (CAM) pasa a ser el 4.º del día, opcional.
    for f in filas:
        if f["tipo"] == "video-cam":
            f["hora"], f["notas"] = "21:30", "Opcional: tu video personal (4.º del día)"
    for fecha, dia, titulo, gancho, cta in VOZ2:
        if fecha >= DESDE:
            n = [i + 1 for i, v in enumerate(VOZ2) if v[0] == fecha][0]
            filas.append({
                "id": f"FYP-{'S02' if fecha < '2026-10-26' else 'S03'}-{dia}-VOZ2", "fecha": fecha, "hora": "18:00", "tipo": "video-voz",
                "titulo": titulo + " (2.ª voz)", "plataforma": "TikTok + Reels", "caption": f"{gancho} {CIERRE_VOZ2[cta]}", "hashtags": HASHTAGS,
                "media": (lambda i: links[i] if isinstance(links.get(i), str) else "")(f"FYP-{'S02' if fecha < '2026-10-26' else 'S03'}-{dia}-VOZ2"), "estado": "borrador", "notas": f"2.ª voz · bloque {n} de guiones/GUION-VOZ-LARGO-2.txt",
            })
    for c in CARRUSELES:
        if c["fecha"] >= DESDE:
            filas.append({
                "id": f"CARRUSEL-{c['n']}", "fecha": c["fecha"], "hora": "17:00", "tipo": "carrusel",
                "titulo": c["titulo"], "plataforma": "Instagram", "caption": c["caption"], "hashtags": (HASHTAGS + " " + c["extra"]).strip() if c.get("extra") else HASHTAGS,
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
