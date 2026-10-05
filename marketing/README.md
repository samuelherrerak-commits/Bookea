# Campañas de Instagram · bookeaa

Dos campañas con el estilo audaz de la marca. El plan completo de cada una (público, calendario, guiones, textos para publicar, respuestas y descargas) está en el sitio. Las páginas no aparecen en buscadores (`noindex`), pero cualquiera con el enlace las puede abrir.

- **Octubre · Lanzamiento:** 4 reels (1080×1920) y 7 carruseles (1080×1350), del 5 al 29 de octubre. Está en **/campana/** (`public/campana/index.html`).
- **Noviembre · Cómo mejora tu negocio:** 4 reels, 8 carruseles y 20 historias (1080×1920) con stickers de pregunta, encuesta, quiz, slider y cuenta regresiva, del 2 al 27 de noviembre. Está en **/campana/noviembre/** (`public/campana/noviembre/index.html`).

Los medios de las dos están en `public/campana/media/`.

Todos los reels traen **audio propio**: música original generada por código (sin derechos de autor) y efectos sincronizados con la animación (teclado, transiciones, notificaciones, pops y golpes).

## Calendario de octubre

| Semana | Fecha | Pieza |
| --- | --- | --- |
| 1 · Lanzamiento | Lun 5 oct | Carrusel 1 · Presentamos bookeaa |
| | Mié 7 oct | Reel 1 · ¿Qué es bookeaa? |
| | Vie 9 oct | Carrusel 2 · 5 señales de que tu agenda necesita ayuda |
| 2 · Cómo funciona | Lun 12 oct | Carrusel 3 · Cómo funciona en 3 pasos |
| | Mié 14 oct | Reel 2 · Así reserva tu cliente |
| | Vie 16 oct | Carrusel 4 · Conectado a Google Calendar |
| 3 · Tu marca | Lun 19 oct | Carrusel 5 · 8 estilos para tu página |
| | Mié 21 oct | Reel 3 · Tu marca, tu estilo |
| | Vie 23 oct | Carrusel 6 · Hecho para tu tipo de negocio |
| 4 · Conversión | Mar 27 oct | Reel 4 · Para quién es y cuánto cuesta |
| | Jue 29 oct | Carrusel 7 · Precio y preguntas |

Publicar a las 7:00 p. m. (hora de Caracas).

## Calendario de noviembre

| Semana | Lun | Mié | Vie |
| --- | --- | --- | --- |
| 1 · Así cambia tu día | 2 · Carrusel 8 · Así cambia tu día | 4 · Reel 5 · Un día sin y con bookeaa | 6 · Carrusel 9 · ¿Cuántas horas pierdes agendando? |
| 2 · Tiempo y clientes | 9 · Carrusel 10 · 3 errores que te hacen perder clientes | 11 · Reel 6 · ¿Cuánto tiempo pierdes agendando? | 13 · Carrusel 11 · Por qué tus clientes faltan |
| 3 · Tu link y tu imagen | 16 · Carrusel 12 · Dónde poner tu link | 18 · Reel 7 · Clientes que sí llegan | 20 · Carrusel 13 · Tu negocio se ve más profesional |
| 4 · Activa tu agenda | 23 · Carrusel 14 · Checklist en 1 día | 25 · Reel 8 · Reservas mientras duermes | 27 · Carrusel 15 · Cierre de mes: 1 mes gratis |

Además hay una historia por día hábil (20 en total), cada una con la zona central libre para el sticker. Qué sticker y qué texto lleva cada una está en la página de noviembre y en `historias/historias.js`.

## Cómo está hecho

```
marketing/
  assets/flujo/          capturas reales del flujo de reserva (modo demo)
  video/                 motor de escenas (motor.js), los 8 guiones (videos.js) y estilos
  carruseles/            las 15 publicaciones (carruseles.js) y su plantilla (index.html)
  historias/             las 20 historias de noviembre (historias.js) y su plantilla
  scripts/               capturar, audio, renderizar y publicar en /campana/
  salida/                renders (no se versionan)
```

- **Videos:** cada escena arma su HTML y se anima como función del tiempo. `render-video.mjs` abre la página, pide cada cuadro con `window.seek(t)` y se lo pasa a ffmpeg: el resultado es exacto cuadro a cuadro. Para verlos en el navegador sin renderizar, sirve el repo por http (por ejemplo `npx vite` y abre `/marketing/video/index.html?v=1`); tiene reproductor y barra.
- **Audio:** `scripts/audio.mjs` sintetiza la música (La menor, 116 bpm: bombo, palmas, hi-hats, bajo, pads y arpegio) y los efectos, sin samples ni dependencias. Cada escena registra sus sonidos con `sonido(t, tipo)` o `teclear(desde, duración, letras)`; las transiciones suman los suyos solas. El render mezcla todo con la música de fondo (que baja un poco con cada efecto) y normaliza a -14 LUFS, el nivel de Instagram.
- **Carruseles:** `/marketing/carruseles/index.html` muestra todas las publicaciones en miniatura; con `?c=3&s=2` dibuja una sola lámina.
- **Historias de octubre:** `/marketing/historias/octubre.html` (datos en `historias/octubre.js`): 9 tríos problema → solución → recompensa, uno cada 3 días del 6 al 30 de octubre.
- **Historias:** `/marketing/historias/index.html` las muestra con la zona del sticker marcada; con `?s=4` dibuja una sola (sin marca, como se publica). Las de "nuevo reel" usan la portada del video, así que se renderizan después de los videos.
- **Pantallas de la app:** son capturas reales de la página de reservas en modo demo ("Barbería Norte", estilo moderno, 2 sedes y domicilio). Las plantillas y colores salen de `public/landing/`.

## Marca y cuentas (@bookeaa.app · WhatsApp +58 422 029 8203)

- **Kit de marca:** `/marketing/kit/index.html` es el manual (logo, colores, tipografía, voz, usos incorrectos) y la guía para configurar Instagram y WhatsApp Business, con cada texto listo para copiar.
- **Datos de la marca** (colores, logo, íconos, número, enlaces y destacadas): `marca/marca.js`. **Textos** de Instagram y WhatsApp (menú, respuestas rápidas, etiquetas, catálogo): `kit/textos.js`. Cambia ahí el horario de atención y se actualiza en todos los textos.
- **Piezas:** `/marketing/marca/piezas.html` las muestra todas; con `?p=ig-perfil` dibuja una sola.

## Regenerar

```bash
npm run marketing:capturas     # vuelve a capturar el flujo de reserva (tras cambiar la app)
npm run marketing:videos       # los 8 MP4 con audio en marketing/salida/videos/ (o: … 5 6)
npm run marketing:carruseles   # los JPG en marketing/salida/carruseles/carrusel-N/
npm run marketing:historias    # los JPG en marketing/salida/historias/ (noviembre)
node marketing/scripts/render-historias.mjs --octubre   # los 9 tríos problema → solución → recompensa de octubre
npm run marketing:publicar     # copia todo a public/campana/media/ y arma los ZIP
npm run marketing:tarjetas     # tarjetas de presentación: PDF 96 × 56 mm (90 × 50 + 3 mm de sangrado) y PNG a 600 dpi
npm run marketing:marca        # logos, perfil y destacadas de Instagram, piezas de WhatsApp y textos .md → marketing/salida/marca/
```

Necesita Chromium (`CHROMIUM_PATH`, por defecto `/opt/pw-browsers/chromium`) y, para los videos, un **ffmpeg con libx264** (`FFMPEG_PATH` o `ffmpeg` en el PATH). Para revisar sin renderizar todo: `node marketing/scripts/render-video.mjs 2 --cuadros 1,4.5,9` guarda esos cuadros como PNG.

Para cambiar un texto: los guiones están en `video/videos.js`, las láminas en `carruseles/carruseles.js`, las historias en `historias/historias.js`, y los captions en la página de cada campaña. `marketing:publicar` también necesita ffmpeg (para reducir las láminas) y `zip`.
