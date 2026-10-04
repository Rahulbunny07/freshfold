// Creates a demo account with a realistic order history (every status represented).
// Wipes the configured database first — use it on a local/dev database only.
import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'
import { config } from './config.js'
import { Order, Product, Store, User, nextOrderNumber } from './models.js'
import { ensureCatalog } from './catalog.js'
import { priceOrder } from './pricing.js'

export const DEMO_USER = {
  name: 'Ananya Rao',
  email: 'demo@freshfold.dev',
  phone: '9000000001',
  password: 'FreshFold@2026',
  address: { line: '18, 2nd Main, Indiranagar 1st Stage', district: 'Bangalore Urban', state: 'Karnataka', pincode: '560038' },
}

const FLOW = ['READY_TO_PICKUP', 'IN_WASHING', 'IN_IRONING', 'READY_TO_DELIVER', 'DELIVERED']
const HOUR = 3_600_000
const DAY = 24 * HOUR

const ORDERS = [
  { daysAgo: 21, store: 'IND', status: 'DELIVERED', items: [{ product: 'shirts', quantity: 6, services: ['wash', 'iron'] }, { product: 'trousers', quantity: 3, services: ['wash', 'iron'] }] },
  { daysAgo: 14, store: 'IND', status: 'DELIVERED', items: [{ product: 'jeans', quantity: 2, services: ['dryClean'] }, { product: 'others', quantity: 4, services: ['wash', 'bleach'] }] },
  { daysAgo: 9, store: 'KOR', status: 'CANCELLED', items: [{ product: 't-shirts', quantity: 5, services: ['wash'] }] },
  { daysAgo: 4, store: 'IND', status: 'DELIVERED', items: [{ product: 'shirts', quantity: 4, services: ['dryClean'] }, { product: 'boxers', quantity: 6, services: ['wash'] }] },
  { daysAgo: 2, store: 'JPN', status: 'READY_TO_DELIVER', items: [{ product: 'joggers', quantity: 3, services: ['wash', 'iron'] }, { product: 't-shirts', quantity: 4, services: ['wash', 'iron'] }] },
  { daysAgo: 1, store: 'IND', status: 'IN_IRONING', items: [{ product: 'shirts', quantity: 5, services: ['wash', 'iron'] }, { product: 'trousers', quantity: 2, services: ['iron'] }] },
  { daysAgo: 0.3, store: 'KOR', status: 'IN_WASHING', items: [{ product: 'others', quantity: 2, services: ['wash', 'bleach'] }, { product: 'jeans', quantity: 1, services: ['wash'] }] },
  { daysAgo: 0.05, store: 'IND', status: 'READY_TO_PICKUP', items: [{ product: 'shirts', quantity: 2, services: ['dryClean'] }, { product: 'trousers', quantity: 2, services: ['dryClean'] }] },
]

await mongoose.connect(config.mongoUrl)
await mongoose.connection.dropDatabase()
await ensureCatalog()

const user = await User.create({ ...DEMO_USER, passwordHash: await bcrypt.hash(DEMO_USER.password, 10) })
const products = await Product.find().lean()
const stores = new Map((await Store.find().lean()).map((s) => [s.code, s]))
const a = user.address

for (const spec of ORDERS) {
  const createdAt = new Date(Date.now() - spec.daysAgo * DAY)
  const steps = spec.status === 'CANCELLED' ? ['READY_TO_PICKUP', 'CANCELLED'] : FLOW.slice(0, FLOW.indexOf(spec.status) + 1)
  const { _id, __v, ...store } = stores.get(spec.store)
  const order = new Order({
    orderNumber: await nextOrderNumber(),
    user: user._id,
    store,
    ...priceOrder(spec.items, products, config.pickupCharge),
    deliveryAddress: `${a.line}, ${a.district}, ${a.state} - ${a.pincode}`,
    status: spec.status,
    history: steps.map((status, i) => ({ status, at: new Date(createdAt.getTime() + i * 6 * HOUR) })),
    createdAt,
    updatedAt: createdAt,
  })
  await order.save({ timestamps: false })
}

console.log(`Demo data ready: ${ORDERS.length} orders for ${DEMO_USER.email} (password: ${DEMO_USER.password})`)
await mongoose.disconnect()
