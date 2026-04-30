import cors from 'cors'
import express from 'express'
import helmet from 'helmet'
import morgan from 'morgan'
import { env } from './config/env'
import placesRouter from './routes/places.routes'

const app = express()

const allowedOrigins = new Set([
  ...env.FRONTEND_ORIGINS,
  'http://localhost:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3001',
])

app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: false,
  strictTransportSecurity: false,
}))
app.use(
  cors({
    origin: (origin, callback) => {
      // Permite requests sin Origin (curl, health checks, server-to-server)
      if (!origin) return callback(null, true)
      if (allowedOrigins.has(origin)) return callback(null, true)
      return callback(new Error(`CORS origin not allowed: ${origin}`))
    },
    credentials: true,
    allowedHeaders: ['Content-Type'],
  }),
)
app.use(express.json({ limit: '2mb' }))
app.use(morgan('dev'))

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'emeet-app-places', timestamp: new Date().toISOString() })
})

app.use('/places', placesRouter)

export default app
