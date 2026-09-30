import type { ReactNode } from 'react'
import { ESTILO_DEF } from '../lib/theme'
import type { ThemeEstilo } from '../types'
import capturas from './plantillas.json'
import {
  BrowserIcon,
  CalendarCheckIcon,
  CalendarIcon,
  ChatIcon,
  CheckIcon,
  ClockIcon,
  LinkIcon,
  NotebookIcon,
  PlusCalendarIcon,
  PlusIcon,
  ShareIcon,
  TagIcon,
  TapIcon,
  TemplatesIcon,
} from './icons'
import { Brackets, Crosses, IconBadge, PillButton, Reveal, SectionHead } from './ui'

const WRAP = 'mx-auto max-w-[1200px] px-4 md:px-8'

/* ─────────────────────────── Antes / después ─────────────────────────── */

const BEFORE = [
  'La agenda vive en una libreta que solo tú puedes ver.',
  '"¿Tienes hora mañana?" y diez mensajes para cuadrar una cita.',
  'Citas que se cruzan, se olvidan o nadie anotó.',
  'Mientras atiendes, no puedes contestar. Y el cliente se va.',
]
const AFTER = [
  'Tu disponibilidad real, abierta las 24 horas en tu link.',
  'El cliente elige servicio, día y hora en menos de un minuto.',
  'Cada reserva cae sola en tu Google Calendar, sin choques.',
  'Tu cliente también la guarda en su calendario y no se le olvida.',
]

