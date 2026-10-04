import type { Order, OrderStats, Product, Service, Store, User } from './types'

const TOKEN_KEY = 'freshfold.token'

export const tokenStore = {
  get: () => {
    try { return localStorage.getItem(TOKEN_KEY) } catch { return null }
  },
  set: (token: string) => {
    try { localStorage.setItem(TOKEN_KEY, token) } catch { /* storage unavailable */ }
  },
  clear: () => {
    try { localStorage.removeItem(TOKEN_KEY) } catch { /* storage unavailable */ }
  },
}

export class ApiError extends Error {
  status: number
  fieldErrors: Record<string, string>
  constructor(status: number, message: string, details?: { field: string; message: string }[]) {
    super(message)
    this.status = status
    this.fieldErrors = Object.fromEntries((details ?? []).map((d) => [d.field, d.message]))
  }
}

async function request<T>(path: string, options: { method?: string; body?: unknown } = {}): Promise<T> {
  const token = tokenStore.get()
  const res = await fetch(`/api${path}`, {
    method: options.method ?? 'GET',
    headers: {
      ...(options.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  }).catch(() => {
    throw new ApiError(0, 'Can’t reach the server. Check your connection and try again.')
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    if (res.status === 401 && token) {
      tokenStore.clear()
      window.dispatchEvent(new Event('freshfold:logout'))
    }
    const fallback = res.status >= 502 ? 'The server is unavailable right now. Please try again shortly.' : 'Something went wrong'
    throw new ApiError(res.status, data.error ?? fallback, data.details)
  }
  return data as T
}

export interface RegisterInput {
  name: string
  email: string
  phone: string
  password: string
  address: User['address']
}

export const api = {
  register: (input: RegisterInput) => request<{ token: string; user: User }>('/auth/register', { method: 'POST', body: input }),
  login: (identifier: string, password: string) =>
    request<{ token: string; user: User }>('/auth/login', { method: 'POST', body: { identifier, password } }),
  me: () => request<{ user: User }>('/auth/me'),

  products: () => request<{ products: Product[]; pickupCharge: number }>('/products'),
  stores: () => request<{ stores: Store[] }>('/stores'),

  orders: (params: { q?: string; status?: string }) => {
    const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v) as [string, string][]).toString()
    return request<{ orders: Order[] }>(`/orders${qs ? `?${qs}` : ''}`)
  },
  orderStats: () => request<OrderStats>('/orders/stats'),
  order: (orderNumber: string) => request<{ order: Order }>(`/orders/${orderNumber}`),
  createOrder: (input: { storeCode: string; items: { product: string; quantity: number; services: Service[] }[] }) =>
    request<{ order: Order }>('/orders', { method: 'POST', body: input }),
  cancelOrder: (orderNumber: string) => request<{ order: Order }>(`/orders/${orderNumber}/cancel`, { method: 'POST' }),
  advanceOrder: (orderNumber: string) => request<{ order: Order }>(`/orders/${orderNumber}/advance`, { method: 'POST' }),
}
