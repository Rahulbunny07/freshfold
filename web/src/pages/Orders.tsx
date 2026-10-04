import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { ChevronRight, PackageOpen, Plus, Search, ShoppingBag, Timer, Wallet } from 'lucide-react'
import clsx from 'clsx'
import { api } from '../lib/api'
import { useAuth } from '../lib/auth'
import { dateTime, money } from '../lib/format'
import type { Order } from '../lib/types'
import StatusBadge from '../components/StatusBadge'
import OrderDetails from '../components/OrderDetails'
import { EmptyState, Spinner } from '../components/ui'

const FILTERS = [
  { value: '', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'cancelled', label: 'Cancelled' },
]

function useDebounced<T>(value: T, ms = 300) {
  const [v, setV] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms)
    return () => clearTimeout(t)
  }, [value, ms])
  return v
}

export default function Orders() {
  const { user } = useAuth()
  const [params, setParams] = useSearchParams()
  const status = params.get('status') ?? ''
  const [search, setSearch] = useState('')
  const q = useDebounced(search)
  const [selected, setSelected] = useState<Order | null>(null)

  const stats = useQuery({ queryKey: ['order-stats'], queryFn: api.orderStats })
  const orders = useQuery({
    queryKey: ['orders', { q, status }],
    queryFn: () => api.orders({ q, status }).then((r) => r.orders),
    placeholderData: keepPreviousData,
  })

  // Deep link: /orders?open=ORD-1001 opens that order (used after placing an order).
  const openParam = params.get('open')
  const opened = openParam ?? selected?.orderNumber ?? null
  const closeDetails = () => {
    setSelected(null)
    if (openParam) {
      params.delete('open')
      setParams(params, { replace: true })
    }
  }

  const setStatus = (value: string) => {
    if (value) params.set('status', value)
    else params.delete('status')
    setParams(params, { replace: true })
  }

  const hasAnyOrders = (stats.data?.total ?? 0) > 0
  const statCards = [
    { label: 'Total orders', value: stats.data?.total ?? '–', icon: ShoppingBag },
    { label: 'In progress', value: stats.data?.active ?? '–', icon: Timer },
    { label: 'Total spent', value: stats.data ? money(stats.data.spent) : '–', icon: Wallet },
  ]

  return (
    <div className="page">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Hi, {user?.name.split(' ')[0]}</h1>
          <p className="mt-1 text-sm text-slate-500">Here’s everything happening with your laundry.</p>
        </div>
        <Link to="/orders/new" className="btn-primary sm:hidden"><Plus className="h-4 w-4" /> New order</Link>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {statCards.map((s) => (
          <div key={s.label} className="card flex items-center gap-4 p-5">
            <span className="grid h-11 w-11 place-items-center rounded-lg bg-brand-50 text-brand-600"><s.icon className="h-5 w-5" /></span>
            <div>
              <p className="text-sm text-slate-500">{s.label}</p>
              <p className="text-xl font-semibold">{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="card mt-8">
        <div className="flex flex-col gap-4 border-b border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-1 overflow-x-auto" role="tablist" aria-label="Filter orders">
            {FILTERS.map((f) => (
              <button
                key={f.value}
                role="tab"
                aria-selected={status === f.value}
                onClick={() => setStatus(f.value)}
                className={clsx('whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition-colors', status === f.value ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100')}
              >
                {f.label}
              </button>
            ))}
          </div>
          <div className="relative sm:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by order number" className="input pl-9" aria-label="Search orders" />
            {orders.isFetching && <Spinner className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />}
          </div>
        </div>

        {orders.isLoading ? (
          <div className="grid place-items-center py-20 text-slate-400"><Spinner className="h-6 w-6" /></div>
        ) : orders.isError ? (
          <EmptyState icon={<PackageOpen className="h-6 w-6" />} title="Couldn’t load your orders" text="Please check your connection and try again." action={<button className="btn-secondary" onClick={() => orders.refetch()}>Retry</button>} />
        ) : !orders.data?.length ? (
          hasAnyOrders ? (
            <EmptyState icon={<Search className="h-6 w-6" />} title="No matching orders" text="Try a different order number or filter." />
          ) : (
            <EmptyState
              icon={<PackageOpen className="h-6 w-6" />}
              title="No orders yet"
              text="Schedule your first pickup. Choose your clothes and services, and we’ll take it from there."
              action={<Link to="/orders/new" className="btn-primary"><Plus className="h-4 w-4" /> Create your first order</Link>}
            />
          )
        ) : (
          <>
            {/* Table on desktop */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="th">Order</th>
                    <th className="th">Placed on</th>
                    <th className="th">Store</th>
                    <th className="th">Store phone</th>
                    <th className="th text-right">Items</th>
                    <th className="th text-right">Amount</th>
                    <th className="th">Status</th>
                    <th className="th"><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {orders.data.map((o) => (
                    <tr key={o.id} className="cursor-pointer transition-colors hover:bg-slate-50" onClick={() => setSelected(o)}>
                      <td className="td whitespace-nowrap font-semibold text-slate-900">{o.orderNumber}</td>
                      <td className="td whitespace-nowrap">{dateTime(o.createdAt)}</td>
                      <td className="td">{o.store.name}<span className="block text-xs text-slate-400">{o.store.city}</span></td>
                      <td className="td whitespace-nowrap">{o.store.phone}</td>
                      <td className="td text-right">{o.totalItems}</td>
                      <td className="td text-right font-medium">{money(o.total)}</td>
                      <td className="td"><StatusBadge status={o.status} /></td>
                      <td className="td text-right">
                        <button className="btn-ghost !px-2 !py-1.5 text-xs" onClick={(e) => { e.stopPropagation(); setSelected(o) }}>
                          View <ChevronRight className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Cards on mobile */}
            <ul className="divide-y divide-slate-100 md:hidden">
              {orders.data.map((o) => (
                <li key={o.id}>
                  <button className="flex w-full items-center justify-between gap-4 p-4 text-left" onClick={() => setSelected(o)}>
                    <div>
                      <p className="font-semibold">{o.orderNumber}</p>
                      <p className="mt-0.5 text-xs text-slate-500">{dateTime(o.createdAt)} · {o.totalItems} items · {o.store.name}</p>
                      <div className="mt-2"><StatusBadge status={o.status} /></div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{money(o.total)}</span>
                      <ChevronRight className="h-4 w-4 text-slate-400" />
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      <OrderDetails orderNumber={opened} initial={selected ?? undefined} onClose={closeDetails} />
    </div>
  )
}
