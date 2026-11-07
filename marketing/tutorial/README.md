# Tutorial · Configura tu página de reservas

Video vertical (1080×1920, 30 fps, unos 2 minutos) para mandarle a cada negocio nuevo. Explica paso a paso cómo dejar lista su página desde **bookeaa.com/negocio**. No tiene voz: todo se explica en pantalla, con capturas reales de Mi negocio en el teléfono, una marca sobre lo que hay que tocar y el dedo tocando.

**Los 9 pasos:**
1. Entrar con Google.
2. Mi página: nombre, título, logo, estilo y color, y cómo la ven los clientes.
3. Servicios.
4. Horario.
5. Lugar.
6. WhatsApp y cobros.
7. Días libres.
8. Link y QR.
9. Avisos y el día a día: confirmar pagos, reagendar y cancelar.

## Cómo está hecho

```
marketing/tutorial/
  src/guion.js         escenas, textos y tiempos (lo leen el video y el audio)
  src/Telefono.tsx     teléfono con la captura, cámara que se acerca, foco y dedo
  src/Textos.tsx       paso, barra de progreso, título y la explicación de cada momento
  src/Tutorial.tsx     composición, intro y cierre
  src/tema.ts          colores, curvas y medidas (identidad de bookeaa)
  public/capturas/     capturas reales + capturas.json (dónde está cada cosa)
  scripts/audio.mjs    música y efectos sincronizados (sintetizados, sin derechos)
```

- **Capturas:** `marketing/scripts/capturar-negocio.mjs`.
  - Abre Mi negocio en modo demo como un negocio individual recién afiliado (`/negocio?demo=individual`).
  - Usa 390×844 a 3x, en español de Venezuela.
  - Abre la app bajo `www.bookeaa.com`, para que el link y el QR digan la dirección real.
  - Guarda cada pantalla y la posición de lo que el video señala.
- **Cambiar un texto o el orden:** se edita `src/guion.js` y se vuelve a renderizar. Los tiempos del audio salen del mismo guion.

## Renderizar

```bash
# 1. Capturas (solo si cambió la app)
npx vite build
__VITE_ADDITIONAL_SERVER_ALLOWED_HOSTS=www.bookeaa.com npx vite preview --port 4173 &
node marketing/scripts/capturar-negocio.mjs

# 2. Video
cd marketing/tutorial
npm install
npm run render     # → marketing/salida/tutorial/configura-tu-pagina.mp4
npm run studio     # para verlo y ajustarlo en el navegador
```
