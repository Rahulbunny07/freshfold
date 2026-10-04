import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { config } from './config.js'
import { signToken, requireAuth } from './auth.js'
import { asyncHandler, HttpError } from './errors.js'
import { Order, Product, Store, User, SERVICES, ORDER_STATUSES, nextOrderNumber } from './models.js'
import { priceOrder } from './pricing.js'

export const router = Router()

// ---------- Auth ----------

const registerSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(60),
  email: z.email('Enter a valid email').transform((v) => v.toLowerCase()),
  phone: z.string().trim().regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit mobile number'),
  password: z.string().min(8, 'Password must be at least 8 characters').max(72),
  address: z.object({
    line: z.string().trim().min(5, 'Enter your full address'),
    district: z.string().trim().min(2, 'Enter your district'),
    state: z.string().trim().min(2, 'Enter your state'),
    pincode: z.string().trim().regex(/^\d{6}$/, 'Enter a valid 6-digit pincode'),
  }),
})

router.post(
  '/auth/register',
  asyncHandler(async (req, res) => {
    const data = registerSchema.parse(req.body)
    const passwordHash = await bcrypt.hash(data.password, 10)
    const user = await User.create({ ...data, passwordHash })
    res.status(201).json({ token: signToken(user.id), user })
  }),
)

const loginSchema = z.object({
  identifier: z.string().trim().min(1, 'Enter your email or phone'),
  password: z.string().min(1, 'Enter your password'),
})

router.post(
  '/auth/login',
  asyncHandler(async (req, res) => {
    const { identifier, password } = loginSchema.parse(req.body)
    const user = await User.findOne(
      identifier.includes('@') ? { email: identifier.toLowerCase() } : { phone: identifier },
    ).select('+passwordHash')
    // Same message for unknown user and wrong password, so accounts can't be enumerated.
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      throw new HttpError(401, 'Invalid email/phone or password')
    }
    res.json({ token: signToken(user.id), user })
  }),
)

router.get(
  '/auth/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.userId)
    if (!user) throw new HttpError(401, 'Account not found')
    res.json({ user })
  }),
)

// ---------- Catalog ----------

router.get(
  '/products',
  asyncHandler(async (_req, res) => {
    const products = await Product.find().sort({ sortOrder: 1 }).lean()
    res.json({ products: products.map(({ _id, __v, ...p }) => p), pickupCharge: config.pickupCharge })
  }),
)

router.get(
  '/stores',
  asyncHandler(async (_req, res) => {
    const stores = await Store.find().sort({ name: 1 }).lean()
    res.json({ stores: stores.map(({ _id, __v, ...s }) => s) })
  }),
)

// ---------- Orders ----------

const createOrderSchema = z.object({
  storeCode: z.string().min(1, 'Choose a store'),
  items: z
    .array(
      z.object({
        product: z.string().min(1),
        quantity: z.number().int().min(1).max(100),
        services: z.array(z.enum(SERVICES)).min(1, 'Pick at least one service'),
      }),
    )
    .min(1, 'Add at least one item'),
})

router.get(
  '/orders',
  requireAuth,
  asyncHandler(async (req, res) => {
    const filter = { user: req.userId }
    if (req.query.status === 'active') filter.status = { $nin: ['DELIVERED', 'CANCELLED'] }
    else if (req.query.status === 'cancelled') filter.status = 'CANCELLED'
    else if (req.query.status === 'delivered') filter.status = 'DELIVERED'
    if (typeof req.query.q === 'string' && req.query.q.trim()) {
      const q = req.query.q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      filter.orderNumber = { $regex: q, $options: 'i' }
    }
    const orders = await Order.find(filter).sort({ createdAt: -1 })
    res.json({ orders })
  }),
)

router.get(
  '/orders/stats',
  requireAuth,
  asyncHandler(async (req, res) => {
    const orders = await Order.find({ user: req.userId }, { status: 1, total: 1 }).lean()
    const active = orders.filter((o) => !['DELIVERED', 'CANCELLED'].includes(o.status)).length
    const spent = orders.filter((o) => o.status !== 'CANCELLED').reduce((s, o) => s + o.total, 0)
    res.json({ total: orders.length, active, spent })
  }),
)

router.get(
  '/orders/:orderNumber',
  requireAuth,
  asyncHandler(async (req, res) => {
    const order = await Order.findOne({ orderNumber: req.params.orderNumber, user: req.userId })
    if (!order) throw new HttpError(404, 'Order not found')
    res.json({ order })
  }),
)

router.post(
  '/orders',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { storeCode, items } = createOrderSchema.parse(req.body)
    const [user, store, products] = await Promise.all([
      User.findById(req.userId),
      Store.findOne({ code: storeCode }).lean(),
      Product.find({ slug: { $in: items.map((i) => i.product) } }).lean(),
    ])
    if (!user) throw new HttpError(401, 'Account not found')
    if (!store) throw new HttpError(400, 'Unknown store')

    const priced = priceOrder(items, products, config.pickupCharge)
    const { _id, __v, ...storeInfo } = store
    const a = user.address
    const order = await Order.create({
      orderNumber: await nextOrderNumber(),
      user: user._id,
      store: storeInfo,
      ...priced,
      deliveryAddress: `${a.line}, ${a.district}, ${a.state} - ${a.pincode}`,
      history: [{ status: 'READY_TO_PICKUP' }],
    })
    res.status(201).json({ order })
  }),
)

router.post(
  '/orders/:orderNumber/cancel',
  requireAuth,
  asyncHandler(async (req, res) => {
    // Atomic: only cancels if the order belongs to the user and hasn't been picked up yet.
    const order = await Order.findOneAndUpdate(
      { orderNumber: req.params.orderNumber, user: req.userId, status: 'READY_TO_PICKUP' },
      { $set: { status: 'CANCELLED' }, $push: { history: { status: 'CANCELLED' } } },
      { new: true },
    )
    if (!order) {
      const exists = await Order.exists({ orderNumber: req.params.orderNumber, user: req.userId })
      throw exists
        ? new HttpError(409, 'This order has already been picked up and can no longer be cancelled')
        : new HttpError(404, 'Order not found')
    }
    res.json({ order })
  }),
)

const FLOW = ORDER_STATUSES.filter((s) => s !== 'CANCELLED')

router.post(
  '/orders/:orderNumber/advance',
  requireAuth,
  asyncHandler(async (req, res) => {
    if (!config.demoMode) throw new HttpError(404, 'Route not found')
    const order = await Order.findOne({ orderNumber: req.params.orderNumber, user: req.userId })
    if (!order) throw new HttpError(404, 'Order not found')
    const idx = FLOW.indexOf(order.status)
    if (idx === -1 || idx === FLOW.length - 1) throw new HttpError(409, 'This order has no further steps')
    order.status = FLOW[idx + 1]
    order.history.push({ status: order.status })
    await order.save()
    res.json({ order })
  }),
)
