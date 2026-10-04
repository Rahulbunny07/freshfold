import clsx from 'clsx'
import { STATUS_LABELS } from '../lib/format'
import type { OrderStatus } from '../lib/types'

const STYLES: Record<OrderStatus, string> = {
  READY_TO_PICKUP: 'bg-amber-50 text-amber-700 ring-amber-200',
  IN_WASHING: 'bg-sky-50 text-sky-700 ring-sky-200',
  IN_IRONING: 'bg-indigo-50 text-indigo-700 ring-indigo-200',
  READY_TO_DELIVER: 'bg-violet-50 text-violet-700 ring-violet-200',
  DELIVERED: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  CANCELLED: 'bg-slate-100 text-slate-600 ring-slate-200',
}

export default function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span className={clsx('inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset', STYLES[status])}>
      {STATUS_LABELS[status]}
    </span>
  )
}