export function Problem() {
  return (
    <section id="problema" className="relative scroll-mt-16 bg-coal text-paper" aria-labelledby="problema-titulo">
      <Crosses tone="light" className="top-10 right-6" />
      <div className={`${WRAP} py-20 md:py-28`}>
        <Reveal>
          <p className="font-condensed text-[15px] font-semibold uppercase tracking-[0.14em] text-paper/60">
            El problema
          </p>
          <h2
            id="problema-titulo"
            className="mt-3 max-w-[16ch] font-condensed text-[clamp(44px,8vw,96px)] leading-[0.9] font-extrabold uppercase tracking-[-0.01em]"
          >
            La libreta se pierde. Los mensajes también.
          </h2>
          <span aria-hidden className="mt-6 block h-[3px] w-10 bg-paper" />
        </Reveal>

        <div className="mt-14 grid gap-5 md:grid-cols-2">
          <Reveal className="rounded-3xl border border-paper/15 p-7 md:p-9">
            <div className="flex items-center justify-between">
              <p className="font-condensed text-[26px] font-bold uppercase">Sin bookeaa</p>
              <IconBadge inverse>
                <NotebookIcon />
              </IconBadge>
            </div>
            <ul className="mt-6 space-y-4">
              {BEFORE.map((line) => (
                <li key={line} className="flex gap-3 text-[17px] leading-snug text-paper/70">
                  <span aria-hidden className="mt-[3px] font-condensed text-[18px] font-bold leading-none text-paper/40">
                    ×
                  </span>
                  {line}
                </li>
              ))}
            </ul>
          </Reveal>

          <Reveal delay={0.08} className="rounded-3xl bg-paper p-7 text-coal md:p-9">
            <div className="flex items-center justify-between">
              <p className="font-condensed text-[26px] font-bold uppercase">Con bookeaa</p>
              <IconBadge>
                <CalendarCheckIcon />
              </IconBadge>
            </div>
            <ul className="mt-6 space-y-4">
              {AFTER.map((line) => (
                <li key={line} className="flex gap-3 text-[17px] leading-snug">
                  <CheckIcon className="mt-0.5 shrink-0" width={20} height={20} strokeWidth={2.2} />
                  {line}
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </div>
    </section>
  )
}

/* ─────────────────────────── Cómo funciona ─────────────────────────── */

const STEPS = [
  {
    icon: <ShareIcon />,
    title: 'Comparte tu link',
    text: 'Ponlo en tu bio de Instagram, en tu estado de WhatsApp o mándalo directo. Es tuyo: bookeaa.com/u/tu-negocio.',
  },
  {
    icon: <TapIcon />,
    title: 'Tu cliente reserva',
    text: 'Elige el servicio, ve solo las horas que de verdad tienes libres y confirma. Sin descargar nada, sin crear cuenta.',
  },
  {
    icon: <CalendarCheckIcon />,
    title: 'Queda en el calendario',
    text: 'La cita aparece en tu Google Calendar al instante, y tu cliente la agrega al suyo con un toque.',
  },
]

export function HowItWorks() {
  return (
    <section id="como-funciona" className="relative scroll-mt-16">
      <Crosses className="top-24 right-6" />
      <div className={`${WRAP} py-20 md:py-28`}>
        <SectionHead
          index="01"
          kicker="Cómo funciona"
          title="Tres pasos. Cero llamadas."
          intro="Configuras tus servicios y horarios una vez. Desde ahí, tu agenda se llena sola."
        />
        <ol className="mt-14 grid gap-12 border-t border-rule pt-12 md:grid-cols-3 md:gap-8">
          {STEPS.map((step, i) => (
            <Reveal as="li" key={step.title} delay={i * 0.06} className="flex flex-col items-start">
              <div className="flex w-full items-center justify-between">
                <IconBadge size="lg">{step.icon}</IconBadge>
                <span className="font-condensed text-[56px] leading-none font-extrabold text-rule">0{i + 1}</span>
              </div>
              <h3 className="mt-6 font-condensed text-[30px] leading-none font-bold uppercase">{step.title}</h3>
              <p className="mt-3 max-w-[36ch] text-[16px] leading-relaxed text-graphite">{step.text}</p>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  )
}

/* ─────────────────────────── Funciones ─────────────────────────── */

const MORE_FEATURES: { icon: ReactNode; title: string; text: string }[] = [
  {
    icon: <BrowserIcon />,
    title: 'Web personalizada',
    text: 'Tu página con tu nombre, tus colores, tu logo y tus servicios. No parece de nadie más.',
  },
  {
    icon: <TemplatesIcon />,
    title: 'Plantillas',
    text: '8 estilos con fuentes y formas propias, y tus colores. Cámbialo cuando quieras.',
  },
  {
    icon: <ClockIcon />,
    title: 'Horarios y bloqueos',
    text: 'Define tus horas por día, pausas incluidas, y bloquea vacaciones o días libres en segundos.',
  },
  {
    icon: <ChatIcon />,
    title: 'Confirmación por WhatsApp',
    text: 'Al reservar, tu cliente te escribe con todo el detalle de la cita ya armado.',
  },
  {
    icon: <TagIcon />,
    title: 'Servicios, promos y cupones',
    text: 'Precios, duración, combos y códigos de descuento. La duración de cada servicio bloquea el tiempo justo.',
  },
  {
    icon: <PlusCalendarIcon />,
    title: 'Recordatorio en su calendario',
    text: 'Tu cliente guarda la cita en su Google Calendar con un toque, así llega a tiempo.',
  },
]

export function Features() {
  return (
    <section id="funciones" className="relative scroll-mt-16 bg-mist">
      <Crosses className="top-24 right-6" />
      <div className={`${WRAP} py-20 md:py-28`}>
        <SectionHead
          index="02"
          kicker="Funciones"
          title="Todo lo que tu agenda necesita."
          intro="Nada de funciones de relleno: solo lo que hace falta para que reservar contigo sea fácil."
        />

        <div className="mt-14 grid gap-5 lg:grid-cols-[1.1fr_1fr]">
          {/* Google Calendar: la función estrella va en negro. */}
          <Reveal as="article" className="relative flex flex-col overflow-hidden rounded-3xl bg-coal p-7 text-paper md:p-10">
            <div className="flex items-start justify-between gap-6">
              <h3 className="font-condensed text-[clamp(34px,4.6vw,52px)] leading-[0.92] font-extrabold uppercase">
                Conectado a
                <br />
                Google Calendar
              </h3>
              <IconBadge inverse size="lg">
                <CalendarIcon />
              </IconBadge>
            </div>
            <p className="mt-5 max-w-[44ch] text-[17px] leading-relaxed text-paper/70">
              Cada reserva se crea como evento en tu calendario, con el servicio, el nombre y el teléfono del cliente. Si
              agregas algo por tu cuenta, esa hora deja de aparecer como libre.
            </p>
            <div className="mt-8 space-y-2" aria-hidden>
              {[
                { h: '10:30', t: 'Manicure semipermanente', c: 'María G.' },
                { h: '12:00', t: 'Bloqueado · almuerzo', c: '' },
                { h: '16:30', t: 'Corte y barba', c: 'Andrea R.' },
              ].map((ev) => (
                <div key={ev.h} className="flex items-center gap-4 border-t border-paper/15 pt-2.5">
                  <span className="w-12 font-condensed text-[20px] font-bold">{ev.h}</span>
                  <span className="text-[15px] text-paper/80">{ev.t}</span>
                  {ev.c && <span className="ml-auto font-condensed text-[14px] tracking-[0.06em] text-paper/50 uppercase">{ev.c}</span>}
                </div>
              ))}
            </div>
          </Reveal>

          {/* Link personalizado */}
          <Reveal as="article" delay={0.06} className="flex flex-col rounded-3xl border border-rule bg-paper p-7 md:p-10">
            <div className="flex items-start justify-between gap-6">
              <h3 className="font-condensed text-[clamp(34px,4.6vw,52px)] leading-[0.92] font-extrabold uppercase">
                Tu link
                <br />
                personalizado
              </h3>
              <IconBadge size="lg">
                <LinkIcon />
              </IconBadge>
            </div>
            <p className="mt-5 max-w-[42ch] text-[17px] leading-relaxed text-graphite">
              Una sola dirección para todo: la pones en tu bio, en tus historias o la mandas por chat. Quien la abre, reserva.
            </p>
            <div className="mt-auto pt-8" aria-hidden>
              <div className="flex items-center gap-3 rounded-full border-2 border-coal py-2 pr-2 pl-5">
                <span className="min-w-0 flex-1 truncate font-barlow text-[16px] text-graphite">
                  bookeaa.com/u/<span className="font-semibold text-coal">tu-negocio</span>
                </span>
                <span className="rounded-full bg-coal px-4 py-2 font-condensed text-[14px] font-bold tracking-[0.08em] text-paper uppercase">
                  Copiar
                </span>
              </div>
            </div>
          </Reveal>
        </div>

        <ul className="mt-5 grid gap-px overflow-hidden rounded-3xl border border-rule bg-rule sm:grid-cols-2 lg:grid-cols-3">
          {MORE_FEATURES.map((f, i) => (
            <li key={f.title} className="bg-paper">
              {/* El Reveal va adentro: si el li fuera transparente se vería el gris de las rayas. */}
              <Reveal delay={(i % 3) * 0.05} className="p-7">
                <IconBadge>{f.icon}</IconBadge>
                <h3 className="mt-5 font-condensed text-[24px] leading-none font-bold uppercase">{f.title}</h3>
                <p className="mt-3 text-[15px] leading-relaxed text-graphite">{f.text}</p>
              </Reveal>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

/* ─────────────────────────── Plantillas ─────────────────────────── */

type Captura = (typeof capturas.plantillas)[number]

/** "'Fraunces', ui-serif…" → "Fraunces". */
const familia = (stack: string) => (/'([^']+)'/.exec(stack)?.[1] ?? stack).replace(/ Variable$/, '')

/** Marco de teléfono con una captura real de la página de reservas (390×844 @2x). */
function PhoneShot({ src, alt, className }: { src: string; alt: string; className?: string }) {
  return (
    <div
      className={`relative overflow-hidden rounded-[34px] border-[6px] border-coal bg-coal shadow-[0_24px_48px_-28px_rgb(15_15_14/0.55)] ${className ?? ''}`}
    >
      <img src={src} alt={alt} width={390} height={844} loading="lazy" decoding="async" className="block h-auto w-full rounded-[28px]" />
    </div>
  )
}

function Swatch({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 font-barlow text-[13px] text-graphite">
      <span aria-hidden className="h-3.5 w-3.5 rounded-full ring-1 ring-coal/15" style={{ background: color }} />
      {label}
    </span>
  )
}

function PlantillaCard({ p, i }: { p: Captura; i: number }) {
  const def = ESTILO_DEF[p.estilo as ThemeEstilo]
  return (
    <Reveal delay={(i % 4) * 0.05} className="w-[62%] shrink-0 snap-start sm:w-[40%] md:w-auto">
      <PhoneShot src={`/landing/plantillas/${p.file}.jpg`} alt={`Página de reservas de ${p.marca} con el estilo ${def.nombre}`} />
      <div className="mt-4">
        <div className="flex items-baseline justify-between gap-3">
          <p className="font-condensed text-[26px] leading-none font-bold uppercase">{def.nombre}</p>
          <span className="font-condensed text-[13px] font-semibold tracking-[0.1em] text-graphite uppercase">
            {String(i + 1).padStart(2, '0')}
          </span>
        </div>
        <p className="mt-1.5 text-[14px] text-graphite">
          {familia(def.display)} + {familia(def.sans)}
        </p>
        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
          <Swatch color={p.principal} label={p.principal} />
          <Swatch color={p.fondo} label={p.fondo} />
        </div>
      </div>
    </Reveal>
  )
}

export function Templates() {
  return (
    <section id="plantillas" className="relative scroll-mt-16">
      <Crosses className="top-24 right-6" />
      <div className={`${WRAP} py-20 md:py-28`}>
        <SectionHead
          index="03"
          kicker="Plantillas"
          title="8 estilos. Tus colores."
          intro="Todas tienen la misma distribución, pensada para reservar rápido desde el celular. Cambian las fuentes, las formas y los colores. Estas son capturas reales de la página que ven tus clientes."
        />

        <div className="no-scrollbar -mx-4 mt-14 flex snap-x snap-mandatory scroll-px-4 gap-5 overflow-x-auto px-4 pb-2 md:mx-0 md:grid md:grid-cols-4 md:gap-x-6 md:gap-y-14 md:overflow-visible md:px-0">
          {capturas.plantillas.map((p, i) => (
            <PlantillaCard key={p.file} p={p} i={i} />
          ))}
        </div>

        {/* El mismo estilo con tres colores: el color principal y el fondo son libres. */}
        <Reveal className="mt-20 overflow-hidden rounded-[32px] bg-mist">
          <div className="grid items-center gap-10 p-7 md:p-12 lg:grid-cols-[0.9fr_1.4fr]">
            <div>
              <p className="font-condensed text-[15px] font-semibold uppercase tracking-[0.14em] text-graphite">Colores</p>
              <h3 className="mt-3 font-condensed text-[clamp(36px,5.4vw,64px)] leading-[0.9] font-extrabold uppercase">
                <Brackets>
                  <span className="block">Tu color.</span>
                  <span className="block">Tu fondo.</span>
                </Brackets>
              </h3>
              <span aria-hidden className="mt-6 block h-[3px] w-10 bg-coal" />
              <p className="mt-6 max-w-[40ch] text-[17px] leading-relaxed text-graphite">
                Eliges el color principal de tu marca y el color de fondo, claro u oscuro. Los tonos de los botones y los
                textos se ajustan solos para que todo se lea bien.
              </p>
            </div>
            <div className="no-scrollbar -mx-7 flex snap-x snap-mandatory scroll-px-7 gap-4 overflow-x-auto px-7 md:mx-0 md:grid md:grid-cols-3 md:overflow-visible md:px-0">
              {capturas.colores.map((c) => (
                <figure key={c.file} className="w-[58%] shrink-0 snap-start sm:w-[38%] md:w-auto">
                  <PhoneShot
                    src={`/landing/colores/${c.file}.jpg`}
                    alt={`La misma plantilla con color ${c.principal} sobre fondo ${c.fondo}`}
                  />
                  <figcaption className="mt-3 flex flex-wrap gap-x-3 gap-y-1">
                    <Swatch color={c.principal} label={c.principal} />
                    <Swatch color={c.fondo} label={c.fondo} />
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

/* ─────────────────────────── Banner ─────────────────────────── */

export function Banner({ trial }: { trial: string }) {
  return (
    <section className={`${WRAP} pb-20 md:pb-28`}>
      <Reveal className="relative overflow-hidden rounded-[32px] bg-coal px-6 py-16 text-paper md:px-14 md:py-24">
        <Crosses tone="light" className="top-10 right-8" />
        <div className="grid items-end gap-10 md:grid-cols-[1fr_auto]">
          <div>
            <p className="font-condensed text-[15px] font-semibold uppercase tracking-[0.14em] text-paper/60">
              Nueva reserva · 23:04
            </p>
            <h2 className="mt-4 font-condensed text-[clamp(40px,7.4vw,104px)] leading-[0.88] font-extrabold uppercase tracking-[-0.01em]">
              <Brackets tone="light">
                <span className="block whitespace-nowrap">Tus clientes</span>
                <span className="block whitespace-nowrap">reservan a las</span>
                <span className="block whitespace-nowrap">11 de la noche.</span>
              </Brackets>
            </h2>
            <p className="mt-8 font-condensed text-[clamp(26px,3.6vw,40px)] leading-none font-bold uppercase text-paper/70">
              Tú duermes.
            </p>
          </div>
          <div className="flex flex-col items-start gap-4 md:items-end">
            <p className="font-condensed text-[44px] leading-none font-extrabold">24/7</p>
            <span aria-hidden className="block h-[3px] w-10 bg-paper" />
            <PillButton href={trial} external variant="inverse">
              Empezar gratis
            </PillButton>
          </div>
        </div>
      </Reveal>
    </section>
  )
}

/* ─────────────────────────── Precio ─────────────────────────── */

const PRO_INCLUDES = [
  'Reservas ilimitadas',
  'Conexión con Google Calendar',
  'Link personalizado bookeaa.com/u/tu-negocio',
  'Web con tu marca, colores y logo',
  'Los 8 estilos, con tus colores',
  'Horarios, pausas y bloqueos',
  'Servicios, promociones y cupones',
  'Confirmación por WhatsApp',
  'Soporte directo por WhatsApp',
]

export function Pricing({ trial }: { trial: string }) {
  return (
    <section id="precio" className="relative scroll-mt-16 border-t border-rule">
      <Crosses className="top-24 right-6" />
      <div className={`${WRAP} py-20 md:py-28`}>
        <SectionHead
          index="04"
          kicker="Precio"
          title="Un plan. Todo incluido."
          intro="Pruébalo un mes completo sin pagar nada. Si te sirve, sigues con Pro. Si no, no pasa nada."
        />

        <div className="mt-14 grid gap-5 lg:grid-cols-[1fr_1.35fr]">
          <Reveal className="flex flex-col rounded-3xl border-2 border-coal p-7 md:p-10">
            <p className="font-condensed text-[15px] font-semibold uppercase tracking-[0.14em] text-graphite">Para empezar</p>
            <h3 className="mt-2 font-condensed text-[40px] leading-none font-extrabold uppercase">Prueba gratis</h3>
            <p className="mt-6 flex items-baseline gap-2">
              <span className="font-condensed text-[88px] leading-[0.8] font-extrabold">$0</span>
              <span className="font-condensed text-[20px] font-semibold uppercase text-graphite">por 30 días</span>
            </p>
            <span aria-hidden className="mt-6 block h-px w-full bg-rule" />
            <ul className="mt-6 space-y-3 text-[16px]">
              {['Todo lo de Pro, desde el primer día', 'Te ayudamos a configurarlo', 'Sin tarjeta, sin permanencia'].map((l) => (
                <li key={l} className="flex gap-3">
                  <CheckIcon className="mt-0.5 shrink-0" width={20} height={20} strokeWidth={2.2} />
                  {l}
                </li>
              ))}
            </ul>
            <div className="mt-auto pt-10">
              <PillButton href={trial} external variant="outline" size="lg" className="w-full">
                Empezar mi mes gratis
              </PillButton>
            </div>
          </Reveal>

          <Reveal delay={0.06} className="relative flex flex-col rounded-3xl bg-coal p-7 text-paper md:p-10">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-condensed text-[15px] font-semibold uppercase tracking-[0.14em] text-paper/60">
                  Después del mes gratis
                </p>
                <h3 className="mt-2 font-condensed text-[40px] leading-none font-extrabold uppercase">Plan Pro</h3>
              </div>
              <span className="rounded-full bg-paper px-3 py-1.5 font-condensed text-[13px] font-bold tracking-[0.1em] text-coal uppercase">
                Todo incluido
              </span>
            </div>
            <p className="mt-6 flex items-baseline gap-2">
              <span className="font-condensed text-[88px] leading-[0.8] font-extrabold">$15</span>
              <span className="font-condensed text-[20px] font-semibold uppercase text-paper/60">al mes</span>
            </p>
            <span aria-hidden className="mt-6 block h-px w-full bg-paper/15" />
            <ul className="mt-6 grid gap-x-8 gap-y-3 text-[16px] sm:grid-cols-2">
              {PRO_INCLUDES.map((l) => (
                <li key={l} className="flex gap-3 text-paper/85">
                  <CheckIcon className="mt-0.5 shrink-0 text-paper" width={20} height={20} strokeWidth={2.2} />
                  {l}
                </li>
              ))}
            </ul>
            <div className="mt-auto pt-10">
              <PillButton href={trial} external variant="inverse" size="lg" className="w-full">
                Prueba 1 mes gratis
              </PillButton>
              <p className="mt-3 text-center text-[14px] text-paper/60">Cancelas cuando quieras.</p>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  )
}

/* ─────────────────────────── Preguntas ─────────────────────────── */

const FAQS = [
  {
    q: '¿Mis clientes tienen que descargar algo o crear una cuenta?',
    a: 'No. Abren tu link desde el celular o la computadora, eligen y reservan. Nada que instalar, ninguna contraseña.',
  },
  {
    q: '¿Cómo se conecta con Google Calendar?',
    a: 'Al empezar vinculamos tu cuenta de Google. Desde ahí cada reserva se crea sola como evento, y cualquier evento que pongas tú bloquea esa hora para que nadie la reserve.',
  },
  {
    q: '¿Y si un día no trabajo o me voy de vacaciones?',
    a: 'Bloqueas ese día (o solo unas horas) y desaparece de tu agenda pública. También puedes crear un evento de día completo en tu calendario.',
  },
  {
    q: '¿Puedo tener mis propios colores y mi logo?',
    a: 'Sí. Eliges uno de los 8 estilos, tu color principal y tu color de fondo (claro u oscuro), y pones tu nombre y logo. Tu página se ve como tu negocio.',
  },
  {
    q: '¿Qué pasa cuando termina el mes gratis?',
    a: 'Te avisamos antes. Si quieres seguir, pasas al plan Pro por $15 al mes. Si no, tu página se pausa y no te cobramos nada.',
  },
  {
    q: '¿Necesito saber de tecnología?',
    a: 'No. Nos dices tus servicios, precios y horarios, y te dejamos la agenda lista. Si algo no te queda claro, nos escribes por WhatsApp.',
  },
]

export function Faq() {
  return (
    <section id="preguntas" className="relative scroll-mt-16 bg-mist">
      <div className={`${WRAP} grid gap-12 py-20 md:py-28 lg:grid-cols-[1fr_1.4fr]`}>
        <SectionHead index="05" kicker="Preguntas" title="Lo que todos preguntan." />
        <div className="border-t-2 border-coal">
          {FAQS.map((f) => (
            <details key={f.q} className="group border-b border-rule">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-6 [&::-webkit-details-marker]:hidden">
                <span className="font-condensed text-[22px] leading-tight font-bold uppercase md:text-[24px]">{f.q}</span>
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-coal text-paper transition-transform duration-200 ease-out group-open:rotate-45">
                  <PlusIcon width={18} height={18} strokeWidth={2.2} />
                </span>
              </summary>
              <p className="max-w-[60ch] pb-6 text-[17px] leading-relaxed text-graphite">{f.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ─────────────────────────── Cierre ─────────────────────────── */

export function FinalCta({ trial }: { trial: string }) {
  return (
    <section className="relative">
      <Crosses className="top-20 right-6" />
      <div className={`${WRAP} py-24 text-center md:py-32`}>
        <Reveal>
          <h2 className="mx-auto max-w-[14ch] font-condensed text-[clamp(52px,10vw,132px)] leading-[0.86] font-extrabold uppercase tracking-[-0.015em]">
            Deja la libreta. Abre tu agenda.
          </h2>
          <span aria-hidden className="mx-auto mt-8 block h-[3px] w-10 bg-coal" />
          <p className="mx-auto mt-6 max-w-[44ch] text-[18px] leading-relaxed text-graphite">
            Escríbenos por WhatsApp, cuéntanos de tu negocio y te dejamos tu link listo. El primer mes va por nosotros.
          </p>
          <div className="mt-10 flex justify-center">
            <PillButton href={trial} external size="lg">
              Prueba 1 mes gratis
            </PillButton>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
