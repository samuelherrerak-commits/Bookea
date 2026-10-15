"""Voz en off de IA para los videos FYP (Piper, local y sin API).

    python3 fyp/voz.py "<texto>" salida.wav palabras.json [--voz es_MX-claude-high] [--vel 0.9]

- Respeta la pronunciación de la marca (bookeaa → "bukea", WhatsApp → "guatsap"…).
- Deja 0,35 s de aire al inicio (para la firma sonora) y calcula el tiempo de CADA palabra del
  guion original con faster-whisper sobre la propia voz sintética.
- Salida: wav 22,05 kHz mono + JSON { duracionVoz, palabras: [{ text, startMs, endMs }] }.
Las voces se bajan una vez de huggingface.co/rhasspy/piper-voices (licencias libres) a
$VOCES_DIR (por defecto ~/.cache/bookeaa-voces).
"""
import argparse
import difflib
import json
import os
import re
import subprocess
import unicodedata
import wave

VOCES = {
    "es_MX-claude-high": "es/es_MX/claude/high/es_MX-claude-high",
    "es_MX-ald-medium": "es/es_MX/ald/medium/es_MX-ald-medium",
    "es_ES-davefx-medium": "es/es_ES/davefx/medium/es_ES-davefx-medium",
}
# Cómo se deben LEER las palabras que un TTS en español pronuncia mal.
PRONUNCIA = [
    (r"\bbookeaa\b", "bukea"),
    (r"\bWhatsApp\b", "guatsap"),
    (r"\bGoogle Calendar\b", "gúgol caléndar"),
    (r"\bGoogle\b", "gúgol"),
    (r"\bInstagram\b", "ínstagram"),
    (r"\bDM\b", "de eme"),
    (r"\bQR\b", "cu erre"),
    (r"\bTikTok\b", "tiktok"),
]
LEAD_S = 0.35


def cargar(nombre):
    carpeta = os.environ.get("VOCES_DIR", os.path.expanduser("~/.cache/bookeaa-voces"))
    os.makedirs(carpeta, exist_ok=True)
    ruta = os.path.join(carpeta, nombre + ".onnx")
    base = "https://huggingface.co/rhasspy/piper-voices/resolve/main/" + VOCES[nombre]
    for ext in (".onnx", ".onnx.json"):
        dest = os.path.join(carpeta, nombre + ext)
        if not os.path.exists(dest):
            print(f"↓ Bajando voz {nombre}{ext}")
            subprocess.run(["curl", "-fsSL", "-o", dest, base + ext], check=True)
    from piper import PiperVoice

    return PiperVoice.load(ruta)


def norm(w):
    w = unicodedata.normalize("NFD", w.lower())
    return re.sub(r"[^a-z0-9]", "", "".join(c for c in w if unicodedata.category(c) != "Mn"))


def alinear(palabras, wav):
    """Tiempo (s) de cada palabra del guion, con faster-whisper sobre la voz sintética."""
    from faster_whisper import WhisperModel

    modelo = WhisperModel("turbo", device="cpu", compute_type="int8")
    seg, _ = modelo.transcribe(wav, language="es", word_timestamps=True, vad_filter=False, condition_on_previous_text=False)
    rec = [(norm(w.word), w.start, w.end) for s in seg for w in s.words if norm(w.word)]
    t = [None] * len(palabras)
    j = 0
    for i, w in enumerate(palabras):
        n = norm(w)
        for k in range(j, min(j + 4, len(rec))):
            if difflib.SequenceMatcher(None, n, rec[k][0]).ratio() >= 0.6 or n in rec[k][0] or rec[k][0] in n:
                t[i] = (rec[k][1], rec[k][2])
                j = k + 1
                break
    # Palabras sin pareja: se reparten entre sus vecinas según su largo.
    i = 0
    while i < len(t):
        if t[i] is None:
            a = i
            while i < len(t) and t[i] is None:
                i += 1
            ini = t[a - 1][1] if a > 0 else 0.0
            fin = t[i][0] if i < len(t) else (rec[-1][2] if rec else ini + 0.3 * (i - a))
            pesos = [len(norm(palabras[k])) + 1 for k in range(a, i)]
            acum = 0.0
            for k, pz in zip(range(a, i), pesos):
                t[k] = (ini + (fin - ini) * acum / sum(pesos), ini + (fin - ini) * (acum + pz) / sum(pesos))
                acum += pz
        else:
            i += 1
    return t


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("texto")
    ap.add_argument("salida")
    ap.add_argument("palabras")
    ap.add_argument("--voz", default="es_MX-claude-high")
    ap.add_argument("--vel", type=float, default=0.9, help="length_scale: menor = más rápido")
    a = ap.parse_args()

    from piper import SynthesisConfig

    leer = a.texto
    for patron, reemplazo in PRONUNCIA:
        leer = re.sub(patron, reemplazo, leer)
    voz = cargar(a.voz)
    crudo = a.salida + ".crudo.wav"
    with wave.open(crudo, "wb") as w:
        voz.synthesize_wav(leer, w, syn_config=SynthesisConfig(length_scale=a.vel))
    # Aire al inicio.
    with wave.open(crudo) as r:
        sr, datos = r.getframerate(), r.readframes(r.getnframes())
    with wave.open(a.salida, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(sr)
        w.writeframes(b"\x00\x00" * int(sr * LEAD_S) + datos)
    os.remove(crudo)

    palabras = a.texto.split()
    tiempos = alinear(palabras, a.salida)
    # Whisper pone la primera palabra en 0; la voz empieza después del aire inicial.
    tiempos[0] = (max(tiempos[0][0], LEAD_S), max(tiempos[0][1], LEAD_S + 0.2))
    salida = [{"text": p, "startMs": round((s + 0) * 1000), "endMs": round(e * 1000)} for p, (s, e) in zip(palabras, tiempos)]
    with wave.open(a.salida) as r:
        dur = r.getnframes() / r.getframerate()
    json.dump({"duracionVoz": round(dur, 3), "palabras": salida}, open(a.palabras, "w"), ensure_ascii=False, indent=1)
    print(f"{len(palabras)} palabras · {dur:.1f} s · {a.voz}")


if __name__ == "__main__":
    main()
