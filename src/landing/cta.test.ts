import { describe, expect, it } from 'vitest'
import { TRIAL_MESSAGE, trialWhatsappUrl } from './cta'

describe('trialWhatsappUrl', () => {
  it('arma el enlace de wa.me con el mensaje de la prueba', () => {
    const url = new URL(trialWhatsappUrl('+58 412-251-6390'))
    expect(url.origin + url.pathname).toBe('https://wa.me/584122516390')
    expect(url.searchParams.get('text')).toBe(TRIAL_MESSAGE)
  })

  it('por defecto va al WhatsApp de bookeaa, no al respaldo de los negocios', () => {
    expect(new URL(trialWhatsappUrl()).pathname).toBe('/584220298203')
  })
})

describe('bookeaa team', async () => {
  const { precioTeam, teamWhatsappUrl } = await import('./cta')
  it('precio: $25 hasta 5 personas y $5 por cada una más', () => {
    expect([2, 5, 6, 10].map(precioTeam)).toEqual([25, 25, 30, 50])
  })
  it('el pedido va por WhatsApp a bookeaa', () => {
    expect(teamWhatsappUrl('584220298203')).toMatch(/^https:\/\/wa\.me\/584220298203\?text=.*bookeaa%20team/)
  })
})
