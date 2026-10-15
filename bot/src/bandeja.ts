/**
 * Bandeja web: ver los chats, responder a mano, devolver el chat al bot, etiquetar,
 * mandar plantillas y configurar el perfil. Entra con BANDEJA_CLAVE.
 */
import type { Env } from './index'
import { bloqueado, guardarMensaje, limpiarFallos, listarChats, mensajesDe, registrarFallo, sumarUso, usoDelMes } from './db'
import { crearSesion, igual, sesionValida } from './firma'
import { actualizarPerfil, crearPlantilla, cuerpoMensaje, descargarMedia, enviar, plantillasDeMeta } from './whatsapp'
import { MARCA } from './textos'
import { PAGINA, LOGIN } from './bandejaHtml'

const DIA_MS = 24 * 60 * 60 * 1000
const COOKIE = 'bk_bandeja'

export const ETIQUETAS: [string, string][] = [
  ['prospecto', 'Nuevo prospecto'],
  ['cita', 'Cita de afiliación'],
  ['prueba', 'Prueba gratis'],
  ['pago', 'Pendiente de pago'],
  ['activo', 'Cliente activo'],
  ['soporte', 'Soporte abierto'],
  ['resuelto', 'Soporte resuelto'],
]

/** Plantillas para escribir fuera de las 24 h (Meta las aprueba y se cobran). Costos aprox. Venezuela, oct-2026. */
export const PLANTILLAS = [
  {
    name: 'seguimiento_prospecto', category: 'MARKETING', costo: 0.074, campos: ['Nombre'],
    texto: 'Hola {{1}} 👋 Te escribimos de bookeaa. ¿Seguimos con tu página de reservas? El primer mes es gratis y después son $10 al mes. Responde a este mensaje y te ayudamos a dejarla lista.',
    ejemplo: ['Ana'],
  },
  {
    name: 'fin_prueba', category: 'UTILITY', costo: 0.0113, campos: ['Nombre', 'Fecha en que termina'],
    texto: 'Hola {{1}}, tu mes gratis de bookeaa termina el {{2}}. Para seguir con tu página de reservas el plan es de $10 al mes. Responde a este mensaje y te pasamos los datos de pago.',
    ejemplo: ['Ana', '15 de noviembre'],
  },
  {
    name: 'recordatorio_pago', category: 'UTILITY', costo: 0.0113, campos: ['Nombre', 'Fecha de vencimiento'],
    texto: 'Hola {{1}}, tu plan de bookeaa vence el {{2}}. El pago del mes es de $10. Responde a este mensaje y te pasamos los datos para pagar.',
    ejemplo: ['Ana', '30 de noviembre'],
  },
]

export const PERFIL = {
  about: 'Reservas online para tu negocio · 1 mes gratis',
  description:
    'Reservas online para negocios que trabajan con citas: barberías, uñas, estética, spa, consultorios y más. Tus clientes reservan 24/7 desde tu página, la cita cae en tu Google Calendar y te llega por WhatsApp. 1 mes gratis, luego $10 al mes.',
  websites: [MARCA.web, MARCA.instagram],
  vertical: 'PROF_SERVICES',
}

const json = (datos: unknown, status = 200) =>
  new Response(JSON.stringify(datos), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } })

function html(cuerpo: string, extra: Record<string, string> = {}) {
  return new Response(cuerpo, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
      'Content-Security-Policy':
        "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'",
      'X-Frame-Options': 'DENY',
      'Referrer-Policy': 'no-referrer',
      ...extra,
    },
  })
}

function cookie(req: Request, nombre: string): string | undefined {
  return (req.headers.get('cookie') || '').split(/;\s*/).map((c) => c.split('=')).find(([k]) => k === nombre)?.[1]
}

