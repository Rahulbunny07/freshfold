import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, MapPin, Phone, Store as StoreIcon, XCircle } from 'lucide-react'
import { toast } from 'sonner'
import clsx from 'clsx'
import { api, ApiError } from '../lib/api'
import { dateTime, money, SERVICE_LABELS, STATUS_FLOW, STATUS_LABELS } from '../lib/format'
import type { Order } from '../lib/types'
import { Modal, Spinner } from './ui'
import StatusBadge from './StatusBadge'

function Timeline({ order }: { order: Order }) {
  const reachedAt = new Map(order.history.map((h) => [h.status, h.at]))
  if (order.status === 'CANCELLED') {
    return (
      <div className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
        <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-slate-500" />
        <div>
          <p className="text-sm font-semibold text-slate-800">This order was cancelled</p>
          <p className="text-xs text-slate-500">{reachedAt.get('CANCELLED') ? dateTime(reachedAt.get('CANCELLED')!) : ''}</p>
        </div>
      </div>
    )
  }
  const current = STATUS_FLOW.indexOf(order.status)
  return (
    <ol className="grid grid-cols-5 gap-1" aria-label="Order progress">
      {STATUS_FLOW.map((s, i) => {
        const done = i <= current
        return (
          <li key={s} className="flex flex-col items-center text-center">
            <div className="flex w-full items-center">
              <span className={clsx('h-0.5 flex-1', i === 0 ? 'invisible' : done ? 'bg-brand-600' : 'bg-slate-200')} />
              <span
                className={clsx(
                  'grid h-7 w-7 shrink-0 place-items-center rounded-full border-2 text-xs font-semibold',
                  done ? 'border-brand-600 bg-brand-600 text-white' : 'border-slate-300 bg-white text-slate-400',
                  i === current && 'ring-4 ring-brand-100',
                )}
                aria-current={i === current ? 'step' : undefined}
              >
                {done ? <Check className="h-3.5 w-3.5" /> : i + 1}
              </span>
              <span className={clsx('h-0.5 flex-1', i === STATUS_FLOW.length - 1 ? 'invisible' : i < current ? 'bg-brand-600' : 'bg-slate-200')} />
            </div>
            <span className={clsx('mt-2 text-[11px] font-medium leading-tight sm:text-xs', done ? 'text-slate-800' : 'text-slate-400')}>{STATUS_LABELS[s]}</span>
            {reachedAt.get(s) && <span className="mt-0.5 hidden text-[10px] text-slate-400 sm:block">{new Date(reachedAt.get(s)!).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}</span>}
          </li>
        )
      })}
    </ol>
  )
}

