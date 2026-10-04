import express from 'express'
import cors from 'cors'
import { config } from './config.js'
import { router } from './routes.js'
import { errorHandler, notFound } from './errors.js'

export function createApp() {
  const app = express()
  app.disable('x-powered-by')
  app.use(cors({ origin: config.corsOrigin.split(',') }))
  app.use(express.json({ limit: '100kb' }))

  app.get('/api/health', (_req, res) => res.json({ ok: true }))
  app.use('/api', router)

  app.use(notFound)
  app.use(errorHandler)
  return app
}
