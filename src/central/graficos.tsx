import { useEffect, useRef, useState, type ReactNode } from 'react'

/**
 * Gráficos de la central, en SVG y HTML sin librerías: barras por mes, barras horizontales,
 * mapa de calor (día × hora), proporción por estado y minibarras para las tablas.
 * Una sola serie por gráfico, en el color de tinta; el mes en curso va más claro.
 */

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
export const mesCorto = (ym: string) => MESES[Number(ym.slice(5, 7)) - 1] ?? ym
export const mesLargo = (ym: string) =>
  ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'][Number(ym.slice(5, 7)) - 1] + ' ' + ym.slice(0, 4)

function useAncho<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [ancho, setAncho] = useState(0)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setAncho(Math.floor(e.contentRect.width)))
    ro.observe(el)
    setAncho(Math.floor(el.getBoundingClientRect().width))
    return () => ro.disconnect()
  }, [])
  return [ref, ancho] as const
}

/** Marcas "bonitas" del eje: 0 y 2-3 valores redondos hasta el máximo. */
function marcas(max: number): number[] {
  if (max <= 0) return [0, 1]
  const paso0 = max / 3
  const pot = 10 ** Math.floor(Math.log10(paso0))
  const paso = [1, 2, 2.5, 5, 10].map((m) => m * pot).find((p) => p >= paso0) ?? pot * 10
  const out: number[] = []
  for (let v = 0; v <= max + paso * 0.001; v += paso) out.push(Math.round(v * 100) / 100)
  if (out[out.length - 1] < max) out.push(out[out.length - 1] + paso)
  return out
}

export function Tarjeta({ titulo, detalle, children, accion, className = '' }: { titulo: string; detalle?: ReactNode; children: ReactNode; accion?: ReactNode; className?: string }) {
  return (
    <section className={'min-w-0 rounded-3xl bg-surface p-5 shadow-card ring-1 ring-line ' + className}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-[15px] font-semibold">{titulo}</h3>
          {detalle && <p className="mt-0.5 text-[13px] text-muted">{detalle}</p>}
        </div>
        {accion}
      </div>
      {children}
    </section>
  )
}

/** Cambio contra el periodo anterior: ▲ 12 % / ▼ 30 % / "nuevo". */
export function Cambio({ ahora, antes, invertir = false }: { ahora: number; antes: number; invertir?: boolean }) {
  if (!antes && !ahora) return <span className="text-[13px] text-muted">sin cambio</span>
  if (!antes) return <span className="text-[13px] font-semibold text-ok">nuevo</span>
  const pct = Math.round(((ahora - antes) / antes) * 100)
  if (pct === 0) return <span className="text-[13px] text-muted">igual que antes</span>
  const bueno = invertir ? pct < 0 : pct > 0
  return (
    <span className={'text-[13px] font-semibold ' + (bueno ? 'text-ok' : 'text-danger')}>
      {pct > 0 ? '▲' : '▼'} {Math.abs(pct)} %<span className="sr-only">{pct > 0 ? ' más' : ' menos'} que el periodo anterior</span>
    </span>
  )
}

export function Cifra({ etiqueta, valor, pie }: { etiqueta: string; valor: ReactNode; pie?: ReactNode }) {
  return (
    <div className="min-w-0 rounded-3xl bg-surface p-4 shadow-card ring-1 ring-line sm:p-5">
      <p className="text-[13px] text-muted">{etiqueta}</p>
      <p className="mt-1 truncate font-display text-[28px] sm:text-[34px] leading-none tabular-nums">{valor}</p>
      {pie && <p className="mt-2 text-[13px] text-muted">{pie}</p>}
    </div>
  )
}

/**
 * Barras verticales por mes. `enCurso` aclara la última barra (el mes no ha terminado).
 * Al pasar el mouse (o tocar) una barra se ve su valor exacto.
 */
