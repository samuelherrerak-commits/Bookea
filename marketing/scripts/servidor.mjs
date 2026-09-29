// Servidor estático mínimo para los renders de la campaña. Con file:// Chromium
// bloquea las fuentes por CORS, así que las páginas se sirven por http.
import { createReadStream, existsSync, statSync } from 'node:fs'
import { createServer } from 'node:http'
import { extname, join, normalize } from 'node:path'
import { fileURLToPath } from 'node:url'

export const RAIZ = fileURLToPath(new URL('../..', import.meta.url))
const TIPOS = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.woff': 'font/woff',
}

/** Levanta el servidor en un puerto libre y devuelve { url, cerrar }. */
export async function servir() {
  const server = createServer((req, res) => {
    const ruta = normalize(join(RAIZ, decodeURIComponent(new URL(req.url, 'http://x').pathname)))
    if (!ruta.startsWith(RAIZ) || !existsSync(ruta) || statSync(ruta).isDirectory()) {
      res.writeHead(404).end()
      return
    }
    res.writeHead(200, { 'Content-Type': TIPOS[extname(ruta)] || 'application/octet-stream' })
    createReadStream(ruta).pipe(res)
  })
  await new Promise((r) => server.listen(0, r))
  return { url: `http://localhost:${server.address().port}`, cerrar: () => server.close() }
}
