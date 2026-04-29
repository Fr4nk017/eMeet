import cors from 'cors'
import express from 'express'
import helmet from 'helmet'
import morgan from 'morgan'
import { env } from './config/env'
import adminRouter from './routes/admin.routes'

const app = express()

app.use(helmet())
app.use(cors({ origin: env.FRONTEND_ORIGIN, credentials: true }))
app.use(express.json({ limit: '2mb' }))
app.use(morgan('dev'))

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'emeet-app-admin', timestamp: new Date().toISOString() })
})

app.use('/admin', adminRouter)

export default app
