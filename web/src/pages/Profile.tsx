import { Mail, MapPin, Phone } from 'lucide-react'
import { useAuth } from '../lib/auth'
import { date } from '../lib/format'

export default function Profile() {
  const { user } = useAuth()
  if (!user) return null
  const a = user.address
  const rows = [
    { icon: Mail, label: 'Email', value: user.email },
    { icon: Phone, label: 'Mobile', value: user.phone },
    { icon: MapPin, label: 'Pickup address', value: `${a.line}, ${a.district}, ${a.state} - ${a.pincode}` },
  ]
  return (
    <div className="page max-w-3xl">
      <h1 className="text-2xl font-semibold tracking-tight">Profile</h1>
      <div className="card mt-6">
        <div className="flex items-center gap-4 border-b border-slate-200 p-6">
          <span className="grid h-14 w-14 place-items-center rounded-full bg-brand-100 text-lg font-semibold text-brand-700">
            {user.name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()}
          </span>
          <div>
            <p className="text-lg font-semibold">{user.name}</p>
            <p className="text-sm text-slate-500">Member since {date(user.createdAt)}</p>
          </div>
        </div>
        <dl className="divide-y divide-slate-100">
          {rows.map((r) => (
            <div key={r.label} className="flex gap-4 p-6">
              <r.icon className="mt-0.5 h-5 w-5 shrink-0 text-slate-400" />
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{r.label}</dt>
                <dd className="mt-1 text-sm text-slate-800">{r.value}</dd>
              </div>
            </div>
          ))}
        </dl>
      </div>
    </div>
  )
}
