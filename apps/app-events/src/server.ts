import app from './app'
import { env } from './config/env'

app.listen(env.PORT, () => {
  console.log(`emeet-app-events escuchando en http://localhost:${env.PORT}`)
})
