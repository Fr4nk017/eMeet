import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

type GeocodeResponse = {
  lat: number | null
  lng: number | null
  address?: string | null
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const address = searchParams.get('address')?.trim()

  if (!address) {
    return NextResponse.json<GeocodeResponse>({ lat: null, lng: null, address: null })
  }

  if (API_KEY) {
    try {
      const url = new URL('https://maps.googleapis.com/maps/api/geocode/json')
      url.searchParams.set('address', address)
      url.searchParams.set('key', API_KEY)
      url.searchParams.set('language', 'es')
      url.searchParams.set('region', 'cl')

      const res = await fetch(url.toString(), { cache: 'no-store' })
      const data = await res.json() as {
        status: string
        results?: Array<{
          formatted_address?: string
          geometry: { location: { lat: number; lng: number } }
        }>
      }

      if (data.status === 'OK' && data.results?.length) {
        const { lat, lng } = data.results[0].geometry.location
        return NextResponse.json<GeocodeResponse>({
          lat,
          lng,
          address: data.results[0].formatted_address ?? address,
        })
      }
    } catch {
      // Fallback a Nominatim debajo.
    }
  }

  try {
    const fallbackUrl = new URL('https://nominatim.openstreetmap.org/search')
    fallbackUrl.searchParams.set('q', address)
    fallbackUrl.searchParams.set('format', 'jsonv2')
    fallbackUrl.searchParams.set('limit', '1')
    fallbackUrl.searchParams.set('accept-language', 'es')
    fallbackUrl.searchParams.set('countrycodes', 'cl')

    const res = await fetch(fallbackUrl.toString(), {
      cache: 'no-store',
      headers: {
        'User-Agent': 'eMeet/1.0 (local development geocode fallback)',
      },
    })

    const data = await res.json() as Array<{
      lat: string
      lon: string
      display_name?: string
    }>

    if (!Array.isArray(data) || data.length === 0) {
      return NextResponse.json<GeocodeResponse>({ lat: null, lng: null, address: null })
    }

    const lat = Number(data[0].lat)
    const lng = Number(data[0].lon)

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return NextResponse.json<GeocodeResponse>({ lat: null, lng: null, address: null })
    }

    return NextResponse.json<GeocodeResponse>({
      lat,
      lng,
      address: data[0].display_name ?? address,
    })
  } catch {
    return NextResponse.json<GeocodeResponse>({ lat: null, lng: null, address: null })
  }
}
