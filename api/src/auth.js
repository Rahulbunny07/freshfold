import jwt from 'jsonwebtoken'
import { config } from './config.js'
import { HttpError } from './errors.js'

export function signToken(userId) {
  return jwt.sign({ sub: userId }, config.jwtSecret, { expiresIn: config.jwtExpiresIn })
}

/** Requires a valid `Authorization: Bearer <token>` header and sets req.userId. */
export function requireAuth(req, _res, next) {
  const header = req.headers.authorization ?? ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null
  if (!token) return next(new HttpError(401, 'Please sign in to continue'))
  try {
    const payload = jwt.verify(token, config.jwtSecret)
    req.userId = payload.sub
    next()
  } catch {
    next(new HttpError(401, 'Your session has expired. Please sign in again'))
  }
}
