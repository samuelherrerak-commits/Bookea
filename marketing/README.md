# Campaña de lanzamiento · bookeaa

Primera campaña de Instagram: **4 reels (1080×1920)** y **7 carruseles (1080×1350)**, del 5 al 29 de octubre de 2026, con el estilo audaz de la marca. El plan completo (público, calendario, guiones, textos para publicar, respuesta por WhatsApp y descargas) está en el sitio, en **/campana/** (por ejemplo https://bookea-bkga.onrender.com/campana/). Es la página `public/campana/index.html`; los medios están en `public/campana/media/`. No aparece en buscadores (`noindex`), pero cualquiera con el enlace la puede abrir.

## Calendario

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

Publicar a las 7:00 p. m. (hora de Caracas). Los reels van sin voz: al subirlos, agrega un audio en tendencia de ritmo marcado.

## Cómo está hecho

```
marketing/
  assets/flujo/          capturas reales del flujo de reserva (modo demo)
  video/                 motor de escenas (motor.js), los 4 guiones (videos.js) y estilos
  carruseles/            las 7 publicaciones (carruseles.js) y su plantilla (index.html)
  scripts/               capturar, renderizar videos y carruseles
  salida/                renders (no se versionan)
```

- **Videos:** cada escena arma su HTML y se anima como función del tiempo. `render-video.mjs` abre la página, pide cada cuadro con `window.seek(t)` y se lo pasa a ffmpeg: el resultado es exacto cuadro a cuadro. Para verlos en el navegador sin renderizar, sirve el repo por http (por ejemplo `npx vite` y abre `/marketing/video/index.html?v=1`); tiene reproductor y barra.
- **Carruseles:** `/marketing/carruseles/index.html` muestra las 7 publicaciones en miniatura; con `?c=3&s=2` dibuja una sola lámina.
- **Pantallas de la app:** son capturas reales de la página de reservas en modo demo ("Barbería Norte", estilo moderno, 2 sedes y domicilio). Las plantillas y colores salen de `public/landing/`.

## Regenerar

```bash
npm run marketing:capturas     # vuelve a capturar el flujo de reserva (tras cambiar la app)
npm run marketing:videos       # los 4 MP4 en marketing/salida/videos/ (o: … 1 3)
npm run marketing:carruseles   # los JPG en marketing/salida/carruseles/carrusel-N/
```

Necesita Chromium (`CHROMIUM_PATH`, por defecto `/opt/pw-browsers/chromium`) y, para los videos, un **ffmpeg con libx264** (`FFMPEG_PATH` o `ffmpeg` en el PATH). Para revisar sin renderizar todo: `node marketing/scripts/render-video.mjs 2 --cuadros 1,4.5,9` guarda esos cuadros como PNG.

Para cambiar un texto: los guiones están en `video/videos.js`, las láminas en `carruseles/carruseles.js`, y los captions en la página de la campaña.
