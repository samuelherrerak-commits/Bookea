import '@fontsource/barlow-condensed/500.css'
import '@fontsource/barlow-condensed/600.css'
import '@fontsource/barlow-condensed/700.css'
import '@fontsource/barlow-condensed/800.css'
import '@fontsource/barlow/400.css'
import '@fontsource/barlow/500.css'
import '@fontsource/barlow/600.css'

import { useEffect, useState } from 'react'
import { precioTeam, teamWhatsappUrl } from './cta'
import { CalendarCheckIcon, ChatIcon, CheckIcon, ClockIcon, LinkIcon, Logo, TapIcon } from './icons'
import { Brackets, Crosses, IconBadge, PillButton, Reveal, SectionHead } from './ui'

/**
 * bookeaa.com/team: la página de venta de bookeaa team (negocios con varias personas
 * atendiendo). Mismo estilo que la landing; el pedido va por WhatsApp.
 */

const WRAP = 'mx-auto max-w-[1200px] px-4 md:px-8'

const PASOS = [
  { t: 'Primero el servicio', d: 'Tu cliente elige "Corte de dama" y ve solo a quienes lo hacen. Elige a Carla y le salen los días y horas de Carla.' },
  { t: 'Primero la persona', d: 'Tu página abre con tu equipo. Elige a Carla, ve sus servicios y su agenda. Ideal si cada quien tiene sus clientes.' },
  { t: 'Cualquiera disponible', d: 'Para quien solo quiere su cita: junta las horas de todos y le asigna a quien esté libre y con menos citas ese día.' },
]

const FUNCIONES = [
  { icono: CalendarCheckIcon, t: 'Una agenda por persona', d: 'Cada quien tiene su calendario de Google. Si dos trabajan a la misma hora, se reservan las dos a la vez.' },
  { icono: LinkIcon, t: 'El link de cada quien', d: 'bookeaa.com/u/tu-negocio?con=carla: cada persona lo comparte en su Instagram y entra directo a su agenda.' },
  { icono: TapIcon, t: 'Cada quien con su app', d: 'Entran con su Gmail a Mi negocio y ven solo sus citas. Bloquean sus horas cuando no pueden.' },
  { icono: ChatIcon, t: 'Avisos a quien atiende', d: 'La reserva le llega al teléfono de la persona elegida (y a ti). Recordatorio 30 minutos antes.' },
  { icono: ClockIcon, t: 'Horario y servicios propios', d: 'Sofía trabaja en la tarde y solo hace color; Carla, todo el día y de todo. Cada quien lo suyo.' },
  { icono: CheckIcon, t: 'Tú lo ves todo', d: 'Las citas de todo el equipo, filtradas por persona, y cuánto atendió y facturó cada una.' },
]

const FAQS = [
  { q: '¿Cada persona necesita su propia cuenta?', a: 'Solo su Gmail. Tú la agregas al equipo con su correo y bookeaa le crea su calendario de citas y le da acceso a Mi negocio.' },
  { q: '¿Qué pasa si alguien se va del equipo?', a: 'La quitas y queda inactiva: deja de recibir reservas, pero su historial y su calendario no se borran.' },
  { q: '¿Puedo cambiar de individual a team (o al revés)?', a: 'Sí, en cualquier momento. Tu página, tus servicios y tus citas siguen igual.' },
  { q: '¿Cómo cuento las personas para el precio?', a: 'Solo las activas, las que reciben reservas. Hasta 5 son $25 al mes; desde la sexta, $5 más por cada una.' },
]

