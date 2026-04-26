import cors from 'cors'
import express from 'express'
import helmet from 'helmet'
import morgan from 'morgan'
import { env } from './config/env'
import chatRouter from './routes/chat.routes'

const app = express()

app.use(helmet())
app.use(cors({ origin: env.FRONTEND_ORIGIN, credentials: true, allowedHeaders: ['Content-Type', 'Authorization'] }))
app.use(express.json({ limit: '2mb' }))
app.use(morgan('dev'))

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'emeet-app-chat', timestamp: new Date().toISOString() })
})

app.use('/chat', chatRouter)

export default app
