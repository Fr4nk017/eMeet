import cors from 'cors'
import express from 'express'
import helmet from 'helmet'
import morgan from 'morgan'
import swaggerUi from 'swagger-ui-express'
import { env } from './config/env.js'
import chatRouter from './routes/chat.routes.js'
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
  methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
}

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
      },
    },
  }),
)
app.use(cors(corsOptions))
app.options('*', cors(corsOptions))
app.use(express.json({ limit: '2mb' }))
app.use(morgan('dev'))

/**
 * @openapi
 * /health:
 *   get:
 *     tags: [Sistema]
 *     summary: Health check
 *     description: Verifica que el servicio está activo. No requiere autenticación.
 *     security: []
 *     responses:
 *       200:
 *         description: Servicio operativo
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                   example: true
 *                 service:
 *                   type: string
 *                   example: emeet-app-chat
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 */
app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'emeet-app-chat', timestamp: new Date().toISOString() })
})

app.use(
  '/api-docs',
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, {
    customSiteTitle: 'eMeet Chat API Docs',
    swaggerOptions: { persistAuthorization: true },
  }),
)

app.get('/api-docs.json', (_req, res) => {
  res.setHeader('Content-Type', 'application/json')
  res.send(swaggerSpec)
})

app.use('/chat', chatRouter)

export default app
