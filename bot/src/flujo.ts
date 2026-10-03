/**
 * La conversación del bot como máquina de estados. No toca la red: lo que necesita
 * de afuera (horas libres, agendar, avisar) lo pide a `Servicios`, así se prueba solo.
 */
import { ATENCION, RUBROS, SOPORTE, T } from './textos'
import { diaCorto, diaLargo, enCaracas, horaLegible, msDeCita } from './tiempo'
import type { Afiliacion, Boton, Cita, Conversacion, Entrada, Fila, Paso, Salida, Servicios } from './tipos'

export type Resultado = { conv: Conversacion; salidas: Salida[] }

const DIA_MS = 24 * 60 * 60 * 1000
const CORREO = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i
const GMAIL = /@(gmail|googlemail)\.com$/i

const texto = (t: string): Salida => ({ tipo: 'texto', texto: t })
const botones = (t: string, b: Boton[]): Salida => ({ tipo: 'botones', texto: t, botones: b })
const lista = (t: string, boton: string, filas: Fila[]): Salida => ({ tipo: 'lista', texto: t, boton, filas })

/** minúsculas y sin acentos, para reconocer palabras escritas a mano. */
export function normalizar(t: string): string {
  return t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
}

/** Corta y limpia lo que escribe el cliente antes de guardarlo. */
function limpio(t: string, max: number): string {
  return t.replace(/[\u0000-\u0008\u000b-\u001f]/g, '').replace(/[ \t]+/g, ' ').trim().slice(0, max)
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
    { id: 'afiliar', titulo: 'Afiliar mi negocio', descripcion: 'Agenda tu cita de configuración' },
    { id: 'precios', titulo: 'Precios y prueba gratis', descripcion: '1 mes gratis, luego $10 al mes' },
    { id: 'soporte', titulo: 'Soporte', descripcion: 'Ya tengo bookeaa y necesito ayuda' },
    { id: 'como', titulo: 'Cómo funciona', descripcion: 'Y un ejemplo real' },
    { id: 'persona', titulo: 'Hablar con una persona' },
  ]
  if (citaVigente(conv.cita, ahora)) filas.unshift({ id: 'mi_cita', titulo: 'Mi cita de afiliación', descripcion: 'Ver, cambiar o cancelar' })
  return lista(saludo, 'Ver opciones', filas)
}

function resumen(af: Afiliacion, reprogramando: boolean): Salida {
  const cuando = af.fecha && af.hora ? `el *${diaLargo(af.fecha)}* a las *${horaLegible(af.hora)}*` : ''
  const donde = af.modalidad === 'presencial' ? `presencial en: ${af.direccion}` : 'por Google Meet'
  if (reprogramando) {
    return botones(`Tu cita pasaría a ${cuando}, ${donde}. ¿La cambio?`, [
      { id: 'confirmar', titulo: 'Sí, cambiarla' },
      { id: 'otra_fecha', titulo: 'Otra fecha' },
    ])
  }
  const servicios = (af.servicios || '').length > 300 ? af.servicios!.slice(0, 300) + '…' : af.servicios
  return botones(
    'Revisa que todo esté bien 👇\n\n' +
      `🏷️ *Negocio:* ${af.negocio}\n📂 *Rubro:* ${af.rubro}\n💈 *Servicios:*\n${servicios}\n` +
      `🕘 *Horario:* ${af.horario}\n✉️ *Correo:* ${af.correo}\n🖼️ *Logo:* ${af.logo ? 'recibido' : 'sin logo'}\n\n` +
      `📅 *Cita de configuración:* ${cuando}, ${donde}.`,
    [
      { id: 'confirmar', titulo: 'Confirmar' },
      { id: 'corregir', titulo: 'Corregir datos' },
      { id: 'otra_fecha', titulo: 'Otra fecha' },
    ],
  )
}

export function textoCita(cita: Cita, intro = '¡Listo! ✅ Tu cita de configuración e inducción quedó para'): string {
  const cuando = `el *${diaLargo(cita.fecha)}* a las *${horaLegible(cita.hora)}*`
  if (cita.modalidad === 'presencial') {
    return `${intro} ${cuando}, *presencial* en:\n${cita.direccion}\n\nTe llegó la invitación a tu correo con recordatorio. Ten a mano tus servicios, precios y tu logo.`
  }
  return `${intro} ${cuando}, por *Google Meet*.\n\n${cita.meet ? `Enlace: ${cita.meet}\n\n` : ''}También te llegó la invitación a tu correo con recordatorio.`
}

