# ar2 · La agenda malvada (`/ar2`)

Segunda experiencia en realidad aumentada, sobre el **frente de la tarjeta 2** (logo + *Tu agenda
online*, sin las esquinas de afuera). El QR del dorso abre **https://www.bookeaa.com/ar2/** y la
cámara se abre **de inmediato, sin pantalla inicial**: el navegador pide el permiso y, al apuntar a
la tarjeta **apoyada sobre una mesa**, empieza la historia. 15 s en bucle, sin instalar nada
(Safari en iPhone, Chrome en Android).

| Tiempo | Escena |
|---|---|
| 0–1,5 s | **Algo se mueve**: golpes desde abajo y se abre una grieta en el centro, sobre «bookeaa» |
| 1,5–3,5 s | **La villana rompe la tarjeta**: el papel se rasga, el centro cae al pozo y la agenda malvada sale rugiendo |
| 3,5–5 s | **Bookee le hace frente**: entra caminando por el costado izquierdo de la tarjeta: «¡Oye, tú!» |
| 5–7 s | **Ruge y bookee se asusta**: «¡GRRR!», le tiemblan las piernas y retrocede |
| 7–9,5 s | **Está a punto de comérselo**: tres saltos pesados y se le viene encima con la boca abierta |
| 9,5–11,5 s | **¡Agendado!**: bookee saca su teléfono, destello, y las hojas de la villana se vuelven citas digitales |
| 11,5–13 s | **Se encoge y cae**: queda como una libretita, cae por el hueco y la tarjeta se cierra con la cicatriz |
| 13–15 s | **Su firma**: guiño y pulgar arriba, llueven las citas y late el botón *Prueba 1 mes gratis*; sale corriendo |

- Los personajes están **de pie sobre la tarjeta** y giran para mirar siempre a la cámara; si se
  mira muy desde arriba, se echan un poco hacia atrás para seguir leyéndose.
- El hueco tiene **profundidad real**: se ve el pozo al inclinar el teléfono. Por eso la tarjeta
  tiene que estar sobre una superficie plana (mesa, escritorio): la mesa tapa el pozo alrededor.
- Si la tarjeta sale de cuadro, la animación se **pausa** y aparece *Apunta a la tarjeta*.
- **Plan B**: sin permiso de cámara, sin cámara o en el navegador de otra app, se ve la misma
  historia sobre una tarjeta virtual, con *Reintentar con cámara*. Sin WebGL, la tarjeta y el botón.
- **Sonido** sintetizado (sin archivos). Los navegadores no dejan sonar nada hasta el primer
  toque: arriba aparece *Toca para activar el sonido*. Botón de silencio; en Android vibra con
  los rugidos y los golpes.

Personajes: el nuevo bookee y la villana de `marketing/bookee/` (bocetos `bookee-nuevo-boceto` y
`agenda-boceto`), armados en `public/ar2/js/personajes.js`. Guion gráfico: `ar2-guion.png`.
Vista previa en video (sin cámara): `ar2-vista-previa.mp4`.

## Probarlo

| Qué | Cómo |
|---|---|
| **En tu teléfono, antes de publicar** | `npm ci` y luego `npm run ar:probar -- --experiencia ar2`. Abre un túnel HTTPS gratuito y muestra un QR en la terminal: escanéalo. Pon la tarjeta (o `bookeaa-ar2-frente.png` impreso) sobre la mesa. Ctrl+C para cerrar. |
| **Revisar el guion sin tarjeta** | `/ar2/?prueba`: play/pausa, las 8 escenas, velocidad y línea de tiempo. Teclado: espacio, ← → (Mayús = 1 s), 1–8. También `&t=9.3`, `&escena=6`, `&pausa`. En el Plan B se puede arrastrar la tarjeta. |
| **Todo el flujo AR sin teléfono** | `npm run ar:verificar -- --experiencia ar2`: cámara falsa con la tarjeta en Chromium. Comprueba que la reconoce, la pausa, que retoma, el Plan B y el peso. Capturas en `marketing/salida/ar2/`. |
| **En el teléfono, datos técnicos** | `/ar2/?debug` (FPS y seguimiento) y los mismos ajustes finos de ar1 (`&proceso`, `&minCF`, `&beta`, `&suavizado`). |
| **Tests** | `npm test` (`src/ar2.test.ts`): las 8 escenas, que el bucle empalme, que la villana salga del centro y bookee entre por el costado, los sonidos, que no haya pantalla inicial y el peso (< 3 MB). |

## Cambiar cosas

- **Globos, citas y mensajes**: `public/ar2/js/textos.js`.
- **Tiempos, recorridos y gestos**: `public/ar2/js/guion.js` (`disposicion()` tiene todas las
  posiciones en mm: el hueco, dónde se para cada uno, por dónde entra bookee).
- **Los personajes**: `public/ar2/js/personajes.js`. El hueco, las citas y los globos: `utileria.js`.
- **Si cambias el frente de la tarjeta**: `npm run ar:objetivo -- --experiencia ar2`.
- **Si cambias la URL del QR**: `marketing/scripts/ar-experiencias.mjs` y
  `npm run ar:imprenta -- --experiencia ar2`.

## Antes de imprimir

1. **No cambies el frente** después de compilar el objetivo (`public/ar2/tarjeta.mind`).
2. Manda a la imprenta `bookeaa-ar2-tarjeta.pdf` (frente y dorso, 96 × 56 mm con 3 mm de sangrado;
   también están los PNG a 600 dpi). El frente va **sin las esquinas** de afuera.
3. **Acabado mate**: el brillo y el foil reflejan la luz y la cámara deja de reconocer el frente.
4. **QR en 100 % negro (K)**, de 20 mm o más (mide 30 mm con su margen blanco, que no se recorta).
   Abre `https://www.bookeaa.com/ar2/` (comprobado leyendo el SVG y el dorso).
5. **Imprime una prueba** y pruébala en un iPhone y un Android, con distinta luz, apoyada en la mesa.
   Este frente es minimalista (mucho blanco): tiene menos detalle que la tarjeta 1 para que la
   cámara se ancle, así que funciona mejor con buena luz, sin sombras encima y a unos 20–30 cm.
