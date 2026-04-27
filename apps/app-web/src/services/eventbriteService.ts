import type { Event } from '../types'

export async function fetchEventbriteEvents(
  lat: number,
  lng: number,
  radiusKm: number,
): Promise<Event[]> {
  try {
    const res = await fetch(
      `/api/eventbrite/events?lat=${lat}&lng=${lng}&radius=${radiusKm}`,
    )
    if (!res.ok) return []
    const data = await res.json() as { events?: Event[] }
    return data.events ?? []
  } catch {
    return []
  }
}
