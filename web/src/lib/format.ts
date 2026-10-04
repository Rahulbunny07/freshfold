import type { OrderStatus, Service } from './types'

const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })
export const money = (n: number) => inr.format(n)

export const dateTime = (iso: string) =>
  new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' })

export const date = (iso: string) => new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })

export const SERVICE_LABELS: Record<Service, string> = {
  wash: 'Wash',
  iron: 'Iron',
  dryClean: 'Dry clean',
  bleach: 'Bleach',
}

export const SERVICES: Service[] = ['wash', 'iron', 'dryClean', 'bleach']

export const STATUS_LABELS: Record<OrderStatus, string> = {
  READY_TO_PICKUP: 'Ready to pick up',
  IN_WASHING: 'In washing',
  IN_IRONING: 'In ironing',
  READY_TO_DELIVER: 'Ready to deliver',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
}

export const STATUS_FLOW: OrderStatus[] = ['READY_TO_PICKUP', 'IN_WASHING', 'IN_IRONING', 'READY_TO_DELIVER', 'DELIVERED']
