import { createClient } from 'redis'

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379'
const redisDisabledByEnv = process.env.REDIS_DISABLED === 'true'

let client: ReturnType<typeof createClient> | null = null
let redisUnavailable = false

export async function getRedisClient() {
  if (redisDisabledByEnv || redisUnavailable) {
    return null
  }

  if (!client) {
    client = createClient({
      url: redisUrl,
      socket: {
        connectTimeout: 3000,
        reconnectStrategy: () => false,
      },
    })
    
    client.on('error', (err) => {
      console.error('Redis connection error:', err)
    })

    client.on('connect', () => {
      console.log('Redis connected')
    })

    try {
      await client.connect()
    } catch (err) {
      console.warn('Redis unavailable, continuing without cache.')
      console.error('Failed to connect to Redis:', err)
      redisUnavailable = true

      try {
        client.removeAllListeners()
        client.disconnect()
      } catch {
        // No-op: el cliente puede no estar conectado todavía.
      }

      // Fallback: continúa sin Redis
      client = null
    }
  }

  return client
}

export async function closeRedisClient() {
  if (client) {
    await client.quit()
    client = null
  }
}
