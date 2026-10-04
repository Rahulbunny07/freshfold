import clsx from 'clsx'

export default function Logo({ className, light = false }: { className?: string; light?: boolean }) {
  return (
    <span className={clsx('inline-flex items-center gap-2 font-semibold tracking-tight', className)}>
      <svg viewBox="0 0 32 32" className="h-8 w-8" aria-hidden="true">
        <rect width="32" height="32" rx="8" className={light ? 'fill-white' : 'fill-brand-600'} />
        <circle cx="16" cy="17" r="7.5" fill="none" strokeWidth="2.4" className={light ? 'stroke-brand-600' : 'stroke-white'} />
        <circle cx="16" cy="17" r="3" className={light ? 'fill-brand-600' : 'fill-white'} />
        <rect x="8" y="6" width="3" height="3" rx="1" className={light ? 'fill-brand-600' : 'fill-white'} />
      </svg>
      <span className={clsx('text-lg', light ? 'text-white' : 'text-slate-900')}>FreshFold</span>
    </span>
  )
}
