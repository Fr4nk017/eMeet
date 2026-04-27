import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import type { Event, EventCategory } from '../../../../src/types'
import { haversineKm } from '../../../../src/utils/geo'

const PREDICTHQ_TOKEN = process.env.PREDICTHQ_API_KEY

const CATEGORY_MAP: Record<string, EventCategory> = {
  concerts: 'musica',
  festivals: 'fiesta',
  'performing-arts': 'teatro',
  sports: 'deporte',
  community: 'cultura',
  conferences: 'networking',
  expos: 'networking',
  academic: 'cultura',
  observances: 'cultura',
  'public-holidays': 'cultura',
  politics: 'cultura',
  'school-holidays': 'cultura',
}

function mapCategory(category: string): EventCategory {
  return CATEGORY_MAP[category] ?? 'cultura'
}

// Imágenes por categoría PredictHQ — tamaño reducido (800px) para carga rápida
const CATEGORY_IMAGES: Record<string, string> = {
  concerts: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800&q=75',
  festivals: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800&q=75',
  'performing-arts': 'https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?w=800&q=75',
  sports: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=800&q=75',
  community: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=800&q=75',
  conferences: 'https://images.unsplash.com/photo-1505373877841-8d25f7d46678?w=800&q=75',
  expos: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&q=75',
}

const DEFAULT_IMAGE = 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800&q=75'

function getCategoryImage(category: string): string {
  return CATEGORY_IMAGES[category] ?? DEFAULT_IMAGE
}


interface PHQEntity {
  entity_id?: string
  name?: string
  type?: string
  formatted_address?: string
}

interface PHQEvent {
  id: string
  title: string
  description?: string
  category: string
  labels?: string[]
  start: string
  location?: [number, number] // [lng, lat]
  geo?: {
    geometry?: { coordinates?: [number, number] }
  }
  phq_attendance?: number
  entities?: PHQEntity[]
}

function normalizeEvent(raw: PHQEvent, userLat: number, userLng: number): Event | null {
  // location es [lng, lat] en PredictHQ
  const coords =
    raw.geo?.geometry?.coordinates ??
    (raw.location?.length === 2 ? raw.location : undefined)

  if (!coords) return null
  const [evtLng, evtLat] = coords
  if (isNaN(evtLat) || isNaN(evtLng)) return null

  const venue = raw.entities?.find((e) => e.type === 'venue')
  const organizer = raw.entities?.find((e) => e.type !== 'venue')

  return {
    id: `phq-${raw.id}`,
    title: raw.title,
    description: raw.description ?? '',
    category: mapCategory(raw.category),
    date: raw.start,
    location: venue?.name ?? 'Lugar por confirmar',
    address: venue?.formatted_address ?? 'Santiago, Chile',
    distance: Number(haversineKm(userLat, userLng, evtLat, evtLng).toFixed(1)),
    price: null,
    imageUrl: getCategoryImage(raw.category),
    websiteUrl: null,
    organizerName: organizer?.name ?? 'PredictHQ',
    organizerAvatar: `https://api.dicebear.com/9.x/shapes/svg?seed=${raw.id}`,
    attendees: raw.phq_attendance ?? 0,
    capacity: null,
    tags: raw.labels ?? [raw.category],
    isLiked: false,
    isSaved: false,
    lat: evtLat,
    lng: evtLng,
  }
}

export async function GET(request: NextRequest) {
  if (!PREDICTHQ_TOKEN) {
    return NextResponse.json({ events: [], source: 'predicthq', configured: false })
  }

  const { searchParams } = new URL(request.url)
  const lat = parseFloat(searchParams.get('lat') ?? '')
  const lng = parseFloat(searchParams.get('lng') ?? '')
  const radius = searchParams.get('radius') ?? '10'

  if (isNaN(lat) || isNaN(lng)) {
    return NextResponse.json({ events: [], error: 'lat y lng son requeridos' }, { status: 400 })
  }

  try {
    const today = new Date().toISOString().split('T')[0]
    const url = new URL('https://api.predicthq.com/v1/events/')
    url.searchParams.set('within', `${radius}km@${lat},${lng}`)
    url.searchParams.set('start.gte', today)
    url.searchParams.set('sort', 'start')
    url.searchParams.set('limit', '20')
    url.searchParams.set(
      'category',
      'concerts,festivals,performing-arts,sports,community,conferences,expos',
    )

    const res = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${PREDICTHQ_TOKEN}`,
        Accept: 'application/json',
      },
      next: { revalidate: 300 },
    })

    if (!res.ok) {
      return NextResponse.json({ events: [], source: 'predicthq' })
    }

    const data = await res.json() as { results?: PHQEvent[] }
    const events = (data.results ?? [])
      .map((e) => normalizeEvent(e, lat, lng))
      .filter((e): e is Event => e !== null)

    return NextResponse.json({ events, source: 'predicthq' })
  } catch {
    return NextResponse.json({ events: [], source: 'predicthq' })
  }
}
