// Resets the product catalog and stores to the defaults. Does not touch users or orders.
import mongoose from 'mongoose'
import { config } from './config.js'
import { Product, Store } from './models.js'
import { ensureCatalog } from './catalog.js'

await mongoose.connect(config.mongoUrl)
await Product.deleteMany({})
await Store.deleteMany({})
await ensureCatalog()
console.log(`Seeded ${await Product.countDocuments()} products and ${await Store.countDocuments()} stores`)
await mongoose.disconnect()
