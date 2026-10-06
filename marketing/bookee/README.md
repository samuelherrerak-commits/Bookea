# Bookee

El logo de bookeaa animado (el personaje de /ar1), como referencia para hacerlo en 3D.

- `bookee-hoja.png` / `bookee-hoja.pdf`: hoja de personaje con las 6 poses (logo, neutral, feliz,
  enojado, sorpresa, señala) en sus dos versiones de color, las medidas de cada parte en unidades
  de la grilla de 32 del logo (`public/bookeaa.svg`), los colores y notas para modelarlo.
- `hoja.html`: la página que la genera. Usa el mismo personaje y las mismas poses de
  `public/ar1/js/` (personaje.js y guion.js), así que si cambian allá, la hoja cambia igual.

Para verla en vivo: `npm run dev` y abre http://localhost:5173/marketing/bookee/hoja.html
(o cualquier servidor estático en la raíz del repo).
