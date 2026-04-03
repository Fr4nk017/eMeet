import type { ScrapedPlace, PlaceType } from '../types'

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

// ─── Mapeo de PlaceType a includedTypes de la nueva Place API ───────────────

const PLACE_INCLUDED_TYPES: Record<PlaceType, string> = {
  restaurant:   'restaurant',
  bar:          'bar',
  night_club:   'night_club',
  cafe:         'cafe',
  liquor_store: 'liquor_store',
  food:         'food',
}

// ─── Helpers de conversión ───────────────────────────────────────────────────

/** Convierte un LatLngBounds a CircleLiteral (centro + radio) para Place.searchNearby.
 *  Calcula el radio como la distancia haversine desde el centro hasta la esquina NE. */
function boundsToCircle(bounds: google.maps.LatLngBounds): google.maps.CircleLiteral {
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

/** Convierte el enum PriceLevel de la nueva API a número (0-4). */
function priceLevelToNumber(
  level: google.maps.places.PriceLevel | null | undefined,
): number | null {
  if (level == null) return null
  const map: Record<string, number> = {
    FREE: 0, INEXPENSIVE: 1, MODERATE: 2, EXPENSIVE: 3, VERY_EXPENSIVE: 4,
  }
  return map[level as string] ?? null
}

// ─── API pública ─────────────────────────────────────────────────────────────

/**
 * Busca lugares cercanos usando la nueva Place.searchNearby API.
 * Lanza una búsqueda por cada tipo en paralelo, deduplica resultados por nombre.
 *
 * REEMPLAZA: PlacesService.nearbySearch (legacy, deprecated mar-2025)
 */
export async function searchNearbyPlaces(
  bounds: google.maps.LatLngBounds,
  types: PlaceType[],
  maxPerType = 8,
): Promise<ScrapedPlace[]> {
  const searches = types.map((type) =>
    google.maps.places.Place.searchNearby({
      fields: [
        'id', 'displayName', 'location', 'rating', 'userRatingCount',
        'regularOpeningHours', 'priceLevel', 'formattedAddress', 'types', 'photos',
      ],
      locationRestriction: boundsToCircle(bounds),
      includedTypes: [PLACE_INCLUDED_TYPES[type]],
      maxResultCount: maxPerType,
    })
      .then(({ places }) => ({ type, places }))
      .catch(() => ({ type, places: [] as google.maps.places.Place[] }))
  )

  const settled = await Promise.all(searches)

  const all: ScrapedPlace[] = settled.flatMap(({ type, places }) =>
    places
      .filter((p) => p.location)
      .map<ScrapedPlace>((p) => ({
        placeId:      p.id,
        name:         p.displayName ?? 'Sin nombre',
        address:      p.formattedAddress ?? '',
        type,
        category:     PLACE_TYPE_CONFIG[type].category,
        rating:       p.rating ?? 0,
        totalRatings: p.userRatingCount ?? 0,
        priceLevel:   priceLevelToNumber(p.priceLevel),
        isOpen:       null, // Place.isOpen() es async; se enriquece en fetchPlaceDetails
        position: {
          lat: p.location!.lat(),
          lng: p.location!.lng(),
        },
        photoUrl: p.photos?.length
          ? p.photos[0].getURI({ maxWidth: 800 })
          : undefined,
        website:      null,
        phone:        null,
        openingHours: null,
      }))
  )

  // Deduplicar por nombre (insensible a mayúsculas)
  const seen = new Set<string>()
  return all.filter(({ name }) => {
    const key = name.toLowerCase()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

/**
 * Obtiene detalles enriquecidos de un lugar: foto, horario, web, teléfono.
 * Retorna un Partial<ScrapedPlace> para hacer merge con el objeto existente.
 *
 * Si la petición falla, retorna { photoUrl: null } como señal de que
 * el lugar ya fue consultado y no tiene datos de foto disponibles.
 *
 * REEMPLAZA: PlacesService.getDetails (legacy, deprecated mar-2025)
 */
export async function fetchPlaceDetails(
  placeId: string,
): Promise<Partial<ScrapedPlace>> {
  try {
    const place = new google.maps.places.Place({ id: placeId })
    await place.fetchFields({
      fields: ['photos', 'regularOpeningHours', 'rating', 'websiteURI', 'nationalPhoneNumber'],
    })

    const photoUrl = place.photos?.length
      ? place.photos[0].getURI({ maxWidth: 400 })
      : null

    // isOpen() es beta-channel pero puede no fallar en weekly → envolvemos en catch
    const isOpen = await place.isOpen().catch(() => null) ?? null

    return {
      photoUrl,
      isOpen,
      website:      place.websiteURI ?? null,
      phone:        place.nationalPhoneNumber ?? null,
      openingHours: place.regularOpeningHours?.weekdayDescriptions ?? null,
      rating:       place.rating ?? undefined,
    }
  } catch {
    return { photoUrl: null }
  }
}
