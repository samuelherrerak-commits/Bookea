---
name: bookeaa-vlog-editor
description: Edita los videos de la cuenta personal del fundador de bookeaa (vlogs de emprendedor), con subtítulos pop palabra por palabra, cortes de silencio, gancho, énfasis, efectos y música de bookeaa. Úsala siempre que Samuel mande un video o un link de Google Drive para editar, pida ideas o guiones para la cuenta personal, o quiera cambiar el estilo de sus vlogs.
---

# Editor de vlogs · cuenta personal de bookeaa

El proyecto está en `marketing/personal/` (Remotion). Lee su `README.md` y, para las ideas, `IDEAS.md`. Para detalles de Remotion carga `remotion-best-practices`/`remotion-captions`, y para animaciones nuevas carga `remotion-motion-graphics`.

## Flujo por cada video

1. **Crear la edición**: `marketing/personal/ediciones/<AAAA-MM-DD>-<slug>.json` con `fuente` (el link de Drive). Si Samuel no dio gancho, propón uno de 4 a 7 palabras sacado de lo que dice en el video (primero transcribe con `--sin-render`).
2. **Preparar**: `node scripts/editar.mjs <edición> --sin-render`. Descarga, transcribe, corta y arma el audio.
3. **Revisar la transcripción** (`<edición>.captions.json`): corrige nombres (bookeaa, Caracas, nombres de clientes) y groserías o datos privados que no deban salir.
4. **Revisar los cortes** (`segmentos`): quita las tomas repetidas (deja la última buena), marca `bloque: true` donde cambia el tema y pon `broll` donde haya clips de apoyo.
5. **Énfasis**: 1 a 3 por video, solo números o frases clave. `t` es el tiempo del video FINAL: calcúlalo con los segmentos.
6. **Cuadros de prueba**: `--cuadros 0.5,<medio>,<final-1>`. Míralos con Read. Revisa que el subtítulo se lea, que no tape la cara y que esté en la zona segura.
7. **Render completo**, verificar `-14 LUFS ±1` (`ffmpeg -af ebur128`) y enviar `salida/<nombre>.mp4` con SendUserFile. Propón también el texto del post (2 o 3 líneas en primera persona y una pregunta) y 3 a 5 hashtags.

## Estilo (no cambiar sin que Samuel lo pida)

- Crudo y personal: nada de plantillas de anuncio. Máximo 3 efectos de sonido más allá de los automáticos.
- Música solo con `conMusica: true`, a 0.08–0.12, y siempre por debajo de la voz.
- Subtítulos: Barlow Condensed 800 en mayúsculas, blanco con borde negro y la palabra activa en caja blanca. Grupos de 2 a 4 palabras.
- Paleta de bookeaa: blanco `#fff` y carbón `#0f0f0e`. Sin colores extra.
- Duración ideal 30–60 s. Si el material pasa de 75 s, propón qué cortar antes de renderizar.
