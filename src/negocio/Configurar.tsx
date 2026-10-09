import { useEffect, useRef, useState, type ReactNode } from 'react'
import { formatTime12 } from '../lib/format'
import { LUGAR_TIPOS } from '../lib/lugar'
import { ESTILO_DEF, ESTILOS, PALETAS } from '../lib/theme'
import * as api from './api'
import { dibujarQr, linkDelNegocio, MODOS_QR, PLANTILLAS_QR, type ModoQr, type PlantillaQr } from './qr'

/**
 * Configurar (Mi negocio): lo mismo que la ventana de la hoja, desde el teléfono.
 * Cada sección guarda en la hoja del negocio y la página lo muestra en la próxima carga.
 */

type Id = 'servicios' | 'horario' | 'bloqueos' | 'cupones' | 'qr' | 'pagina' | 'lugar' | 'pagos' | 'mensaje' | 'ticket'

const SECCIONES: { id: Id; titulo: string; detalle: string; icono: string }[] = [
  { id: 'servicios', titulo: 'Servicios', detalle: 'Nombre, precio y duración', icono: '✂️' },
  { id: 'horario', titulo: 'Horario', detalle: 'Días y horas de atención', icono: '🕘' },
  { id: 'bloqueos', titulo: 'Días libres', detalle: 'Vacaciones, feriados, permisos', icono: '🌴' },
  { id: 'cupones', titulo: 'Cupones', detalle: 'Códigos de descuento', icono: '🏷️' },
  { id: 'qr', titulo: 'Código QR', detalle: 'Cartel, historia o tarjeta con tu QR', icono: '🔳' },
  { id: 'pagina', titulo: 'Mi página', detalle: 'Nombre, logo, textos y colores', icono: '🎨' },
  { id: 'lugar', titulo: 'Lugar', detalle: 'Sedes y servicio a domicilio', icono: '📍' },
  { id: 'pagos', titulo: 'Pagos y WhatsApp', detalle: 'Moneda, métodos y Pago Móvil', icono: '💳' },
  { id: 'mensaje', titulo: 'Mensaje de WhatsApp', detalle: 'Lo que te llega con cada reserva', icono: '💬' },
  { id: 'ticket', titulo: 'Ticket de reserva', detalle: 'Activarlo o facturar con tu imprenta', icono: '🧾' },
]

const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']
const METODOS = ['Pago en la cita', 'Bolívares (Pago Móvil)']
const ALERTAS: [number, string][] = [[0, 'Al empezar'], [15, '15 min'], [30, '30 min'], [60, '1 h'], [120, '2 h'], [1440, '1 día']]
const ZONAS = ['America/Caracas', 'America/Bogota', 'America/Lima', 'America/Mexico_City', 'America/Santiago', 'America/Argentina/Buenos_Aires', 'America/Panama', 'America/New_York', 'Europe/Madrid']

interface Props {
  sesion: string
  slug: string
  alSalir: () => void
}

export function Configurar({ sesion, slug, alSalir }: Props) {
  const [datos, setDatos] = useState<api.Configuracion | null>(null)
  const [abierta, setAbierta] = useState<Id | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let vivo = true
    setDatos(null)
    setError('')
    api.leerConfiguracion(sesion, slug)
      .then((d) => vivo && setDatos(d))
      .catch((e) => {
        if (e instanceof api.ErrorNegocio && e.codigo === 'sesion') alSalir()
        else if (vivo) setError((e as Error).message)
      })
    return () => {
      vivo = false
    }
  }, [sesion, slug, alSalir])

  // Atrás del teléfono (o del navegador) vuelve a la lista, no sale de la app.
  useEffect(() => {
    if (!abierta) return
    history.pushState({ seccion: abierta }, '')
    const atras = () => setAbierta(null)
    window.addEventListener('popstate', atras)
    return () => window.removeEventListener('popstate', atras)
  }, [abierta])
  const cerrar = () => (history.state?.seccion ? history.back() : setAbierta(null))

  if (error) return <p role="alert" className="mt-4 rounded-2xl bg-danger/10 px-4 py-3 text-[14px] text-danger">{error}</p>
  if (!datos) return <div className="mt-2 h-[420px] animate-pulse rounded-3xl bg-sand" aria-busy="true" aria-label="Cargando configuración" />

  const guardar = async (seccion: api.Seccion, cambios: api.DatosSeccion): Promise<string[]> => {
    try {
      const r = await api.guardar(sesion, slug, seccion, cambios)
      if (r.ok && r.datos) setDatos(r.datos)
      return r.ok ? [] : r.errores
    } catch (e) {
      if (e instanceof api.ErrorNegocio && e.codigo === 'sesion') alSalir()
      return [(e as Error).message]
    }
  }

  if (abierta) {
    const s = SECCIONES.find((x) => x.id === abierta)!
    const props = { datos, guardar }
    return (
      <div className="mt-1">
        <button type="button" onClick={cerrar} className="-ml-2 flex items-center gap-1 rounded-full px-2 py-2 text-[15px] text-muted">
          <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><path d="M15 6l-6 6 6 6" /></svg>
          Configurar
        </button>
        <h2 className="mt-1 font-display text-[30px] leading-tight">{s.titulo}</h2>
        {abierta === 'servicios' && <Servicios {...props} />}
        {abierta === 'horario' && <HorarioSec {...props} />}
        {abierta === 'bloqueos' && <Bloqueos {...props} />}
        {abierta === 'pagina' && <Pagina {...props} />}
        {abierta === 'lugar' && <Lugar {...props} />}
        {abierta === 'pagos' && <Pagos {...props} />}
        {abierta === 'mensaje' && <MensajeSec {...props} />}
        {abierta === 'ticket' && <Ticket {...props} />}
        {abierta === 'cupones' && <Cupones {...props} />}
        {abierta === 'qr' && <CodigoQr datos={datos} slug={slug} />}
      </div>
    )
  }

  return (
    <div className="mt-2">
      <ul className="overflow-hidden rounded-3xl bg-surface shadow-card ring-1 ring-line">
        {SECCIONES.map((s, i) => (
          <li key={s.id} className={i ? 'border-t border-line' : ''}>
            <button type="button" onClick={() => setAbierta(s.id)} className="flex w-full items-center gap-4 px-4 py-4 text-left">
              <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-sand text-[20px]" aria-hidden>{s.icono}</span>
              <span className="min-w-0 flex-1">
                <span className="block text-[16px] font-semibold">{s.titulo}</span>
                <span className="block truncate text-[13px] text-muted">{s.detalle}</span>
              </span>
              <svg viewBox="0 0 24 24" className="size-5 text-muted" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><path d="M9 6l6 6-6 6" /></svg>
            </button>
          </li>
        ))}
      </ul>
      {datos.paginaUrl && (
        <a href={datos.paginaUrl} target="_blank" rel="noopener noreferrer" className="mt-4 block rounded-full px-5 py-3 text-center text-[14px] font-semibold ring-1 ring-line">
          Ver cómo quedó mi página
        </a>
      )}
    </div>
  )
}

