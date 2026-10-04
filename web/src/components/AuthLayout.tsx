import type { ReactNode } from 'react'
import { BadgeCheck, Clock3, Truck } from 'lucide-react'
import Logo from './Logo'

const points = [
  { icon: Truck, title: 'Free doorstep pickup', text: 'Schedule a pickup in a few taps. We collect and deliver back to you.' },
  { icon: Clock3, title: 'Track every step', text: 'Follow your order from pickup to washing, ironing and delivery.' },
  { icon: BadgeCheck, title: 'Transparent pricing', text: 'Per-item prices for each service. No surprises at checkout.' },
]

export default function AuthLayout({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[1fr_1.1fr]">
      <aside className="relative hidden overflow-hidden bg-brand-700 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-brand-600" aria-hidden="true" />
        <div className="absolute -bottom-32 -left-16 h-96 w-96 rounded-full bg-brand-800" aria-hidden="true" />
        <div className="relative"><Logo light /></div>
        <div className="relative max-w-md">
          <h2 className="text-3xl font-semibold leading-tight">Laundry and dry cleaning, picked up from your door.</h2>
          <ul className="mt-10 space-y-6">
            {points.map((p) => (
              <li key={p.title} className="flex gap-4">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-white/10"><p.icon className="h-5 w-5" /></span>
                <div>
                  <p className="font-semibold">{p.title}</p>
                  <p className="mt-0.5 text-sm text-brand-100">{p.text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-sm text-brand-200">Trusted by households across Bangalore</p>
      </aside>

      <main className="flex items-center justify-center bg-white px-4 py-12 sm:px-8">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden"><Logo /></div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{title}</h1>
          <p className="mt-1.5 text-sm text-slate-500">{subtitle}</p>
          <div className="mt-8">{children}</div>
        </div>
      </main>
    </div>
  )
}
