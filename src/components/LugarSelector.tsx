import { AnimatePresence, motion } from 'framer-motion'
import { opcionesLugar } from '../lib/lugar'
import { spring, tap } from '../lib/motion'
import type { BusinessConfig, Modalidad } from '../types'
import { IconHome, IconMapPin, IconSparkle } from './ui/icons'

interface LugarSelectorProps {
  modalidad: Modalidad | null
  sedeId: string | null
  onChange: (modalidad: Modalidad, sedeId: string | null) => void
  config: Pick<BusinessConfig, 'domicilio' | 'lugar' | 'permiteDomicilio'>
}

/**
 * Dónde será la cita: una opción por sede ("En el consultorio", o el nombre de cada
 * sede si hay varias) y "A domicilio" si el negocio lo ofrece. Con una sola opción no
 * hay nada que elegir: App la selecciona sola y este componente no se muestra.
 */
export function LugarSelector({ modalidad, sedeId, onChange, config }: LugarSelectorProps) {
  const opciones = opcionesLugar(config)
  if (opciones.length <= 1) return null

  const elegida = opciones.find((o) => o.modalidad === modalidad && (o.modalidad === 'domicilio' || o.sedeId === sedeId))
  const conMapa = elegida?.mapsUrl ? elegida : null

  return (
    <div className="mt-5">
      <p id="lugar-label" className="mb-1.5 text-[13px] font-medium text-muted">
        ¿Dónde será tu cita?
      </p>
      <div role="radiogroup" aria-labelledby="lugar-label" className="grid grid-cols-2 gap-2.5">
        {opciones.map((o) => {
          const selected = o === elegida
          const Icon = o.modalidad === 'domicilio' ? IconHome : opciones.length > 2 ? IconMapPin : IconSparkle
          return (
            <motion.button
              key={o.sedeId ?? o.modalidad}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(o.modalidad, o.sedeId)}
              whileTap={tap}
              transition={spring.snappy}
              className={`relative flex min-h-[96px] flex-col items-start justify-between rounded-2xl p-3.5 text-left ring-1 transition-colors duration-200 ${
                selected ? 'text-bg ring-transparent' : 'bg-surface text-ink ring-line shadow-card'
              }`}
            >
              {selected && (
                <motion.span layoutId="lugar-highlight" className="absolute inset-0 rounded-2xl bg-ink" transition={spring.snappy} />
              )}
              <Icon size={20} className={`relative ${selected ? 'text-rose' : 'text-rose-deep'}`} />
              <span className="relative mt-3 block">
                <span className="block text-[15px] font-medium">{o.titulo}</span>
                <span className={`line-clamp-2 block text-[12px] ${selected ? 'text-bg/70' : 'text-muted'}`}>{o.detalle}</span>
              </span>
            </motion.button>
          )
        })}
      </div>
      <AnimatePresence initial={false}>
        {modalidad === 'domicilio' && (
          <motion.p
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={spring.gentle}
            className="overflow-hidden"
          >
            <span className="mt-2.5 flex items-start gap-2 rounded-xl bg-rose-soft px-3.5 py-3 text-[13px] leading-snug text-ink">
              <span aria-hidden>📍</span>
              <span>
                Después de reservar, <b className="font-semibold">envíanos tu ubicación por WhatsApp</b> para llegar a
                tu casa.
              </span>
            </span>
          </motion.p>
        )}
      </AnimatePresence>
      {conMapa && (
        <a
          href={conMapa.mapsUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-2 inline-flex h-11 items-center gap-1.5 text-[13px] font-medium text-rose-deep"
        >
          <IconMapPin size={16} /> Ver ubicación{opciones.length > 2 ? ` de ${conMapa.titulo}` : ''}
        </a>
      )}
    </div>
  )
}
