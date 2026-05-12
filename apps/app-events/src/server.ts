import app from './app.js'
import { env } from './config/env.js'
import { createServiceRoleClient } from '../../../packages/shared/src/lib/supabase.js'

app.listen(env.PORT, () => {
  console.log(`emeet-app-events escuchando en http://localhost:${env.PORT}`)
})

// En producción lo maneja el cron de Vercel (vercel.json).
// En desarrollo, simular el mismo comportamiento cada hora.
if (process.env.NODE_ENV !== 'production') {
  const cleanupExpired = async () => {
    try {
      const { count, error } = await createServiceRoleClient()
        .from('locatario_events')
        .delete({ count: 'exact' })
        .lt('event_date', new Date().toISOString())
      if (error) throw error
      if ((count ?? 0) > 0) {
        console.log(`[dev-cleanup] ${count} evento(s) expirado(s) eliminado(s)`)
      }
    } catch (err) {
      console.error('[dev-cleanup] error:', err)
    }
  }

  // Limpieza al arrancar y luego cada hora
  cleanupExpired()
  setInterval(cleanupExpired, 60 * 60 * 1000)
}