export function BarrasMes({ meses, valores, formato = (n) => String(n), alto = 200, enCurso = true, nombre }: {
  meses: string[]
  valores: number[]
  formato?: (n: number) => string
  alto?: number
  enCurso?: boolean
  nombre: string
}) {
  const [ref, ancho] = useAncho<HTMLDivElement>()
  const [activa, setActiva] = useState<number | null>(null)
  const izq = 44
  const abajo = 22
  const arriba = 8
  const max = Math.max(...valores, 0)
  const ticks = marcas(max)
  const tope = ticks[ticks.length - 1] || 1
  const util = Math.max(0, ancho - izq)
  const col = valores.length ? util / valores.length : 0
  const barra = Math.max(4, Math.min(36, col - 8))
  const y = (v: number) => arriba + (alto - arriba - abajo) * (1 - v / tope)
  const base = y(0)

  return (
    <div ref={ref} className="relative" onMouseLeave={() => setActiva(null)}>
      {ancho > 0 && (
        <svg width={ancho} height={alto} role="img" aria-label={`${nombre}: ${meses.map((m, i) => `${mesLargo(m)} ${formato(valores[i])}`).join(', ')}`}>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={izq} x2={ancho} y1={y(t)} y2={y(t)} stroke="var(--color-line)" strokeWidth={1} />
              <text x={izq - 8} y={y(t) + 4} textAnchor="end" fontSize={11} fill="var(--color-muted)">{formato(t)}</text>
            </g>
          ))}
          {valores.map((v, i) => {
            const x = izq + col * i + (col - barra) / 2
            const h = Math.max(0, base - y(v))
            const r = Math.min(4, h, barra / 2)
            const ultimo = enCurso && i === valores.length - 1
            return (
              <g key={meses[i]}>
                {h > 0 && (
                  <path
                    d={`M${x},${base} V${base - h + r} Q${x},${base - h} ${x + r},${base - h} H${x + barra - r} Q${x + barra},${base - h} ${x + barra},${base - h + r} V${base} Z`}
                    fill="var(--color-ink)"
                    opacity={activa === null || activa === i ? (ultimo ? 0.45 : 1) : ultimo ? 0.25 : 0.55}
                  />
                )}
                {(col >= 26 || i % 2 === valores.length % 2 || i === valores.length - 1) && (
                  <text x={izq + col * i + col / 2} y={alto - 6} textAnchor="middle" fontSize={11} fill={activa === i ? 'var(--color-ink)' : 'var(--color-muted)'} fontWeight={activa === i ? 600 : 400}>
                    {mesCorto(meses[i])}
                  </text>
                )}
                {/* Zona de toque: toda la columna, más grande que la barra. */}
                <rect x={izq + col * i} y={0} width={col} height={alto} fill="transparent" onMouseEnter={() => setActiva(i)} onClick={() => setActiva(i)} />
              </g>
            )
          })}
        </svg>
      )}
      {activa !== null && ancho > 0 && (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-xl bg-ink px-3 py-2 text-[12px] text-bg shadow-card"
          style={{ left: Math.min(Math.max(izq + col * activa + col / 2, 70), ancho - 70), top: Math.max(y(valores[activa]) - 6, 40) }}
        >
          <span className="block opacity-75">{mesLargo(meses[activa])}{enCurso && activa === valores.length - 1 ? ' (en curso)' : ''}</span>
          <b className="text-[14px] tabular-nums">{formato(valores[activa])}</b>
        </div>
      )}
    </div>
  )
}

/** Barras horizontales (ranking): nombre, barra proporcional y valor. */
export function BarrasH({ items, formato = (n) => String(n), extra, vacio = 'Sin datos todavía.' }: {
  items: { nombre: string; n: number }[]
  formato?: (n: number) => string
  extra?: (i: number) => ReactNode
  vacio?: string
}) {
  if (!items.length) return <p className="text-[14px] text-muted">{vacio}</p>
  const max = Math.max(...items.map((i) => i.n), 1)
  return (
    <ul className="space-y-2.5">
      {items.map((it, i) => (
        <li key={it.nombre} title={`${it.nombre}: ${formato(it.n)}`}>
          <div className="flex items-baseline justify-between gap-3 text-[13px]">
            <span className="min-w-0 truncate">{it.nombre}</span>
            <span className="shrink-0 font-semibold tabular-nums">{formato(it.n)}{extra && <span className="ml-1.5 font-normal text-muted">{extra(i)}</span>}</span>
          </div>
          <div className="mt-1 h-2 rounded-full bg-sand">
            <div className="h-2 rounded-full bg-ink" style={{ width: `${Math.max(2, (it.n / max) * 100)}%` }} />
          </div>
        </li>
      ))}
    </ul>
  )
}

