import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import mongoose from 'mongoose'
import request from 'supertest'

process.env.MONGODB_URL = process.env.TEST_MONGODB_URL ?? 'mongodb://127.0.0.1:27017/laundry_test'
process.env.DEMO_MODE = 'true'

const { createApp } = await import('../src/app.js')
const { ensureCatalog } = await import('../src/catalog.js')
const { config } = await import('../src/config.js')

const app = createApp()

const alice = {
  name: 'Alice Doe',
  email: 'alice@example.com',
  phone: '9876500001',
  password: 'password123',
  address: { line: '12 MG Road, Ashok Nagar', district: 'Bangalore Urban', state: 'Karnataka', pincode: '560001' },
}
const bob = { ...alice, name: 'Bob Roe', email: 'bob@example.com', phone: '9876500002' }

before(async () => {
  await mongoose.connect(config.mongoUrl)
  await mongoose.connection.dropDatabase()
  await ensureCatalog()
})

after(async () => {
  await mongoose.connection.dropDatabase()
  await mongoose.disconnect()
})

const auth = (token) => ({ Authorization: `Bearer ${token}` })
let aliceToken
let bobToken

test('registers a user and never returns the password hash', async () => {
  const res = await request(app).post('/api/auth/register').send(alice).expect(201)
  assert.ok(res.body.token)
  assert.equal(res.body.user.email, alice.email)
  assert.equal(res.body.user.passwordHash, undefined)
  aliceToken = res.body.token
  bobToken = (await request(app).post('/api/auth/register').send(bob).expect(201)).body.token
})

test('rejects duplicate email with 409 and invalid input with field errors', async () => {
  await request(app).post('/api/auth/register').send(alice).expect(409)
  const res = await request(app).post('/api/auth/register').send({ ...alice, email: 'bad', phone: '123' }).expect(400)
  const fields = res.body.details.map((d) => d.field)
  assert.ok(fields.includes('email'))
  assert.ok(fields.includes('phone'))
})

test('logs in with email or phone; wrong password gives a generic error', async () => {
  await request(app).post('/api/auth/login').send({ identifier: 'ALICE@example.com', password: alice.password }).expect(200)
  await request(app).post('/api/auth/login').send({ identifier: alice.phone, password: alice.password }).expect(200)
  const res = await request(app).post('/api/auth/login').send({ identifier: alice.email, password: 'nope' }).expect(401)
  assert.match(res.body.error, /Invalid/)
})

test('protected routes reject missing or forged tokens', async () => {
  await request(app).get('/api/orders').expect(401)
  await request(app).get('/api/orders').set(auth('not-a-token')).expect(401)
})

test('prices orders on the server and ignores client-sent amounts', async () => {
  const res = await request(app)
    .post('/api/orders')
    .set(auth(aliceToken))
    .send({
      storeCode: 'JPN',
      total: 1, // ignored
      items: [
        { product: 'shirts', quantity: 3, services: ['wash', 'iron'] }, // (20 + 15) * 3 = 105
        { product: 'jeans', quantity: 2, services: ['wash'] }, // 30 * 2 = 60
      ],
    })
    .expect(201)
  const order = res.body.order
  assert.equal(order.orderNumber, 'ORD-1001')
  assert.equal(order.subTotal, 165)
  assert.equal(order.pickupCharge, 50)
  assert.equal(order.total, 215)
  assert.equal(order.totalItems, 5)
  assert.equal(order.status, 'READY_TO_PICKUP')
})

test('order numbers are unique and sequential', async () => {
  const body = { storeCode: 'IND', items: [{ product: 'boxers', quantity: 1, services: ['wash'] }] }
  const [a, b] = await Promise.all([
    request(app).post('/api/orders').set(auth(aliceToken)).send(body),
    request(app).post('/api/orders').set(auth(aliceToken)).send(body),
  ])
  assert.notEqual(a.body.order.orderNumber, b.body.order.orderNumber)
})

test('users cannot see or cancel each other’s orders', async () => {
  const { orders } = (await request(app).get('/api/orders').set(auth(aliceToken)).expect(200)).body
  const orderNumber = orders[0].orderNumber
  await request(app).get(`/api/orders/${orderNumber}`).set(auth(bobToken)).expect(404)
  await request(app).post(`/api/orders/${orderNumber}/cancel`).set(auth(bobToken)).expect(404)
  assert.equal((await request(app).get('/api/orders').set(auth(bobToken))).body.orders.length, 0)
})

test('orders can be cancelled only before pickup', async () => {
  const { orders } = (await request(app).get('/api/orders').set(auth(aliceToken))).body
  const [first, second] = orders
  const cancelled = await request(app).post(`/api/orders/${first.orderNumber}/cancel`).set(auth(aliceToken)).expect(200)
  assert.equal(cancelled.body.order.status, 'CANCELLED')

  await request(app).post(`/api/orders/${second.orderNumber}/advance`).set(auth(aliceToken)).expect(200)
  await request(app).post(`/api/orders/${second.orderNumber}/cancel`).set(auth(aliceToken)).expect(409)
})

test('search and status filters narrow the order list; stats add up', async () => {
  const all = (await request(app).get('/api/orders').set(auth(aliceToken))).body.orders
  const target = all[all.length - 1].orderNumber
  const found = (await request(app).get(`/api/orders?q=${target.slice(-4)}`).set(auth(aliceToken))).body.orders
  assert.ok(found.some((o) => o.orderNumber === target))
  const cancelled = (await request(app).get('/api/orders?status=cancelled').set(auth(aliceToken))).body.orders
  assert.ok(cancelled.every((o) => o.status === 'CANCELLED'))

  const stats = (await request(app).get('/api/orders/stats').set(auth(aliceToken))).body
  assert.equal(stats.total, all.length)
  assert.equal(stats.spent, all.filter((o) => o.status !== 'CANCELLED').reduce((s, o) => s + o.total, 0))
})

test('rejects unknown products and empty orders', async () => {
  await request(app).post('/api/orders').set(auth(aliceToken)).send({ storeCode: 'JPN', items: [] }).expect(400)
  await request(app)
    .post('/api/orders')
    .set(auth(aliceToken))
    .send({ storeCode: 'JPN', items: [{ product: 'spacesuit', quantity: 1, services: ['wash'] }] })
    .expect(400)
})
