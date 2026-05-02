import cors from 'cors'
import express from 'express'
import helmet from 'helmet'
import morgan from 'morgan'
import { env } from './config/env.js'
import authRouter from './routes/auth.routes.js'

const app = express()

const allowedOrigins = new Set([
  ...env.FRONTEND_ORIGINS,
  'http://localhost:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3001',
])

app.use(helmet())
app.use(
  cors({
    credentials: true,
    origin: (requestOrigin, callback) => {
      // Permite llamadas server-to-server (sin header Origin) y valida browser origins explícitos.
      if (!requestOrigin) return callback(null, true)
      if (allowedOrigins.has(requestOrigin)) return callback(null, true)
      return callback(new Error(`Origin no permitido por CORS: ${requestOrigin}`))
    },
    allowedHeaders: ['Content-Type', 'Authorization'],
    methods: ['GET', 'POST', 'OPTIONS'],
  }),
)
app.use(express.json({ limit: '2mb' }))
app.use(morgan('dev'))

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'emeet-app-auth', timestamp: new Date().toISOString() })
})

app.use('/auth', authRouter)

export default app