// ---------- Piezas ----------

type SecProps = { datos: api.Configuracion; guardar: (s: api.Seccion, d: api.DatosSeccion) => Promise<string[]> }

const claseInput = 'w-full min-w-0 rounded-2xl bg-surface px-3.5 py-3 text-[16px] ring-1 ring-line outline-none focus:ring-2 focus:ring-ink'

function Campo({ etiqueta, ayuda, children }: { etiqueta: string; ayuda?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[14px] font-semibold">{etiqueta}</span>
      {children}
      {ayuda && <span className="mt-1 block text-[13px] text-muted">{ayuda}</span>}
    </label>
  )
}

function Texto(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={claseInput + ' ' + (props.className ?? '')} />
}

/** Horas cada 15 minutos ("9:00 a. m."): igual en iPhone y Android, y cabe en una fila. */
const HORAS = Array.from({ length: 24 * 4 }, (_, i) => `${String(Math.floor(i / 4)).padStart(2, '0')}:${String((i % 4) * 15).padStart(2, '0')}`)

function Hora({ valor, onChange, etiqueta }: { valor: string; onChange: (v: string) => void; etiqueta: string }) {
  const opciones = valor && !HORAS.includes(valor) ? [valor, ...HORAS].sort() : HORAS
  return (
    <select aria-label={etiqueta} value={valor} onChange={(e) => onChange(e.target.value)} className={claseInput + ' appearance-none text-center'}>
      {!valor && <option value="">—</option>}
      {opciones.map((h) => <option key={h} value={h}>{formatTime12(h)}</option>)}
    </select>
  )
}

function Interruptor({ activo, onChange, children }: { activo: boolean; onChange: (v: boolean) => void; children: ReactNode }) {
  return (
    <button type="button" role="switch" aria-checked={activo} onClick={() => onChange(!activo)} className="flex w-full items-center justify-between gap-4 py-2 text-left text-[15px]">
      <span>{children}</span>
      <span className={'relative h-7 w-12 shrink-0 rounded-full transition-colors ' + (activo ? 'bg-ink' : 'bg-line')}>
        <span className={'absolute top-1 size-5 rounded-full bg-white shadow transition-transform ' + (activo ? 'translate-x-6' : 'translate-x-1')} />
      </span>
    </button>
  )
}