const CAMPOS: [string, string, Paso][] = [
  ['negocio', 'Nombre del negocio', 'af_nombre'],
  ['rubro', 'Rubro', 'af_rubro'],
  ['servicios', 'Servicios', 'af_servicios'],
  ['horario', 'Horario', 'af_horario'],
  ['correo', 'Correo', 'af_correo'],
  ['logo', 'Logo', 'af_logo'],
  ['modalidad', 'Presencial o Meet', 'af_modalidad'],
]

/** El mensaje que pide el dato de cada paso (para preguntar o volver a preguntar). */
function pedir(paso: Paso, conv: Conversacion): Salida {
  const af = conv.datos.af || {}
  switch (paso) {
    case 'af_nombre': return texto('¿Cómo se llama tu negocio?')
    case 'af_rubro': return lista(T.afRubro(af.negocio || 'tu negocio'), 'Elegir rubro', RUBROS.map(([id, t]) => ({ id: 'rubro:' + id, titulo: t })))
    case 'af_rubro_otro': return texto(T.afRubroOtro)
    case 'af_servicios': return texto(T.afServicios)
    case 'af_horario': return texto(T.afHorario)
    case 'af_correo': return texto(T.afCorreo)
    case 'af_logo': return botones(T.afLogo, [{ id: 'saltar_logo', titulo: 'Saltar' }])
    case 'af_modalidad': return botones(T.afModalidad, [{ id: 'mod_presencial', titulo: 'Presencial · sábado' }, { id: 'mod_meet', titulo: 'Google Meet' }])
    case 'af_direccion': return texto(T.afDireccion)
    default: return texto(T.usaBotones)
  }
}

function filasDias(conv: Conversacion): Fila[] {
  return (conv.datos.dias || []).slice(0, 10).map((d) => ({
    id: 'dia:' + d.fecha,
    titulo: diaCorto(d.fecha),
    descripcion: d.horas.length === 1 ? '1 hora libre' : `${d.horas.length} horas libres`,
  }))
}

