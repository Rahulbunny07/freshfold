import { useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, MapPin, Minus, Plus, RotateCcw, ShoppingBasket } from 'lucide-react'
import { toast } from 'sonner'
import clsx from 'clsx'
import { api, ApiError } from '../lib/api'
import { useAuth } from '../lib/auth'
import { money, SERVICE_LABELS, SERVICES } from '../lib/format'
import type { Product, Service } from '../lib/types'
import { Modal, PageLoader, Spinner } from '../components/ui'

type Line = { quantity: number; services: Service[] }
const emptyLine: Line = { quantity: 0, services: [] }

const unitPrice = (p: Product, services: Service[]) => services.reduce((s, x) => s + p.prices[x], 0)

function ProductRow({ product, line, update }: { product: Product; line: Line; update: (fn: (l: Line) => Line) => void }) {
  const price = unitPrice(product, line.services)
  const clamp = (n: number) => Math.max(0, Math.min(100, n))
  const setQty = (n: number) => update((l) => ({ ...l, quantity: clamp(n) }))
  const step = (delta: number) => update((l) => ({ ...l, quantity: clamp(l.quantity + delta) }))
  const toggle = (s: Service) =>
    update((l) => {
      const services = l.services.includes(s) ? l.services.filter((x) => x !== s) : [...l.services, s]
      return { quantity: l.quantity || (services.length ? 1 : 0), services }
    })
  const active = line.quantity > 0 && line.services.length > 0

  return (
    <li className={clsx('p-4 transition-colors', active && 'bg-brand-50/40')}>
      <div className="flex items-center gap-3">
        <img src={`/products/${product.image}`} alt="" className="h-14 w-14 shrink-0 rounded-lg border border-slate-200 object-cover" loading="lazy" />
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-slate-900">{product.name}</p>
          <p className="truncate text-xs text-slate-500">{product.description}</p>
        </div>

        <div className="flex items-center gap-1">
          <button type="button" onClick={() => step(-1)} disabled={line.quantity === 0} className="grid h-9 w-9 place-items-center rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50 disabled:opacity-40" aria-label={`Decrease ${product.name}`}>
            <Minus className="h-4 w-4" />
          </button>
          <input
            inputMode="numeric"
            value={line.quantity || ''}
            placeholder="0"
            onChange={(e) => setQty(Number(e.target.value.replace(/\D/g, '')) || 0)}
            className="h-9 w-12 rounded-lg border border-slate-300 text-center text-sm font-semibold focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
            aria-label={`${product.name} quantity`}
          />
          <button type="button" onClick={() => step(1)} className="grid h-9 w-9 place-items-center rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50" aria-label={`Increase ${product.name}`}>
            <Plus className="h-4 w-4" />
          </button>
        </div>

        <div className="hidden w-24 items-center justify-end gap-1 sm:flex">
          <span className={clsx('text-sm font-semibold', active ? 'text-slate-900' : 'text-slate-300')}>
            {active ? money(price * line.quantity) : '—'}
          </span>
          <button
            type="button"
            onClick={() => update(() => emptyLine)}
            className={clsx('rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600', !(line.quantity > 0 || line.services.length > 0) && 'invisible')}
            aria-label={`Reset ${product.name}`}
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 sm:pl-[68px]">
        {SERVICES.map((s) => {
          const on = line.services.includes(s)
          return (
            <button
              key={s}
              type="button"
              aria-pressed={on}
              onClick={() => toggle(s)}
              className={clsx(
                'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                on ? 'border-brand-600 bg-brand-600 text-white' : 'border-slate-300 bg-white text-slate-600 hover:border-slate-400',
              )}
            >
              {on && <Check className="h-3 w-3" />}
              {SERVICE_LABELS[s]} <span className={on ? 'text-brand-100' : 'text-slate-400'}>₹{product.prices[s]}</span>
            </button>
          )
        })}
        {active && <span className="ml-auto text-sm font-semibold sm:hidden">{money(price * line.quantity)}</span>}
      </div>
    </li>
  )
}

