// Servidor estático de public/ para probar las experiencias de realidad aumentada en local,
// con las mismas reglas que Render: /ar1 redirige a /ar1/ (igual con cualquier carpeta), las
// carpetas sirven su index.html y la cabecera de cámara es la de producción (camera=(self)).
// Lo usan ar-probar.mjs y ar-verificar.mjs.

import { createReadStream, existsSync, statSync } from 'node:fs'
import { createServer } from 'node:http'
import { extname, join, normalize, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

export const PUBLICO = fileURLToPath(new URL('../../public', import.meta.url))
const TIPOS = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.mind': 'application/octet-stream',
}

/** Levanta el servidor (puerto libre si `puerto` es 0) y devuelve { url, puerto, cerrar }. */
export async function servirPublico({ puerto = 0, host = '127.0.0.1' } = {}) {
  const server = createServer((req, res) => {
    const ruta = decodeURIComponent(new URL(req.url, 'http://x').pathname)
    let archivo = normalize(join(PUBLICO, ruta))
    if (archivo !== PUBLICO && !archivo.startsWith(PUBLICO + sep)) {
      res.writeHead(403).end()
      return
    }
    if (existsSync(archivo) && statSync(archivo).isDirectory()) {
      if (!ruta.endsWith('/')) {
        res.writeHead(301, { Location: `${ruta}/` }).end()
        return
      }
      archivo = join(archivo, 'index.html')
    }
    if (!existsSync(archivo)) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('No existe')
      return
    }
    res.writeHead(200, {
      'Content-Type': TIPOS[extname(archivo)] || 'application/octet-stream',
      'Cache-Control': 'no-store',
      'Permissions-Policy': 'camera=(self), microphone=(), geolocation=(), payment=(), usb=()',
    })
    createReadStream(archivo).pipe(res)
  })
  await new Promise((listo) => server.listen(puerto, host, listo))
  const { port } = server.address()
  return { url: `http://${host === '0.0.0.0' ? 'localhost' : host}:${port}`, puerto: port, cerrar: () => server.close() }
}