function Tarjeta({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={'space-y-4 rounded-3xl bg-surface p-4 shadow-card ring-1 ring-line ' + className}>{children}</div>
}

/** Botón fijo abajo: guarda la sección y muestra los errores o "Guardado". */
function Guardar({ alGuardar, cambios }: { alGuardar: () => Promise<string[]>; cambios: boolean }) {
  const [estado, setEstado] = useState<'listo' | 'guardando' | 'guardado'>('listo')
  const [errores, setErrores] = useState<string[]>([])
  useEffect(() => {
    if (cambios && estado === 'guardado') setEstado('listo')
  }, [cambios, estado])
  return (
    // Fijo abajo solo cuando hay algo que guardar; si no, queda al final sin tapar nada.
    <div className={(cambios || estado !== 'listo' || errores.length ? 'sticky bottom-[84px] z-[5] ' : '') + 'mt-6 space-y-2'}>
      {errores.length > 0 && (
        <ul role="alert" className="space-y-1 rounded-2xl bg-danger/10 px-4 py-3 text-[14px] text-danger">
          {errores.map((e) => <li key={e}>{e}</li>)}
        </ul>
      )}
      <button
        type="button"
        disabled={!cambios || estado === 'guardando'}
        onClick={async () => {
          setEstado('guardando')
          const e = await alGuardar()
          setErrores(e)
          setEstado(e.length ? 'listo' : 'guardado')
        }}
        className="w-full rounded-full bg-ink px-5 py-3.5 text-[16px] font-semibold text-bg shadow-float disabled:bg-sand disabled:text-muted disabled:shadow-none"
      >
        {estado === 'guardando' ? 'Guardando…' : estado === 'guardado' && !cambios ? '✓ Guardado' : 'Guardar cambios'}
      </button>
    </div>
  )
}

/** Estado editable de una sección, con "hay cambios" comparando contra lo guardado. */
function useBorrador<T>(original: T) {
  const [valor, setValor] = useState<T>(() => structuredClone(original))
  const base = JSON.stringify(original)
  useEffect(() => setValor(structuredClone(JSON.parse(base) as T)), [base])
  return [valor, setValor, JSON.stringify(valor) !== base] as const
}

function useConfig(datos: api.Configuracion, claves: string[]) {
  const original = Object.fromEntries(claves.map((k) => [k, datos.config[k] ?? '']))
  return useBorrador<Record<string, string>>(original)
}

const minutos = (h: string) => (/^\d{1,2}:\d{2}$/.test(h) ? Number(h.split(':')[0]) * 60 + Number(h.split(':')[1]) : NaN)

// ---------- Servicios ----------

function Servicios({ datos, guardar }: SecProps) {
  const [lista, setLista, cambios] = useBorrador(datos.servicios)
  const editar = (i: number, c: Partial<api.Servicio>) => setLista(lista.map((s, j) => (j === i ? { ...s, ...c } : s)))
  const categorias = [...new Set(lista.map((s) => s.categoria).filter(Boolean))]
  return (
    <>
      <p className="mt-2 text-[14px] text-muted">Los adicionales se suman a un servicio principal (por ejemplo, lavado o diseño).</p>
      <datalist id="categorias">{categorias.map((c) => <option key={c} value={c} />)}</datalist>
      <div className="mt-4 space-y-3">
        {lista.map((s, i) => (
          <Tarjeta key={i}>
            <div className="flex items-start gap-2">
              <Texto aria-label="Nombre del servicio" placeholder="Nombre del servicio" value={s.nombre} onChange={(e) => editar(i, { nombre: e.target.value })} className="font-semibold" />
              <button type="button" aria-label={`Quitar ${s.nombre || 'servicio'}`} onClick={() => setLista(lista.filter((_, j) => j !== i))} className="grid size-12 shrink-0 place-items-center rounded-2xl text-muted ring-1 ring-line">
                <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><path d="M5 7h14M10 7V5h4v2M7 7l1 12h8l1-12" /></svg>
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Campo etiqueta="Precio">
                <Texto inputMode="decimal" value={String(s.precio)} onChange={(e) => editar(i, { precio: Number(e.target.value.replace(',', '.')) || 0 })} />
              </Campo>
              <Campo etiqueta="Minutos">
                <Texto inputMode="numeric" value={String(s.duracion)} onChange={(e) => editar(i, { duracion: Number(e.target.value.replace(/\D/g, '')) || 0 })} />
              </Campo>
            </div>
            {!s.adicional && (
              <Campo etiqueta="Categoría" ayuda="Opcional. Agrupa los servicios en tu página (Cabello, Uñas…).">
                <Texto list="categorias" value={s.categoria} onChange={(e) => editar(i, { categoria: e.target.value })} />
              </Campo>
            )}
            <Interruptor activo={s.adicional} onChange={(v) => editar(i, { adicional: v })}>Es un adicional</Interruptor>
          </Tarjeta>
        ))}
      </div>
      <button type="button" onClick={() => setLista([...lista, { id: '', nombre: '', precio: 0, duracion: 30, categoria: categorias[0] ?? '', adicional: false }])} className="mt-3 w-full rounded-full px-5 py-3 text-[15px] font-semibold ring-1 ring-line">
        + Agregar servicio
      </button>
      <Guardar cambios={cambios} alGuardar={() => guardar('servicios', { servicios: lista })} />
    </>
  )
}

// ---------- Horario ----------

const CLAVES_HORARIO = ['intervalo_min', 'dias_anticipacion', 'anticipacion_min_horas', 'zona_horaria', 'recordatorio_minutos']

function HorarioSec({ datos, guardar }: SecProps) {
  const [horarios, setHorarios, cambiosH] = useBorrador(datos.horarios.filter((h) => h.inicio && h.fin))
  const [c, setC, cambiosC] = useConfig(datos, CLAVES_HORARIO)
  const alertas = c.recordatorio_minutos === 'no' ? [] : c.recordatorio_minutos.split(/[\s,;]+/).filter(Boolean).map(Number)
  const tramos = (dia: string) => horarios.map((h, i) => ({ ...h, i })).filter((h) => h.dia === dia)

  return (
    <>
      <div className="mt-4 space-y-3">
        {DIAS.map((dia) => {
          const t = tramos(dia)
          return (
            <Tarjeta key={dia} className="!space-y-2">
              <Interruptor activo={t.length > 0} onChange={(v) => setHorarios(v ? [...horarios, { dia, inicio: '09:00', fin: '18:00' }] : horarios.filter((h) => h.dia !== dia))}>
                <b>{dia}</b> <span className="text-muted">{t.length ? '' : '· Cerrado'}</span>
              </Interruptor>
              {t.map((h) => (
                <div key={h.i} className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_auto] items-center gap-2">
                  <Hora etiqueta={`${dia}: abre`} valor={h.inicio} onChange={(v) => setHorarios(horarios.map((x, j) => (j === h.i ? { ...x, inicio: v } : x)))} />
                  <span className="text-muted">a</span>
                  <Hora etiqueta={`${dia}: cierra`} valor={h.fin} onChange={(v) => setHorarios(horarios.map((x, j) => (j === h.i ? { ...x, fin: v } : x)))} />
                  {t.length > 1 ? (
                    <button type="button" aria-label="Quitar tramo" onClick={() => setHorarios(horarios.filter((_, j) => j !== h.i))} className="grid size-10 place-items-center rounded-full text-[18px] text-muted">×</button>
                  ) : <span className="w-0" />}
                </div>
              ))}
              {t.length > 0 && t.length < 3 && (
                <button type="button" onClick={() => { const ultimo = t[t.length - 1]; setHorarios([...horarios, { dia, inicio: ultimo.fin, fin: '' }]) }} className="text-[14px] text-muted underline underline-offset-4">
                  + Otro horario este día
                </button>
              )}
            </Tarjeta>
          )
        })}
      </div>

      <h3 className="mt-8 text-[13px] font-semibold uppercase tracking-[0.12em] text-muted">Agenda</h3>
      <Tarjeta className="mt-2">
        <div className="grid grid-cols-2 gap-3">
          <Campo etiqueta="Horas cada (min)" ayuda="Ej.: 30 → 9:00, 9:30…">
            <Texto inputMode="numeric" value={c.intervalo_min} onChange={(e) => setC({ ...c, intervalo_min: e.target.value.replace(/\D/g, '') })} />
          </Campo>
          <Campo etiqueta="Días a mostrar" ayuda="Cuánto hacia adelante">
            <Texto inputMode="numeric" value={c.dias_anticipacion} onChange={(e) => setC({ ...c, dias_anticipacion: e.target.value.replace(/\D/g, '') })} />
          </Campo>
        </div>
        <Campo etiqueta="Aviso mínimo (horas)" ayuda="No se puede reservar con menos de estas horas de anticipación.">
          <Texto inputMode="numeric" value={c.anticipacion_min_horas} onChange={(e) => setC({ ...c, anticipacion_min_horas: e.target.value.replace(/\D/g, '') })} />
        </Campo>
        <div>
          <span className="mb-1.5 block text-[14px] font-semibold">Alerta en tu Google Calendar</span>
          <div className="flex flex-wrap gap-2">
            {ALERTAS.map(([m, t]) => {
              const on = alertas.includes(m)
              return (
                <button key={m} type="button" aria-pressed={on}
                  onClick={() => { const n = on ? alertas.filter((x) => x !== m) : [...alertas, m].sort((a, b) => a - b).slice(0, 5); setC({ ...c, recordatorio_minutos: n.length ? n.join(', ') : 'no' }) }}
                  className={'rounded-full px-3.5 py-2 text-[14px] ring-1 ' + (on ? 'bg-ink text-bg ring-ink' : 'ring-line')}>
                  {t}
                </button>
              )
            })}
          </div>
        </div>
        <Campo etiqueta="Zona horaria">
          <select value={c.zona_horaria || 'America/Caracas'} onChange={(e) => setC({ ...c, zona_horaria: e.target.value })} className={claseInput}>
            {ZONAS.map((z) => <option key={z} value={z}>{z.replace(/_/g, ' ')}</option>)}
          </select>
        </Campo>
      </Tarjeta>
      <Guardar
        cambios={cambiosH || cambiosC}
        alGuardar={() => {
          const malos = horarios.filter((h) => !(minutos(h.fin) > minutos(h.inicio)))
          if (malos.length) return Promise.resolve(malos.map((h) => `${h.dia}: la hora de cierre va después de la de apertura.`))
          return guardar('horario', { config: c, horarios })
        }}
      />
    </>
  )
}

