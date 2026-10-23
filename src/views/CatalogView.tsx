import { motion } from 'framer-motion'
import type { ReactNode } from 'react'
import { Avatar, EquipoPicker } from '../components/EquipoPicker'
import { Hero } from '../components/Hero'
import { PromoCarousel } from '../components/PromoCarousel'
import { ServiceCard } from '../components/ServiceCard'
import { Button } from '../components/ui/Button'
import { IconWhatsApp } from '../components/ui/icons'
import { CatalogSkeleton } from '../components/ui/Skeleton'
import { haptic, spring } from '../lib/motion'
import type { OrderSummary } from '../lib/pricing'
import { useOrder } from '../state/order'
import type { Catalog, Service } from '../types'
import { CUALQUIERA } from '../types'

interface CatalogViewProps {
  catalog: Catalog | null
  status: 'loading' | 'ready' | 'error'
  error: string | null
  onRetry: () => void
  summary: OrderSummary
}

export function CatalogView({ catalog, status, error, onRetry, summary }: CatalogViewProps) {
  const { state, dispatch } = useOrder()

  const toggleService = (id: string) => {
    haptic()
    dispatch({ type: 'toggleService', id })
  }
  const togglePromo = (id: string) => {
    haptic()
    dispatch({ type: 'togglePromo', id })
  }

  // bookeaa team: con "primero la persona" se eligen sus servicios; con su link (?con=) también.
  const equipo = catalog?.equipo ?? null
  const elegida = equipo?.personas.find((p) => p.id === state.profesional) ?? null
  const mostrarEquipo = !!equipo && equipo.modo !== 'servicio'
  const esperandoPersona = equipo?.modo === 'persona' && !state.profesional
  const suyo = (s: Service) => !elegida || !elegida.servicios.length || elegida.servicios.some((id) => id.toLowerCase() === s.id.toLowerCase())
  const servicios = (catalog?.servicios ?? []).filter(suyo)
  const promociones = (catalog?.promociones ?? []).filter((p) => p.servicioIds.every((id) => servicios.some((s) => s.id === id)))
  const elegir = (id: string | null) => {
    haptic()
    dispatch({ type: 'setProfesional', profesional: id })
    // Lo que ya estaba en el carrito y esa persona no hace, sale del carrito.
    const p = equipo?.personas.find((x) => x.id === id)
    if (!p || !p.servicios.length || !catalog) return
    const hace = (sid: string) => p.servicios.some((x) => x.toLowerCase() === sid.toLowerCase())
    for (const sid of state.cart.servicios) if (!hace(sid)) dispatch({ type: 'toggleService', id: sid })
    for (const pid of state.cart.promos) {
      const promo = catalog.promociones.find((x) => x.id === pid)
      if (promo && !promo.servicioIds.every(hace)) dispatch({ type: 'togglePromo', id: pid })
    }
  }

  // Servicios base agrupados por la columna Tipo, en el orden de la hoja.
  const groups: Array<{ categoria: string; items: Service[] }> = []
  for (const s of servicios) {
    if (s.tipo !== 'base') continue
    const group = groups.find((g) => g.categoria === s.categoria)
    if (group) group.items.push(s)
    else groups.push({ categoria: s.categoria, items: [s] })
  }
  const extras = servicios.filter((s) => s.tipo === 'adicional')

  return (
    <div className="pb-36">
      <Hero config={catalog?.config ?? null} loading={status === 'loading'} />

      {status === 'loading' && (
        <div className="px-5">
          <CatalogSkeleton />
        </div>
      )}

      {status === 'error' && (
        <div className="mx-5 rounded-3xl bg-surface p-6 text-center shadow-card ring-1 ring-line">
          <p className="font-display text-2xl">No pudimos cargar los servicios</p>
          <p className="mt-2 text-[14px] text-muted">{error}</p>
          <Button className="mt-5" onClick={onRetry}>
            Reintentar
          </Button>
        </div>
      )}

      {status === 'ready' && catalog && (
        <motion.div
          className="space-y-10"
          initial="hidden"
          animate="show"
          variants={{ show: { transition: { staggerChildren: 0.06 } } }}
        >
          {equipo && mostrarEquipo && (
            <Reveal>
              <section aria-labelledby="equipo-title" className="px-5">
                <h2 id="equipo-title" className="font-display text-[26px] tracking-[-0.01em]">
                  Nuestro equipo
                </h2>
                <p className="mt-0.5 text-[14px] text-muted">
                  {esperandoPersona ? 'Elige con quién quieres tu cita.' : equipo.modo === 'ambos' ? 'Si tienes preferencia, elige con quién.' : 'Con quién es tu cita.'}
                </p>
                <div className="mt-4">
                  <EquipoPicker
                    personas={equipo.personas}
                    cualquiera={equipo.cualquiera}
                    selected={state.profesional}
                    onSelect={(id) => elegir(state.profesional === id && equipo.modo === 'ambos' ? null : id)}
                    label="Ver todos los servicios"
                  />
                </div>
                {elegida && elegida.servicios.length > 0 && state.profesional !== CUALQUIERA && (
                  <p className="mt-3 text-[13px] text-muted">Abajo, solo lo que hace {elegida.nombre.split(/\s+/)[0]}.</p>
                )}
              </section>
            </Reveal>
          )}

          {elegida && !mostrarEquipo && (
            <Reveal>
              <div className="mx-5 flex items-center gap-3 rounded-2xl bg-rose-soft p-3 ring-1 ring-rose/50">
                <Avatar persona={elegida} size={44} />
                <p className="min-w-0 flex-1 text-[14px] leading-snug">
                  Reservando con <b className="font-semibold">{elegida.nombre}</b>
                  {elegida.cargo && <span className="block text-[13px] text-muted">{elegida.cargo}</span>}
                </p>
                <button type="button" onClick={() => elegir(null)} className="h-11 shrink-0 rounded-full px-3 text-[14px] font-medium underline underline-offset-4">
                  Cambiar
                </button>
              </div>
            </Reveal>
          )}

          {!esperandoPersona && promociones.length > 0 && (
            <Reveal>
              <PromoCarousel
                promos={promociones}
                servicios={catalog.servicios}
                selected={state.cart.promos}
                onToggle={togglePromo}
              />
            </Reveal>
          )}

          {!esperandoPersona && servicios.length === 0 && (
            <Reveal>
              <div className="mx-5 rounded-3xl bg-surface p-6 text-center shadow-card ring-1 ring-line">
                <p className="font-display text-2xl">Aún no hay servicios disponibles</p>
                <p className="mt-2 text-[14px] text-muted">Escríbenos por WhatsApp y te atendemos.</p>
              </div>
            </Reveal>
          )}

          {!esperandoPersona && groups.map((group, i) => (
            <Reveal key={group.categoria}>
              <ServiceSection
                id={`cat-${i}`}
                title={group.categoria}
                subtitle={i === 0 ? 'Elige uno o más.' : ''}
                services={group.items}
                selected={state.cart.servicios}
                onToggle={toggleService}
              />
            </Reveal>
          ))}

          {!esperandoPersona && extras.length > 0 && (
            <Reveal>
              <ServiceSection
                id="adicionales"
                title="Adicionales"
                subtitle={
                  summary.hasBase ? 'Se suman a tu servicio.' : 'Se suman a un servicio base o promoción.'
                }
                services={extras}
                selected={state.cart.servicios}
                onToggle={toggleService}
              />
            </Reveal>
          )}

          <footer className="px-5 pt-4 text-center text-[13px] text-muted">
            <a
              href={`https://wa.me/${catalog.config.whatsapp}`}
              className="inline-flex h-11 items-center gap-2 rounded-full px-4 text-ink ring-1 ring-line"
            >
              <IconWhatsApp size={18} className="text-[#25D366]" /> ¿Dudas? Escríbenos
            </a>
            <p className="mt-6">          © {new Date().getFullYear()} {catalog.config.marca}</p>
          </footer>
        </motion.div>
      )}

    </div>
  )
}

function Reveal({ children }: { children: ReactNode }) {
  return (
    <motion.div
      variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: spring.gentle } }}
    >
      {children}
    </motion.div>
  )
}

function ServiceSection({
  id,
  title,
  subtitle,
  services,
  selected,
  onToggle,
}: {
  id: string
  title: string
  subtitle: string
  services: Service[]
  selected: string[]
  onToggle: (id: string) => void
}) {
  if (services.length === 0) return null
  return (
    <section aria-labelledby={`${id}-title`} className="px-5">
      <h2 id={`${id}-title`} className="font-display text-[26px] tracking-[-0.01em]">
        {title}
      </h2>
      {subtitle && <p className="mt-0.5 text-[14px] text-muted">{subtitle}</p>}
      <div className="mt-4 space-y-2.5">
        {services.map((s) => (
          <ServiceCard key={s.id} service={s} selected={selected.includes(s.id)} onToggle={() => onToggle(s.id)} />
        ))}
      </div>
    </section>
  )
}