export async function manejarBandeja(req: Request, env: Env, ahora = Date.now()): Promise<Response> {
  const url = new URL(req.url)
  const ruta = url.pathname.replace(/\/+$/, '') || '/bandeja'
  const ip = req.headers.get('cf-connecting-ip') || 'local'

  if (ruta === '/bandeja/entrar' && req.method === 'POST') {
    if (await bloqueado(env.DB, ip, ahora)) return html(LOGIN('Demasiados intentos. Espera 15 minutos.'), {}, )
    const form = await req.formData()
    const clave = String(form.get('clave') || '')
    if (!env.BANDEJA_CLAVE || env.BANDEJA_CLAVE.length < 12 || !igual(clave, env.BANDEJA_CLAVE)) {
      await registrarFallo(env.DB, ip, ahora)
      return html(LOGIN('Clave incorrecta.'))
    }
    await limpiarFallos(env.DB, ip)
    const sesion = await crearSesion(env.BANDEJA_CLAVE, ahora)
    return new Response(null, {
      status: 303,
      headers: { Location: '/bandeja', 'Set-Cookie': `${COOKIE}=${sesion}; Path=/bandeja; HttpOnly; Secure; SameSite=Strict; Max-Age=${30 * 24 * 3600}` },
    })
  }

  const dentro = await sesionValida(env.BANDEJA_CLAVE, cookie(req, COOKIE), ahora)
  if (ruta === '/bandeja') return html(dentro ? PAGINA : LOGIN(''))
  if (!dentro) return json({ error: 'Tu sesión venció. Recarga la página.' }, 401)

  if (ruta === '/bandeja/salir' && req.method === 'POST') {
    return new Response(null, { status: 303, headers: { Location: '/bandeja', 'Set-Cookie': `${COOKIE}=; Path=/bandeja; HttpOnly; Secure; SameSite=Strict; Max-Age=0` } })
  }

  const media = ruta.match(/^\/bandeja\/media\/([\w.-]+)$/)
  if (media) {
    try {
      const { bytes, mime } = await descargarMedia(env, media[1])
      return new Response(bytes, { headers: { 'Content-Type': mime, 'Cache-Control': 'private, max-age=86400' } })
    } catch {
      return new Response('No disponible', { status: 404 })
    }
  }

  if (!ruta.startsWith('/bandeja/api/')) return json({ error: 'No encontrado' }, 404)
  // Las escrituras exigen esta cabecera: un formulario de otro sitio no puede ponerla.
  if (req.method !== 'GET' && req.headers.get('x-bandeja') !== '1') return json({ error: 'Prohibido' }, 403)
  try {
    return await api(req, env, ruta.slice('/bandeja/api'.length), ahora)
  } catch (err) {
    return json({ error: String((err as Error).message || err) }, 500)
  }
}

