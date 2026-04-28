import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import type { Event, EventCategory } from '../../../../src/types'

const MEETUP_CLIENT_ID = process.env.MEETUP_CLIENT_ID
const MEETUP_CLIENT_SECRET = process.env.MEETUP_CLIENT_SECRET

// Cache del token anónimo (se renueva si expira)
let cachedToken: { value: string; expiresAt: number } | null = null

async function getAnonymousToken(): Promise<string | null> {
  if (cachedToken && Date.now() < cachedToken.expiresAt - 60_000) {
    return cachedToken.value
  }

  const res = await fetch('https://secure.meetup.com/oauth2/access', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: MEETUP_CLIENT_ID!,
      client_secret: MEETUP_CLIENT_SECRET!,
      grant_type: 'anonymous',
    }),
  })

  if (!res.ok) return null

  const data = await res.json() as { access_token?: string; expires_in?: number }
  if (!data.access_token) return null

  cachedToken = {
    value: data.access_token,
    expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000,
  }

  return cachedToken.value
}

const TOPIC_CATEGORY_MAP: Record<string, EventCategory> = {
  music: 'musica',
  'arts-culture': 'arte',
  food: 'gastronomia',
  drinks: 'fiesta',
  nightlife: 'fiesta',
  sports: 'deporte',
  fitness: 'deporte',
  outdoors: 'deporte',
  tech: 'networking',
  business: 'networking',
  career: 'networking',
  film: 'cultura',
  theater: 'teatro',
  arts: 'arte',
}

function mapMeetupCategory(topics: string[]): EventCategory {
  for (const topic of topics) {
    const key = topic.toLowerCase()
    if (TOPIC_CATEGORY_MAP[key]) return TOPIC_CATEGORY_MAP[key]
    for (const [k, v] of Object.entries(TOPIC_CATEGORY_MAP)) {
      if (key.includes(k)) return v
    }
  }
  return 'cultura'
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

function normalizeEvent(
  node: Record<string, unknown>,
  userLat: number,
  userLng: number,
): Event | null {
  const venue = node.venue as Record<string, unknown> | undefined
  const venueLat = typeof venue?.lat === 'number' ? venue.lat : parseFloat(String(venue?.lat ?? ''))
  const venueLng = typeof venue?.lon === 'number' ? venue.lon : parseFloat(String(venue?.lon ?? ''))
  if (isNaN(venueLat) || isNaN(venueLng)) return null

  const group = node.group as Record<string, unknown> | undefined
  const groupLogo = group?.logo as Record<string, unknown> | undefined
  const images = node.images as Record<string, unknown>[] | undefined
  const imageUrl =
    (images?.[0]?.baseUrl as string)?.replace('{width}', '1200').replace('{height}', '800') ??
    (groupLogo?.baseUrl as string)?.replace('{width}', '200').replace('{height}', '200') ??
    'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=1200&q=80'

  const topicCategory = node.topicCategory as Record<string, unknown> | undefined
  const topics = [topicCategory?.urlkey as string].filter(Boolean)
  const category = mapMeetupCategory(topics)

  const dateTime = node.dateTime as string | undefined

  return {
    id: `mu-${node.id as string}`,
    title: node.title as string,
    description: (node.description as string) ?? '',
    category,
    source: 'meetup' as const,
    date: dateTime ?? new Date().toISOString(),
    location: (venue?.name as string) ?? (group?.name as string) ?? 'Santiago',
    address: (venue?.address as string) ?? 'Santiago, Chile',
    distance: Number(haversineKm(userLat, userLng, venueLat, venueLng).toFixed(1)),
    price: null,
    imageUrl,
    websiteUrl: (node.eventUrl as string) ?? null,
    organizerName: (group?.name as string) ?? 'Meetup',
    organizerAvatar:
      (groupLogo?.baseUrl as string)?.replace('{width}', '100').replace('{height}', '100') ??
      `https://api.dicebear.com/9.x/shapes/svg?seed=${node.id as string}`,
    attendees: (node.going as number) ?? 0,
    capacity: (node.maxTickets as number) ?? null,
    tags: topics,
    isLiked: false,
    isSaved: false,
    lat: venueLat,
    lng: venueLng,
  }
}

const NEARBY_EVENTS_QUERY = `
  query NearbyEvents($lat: Float!, $lon: Float!, $radius: Float!) {
    keywordSearch(
      filter: { lat: $lat, lon: $lon, radius: $radius }
      input: { first: 20 }
    ) {
      edges {
        node {
          result {
            ... on Event {
              id
              title
              description
              dateTime
              going
              maxTickets
              eventUrl
              topicCategory { urlkey name }
              images { baseUrl }
              venue { name address lat lon }
              group { name logo { baseUrl } }
            }
          }
        }
      }
    }
  }
`

export async function GET(request: NextRequest) {
  if (!MEETUP_CLIENT_ID || !MEETUP_CLIENT_SECRET) {
    return NextResponse.json({ events: [], configured: false })
  }

  const { searchParams } = new URL(request.url)
  const lat = parseFloat(searchParams.get('lat') ?? '')
  const lng = parseFloat(searchParams.get('lng') ?? '')
  const radius = parseFloat(searchParams.get('radius') ?? '10')

  if (isNaN(lat) || isNaN(lng)) {
    return NextResponse.json({ events: [], error: 'lat y lng requeridos' }, { status: 400 })
  }

  try {
    const token = await getAnonymousToken()
    if (!token) {
      return NextResponse.json({ events: [], error: 'No se pudo obtener token de Meetup' })
    }

    const res = await fetch('https://api.meetup.com/gql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        query: NEARBY_EVENTS_QUERY,
        variables: { lat, lon: lng, radius },
      }),
      next: { revalidate: 300 },
    })

    if (!res.ok) {
      return NextResponse.json({ events: [] })
    }

    const data = await res.json() as {
      data?: {
        keywordSearch?: {
          edges?: Array<{ node?: { result?: Record<string, unknown> } }>
        }
      }
    }

    const edges = data.data?.keywordSearch?.edges ?? []
    const events = edges
      .map((edge) => edge.node?.result)
      .filter((r): r is Record<string, unknown> => !!r && !!r.id)
      .map((r) => normalizeEvent(r, lat, lng))
      .filter((e): e is Event => e !== null)

    return NextResponse.json({ events, source: 'meetup' })
  } catch {
    return NextResponse.json({ events: [] })
  }
}
