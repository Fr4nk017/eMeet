import cors from 'cors'
import express from 'express'
import helmet from 'helmet'
import morgan from 'morgan'
import swaggerUi from 'swagger-ui-express'
import { env } from './config/env.js'
import profileRouter from './routes/profile.routes.js'
import { swaggerSpec } from './swagger.js'

const app = express()

const allowedOrigins = new Set([
  ...env.FRONTEND_ORIGINS,
  'https://e-meet-app-web.vercel.app',
  'http://localhost:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3001',
])

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true)
    if (allowedOrigins.has(origin)) return callback(null, true)
    return callback(new Error(`CORS origin not allowed: ${origin}`))
  },
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization'],
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
}

app.use(helmet())
app.use(cors(corsOptions))
app.options('*', cors(corsOptions))
app.use(express.json({ limit: '2mb' }))
app.use(morgan('dev'))

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'emeet-app-profile', timestamp: new Date().toISOString() })
})

app.use('/docs', ((_req: express.Request, res: express.Response, next: express.NextFunction) => {
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self'")
  next()
}) as express.RequestHandler, swaggerUi.serve, swaggerUi.setup(swaggerSpec))

app.use('/profile', profileRouter)

export default app
