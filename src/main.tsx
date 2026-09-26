import '@fontsource-variable/inter'
import '@fontsource/instrument-serif/400.css'
import '@fontsource/instrument-serif/400-italic.css'
import './index.css'

import { MotionConfig } from 'framer-motion'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Toaster } from 'sonner'
import App from './App'
import { DEFAULT_SHOP } from './config'
import { readCatalogCache } from './lib/catalogCache'
import { applyBranding } from './lib/theme'
import { shopPath, slugFromLocation } from './lib/tenant'
import { OrderProvider } from './state/order'

const slug = slugFromLocation()

// Quien abre la raíz del dominio no trae /u/<slug>. El rewrite de Render sirve
// index.html en cualquier ruta, así que llegamos hasta acá y nos vamos al
// negocio por defecto. Va antes del render para que nadie vea el catálogo vacío.
// Un replace a una ruta que ya estamos no recargaría la página, así que se
// comprueba el destino antes: el ?shop= de la URL también cuenta como "ya estoy".
if (!slug) {
  const destino = shopPath(DEFAULT_SHOP)
  if (destino) window.location.replace(destino)
}

// Pinta el color y el nombre del negocio ANTES del primer render. Sin esto hay
// un frame con los grises de index.css mientras useEffect corre tras el montaje.
// Es seguro aunque no haya caché: readCatalogCache devuelve null y no hace nada.
try {
  const cached = slug ? readCatalogCache(slug) : null
  if (cached) applyBranding(cached.config)
} catch {
  /* el branding llega igual por useEffect en App */
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MotionConfig reducedMotion="user">
      <OrderProvider>
        <App />
        <Toaster
          position="top-center"
          offset={16}
          toastOptions={{
            style: {
              background: 'var(--color-ink)',
              color: 'var(--color-bg)',
              border: 'none',
              borderRadius: '9999px',
              fontFamily: 'var(--font-sans)',
              fontSize: '14px',
              padding: '12px 18px',
            },
          }}
        />
      </OrderProvider>
    </MotionConfig>
  </StrictMode>,
)
