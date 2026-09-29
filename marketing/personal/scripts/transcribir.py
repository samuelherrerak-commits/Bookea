"""Transcribe un video con Whisper y guarda subtítulos palabra por palabra.

    python3 scripts/transcribir.py entrada.mp4 salida.captions.json [--modelo small]

Salida: lista de `Caption` de @remotion/captions (texto con espacio delante, tiempos en ms).
Usa faster-whisper (pip install faster-whisper); el modelo se descarga de huggingface.co
la primera vez. Las palabras de `CORRECCIONES` se arreglan solas (nombres que Whisper
no conoce).
"""
import argparse
import json
import re

CORRECCIONES = {
    r"\b(bookea|bukea|bukia|booquea|bookia|buquea)a?\b": "bookeaa",
}

# Palabras que Whisper suele escribir bien pero en inglés/raro en este contexto.
PROMPT = "Hola, soy Samuel, fundador de bookeaa. Emprender en Venezuela, agenda, reservas, clientes."


def main():
    p = argparse.ArgumentParser()
    p.add_argument("video")
    p.add_argument("salida")
    p.add_argument("--modelo", default="small")
    a = p.parse_args()

    from faster_whisper import WhisperModel

    modelo = WhisperModel(a.modelo, device="cpu", compute_type="int8")
    segmentos, _ = modelo.transcribe(
        a.video,
        language="es",
        word_timestamps=True,
        vad_filter=True,
        initial_prompt=PROMPT,
    )
    captions = []
    for s in segmentos:
        for w in s.words or []:
            texto = w.word
            for patron, reemplazo in CORRECCIONES.items():
                texto = re.sub(patron, reemplazo, texto, flags=re.IGNORECASE)
            if not texto.startswith(" "):
                texto = " " + texto
            captions.append(
                {
                    "text": texto,
                    "startMs": round(w.start * 1000),
                    "endMs": round(w.end * 1000),
                    "timestampMs": round((w.start + w.end) * 500),
                    "confidence": round(w.probability, 3),
                }
            )
    with open(a.salida, "w", encoding="utf-8") as f:
        json.dump(captions, f, ensure_ascii=False, indent=1)
    print(f"{len(captions)} palabras → {a.salida}")


if __name__ == "__main__":
    main()
