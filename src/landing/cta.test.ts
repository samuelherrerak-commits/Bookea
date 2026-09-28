import { describe, expect, it } from 'vitest'
import { TRIAL_MESSAGE, trialWhatsappUrl } from './cta'

describe('trialWhatsappUrl', () => {
  it('arma el enlace de wa.me con el mensaje de la prueba', () => {
    const url = new URL(trialWhatsappUrl('+58 412-251-6390'))
    expect(url.origin + url.pathname).toBe('https://wa.me/584122516390')
    expect(url.searchParams.get('text')).toBe(TRIAL_MESSAGE)
  })
})