// ---------- Días libres ----------

function Bloqueos({ datos, guardar }: SecProps) {
  const [lista, setLista, cambios] = useBorrador(datos.bloqueos)
  const hoy = api.hoyCaracas()
  const editar = (i: number, c: Partial<api.Bloqueo>) => setLista(lista.map((b, j) => (j === i ? { ...b, ...c } : b)))
  return (
    <>
      <p className="mt-2 text-[14px] text-muted">Esos días (o esas horas) nadie puede reservar. Las citas que ya tengas no se tocan.</p>
      <div className="mt-4 space-y-3">
        {lista.length === 0 && <p className="rounded-3xl bg-sand px-4 py-6 text-center text-[15px] text-muted">No tienes días libres próximos.</p>}
        {lista.map((b, i) => {
          const todoElDia = !b.inicio && !b.fin
          return (
            <Tarjeta key={i}>
              <div className="flex items-end gap-2">
                <Campo etiqueta="Fecha">
                  <Texto type="date" min={hoy} value={b.fecha} onChange={(e) => editar(i, { fecha: e.target.value })} />
                </Campo>
                <button type="button" aria-label="Quitar día libre" onClick={() => setLista(lista.filter((_, j) => j !== i))} className="grid size-12 shrink-0 place-items-center rounded-2xl text-muted ring-1 ring-line">×</button>
              </div>
              <Interruptor activo={todoElDia} onChange={(v) => editar(i, v ? { inicio: '', fin: '' } : { inicio: '13:00', fin: '15:00' })}>Todo el día</Interruptor>
              {!todoElDia && (
                <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2">
                  <Hora etiqueta="Desde" valor={b.inicio} onChange={(v) => editar(i, { inicio: v })} />
                  <span className="text-muted">a</span>
                  <Hora etiqueta="Hasta" valor={b.fin} onChange={(v) => editar(i, { fin: v })} />
                </div>
              )}
              <Campo etiqueta="Motivo (solo lo ves tú)">
                <Texto value={b.motivo} placeholder="Vacaciones, feriado…" onChange={(e) => editar(i, { motivo: e.target.value })} />
              </Campo>
            </Tarjeta>
          )
        })}
      </div>
      <button type="button" onClick={() => setLista([...lista, { fecha: hoy, inicio: '', fin: '', motivo: '' }])} className="mt-3 w-full rounded-full px-5 py-3 text-[15px] font-semibold ring-1 ring-line">
        + Agregar día libre
      </button>
      <Guardar cambios={cambios} alGuardar={() => guardar('bloqueos', { bloqueos: lista })} />
    </>
  )
}

// ---------- Mi página ----------

const CLAVES_MARCA = ['nombre_negocio', 'marca', 'hero_titulo', 'hero_subtitulo']
const CLAVES_ESTILO = ['tema_estilo', 'color_principal', 'color_fondo', 'paleta']

/** Achica el logo en el navegador (≤ 320 px) para que quepa en la hoja (≤ 45 000 caracteres). */
export async function comprimirLogo(archivo: File): Promise<string> {
  const img = await createImageBitmap(archivo)
  for (const lado of [320, 256, 200, 160]) {
    const k = Math.min(1, lado / Math.max(img.width, img.height))
    const lienzo = document.createElement('canvas')
    lienzo.width = Math.round(img.width * k)
    lienzo.height = Math.round(img.height * k)
    lienzo.getContext('2d')!.drawImage(img, 0, 0, lienzo.width, lienzo.height)
    for (const [tipo, calidad] of [['image/webp', 0.85], ['image/png', 1], ['image/webp', 0.7], ['image/jpeg', 0.8]] as const) {
      const url = lienzo.toDataURL(tipo, calidad)
      if (url.startsWith(`data:${tipo}`) && url.length <= 45000) return url
    }
  }
  throw new Error('La imagen es muy pesada. Prueba con una más simple o recortada.')
}

