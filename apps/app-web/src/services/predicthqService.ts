import type { Event } from '../types'
import type { FeedResult } from './ticketmasterService'

export async function fetchPredictHQEvents(
  lat: number,
  lng: number,
  radiusKm: number,
): Promise<FeedResult> {
  try {
    const res = await fetch(`/api/predicthq/events?lat=${lat}&lng=${lng}&radius=${radiusKm}`)
    if (!res.ok) return { events: [], configured: true, error: 'Error al contactar PredictHQ' }
    const data = await res.json() as { events?: Event[]; configured?: boolean }
    if (data.configured === false) return { events: [], configured: false }
    return { events: data.events ?? [], configured: true }
  } catch {
    return { events: [], configured: true, error: 'No se pudo conectar con PredictHQ' }
  }
}