export async function procesar(original: Conversacion, entrada: Entrada, ahora: number, s: Servicios): Promise<Resultado> {
  const conv: Conversacion = structuredClone(original)
  const salidas: Salida[] = []
  const decir = (...x: Salida[]) => salidas.push(...x)
  const listo = () => ({ conv, salidas })

  const crudo = entrada.tipo === 'texto' ? entrada.texto : ''
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
  if (id === 'menu' || ['menu', 'inicio', 'volver', 'opciones', 'cancelar todo'].includes(t)) return irMenu(T.menuOtraVez)
  if (conv.modo === 'humano') return listo() // lo atiende una persona desde la bandeja

  const opcionesMenu: Record<string, string> = {
    '1': 'afiliar', '2': 'precios', '3': 'soporte', '4': 'como', '5': 'persona', persona: 'persona', 'hablar con una persona': 'persona',
  }
  let accion = ['afiliar', 'precios', 'soporte', 'como', 'persona', 'mi_cita'].includes(id) ? id : ''
  if (!accion && (t === 'persona' || t === 'hablar con una persona')) accion = 'persona'
  if (!accion && conv.paso === 'inicio' && t) {
    accion = opcionesMenu[t] ||
      (/(afili|registr|unirme|inscrib|quiero (probar|bookeaa|mi pagina))/.test(t) ? 'afiliar'
        : /(precio|cuanto|costo|cuesta|tarifa|plan)/.test(t) ? 'precios'
          : /(soporte|ayuda|problema|falla|no funciona|error)/.test(t) ? 'soporte'
            : /(como funciona|que es|ejemplo|demo)/.test(t) ? 'como' : '')
  }

  switch (accion) {
    case 'afiliar': {
      if (citaVigente(conv.cita, ahora)) {
        conv.paso = 'cita_menu'
        decir(botones(textoCita(conv.cita, 'Ya tienes tu cita de configuración agendada para'), botonesCita()))
        return listo()
      }
      conv.datos = { af: {} }
      if (!conv.etiqueta || conv.etiqueta === 'resuelto') conv.etiqueta = 'prospecto'
      conv.paso = 'af_nombre'
      decir(texto(T.afInicio))
      return listo()
    }
    case 'precios':
    case 'como':
      conv.paso = 'inicio'
      decir(botones(accion === 'precios' ? T.precios : T.como, [{ id: 'afiliar', titulo: 'Afiliar mi negocio' }, { id: 'menu', titulo: 'Ver menú' }]))
      return listo()
    case 'soporte':
      conv.datos = { sop: {} }
      conv.paso = 'sop_negocio'
      decir(texto(T.sopNegocio))
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

  /** Después de un dato: siguiente paso, o directo al resumen si se estaba corrigiendo. */
  const siguiente = (paso: Paso) => {
    if (conv.datos.volverAResumen && af.fecha) {
      conv.paso = 'af_confirmar'
      decir(resumen(af, false))
    } else {
      conv.paso = paso
      decir(pedir(paso, conv))
    }
  }

  const pedirDias = async (intro?: string) => {
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
      decir(texto(T.afSinDias))
      return
    }
    conv.datos.dias = dias.slice(0, 10)
    conv.paso = 'af_dia'
    decir(lista(intro ? `${intro}\n\n${T.afDia(af.modalidad!)}` : T.afDia(af.modalidad!), 'Ver días', filasDias(conv)))
  }

  const pedirHoras = (fecha: string, intro?: string) => {
    const dia = (conv.datos.dias || []).find((d) => d.fecha === fecha)
    if (!dia) return pedirDias()
    conv.paso = 'af_hora'
    const filas: Fila[] = dia.horas.slice(0, 9).map((h) => ({ id: `hora:${fecha}|${h}`, titulo: horaLegible(h) }))
    filas.push({ id: 'otro_dia', titulo: 'Ver otros días' })
    decir(lista(intro ? `${intro}\n\n${T.afHora(diaCorto(fecha))}` : T.afHora(diaCorto(fecha)), 'Ver horas', filas))
  }

  switch (conv.paso) {
    case 'inicio':
      decir(menu(conv, ahora, primeraVez || !t ? T.bienvenida(conv.nombre) : T.noEntendi))
      return listo()

    // ---------- Afiliación ----------
    case 'af_nombre':
      if (crudo.trim().length < 2) decir(texto(T.afNombreCorto))
      else { af.negocio = limpio(crudo, 80); siguiente('af_rubro') }
      return listo()

    case 'af_rubro':
      if (id.startsWith('rubro:')) {
        const r = RUBROS.find(([k]) => 'rubro:' + k === id)
        if (r && r[0] === 'otro') { conv.paso = 'af_rubro_otro'; decir(texto(T.afRubroOtro)) }
        else { af.rubro = r ? r[1] : 'Otro'; siguiente('af_servicios') }
      } else if (crudo.trim().length >= 3) { af.rubro = limpio(crudo, 80); siguiente('af_servicios') }
      else decir(pedir('af_rubro', conv))
      return listo()

    case 'af_rubro_otro':
      if (crudo.trim().length < 2) decir(texto(T.afRubroOtro))
      else { af.rubro = limpio(crudo, 80); siguiente('af_servicios') }
      return listo()

    case 'af_servicios':
      if (entrada.tipo === 'imagen') {
        // Una foto de la lista de precios también sirve.
        af.servicios = limpio(`${entrada.texto || ''} (foto de la lista de servicios)`, 1500)
        af.serviciosFoto = entrada.mediaId
        siguiente('af_horario')
      } else if (crudo.trim().length < 5) decir(texto(T.afServiciosCorto))
      else { af.servicios = limpio(crudo, 1500); siguiente('af_horario') }
      return listo()

    case 'af_horario':
      if (crudo.trim().length < 3) decir(texto(T.afHorario))
      else { af.horario = limpio(crudo, 200); siguiente('af_correo') }
      return listo()

    case 'af_correo': {
      const correo = crudo.trim().toLowerCase()
      if (!CORREO.test(correo) || correo.length > 120) decir(texto(T.afCorreoMal))
      else if (GMAIL.test(correo)) { af.correo = correo; siguiente('af_logo') }
      else {
        af.correo = correo
        conv.paso = 'af_correo_confirmar'
        decir(botones(T.afCorreoNoGmail(correo), [{ id: 'correo_ok', titulo: 'Sí, es de Google' }, { id: 'correo_otro', titulo: 'Escribir otro' }]))
      }
      return listo()
    }

    case 'af_correo_confirmar':
      if (id === 'correo_ok') siguiente('af_logo')
      else if (id === 'correo_otro') { af.correo = undefined; conv.paso = 'af_correo'; decir(texto(T.afCorreo)) }
      else decir(texto(T.usaBotones))
      return listo()

    case 'af_logo':
      if (entrada.tipo === 'imagen') {
        af.logo = entrada.mediaId
        af.sinLogo = false
        decir(texto(T.afLogoRecibido))
        siguiente('af_modalidad')
      } else if (id === 'saltar_logo' || /^(no|saltar|no tengo|sin logo|luego|despues)\b/.test(t)) {
        af.logo = undefined
        af.sinLogo = true
        siguiente('af_modalidad')
      } else decir(pedir('af_logo', conv))
      return listo()

    case 'af_modalidad':
      if (id === 'mod_presencial' || /(presencial|sabado)/.test(t)) {
        af.modalidad = 'presencial'
        af.fecha = af.hora = undefined
        conv.paso = 'af_direccion'
        decir(texto(af.direccion ? `${T.afDireccion}\n\n(La última que me diste: ${af.direccion})` : T.afDireccion))
      } else if (id === 'mod_meet' || /(meet|virtual|video|llamada|online)/.test(t)) {
        af.modalidad = 'meet'
        af.direccion = undefined
        af.ubicacion = undefined
        af.fecha = af.hora = undefined
        await pedirDias()
      } else decir(pedir('af_modalidad', conv))
      return listo()

    case 'af_direccion':
      if (entrada.tipo === 'ubicacion') {
        af.ubicacion = { lat: entrada.lat, lng: entrada.lng }
        af.direccion = limpio([entrada.nombre, entrada.direccion].filter(Boolean).join(', ') ||
          `Ubicación enviada (${entrada.lat.toFixed(5)}, ${entrada.lng.toFixed(5)})`, 300)
        await pedirDias()
      } else if (crudo.trim().length < 5) decir(texto(T.afDireccionCorta))
      else { af.direccion = limpio(crudo, 300); af.ubicacion = undefined; await pedirDias() }
      return listo()

    case 'af_dia':
      if (id.startsWith('dia:')) pedirHoras(id.slice(4))
      else decir(lista(T.usaBotones, 'Ver días', filasDias(conv)))
      return listo()

    case 'af_hora':
      if (id.startsWith('hora:')) {
        const [fecha, hora] = id.slice(5).split('|')
        af.fecha = fecha
        af.hora = hora
        conv.paso = 'af_confirmar'
        decir(resumen(af, !!conv.datos.reprogramando))
      } else if (id === 'otro_dia') {
        conv.paso = 'af_dia'
        decir(lista(T.afDia(af.modalidad!), 'Ver días', filasDias(conv)))
      } else decir(texto(T.usaBotones))
      return listo()

    case 'af_confirmar':
      if (id === 'confirmar') {
        const reprogramando = !!conv.datos.reprogramando && citaVigente(conv.cita, ahora)
        let r
        try {
          r = reprogramando
            ? await s.reprogramar(conv, conv.cita!, af.fecha!, af.hora!)
            : await s.agendar(conv, af)
        } catch {
          r = { ok: false as const, motivo: 'error' as const }
        }
        if (r.ok) {
          conv.cita = r.cita
          conv.etiqueta = 'cita'
          conv.paso = 'inicio'
          conv.datos = {}
          decir(texto(textoCita(r.cita, reprogramando ? '¡Listo! ✅ Cambié tu cita para' : undefined)))
        } else if (r.motivo === 'ocupado') {
          await pedirDias(T.afHoraTomada)
        } else decir(texto(T.afError))
      } else if (id === 'corregir') {
        conv.paso = 'af_corregir'
        decir(lista(T.afCorregir, 'Elegir dato', CAMPOS.map(([k, titulo]) => ({ id: 'fix:' + k, titulo }))))
      } else if (id === 'otra_fecha') {
        await pedirDias()
      } else decir(texto(T.usaBotones))
      return listo()

    case 'af_corregir': {
      const campo = CAMPOS.find(([k]) => 'fix:' + k === id)
      if (!campo) { decir(texto(T.usaBotones)); return listo() }
      conv.datos.volverAResumen = true
      conv.paso = campo[2]
      decir(pedir(campo[2], conv))
      return listo()
    }

    // ---------- Cita ya agendada ----------
    case 'cita_menu':
      if (!citaVigente(conv.cita, ahora)) return irMenu(T.menuOtraVez)
      if (id === 'cita_cambiar') {
        conv.datos.reprogramando = true
        af.modalidad = conv.cita.modalidad
        af.direccion = conv.cita.direccion
        af.fecha = af.hora = undefined
        await pedirDias()
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
    case 'sop_negocio':
      if (crudo.trim().length < 2) decir(texto(T.sopNegocio))
      else {
        sop.negocio = limpio(crudo, 120)
        conv.paso = 'sop_tema'
        decir(lista(T.sopTema, 'Ver temas', SOPORTE.map(([k, titulo]) => ({ id: 'sop:' + k, titulo }))))
      }
      return listo()

    case 'sop_tema': {
      const tema = SOPORTE.find(([k]) => 'sop:' + k === id)
      if (!tema) { decir(lista(T.usaBotones, 'Ver temas', SOPORTE.map(([k, titulo]) => ({ id: 'sop:' + k, titulo })))); return listo() }
      sop.tema = tema[1]
      if (tema[0] === 'otro') { conv.paso = 'sop_descripcion'; decir(texto(T.sopDescripcion)) }
      else {
        conv.paso = 'sop_resuelto'
        decir(texto(tema[2]), botones(T.sopResuelto, [{ id: 'sop_si', titulo: 'Sí, gracias' }, { id: 'sop_no', titulo: 'No, necesito ayuda' }]))
      }
      return listo()
    }

    case 'sop_resuelto':
      if (id === 'sop_si' || /^(si|listo|gracias|ok)/.test(t)) { conv.paso = 'inicio'; conv.datos = {}; decir(texto(T.sopGracias)) }
      else if (id === 'sop_no' || /^no/.test(t)) { conv.paso = 'sop_descripcion'; decir(texto(T.sopDescripcion)) }
      else decir(texto(T.usaBotones))
      return listo()

    case 'sop_descripcion':
      if (crudo.trim().length < 3 && entrada.tipo !== 'imagen') { decir(texto(T.sopDescripcion)); return listo() }
      if (entrada.tipo === 'imagen') { sop.captura = entrada.mediaId; sop.descripcion = limpio(entrada.texto || '(mandó una captura)', 1500) }
      else sop.descripcion = limpio(crudo, 1500)
      if (sop.captura) return abrirCaso()
      conv.paso = 'sop_captura'
      decir(botones(T.sopCaptura, [{ id: 'sin_captura', titulo: 'Enviar sin captura' }]))
      return listo()

    case 'sop_captura':
      if (entrada.tipo === 'imagen') sop.captura = entrada.mediaId
      else if (crudo.trim().length >= 3) sop.descripcion = limpio(`${sop.descripcion}\n${crudo}`, 1500)
      return abrirCaso()

    default:
      return irMenu(T.menuOtraVez)
  }

  async function abrirCaso(): Promise<Resultado> {
    const caso = await s.soporte(conv, sop).catch(() => null)
    conv.modo = 'humano'
    conv.etiqueta = 'soporte'
    conv.paso = 'inicio'
    conv.datos = {}
    decir(texto(T.sopAbierto(caso) + (enHorario(ahora) ? '' : `\n\nAhora estamos fuera de horario (atendemos ${ATENCION.texto}).`)))
    return listo()
  }
}

function botonesCita(): Boton[] {
  return [
    { id: 'cita_cambiar', titulo: 'Cambiar fecha' },
    { id: 'cita_cancelar', titulo: 'Cancelar cita' },
    { id: 'menu', titulo: 'Menú' },
  ]
}
