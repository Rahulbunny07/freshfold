import 'dotenv/config'

function required(name, fallback) {
  const value = process.env[name] ?? fallback
  if (value === undefined || value === '') throw new Error(`Missing required env var ${name}`)
  return value
}

export const config = {
  port: Number(process.env.API_PORT ?? 4000),
  mongoUrl: required('MONGODB_URL', 'mongodb://127.0.0.1:27017/laundry_dev'),
  jwtSecret: required('JWT_SECRET', process.env.NODE_ENV === 'production' ? undefined : 'dev-only-secret-change-me'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:5175',
  pickupCharge: 50,
  // Lets the UI move an order through its stages, so the full flow can be demoed without a store dashboard.
  demoMode: (process.env.DEMO_MODE ?? (process.env.NODE_ENV === 'production' ? 'false' : 'true')) === 'true',
}
