/**
 * La conversación del bot como máquina de estados. No toca la red: lo que necesita
 * de afuera (horas libres, agendar, avisar) lo pide a `Servicios`, así se prueba solo.
 *
 * Cada respuesta del bot es UN mensaje (cuenta para los 1.000 gratis del mes).
 * Afiliar pide lo mínimo para cerrar: negocio + Gmail, modalidad, [dirección] y hora.
 * Servicios, precios y horario se toman en la cita de configuración. Ver bot/FLUJOS.md.
 */
import { ATENCION, SOPORTE, T } from './textos'
import { diaCorto, diaLargo, enCaracas, horaLegible, msDeCita } from './tiempo'
import type { Boton, Cita, Conversacion, Entrada, Fila, Salida, Servicios } from './tipos'

export type Resultado = { conv: Conversacion; salidas: Salida[] }

const DIA_MS = 24 * 60 * 60 * 1000
const CORREO = /[^\s@,;:<>()]+@[^\s@,;:<>()]+\.[a-z]{2,}/i
const POR_PAGINA = 9

const texto = (t: string): Salida => ({ tipo: 'texto', texto: t })
const botones = (t: string, b: Boton[]): Salida => ({ tipo: 'botones', texto: t, botones: b })
const lista = (t: string, boton: string, filas: Fila[]): Salida => ({ tipo: 'lista', texto: t, boton, filas })

/** minúsculas y sin acentos, para reconocer palabras escritas a mano. */
export function normalizar(t: string): string {
  return t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
}

/** Corta y limpia lo que escribe el cliente antes de guardarlo. */
function limpio(t: string, max: number): string {
  return t.replace(/[\u0000-\u0008\u000b-\u001f]/g, '').replace(/\s+/g, ' ').trim().slice(0, max)
}

/** "Barbería El Corte, elcorte@gmail.com" → { negocio, correo }. Cualquiera puede faltar. */
export function separarDatos(t: string): { negocio: string; correo: string } {
  const m = CORREO.exec(t)
  const correo = m ? m[0].toLowerCase().replace(/[.]+$/, '') : ''
  const negocio = limpio(
    (m ? t.replace(m[0], ' ') : t)
      .replace(/\b(y\s+)?(mi\s+)?(correo|gmail|email|e-mail)(\s+es)?\b\s*[:=]?|\b(mi negocio( se llama| es)?|se llama|el nombre( es)?|nombre)\b\s*[:=]?|\bes\s*:/gi, ' ')
      .replace(/[,;:\-–|.]+/g, ' ').replace(/\s+y\s*$/i, ''),
    80,
  )
  return { negocio: negocio.length >= 2 ? negocio : '', correo }
}

export function enHorario(ahora: number): boolean {
  const { dia, minutos } = enCaracas(ahora)
  return ATENCION.dias.includes(dia) && minutos >= ATENCION.desde && minutos < ATENCION.hasta
}

/** La cita cuenta como vigente hasta 2 h después de empezar. */
export function citaVigente(cita: Cita | null, ahora: number): cita is Cita {
  return !!cita && msDeCita(cita.fecha, cita.hora) + 2 * 60 * 60 * 1000 > ahora
}

function menu(conv: Conversacion, ahora: number, saludo: string): Salida {
  const filas: Fila[] = [
    { id: 'afiliar', titulo: 'Afiliar mi negocio', descripcion: '1 mes gratis · agenda tu configuración' },
    { id: 'info', titulo: 'Cómo funciona y precio', descripcion: 'Qué incluye y un ejemplo real' },
    { id: 'soporte', titulo: 'Soporte', descripcion: 'Ya tengo bookeaa y necesito ayuda' },
    { id: 'persona', titulo: 'Hablar con una persona' },
  ]
  if (citaVigente(conv.cita, ahora)) filas.unshift({ id: 'mi_cita', titulo: 'Mi cita de configuración', descripcion: 'Ver, cambiar o cancelar' })
  return lista(saludo, 'Ver opciones', filas)
}

export function textoCita(cita: Cita, intro = '¡Listo! ✅ Tu cita de configuración quedó para'): string {
  const cuando = `el *${diaLargo(cita.fecha)}* a las *${horaLegible(cita.hora)}*`
  const cambiar = '\n\nPara cambiarla, escribe *mi cita*.'
  if (cita.modalidad === 'presencial') {
    return `${intro} ${cuando}, *presencial* en:\n${cita.direccion}\n\nTe llegó la invitación al correo. Ese día tomamos tus servicios, precios y horario y dejamos tu página lista.${cambiar}`
  }
  return `${intro} ${cuando}, por *Google Meet*.${cita.meet ? `\n\n${cita.meet}` : ''}\n\nTe llegó la invitación al correo. Ten a mano tus servicios y precios: ese día dejamos tu página lista.${cambiar}`
}

