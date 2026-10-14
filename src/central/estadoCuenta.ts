/**
 * Lee el estado de cuenta que se descarga del banco (Excel, CSV o texto) y saca los abonos:
 * fecha, referencia, descripción y monto. Busca la fila de títulos sola, así sirve para el
 * de Banco de Venezuela y para casi cualquier otro banco. Los cargos (salidas) se ignoran.
 */
import type { FilaBanco } from './api'

type Celda = string | number | boolean | Date | null | undefined

const normal = (v: Celda) =>
  String(v ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()

/** "1.234,56" · "1,234.56" · "1234.56" · "Bs. 395,00" · 395 → número (NaN si no es un monto). */
export function monto(v: Celda): number {
  if (typeof v === 'number') return v
  let s = String(v ?? '').replace(/[^\d,.-]/g, '')
  if (!/\d/.test(s)) return NaN
  const coma = s.lastIndexOf(',')
  const punto = s.lastIndexOf('.')
  if (coma > -1 && punto > -1) {
    // El último separador es el decimal.
    s = coma > punto ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '')
  } else if (coma > -1) {
    s = s.length - coma - 1 === 3 && s.indexOf(',') !== coma ? s.replace(/,/g, '') : s.replace(/\./g, '').replace(',', '.')
  } else if (punto > -1 && (s.match(/\./g) || []).length > 1) {
    s = s.replace(/\./g, '')
  }
  return Number(s)
}

const dos = (n: number) => String(n).padStart(2, '0')

/** dd/mm/aaaa, aaaa-mm-dd, dd-mm-aa, número de serie de Excel o Date → aaaa-mm-dd ('' si no es fecha). */
export function fecha(v: Celda): string {
  if (v instanceof Date && !Number.isNaN(v.getTime())) return `${v.getFullYear()}-${dos(v.getMonth() + 1)}-${dos(v.getDate())}`
  if (typeof v === 'number' && v > 30000 && v < 80000) {
    const d = new Date(Math.round((v - 25569) * 86400_000))
    return `${d.getUTCFullYear()}-${dos(d.getUTCMonth() + 1)}-${dos(d.getUTCDate())}`
  }
  const s = String(v ?? '').trim()
  let m = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/)
  if (m) return `${m[1]}-${dos(+m[2])}-${dos(+m[3])}`
  m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})/)
  if (m) {
    const a = m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3])
    if (+m[2] >= 1 && +m[2] <= 12 && +m[1] >= 1 && +m[1] <= 31) return `${a}-${dos(+m[2])}-${dos(+m[1])}`
  }
  return ''
}

interface Columnas {
  fecha: number
  referencia: number
  descripcion: number
  /** Columna de abonos/créditos (solo entradas). */
  abono: number
  /** Columna de monto con signo (si no hay columna de abonos). */
  monto: number
}

function columnas(fila: Celda[]): Columnas | null {
  const t = fila.map(normal)
  const busca = (re: RegExp, salvo?: RegExp) => t.findIndex((x) => re.test(x) && !(salvo && salvo.test(x)))
  const c: Columnas = {
    fecha: busca(/fecha/, /valor/),
    referencia: busca(/referencia|^ref\b|^ref\.|documento|comprobante|operacion|n[°ºo]\.? ?ref/, /fecha|monto|saldo/),
    descripcion: busca(/descripcion|concepto|detalle|transaccion|movimiento/),
    abono: busca(/abono|credito|haber|ingreso|entrada/),
    monto: busca(/monto|importe|cantidad/),
  }
  if (c.fecha < 0 && fila.length) c.fecha = busca(/^fecha/)
  return c.fecha > -1 && c.referencia > -1 && (c.abono > -1 || c.monto > -1) ? c : null
}

/** Convierte las filas de una hoja en abonos. Lanza un error claro si no encuentra los títulos. */
export function abonosDesdeTabla(filas: Celda[][]): FilaBanco[] {
  let c: Columnas | null = null
  let inicio = 0
  for (let i = 0; i < Math.min(filas.length, 40); i++) {
    c = columnas(filas[i] || [])
    if (c) {
      inicio = i + 1
      break
    }
  }
  if (!c) throw new Error('No encontré las columnas Fecha, Referencia y Abono/Crédito/Monto. Descarga el estado de cuenta en Excel o CSV.')
  const out: FilaBanco[] = []
  for (const f of filas.slice(inicio)) {
    if (!f) continue
    const valor = monto(c.abono > -1 ? f[c.abono] : f[c.monto])
    const ref = String(f[c.referencia] ?? '').replace(/\D/g, '')
    const dia = fecha(f[c.fecha])
    if (!(valor > 0) || ref.length < 4 || !dia) continue
    out.push({ fecha: dia, referencia: ref, descripcion: String(c.descripcion > -1 ? f[c.descripcion] ?? '' : '').trim().slice(0, 120), monto: Math.round(valor * 100) / 100 })
  }
  return out
}

/** Lee el archivo (xls, xlsx, csv o txt) y devuelve los abonos de todas sus hojas. */
export async function leerEstadoCuenta(archivo: File): Promise<FilaBanco[]> {
  if (/\.pdf$/i.test(archivo.name)) throw new Error('El PDF no se puede leer. En la web del banco descarga el estado de cuenta en Excel (.xls) o CSV.')
  const XLSX = await import('xlsx')
  const texto = /\.(csv|txt)$/i.test(archivo.name)
  const libro = texto
    ? XLSX.read(await archivo.text(), { type: 'string', raw: true, FS: /;/.test((await archivo.text()).split('\n')[0] || '') ? ';' : undefined })
    : XLSX.read(await archivo.arrayBuffer(), { type: 'array', cellDates: true })
  let error: Error | null = null
  const todas: FilaBanco[] = []
  for (const nombre of libro.SheetNames) {
    const filas = XLSX.utils.sheet_to_json<Celda[]>(libro.Sheets[nombre], { header: 1, raw: true, defval: '' })
    try {
      todas.push(...abonosDesdeTabla(filas))
    } catch (e) {
      error = e as Error
    }
  }
  if (!todas.length && error) throw error
  return todas
}
