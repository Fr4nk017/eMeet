import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ trackId: string }> }
) {
  const { trackId } = await params
  const id = parseInt(trackId, 10)
  if (!id || isNaN(id)) return NextResponse.json({ error: 'Invalid track id' }, { status: 400 })

  try {
    const res = await fetch(`https://api.deezer.com/track/${id}`, { cache: 'no-store' })
    if (!res.ok) return NextResponse.json({ error: 'Track not found' }, { status: 404 })
    const data = await res.json() as { preview?: string }
    if (!data.preview) return NextResponse.json({ error: 'No preview available' }, { status: 404 })
    return NextResponse.redirect(data.preview)
  } catch {
    return NextResponse.json({ error: 'Failed to fetch preview' }, { status: 502 })
  }
}
