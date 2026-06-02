import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

type Suggestion = {
  label: string
  lat: number
  lng: number
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('query')?.trim() ?? ''

  if (query.length < 3) {
    return NextResponse.json({ suggestions: [] as Suggestion[] })
  }

  try {
    const url = new URL('https://nominatim.openstreetmap.org/search')
    url.searchParams.set('q', query)
    url.searchParams.set('format', 'jsonv2')
    url.searchParams.set('limit', '5')
    url.searchParams.set('accept-language', 'es')
    url.searchParams.set('countrycodes', 'cl')
    url.searchParams.set('addressdetails', '0')

    const res = await fetch(url.toString(), {
      cache: 'no-store',
      headers: {
        'User-Agent': 'eMeet/1.0 (local development address search)',
      },
    })

    const data = await res.json() as Array<{
      display_name?: string
      lat: string
      lon: string
    }>

    const suggestions: Suggestion[] = Array.isArray(data)
      ? data
          .map((item) => ({
            label: item.display_name ?? '',
            lat: Number(item.lat),
            lng: Number(item.lon),
          }))
          .filter((item) => item.label.length > 0 && Number.isFinite(item.lat) && Number.isFinite(item.lng))
      : []

    return NextResponse.json({ suggestions })
  } catch {
    return NextResponse.json({ suggestions: [] as Suggestion[] })
  }
}
