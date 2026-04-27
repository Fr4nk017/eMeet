import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import type { Event, EventCategory } from '../../../../src/types'
import { haversineKm } from '../../../../src/utils/geo'

const TM_API_KEY = process.env.TICKETMASTER_API_KEY

const SEGMENT_MAP: Record<string, EventCategory> = {
  Music: 'musica',
  Sports: 'deporte',
  'Arts & Theatre': 'teatro',
  Film: 'cultura',
  Miscellaneous: 'cultura',
  undefined: 'cultura',
}

const GENRE_OVERRIDE: Record<string, EventCategory> = {
  Comedy: 'cultura',
  Classical: 'musica',
  Opera: 'teatro',
  Ballet: 'teatro',
  Dance: 'arte',
  'Visual Arts': 'arte',
  Exhibit: 'cultura',
}

function mapTMCategory(segment: string, genre: string): EventCategory {
  return GENRE_OVERRIDE[genre] ?? SEGMENT_MAP[segment] ?? 'cultura'
}


function normalizeEvent(
  raw: Record<string, unknown>,
  userLat: number,
  userLng: number,
): Event | null {
  const embedded = raw._embedded as Record<string, unknown> | undefined
  const venues = embedded?.venues as Record<string, unknown>[] | undefined
  const venue = venues?.[0]
  const location = venue?.location as Record<string, unknown> | undefined

  const venueLat = parseFloat(String(location?.latitude ?? ''))
  const venueLng = parseFloat(String(location?.longitude ?? ''))
  if (isNaN(venueLat) || isNaN(venueLng)) return null

  const classifications = raw.classifications as Record<string, unknown>[] | undefined
  const cls = classifications?.[0] as Record<string, unknown> | undefined
  const segment = (cls?.segment as Record<string, unknown> | undefined)?.name as string ?? ''
  const genre = (cls?.genre as Record<string, unknown> | undefined)?.name as string ?? ''

  const dates = raw.dates as Record<string, unknown> | undefined
  const start = dates?.start as Record<string, unknown> | undefined
  const dateStr = start?.localDate as string | undefined
  const timeStr = (start?.localTime as string | undefined) ?? '20:00:00'
  const date = dateStr ? `${dateStr}T${timeStr}` : new Date().toISOString()

  const images = raw.images as Record<string, unknown>[] | undefined
  const bestImage =
    images?.find(
      (img) =>
        (img.ratio as string) === '16_9' && (img.width as number) >= 640,
    ) ??
    images?.[0]
  const imageUrl =
    (bestImage?.url as string) ??
    'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=1200&q=80'

  const priceRanges = raw.priceRanges as Record<string, unknown>[] | undefined
  const priceMin = priceRanges?.[0]?.min
  const price = typeof priceMin === 'number' && priceMin > 0 ? Math.round(priceMin) : null

  const attractions = embedded?.attractions as Record<string, unknown>[] | undefined
  const attraction = attractions?.[0]
  const attractionImages = attraction?.images as Record<string, unknown>[] | undefined
  const organizerAvatar =
    (attractionImages?.[0]?.url as string) ??
    `https://api.dicebear.com/9.x/shapes/svg?seed=${raw.id as string}`

  const venueAddress = venue?.address as Record<string, unknown> | undefined
  const venueCity = venue?.city as Record<string, unknown> | undefined
  const addressLine = (venueAddress?.line1 as string) ?? ''
  const cityName = (venueCity?.name as string) ?? 'Santiago'
  const address = [addressLine, cityName].filter(Boolean).join(', ')

  return {
    id: `tm-${raw.id as string}`,
    title: raw.name as string,
    description: `${segment}${genre ? ` · ${genre}` : ''} en ${(venue?.name as string) ?? 'Santiago'}`,
    category: mapTMCategory(segment, genre),
    date,
    location: (venue?.name as string) ?? 'Santiago',
    address,
    distance: Number(haversineKm(userLat, userLng, venueLat, venueLng).toFixed(1)),
    price,
    imageUrl,
    websiteUrl: (raw.url as string) ?? null,
    organizerName:
      (attraction?.name as string) ??
      (raw.promoter as Record<string, unknown> | undefined)?.name as string ??
      'Ticketmaster',
    organizerAvatar,
    attendees: 0,
    capacity: null,
    tags: [segment, genre].filter(Boolean).map((s) => s.toLowerCase()),
    isLiked: false,
    isSaved: false,
    lat: venueLat,
    lng: venueLng,
  }
}

export async function GET(request: NextRequest) {
  if (!TM_API_KEY) {
    return NextResponse.json({ events: [], configured: false })
  }

  const { searchParams } = new URL(request.url)
  const lat = parseFloat(searchParams.get('lat') ?? '')
  const lng = parseFloat(searchParams.get('lng') ?? '')
  const radius = searchParams.get('radius') ?? '10'

  if (isNaN(lat) || isNaN(lng)) {
    return NextResponse.json({ events: [], error: 'lat y lng requeridos' }, { status: 400 })
  }

  try {
    const url = new URL('https://app.ticketmaster.com/discovery/v2/events.json')
    url.searchParams.set('apikey', TM_API_KEY)
    url.searchParams.set('latlong', `${lat},${lng}`)
    url.searchParams.set('radius', radius)
    url.searchParams.set('unit', 'km')
    url.searchParams.set('size', '20')
    url.searchParams.set('sort', 'date,asc')
    url.searchParams.set('locale', '*')

    const res = await fetch(url.toString(), { next: { revalidate: 300 } })

    if (!res.ok) {
      return NextResponse.json({ events: [] })
    }

    const data = await res.json() as { _embedded?: { events?: Record<string, unknown>[] } }
    const rawEvents = data._embedded?.events ?? []

    const events = rawEvents
      .map((e) => normalizeEvent(e, lat, lng))
      .filter((e): e is Event => e !== null)

    return NextResponse.json({ events, source: 'ticketmaster' })
  } catch {
    return NextResponse.json({ events: [] })
  }
}
