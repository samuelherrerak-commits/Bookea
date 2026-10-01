import '@fontsource/barlow-condensed/500.css'
import '@fontsource/barlow-condensed/600.css'
import '@fontsource/barlow-condensed/700.css'
import '@fontsource/barlow-condensed/800.css'
import '@fontsource/barlow/400.css'
import '@fontsource/barlow/500.css'
import '@fontsource/barlow/600.css'

import { useEffect, useState } from 'react'
import { DEMO_PATH, trialWhatsappUrl } from './cta'
import { Logo } from './icons'
import { PhoneMockup } from './PhoneMockup'
import { Banner, Faq, Features, FinalCta, HowItWorks, Pricing, Problem, Templates } from './sections'
import { Brackets, Crosses, PillButton, Reveal } from './ui'

const NAV = [
  { href: '#como-funciona', label: 'Cómo funciona' },
  { href: '#funciones', label: 'Funciones' },
  { href: '#plantillas', label: 'Plantillas' },
  { href: '#precio', label: 'Precio' },
  { href: '#preguntas', label: 'Preguntas' },
]

export default function Landing() {
  const trial = trialWhatsappUrl()

  useEffect(() => {
    document.title = 'bookeaa · Tu agenda online, sin libreta'
    document.body.style.background = '#ffffff'
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', '#ffffff')
    document.querySelector<HTMLLinkElement>('link[rel="icon"]')?.setAttribute('href', '/bookeaa.svg')
    document.documentElement.style.scrollBehavior = 'smooth'
  }, [])

  return (
    <div className="min-h-dvh overflow-x-clip bg-paper font-barlow text-coal antialiased">
      <a
        href="#contenido"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-full focus:bg-coal focus:px-4 focus:py-2 focus:text-paper"
      >
        Saltar al contenido
      </a>

      <header className="sticky top-0 z-40 border-b border-rule bg-paper">
        <nav className="mx-auto flex h-16 max-w-[1200px] items-center justify-between gap-6 px-4 md:px-8" aria-label="Principal">
          <a href="#inicio" aria-label="bookeaa, inicio" className="text-coal">
            <Logo />
          </a>
          <ul className="hidden items-center gap-7 lg:flex">
            {NAV.map((item) => (
              <li key={item.href}>
                <a
                  href={item.href}
                  className="font-condensed text-[16px] font-semibold uppercase tracking-[0.08em] text-graphite transition-colors duration-150 hover:text-coal"
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
          <PillButton href={trial} external className="h-10! px-4! text-[14px]!">
            Prueba gratis
          </PillButton>
        </nav>
      </header>

      <main id="contenido">
        <section id="inicio" className="relative">
          <Crosses className="top-16 right-6" />
          <div className="mx-auto grid max-w-[1200px] items-center gap-14 px-4 pt-12 pb-20 md:px-8 md:pt-20 lg:grid-cols-[1.15fr_1fr] lg:gap-8 lg:pb-28">
            <div>
              <Reveal>
                <p className="font-condensed text-[15px] font-semibold uppercase tracking-[0.16em] text-graphite">
                  Agenda online para negocios
                </p>
              </Reveal>
              <Reveal delay={0.05}>
                <h1 className="mt-5 font-condensed text-[clamp(60px,9vw,128px)] leading-[0.86] font-extrabold uppercase tracking-[-0.015em]">
                  <Brackets>
                    <span className="block whitespace-nowrap">Tu agenda,</span>
                    <span className="block whitespace-nowrap">sin libreta.</span>
                  </Brackets>
                </h1>
              </Reveal>
              <Reveal delay={0.1}>
                <p className="mt-8 font-condensed text-[22px] leading-tight font-bold uppercase tracking-[0.04em] md:text-[26px]">
                  Tus clientes reservan solos.
                  <br />
                  Tú solo atiendes.
                </p>
                <p className="mt-4 max-w-[46ch] text-[18px] leading-relaxed text-graphite text-pretty">
                  Compartes tu link, tus clientes eligen servicio y hora, y la cita queda guardada en tu Google Calendar y en
                  el de ellos. Sin mensajes de ida y vuelta, sin olvidos.
                </p>
              </Reveal>
              <Reveal delay={0.15} className="mt-9 flex flex-wrap items-center gap-3">
                <PillButton href={trial} external size="lg">
                  Prueba 1 mes gratis
                </PillButton>
                {DEMO_PATH && (
                  <PillButton href={DEMO_PATH} variant="outline" size="lg">
                    Ver una agenda real
                  </PillButton>
                )}
              </Reveal>
              <Reveal delay={0.2}>
                <p className="mt-5 font-condensed text-[15px] font-semibold uppercase tracking-[0.1em] text-graphite">
                  30 días gratis · Luego $15/mes · Sin tarjeta
                </p>
              </Reveal>
            </div>

            <Reveal delay={0.1} className="relative">
              <PhoneMockup />
            </Reveal>
          </div>

          {/* La ola de la referencia: el hero "se derrite" en el bloque negro de abajo. */}
          <svg
            aria-hidden
            viewBox="0 0 1440 120"
            preserveAspectRatio="none"
            className="block h-[60px] w-full text-coal md:h-[110px]"
          >
            <path
              fill="currentColor"
              d="M0 86c120-18 214-62 360-58 170 5 236 70 420 70 176 0 238-84 400-90 110-4 190 22 260 40v72H0z"
            />
          </svg>
        </section>

        <Problem />
        <HowItWorks />
        <Features />
        <Templates />
        <Banner trial={trial} />
        <Pricing trial={trial} />
        <Faq />
        <FinalCta trial={trial} />
      </main>

      <AvisoDeslizar />

      <footer className="border-t border-rule">
        <div className="mx-auto grid max-w-[1200px] gap-10 px-4 py-14 md:grid-cols-[1.4fr_1fr_1fr] md:px-8">
          <div>
            <Logo />
            <p className="mt-4 max-w-[38ch] text-[15px] leading-relaxed text-graphite">
              La agenda online para negocios que atienden con cita: peluquerías, barberías, uñas, estética, consultas y
              más.
            </p>
          </div>
          <div>
            <p className="font-condensed text-[14px] font-bold uppercase tracking-[0.14em]">Producto</p>
            <ul className="mt-4 space-y-2 text-[15px] text-graphite">
              {NAV.slice(0, 4).map((item) => (
                <li key={item.href}>
                  <a href={item.href} className="transition-colors duration-150 hover:text-coal">
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="font-condensed text-[14px] font-bold uppercase tracking-[0.14em]">Contacto</p>
            <ul className="mt-4 space-y-2 text-[15px] text-graphite">
              <li>
                <a href={trial} target="_blank" rel="noopener noreferrer" className="transition-colors duration-150 hover:text-coal">
                  Escríbenos por WhatsApp
                </a>
              </li>
              <li>
                <a href="#preguntas" className="transition-colors duration-150 hover:text-coal">
                  Preguntas frecuentes
                </a>
              </li>
              <li>
                <a href="/terminos/" className="transition-colors duration-150 hover:text-coal">
                  Términos y condiciones
                </a>
              </li>
              <li>
                <a href="/privacidad/" className="transition-colors duration-150 hover:text-coal">
                  Política de privacidad
                </a>
              </li>
            </ul>
          </div>
        </div>
        <div className="mx-auto flex max-w-[1200px] flex-wrap justify-between gap-2 border-t border-rule px-4 py-6 font-condensed text-[14px] font-semibold uppercase tracking-[0.1em] text-graphite md:px-8">
          <span>© {new Date().getFullYear()} bookeaa</span>
          <span>Hecho para quienes viven de su agenda</span>
        </div>
      </footer>
    </div>
  )
}

/**
 * En el celular el hero llena la pantalla y mucha gente no se da cuenta de que hay
 * más abajo. Esta pastilla lo dice, baja una pantalla al tocarla y se va sola apenas
 * la persona empieza a bajar.
 */
function AvisoDeslizar() {
  const [arriba, setArriba] = useState(true)
  useEffect(() => {
    const revisar = () => setArriba(window.scrollY < 60)
    revisar()
    window.addEventListener('scroll', revisar, { passive: true })
    return () => window.removeEventListener('scroll', revisar)
  }, [])

  return (
    <a
      href="#problema"
      aria-hidden={!arriba}
      tabIndex={arriba ? 0 : -1}
      onClick={(e) => {
        // Baja una pantalla: en el celular lo siguiente es el teléfono de ejemplo, no la sección negra.
        e.preventDefault()
        window.scrollBy({ top: window.innerHeight * 0.8, behavior: 'smooth' })
      }}
      className={`fixed left-1/2 z-30 inline-flex -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-full bg-coal py-2.5 pr-4 pl-5 font-condensed text-[15px] font-bold uppercase tracking-[0.1em] text-paper shadow-[0_8px_24px_rgb(0_0_0/0.25)] transition-[opacity,transform] duration-300 ease-out ${
        arriba ? 'opacity-100' : 'pointer-events-none translate-y-4 opacity-0'
      }`}
      style={{ bottom: 'calc(env(safe-area-inset-bottom) + 18px)' }}
    >
      Desliza para ver más
      <svg aria-hidden width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="motion-safe:animate-bounce">
        <path d="M6 9l6 6 6-6" />
      </svg>
    </a>
  )
}

