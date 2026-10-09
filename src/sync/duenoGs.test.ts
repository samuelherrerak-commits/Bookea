import { createHmac } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { funcionesGs } from './appsScript'

const gs = Object.values(import.meta.glob('../../apps-script/Code.gs', { query: '?raw', import: 'default', eager: true }) as Record<string, string>)[0] ?? ''
type Fn = (...a: any[]) => any

const props = (p: Record<string, string>) => ({
  getScriptProperties: () => ({ getProperty: (k: string) => p[k] ?? null, setProperty: (k: string, v: string) => { p[k] = v } }),
})
const Utilities = {
  computeHmacSha256Signature: (texto: string, clave: string) => [...createHmac('sha256', clave).update(texto).digest()],
  base64EncodeWebSafe: (bytes: number[]) => Buffer.from(bytes).toString('base64').replace(/\+/g, '-').replace(/\//g, '_'),
  getUuid: () => 'u-' + Math.random(),
  formatDate: (d: Date) => d.toISOString().slice(0, 10),
}
const AHORA = Date.UTC(2026, 9, 9, 15)

describe('Code.gs · Mi negocio', () => {
  it('la sesión firmada vale 30 días y no se puede alterar', () => {
    const p: Record<string, string> = {}
    const { crearSesion_, leerSesion_ } = funcionesGs<{ crearSesion_: Fn; leerSesion_: Fn }>(
      gs, ['crearSesion_', 'leerSesion_', 'firmar_', 'secretoSesion_'], { PropertiesService: props(p), Utilities, SESION_DIAS: 30 })
    const s = crearSesion_('Ana@Gmail.com', AHORA)
    expect(leerSesion_(s, AHORA)).toBe('ana@gmail.com')
    expect(leerSesion_(s, AHORA + 31 * 86400000)).toBeNull()
    expect(leerSesion_(s.replace('ana@', 'eva@'), AHORA)).toBeNull()
    expect(leerSesion_('basura', AHORA)).toBeNull()
    // Cambiar el secreto cierra todas las sesiones.
    p.sesion_secreto = 'otro'
    expect(leerSesion_(s, AHORA)).toBeNull()
  })

  it('cada correo ve solo sus negocios activos; los admins ven todos', () => {
    const tenants = [
      { slug: 'barberia', email: 'ana@gmail.com', activo: 'si' },
      { slug: 'spa', email: 'eva@gmail.com, ana@gmail.com', activo: 'si' },
      { slug: 'cerrado', email: 'ana@gmail.com', activo: 'no' },
      { slug: 'otro', email: 'luis@gmail.com', activo: 'si' },
    ]
    const { negociosDe_ } = funcionesGs<{ negociosDe_: Fn }>(gs, ['negociosDe_', 'esAdminDueno_'], {
      PropertiesService: props({ dueno_admins: 'jefe@gmail.com' }),
      tenantActivo_: (t: { activo: string }) => t.activo === 'si',
    })
    expect(negociosDe_('ana@gmail.com', tenants).map((t: { slug: string }) => t.slug)).toEqual(['barberia', 'spa'])
    expect(negociosDe_('nadie@gmail.com', tenants)).toEqual([])
    expect(negociosDe_('jefe@gmail.com', tenants)).toHaveLength(3)
  })

  it('lee las citas del rango, ordenadas por fecha y hora', () => {
    const { citasEntre_ } = funcionesGs<{ citasEntre_: Fn }>(gs, ['citasEntre_', 'horaTexto_', 'ymd_', 'toNumber_'], { Utilities, ZONA: 'America/Caracas' })
    const fila = (id: string, fecha: string, hora: string, extra = {}) => ({
      ID: id, Cliente: 'C' + id, Telefono: '0412', Servicios: 'Corte', Total: 10, Fecha_Cita: fecha, Hora_Cita: hora,
      Metodo_Pago: 'Pago en la cita', Estado: 'Confirmada', Modalidad: 'En la barbería', Direccion: '', Comprobante: 'N/A', Recibo_N: '', ...extra,
    })
    const citas = citasEntre_([
      fila('b', '2026-10-09', '15:00'),
      fila('a', '2026-10-09', '9:30'),
      fila('c', '2026-10-10', '10:00', { Comprobante: 'https://drive.google.com/x', Estado: 'Pago por verificar' }),
      fila('d', '2026-10-12', '10:00'),
      fila('', '2026-10-09', '10:00'),
    ], '2026-10-09', '2026-10-10')
    expect(citas.map((c: { id: string }) => c.id)).toEqual(['a', 'b', 'c'])
    expect(citas[0].hora).toBe('09:30')
    expect(citas[2]).toMatchObject({ capture: 'https://drive.google.com/x', estado: 'Pago por verificar' })
    expect(citas[0].capture).toBe('')
  })
})
