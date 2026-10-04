import mongoose from 'mongoose'

const { Schema, model } = mongoose

export const SERVICES = ['wash', 'iron', 'dryClean', 'bleach']

export const ORDER_STATUSES = ['READY_TO_PICKUP', 'IN_WASHING', 'IN_IRONING', 'READY_TO_DELIVER', 'DELIVERED', 'CANCELLED']

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, required: true, unique: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    address: {
      line: { type: String, required: true, trim: true },
      district: { type: String, required: true, trim: true },
      state: { type: String, required: true, trim: true },
      pincode: { type: String, required: true, trim: true },
    },
  },
  { timestamps: true },
)

userSchema.set('toJSON', {
  transform: (_doc, ret) => {
    ret.id = ret._id.toString()
    delete ret._id
    delete ret.__v
    delete ret.passwordHash
    return ret
  },
})

const productSchema = new Schema({
  slug: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  description: { type: String, default: '' },
  image: { type: String, default: '' },
  sortOrder: { type: Number, default: 0 },
  // Price per item, in rupees, for each service.
  prices: {
    wash: { type: Number, required: true, min: 0 },
    iron: { type: Number, required: true, min: 0 },
    dryClean: { type: Number, required: true, min: 0 },
    bleach: { type: Number, required: true, min: 0 },
  },
})

const storeSchema = new Schema({
  code: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  city: { type: String, required: true },
  address: { type: String, required: true },
  phone: { type: String, required: true },
})

const orderItemSchema = new Schema(
  {
    product: { type: String, required: true },
    name: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    services: [{ type: String, enum: SERVICES }],
    unitPrice: { type: Number, required: true },
    lineTotal: { type: Number, required: true },
  },
  { _id: false },
)

const statusEventSchema = new Schema(
  { status: { type: String, enum: ORDER_STATUSES, required: true }, at: { type: Date, default: Date.now } },
  { _id: false },
)

const orderSchema = new Schema(
  {
    orderNumber: { type: String, required: true, unique: true },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    store: {
      code: String,
      name: String,
      city: String,
      address: String,
      phone: String,
    },
    items: { type: [orderItemSchema], validate: (v) => v.length > 0 },
    totalItems: { type: Number, required: true },
    subTotal: { type: Number, required: true },
    pickupCharge: { type: Number, required: true },
    total: { type: Number, required: true },
    deliveryAddress: { type: String, required: true },
    status: { type: String, enum: ORDER_STATUSES, default: 'READY_TO_PICKUP' },
    history: [statusEventSchema],
  },
  { timestamps: true },
)

orderSchema.set('toJSON', {
  transform: (_doc, ret) => {
    ret.id = ret._id.toString()
    delete ret._id
    delete ret.__v
    delete ret.user
    return ret
  },
})

// Monotonic counter so order numbers are unique and readable (ORD-1001, ORD-1002, ...).
const counterSchema = new Schema({ _id: String, seq: { type: Number, default: 0 } })
const ORDER_NUMBER_START = 1000

export const User = model('User', userSchema)
export const Product = model('Product', productSchema)
export const Store = model('Store', storeSchema)
export const Order = model('Order', orderSchema)
export const Counter = model('Counter', counterSchema)

export async function nextOrderNumber() {
  const counter = await Counter.findByIdAndUpdate('order', { $inc: { seq: 1 } }, { new: true, upsert: true })
  return `ORD-${ORDER_NUMBER_START + counter.seq}`
}
