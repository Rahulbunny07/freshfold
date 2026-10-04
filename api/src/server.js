import mongoose from 'mongoose'
import { config } from './config.js'
import { createApp } from './app.js'
import { ensureCatalog } from './catalog.js'

await mongoose.connect(config.mongoUrl)
await ensureCatalog()

const server = createApp().listen(config.port, () => {
  console.log(`Laundry API listening on http://localhost:${config.port}`)
})

const shutdown = async () => {
  server.close()
  await mongoose.disconnect()
  process.exit(0)
}
process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
