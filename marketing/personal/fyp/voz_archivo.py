"""Voz en off a partir de un AUDIO YA GENERADO (p. ej. el de ElevenLabs con tu plan), sin clonar nada.

    python3 fyp/voz_archivo.py "<texto>" salida.wav palabras.json --audio ruta.mp3 [--recortes "0-5.3,16.2-22.2"]

- Recorta los tramos indicados (segundos), los une con 0,25 s de aire y deja 0,35 s al inicio.
- Calcula el tiempo de cada palabra del texto con faster-whisper, igual que voz.py y voz_clon.py.
"""
import argparse
import json
import os
import subprocess
import sys
import tempfile
import wave

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from voz import LEAD_S, alinear  # noqa: E402

SR = 24000
GAP_S = 0.25


def ffmpeg():
    import imageio_ffmpeg

    return os.environ.get("FFMPEG_PATH") or imageio_ffmpeg.get_ffmpeg_exe()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("texto")
    ap.add_argument("salida")
    ap.add_argument("palabras")
    ap.add_argument("--audio", required=True)
    ap.add_argument("--recortes", default="")
    a = ap.parse_args()

    tramos = [tuple(float(x) for x in r.split("-")) for r in a.recortes.split(",") if r] or [(0.0, None)]
    datos = [b"\x00\x00" * int(SR * LEAD_S)]
    with tempfile.TemporaryDirectory() as d:
        for i, (ini, fin) in enumerate(tramos):
            seg = os.path.join(d, f"s{i}.wav")
            cmd = [ffmpeg(), "-v", "error", "-y", "-ss", str(ini)] + (["-to", str(fin)] if fin else []) + ["-i", a.audio, "-ac", "1", "-ar", str(SR), "-sample_fmt", "s16", seg]
            subprocess.run(cmd, check=True)
            with wave.open(seg) as r:
                datos.append(r.readframes(r.getnframes()))
            if i < len(tramos) - 1:
                datos.append(b"\x00\x00" * int(SR * GAP_S))
    with wave.open(a.salida, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(b"".join(datos))

    palabras = a.texto.split()
    tiempos = alinear(palabras, a.salida)
    tiempos[0] = (max(tiempos[0][0], LEAD_S), max(tiempos[0][1], LEAD_S + 0.2))
    out = [{"text": p, "startMs": round(s * 1000), "endMs": round(e * 1000)} for p, (s, e) in zip(palabras, tiempos)]
    with wave.open(a.salida) as r:
        dur = r.getnframes() / r.getframerate()
    json.dump({"duracionVoz": round(dur, 3), "palabras": out}, open(a.palabras, "w"), ensure_ascii=False, indent=1)
    print(f"{len(palabras)} palabras · {dur:.1f} s · audio propio")


if __name__ == "__main__":
    main()
