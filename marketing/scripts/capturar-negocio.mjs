// Capturas reales de Mi negocio en el teléfono para el video tutorial (marketing/tutorial).
//
// Abre la app en modo demo como un negocio individual recién afiliado (?demo=individual),
// a 390×844 con densidad 3 (1170×2532, como un iPhone), en español de Venezuela, y bajo
// www.bookeaa.com para que el link y el QR digan la dirección real. Por cada pantalla guarda
// el JPG y, en capturas.json, dónde está cada cosa que el video señala (en px de la pantalla).
//
//   npx vite build && npx vite preview --port 4173 &
//   node marketing/scripts/capturar-negocio.mjs
import { writeFile } from 'node:fs/promises'
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs'

const SALIDA = new URL('../tutorial/public/capturas/', import.meta.url).pathname
const SITIO = 'http://www.bookeaa.com'
const b = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium',
  args: ['--host-resolver-rules=MAP www.bookeaa.com 127.0.0.1:4173', '--lang=es-VE'],
  // El campo de fecha usa el formato del sistema: dd/mm/aaaa como en un teléfono en español.
  env: { ...process.env, LANG: 'es_VE.UTF-8', LANGUAGE: 'es_VE:es', LC_ALL: 'es_VE.UTF-8' },
})
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, locale: 'es-VE', timezoneId: 'America/Caracas' })
let pg = await ctx.newPage()
const errores = []
pg.on('pageerror', (e) => errores.push(e.message))
const datos = {}

const caja = async (loc) => {
  const r = await loc.first().boundingBox({ timeout: 3000 }).catch(() => null)
  return r ? { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) } : null
}
/** Guarda la pantalla tal como está y las cajas de `marcas` ({nombre: locator}). */
async function foto(nombre, marcas = {}) {
  await pg.waitForTimeout(500)
  const cajas = {}
  for (const [k, loc] of Object.entries(marcas)) {
    cajas[k] = await caja(loc)
    if (!cajas[k]) console.warn(`  ${nombre}: no encontré ${k}`)
  }
  await pg.screenshot({ path: `${SALIDA}${nombre}.jpg`, type: 'jpeg', quality: 92 })
  datos[nombre] = cajas
  console.log('✓', nombre)
}
/** Lleva el elemento a `y` px desde arriba de la pantalla (la app hace scroll en la ventana). */
async function scrollA(loc, y = 120) {
  const r = await loc.first().boundingBox()
  await pg.evaluate((d) => window.scrollBy(0, d), r.y - y)
  await pg.waitForTimeout(350)
}
const abrir = async (seccion) => {
  await pg.getByRole('button', { name: seccion }).first().click()
  await pg.waitForTimeout(900)
}
const volver = async () => {
  await pg.getByRole('button', { name: 'Configurar' }).first().click()
  await pg.waitForTimeout(600)
  await pg.evaluate(() => window.scrollTo(0, 0))
}
const nav = (t) => pg.locator('nav[aria-label="Secciones"]').last().getByRole('button', { name: t })

// 1. Entrar. En la demo el botón dice "Entrar (demo)"; en la app real es el de Google.
await pg.goto(`${SITIO}/negocio?demo=individual`)
await pg.waitForTimeout(1200)
await pg.getByText('Entrar (demo)').evaluate((el) => { el.textContent = 'Entrar con Google' })
await foto('entrar', { boton: pg.getByText('Entrar con Google') })
await pg.getByText('Entrar con Google').click()
await pg.waitForTimeout(1400)

// 2. Hoy.
await foto('hoy', { hero: pg.locator('section').first(), configurar: nav('Configurar'), avisos: nav('Avisos') })

// 3. Configurar.
await nav('Configurar').click()
await pg.waitForTimeout(900)
const fila = (t) => pg.getByRole('button', { name: t })
await foto('configurar', { pagina: fila(/Mi página/), servicios: fila(/Servicios/), horario: fila(/Horario/), lugar: fila(/Lugar/), cobros: fila(/Cobros a tus clientes/), libres: fila(/Días libres/), qr: fila(/Código QR/) })

