# Cuenta personal · edición de vlogs

Proyecto Remotion aparte (su propio `package.json`) para editar los videos de la cuenta personal del fundador. El estilo es vlog crudo: se cortan los silencios, subtítulos grandes palabra por palabra en blanco y negro con la Barlow Condensed de bookeaa, zoom leve en cada corte, frase gancho, textos de énfasis, efectos y, cuando se pide, la música de bookeaa baja. La salida es 1080×1920 a -14 LUFS, lista para Instagram Reels y TikTok. Las ideas y la guía de grabación están en [IDEAS.md](IDEAS.md).

```bash
cd marketing/personal
npm install
pip install faster-whisper imageio-ffmpeg
node scripts/editar.mjs ediciones/2026-10-05-lanzamiento.json               # todo el flujo
node scripts/editar.mjs ediciones/2026-10-05-lanzamiento.json --cuadros 1,8  # PNG sueltos para revisar
npm run studio                                                              # vista previa interactiva
```

## La edición (`ediciones/<fecha>-<slug>.json`)

Copia `ediciones/ejemplo.json`. Solo hace falta `fuente`; lo demás es opcional.

| Campo | Qué hace |
| --- | --- |
| `fuente` | Link de Google Drive (compartido con cualquiera), URL o ruta local |
| `gancho` | Frase de los primeros 2,6 s, arriba |
| `enfasis` | `[{ t, texto, dur? }]`: texto grande con un pop, en segundos del video final |
| `conMusica`, `volumenMusica` | Música de bookeaa (la de `marketing/scripts/audio.mjs`) bajo la voz. El volumen por defecto es 0.1 |
| `sonidos` | Efectos extra `[{ t, tipo }]`: `whoosh`, `pop`, `ding`, `check`, `golpe`, `desliza`, `texto`, `tecla`, `final` |
| `cierre` | Tarjeta de 2 s con el logo y @bookeaa |
| `segmentos` | Los salen solos al cortar silencios. Edítalos para quitar tomas malas. `bloque: true` agrega destello + whoosh y `broll: "entrada/x.mp4"` tapa la cámara con un clip |
| `umbralSilencio`, `silencioMin` | Ajuste del corte (por defecto `-32dB` y `0.45` s) |
| `modeloWhisper` | `small` por defecto; `medium` si la transcripción falla |

El script guarda cada paso en la edición: `video`, `segmentos` y `<edición>.captions.json`. Si corriges algo a mano (una palabra de los subtítulos, un corte), al volver a correrlo solo se rehace lo que falta. Los videos (`public/entrada/`, `public/tmp/`, `salida/`) no se versionan.

## Requisitos de red

Para bajar videos de Drive y el modelo de Whisper, el entorno tiene que permitir `drive.google.com`, `drive.usercontent.google.com` y `huggingface.co`. Remotion usa el Chromium de Playwright (`CHROMIUM_PATH` para cambiarlo) y el ffmpeg de `imageio-ffmpeg` (`FFMPEG_PATH`).
