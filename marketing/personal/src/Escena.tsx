import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion'
import { TEXTO } from './fuentes'
import { Lineas } from './Lineas'
import { COLOR, MARGEN, OLA, TIPO, clamp, ease, lerp, p, tw } from './marca'
import { Telefono } from './Telefono'
import type { Escena as TEscena } from './tipos'

/**
 * Escena de marca a pantalla completa, con la misma gramática que los reels de la campaña:
 * kicker, titular por líneas, texto de apoyo, link que se escribe, pastilla y teléfonos que
 * suben con la captura real. `rel(t)` pasa un segundo del original a segundos de la escena.
 */
export const Escena: React.FC<{ e: TEscena; rel: (t: number) => number }> = ({ e, rel }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const t = frame / fps
  const negro = e.fondo === 'negro'
  const tinta = negro ? COLOR.papel : COLOR.carbon
  const fondo = negro ? COLOR.carbon : COLOR.papel
  const entrada = e.entrada ?? 'ola'
  const k = ease.inOut(p(t, 0, 0.45))
  const mover = entrada === 'ola' ? `translateY(${lerp(100, 0, k)}%)` : entrada === 'lado' ? `translateX(${lerp(-100, 0, k)}%)` : 'none'
  const base = entrada === 'corte' ? 0.05 : 0.3
  const estilo = { ...TIPO[e.estilo ?? 'mega'], ...(e.tamano ? { fontSize: e.tamano } : {}) }
  const aparece = (a: number, y = 30) => {
    const v = clamp(tw(t, a, 0.5, 0, 1))
    return { opacity: v, transform: `translateY(${(1 - v) * y}px)` }
  }
  const linkEn = base + 0.45
  const escrito = e.link ? e.link.slice(0, Math.round(clamp(p(t, linkEn + 0.3, 1.0)) * e.link.length)) : ''

  return (
    <AbsoluteFill style={{ transform: mover }}>
      {entrada === 'ola' ? (
        <div style={{ position: 'absolute', left: 0, right: 0, top: -159, height: 160, background: fondo, WebkitMask: `${OLA} bottom/100% 100% no-repeat`, mask: `${OLA} bottom/100% 100% no-repeat` }} />
      ) : null}
      <AbsoluteFill style={{ background: fondo, color: tinta, overflow: 'hidden' }}>
        {e.kicker ? <div style={{ position: 'absolute', top: 200, left: MARGEN, ...(TIPO.kicker as React.CSSProperties), transform: aparece(base - 0.05, 20).transform, opacity: 0.6 * clamp(tw(t, base - 0.05, 0.5, 0, 1)) }}>{e.kicker}</div> : null}
        <div style={{ position: 'absolute', top: 270, left: MARGEN, right: 60 }}>
          {e.tiempos ? (
            e.titulo.map((l, i) => <Lineas key={i} lineas={[l]} estilo={estilo} a={Math.max(base, rel(e.tiempos![i]))} />)
          ) : (
            <Lineas lineas={e.titulo} estilo={estilo} a={base} />
          )}
          {e.texto ? (
            <div style={{ fontFamily: TEXTO, fontSize: 44, lineHeight: 1.35, maxWidth: 860, marginTop: 44, ...aparece(e.textoEn != null ? rel(e.textoEn) : base + 0.45) }}>
              <span style={{ opacity: 0.75 }}>{e.texto}</span>
            </div>
          ) : null}
          {e.link ? (
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                border: '7px solid currentColor',
                borderRadius: 999,
                padding: '26px 26px 26px 50px',
                gap: 30,
                marginTop: 60,
                fontFamily: TEXTO,
                fontWeight: 500,
                fontSize: 44,
                lineHeight: 1,
                ...aparece(linkEn),
              }}
            >
              <span>
                bookeaa.com/u/<b style={{ fontWeight: 600 }}>{escrito}</b>
                <span style={{ display: 'inline-block', width: 5, height: 52, background: 'currentColor', marginLeft: 4, verticalAlign: -8, opacity: Math.floor(t * 3) % 2 ? 0 : 1 }} />
              </span>
              <span style={{ background: 'currentColor', borderRadius: 999, padding: '22px 34px' }}>
                <span style={{ color: fondo, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 40, letterSpacing: '0.08em' }}>COPIAR</span>
              </span>
            </div>
          ) : null}
          {e.burbujas ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 22, marginTop: 70 }}>
              {e.burbujas.map((b, i) => {
                const a = Math.max(base, rel(b.en))
                const k = clamp(tw(t, a, 0.35, 0, 1))
                return (
                  <div
                    key={i}
                    style={{
                      alignSelf: b.propia ? 'flex-end' : 'flex-start',
                      maxWidth: 780,
                      background: b.propia ? tinta : negro ? '#262624' : COLOR.niebla,
                      color: b.propia ? fondo : tinta,
                      borderRadius: b.propia ? '44px 44px 12px 44px' : '44px 44px 44px 12px',
                      padding: '30px 40px',
                      fontFamily: TEXTO,
                      fontSize: 50,
                      lineHeight: 1.25,
                      opacity: k,
                      transform: `translateY(${(1 - k) * 30}px) scale(${0.9 + 0.1 * k})`,
                      transformOrigin: b.propia ? 'right bottom' : 'left bottom',
                    }}
                  >
                    {b.texto}
                  </div>
                )
              })}
              {e.visto ? (
                <div style={{ fontFamily: TEXTO, fontSize: 36, opacity: 0.6 * clamp(tw(t, Math.max(base, rel(e.visto.en)), 0.4, 0, 1)), marginTop: 6 }}>{e.visto.texto}</div>
              ) : null}
            </div>
          ) : null}
          {e.pastilla ? (
            <div
              style={{
                display: 'inline-block',
                marginTop: 60,
                borderRadius: 999,
                padding: '22px 40px',
                fontFamily: "'Barlow Condensed', sans-serif",
                fontWeight: 700,
                fontSize: 44,
                lineHeight: 1,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                background: tinta,
                color: fondo,
                ...aparece(base + 0.5),
              }}
            >
              {e.pastilla}
            </div>
          ) : null}
        </div>
        {e.evento
          ? (() => {
              const ev = e.evento
              const a = Math.max(base, rel(ev.en))
              const k = clamp(tw(t, a, 0.5, 0, 1))
              return (
                <div
                  style={{
                    position: 'absolute',
                    left: ev.x ?? 200,
                    top: ev.y ?? 1250,
                    zIndex: 5,
                    width: 780,
                    background: negro ? COLOR.papel : COLOR.carbon,
                    color: negro ? COLOR.carbon : COLOR.papel,
                    borderRadius: 48,
                    padding: '50px 54px',
                    boxShadow: '0 60px 120px -40px rgb(15 15 14 / 0.6)',
                    opacity: k,
                    transform: `translateY(${(1 - k) * 80}px) scale(${0.94 + 0.06 * k})`,
                  }}
                >
                  <p style={{ margin: 0, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600, fontSize: 32, letterSpacing: '0.16em', opacity: 0.6 }}>GOOGLE CALENDAR</p>
                  <div style={{ display: 'flex', gap: 34, marginTop: 30 }}>
                    <span style={{ width: 10, borderRadius: 9, background: 'currentColor', flex: 'none' }} />
                    <div>
                      <p style={{ margin: 0, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 76, lineHeight: 1, textTransform: 'uppercase' }}>{ev.titulo}</p>
                      <p style={{ margin: '12px 0 0', fontFamily: TEXTO, fontSize: 36, opacity: 0.72 }}>{ev.cuando}</p>
                      <p style={{ margin: '4px 0 0', fontFamily: TEXTO, fontSize: 36, opacity: 0.72 }}>{ev.quien}</p>
                    </div>
                  </div>
                  <p style={{ margin: '38px 0 0', paddingTop: 30, borderTop: '2px solid rgb(127 127 127 / 0.3)', fontFamily: TEXTO, fontSize: 36, fontWeight: 500 }}>
                    <b>✓</b> Guardado en tu calendario y en el suyo
                  </p>
                </div>
              )
            })()
          : null}
        {(e.telefonos ?? []).map((tel, i) => {
          const a = tel.en != null ? Math.max(base, rel(tel.en)) : base + 0.5 + i * 0.3
          const y = tw(t, a, 0.9, 1920, tel.y)
          const r = tw(t, a, 0.9, (tel.rot ?? 0) * 2.4, tel.rot ?? 0)
          return <Telefono key={i} img={tel.img} ancho={tel.ancho ?? 560} oscuro={negro} style={{ left: tel.x, top: 0, transform: `translateY(${y}px) rotate(${r}deg)` }} />
        })}
      </AbsoluteFill>
    </AbsoluteFill>
  )
}
