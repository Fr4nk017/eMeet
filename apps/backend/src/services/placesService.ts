import 'dotenv/config'

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY || ''

interface LatLng {
  lat: number
  lng: number
}

interface Place {
  place_id: string
  name: string
  geometry: {
    location: LatLng
  }
  types: string[]
  rating?: number
  user_ratings_total?: number
  formatted_address?: string
  photos?: Array<{ photo_reference: string }>
  business_status?: string
}

interface NearbySearchParams {
  location: LatLng
  radius: number
  type: string
  keyword?: string
}

/**
 * Search for nearby places using Google Places Nearby Search API (legacy but reliable)
 */
export async function searchNearbyPlaces(
  location: LatLng,
  radius: number,
  type: string,
): Promise<Place[]> {
  if (!GOOGLE_MAPS_API_KEY) {
    throw new Error('GOOGLE_MAPS_API_KEY not configured')
  }

  const url = new URL('https://maps.googleapis.com/maps/api/place/nearbysearch/json')
  url.searchParams.append('location', `${location.lat},${location.lng}`)
  url.searchParams.append('radius', String(radius))
  url.searchParams.append('type', type)
  url.searchParams.append('key', GOOGLE_MAPS_API_KEY)

  try {
    const response = await fetch(url.toString())
    const data = await response.json()

    if (data.error_message) {
      throw new Error(`Google Places API error: ${data.error_message}`)
    }

    return data.results || []
  } catch (error) {
    console.error('Error searching nearby places:', error)
    throw error
  }
}

/**
 * Get detailed information about a place
 */
export async function getPlaceDetails(placeId: string) {
  if (!GOOGLE_MAPS_API_KEY) {
    throw new Error('GOOGLE_MAPS_API_KEY not configured')
  }

  const url = new URL('https://maps.googleapis.com/maps/api/place/details/json')
  url.searchParams.append('place_id', placeId)
  url.searchParams.append('fields', [
    'formatted_address',
    'formatted_phone_number',
    'international_phone_number',
    'name',
    'opening_hours',
    'photos',
    'rating',
    'types',
    'url',
    'user_ratings_total',
    'website',
  ].join(','))
  url.searchParams.append('key', GOOGLE_MAPS_API_KEY)

  try {
    const response = await fetch(url.toString())
    const data = await response.json()

    if (data.error_message) {
      throw new Error(`Google Places API error: ${data.error_message}`)
    }

    return data.result || null
  } catch (error) {
    console.error('Error fetching place details:', error)
    throw error
  }
}

/**
 * Get photo URL for a place using photo reference
 */
export function getPlacePhotoUrl(photoReference: string, maxWidth = 400): string {
  if (!GOOGLE_MAPS_API_KEY) {
    throw new Error('GOOGLE_MAPS_API_KEY not configured')
  }

  const url = new URL('https://maps.googleapis.com/maps/api/place/photo')
  url.searchParams.append('maxwidth', String(maxWidth))
  url.searchParams.append('photo_reference', photoReference)
  url.searchParams.append('key', GOOGLE_MAPS_API_KEY)

  return url.toString()
}
