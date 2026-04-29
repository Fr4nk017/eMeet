import type { Event } from '../types'

export type FeedResult = { events: Event[]; configured: boolean; error?: string }

export async function fetchTicketmasterEvents(
  lat: number,
  lng: number,
  radiusKm: number,
): Promise<FeedResult> {
  try {
    const res = await fetch(`/api/ticketmaster/events?lat=${lat}&lng=${lng}&radius=${radiusKm}`)
    if (!res.ok) return { events: [], configured: true, error: 'Error al contactar Ticketmaster' }
    const data = await res.json() as { events?: Event[]; configured?: boolean }
    if (data.configured === false) return { events: [], configured: false }
    return { events: data.events ?? [], configured: true }
  } catch {
    return { events: [], configured: true, error: 'No se pudo conectar con Ticketmaster' }
  }
}
