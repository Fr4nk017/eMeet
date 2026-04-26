import { getRedisClient } from './client'

interface LikedEvent {
  id: string
  type: string
  lat: number
  lng: number
  distance: number
}

const LIKES_EXPIRY = 7 * 24 * 60 * 60 // 7 días

/**
 * Guardar un evento likado por un usuario en Redis
 */
export async function cacheLikedEvent(userId: string, event: LikedEvent) {
  try {
    const client = await getRedisClient()
    if (!client) return

    const key = `user:${userId}:likes`
    await client.lPush(key, JSON.stringify(event))
    await client.expire(key, LIKES_EXPIRY)
  } catch (err) {
    console.error('Error caching liked event:', err)
  }
}

/**
 * Obtener todos los eventos likados por un usuario
 */
export async function getCachedLikes(userId: string): Promise<LikedEvent[]> {
  try {
    const client = await getRedisClient()
    if (!client) return []

    const key = `user:${userId}:likes`
    const likes = await client.lRange(key, 0, -1)
    
    return likes
      .map(item => {
        try {
          return JSON.parse(item) as LikedEvent
        } catch {
          return null
        }
      })
      .filter((item): item is LikedEvent => item !== null)
  } catch (err) {
    console.error('Error getting cached likes:', err)
    return []
  }
}

/**
 * Calcular similitud entre dos eventos
 * Basado en: tipo de lugar, proximidad geográfica, distancia
 */
function calculateSimilarity(
  baseEvent: LikedEvent,
  candidateEvent: LikedEvent
): number {
  let score = 0

  // 1. Same type (40% del score)
  if (baseEvent.type === candidateEvent.type) {
    score += 40
  } else {
    score += 10 // Similar es mejor que nada
  }

  // 2. Proximidad geográfica (40%)
  const distance = calculateDistance(
    baseEvent.lat,
    baseEvent.lng,
    candidateEvent.lat,
    candidateEvent.lng
  )

  if (distance < 0.5) {
    score += 40 // Muy cercano
  } else if (distance < 2) {
    score += 25
  } else if (distance < 5) {
    score += 15
  } else {
    score += 5
  }

  // 3. Distancia similar desde usuario (20%)
  const distanceDiff = Math.abs(baseEvent.distance - candidateEvent.distance)
  if (distanceDiff < 0.5) {
    score += 20
  } else if (distanceDiff < 2) {
    score += 12
  } else if (distanceDiff < 5) {
    score += 7
  }

  return score
}

/**
 * Haversine formula: distancia entre dos coordenadas en km
 */
function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371 // Radio de la Tierra en km
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2)

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

/**
 * Generar recomendaciones basadas en likes anteriores
 */
export async function generateRecommendations(
  userId: string,
  availableEvents: LikedEvent[],
  limit: number = 5
): Promise<Array<LikedEvent & { similarity: number }>> {
  const cachedLikes = await getCachedLikes(userId)

  if (cachedLikes.length === 0) {
    // Sin datos, retornar eventos aleatorios
    return availableEvents
      .slice(0, limit)
      .map(e => ({ ...e, similarity: 0 }))
  }

  // Para cada evento disponible, calcular similitud promedio con los likes anteriores
  const scored = availableEvents
    .map(candidate => {
      const similarities = cachedLikes.map(liked =>
        calculateSimilarity(liked, candidate)
      )
      const avgSimilarity = similarities.reduce((a, b) => a + b, 0) / similarities.length

      return {
        ...candidate,
        similarity: avgSimilarity,
      }
    })
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit)

  return scored
}

/**
 * Limpiar cache de likes de un usuario (logout, etc)
 */
export async function clearUserLikesCache(userId: string) {
  try {
    const client = await getRedisClient()
    if (!client) return

    const key = `user:${userId}:likes`
    await client.del(key)
  } catch (err) {
    console.error('Error clearing user likes cache:', err)
  }
}