export default function Team() {
  const pedir = teamWhatsappUrl()
  const [personas, setPersonas] = useState(4)

  useEffect(() => {
    document.title = 'bookeaa team · Una agenda para cada persona de tu equipo'
    document.body.style.background = '#ffffff'
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', '#ffffff')
    document.querySelector<HTMLLinkElement>('link[rel="icon"]')?.setAttribute('href', '/bookeaa.svg')
    document.documentElement.style.scrollBehavior = 'smooth'
  }, [])

  return (
    <div className="min-h-dvh overflow-x-clip bg-paper font-barlow text-coal antialiased">
      <header className="sticky top-0 z-40 border-b border-rule bg-paper">
        <nav className="mx-auto flex h-16 max-w-[1200px] items-center justify-between gap-6 px-4 md:px-8" aria-label="Principal">
          <a href="/" aria-label="bookeaa, inicio" className="flex items-center gap-2 text-coal">
            <Logo />
            <span className="rounded-full bg-coal px-2.5 py-1 font-condensed text-[13px] font-bold uppercase tracking-[0.12em] text-paper">team</span>
          </a>
          <PillButton href={pedir} external className="h-10! px-4! text-[14px]!">
            Lo quiero
          </PillButton>
        </nav>
      </header>

      <main>
        <section className="relative">
          <Crosses className="top-16 right-6" />
          <div className={`${WRAP} pt-12 pb-16 md:pt-20 md:pb-24`}>
            <Reveal>
              <p className="font-condensed text-[15px] font-semibold uppercase tracking-[0.16em] text-graphite">bookeaa team · para negocios con equipo</p>
            </Reveal>
            <Reveal delay={0.05}>
              <h1 className="mt-5 font-condensed text-[clamp(52px,9vw,120px)] leading-[0.88] font-extrabold uppercase tracking-[-0.015em]">
                <Brackets>
                  <span className="block">Cada quien</span>
                  <span className="block">con su agenda.</span>
                </Brackets>
              </h1>
            </Reveal>
            <Reveal delay={0.1}>
              <p className="mt-8 max-w-[52ch] text-[19px] leading-relaxed text-graphite text-pretty">
                Para centros de estética, peluquerías, barberías y consultorios donde atienden varias personas. Tus clientes eligen el servicio y
                con quién, y ven solo las horas libres de esa persona.
              </p>
            </Reveal>
            <Reveal delay={0.15} className="mt-9 flex flex-wrap items-center gap-3">
              <PillButton href={pedir} external size="lg">
                Quiero bookeaa team
              </PillButton>
              <PillButton href="/u/demo?equipo=servicio&rubro=estetica" variant="outline" size="lg">
                Verlo funcionando
              </PillButton>
            </Reveal>
            <Reveal delay={0.2}>
              <p className="mt-5 font-condensed text-[15px] font-semibold uppercase tracking-[0.1em] text-graphite">
                30 días gratis · $25/mes hasta 5 personas · Sin tarjeta
              </p>
            </Reveal>
          </div>
        </section>

        <section className="border-t border-rule bg-coal text-paper">
          <div className={`${WRAP} py-20 md:py-24`}>
            <SectionHead index="01" kicker="Cómo reservan" title="Tres formas, tú eliges" tone="light" />
            <div className="mt-12 grid gap-5 md:grid-cols-3">
              {PASOS.map((p, i) => (
                <Reveal key={p.t} delay={i * 0.05} className="rounded-3xl border border-paper/15 p-7">
                  <p className="font-condensed text-[56px] leading-none font-extrabold text-paper/30">0{i + 1}</p>
                  <h3 className="mt-4 font-condensed text-[28px] leading-tight font-extrabold uppercase">{p.t}</h3>
                  <p className="mt-3 text-[16px] leading-relaxed text-paper/75">{p.d}</p>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        <section className="relative border-t border-rule">
          <div className={`${WRAP} py-20 md:py-24`}>
            <SectionHead index="02" kicker="Lo que trae" title="Todo bookeaa, para tu equipo" intro="Además de todo lo del plan individual: página propia, Pago Móvil, ticket de reserva, cupones y recordatorios." />
            <div className="mt-12 grid gap-x-10 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
              {FUNCIONES.map(({ icono: Icono, t, d }, i) => (
                <Reveal key={t} delay={i * 0.04}>
                  <IconBadge>
                    <Icono width={24} height={24} strokeWidth={1.8} />
                  </IconBadge>
                  <h3 className="mt-4 font-condensed text-[26px] leading-tight font-extrabold uppercase">{t}</h3>
                  <p className="mt-2 text-[16px] leading-relaxed text-graphite">{d}</p>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        <section id="precio" className="relative scroll-mt-16 border-t border-rule">
          <Crosses className="top-24 right-6" />
          <div className={`${WRAP} py-20 md:py-24`}>
            <SectionHead index="03" kicker="Precio" title="Crece con tu equipo" intro="El primer mes es gratis. Después pagas según las personas que atienden." />
            <div className="mt-12 grid gap-5 lg:grid-cols-[1.35fr_1fr]">
              <Reveal className="flex flex-col rounded-3xl bg-coal p-7 text-paper md:p-10">
                <p className="font-condensed text-[15px] font-semibold uppercase tracking-[0.14em] text-paper/60">bookeaa team</p>
                <p className="mt-6 flex items-baseline gap-2">
                  <span className="font-condensed text-[88px] leading-[0.8] font-extrabold">$25</span>
                  <span className="font-condensed text-[20px] font-semibold uppercase text-paper/60">al mes · hasta 5 personas</span>
                </p>
                <p className="mt-3 text-[16px] text-paper/75">+ $5 al mes por cada persona más.</p>
                <span aria-hidden className="mt-6 block h-px w-full bg-paper/15" />
                <ul className="mt-6 grid gap-x-8 gap-y-3 text-[16px] sm:grid-cols-2">
                  {['Una agenda por persona', 'Los tres modos de reservar', 'Link propio para cada quien', 'Mi negocio para cada persona', 'Avisos a quien atiende', 'Métricas por persona'].map((l) => (
                    <li key={l} className="flex gap-3 text-paper/85">
                      <CheckIcon className="mt-0.5 shrink-0 text-paper" width={20} height={20} strokeWidth={2.2} />
                      {l}
                    </li>
                  ))}
                </ul>
                <div className="mt-auto pt-10">
                  <PillButton href={pedir} external variant="inverse" size="lg" className="w-full">
                    Prueba 1 mes gratis
                  </PillButton>
                </div>
              </Reveal>

              <Reveal delay={0.06} className="flex flex-col rounded-3xl border-2 border-coal p-7 md:p-10">
                <p className="font-condensed text-[15px] font-semibold uppercase tracking-[0.14em] text-graphite">Calcula tu plan</p>
                <label className="mt-6 block">
                  <span className="font-condensed text-[22px] font-bold uppercase">
                    {personas} {personas === 1 ? 'persona' : 'personas'} atendiendo
                  </span>
                  <input type="range" min={2} max={15} value={personas} onChange={(e) => setPersonas(Number(e.target.value))} className="mt-4 w-full accent-coal" aria-label="Personas atendiendo" />
                </label>
                <p className="mt-6 flex items-baseline gap-2">
                  <span className="font-condensed text-[72px] leading-[0.8] font-extrabold">${precioTeam(personas)}</span>
                  <span className="font-condensed text-[18px] font-semibold uppercase text-graphite">al mes</span>
                </p>
                <p className="mt-3 text-[15px] text-graphite">
                  {personas <= 5 ? 'Incluido en el plan base.' : `$25 + ${personas - 5} × $5.`} Son ${(precioTeam(personas) / personas).toFixed(2)} por persona.
                </p>
                <p className="mt-auto pt-8 text-[14px] text-graphite">¿Trabajas solo o sola? El plan individual es $10 al mes: <a href="/#precio" className="underline underline-offset-4">ver bookeaa</a>.</p>
              </Reveal>
            </div>
          </div>
        </section>

        <section className="border-t border-rule">
          <div className={`${WRAP} py-20 md:py-24`}>
            <SectionHead index="04" kicker="Preguntas" title="Lo que nos preguntan" />
            <div className="mt-10 divide-y divide-rule border-y border-rule">
              {FAQS.map((f) => (
                <details key={f.q} className="group py-5">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-condensed text-[22px] font-bold uppercase leading-tight">
                    {f.q}
                    <span aria-hidden className="text-[28px] transition-transform group-open:rotate-45">+</span>
                  </summary>
                  <p className="mt-3 max-w-[70ch] text-[17px] leading-relaxed text-graphite">{f.a}</p>
                </details>
              ))}
            </div>
            <div className="mt-14 flex flex-wrap items-center gap-4">
              <PillButton href={pedir} external size="lg">
                Quiero bookeaa team
              </PillButton>
              <p className="text-[15px] text-graphite">Te lo dejamos configurado con tu equipo.</p>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-rule">
        <div className={`${WRAP} flex flex-wrap items-center justify-between gap-4 py-8 text-[14px] text-graphite`}>
          <a href="/" className="text-coal"><Logo /></a>
          <span>© {new Date().getFullYear()} bookeaa</span>
        </div>
      </footer>
    </div>
  )
}
