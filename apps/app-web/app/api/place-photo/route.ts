import { NextRequest, NextResponse } from 'next/server'

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
const PLACES_SERVICE_URL = (process.env.NEXT_PUBLIC_PLACES_URL ?? '').trim().replace(/\/$/, '')

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q')?.trim()
  const maxwidth = searchParams.get('maxwidth') ?? '900'

  if (!q || !API_KEY) return new NextResponse(null, { status: 404 })

  // Step 1: resolve text query → photoReference (app-places has no findplacefromtext)
  let photoRef: string
  try {
    const searchRes = await fetch(
      `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${encodeURIComponent(q)}&inputtype=textquery&fields=photos&key=${API_KEY}`,
      { next: { revalidate: 86400 } },
    )
    const searchData = await searchRes.json() as {
      candidates?: Array<{ photos?: Array<{ photo_reference: string }> }>
    }
    const ref = searchData.candidates?.[0]?.photos?.[0]?.photo_reference
    if (!ref) return new NextResponse(null, { status: 404 })
    photoRef = ref
  } catch {
    return new NextResponse(null, { status: 500 })
  }

  // Step 2: fetch photo binary — proxy to app-places when available, fallback to direct call
  if (PLACES_SERVICE_URL) {
    try {
      const upstream = await fetch(
        `${PLACES_SERVICE_URL}/places/photo?photoReference=${encodeURIComponent(photoRef)}&maxWidth=${maxwidth}`,
        { cache: 'no-store' },
      )
      if (!upstream.ok) return new NextResponse(null, { status: 404 })

      const buffer = await upstream.arrayBuffer()
      const contentType = upstream.headers.get('content-type') ?? 'image/jpeg'

      return new NextResponse(buffer, {
        headers: {
          'content-type': contentType,
          'cache-control': 'public, max-age=604800, immutable',
        },
      })
    } catch {
      // fall through to direct call below
    }
  }

  // Fallback: direct call (cuando NEXT_PUBLIC_PLACES_URL no está configurada)
  try {
    const photoRes = await fetch(
      `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${maxwidth}&photoreference=${photoRef}&key=${API_KEY}`,
      { redirect: 'follow' },
    )
    if (!photoRes.ok) return new NextResponse(null, { status: 404 })

    const buffer = await photoRes.arrayBuffer()
    const contentType = photoRes.headers.get('content-type') ?? 'image/jpeg'

    return new NextResponse(buffer, {
      headers: {
        'content-type': contentType,
        'cache-control': 'public, max-age=604800, immutable',
      },
    })
  } catch {
    return new NextResponse(null, { status: 500 })
  }
}
