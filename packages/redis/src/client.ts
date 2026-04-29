import { createClient } from 'redis'

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379'

let client: ReturnType<typeof createClient> | null = null

export async function getRedisClient() {
  if (!client) {
    client = createClient({ url: redisUrl })
    
    client.on('error', (err) => {
      console.error('Redis connection error:', err)
    })

    client.on('connect', () => {
      console.log('Redis connected')
    })

    try {
      await client.connect()
    } catch (err) {
      console.error('Failed to connect to Redis:', err)
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
