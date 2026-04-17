import type { ScrapedPlace, PlaceType } from '../types'

const BACKEND_URL = (process.env.NEXT_PUBLIC_BACKEND_URL ?? '').trim().replace(/\/$/, '')

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

function buildPhotoProxyUrl(photoReference: string, maxWidth: number) {
  const params = new URLSearchParams({
    photoReference,
    maxWidth: String(maxWidth),
  })
  return `${BACKEND_URL}/places/photo?${params.toString()}`
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
  if (!BACKEND_URL) {
    throw new Error('NEXT_PUBLIC_BACKEND_URL no está configurada')
  }

  try {
    const { center, radius } = boundsToCircle(bounds)
    const allPlaces: ScrapedPlace[] = []
    const seen = new Set<string>()

    // Buscar cada tipo en paralelo
    const searches = types.map((type) =>
      fetch(`${BACKEND_URL}/places/search-nearby`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location: center,
          radius,
          type: PLACE_TYPE_MAPPING[type],
        }),
      })
        .then((res) => res.json())
        .catch((err) => {
          console.error(`Error searching ${type}:`, err)
          return { places: [] }
        }),
    )

    const results = await Promise.all(searches)

    // Procesar y deduplicar resultados
    results.forEach(({ places = [] }) => {
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
          type: types[0], // simplificado para esta versión
          category: PLACE_TYPE_CONFIG[types[0]].category,
          rating: place.rating || 0,
          totalRatings: place.user_ratings_total || 0,
          priceLevel: null,
          isOpen: null,
          position: { lat, lng },
          photoUrl: place.photos?.[0]?.photo_reference
            ? buildPhotoProxyUrl(place.photos[0].photo_reference, 800)
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
  if (!BACKEND_URL) {
    throw new Error('NEXT_PUBLIC_BACKEND_URL no está configurada')
  }

  try {
    const response = await fetch(`${BACKEND_URL}/places/${placeId}/details`)
    const { details } = await response.json()

    if (!details) {
      return { photoUrl: null, website: null, phone: null, openingHours: null }
    }

    return {
      photoUrl: details.photos?.[0]?.photo_reference
        ? buildPhotoProxyUrl(details.photos[0].photo_reference, 400)
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
