"""Transcripción sin huggingface: Whisper (sherpa-onnx) con modelos de GitHub Releases.

    python3 scripts/transcribir_sherpa.py audio16k.wav salida.captions.json [--modelo turbo]

Usa Silero VAD para cortar frases, transcribe cada frase con Whisper y reparte las
palabras dentro de la frase según su largo sobre los tramos con voz (VAD fino).
No es alineación exacta, pero con frases cortas queda sincronizado para subtítulos.
Los modelos se bajan solos a $MODELOS_DIR (por defecto ~/.cache/bookeaa-whisper).
"""
import argparse
import json
import os
import re
import subprocess
import tarfile
import urllib.request
import wave

import numpy as np
import sherpa_onnx

BASE = "https://github.com/k2-fsa/sherpa-onnx/releases/download/asr-models/"
SR = 16000
CORRECCIONES = [
    (r"\b(bookea|bukea|bukia|booquea|bookia|buquea|bugero|buquero|bokea|bukeya)a?\b", "bookeaa"),
]


def bajar(dir_, modelo):
    os.makedirs(dir_, exist_ok=True)
    vad = os.path.join(dir_, "silero_vad.onnx")
    if not os.path.exists(vad):
        urllib.request.urlretrieve(BASE + "silero_vad.onnx", vad)
    carpeta = os.path.join(dir_, f"sherpa-onnx-whisper-{modelo}")
    if not os.path.isdir(carpeta):
        print(f"↓ Bajando Whisper {modelo} (una sola vez)")
        tmp = carpeta + ".tar.bz2"
        subprocess.run(["curl", "-fL", "-o", tmp, f"{BASE}sherpa-onnx-whisper-{modelo}.tar.bz2"], check=True)
        with tarfile.open(tmp) as t:
            t.extractall(dir_)
        os.remove(tmp)
    return vad, carpeta


def tramos(audio, vad_path, silencio, maximo):
    cfg = sherpa_onnx.VadModelConfig()
    cfg.silero_vad.model = vad_path
    cfg.silero_vad.min_silence_duration = silencio
    cfg.silero_vad.min_speech_duration = 0.1
    cfg.silero_vad.max_speech_duration = maximo
    cfg.silero_vad.threshold = 0.45
    cfg.sample_rate = SR
    vad = sherpa_onnx.VoiceActivityDetector(cfg, buffer_size_in_seconds=max(60, len(audio) / SR + 5))
    out, ws, i = [], cfg.silero_vad.window_size, 0

    def vaciar():
        while not vad.empty():
            s = vad.front
            out.append((s.start / SR, (s.start + len(s.samples)) / SR))
            vad.pop()

    while i < len(audio):
        vad.accept_waveform(audio[i : i + ws])
        i += ws
        vaciar()
    vad.flush()
    vaciar()
    return out


def micro_tramos(audio, ini, fin, paso=0.02, pausa=0.12):
    """Divide [ini, fin] en tramos con voz separados por micro-pausas de baja energía."""
    fr = int(paso * SR)
    i0, i1 = int(ini * SR), int(fin * SR)
    e = np.array([np.sqrt(np.mean(audio[i : i + fr] ** 2)) + 1e-6 for i in range(i0, max(i0 + fr, i1 - fr), fr)])
    db = 20 * np.log10(e)
    umbral = np.percentile(db, 90) - 16
    bajo = db < umbral
    out, inicio, n_bajo = [], None, 0
    for k, b in enumerate(bajo):
        t = ini + k * paso
        if not b:
            if inicio is None:
                inicio = t
            n_bajo = 0
        elif inicio is not None:
            n_bajo += 1
            if n_bajo * paso >= pausa:
                out.append((inicio, t - (n_bajo - 1) * paso))
                inicio, n_bajo = None, 0
    if inicio is not None:
        out.append((inicio, fin))
    return [(a_, b_) for a_, b_ in out if b_ - a_ >= 0.06] or [(ini, fin)]


def main():
    p = argparse.ArgumentParser()
    p.add_argument("wav")
    p.add_argument("salida")
    p.add_argument("--modelo", default="turbo")
    a = p.parse_args()

    vad_path, carpeta = bajar(os.environ.get("MODELOS_DIR", os.path.expanduser("~/.cache/bookeaa-whisper")), a.modelo)
    pref = os.path.join(carpeta, a.modelo)
    rec = sherpa_onnx.OfflineRecognizer.from_whisper(
        encoder=f"{pref}-encoder.int8.onnx",
        decoder=f"{pref}-decoder.int8.onnx",
        tokens=f"{pref}-tokens.txt",
        language="es",
        task="transcribe",
        num_threads=os.cpu_count() or 4,
        tail_paddings=800,
    )
    w = wave.open(a.wav)
    audio = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32) / 32768

    # Silero junta frases enteras; las micro-pausas (≥120 ms de energía baja) salen del
    # nivel de la señal y sirven para partir en frases de ≤8 s y ubicar las palabras.
    finos = []
    for ini, fin in tramos(audio, vad_path, 0.3, 30):
        finos += micro_tramos(audio, ini, fin)
    frases = []
    for a_, b_ in finos:
        if frases and b_ - frases[-1][0] <= 8 and a_ - frases[-1][1] < 0.6:
            frases[-1] = (frases[-1][0], b_)
        else:
            frases.append((a_, b_))
    captions = []
    for ini, fin in frases:
        x = audio[max(0, int((ini - 0.1) * SR)) : int((fin + 0.15) * SR)]
        s = rec.create_stream()
        s.accept_waveform(SR, x)
        rec.decode_stream(s)
        texto = s.result.text.strip()
        for patron, reemplazo in CORRECCIONES:
            texto = re.sub(patron, reemplazo, texto, flags=re.IGNORECASE)
        palabras = texto.split()
        if not palabras:
            continue
        # Tramos con voz dentro de la frase (para no poner palabras sobre pausas).
        voz = [(max(a_, ini), min(b_, fin)) for a_, b_ in finos if b_ > ini and a_ < fin] or [(ini, fin)]
        total = sum(b_ - a_ for a_, b_ in voz)
        pesos = [len(re.sub(r"\W", "", p_)) + 2 for p_ in palabras]
        suma = sum(pesos)

        def en_tiempo(frac):
            restante = frac * total
            for a_, b_ in voz:
                if restante <= b_ - a_:
                    return a_ + restante
                restante -= b_ - a_
            return voz[-1][1]

        acum = 0
        for p_, peso in zip(palabras, pesos):
            t0, t1 = en_tiempo(acum / suma), en_tiempo((acum + peso) / suma)
            acum += peso
            captions.append(
                {
                    "text": " " + p_,
                    "startMs": round(t0 * 1000),
                    "endMs": round(t1 * 1000),
                    "timestampMs": round((t0 + t1) * 500),
                    "confidence": None,
                }
            )
        print(f"{ini:6.2f}–{fin:6.2f}  {texto}")
    with open(a.salida, "w", encoding="utf-8") as f:
        json.dump(captions, f, ensure_ascii=False, indent=1)
    print(f"{len(captions)} palabras → {a.salida}")


if __name__ == "__main__":
    main()