// 4. Mi página: nombre y textos, logo, estilo y color, guardar.
await abrir(/Mi página/)
await foto('pagina-1', { vista: pg.getByText('Vista previa').first(), nombre: pg.getByLabel(/Nombre de tu negocio/), titulo: pg.getByLabel(/Título grande/) })
// La vista previa queda fija arriba (hasta ~400 px): el logo va justo debajo.
await scrollA(pg.getByText('Logo', { exact: true }), 425)
await foto('pagina-2', { logo: pg.getByText('Subir logo'), estilos: pg.getByRole('button', { name: 'Moderno' }), colores: pg.getByText('Color', { exact: true }) })
await pg.getByRole('button', { name: 'Audaz' }).first().click()
await pg.waitForTimeout(500)
await foto('pagina-3', { estilo: pg.getByRole('button', { name: 'Audaz' }), guardar: pg.getByRole('button', { name: 'Guardar cambios' }) })
// Así la ven sus clientes: la vista previa a pantalla completa, con el estilo recién elegido.
await pg.getByRole('button', { name: /Ver en grande/ }).click()
await pg.waitForTimeout(1500)
// La demo de la página trae servicios de uñas; ?rubro=barberia pone los de una barbería.
await pg.locator('iframe[title*="pantalla completa"]').evaluate((f) => { f.contentWindow.location.replace(f.src + (f.src.includes('?') ? '&' : '?') + 'rubro=barberia') })
await pg.waitForTimeout(3500)
await foto('cliente-1', { cerrar: pg.getByRole('button', { name: 'Seguir editando' }) })
const marco = await (await pg.locator('iframe[title*="pantalla completa"]').elementHandle()).contentFrame()
await marco.evaluate(() => window.scrollTo(0, 560))
await pg.waitForTimeout(900)
await foto('cliente-2')
await pg.getByRole('button', { name: 'Seguir editando' }).click()
await pg.waitForTimeout(600)
await pg.getByRole('button', { name: 'Guardar cambios' }).click()
await pg.waitForTimeout(1200)
await foto('pagina-guardado', { guardar: pg.getByRole('button', { name: /Guardado/ }) })
await volver()

// 5. Servicios.
await abrir(/Servicios/)
await foto('servicios-1', { primero: pg.locator('input[value="Corte"]').locator('xpath=ancestor::div[contains(@class,"rounded-3xl")][1]') })
await scrollA(pg.getByRole('button', { name: /Agregar servicio/ }), 520)
await foto('servicios-2', { agregar: pg.getByRole('button', { name: /Agregar servicio/ }), adicional: pg.getByText('Es un adicional').last() })
await volver()

// 6. Horario.
await abrir(/Horario/)
await foto('horario-1', { lunes: pg.getByText('Lunes', { exact: true }).locator('xpath=ancestor::div[contains(@class,"rounded-3xl")][1]') })
await scrollA(pg.getByText('Horas cada (min)'), 220)
await foto('horario-2', { agenda: pg.getByText('Horas cada (min)').locator('xpath=ancestor::div[contains(@class,"rounded-3xl")][1]') })
await volver()

// 7. Lugar.
await abrir(/Lugar/)
await foto('lugar', { sede: pg.getByText('Dirección', { exact: true }).locator('xpath=ancestor::div[contains(@class,"rounded-3xl")][1]'), domicilio: pg.getByText('También atiendo a domicilio') })
await volver()

// 8. Cobros a tus clientes.
await abrir(/Cobros a tus clientes/)
await foto('cobros-1', { whatsapp: pg.getByText('WhatsApp que recibe las reservas').locator('xpath=..'), moneda: pg.getByText('Moneda de tus precios').locator('xpath=..') })
await scrollA(pg.getByText('Cómo te pagan', { exact: false }).first(), 110)
await foto('cobros-2', { metodos: pg.getByText('Pago en la cita').locator('xpath=ancestor::div[contains(@class,"rounded-3xl")][1]'), pagomovil: pg.getByText('Banco', { exact: true }).locator('xpath=ancestor::div[contains(@class,"rounded-3xl")][1]') })
await volver()

// 9. Días libres.
await abrir(/Días libres/)
await foto('libres', { dia: pg.getByText('Motivo (solo lo ves tú)').locator('xpath=ancestor::div[contains(@class,"rounded-3xl")][1]'), agregar: pg.getByRole('button', { name: /Agregar día libre/ }) })
await volver()

// 10. Código QR.
await abrir(/Código QR/)
await foto('qr', { link: pg.getByText('Tu link').locator('xpath=..'), cartel: pg.locator('canvas').first(), descargar: pg.getByRole('button', { name: /Descargar/ }) })
await volver()

// 11. Avisos. Los avisos (Web Push) solo existen en un origen seguro: http://www.bookeaa.com
// de la captura no lo es, así que esta pantalla (que no muestra el link) va en localhost.
const local = await ctx.newPage()
await local.goto('http://localhost:4173/negocio?demo=individual')
await local.waitForTimeout(1000)
await local.getByText('Entrar (demo)').click()
await local.waitForTimeout(1200)
await local.locator('nav[aria-label="Secciones"]').last().getByRole('button', { name: 'Avisos' }).click()
await local.waitForTimeout(1200)
const principal = pg
pg = local
await foto('avisos', { activar: pg.getByRole('button', { name: /Activar avisos/ }), app: pg.getByText('Tenla como app').locator('xpath=..') })

pg = principal
// 12. Hoy con las citas: confirmar pago, reagendar y cancelar.
await nav('Hoy').click()
await pg.waitForTimeout(900)
await scrollA(pg.getByText('Carlos Méndez'), 150)
await foto('hoy-citas', { pago: pg.getByRole('button', { name: 'Pago recibido' }), reagendar: pg.getByRole('button', { name: 'Reagendar' }).nth(1), cancelar: pg.getByRole('button', { name: 'Cancelar' }).nth(1) })

await writeFile(`${SALIDA}capturas.json`, JSON.stringify({ ancho: 390, alto: 844, pantallas: datos }, null, 2))
if (errores.length) console.log('errores de la página:', errores)
await b.close()
