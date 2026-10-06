# Cuenta personal · edición de vlogs

Proyecto Remotion aparte (su propio `package.json`) para editar los videos de la cuenta personal del fundador. Tiene la identidad visual de bookeaa (la misma de los reels de `marketing/video/`): solo blanco y negro, Barlow Condensed 800 en mayúsculas alineada a la izquierda y titulares que suben por línea. Incluye un gancho en tarjeta negra que sale con la ola, subtítulos palabra por palabra sin cajas, énfasis sobre degradado, persiana en los cambios de tema y el cierre de marca. Se cortan los silencios, hay un zoom leve en cada corte y, cuando se pide, suena la música de bookeaa baja. Los tokens están en `src/marca.ts`. La salida es 1080×1920 a -14 LUFS, lista para Instagram Reels y TikTok. Las ideas y la guía de grabación están en [IDEAS.md](IDEAS.md).

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
| `gancho` | Titular de la tarjeta negra inicial (1,6 s), corto y terminado en punto |
| `serie` | Kicker encima del gancho, p. ej. "Diario del fundador" |
| `enfasis` | `[{ ts, texto, dur?, kicker? }]`: titular arriba sobre degradado. `ts` va en segundos del original (o `t` en segundos del video final) |
| `conMusica`, `volumenMusica` | Música de bookeaa (la de `marketing/scripts/audio.mjs`) bajo la voz. El volumen por defecto es 0.1 |
| `sonidos` | Efectos extra `[{ t, tipo }]`: `whoosh`, `pop`, `ding`, `check`, `golpe`, `desliza`, `texto`, `tecla`, `final` |
| `escenas` | Escenas de marca a pantalla completa (tapan la cámara y la voz sigue), para explicar la app como en los reels: `{ desde, hasta, fondo: "negro"\|"blanco", entrada?: "ola"\|"lado"\|"corte", kicker?, titulo: [líneas], tiempos?, estilo?, tamano?, texto?, textoEn?, link?, pastilla?, telefonos?: [{ img: "flujo/4-agenda.jpg", ancho?, x, y, rot?, en? }] }`. Los tiempos van en segundos del ORIGINAL. Durante una escena no se muestran subtítulos |
| `capitulos` | `[{ ts, texto, numero?, dur? }]`: etiqueta de capítulo arriba a la izquierda (número + pastilla con borde) |
| `checklist` | `{ desde, hasta, titulo, items: [{ ts, texto }] }`: tarjeta carbón que marca cada ítem con ✓ cuando se nombra |
| `subtitulos` | `{ arriba?, tamano? }`: para subtítulos más abajo en un vlog, p. ej. `{ "arriba": 1440, "tamano": 76 }` |
| `kitSfx` | `"mixkit"`: los efectos automáticos (transiciones, títulos, checks, teclas) usan la librería de `public/sfx/` en vez de los sintetizados |
| `sfx` | `[{ ts \| t, nombre, vol? }]`: efectos puntuales de `public/sfx/`: whoosh, barrido, impacto, burbuja, mensaje, pop, pop-fuerte, click, teclado, tecla, check, exito, monedas, trombon, boing. Son de Mixkit, con licencia libre (ver `public/sfx/LICENCIA.md`) |
| `usuario` | Usuario del cierre (por defecto `@bookeaa.app`) |
| `cierre` | Cierre de marca de 2,5 s (logo + bookeaa, @bookeaa) |
| `segmentos` | Pueden ir en otro orden que el original (p. ej. usar la segunda toma del gancho primero). Salen solos al cortar silencios. Edítalos para quitar tomas malas. `bloque: true` agrega la persiana negra + golpe y `broll: "entrada/x.mp4"` tapa la cámara con un clip |
| `umbralSilencio`, `silencioMin` | Ajuste del corte (por defecto `-32dB` y `0.45` s) |
| `motorWhisper`, `modeloWhisper` | `"faster"` + `"turbo"` da tiempos exactos por palabra (necesita huggingface.co) y corta por las pausas entre palabras. Sin eso se usa sherpa-onnx |

El script guarda cada paso en la edición: `video`, `segmentos` y `<edición>.captions.json`. Si corriges algo a mano (una palabra de los subtítulos, un corte), al volver a correrlo solo se rehace lo que falta. Los videos (`public/entrada/`, `public/tmp/`, `salida/`) no se versionan.

## Requisitos de red

Para bajar videos de Drive, el entorno tiene que permitir `drive.google.com` y `drive.usercontent.google.com`; si no, adjunta el video en el chat y usa su ruta local como `fuente`. Los subtítulos salen por defecto de Whisper turbo con sherpa-onnx (`pip install sherpa-onnx`), cuyos modelos se bajan de GitHub Releases; `motorWhisper: "faster"` usa faster-whisper, que necesita `huggingface.co`. Remotion usa el Chromium de Playwright (`CHROMIUM_PATH` para cambiarlo) y el ffmpeg de `imageio-ffmpeg` (`FFMPEG_PATH`).
