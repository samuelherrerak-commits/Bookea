import type { SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement>

/** Íconos lineales a 24px, trazo 1.6: se leen bien dentro de los círculos negros. */
function Base({ children, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={24}
      height={24}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  )
}

export const CalendarIcon = (p: IconProps) => (
  <Base {...p}>
    <rect x="3.5" y="5" width="17" height="15" rx="2" />
    <path d="M3.5 9.5h17M8 3v4M16 3v4" />
    <path d="M8 13.5h2M14 13.5h2M8 16.5h2" />
  </Base>
)

export const CalendarCheckIcon = (p: IconProps) => (
  <Base {...p}>
    <rect x="3.5" y="5" width="17" height="15" rx="2" />
    <path d="M3.5 9.5h17M8 3v4M16 3v4" />
    <path d="m9 14.5 2 2 4-4" />
  </Base>
)

export const LinkIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1 1" />
    <path d="M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 0 0 5.66 5.66l1-1" />
  </Base>
)

export const BrowserIcon = (p: IconProps) => (
  <Base {...p}>
    <rect x="3" y="4.5" width="18" height="15" rx="2" />
    <path d="M3 9h18" />
    <path d="M6 6.8h.01M8.5 6.8h.01" />
    <path d="M7 13h6M7 16h10" />
  </Base>
)

export const TemplatesIcon = (p: IconProps) => (
  <Base {...p}>
    <rect x="3.5" y="3.5" width="7" height="9" rx="1.5" />
    <rect x="13.5" y="3.5" width="7" height="5" rx="1.5" />
    <rect x="13.5" y="11.5" width="7" height="9" rx="1.5" />
    <rect x="3.5" y="15.5" width="7" height="5" rx="1.5" />
  </Base>
)

export const ChatIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M20 12a8 8 0 0 1-11.8 7L4 20l1.1-4A8 8 0 1 1 20 12z" />
    <path d="M9 10.5h6M9 13.5h4" />
  </Base>
)

export const ClockIcon = (p: IconProps) => (
  <Base {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.5V12l3 2" />
  </Base>
)

export const TagIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M3.5 12.2V4.5a1 1 0 0 1 1-1h7.7l8.3 8.3a1.5 1.5 0 0 1 0 2.1l-6.3 6.3a1.5 1.5 0 0 1-2.1 0z" />
    <circle cx="8" cy="8" r="1.3" />
  </Base>
)

export const PlusCalendarIcon = (p: IconProps) => (
  <Base {...p}>
    <rect x="3.5" y="5" width="17" height="15" rx="2" />
    <path d="M3.5 9.5h17M8 3v4M16 3v4" />
    <path d="M12 12.5v5M9.5 15h5" />
  </Base>
)

export const ShareIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M12 3.5v11M7.5 8 12 3.5 16.5 8" />
    <path d="M5 12.5v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" />
  </Base>
)

export const TapIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M9 11V5.5a1.5 1.5 0 0 1 3 0V11" />
    <path d="M12 10.5a1.5 1.5 0 0 1 3 0v1a1.5 1.5 0 0 1 3 0V15a6 6 0 0 1-6 6h-.5a6 6 0 0 1-4.9-2.5L4.4 15.3a1.5 1.5 0 0 1 2.3-1.9L9 15.5" />
  </Base>
)

export const NotebookIcon = (p: IconProps) => (
  <Base {...p}>
    <rect x="5" y="3.5" width="14" height="17" rx="1.5" />
    <path d="M9 3.5v17M3.5 7.5H6M3.5 12H6M3.5 16.5H6M12 8h4" />
  </Base>
)

export const CheckIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="m5 12.5 4.5 4.5L19 7.5" />
  </Base>
)

export const ArrowIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </Base>
)

export const PlusIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M12 5v14M5 12h14" />
  </Base>
)

/** Marca: una "b" dentro de una hoja de calendario. */
export function Logo({ className }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className ?? ''}`}>
      <svg viewBox="0 0 32 32" width={28} height={28} aria-hidden="true">
        <rect x="2" y="4" width="28" height="26" rx="7" fill="currentColor" />
        <path d="M10 2.5v5M22 2.5v5" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
        <path
          d="M12 11v12M12 17.5a4 4 0 1 1 0 .01"
          stroke="var(--logo-cut, #fff)"
          strokeWidth="2.6"
          strokeLinecap="round"
          fill="none"
        />
      </svg>
      <span className="font-condensed text-[26px] leading-none font-extrabold tracking-[-0.01em]">bookeaa</span>
    </span>
  )
}
