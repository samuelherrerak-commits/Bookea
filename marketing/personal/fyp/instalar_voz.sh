#!/usr/bin/env bash
# Instala Qwen3-TTS (CPU) en ~/.cache/bookeaa-voz/venv. Se hace una sola vez; el modelo (~4 GB) se baja solo.
set -e
D="${VOZ_DIR:-$HOME/.cache/bookeaa-voz}"
python3 -m venv "$D/venv"
. "$D/venv/bin/activate"
pip install -q torch torchaudio --index-url https://download.pytorch.org/whl/cpu
pip install -q qwen-tts soundfile
# qwen-tts puede traer torch con CUDA: se fuerza la versión CPU para que torchaudio cargue.
pip install -q --force-reinstall --no-deps torch torchaudio --index-url https://download.pytorch.org/whl/cpu
python -c "import qwen_tts; print('Qwen3-TTS listo')"
