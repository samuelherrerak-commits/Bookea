import '@fontsource-variable/inter'
import '@fontsource/instrument-serif/400.css'
import '@fontsource/instrument-serif/400-italic.css'
import './index.css'

import { MotionConfig } from 'framer-motion'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Toaster } from 'sonner'
import App from './App'
import { readCatalogCache } from './lib/catalogCache'
import { applyBranding } from './lib/theme'
import { slugFromLocation } from './lib/tenant'
import { OrderProvider } from './state/order'

// /campana, /proyeccion, /terminos, /privacidad y /guia-legal son páginas estáticas
// (public/). Si el servidor cae en la app (por ejemplo sin la barra final), se manda al archivo real.
const estatica = window.location.pathname.match(/^\/(campana(?:\/noviembre)?|proyeccion|terminos|privacidad|guia-legal)\/?$/)
if (estatica) window.location.replace(`/${estatica[1]}/index.html`)

const slug = slugFromLocation()
const root = createRoot(document.getElementById('root')!)

// La raíz del dominio (sin /u/<slug>) es la landing de bookeaa. Va en su propio
// chunk para que quien reserva en un negocio no descargue la landing.
if (!slug) {
  void import('./landing/Landing').then(({ default: Landing }) => {
    root.render(
      <StrictMode>
        <MotionConfig reducedMotion="user">
          <Landing />
        </MotionConfig>
      </StrictMode>,
    )
  })
} else {
  // Pinta el color y el nombre del negocio ANTES del primer render. Sin esto hay
  // un frame con los grises de index.css mientras useEffect corre tras el montaje.
  // Es seguro aunque no haya caché: readCatalogCache devuelve null y no hace nada.
  try {
    const cached = readCatalogCache(slug)
    if (cached) applyBranding(cached.config)
  } catch {
    /* el branding llega igual por useEffect en App */
  }

  root.render(
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
}
