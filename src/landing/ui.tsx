import { motion } from 'framer-motion'
import type { ReactNode } from 'react'
import { ArrowIcon } from './icons'

/** ease-out fuerte: arranca rápido y se asienta, así el scroll se siente inmediato. */
export const EASE_OUT = [0.23, 1, 0.32, 1] as const

/**
 * Aparece una sola vez al entrar en pantalla. Solo opacidad y 12px de recorrido:
 * lo bastante para notar el orden, sin que el contenido "viaje".
 */
export function Reveal({
  children,
  delay = 0,
  className,
  as = 'div',
}: {
  children: ReactNode
  delay?: number
  className?: string
  as?: 'div' | 'li' | 'article'
}) {
  const Tag = motion[as]
  return (
    <Tag
      className={className}
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '0px 0px -12% 0px' }}
      transition={{ duration: 0.5, ease: EASE_OUT, delay }}
    >
      {children}
    </Tag>
  )
}

type ButtonProps = {
  href: string
  children: ReactNode
  variant?: 'solid' | 'outline' | 'inverse'
  size?: 'md' | 'lg'
  external?: boolean
  className?: string
}

const VARIANT = {
  solid: 'bg-coal text-paper hover:bg-[#2a2a28]',
  outline: 'border-2 border-coal text-coal hover:bg-coal hover:text-paper',
  inverse: 'bg-paper text-coal hover:bg-mist',
}

/** Píldora en mayúsculas condensadas, como los "SEE MORE" de la referencia. */
export function PillButton({ href, children, variant = 'solid', size = 'md', external, className }: ButtonProps) {
  return (
    <a
      href={href}
      {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      className={`group inline-flex items-center justify-center gap-2 rounded-full font-condensed font-bold uppercase tracking-[0.06em] transition-[background-color,color,transform] duration-150 ease-out select-none active:scale-[0.97] ${
        size === 'lg' ? 'h-14 px-7 text-[19px]' : 'h-11 px-5 text-[15px]'
      } ${VARIANT[variant]} ${className ?? ''}`}
    >
      {children}
      <ArrowIcon
        width={size === 'lg' ? 20 : 16}
        height={size === 'lg' ? 20 : 16}
        strokeWidth={2.2}
        className="transition-transform duration-200 ease-out group-hover:translate-x-0.5"
      />
    </a>
  )
}

/** Esquinas "⌐ ¬" de la referencia: arriba a la derecha y abajo a la izquierda. */
export function Brackets({ children, className, tone = 'dark' }: { children: ReactNode; className?: string; tone?: 'dark' | 'light' }) {
  const line = tone === 'dark' ? 'border-coal/70' : 'border-paper/70'
  return (
    <span className={`relative inline-block ${className ?? ''}`}>
      {children}
      <span aria-hidden className={`absolute -top-3 -right-5 h-4 w-4 border-t-2 border-r-2 ${line}`} />
      <span aria-hidden className={`absolute -bottom-2 -left-4 h-4 w-4 border-b-2 border-l-2 ${line}`} />
    </span>
  )
}

/** Título de sección: número pequeño, título grande y la raya corta debajo. */
export function SectionHead({
  index,
  kicker,
  title,
  intro,
  tone = 'dark',
  align = 'left',
}: {
  index: string
  kicker: string
  title: ReactNode
  intro?: ReactNode
  tone?: 'dark' | 'light'
  align?: 'left' | 'center'
}) {
  const light = tone === 'light'
  return (
    <Reveal className={align === 'center' ? 'mx-auto text-center' : ''}>
      <p className={`font-condensed text-[15px] font-semibold uppercase tracking-[0.14em] ${light ? 'text-paper/60' : 'text-graphite'}`}>
        {index}. {kicker}
      </p>
      <h2
        className={`mt-3 font-condensed text-[clamp(40px,7vw,76px)] leading-[0.92] font-extrabold uppercase tracking-[-0.01em] text-balance ${
          light ? 'text-paper' : 'text-coal'
        }`}
      >
        {title}
      </h2>
      <span aria-hidden className={`mt-5 block h-[3px] w-10 ${light ? 'bg-paper' : 'bg-coal'} ${align === 'center' ? 'mx-auto' : ''}`} />
      {intro && (
        <p className={`mt-5 max-w-[56ch] text-[17px] leading-relaxed text-pretty ${light ? 'text-paper/70' : 'text-graphite'} ${align === 'center' ? 'mx-auto' : ''}`}>
          {intro}
        </p>
      )}
    </Reveal>
  )
}

/** Los "×" sueltos en el margen derecho de la referencia. Pura decoración. */
export function Crosses({ className, tone = 'dark' }: { className?: string; tone?: 'dark' | 'light' }) {
  return (
    <span
      aria-hidden
      className={`pointer-events-none absolute hidden flex-col gap-3 font-condensed text-[18px] font-bold leading-none md:flex ${
        tone === 'dark' ? 'text-coal' : 'text-paper'
      } ${className ?? ''}`}
    >
      <span>×</span>
      <span>×</span>
    </span>
  )
}

/** Ícono lineal dentro de un círculo negro. */
export function IconBadge({ children, size = 'md', inverse }: { children: ReactNode; size?: 'md' | 'lg'; inverse?: boolean }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full ${inverse ? 'bg-paper text-coal' : 'bg-coal text-paper'} ${
        size === 'lg' ? 'h-16 w-16 [&>svg]:h-7 [&>svg]:w-7' : 'h-12 w-12'
      }`}
    >
      {children}
    </span>
  )
}
