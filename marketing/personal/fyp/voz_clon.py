"""Voz en off CLONADA de Samuel (Qwen3-TTS, local y sin API). Misma interfaz que voz.py.

    python3 fyp/voz_clon.py "<texto>" salida.wav palabras.json

- Corre Qwen3-TTS con el python del venv (VOZ_PY, por defecto ~/.cache/bookeaa-voz/venv/bin/python).
  Primero: bash fyp/instalar_voz.sh. En CPU tarda ~1 min por cada 10 s de audio.
- Pronunciación: bookeaa → "bukéa" (acento en la E), WhatsApp, Google…
- Mismo formato de salida que voz.py: wav 24 kHz mono con 0,35 s de aire + JSON { duracionVoz, palabras }.
"""
import json
import os
import re
import subprocess
import sys
import wave

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from voz import LEAD_S, PRONUNCIA, alinear  # noqa: E402

AQUI = os.path.dirname(os.path.abspath(__file__))
VOZ_PY = os.environ.get("VOZ_PY", os.path.expanduser("~/.cache/bookeaa-voz/venv/bin/python"))
MODELO = os.environ.get("VOZ_MODELO", "Qwen/Qwen3-TTS-12Hz-1.7B-Base")


def main():
    texto, salida, palabras_json = sys.argv[1:4]
    leer = texto
    for patron, reemplazo in [(r"\bbookeaa\b", "bukéa")] + [p for p in PRONUNCIA if "bookeaa" not in p[0]]:
        leer = re.sub(patron, reemplazo, leer)
    crudo = salida + ".crudo.wav"
    subprocess.run([VOZ_PY, os.path.join(AQUI, "qwen_gen.py"), leer, crudo, "--modelo", MODELO], check=True)
    with wave.open(crudo) as r:
        sr, datos = r.getframerate(), r.readframes(r.getnframes())
    with wave.open(salida, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(sr)
        w.writeframes(b"\x00\x00" * int(sr * LEAD_S) + datos)
    os.remove(crudo)

    palabras = texto.split()
    tiempos = alinear(palabras, salida)
    tiempos[0] = (max(tiempos[0][0], LEAD_S), max(tiempos[0][1], LEAD_S + 0.2))
    out = [{"text": p, "startMs": round(s * 1000), "endMs": round(e * 1000)} for p, (s, e) in zip(palabras, tiempos)]
    with wave.open(salida) as r:
        dur = r.getnframes() / r.getframerate()
    json.dump({"duracionVoz": round(dur, 3), "palabras": out}, open(palabras_json, "w"), ensure_ascii=False, indent=1)
    print(f"{len(palabras)} palabras · {dur:.1f} s · voz clonada")


if __name__ == "__main__":
    main()
