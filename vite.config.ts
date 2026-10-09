import { createHash } from 'node:crypto'
import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

/**
 * Content-Security-Policy de la app, como <meta> en index.html (solo en el build).
 * Va en el HTML y no como cabecera de Render por dos razones: necesita el hash del
 * script inline de index.html, que cambia con VITE_API_URL/VITE_API_TOKEN, y así no
 * toca las páginas estáticas de /campana/, que tienen sus propios scripts.
 * Lo que no se puede poner en un <meta> (frame-ancestors) va como cabecera en render.yaml.
 */
function csp(apiUrl: string): Plugin {
  let origenApi = ''
  try {
    origenApi = apiUrl ? new URL(apiUrl).origin : ''
  } catch {
    /* URL mal escrita: la app queda en demo igual */
  }
  return {
    name: 'bookeaa-csp',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler(html) {
        const hashes = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(
          (m) => `'sha256-${createHash('sha256').update(m[1]).digest('base64')}'`,
        )
        const politica = [
          "default-src 'self'",
          // accounts.google.com/gsi: "Entrar con Google" de /negocio (Google Identity Services).
          `script-src 'self' ${hashes.join(' ')} https://accounts.google.com/gsi/client`.trim(),
          // sonner y framer-motion escriben estilos en línea.
          "style-src 'self' 'unsafe-inline' https://accounts.google.com/gsi/style",
          'frame-src https://accounts.google.com/gsi/',
          // El logo de cada negocio puede estar en cualquier sitio https.
          "img-src 'self' data: blob: https:",
          "font-src 'self' data:",
          // La página de cada negocio usa su propio manifest como data: URL (src/lib/pwa.ts).
          "manifest-src 'self' data:",
          "worker-src 'self'",
          // Apps Script responde con una redirección a googleusercontent.
          `connect-src ${[...new Set(["'self'", origenApi, 'https://script.google.com', 'https://script.googleusercontent.com', 'https://accounts.google.com/gsi/'])].filter(Boolean).join(' ')}`,
          "object-src 'none'",
          "base-uri 'self'",
          "form-action 'self'",
        ].join('; ')
        return html.replace(/(<meta charset="[^"]*" \/>)/i, `$1\n    <meta http-equiv="Content-Security-Policy" content="${politica}" />`)
      },
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  return {
    plugins: [react(), tailwindcss(), csp(env.VITE_API_URL ?? '')],
    test: {
      environment: 'node',
      include: ['src/**/*.test.ts', 'src/**/*.test.tsx', 'bot/src/**/*.test.ts'],
    },
  }
})
