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

## Videos en dos partes (a cámara + explicando la app)

Cuando Samuel habla mirando la pantalla o explica cómo funciona bookeaa, usa `escenas`:
- Pantallas de marca en negro o blanco, alternando, con kicker numerado ("01 · Tu link", "02 · Tu cliente reserva"), titulares cortos terminados en punto y la persiana (`bloque: true`) al pasar de la parte 1 a la 2.
- Pon teléfonos (`public/flujo/`: 1-inicio, 2-servicios, 3-lugar, 4-agenda, 5-pago, 6-listo) **solo cuando lo que dice se ve en la app**. Si no, solo titulares. `en` sincroniza cada teléfono con la palabra.
- En la parte 2 **no debe verse la cámara**: desde la primera escena el fondo es negro (`sinCamaraDesde` lo cambia) y cada escena entra encima de la anterior.
- Referencia: `ediciones/2026-09-30-dos-partes.json`.
- Los tiempos salen de `<edición>.captions.json`. Quita las tomas repetidas desde `segmentos`.

## Estilo (identidad de bookeaa; no cambiar sin que Samuel lo pida)

Sale de `marketing/video/estilos.css` y `motor.js`, y está implementado en `marketing/personal/src/marca.ts`.

- **Solo carbón `#0f0f0e` y blanco.** Nada de colores de acento, cajas blancas, stickers ni giros.
- **Titulares:** Barlow Condensed 800 en MAYÚSCULAS, **alineados a la izquierda** con margen de 90px. Terminan en punto ("TU LINK. TUS CLIENTES."); el punto corta la línea. Las líneas suben desde una máscara (`Lineas.tsx`).
- **Gancho:** tarjeta negra de 1,6 s con la serie como kicker (`serie`), un titular corto (idealmente ≤ 22 caracteres para el tamaño mega), esquinas ⌐ ¬ y dos ×. Sale con la ola mientras la voz sigue sonando.
- **Subtítulos:** Barlow Condensed 800 en mayúsculas a la izquierda, sin cajas. La palabra que se dice va en blanco pleno y las que faltan, atenuadas.
- **Énfasis:** 1 a 3 por video, titular arriba sobre un degradado oscuro, con `kicker` opcional. Los números cortos ("12", "7:00") usan el tamaño reloj.
- **Cambios de tema:** `bloque: true` pone la persiana negra con un golpe.
- **Cierre:** logo + bookeaa, "TU AGENDA ONLINE" y @bookeaa.
- **Sonidos:** `texto` al entrar un titular, `whoosh` en la ola y `golpe` en la persiana. Máximo 3 efectos extra.
- **Música:** solo con `conMusica: true`, a 0.08–0.12, siempre por debajo de la voz.
- **Duración** ideal: 30–60 s.