export default function NewOrder() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const catalog = useQuery({ queryKey: ['products'], queryFn: api.products, staleTime: Infinity })
  const stores = useQuery({ queryKey: ['stores'], queryFn: () => api.stores().then((r) => r.stores), staleTime: Infinity })
  const [lines, setLines] = useState<Record<string, Line>>({})
  const [storeCode, setStoreCode] = useState('')
  const [reviewing, setReviewing] = useState(false)
  const summaryRef = useRef<HTMLElement>(null)

  const products = catalog.data?.products ?? []
  const pickupCharge = catalog.data?.pickupCharge ?? 0
  const selectedStore = stores.data?.find((s) => s.code === storeCode)

  const summary = useMemo(() => {
    const items = products
      .map((p) => ({ product: p, line: lines[p.slug] ?? emptyLine }))
      .filter(({ line }) => line.quantity > 0 && line.services.length > 0)
      .map(({ product, line }) => ({ product, line, total: unitPrice(product, line.services) * line.quantity }))
    const subTotal = items.reduce((s, i) => s + i.total, 0)
    return { items, subTotal, count: items.reduce((s, i) => s + i.line.quantity, 0), total: subTotal + pickupCharge }
  }, [products, lines, pickupCharge])

  // Rows with a quantity but no service (or the reverse) can't be ordered yet.
  const incomplete = Object.entries(lines).filter(([, l]) => (l.quantity > 0) !== (l.services.length > 0))

  const placeOrder = useMutation({
    mutationFn: () =>
      api.createOrder({
        storeCode,
        items: summary.items.map((i) => ({ product: i.product.slug, quantity: i.line.quantity, services: i.line.services })),
      }),
    onSuccess: ({ order }) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      queryClient.invalidateQueries({ queryKey: ['order-stats'] })
      toast.success(`Order ${order.orderNumber} placed. We’ll pick it up soon.`)
      navigate(`/orders?open=${order.orderNumber}`)
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : 'Could not place the order'),
  })

  if (catalog.isLoading || stores.isLoading) return <PageLoader />

  const canReview = summary.items.length > 0 && !!storeCode && incomplete.length === 0
  const a = user?.address

  return (
    <div className={clsx('page', summary.items.length > 0 && 'pb-24 lg:pb-0')}>
      <h1 className="text-2xl font-semibold tracking-tight">New order</h1>
      <p className="mt-1 text-sm text-slate-500">Choose quantities and services for each item. Prices are per piece.</p>

      <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <section className="card overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3">
            <span className="th !p-0">Items & services</span>
            <span className="th !p-0">Prices per piece</span>
          </div>
          <ul className="divide-y divide-slate-100">
            {products.map((p) => (
              <ProductRow key={p.slug} product={p} line={lines[p.slug] ?? emptyLine} update={(fn) => setLines((prev) => ({ ...prev, [p.slug]: fn(prev[p.slug] ?? emptyLine) }))} />
            ))}
          </ul>
        </section>

        <aside ref={summaryRef} className="card scroll-mt-24 p-5 lg:sticky lg:top-24">
          <h2 className="font-semibold">Order summary</h2>

          <fieldset className="mt-4">
            <legend className="label">Store</legend>
            <div className="space-y-2">
              {stores.data?.map((s) => (
                <label key={s.code} className={clsx('flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm transition-colors', storeCode === s.code ? 'border-brand-600 bg-brand-50' : 'border-slate-200 hover:border-slate-300')}>
                  <input type="radio" name="store" value={s.code} checked={storeCode === s.code} onChange={() => setStoreCode(s.code)} className="mt-0.5 text-brand-600 focus:ring-brand-500" />
                  <span>
                    <span className="block font-medium text-slate-900">{s.name}</span>
                    <span className="block text-xs text-slate-500">{s.address}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="mt-5 border-t border-slate-200 pt-4">
            {summary.items.length === 0 ? (
              <div className="flex flex-col items-center py-4 text-center text-sm text-slate-400">
                <ShoppingBasket className="mb-2 h-6 w-6" /> No items added yet
              </div>
            ) : (
              <ul className="space-y-2 text-sm">
                {summary.items.map((i) => (
                  <li key={i.product.slug} className="flex justify-between gap-3">
                    <span className="text-slate-600">{i.product.name} × {i.line.quantity}</span>
                    <span className="font-medium">{money(i.total)}</span>
                  </li>
                ))}
              </ul>
            )}
            <dl className="mt-4 space-y-2 border-t border-slate-200 pt-4 text-sm">
              <div className="flex justify-between"><dt className="text-slate-500">Subtotal ({summary.count} items)</dt><dd>{money(summary.subTotal)}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Pickup charges</dt><dd>{money(pickupCharge)}</dd></div>
              <div className="flex justify-between pt-1 text-base font-semibold"><dt>Total</dt><dd>{money(summary.total)}</dd></div>
            </dl>
          </div>

          {incomplete.length > 0 && <p className="mt-4 text-xs text-amber-600">Some items need both a quantity and a service.</p>}
          {!storeCode && summary.items.length > 0 && <p className="mt-4 text-xs text-slate-500">Choose a store to continue.</p>}

          <button className="btn-primary mt-5 w-full !py-3" disabled={!canReview} onClick={() => setReviewing(true)}>
            Review order
          </button>
          {summary.items.length > 0 && (
            <button className="btn-ghost mt-2 w-full text-xs" onClick={() => setLines({})}>Clear all</button>
          )}
        </aside>
      </div>

      {summary.items.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 px-4 py-3 shadow-[0_-4px_12px_rgb(15_23_42/0.06)] backdrop-blur lg:hidden">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
            <div>
              <p className="text-xs text-slate-500">{summary.count} items · incl. pickup</p>
              <p className="text-lg font-semibold">{money(summary.total)}</p>
            </div>
            <button
              className="btn-primary"
              onClick={() => (canReview ? setReviewing(true) : summaryRef.current?.scrollIntoView({ behavior: 'smooth' }))}
            >
              {canReview ? 'Review order' : storeCode ? 'Fix items' : 'Choose store'}
            </button>
          </div>
        </div>
      )}

      <Modal
        open={reviewing}
        onClose={() => setReviewing(false)}
        title="Confirm your order"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setReviewing(false)}>Back</button>
            <button className="btn-primary" onClick={() => placeOrder.mutate()} disabled={placeOrder.isPending}>
              {placeOrder.isPending && <Spinner />} Place order · {money(summary.total)}
            </button>
          </>
        }
      >
        <div className="space-y-5 text-sm">
          <div className="rounded-lg border border-slate-200 p-4">
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500"><MapPin className="h-3.5 w-3.5" /> Pickup from</p>
            <p className="mt-2 text-slate-700">{a ? `${a.line}, ${a.district}, ${a.state} - ${a.pincode}` : ''}</p>
            <p className="mt-3 text-xs text-slate-500">Processed at <span className="font-medium text-slate-700">{selectedStore?.name}</span> · {selectedStore?.phone}</p>
          </div>
          <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
            {summary.items.map((i) => (
              <li key={i.product.slug} className="flex justify-between gap-4 px-4 py-3">
                <span>
                  <span className="font-medium text-slate-900">{i.product.name} × {i.line.quantity}</span>
                  <span className="block text-xs text-slate-500">{i.line.services.map((s) => SERVICE_LABELS[s]).join(', ')}</span>
                </span>
                <span className="font-medium">{money(i.total)}</span>
              </li>
            ))}
          </ul>
          <dl className="ml-auto max-w-xs space-y-2">
            <div className="flex justify-between"><dt className="text-slate-500">Subtotal</dt><dd>{money(summary.subTotal)}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Pickup charges</dt><dd>{money(pickupCharge)}</dd></div>
            <div className="flex justify-between border-t border-slate-200 pt-2 text-base font-semibold"><dt>Total</dt><dd>{money(summary.total)}</dd></div>
          </dl>
          <p className="text-xs text-slate-500">You can cancel free of charge until your order is picked up.</p>
        </div>
      </Modal>
    </div>
  )
}