/** Todas las horas libres como una sola lista: "Sáb 10 oct · 9:30 a. m.". */
function filasHoras(conv: Conversacion): { filas: Fila[]; hayMas: boolean } {
  const todas = (conv.datos.dias || []).flatMap((d) => d.horas.map((h) => ({ fecha: d.fecha, hora: h })))
  const desde = (conv.datos.pagina || 0) * POR_PAGINA
  const pagina = todas.slice(desde, desde + POR_PAGINA)
  const hayMas = todas.length > desde + POR_PAGINA
  const filas: Fila[] = pagina.map(({ fecha, hora }) => ({ id: `hora:${fecha}|${hora}`, titulo: `${diaCorto(fecha)} · ${horaLegible(hora)}` }))
  if (hayMas) filas.push({ id: 'mas_horas', titulo: 'Ver más fechas' })
  else if (desde > 0) filas.push({ id: 'primeras_horas', titulo: 'Volver a las primeras' })
  return { filas, hayMas }
}

export async function procesar(original: Conversacion, entrada: Entrada, ahora: number, s: Servicios): Promise<Resultado> {
  const conv: Conversacion = structuredClone(original)
  const salidas: Salida[] = []
  const decir = (x: Salida) => salidas.push(x)
  const listo = () => ({ conv, salidas })

  const crudo = entrada.tipo === 'texto' ? entrada.texto : entrada.tipo === 'imagen' ? entrada.texto || '' : ''
  const t = normalizar(crudo)
  const id = entrada.tipo === 'opcion' ? entrada.id : ''
  const primeraVez = conv.ultimoEntrante === null

  // Más de 24 h sin escribir: se empieza de nuevo y el bot retoma el chat.
  if (conv.ultimoEntrante !== null && ahora - conv.ultimoEntrante > DIA_MS) {
    conv.modo = 'bot'
    conv.paso = 'inicio'
    conv.datos = {}
  }

  const irMenu = (saludo: string) => {
    conv.modo = 'bot'
    conv.paso = 'inicio'
    conv.datos = {}
    decir(menu(conv, ahora, saludo))
    return listo()
  }

  // --- Lo que vale desde cualquier punto ---
  if (id === 'menu' || ['menu', 'inicio', 'volver', 'opciones'].includes(t)) return irMenu(T.menuOtraVez)
  if (conv.modo === 'humano') return listo() // lo atiende una persona desde la bandeja

  let accion = ['afiliar', 'info', 'soporte', 'persona', 'mi_cita'].includes(id) ? id : ''
  if (!accion && (t === 'persona' || t === 'hablar con una persona')) accion = 'persona'
  if (!accion && (t === 'mi cita' || t === 'cita')) accion = 'mi_cita'
  if (!accion && conv.paso === 'inicio' && t && !primeraVez) {
    accion = ({ '1': 'afiliar', '2': 'info', '3': 'soporte', '4': 'persona' } as Record<string, string>)[t] ||
      (/(afili|registr|unirme|inscrib|empezar|quiero (probar|bookeaa|mi pagina))/.test(t) ? 'afiliar'
        : /(precio|cuanto|costo|cuesta|tarifa|plan|como funciona|que es|ejemplo|demo)/.test(t) ? 'info'
          : /(soporte|ayuda|problema|falla|no funciona|error)/.test(t) ? 'soporte' : '')
  }

  switch (accion) {
    case 'afiliar':
      if (citaVigente(conv.cita, ahora)) {
        conv.paso = 'cita_menu'
        decir(botones(textoCita(conv.cita, 'Ya tienes tu cita de configuración para'), botonesCita()))
        return listo()
      }
      conv.datos = { af: {} }
      if (!conv.etiqueta || conv.etiqueta === 'resuelto') conv.etiqueta = 'prospecto'
      conv.paso = 'af_datos'
      decir(texto(T.afDatos))
      return listo()
    case 'info':
      conv.paso = 'inicio'
      decir(botones(T.info, [{ id: 'afiliar', titulo: 'Afiliar mi negocio' }, { id: 'persona', titulo: 'Hablar con alguien' }]))
      return listo()
    case 'soporte':
      conv.datos = { sop: {} }
      conv.paso = 'sop_tema'
      decir(lista(T.sopTema, 'Ver temas', SOPORTE.map(([k, titulo]) => ({ id: 'sop:' + k, titulo }))))
      return listo()
    case 'persona':
      await s.persona(conv).catch(() => undefined)
      conv.modo = 'humano'
      conv.paso = 'inicio'
      conv.datos = {}
      decir(texto(enHorario(ahora) ? T.persona : T.personaFuera))
      return listo()
    case 'mi_cita':
      if (!citaVigente(conv.cita, ahora)) return irMenu('No tienes una cita agendada. ¿En qué te ayudo?')
      conv.paso = 'cita_menu'
      decir(botones(textoCita(conv.cita, 'Tu cita de configuración es'), botonesCita()))
      return listo()
  }

  const af = (conv.datos.af ||= {})
  const sop = (conv.datos.sop ||= {})

  /** Pide las horas libres y las muestra en una sola lista (un mensaje). */
  const ofrecerHoras = async (intro?: string) => {
    let dias
    try {
      dias = (await s.disponibilidad(af.modalidad!)).filter((d) => d.horas.length)
    } catch {
      decir(texto(T.afError))
      return
    }
    if (!dias.length) {
      await s.persona(conv).catch(() => undefined)
      conv.modo = 'humano'
      conv.paso = 'inicio'
      decir(texto(T.afSinHoras))
      return
    }
    conv.datos.dias = dias
    conv.datos.pagina = 0
    conv.paso = 'af_hora'
    decir(lista(intro ? `${intro}` : T.afHoras(af.modalidad!), 'Ver horas', filasHoras(conv).filas))
  }

  const pedirModalidad = () => {
    conv.paso = 'af_modalidad'
    decir(botones(T.afModalidad(af.negocio!), [{ id: 'mod_presencial', titulo: 'Presencial · sábado' }, { id: 'mod_meet', titulo: 'Google Meet' }]))
  }

  switch (conv.paso) {
    case 'inicio':
      decir(menu(conv, ahora, primeraVez || !t ? T.bienvenida(conv.nombre) : T.noEntendi))
      return listo()

    // ---------- Afiliación ----------
    case 'af_datos': {
      const { negocio, correo } = separarDatos(crudo)
      if (negocio) af.negocio = negocio
      if (correo) af.correo = correo
      if (!af.negocio && !af.correo) decir(texto(T.afDatos.slice(T.afDatos.indexOf('Escríbeme'))))
      else if (!af.negocio) decir(texto(T.afFaltaNombre))
      else if (!af.correo) { conv.paso = 'af_correo'; decir(texto(T.afFaltaCorreo(af.negocio))) }
      else pedirModalidad()
      return listo()
    }

    case 'af_correo': {
      const { correo } = separarDatos(crudo)
      if (!correo) decir(texto(T.afCorreoMal))
      else { af.correo = correo; pedirModalidad() }
      return listo()
    }

    case 'af_modalidad':
      if (id === 'mod_presencial' || /(presencial|sabado)/.test(t)) {
        af.modalidad = 'presencial'
        conv.paso = 'af_direccion'
        decir(texto(T.afDireccion))
      } else if (id === 'mod_meet' || /(meet|virtual|video|llamada|online)/.test(t)) {
        af.modalidad = 'meet'
        af.direccion = af.ubicacion = undefined
        await ofrecerHoras()
      } else decir(texto(T.usaBotones))
      return listo()

    case 'af_direccion':
      if (entrada.tipo === 'ubicacion') {
        af.ubicacion = { lat: entrada.lat, lng: entrada.lng }
        af.direccion = limpio([entrada.nombre, entrada.direccion].filter(Boolean).join(', ') ||
          `Ubicación enviada: https://maps.google.com/?q=${entrada.lat},${entrada.lng}`, 300)
        await ofrecerHoras()
      } else if (crudo.trim().length < 5) decir(texto(T.afDireccionCorta))
      else { af.direccion = limpio(crudo, 300); af.ubicacion = undefined; await ofrecerHoras() }
      return listo()

    case 'af_hora':
      if (id === 'mas_horas' || id === 'primeras_horas') {
        conv.datos.pagina = id === 'mas_horas' ? (conv.datos.pagina || 0) + 1 : 0
        decir(lista(T.afHoras(af.modalidad!), 'Ver horas', filasHoras(conv).filas))
        return listo()
      }
      if (!id.startsWith('hora:')) { decir(texto(T.usaBotones)); return listo() }
      {
        // Elegir la hora es confirmar: sin resumen, un mensaje menos.
        const [fecha, hora] = id.slice(5).split('|')
        af.fecha = fecha
        af.hora = hora
        const reprogramando = !!conv.datos.reprogramando && citaVigente(conv.cita, ahora)
        let r
        try {
          r = reprogramando ? await s.reprogramar(conv, conv.cita!, fecha, hora) : await s.agendar(conv, af)
        } catch {
          r = { ok: false as const, motivo: 'error' as const }
        }
        if (r.ok) {
          conv.cita = r.cita
          conv.etiqueta = 'cita'
          conv.paso = 'inicio'
          conv.datos = {}
          decir(texto(textoCita(r.cita, reprogramando ? '¡Listo! ✅ Cambié tu cita para' : undefined)))
        } else if (r.motivo === 'ocupado') await ofrecerHoras(T.afHoraTomada)
        else decir(texto(T.afError))
      }
      return listo()

    // ---------- Cita ya agendada ----------
    case 'cita_menu':
      if (!citaVigente(conv.cita, ahora)) return irMenu(T.menuOtraVez)
      if (id === 'cita_cambiar') {
        conv.datos.reprogramando = true
        af.modalidad = conv.cita.modalidad
        af.direccion = conv.cita.direccion
        await ofrecerHoras()
      } else if (id === 'cita_cancelar') {
        conv.paso = 'cita_cancelar'
        decir(botones('¿Seguro que quieres cancelar tu cita?', [{ id: 'cancelar_si', titulo: 'Sí, cancelar' }, { id: 'cancelar_no', titulo: 'No' }]))
      } else decir(texto(T.usaBotones))
      return listo()

    case 'cita_cancelar':
      if (id === 'cancelar_si' && citaVigente(conv.cita, ahora)) {
        const ok = await s.cancelar(conv, conv.cita).catch(() => false)
        if (ok) {
          conv.cita = null
          conv.etiqueta = 'prospecto'
          conv.paso = 'inicio'
          decir(texto(T.citaCancelada))
        } else decir(texto(T.citaNoCancelada))
        return listo()
      }
      return irMenu(T.menuOtraVez)

    // ---------- Soporte ----------
    case 'sop_tema': {
      const tema = SOPORTE.find(([k]) => 'sop:' + k === id)
      if (!tema) { decir(texto(T.usaBotones)); return listo() }
      sop.tema = tema[1]
      if (tema[0] === 'otro') { conv.paso = 'sop_descripcion'; decir(texto(T.sopDescripcion)) }
      else {
        // Respuesta y pregunta en el mismo mensaje.
        conv.paso = 'sop_resuelto'
        decir(botones(`${tema[2]}\n\n¿Con eso se resolvió?`, [{ id: 'sop_si', titulo: 'Sí, gracias' }, { id: 'sop_no', titulo: 'No, necesito ayuda' }]))
      }
      return listo()
    }

    case 'sop_resuelto':
      if (id === 'sop_si' || /^(si|listo|gracias|ok)/.test(t)) { conv.paso = 'inicio'; conv.datos = {}; decir(texto(T.sopGracias)) }
      else if (id === 'sop_no' || /^no/.test(t)) { conv.paso = 'sop_descripcion'; decir(texto(T.sopDescripcion)) }
      else decir(texto(T.usaBotones))
      return listo()

    case 'sop_descripcion': {
      if (entrada.tipo === 'imagen') sop.captura = entrada.mediaId
      if (crudo.trim().length < 3 && entrada.tipo !== 'imagen') { decir(texto(T.sopDescripcion)); return listo() }
      sop.descripcion = limpio(crudo || '(mandó una captura)', 1500)
      const caso = await s.soporte(conv, sop).catch(() => null)
      conv.modo = 'humano'
      conv.etiqueta = 'soporte'
      conv.paso = 'inicio'
      conv.datos = {}
      decir(texto(T.sopAbierto(caso) + (enHorario(ahora) ? '' : `\n\nAhora estamos fuera de horario (atendemos ${ATENCION.texto}).`)))
      return listo()
    }

    default:
      return irMenu(T.menuOtraVez)
  }
}

function botonesCita(): Boton[] {
  return [
    { id: 'cita_cambiar', titulo: 'Cambiar fecha' },
    { id: 'cita_cancelar', titulo: 'Cancelar cita' },
    { id: 'menu', titulo: 'Menú' },
  ]
}