function Pagina({ datos, guardar }: SecProps) {
  const [m, setM, cambiosM] = useConfig(datos, CLAVES_MARCA)
  const [e, setE, cambiosE] = useConfig(datos, CLAVES_ESTILO)
  const [logo, setLogo] = useState(datos.logo)
  const [errorLogo, setErrorLogo] = useState('')
  const cambiosLogo = logo !== datos.logo
  const estilo = (e.tema_estilo || 'elegante') as keyof typeof ESTILO_DEF

  return (
    <>
      <h3 className="mt-6 text-[13px] font-semibold uppercase tracking-[0.12em] text-muted">Nombre y textos</h3>
      <Tarjeta className="mt-2">
        <Campo etiqueta="Nombre de tu negocio" ayuda="Así sale en tu página y en los mensajes.">
          <Texto value={m.marca} onChange={(x) => setM({ ...m, marca: x.target.value, nombre_negocio: m.nombre_negocio || x.target.value })} />
        </Campo>
        <Campo etiqueta="Título grande">
          <Texto value={m.hero_titulo} placeholder="Tu corte, cuando quieras" onChange={(x) => setM({ ...m, hero_titulo: x.target.value })} />
        </Campo>
        <Campo etiqueta="Frase de abajo">
          <Texto value={m.hero_subtitulo} placeholder="Reserva en 1 minuto." onChange={(x) => setM({ ...m, hero_subtitulo: x.target.value })} />
        </Campo>
      </Tarjeta>

      <h3 className="mt-6 text-[13px] font-semibold uppercase tracking-[0.12em] text-muted">Logo</h3>
      <Tarjeta className="mt-2">
        <div className="flex items-center gap-4">
          <div className="grid size-20 shrink-0 place-items-center overflow-hidden rounded-2xl bg-sand ring-1 ring-line">
            {logo ? <img src={logo} alt="Tu logo" className="size-full object-contain" /> : <span className="text-[12px] text-muted">Sin logo</span>}
          </div>
          <div className="flex flex-wrap gap-2">
            <label className="cursor-pointer rounded-full px-4 py-2.5 text-[14px] font-semibold ring-1 ring-line">
              {logo ? 'Cambiar' : 'Subir logo'}
              <input type="file" accept="image/*" className="sr-only" onChange={async (x) => {
                const f = x.target.files?.[0]
                if (!f) return
                setErrorLogo('')
                try { setLogo(await comprimirLogo(f)) } catch (err) { setErrorLogo((err as Error).message) }
              }} />
            </label>
            {logo && <button type="button" onClick={() => setLogo('')} className="rounded-full px-4 py-2.5 text-[14px] text-danger ring-1 ring-line">Quitar</button>}
          </div>
        </div>
        {errorLogo && <p className="text-[14px] text-danger">{errorLogo}</p>}
      </Tarjeta>

      <h3 className="mt-6 text-[13px] font-semibold uppercase tracking-[0.12em] text-muted">Estilo</h3>
      <Tarjeta className="mt-2">
        <div className="grid grid-cols-2 gap-2">
          {ESTILOS.map((id) => (
            <button key={id} type="button" aria-pressed={estilo === id} onClick={() => setE({ ...e, tema_estilo: id })}
              className={'rounded-2xl px-3 py-3 text-left ring-1 ' + (estilo === id ? 'bg-ink text-bg ring-ink' : 'ring-line')}>
              <span className="block text-[15px] font-semibold" style={{ fontFamily: ESTILO_DEF[id].display }}>{ESTILO_DEF[id].nombre}</span>
            </button>
          ))}
        </div>
        <p className="text-[13px] text-muted">{ESTILO_DEF[estilo]?.descripcion}</p>
        <div>
          <span className="mb-1.5 block text-[14px] font-semibold">Color</span>
          <div className="flex flex-wrap gap-2.5">
            {PALETAS.map((p) => {
              const on = e.paleta === p.nombre || (!e.paleta && e.color_principal.toLowerCase() === p.base.toLowerCase())
              return (
                <button key={p.id} type="button" aria-pressed={on} aria-label={p.nombre} title={p.nombre} onClick={() => setE({ ...e, paleta: p.nombre, color_principal: p.base })}
                  className={'size-11 rounded-full ring-offset-2 ring-offset-surface ' + (on ? 'ring-2 ring-ink' : 'ring-1 ring-line')} style={{ background: p.base }} />
              )
            })}
            <label className={'grid size-11 cursor-pointer place-items-center rounded-full text-[18px] ring-offset-2 ' + (e.paleta ? 'ring-1 ring-line' : 'ring-2 ring-ink')} style={{ background: e.paleta ? undefined : e.color_principal }} title="Otro color">
              <span aria-hidden>{e.paleta ? '+' : ''}</span>
              <input type="color" className="sr-only" aria-label="Otro color" value={/^#[0-9a-f]{6}$/i.test(e.color_principal) ? e.color_principal : '#C08497'} onChange={(x) => setE({ ...e, paleta: '', color_principal: x.target.value })} />
            </label>
          </div>
        </div>
        <Interruptor activo={Boolean(e.color_fondo)} onChange={(v) => setE({ ...e, color_fondo: v ? '#111111' : '' })}>Fondo oscuro</Interruptor>
      </Tarjeta>

      <Guardar
        cambios={cambiosM || cambiosE || cambiosLogo}
        alGuardar={async () => {
          const errores: string[] = []
          if (cambiosM) errores.push(...(await guardar('marca', { config: m })))
          if (cambiosE && !errores.length) errores.push(...(await guardar('estilo', { config: e })))
          if (cambiosLogo && !errores.length) errores.push(...(await guardar('logo', { logo })))
          return errores
        }}
      />
    </>
  )
}

// ---------- Lugar ----------

const CLAVES_LUGAR = ['lugar_tipo', 'lugar_nombre', 'permite_domicilio', 'recargo_domicilio_pct', 'minutos_extra_domicilio']

function Lugar({ datos, guardar }: SecProps) {
  const [c, setC, cambiosC] = useConfig(datos, CLAVES_LUGAR)
  const [sedes, setSedes, cambiosS] = useBorrador(datos.sedes.length ? datos.sedes : [{ nombre: 'Principal', direccion: '', mapsUrl: '', activa: true }])
  const domicilio = /^(si|sí|true|1)$/i.test(c.permite_domicilio)
  const editar = (i: number, x: Partial<api.Sede>) => setSedes(sedes.map((s, j) => (j === i ? { ...s, ...x } : s)))
  return (
    <>
      <Tarjeta className="mt-4">
        <Campo etiqueta="¿Qué es tu lugar?" ayuda="Tu página dice «En la barbería», «Ver ubicación del consultorio»…">
          <select value={c.lugar_tipo || 'local'} onChange={(e) => setC({ ...c, lugar_tipo: e.target.value })} className={claseInput}>
            {Object.entries(LUGAR_TIPOS).map(([k, v]) => <option key={k} value={k}>{v.replace(/^(el|la) /, '').replace(/^./, (x) => x.toUpperCase())}</option>)}
            <option value="otro">Otro…</option>
          </select>
        </Campo>
        {c.lugar_tipo === 'otro' && (
          <Campo etiqueta="¿Cómo se llama?" ayuda="Como va después de «En»: la clínica, el taller, Casa Ana.">
            <Texto value={c.lugar_nombre} onChange={(e) => setC({ ...c, lugar_nombre: e.target.value })} />
          </Campo>
        )}
      </Tarjeta>

      <h3 className="mt-6 text-[13px] font-semibold uppercase tracking-[0.12em] text-muted">Sedes</h3>
      <div className="mt-2 space-y-3">
        {sedes.map((s, i) => (
          <Tarjeta key={i}>
            <div className="flex items-start gap-2">
              <Texto aria-label="Nombre de la sede" placeholder="Nombre (Sede Centro)" value={s.nombre} onChange={(e) => editar(i, { nombre: e.target.value })} className="font-semibold" />
              {sedes.length > 1 && <button type="button" aria-label="Quitar sede" onClick={() => setSedes(sedes.filter((_, j) => j !== i))} className="grid size-12 shrink-0 place-items-center rounded-2xl text-muted ring-1 ring-line">×</button>}
            </div>
            <Campo etiqueta="Dirección"><Texto value={s.direccion} onChange={(e) => editar(i, { direccion: e.target.value })} /></Campo>
            <Campo etiqueta="Enlace de Google Maps" ayuda="Opcional. En Maps: Compartir → Copiar enlace.">
              <Texto inputMode="url" value={s.mapsUrl} placeholder="https://maps.app.goo.gl/…" onChange={(e) => editar(i, { mapsUrl: e.target.value })} />
            </Campo>
            {sedes.length > 1 && <Interruptor activo={s.activa} onChange={(v) => editar(i, { activa: v })}>Activa</Interruptor>}
          </Tarjeta>
        ))}
      </div>
      <button type="button" onClick={() => setSedes([...sedes, { nombre: '', direccion: '', mapsUrl: '', activa: true }])} className="mt-3 w-full rounded-full px-5 py-3 text-[15px] font-semibold ring-1 ring-line">+ Agregar sede</button>

      <h3 className="mt-6 text-[13px] font-semibold uppercase tracking-[0.12em] text-muted">A domicilio</h3>
      <Tarjeta className="mt-2">
        <Interruptor activo={domicilio} onChange={(v) => setC({ ...c, permite_domicilio: v ? 'si' : 'no' })}>También atiendo a domicilio</Interruptor>
        {domicilio && (
          <div className="grid grid-cols-2 gap-3">
            <Campo etiqueta="Recargo (%)"><Texto inputMode="numeric" value={c.recargo_domicilio_pct} onChange={(e) => setC({ ...c, recargo_domicilio_pct: e.target.value.replace(/\D/g, '') })} /></Campo>
            <Campo etiqueta="Traslado (min)"><Texto inputMode="numeric" value={c.minutos_extra_domicilio} onChange={(e) => setC({ ...c, minutos_extra_domicilio: e.target.value.replace(/\D/g, '') })} /></Campo>
          </div>
        )}
      </Tarjeta>
      <Guardar cambios={cambiosC || cambiosS} alGuardar={() => guardar('lugar', { config: c, sedes })} />
    </>
  )
}

// ---------- Pagos ----------

const CLAVES_PAGOS = ['whatsapp', 'moneda', 'metodos_pago', 'pm_banco', 'pm_telefono', 'pm_cedula', 'tasa_eur_manual', 'tasa_usd_manual']

function Pagos({ datos, guardar }: SecProps) {
  const [c, setC, cambios] = useConfig(datos, CLAVES_PAGOS)
  const metodos = c.metodos_pago.split(',').map((x) => x.trim()).filter(Boolean)
  const pagoMovil = metodos.includes(METODOS[1])
  return (
    <>
      <Tarjeta className="mt-4">
        <Campo etiqueta="WhatsApp que recibe las reservas" ayuda="Con código de país, sin espacios ni +. Ej.: 584121234567">
          <Texto inputMode="numeric" value={c.whatsapp} onChange={(e) => setC({ ...c, whatsapp: e.target.value.replace(/\D/g, '') })} />
        </Campo>
        <Campo etiqueta="Moneda de tus precios">
          <select value={c.moneda || 'EUR'} onChange={(e) => setC({ ...c, moneda: e.target.value })} className={claseInput}>
            <option value="EUR">Euros (€)</option>
            <option value="USD">Dólares ($)</option>
            <option value="Bs">Bolívares (Bs.)</option>
          </select>
        </Campo>
      </Tarjeta>
      <h3 className="mt-6 text-[13px] font-semibold uppercase tracking-[0.12em] text-muted">Cómo te pagan</h3>
      <Tarjeta className="mt-2 !space-y-1">
        {METODOS.map((m) => (
          <Interruptor key={m} activo={metodos.includes(m)} onChange={(v) => setC({ ...c, metodos_pago: METODOS.filter((x) => (x === m ? v : metodos.includes(x))).join(', ') })}>{m}</Interruptor>
        ))}
      </Tarjeta>
      {pagoMovil && (
        <>
          <h3 className="mt-6 text-[13px] font-semibold uppercase tracking-[0.12em] text-muted">Tus datos de Pago Móvil</h3>
          <Tarjeta className="mt-2">
            <Campo etiqueta="Banco"><Texto value={c.pm_banco} onChange={(e) => setC({ ...c, pm_banco: e.target.value })} /></Campo>
            <Campo etiqueta="Teléfono"><Texto inputMode="tel" value={c.pm_telefono} onChange={(e) => setC({ ...c, pm_telefono: e.target.value })} /></Campo>
            <Campo etiqueta="Cédula o RIF"><Texto value={c.pm_cedula} onChange={(e) => setC({ ...c, pm_cedula: e.target.value })} /></Campo>
          </Tarjeta>
        </>
      )}
      {c.moneda !== 'Bs' && (
        <>
          <h3 className="mt-6 text-[13px] font-semibold uppercase tracking-[0.12em] text-muted">Tasa manual (respaldo)</h3>
          <Tarjeta className="mt-2">
            <p className="text-[13px] text-muted">Solo se usa si no se puede leer la tasa del BCV. Déjala vacía si no la necesitas.</p>
            <div className="grid grid-cols-2 gap-3">
              <Campo etiqueta="Euro"><Texto inputMode="decimal" value={c.tasa_eur_manual} onChange={(e) => setC({ ...c, tasa_eur_manual: e.target.value })} /></Campo>
              <Campo etiqueta="Dólar"><Texto inputMode="decimal" value={c.tasa_usd_manual} onChange={(e) => setC({ ...c, tasa_usd_manual: e.target.value })} /></Campo>
            </div>
          </Tarjeta>
        </>
      )}
      <Guardar cambios={cambios} alGuardar={() => guardar('pagos', { config: c })} />
    </>
  )
}

// ---------- Mensaje ----------

const VARIABLES = ['{negocio}', '{nombre}', '{servicios}', '{fecha}', '{hora}', '{total}', '{pago}', '{lugar}']

function MensajeSec({ datos, guardar }: SecProps) {
  const [mensajes, setMensajes, cambiosM] = useBorrador(datos.mensajes)
  const [c, setC, cambiosC] = useConfig(datos, ['mensaje_plantilla'])
  const actual = Math.max(0, mensajes.findIndex((m) => m.nombre === c.mensaje_plantilla))
  const m = mensajes[actual]
  return (
    <>
      <p className="mt-2 text-[14px] text-muted">El mensaje que tu cliente te manda por WhatsApp al reservar.</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {mensajes.map((x) => (
          <button key={x.nombre} type="button" aria-pressed={x.nombre === m?.nombre} onClick={() => setC({ mensaje_plantilla: x.nombre })}
            className={'rounded-full px-4 py-2 text-[14px] ring-1 ' + (x.nombre === m?.nombre ? 'bg-ink text-bg ring-ink' : 'ring-line')}>{x.nombre}</button>
        ))}
      </div>
      {m && (
        <Tarjeta className="mt-3">
          <Campo etiqueta="Texto">
            <textarea rows={8} value={m.texto} onChange={(e) => setMensajes(mensajes.map((x, i) => (i === actual ? { ...x, texto: e.target.value } : x)))} className={claseInput + ' resize-y'} />
          </Campo>
          <div>
            <span className="mb-1.5 block text-[13px] text-muted">Toca para agregar:</span>
            <div className="flex flex-wrap gap-1.5">
              {VARIABLES.map((v) => (
                <button key={v} type="button" onClick={() => setMensajes(mensajes.map((x, i) => (i === actual ? { ...x, texto: `${x.texto}${x.texto.endsWith(' ') || !x.texto ? '' : ' '}${v}` } : x)))}
                  className="rounded-full bg-sand px-2.5 py-1 font-mono text-[12px]">{v}</button>
              ))}
            </div>
          </div>
        </Tarjeta>
      )}
      <Guardar cambios={cambiosM || cambiosC} alGuardar={() => guardar('mensaje', { config: { mensaje_plantilla: m?.nombre ?? '' }, mensajes })} />
    </>
  )
}

// ---------- Cupones ----------

function Cupones({ datos, guardar }: SecProps) {
  const [lista, setLista, cambios] = useBorrador(datos.cupones)
  const moneda = (datos.config.moneda || 'EUR').toUpperCase() === 'USD' ? '$' : /^bs/i.test(datos.config.moneda) ? 'Bs.' : '€'
  const editar = (i: number, c: Partial<api.Cupon>) => setLista(lista.map((x, j) => (j === i ? { ...x, ...c } : x)))
  return (
    <>
      <p className="mt-2 text-[14px] text-muted">Tu cliente escribe el código al reservar y el descuento se aplica solo. Cada reserva gasta un uso.</p>
      <div className="mt-4 space-y-3">
        {lista.length === 0 && <p className="rounded-3xl bg-sand px-4 py-6 text-center text-[15px] text-muted">Todavía no tienes cupones.</p>}
        {lista.map((c, i) => {
          const tipo = c.monto > 0 ? 'monto' : 'porcentaje'
          const agotado = c.usos === 0
          return (
            <Tarjeta key={i}>
              <div className="flex items-start gap-2">
                <Texto aria-label="Código" placeholder="CÓDIGO" value={c.codigo} maxLength={20} autoCapitalize="characters"
                  onChange={(e) => editar(i, { codigo: e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, '') })} className="font-mono font-semibold tracking-wider" />
                <button type="button" aria-label={`Quitar ${c.codigo || 'cupón'}`} onClick={() => setLista(lista.filter((_, j) => j !== i))} className="grid size-12 shrink-0 place-items-center rounded-2xl text-muted ring-1 ring-line">×</button>
              </div>
              <div className="grid grid-cols-2 gap-1 rounded-2xl bg-sand p-1">
                {(['porcentaje', 'monto'] as const).map((t) => (
                  <button key={t} type="button" aria-pressed={tipo === t}
                    onClick={() => editar(i, t === 'monto' ? { monto: c.monto || c.porcentaje || 1, porcentaje: 0 } : { porcentaje: c.porcentaje || Math.min(100, c.monto) || 10, monto: 0 })}
                    className={'rounded-xl py-2 text-[14px] ' + (tipo === t ? 'bg-surface font-semibold shadow-card' : 'text-muted')}>
                    {t === 'porcentaje' ? 'Porcentaje (%)' : `Monto (${moneda})`}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Campo etiqueta={tipo === 'porcentaje' ? 'Descuento (%)' : `Descuento (${moneda})`}>
                  <Texto inputMode="decimal" value={String(tipo === 'porcentaje' ? c.porcentaje : c.monto)}
                    onChange={(e) => { const n = Number(e.target.value.replace(',', '.')) || 0; editar(i, tipo === 'porcentaje' ? { porcentaje: n } : { monto: n }) }} />
                </Campo>
                <Campo etiqueta="Usos que quedan" ayuda={c.usos === null ? 'Ilimitado' : agotado ? 'Agotado' : undefined}>
                  <Texto inputMode="numeric" placeholder="∞" value={c.usos === null ? '' : String(c.usos)}
                    onChange={(e) => { const v = e.target.value.replace(/\D/g, ''); editar(i, { usos: v === '' ? null : Number(v) }) }} />
                </Campo>
              </div>
            </Tarjeta>
          )
        })}
      </div>
      <button type="button" onClick={() => setLista([...lista, { codigo: '', porcentaje: 10, monto: 0, usos: null }])} className="mt-3 w-full rounded-full px-5 py-3 text-[15px] font-semibold ring-1 ring-line">
        + Crear cupón
      </button>
      <Guardar cambios={cambios} alGuardar={() => guardar('cupones', { cupones: lista })} />
    </>
  )
}

// ---------- Código QR ----------

function CodigoQr({ datos, slug }: { datos: api.Configuracion; slug: string }) {
  // El QR lleva siempre a la página del negocio: no se puede poner otro link.
  const link = linkDelNegocio(slug)
  const [plantilla, setPlantilla] = useState<PlantillaQr['id']>('mostrador')
  const [modo, setModo] = useState<ModoQr>('marca')
  const [textos, setTextos] = useState(() => Object.fromEntries(PLANTILLAS_QR.map((p) => [p.id, { titulo: p.titulo, subtitulo: p.subtitulo, llamado: p.llamado }])))
  const [mostrarNombre, setMostrarNombre] = useState(true)
  const [mostrarLink, setMostrarLink] = useState(true)
  const [copiado, setCopiado] = useState(false)
  const lienzo = useRef<HTMLCanvasElement>(null)
  const t = textos[plantilla]
  const p = PLANTILLAS_QR.find((x) => x.id === plantilla)!

  useEffect(() => {
    if (lienzo.current) void dibujarQr(lienzo.current, datos.config, link, { plantilla, modo, ...t, mostrarNombre, mostrarLink })
  }, [datos.config, link, plantilla, modo, t, mostrarNombre, mostrarLink])

  const archivo = () => new Promise<Blob>((ok, mal) => lienzo.current!.toBlob((b) => (b ? ok(b) : mal(new Error('No se pudo crear la imagen.'))), 'image/png'))
  const nombre = `qr-${slug}-${plantilla}.png`
  const descargar = async () => {
    const url = URL.createObjectURL(await archivo())
    const a = document.createElement('a')
    a.href = url
    a.download = nombre
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 4000)
  }
  const compartir = async () => {
    try {
      await navigator.share({ files: [new File([await archivo()], nombre, { type: 'image/png' })] })
    } catch {
      /* canceló */
    }
  }
  const puedeCompartir = typeof navigator !== 'undefined' && !!navigator.canShare?.({ files: [new File([''], 'x.png', { type: 'image/png' })] })

  return (
    <>
      <Tarjeta className="mt-4 !space-y-2">
        <span className="block text-[14px] font-semibold">Tu link</span>
        <div className="flex items-center gap-2">
          <p className="min-w-0 flex-1 truncate rounded-2xl bg-sand px-3.5 py-3 font-mono text-[14px]">{link.replace(/^https?:\/\//, '')}</p>
          <button type="button" onClick={async () => { await navigator.clipboard?.writeText(link).catch(() => {}); setCopiado(true); setTimeout(() => setCopiado(false), 1500) }}
            className="shrink-0 rounded-full px-4 py-3 text-[14px] font-semibold ring-1 ring-line">{copiado ? '✓ Copiado' : 'Copiar'}</button>
        </div>
        <p className="text-[13px] text-muted">El QR lleva siempre a tu página de reservas.</p>
      </Tarjeta>

      <div className="mt-4 -mx-5 flex gap-2 overflow-x-auto px-5 pb-1 no-scrollbar">
        {PLANTILLAS_QR.map((x) => (
          <button key={x.id} type="button" aria-pressed={plantilla === x.id} onClick={() => setPlantilla(x.id)}
            className={'shrink-0 rounded-2xl px-3.5 py-2.5 text-left ring-1 ' + (plantilla === x.id ? 'bg-ink text-bg ring-ink' : 'bg-surface ring-line')}>
            <b className="block text-[14px]">{x.nombre}</b>
            <span className="text-[12px] opacity-75">{x.uso}</span>
          </button>
        ))}
      </div>

      <div className="mt-4 grid place-items-center rounded-3xl bg-sand p-4">
        <canvas ref={lienzo} aria-label="Vista previa del QR" className="max-h-[60vh] w-auto max-w-full rounded-xl shadow-card" style={{ aspectRatio: `${p.ancho} / ${p.alto}` }} />
      </div>
      <div className="mt-3 grid gap-2" style={{ gridTemplateColumns: puedeCompartir ? '1fr 1fr' : '1fr' }}>
        <button type="button" onClick={() => void descargar()} className="rounded-full bg-ink px-5 py-3.5 text-[15px] font-semibold text-bg">Descargar PNG</button>
        {puedeCompartir && <button type="button" onClick={() => void compartir()} className="rounded-full px-5 py-3.5 text-[15px] font-semibold ring-1 ring-line">Compartir</button>}
      </div>

      <h3 className="mt-6 text-[13px] font-semibold uppercase tracking-[0.12em] text-muted">Colores</h3>
      <div className="mt-2 grid grid-cols-3 gap-1 rounded-2xl bg-sand p-1">
        {MODOS_QR.map(([id, nombre]) => (
          <button key={id} type="button" aria-pressed={modo === id} onClick={() => setModo(id)} className={'rounded-xl py-2 text-[14px] ' + (modo === id ? 'bg-surface font-semibold shadow-card' : 'text-muted')}>{nombre}</button>
        ))}
      </div>

      {plantilla !== 'solo' && (
        <>
          <h3 className="mt-6 text-[13px] font-semibold uppercase tracking-[0.12em] text-muted">Textos</h3>
          <Tarjeta className="mt-2">
            <Campo etiqueta="Título"><Texto value={t.titulo} onChange={(e) => setTextos({ ...textos, [plantilla]: { ...t, titulo: e.target.value } })} /></Campo>
            <Campo etiqueta="Texto debajo"><Texto value={t.subtitulo} onChange={(e) => setTextos({ ...textos, [plantilla]: { ...t, subtitulo: e.target.value } })} /></Campo>
            {plantilla !== 'tarjeta' && (
              <Campo etiqueta="Frase destacada" ayuda="Déjala vacía para no mostrarla.">
                <Texto value={t.llamado} onChange={(e) => setTextos({ ...textos, [plantilla]: { ...t, llamado: e.target.value } })} />
              </Campo>
            )}
            <Interruptor activo={mostrarNombre} onChange={setMostrarNombre}>Mostrar el nombre del negocio</Interruptor>
            <Interruptor activo={mostrarLink} onChange={setMostrarLink}>Mostrar el link escrito</Interruptor>
          </Tarjeta>
        </>
      )}
    </>
  )
}

// ---------- Ticket ----------

const CLAVES_TICKET = ['facturacion_modo', 'ticket_reserva', 'facturacion_rif', 'facturacion_razon_social', 'facturacion_proveedor']

function Ticket({ datos, guardar }: SecProps) {
  const [c, setC, cambios] = useConfig(datos, CLAVES_TICKET)
  const fiscal = c.facturacion_modo === 'fiscal'
  return (
    <>
      <div className="mt-4 grid gap-2">
        {([['interno', 'Control interno', 'Puedes darle a tu cliente un ticket de reserva no fiscal.'], ['fiscal', 'Facturación fiscal (SENIAT)', 'Facturas con tu imprenta digital autorizada. bookeaa no emite tickets.']] as const).map(([id, t, d]) => (
          <button key={id} type="button" aria-pressed={(c.facturacion_modo || 'interno') === id} onClick={() => setC({ ...c, facturacion_modo: id })}
            className={'rounded-3xl p-4 text-left ring-1 ' + ((c.facturacion_modo || 'interno') === id ? 'bg-ink text-bg ring-ink' : 'bg-surface ring-line')}>
            <b className="block text-[15px]">{t}</b>
            <span className="text-[13px] opacity-80">{d}</span>
          </button>
        ))}
      </div>
      {!fiscal ? (
        <Tarjeta className="mt-4">
          <Interruptor activo={c.ticket_reserva !== 'no'} onChange={(v) => setC({ ...c, ticket_reserva: v ? 'si' : 'no' })}>Emitir ticket de reserva</Interruptor>
          <p className="text-[13px] text-muted">
            {c.ticket_reserva !== 'no'
              ? 'Al reservar, tu cliente ve su ticket imprimirse y lo descarga como imagen. Lleva la leyenda de documento no fiscal.'
              : 'Apagado: al reservar, tu cliente pasa directo a WhatsApp, sin ticket.'}
          </p>
        </Tarjeta>
      ) : (
        <Tarjeta className="mt-4">
          <Campo etiqueta="RIF"><Texto value={c.facturacion_rif} placeholder="J-12345678-9" onChange={(e) => setC({ ...c, facturacion_rif: e.target.value })} /></Campo>
          <Campo etiqueta="Nombre o razón social"><Texto value={c.facturacion_razon_social} onChange={(e) => setC({ ...c, facturacion_razon_social: e.target.value })} /></Campo>
          <Campo etiqueta="Imprenta digital"><Texto value={c.facturacion_proveedor} onChange={(e) => setC({ ...c, facturacion_proveedor: e.target.value })} /></Campo>
        </Tarjeta>
      )}
      <Guardar cambios={cambios} alGuardar={() => guardar('comprobantes', { config: c })} />
    </>
  )
}
