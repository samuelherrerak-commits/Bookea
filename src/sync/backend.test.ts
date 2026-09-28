import { describe, expect, it } from 'vitest'
import { LUGAR_TIPOS } from '../lib/lugar'
import { PLANTILLAS_MENSAJE } from '../lib/mensajes'
import { constanteGs } from './appsScript'

const archivos = import.meta.glob('../../apps-script/Code.gs', { query: '?raw', import: 'default', eager: true })
const gs = Object.values(archivos as Record<string, string>)[0] ?? ''

describe('Code.gs y el front tienen las mismas listas', () => {
  it('tipos de lugar', () => {
    expect(constanteGs(gs, 'LUGAR_TIPOS')).toEqual(LUGAR_TIPOS)
  })

  it('las 3 plantillas de mensaje, letra por letra', () => {
    expect(constanteGs(gs, 'PLANTILLAS_MENSAJE')).toEqual(PLANTILLAS_MENSAJE)
  })
})
