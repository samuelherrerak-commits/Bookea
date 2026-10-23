import { describe, expect, it } from 'vitest'
import { funcionesGs } from '../sync/appsScript'
import { idsDeServicios } from './Configurar'

const gs = Object.values(import.meta.glob('../../apps-script/Code.gs', { query: '?raw', import: 'default', eager: true }) as Record<string, string>)[0] ?? ''
type Fn = (...a: any[]) => any
const f = funcionesGs<Record<string, Fn>>(gs, ['idsComoLaPagina_', 'assignIds_', 'slug_'], {})

// Servicios creados desde Mi negocio: sin ID en la hoja (antes todos llegaban con id '').
const lista = [
  { id: '', nombre: 'Corte de dama' },
  { id: '', nombre: 'Cepillado' },
  { id: 'tinte', nombre: 'Tinte completo' },
  { id: '', nombre: 'Corte de dama' },
  { id: '', nombre: 'Peinado para evento ✨' },
]

describe('equipo: cada servicio con su propio ID', () => {
  it('Mi negocio y el servidor ponen los mismos IDs que la página, sin repetir', () => {
    const servidor = f.idsComoLaPagina_(lista).map((s: { id: string }) => s.id)
    const cliente = idsDeServicios(lista).map((s) => s.id)
    expect(servidor).toEqual(['corte-de-dama', 'cepillado', 'tinte', 'corte-de-dama-2', 'peinado-para-evento'])
    expect(cliente).toEqual(servidor)
    expect(new Set(cliente).size).toBe(lista.length)
  })
})
