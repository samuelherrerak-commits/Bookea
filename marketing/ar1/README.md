# ar1 · Primera animación en realidad aumentada (`/ar1`)

La primera experiencia, guardada como **ar1**: reconoce la **tarjeta 1** (*Tu agenda, sin libreta*).
El QR del dorso de su tarjeta abre **https://www.bookeaa.com/ar1/**. Al tocar **"Ver en realidad
aumentada"** se abre la cámara; al apuntar al **frente** de la tarjeta (el lado negro, *Tu agenda,
sin libreta*), el logo impreso cobra vida encima de ella: 15 s en bucle y sin instalar nada
(Safari en iPhone, Chrome en Android).

| Tiempo | Escena |
|---|---|
| 0–2,2 s | **Despertar**: el logo calza sobre el impreso, abre los ojos, le salen brazos y piernas y salta del hueco |
| 2,2–5 s | **Ataque**: caen libretas y una agenda de papel; dos patadas y un pisotón las vuelven confeti |
| 5–7,8 s | **Llamada**: suena un teléfono, lo atiende y con la otra mano anota la cita. *¡Agendado!* |
| 7,8–12,8 s | **Funciones**: 7 frases salen disparadas de la tarjeta y se apilan arriba |
| 12,8–15 s | **Cierre**: señala el botón *Prueba 1 mes gratis* (→ https://bookeaa.com), saluda y vuelve al hueco |

- Si la tarjeta sale de cuadro, la animación se **pausa** y aparece *Apunta a la tarjeta*.
- **Plan B**: si niegan la cámara o el teléfono no es compatible, se ve la misma animación sobre
  una tarjeta virtual, con el mismo botón. Sin WebGL se muestra la tarjeta y las frases.
- Sonido sintetizado en el navegador (sin archivos) con botón de silencio; el teléfono vibra en
  Android cuando suena el de la animación.

## Probarlo

| Qué | Cómo |
|---|---|
| **En tu teléfono, antes de publicar** | `npm ci` y luego `npm run ar:probar -- --experiencia ar1`. Abre un túnel HTTPS gratuito (Cloudflare, sin cuenta) y muestra un QR en la terminal: escanéalo con el teléfono. Sin la tarjeta impresa, abre `marketing/ar1/bookeaa-ar1-frente.png` en la pantalla del computador (brillo alto) y apunta ahí. Ctrl+C para cerrar el túnel. |
| **Revisar el guion sin tarjeta** | `/ar1/?prueba` (en el túnel o en `http://localhost:5180/ar1/?prueba`). Controles: play/pausa, escenas 1–5, velocidad, línea de tiempo. Teclado: espacio, ← → (Mayús = 1 s), 1–5. También `&t=8.2`, `&escena=3`, `&pausa`. |
| **Todo el flujo AR sin teléfono** | `npm run ar:verificar -- --experiencia ar1`: cámara falsa con la tarjeta en Chromium; comprueba que la reconoce, que pausa al perderla, que retoma, el Plan B y el peso. Capturas en `marketing/salida/ar1/`. |
| **En el teléfono, datos técnicos** | `/ar1/?debug`: FPS y estado del seguimiento. Ajustes finos: `&proceso=640` (px con que trabaja MindAR), `&minCF=0.001&beta=100` (filtro de MindAR), `&suavizado=22`. |
| **Tests** | `npm test` (`src/ar1.test.ts`) revisa el guion (12–15 s, el bucle empalma, las 7 frases), el largo de las líneas, el peso (< 3 MB) y que `render.yaml` deje usar la cámara. |

Si no arranca el túnel: instala cloudflared (`brew install cloudflared` · `winget install
Cloudflare.cloudflared`) o usa otro túnel HTTPS (ngrok) al puerto que muestra el script.
Otra opción es el *preview* de Render de un pull request, que tiene las mismas cabeceras que producción.

## Cambiar cosas

- **Frases, cita, globo, mensajes**: `public/ar1/js/textos.js` (máx. 2 líneas de 22 caracteres).
- **Tiempos y movimientos**: `public/ar1/js/guion.js`.
- **Si cambias el frente de la tarjeta**: `npm run ar:objetivo -- --experiencia ar1`. Renderiza el
  frente desde `marketing/tarjetas/index.html`, mide dónde quedó el logo y recompila
  `public/ar1/tarjeta.mind` con el compilador de MindAR en Chromium (unos segundos).
- **Si cambias la URL del QR o la tarjeta**: `marketing/scripts/ar-experiencias.mjs` y
  `npm run ar:imprenta -- --experiencia ar1`.

Si alguna vez el compilador de la terminal falla, el `.mind` se hace a mano: abre
https://hiukim.github.io/mind-ar-js-doc/tools/compile, sube `marketing/ar1/objetivo.png`, toca
*Start*, descarga `targets.mind` y guárdalo como `public/ar1/tarjeta.mind`.

## Antes de imprimir

1. **No cambies el frente** después de compilar el objetivo. Si lo cambias, `npm run ar:objetivo -- --experiencia ar1`.
2. Manda a la imprenta `bookeaa-ar1-tarjeta.pdf` (frente y dorso, 96 × 56 mm con 3 mm de sangrado;
   también están los PNG a 600 dpi) o, si el diseño lo arma otra persona, `bookeaa-ar1-qr.svg`/`.pdf`.
3. **Acabado mate.** El brillo o laminado brillante y el foil reflejan la luz y la cámara deja de
   reconocer el frente (en una tarjeta negra se nota más).
4. Pide el **QR en 100 % negro (K)**, sin negro enriquecido, y no lo achiques de 20 mm
   (en el diseño mide 30 mm con su margen blanco, que no hay que recortar).
5. **Imprime una prueba** y antes del tiraje escanea el QR con un iPhone y un Android
   (debe abrir `https://www.bookeaa.com/ar1/`) y prueba la realidad aumentada con luz de día y
   con luz de interior.
6. Después de publicar: `curl -sI https://www.bookeaa.com/ar1/` debe mostrar
   `permissions-policy: camera=(self), …`.

## Cómo está hecho

- **Página estática** en `public/ar1/` (igual que `/campana`), con las librerías y fuentes en
  `public/ar-comun/` (compartidas con las experiencias que vienen): no pasa por React ni por el build de
  Vite, así que three.js y MindAR se cargan solo aquí. Antes de tocar el botón baja ~0,3 MB;
  MindAR (~0,3 MB) y el objetivo (0,37 MB) se precargan mientras se lee la pantalla inicial.
  En total ~0,95 MB transferidos (3,4 MB sin comprimir: 2,2 MB son MindAR con TensorFlow.js).
- **MindAR 1.2.5** (la última, de enero de 2024) para reconocer la tarjeta. Se usa su `Controller`
  con una integración propia con **three.js 0.186.1** (`camara-ar.js`): la integración de MindAR
  importa `sRGBEncoding`, que three.js quitó en la 0.162, y con el three.js actual no carga.
  Se evaluó el motor open source de 8th Wall (MIT desde 2026): es más preciso pero pesa 4,9 MB y
  está en pre-release.
- Las librerías están **copiadas** en `public/ar-comun/vendor/` (con su licencia MIT), no instaladas por
  npm: el paquete de MindAR depende de `canvas`, un módulo nativo que puede romper `npm ci` en Render.
- **El personaje** es el ícono de `public/bookeaa.svg` armado con geometría (mismas medidas de su
  grilla de 32), sin imágenes ni modelos. Las capas van a distintas alturas sobre la tarjeta y en
  el lugar del logo impreso se abre un hueco con profundidad real (máscara de profundidad).
- **Render** (`render.yaml`): `Permissions-Policy` pasó de `camera=()` a `camera=(self)` (antes
  Chrome bloqueaba la cámara en todo el sitio), `/ar1` redirige a `/ar1/` y `/ar-comun/vendor/*`
  tiene caché larga. `src/main.tsx` también manda `/ar1` a la página estática, como con `/campana`.

| Archivo | Qué hace |
|---|---|
| `public/ar1/index.html` | pantallas, estilos y botón fijo |
| `public/ar1/js/app.js` | flujo: inicio → AR / Plan B / prueba, bucle y sonidos |
| `public/ar1/js/camara-ar.js` | cámara, MindAR y la cámara de three.js |
| `public/ar1/js/escena.js` | render, encuadre del Plan B y la mano que apunta al botón |
| `public/ar1/js/personaje.js` | el logo como personaje |
| `public/ar1/js/utileria.js` | tarjeta con hueco, libretas, confeti, teléfono, cita, globo y frases |
| `public/ar1/js/guion.js` | los 15 s |
| `public/ar1/js/textos.js` | todo el texto |
| `public/ar1/js/sonido.js` | efectos de sonido sintetizados |
| `public/ar1/js/formas.js` | colores de la marca y formas base |
| `public/ar1/tarjeta.mind` · `.json` · `.webp` | objetivo, posición del logo y miniatura (de `ar:objetivo`) |
| `marketing/ar1/` | QR y tarjeta para imprenta, y la imagen objetivo |
| `public/ar-comun/` | three.js, MindAR y las fuentes Barlow, compartidas |
| `marketing/scripts/ar-*.mjs` | objetivo, imprenta, túnel de prueba, verificación y servidor local (`--experiencia`) |

### Actualizar las librerías

```sh
npm pack three@0.186.1 mind-ar@1.2.5   # en una carpeta temporal, y descomprimir
npx esbuild package/build/three.core.js   --minify --format=esm --legal-comments=inline --outfile=public/ar-comun/vendor/three-0.186.1/three.core.js
npx esbuild package/build/three.module.js --minify --format=esm --legal-comments=inline --outfile=public/ar-comun/vendor/three-0.186.1/three.module.js
# MindAR: copiar tal cual dist/mindar-image.prod.js, dist/controller-mGt1s8dJ.js y dist/ui-fBadYuor.js
```

Si cambia la versión, cambia también el nombre de la carpeta (la caché es inmutable) y las rutas
en `formas.js`, `camara-ar.js` y `marketing/scripts/ar-experiencias.mjs`. SHA-256 de las copias actuales:

```
98a90806c01077a46fc5a3daddc6441ac9d61c5b85b3cc09d3f0b2087d228713  mind-ar-1.2.5/controller-mGt1s8dJ.js
a21eef9a98ed73aee589a219b35e580c50b501c6f50f88d6eed16dcef9b8dec2  mind-ar-1.2.5/mindar-image.prod.js
aed9538fec28fecfb0a564da48fbf053ac2549d3314746e67182d381b3a24c31  mind-ar-1.2.5/ui-fBadYuor.js
c001a388abbe69583ddd66e9dc18098df55fa81d06bcc5a5722efb6c7f522dc8  three-0.186.1/three.core.js
1a31b9dfcadf81f5c832d20c7c2dfc36f290cdaf179da7338b8b1a121f20470b  three-0.186.1/three.module.js
```
