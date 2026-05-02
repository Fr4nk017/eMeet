import cors from 'cors'
import express from 'express'
import helmet from 'helmet'
import morgan from 'morgan'
import { env } from './config/env.js'
import authRouter from './routes/auth.routes.js'

const app = express()

app.use(helmet())
app.use(
  cors({
    credentials: true,
    origin: (requestOrigin, callback) => {
      // Permite llamadas server-to-server (sin header Origin) y valida browser origins explícitos.
      if (!requestOrigin) {
        callback(null, true)
        return
      }

      if (env.FRONTEND_ORIGINS.includes(requestOrigin)) {
        callback(null, true)
        return
      }

      callback(new Error(`Origin no permitido por CORS: ${requestOrigin}`))
    },
  }),
)
app.use(express.json({ limit: '2mb' }))
app.use(morgan('dev'))

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'emeet-app-auth', timestamp: new Date().toISOString() })
})

app.use('/auth', authRouter)

export default app
