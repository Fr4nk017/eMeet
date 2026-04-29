import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import type { Event, EventCategory } from '../../../../src/types'

const EVENTBRITE_TOKEN = process.env.EVENTBRITE_PRIVATE_TOKEN

const CATEGORY_MAP: Record<string, EventCategory> = {
  'Music': 'musica',
  'Food & Drink': 'gastronomia',
  'Arts': 'arte',
  'Performing & Visual Arts': 'arte',
  'Performing Arts': 'teatro',
  'Film, Media & Entertainment': 'cultura',
  'Sports & Fitness': 'deporte',
  'Business & Professional': 'networking',
  'Nightlife': 'fiesta',
  'Community & Culture': 'cultura',
  'Family & Education': 'cultura',
  'Science & Technology': 'networking',
  'Travel & Outdoor': 'deporte',
  'Fashion': 'arte',
  'Health & Wellness': 'deporte',
  'Other': 'cultura',
}

function mapCategory(name?: string): EventCategory {
  if (!name) return 'cultura'
  return CATEGORY_MAP[name] ?? 'cultura'
}

function getPrice(raw: Record<string, unknown>): number | null {
  if (raw.is_free) return null
  const availability = raw.ticket_availability as Record<string, unknown> | undefined
  const minPrice = availability?.minimum_ticket_price as Record<string, unknown> | undefined
  const value = minPrice?.value
  if (typeof value === 'number' && value > 0) return value
  return null
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function normalizeEvent(raw: Record<string, unknown>, userLat: number, userLng: number): Event | null {
  const venue = raw.venue as Record<string, unknown> | undefined
  const venueLat = parseFloat(String(venue?.latitude ?? ''))
  const venueLng = parseFloat(String(venue?.longitude ?? ''))
  if (isNaN(venueLat) || isNaN(venueLng)) return null

  const logo = raw.logo as Record<string, unknown> | undefined
  const logoOriginal = logo?.original as Record<string, unknown> | undefined
  const imageUrl =
    (logoOriginal?.url as string) ??
    (logo?.url as string) ??
    'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=1200&q=80'

  const organizer = raw.organizer as Record<string, unknown> | undefined
  const organizerLogo = organizer?.logo as Record<string, unknown> | undefined
  const category = raw.category as Record<string, unknown> | undefined
  const name = raw.name as Record<string, unknown> | undefined
  const description = raw.description as Record<string, unknown> | undefined
  const start = raw.start as Record<string, unknown> | undefined
  const venueAddress = venue?.address as Record<string, unknown> | undefined

  return {
    id: `eb-${raw.id as string}`,
    title: (name?.text as string) ?? 'Sin nombre',
    description: (description?.text as string) ?? (raw.summary as string) ?? '',
    category: mapCategory(category?.name as string | undefined),
    source: 'eventbrite' as const,
    date: (start?.local as string) ?? new Date().toISOString(),
    location: (venue?.name as string) ?? 'Santiago',
    address: (venueAddress?.localized_address_display as string) ?? 'Santiago, Chile',
    distance: Number(haversineKm(userLat, userLng, venueLat, venueLng).toFixed(1)),
    price: getPrice(raw),
    imageUrl,
    websiteUrl: (raw.url as string) ?? null,
    organizerName: (organizer?.name as string) ?? 'Organizador',
    organizerAvatar:
      (organizerLogo?.url as string) ??
      `https://api.dicebear.com/9.x/shapes/svg?seed=${raw.id as string}`,
    attendees: 0,
    capacity: (raw.capacity as number) ?? null,
    tags: [((category?.name as string) ?? 'evento').toLowerCase()],
    isLiked: false,
    isSaved: false,
    lat: venueLat,
    lng: venueLng,
  }
}

export async function GET(request: NextRequest) {
  if (!EVENTBRITE_TOKEN) {
    return NextResponse.json({ events: [], source: 'eventbrite', configured: false })
  }

  const { searchParams } = new URL(request.url)
  const lat = parseFloat(searchParams.get('lat') ?? '')
  const lng = parseFloat(searchParams.get('lng') ?? '')
  const radius = searchParams.get('radius') ?? '5'

  if (isNaN(lat) || isNaN(lng)) {
    return NextResponse.json({ events: [], error: 'lat y lng son requeridos' }, { status: 400 })
  }

  try {
    const url = new URL('https://www.eventbriteapi.com/v3/events/search/')
    url.searchParams.set('location.latitude', String(lat))
    url.searchParams.set('location.longitude', String(lng))
    url.searchParams.set('location.within', `${radius}km`)
    url.searchParams.set('expand', 'venue,organizer,logo,category,ticket_availability')
    url.searchParams.set('sort_by', 'date')
    url.searchParams.set('start_date.keyword', 'today')

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${EVENTBRITE_TOKEN}` },
      next: { revalidate: 300 },
    })

    if (!res.ok) {
      return NextResponse.json({ events: [], source: 'eventbrite' })
    }

    const data = await res.json() as { events?: Record<string, unknown>[] }
    const rawEvents = data.events ?? []

    const events = rawEvents
      .map((e) => normalizeEvent(e, lat, lng))
      .filter((e): e is Event => e !== null)

    return NextResponse.json({ events, source: 'eventbrite' })
  } catch {
    return NextResponse.json({ events: [], source: 'eventbrite' })
  }
}
