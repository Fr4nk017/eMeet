import cors from 'cors'
import express from 'express'
import helmet from 'helmet'
import morgan from 'morgan'
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

app.use(helmet({ contentSecurityPolicy: false }))
app.use(cors(corsOptions))
app.options('*', cors(corsOptions))
app.use(express.json({ limit: '2mb' }))
app.use(morgan('dev'))

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'emeet-app-profile', timestamp: new Date().toISOString() })
})

app.get('/docs/spec', (_req, res) => {
  res.json(swaggerSpec)
})

app.get('/docs/swagger-init.js', (_req, res) => {
  res.setHeader('Content-Type', 'application/javascript')
  res.send("window.onload=()=>SwaggerUIBundle({url:'/docs/spec',dom_id:'#swagger-ui',presets:[SwaggerUIBundle.presets.apis,SwaggerUIBundle.SwaggerUIStandalonePreset],layout:'BaseLayout',deepLinking:true})")
})

app.get('/docs', (_req, res) => {
  res.setHeader('Content-Type', 'text/html')
  res.send(`<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>eMeet Profile API</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css">
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script src="/docs/swagger-init.js"></script>
</body>
</html>`)
})

app.use('/profile', profileRouter)

export default app
