"""Genera la voz clonada con Qwen3-TTS (se ejecuta con el python del venv de voz; ver instalar_voz.sh).

    qwen_gen.py "<texto a leer>" salida.wav [--modelo Qwen/Qwen3-TTS-12Hz-1.7B-Base]
"""
import argparse
import os

import soundfile as sf
import torch
from qwen_tts import Qwen3TTSModel

AQUI = os.path.join(os.path.dirname(os.path.abspath(__file__)), "voz-samuel")

ap = argparse.ArgumentParser()
ap.add_argument("texto")
ap.add_argument("salida")
ap.add_argument("--modelo", default="Qwen/Qwen3-TTS-12Hz-1.7B-Base")
a = ap.parse_args()

modelo = Qwen3TTSModel.from_pretrained(a.modelo, device_map="cpu", dtype=torch.float32)
ref_texto = open(os.path.join(AQUI, "referencia.txt"), encoding="utf-8").read().strip()
w, sr = modelo.generate_voice_clone(
    text=a.texto, language="Spanish", ref_audio=os.path.join(AQUI, "referencia.wav"), ref_text=ref_texto
)
sf.write(a.salida, w[0], sr)