async function api(req: Request, env: Env, ruta: string, ahora: number): Promise<Response> {
  const db = env.DB
  const cuerpo = req.method === 'POST' ? ((await req.json().catch(() => ({}))) as any) : {}

  if (ruta === '/chats' && req.method === 'GET') {
    const etiqueta = new URL(req.url).searchParams.get('etiqueta') || ''
    return json({ chats: await listarChats(db, etiqueta), ahora })
  }

  if (ruta === '/ajustes' && req.method === 'GET') {
    let plantillas: unknown[] = []
    let errorPlantillas = ''
    try {
      plantillas = await plantillasDeMeta(env)
    } catch (err) {
      errorPlantillas = String((err as Error).message)
    }
    return json({ uso: await usoDelMes(db, ahora), plantillas, errorPlantillas, definidas: PLANTILLAS, etiquetas: ETIQUETAS })
  }

  if (ruta === '/perfil' && req.method === 'POST') {
    const correo = String(cuerpo.correo || '').trim()
    await actualizarPerfil(env, { ...PERFIL, ...(correo ? { email: correo } : {}) })
    return json({ ok: true })
  }

  if (ruta === '/plantillas' && req.method === 'POST') {
    const resultados = []
    for (const p of PLANTILLAS) {
      try {
        await crearPlantilla(env, {
          name: p.name, language: 'es', category: p.category,
          components: [{ type: 'BODY', text: p.texto, example: { body_text: [p.ejemplo] } }],
        })
        resultados.push({ name: p.name, ok: true })
      } catch (err) {
        resultados.push({ name: p.name, ok: false, error: String((err as Error).message) })
      }
    }
    return json({ resultados })
  }

  const chat = ruta.match(/^\/chats\/(\d{6,20})(\/[a-z]+)?$/)
  if (!chat) return json({ error: 'No encontrado' }, 404)
  const tel = chat[1]
  const accion = chat[2] || ''
  const conv = await db.prepare('SELECT telefono, nombre, modo, etiqueta, ultimo_entrante, cita, paso FROM conversaciones WHERE telefono = ?').bind(tel).first<any>()
  if (!conv) return json({ error: 'Ese chat no existe' }, 404)

  if (!accion && req.method === 'GET') {
    await db.prepare('UPDATE conversaciones SET sin_leer = 0 WHERE telefono = ?').bind(tel).run()
    return json({ conv, mensajes: await mensajesDe(db, tel), ahora })
  }

  if (accion === '/responder' && req.method === 'POST') {
    const texto = String(cuerpo.texto || '').trim().slice(0, 4096)
    if (!texto) return json({ error: 'Escribe un mensaje.' }, 400)
    if (!conv.ultimo_entrante || ahora - conv.ultimo_entrante > DIA_MS) {
      return json({ error: 'Pasaron más de 24 h desde su último mensaje: solo puedes mandar una plantilla.' }, 409)
    }
    const wamid = await enviar(env, cuerpoMensaje(tel, { tipo: 'texto', texto }))
    await guardarMensaje(db, { telefono: tel, sentido: 'out', autor: 'equipo', tipo: 'texto', texto, wamid, creado: ahora })
    await sumarUso(db, ahora, 'servicio')
    // Responder a mano toma el chat: el bot se calla hasta que se lo devuelvas.
    await db.prepare("UPDATE conversaciones SET modo = 'humano', ultimo_mensaje = ?, resumen = ?, sin_leer = 0 WHERE telefono = ?")
      .bind(ahora, texto.slice(0, 140), tel).run()
    return json({ ok: true })
  }

  if (accion === '/plantilla' && req.method === 'POST') {
    const p = PLANTILLAS.find((x) => x.name === cuerpo.nombre)
    if (!p) return json({ error: 'Esa plantilla no existe.' }, 400)
    const valores: string[] = (Array.isArray(cuerpo.valores) ? cuerpo.valores : []).map((v: unknown) => String(v || '').trim().slice(0, 60))
    if (valores.length !== p.campos.length || valores.some((v) => !v)) return json({ error: 'Completa todos los campos de la plantilla.' }, 400)
    const wamid = await enviar(env, {
      messaging_product: 'whatsapp', to: tel, type: 'template',
      template: { name: p.name, language: { code: 'es' }, components: [{ type: 'body', parameters: valores.map((text) => ({ type: 'text', text })) }] },
    })
    const texto = p.texto.replace(/\{\{(\d)\}\}/g, (_, n) => valores[Number(n) - 1])
    await guardarMensaje(db, { telefono: tel, sentido: 'out', autor: 'equipo', tipo: 'plantilla', texto, wamid, creado: ahora })
    await sumarUso(db, ahora, 'plantillas')
    await db.prepare('UPDATE conversaciones SET ultimo_mensaje = ?, resumen = ? WHERE telefono = ?').bind(ahora, texto.slice(0, 140), tel).run()
    return json({ ok: true })
  }

  if (accion === '/modo' && req.method === 'POST') {
    const modo = cuerpo.modo === 'bot' ? 'bot' : 'humano'
    await db.prepare(modo === 'bot'
      ? "UPDATE conversaciones SET modo = 'bot', paso = 'inicio', datos = '{}' WHERE telefono = ?"
      : "UPDATE conversaciones SET modo = 'humano' WHERE telefono = ?").bind(tel).run()
    return json({ ok: true })
  }

  if (accion === '/etiqueta' && req.method === 'POST') {
    const etiqueta = ETIQUETAS.some(([k]) => k === cuerpo.etiqueta) ? cuerpo.etiqueta : ''
    await db.prepare('UPDATE conversaciones SET etiqueta = ? WHERE telefono = ?').bind(etiqueta, tel).run()
    return json({ ok: true })
  }

  if (accion === '/cerrar' && req.method === 'POST') {
    await db.prepare(
      "UPDATE conversaciones SET modo = 'bot', paso = 'inicio', datos = '{}', sin_leer = 0, etiqueta = CASE WHEN etiqueta = 'soporte' THEN 'resuelto' ELSE etiqueta END WHERE telefono = ?",
    ).bind(tel).run()
    return json({ ok: true })
  }

  return json({ error: 'No encontrado' }, 404)
}
