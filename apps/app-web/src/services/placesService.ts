import type { ScrapedPlace, PlaceType } from '../types'

const PLACES_URL = (process.env.NEXT_PUBLIC_PLACES_URL ?? '').trim().replace(/\/$/, '')

// ─── Configuración visual por tipo de lugar ──────────────────────────────────

export const PLACE_TYPE_CONFIG: Record<
  PlaceType,
  { category: string; emoji: string; color: string }
> = {
  restaurant:   { category: 'Restaurante', emoji: '🍽️', color: '#F97316' },
  cafe:         { category: 'Café',        emoji: '☕',  color: '#A1662F' },
  bar:          { category: 'Bar',         emoji: '🍺',  color: '#F59E0B' },
  night_club:   { category: 'Discoteca',   emoji: '🎉',  color: '#EC4899' },
  liquor_store: { category: 'Licorería',   emoji: '🍷',  color: '#8B5CF6' },
  food:         { category: 'Comida',      emoji: '🍴',  color: '#10B981' },
}

// ─── Mapeo de PlaceType a Google Places type ────────────────────────────────

const PLACE_TYPE_MAPPING: Record<PlaceType, string> = {
  restaurant:   'restaurant',
  bar:          'bar',
  night_club:   'night_club',
  cafe:         'cafe',
  liquor_store: 'liquor_store',
  food:         'food',
}

async function parseErrorBody(response: Response): Promise<string> {
  const contentType = response.headers.get('content-type') ?? ''
  if (contentType.includes('application/json')) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null
    return body?.error ?? `HTTP ${response.status}`
  }
  return response.text().catch(() => `HTTP ${response.status}`)
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function boundsToCircle(
  bounds: google.maps.LatLngBounds,
): { center: { lat: number; lng: number }; radius: number } {
  const center = bounds.getCenter()
  const ne = bounds.getNorthEast()
  const R = 6371000 // Radio de la Tierra en metros
  const lat1 = center.lat() * (Math.PI / 180)
  const lat2 = ne.lat() * (Math.PI / 180)
  const dLat = lat2 - lat1
  const dLng = (ne.lng() - center.lng()) * (Math.PI / 180)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  const radius = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return {
    center: { lat: center.lat(), lng: center.lng() },
    radius: Math.max(500, radius),
  }
}

// ─── API pública (ahora llamando al backend) ─────────────────────────────────

/**
 * Busca lugares cercanos usando el backend como intermediario
 * El backend llama a Google Places API y retorna los resultados
 */
export async function searchNearbyPlaces(
  bounds: google.maps.LatLngBounds,
  types: PlaceType[],
  maxPerType = 8,
): Promise<ScrapedPlace[]> {
  if (!PLACES_URL) {
    throw new Error('NEXT_PUBLIC_PLACES_URL no está configurada')
  }

  try {
    const { center, radius } = boundsToCircle(bounds)
    const allPlaces: ScrapedPlace[] = []
    const seen = new Set<string>()

    // Buscar cada tipo en paralelo
    const searches = types.map((type) =>
      fetch(`${PLACES_URL}/places/search-nearby`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location: center,
          radius,
          type: PLACE_TYPE_MAPPING[type],
        }),
      })
        .then(async (res) => {
          if (!res.ok) {
            const reason = await parseErrorBody(res)
            throw new Error(`search-nearby ${type} falló (${res.status}): ${reason}`)
          }
          return res.json()
        })
        .catch((err: unknown) => {
          const message = err instanceof Error ? err.message : String(err)
          console.error(`Error searching ${type}: ${message}`)
          return { places: [] }
        }),
    )

    const results = await Promise.all(searches)

    // Procesar y deduplicar resultados
    results.forEach(({ places = [] }, index) => {
      const placeType = types[index]
      places.forEach((place: any) => {
        const name = place.name || 'Sin nombre'
        const nameKey = name.toLowerCase()

        if (seen.has(nameKey)) return
        seen.add(nameKey)

        const lat = place.geometry?.location?.lat
        const lng = place.geometry?.location?.lng

        if (typeof lat !== 'number' || typeof lng !== 'number') return

        allPlaces.push({
          placeId: place.place_id || '',
          name,
          address: place.formatted_address || '',
          type: placeType,
          category: PLACE_TYPE_CONFIG[placeType].category,
          rating: place.rating || 0,
          totalRatings: place.user_ratings_total || 0,
          priceLevel: null,
          isOpen: null,
          position: { lat, lng },
          photoUrl: place.photos?.[0]?.photo_reference
            ? `${PLACES_URL}/places/photo?photoReference=${encodeURIComponent(place.photos[0].photo_reference)}&maxWidth=800`
            : undefined,
          website: undefined,
          phone: undefined,
          openingHours: undefined,
        })
      })
    })

    return allPlaces.slice(0, types.length * maxPerType)
  } catch (error) {
    console.error('Error in searchNearbyPlaces:', error)
    return []
  }
}

/**
 * Obtiene detalles enriquecidos de un lugar desde el backend
 */
export async function fetchPlaceDetails(placeId: string): Promise<Partial<ScrapedPlace>> {
  if (!PLACES_URL) {
    throw new Error('NEXT_PUBLIC_PLACES_URL no está configurada')
  }

  try {
    const response = await fetch(`${PLACES_URL}/places/${placeId}/details`)
    if (!response.ok) {
      const reason = await parseErrorBody(response)
      throw new Error(`details ${placeId} falló (${response.status}): ${reason}`)
    }
    const { details } = await response.json()

    if (!details) {
      return { photoUrl: null, website: null, phone: null, openingHours: null }
    }

    return {
      photoUrl: details.photos?.[0]?.photo_reference
        ? `${PLACES_URL}/places/photo?photoReference=${details.photos[0].photo_reference}&maxWidth=400`
        : null,
      website: details.website || null,
      phone: details.formatted_phone_number || details.international_phone_number || null,
      openingHours: details.opening_hours?.weekday_text || null,
      rating: details.rating || undefined,
    }
  } catch (error) {
    console.error('Error in fetchPlaceDetails:', error)
    return { photoUrl: null, website: null, phone: null, openingHours: null }
  }
}