function OrderDetailsView({ order, onClose }: { order: Order; onClose: () => void }) {
  const queryClient = useQueryClient()
  const [confirming, setConfirming] = useState(false)

  const onDone = (updated: Order, message: string) => {
    queryClient.invalidateQueries({ queryKey: ['orders'] })
    queryClient.invalidateQueries({ queryKey: ['order-stats'] })
    queryClient.setQueryData(['order', updated.orderNumber], updated)
    toast.success(message)
  }
  const onError = (err: Error) => toast.error(err instanceof ApiError ? err.message : 'Something went wrong')

  const cancel = useMutation({
    mutationFn: (n: string) => api.cancelOrder(n).then((r) => r.order),
    onSuccess: (o) => { setConfirming(false); onDone(o, `Order ${o.orderNumber} cancelled`) },
    onError,
  })
  const advance = useMutation({
    mutationFn: (n: string) => api.advanceOrder(n).then((r) => r.order),
    onSuccess: (o) => onDone(o, `Order moved to “${STATUS_LABELS[o.status]}”`),
    onError,
  })

  const canCancel = order.status === 'READY_TO_PICKUP'
  const canAdvance = !['DELIVERED', 'CANCELLED'].includes(order.status)

  return (
    <>
      <Modal
        open
        onClose={onClose}
        size="lg"
        title={
          <span className="flex items-center gap-3">
            Order {order.orderNumber} <StatusBadge status={order.status} />
          </span>
        }
        footer={
          <>
            {canAdvance && (
              <button className="btn-ghost mr-auto text-xs" onClick={() => advance.mutate(order.orderNumber)} disabled={advance.isPending} title="Demo only: simulates the store updating the order">
                {advance.isPending && <Spinner />} Simulate next step
              </button>
            )}
            {canCancel && (
              <button className="btn-secondary !text-red-600" onClick={() => setConfirming(true)}>Cancel order</button>
            )}
            <button className="btn-primary" onClick={onClose}>Done</button>
          </>
        }
      >
        <div className="space-y-6">
          <section>
            <Timeline order={order} />
          </section>

          <section className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border border-slate-200 p-4">
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500"><StoreIcon className="h-3.5 w-3.5" /> Store</p>
              <p className="mt-2 text-sm font-semibold">{order.store.name}, {order.store.city}</p>
              <p className="mt-0.5 text-sm text-slate-600">{order.store.address}</p>
              <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-600"><Phone className="h-3.5 w-3.5" /> {order.store.phone}</p>
            </div>
            <div className="rounded-lg border border-slate-200 p-4">
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500"><MapPin className="h-3.5 w-3.5" /> Pickup & delivery address</p>
              <p className="mt-2 text-sm text-slate-700">{order.deliveryAddress}</p>
              <p className="mt-2 text-xs text-slate-500">Placed {dateTime(order.createdAt)}</p>
            </div>
          </section>

          <section>
            <h3 className="mb-2 text-sm font-semibold">Items</h3>
            <div className="overflow-hidden rounded-lg border border-slate-200">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="th">Item</th>
                    <th className="th">Services</th>
                    <th className="th text-right">Qty</th>
                    <th className="th text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {order.items.map((i) => (
                    <tr key={i.product}>
                      <td className="td font-medium text-slate-900">{i.name}</td>
                      <td className="td text-slate-500">{i.services.map((s) => SERVICE_LABELS[s]).join(', ')}</td>
                      <td className="td text-right">{i.quantity} × {money(i.unitPrice)}</td>
                      <td className="td text-right font-medium">{money(i.lineTotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <dl className="ml-auto mt-4 max-w-xs space-y-2 text-sm">
              <div className="flex justify-between"><dt className="text-slate-500">Subtotal</dt><dd>{money(order.subTotal)}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Pickup charges</dt><dd>{money(order.pickupCharge)}</dd></div>
              <div className="flex justify-between border-t border-slate-200 pt-2 text-base font-semibold"><dt>Total</dt><dd>{money(order.total)}</dd></div>
            </dl>
          </section>
        </div>
      </Modal>

      <Modal
        open={confirming}
        onClose={() => setConfirming(false)}
        size="sm"
        title="Cancel this order?"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setConfirming(false)}>Keep order</button>
            <button className="btn-danger" onClick={() => cancel.mutate(order.orderNumber)} disabled={cancel.isPending}>
              {cancel.isPending && <Spinner />} Yes, cancel
            </button>
          </>
        }
      >
        <p className="text-sm text-slate-600">
          Order <span className="font-semibold text-slate-900">{order.orderNumber}</span> for {money(order.total)} will be cancelled and won’t be picked up. This can’t be undone.
        </p>
      </Modal>
    </>
  )
}

/** Loads the order by number so it stays fresh after cancel/advance; seeds from the list row for an instant open. */
export default function OrderDetails({ orderNumber, initial, onClose }: { orderNumber: string | null; initial?: Order; onClose: () => void }) {
  const { data } = useQuery({
    queryKey: ['order', orderNumber],
    queryFn: () => api.order(orderNumber!).then((r) => r.order),
    enabled: !!orderNumber,
    initialData: initial && initial.orderNumber === orderNumber ? initial : undefined,
  })
  if (!orderNumber || !data) return null
  return <OrderDetailsView order={data} onClose={onClose} />
}
