import { NextRequest, NextResponse } from 'next/server'

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q')?.trim()

  if (!q || !API_KEY) return new NextResponse(null, { status: 404 })

  try {
    const searchRes = await fetch(
      `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${encodeURIComponent(q)}&inputtype=textquery&fields=photos&key=${API_KEY}`,
      { next: { revalidate: 86400 } },
    )
    const searchData = await searchRes.json() as {
      candidates?: Array<{ photos?: Array<{ photo_reference: string }> }>
    }

    const photoRef = searchData.candidates?.[0]?.photos?.[0]?.photo_reference
    if (!photoRef) return new NextResponse(null, { status: 404 })

    const photoRes = await fetch(
      `https://maps.googleapis.com/maps/api/place/photo?maxwidth=900&photoreference=${photoRef}&key=${API_KEY}`,
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