/** Mapa de calor día × hora: un solo tono, de claro (pocas citas) a oscuro (muchas). */
export function MapaCalor({ dias, desde, mapa }: { dias: string[]; desde: number; mapa: number[][] }) {
  const [activa, setActiva] = useState<{ d: number; h: number } | null>(null)
  const max = Math.max(1, ...mapa.flat())
  // Lunes primero.
  const orden = [1, 2, 3, 4, 5, 6, 0]
  const horas = mapa[0]?.map((_, i) => desde + i) ?? []
  const h12 = (h: number) => `${h % 12 || 12}${h < 12 ? 'a' : 'p'}`
  const total = mapa.flat().reduce((a, b) => a + b, 0)
  if (!total) return <p className="text-[14px] text-muted">Todavía no hay citas para ver las horas más pedidas.</p>
  return (
    <div>
      <div className="relative overflow-x-auto">
        <table className="w-full border-separate" style={{ borderSpacing: 2 }}>
          <thead>
            <tr>
              <th className="w-10" />
              {horas.map((h) => <th key={h} scope="col" className="pb-1 text-center text-[11px] font-normal text-muted">{h12(h)}</th>)}
            </tr>
          </thead>
          <tbody>
            {orden.map((d) => (
              <tr key={d}>
                <th scope="row" className="pr-2 text-left text-[12px] font-normal capitalize text-muted">{dias[d]}</th>
                {mapa[d].map((n, i) => (
                  <td
                    key={i}
                    onMouseEnter={() => setActiva({ d, h: horas[i] })}
                    onMouseLeave={() => setActiva(null)}
                    title={`${dias[d]} ${h12(horas[i])}: ${n} ${n === 1 ? 'cita' : 'citas'}`}
                    className={'h-7 min-w-6 rounded-md text-center text-[11px] tabular-nums ' + (activa?.d === d && activa.h === horas[i] ? 'ring-2 ring-ink' : '')}
                    style={{ background: n ? `color-mix(in oklab, var(--color-ink) ${Math.round(12 + (n / max) * 88)}%, var(--color-sand))` : 'var(--color-sand)', color: n / max > 0.5 ? 'var(--color-bg)' : 'var(--color-ink)' }}
                  >
                    {n || ''}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-3 flex items-center justify-end gap-2 text-[12px] text-muted">
        <span>Menos</span>
        {[12, 40, 70, 100].map((p) => <span key={p} className="size-3 rounded" style={{ background: `color-mix(in oklab, var(--color-ink) ${p}%, var(--color-sand))` }} />)}
        <span>Más citas</span>
      </div>
    </div>
  )
}

/** Proporción por estado: una barra partida con su leyenda (texto + número, no solo color). */
export function Proporcion({ partes }: { partes: { nombre: string; n: number; color: string }[] }) {
  const total = partes.reduce((a, p) => a + p.n, 0)
  if (!total) return <p className="text-[14px] text-muted">Sin negocios todavía.</p>
  const visibles = partes.filter((p) => p.n > 0)
  return (
    <div>
      <div className="flex h-4 gap-[2px] overflow-hidden rounded-full" role="img" aria-label={visibles.map((p) => `${p.nombre}: ${p.n}`).join(', ')}>
        {visibles.map((p) => <div key={p.nombre} title={`${p.nombre}: ${p.n}`} style={{ flexGrow: p.n, background: p.color }} />)}
      </div>
      <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-[13px]">
        {partes.map((p) => (
          <li key={p.nombre} className="flex items-center gap-2">
            <span className="size-2.5 shrink-0 rounded-full" style={{ background: p.color }} />
            <span className="min-w-0 flex-1 truncate">{p.nombre}</span>
            <b className="tabular-nums">{p.n}</b>
          </li>
        ))}
      </ul>
    </div>
  )
}

/** Minibarras para una fila de tabla (últimos meses). */
export function Minibarras({ valores, etiqueta }: { valores: number[]; etiqueta: string }) {
  const max = Math.max(1, ...valores)
  return (
    <span className="inline-flex h-6 items-end gap-[2px]" role="img" aria-label={etiqueta}>
      {valores.map((v, i) => (
        <span key={i} className="w-1.5 rounded-t-sm bg-ink" style={{ height: `${Math.max(v ? 12 : 4, (v / max) * 100)}%`, opacity: v ? (i === valores.length - 1 ? 0.45 : 1) : 0.15 }} />
      ))}
    </span>
  )
}
