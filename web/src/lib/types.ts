export type Service = 'wash' | 'iron' | 'dryClean' | 'bleach'

export type OrderStatus = 'READY_TO_PICKUP' | 'IN_WASHING' | 'IN_IRONING' | 'READY_TO_DELIVER' | 'DELIVERED' | 'CANCELLED'

export interface User {
  id: string
  name: string
  email: string
  phone: string
  address: { line: string; district: string; state: string; pincode: string }
  createdAt: string
}

export interface Product {
  slug: string
  name: string
  description: string
  image: string
  prices: Record<Service, number>
}

export interface Store {
  code: string
  name: string
  city: string
  address: string
  phone: string
}

export interface OrderItem {
  product: string
  name: string
  quantity: number
  services: Service[]
  unitPrice: number
  lineTotal: number
}

export interface Order {
  id: string
  orderNumber: string
  store: Store
  items: OrderItem[]
  totalItems: number
  subTotal: number
  pickupCharge: number
  total: number
  deliveryAddress: string
  status: OrderStatus
  history: { status: OrderStatus; at: string }[]
  createdAt: string
}

export interface OrderStats {
  total: number
  active: number
  spent: number
}
