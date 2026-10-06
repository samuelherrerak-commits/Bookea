# Bookee

El logo de bookeaa animado (el personaje de /ar1), como referencia para hacerlo en 3D.

- `bookee-hoja.png` / `bookee-hoja.pdf`: hoja de personaje con las 6 poses (logo, neutral, feliz,
  enojado, sorpresa, señala) en sus dos versiones de color, las medidas de cada parte en unidades
  de la grilla de 32 del logo (`public/bookeaa.svg`), los colores y notas para modelarlo.
- `hoja.html`: la página que la genera. Usa el mismo personaje y las mismas poses de
  `public/ar1/js/` (personaje.js y guion.js), así que si cambian allá, la hoja cambia igual.

Para verla en vivo: `npm run dev` y abre http://localhost:5173/marketing/bookee/hoja.html
(o cualquier servidor estático en la raíz del repo).

## Bookee feliz

- `bookee-feliz.pdf` / `bookee-feliz.png`: bookee feliz grande en una hoja A4 (300 dpi).
- `bookee-feliz-negro.png` / `bookee-feliz-blanco.png`: solo el personaje con fondo transparente,
  en sus dos versiones de color (negro para fondo claro, blanco como en /ar1).
- `feliz.html`: la página que las genera (`?oscuro` cuerpo blanco, `?solo` sin textos ni fondo).

## 3D

- `3d/bookee-rig.glb`: el modelo 3D de bookee (base_basic_pbr.glb del zip de Drive) aligerado a
  18 000 triángulos y texturas WebP de 1024 (1,4 MB), con esqueleto (cadera, cuerpo, brazos,
  manos, piernas y pies) y tres clips de prueba: `saludo`, `salto` y `correr`.
- `3d/rig.py`: el script de Blender que lo genera desde el modelo original
  (`blender -b --python rig.py -- base_basic_pbr.glb bookee-rig.glb`). Los pesos van por zonas
  medidas en la malla; si cambia el modelo, hay que revisar esas medidas.
- `3d/bookee-prueba.mp4`: los tres clips renderizados con three.js.
