import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const address = searchParams.get('address')?.trim()

  if (!address || !API_KEY) {
    return NextResponse.json({ lat: null, lng: null })
  }

  try {
    const url = new URL('https://maps.googleapis.com/maps/api/geocode/json')
    url.searchParams.set('address', address)
    url.searchParams.set('key', API_KEY)
    url.searchParams.set('language', 'es')
    url.searchParams.set('region', 'cl')

    const res = await fetch(url.toString(), { next: { revalidate: 3600 } })
    const data = await res.json() as {
      status: string
      results?: Array<{ geometry: { location: { lat: number; lng: number } } }>
    }

    if (data.status !== 'OK' || !data.results?.length) {
      return NextResponse.json({ lat: null, lng: null })
    }

    const { lat, lng } = data.results[0].geometry.location
    return NextResponse.json({ lat, lng })
  } catch {
    return NextResponse.json({ lat: null, lng: null })
  }
}
