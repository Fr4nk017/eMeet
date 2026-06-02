import type { NextRequest } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ trackId: string }> }
) {
  const { trackId } = await params
  const id = parseInt(trackId, 10)
  if (!id || isNaN(id)) return new Response('Invalid track id', { status: 400 })

  try {
    const trackRes = await fetch(`https://api.deezer.com/track/${id}`, { cache: 'no-store' })
    if (!trackRes.ok) return new Response('Track not found', { status: 404 })
    const data = await trackRes.json() as { preview?: string }
    if (!data.preview) return new Response('No preview available', { status: 404 })

    // Proxy the audio bytes so mobile browsers don't hit CORS/blocking on dzcdn.net
    const rangeHeader = request.headers.get('range')
    const fetchHeaders: HeadersInit = { Accept: 'audio/mpeg, audio/*' }
    if (rangeHeader) fetchHeaders['Range'] = rangeHeader

    const audioRes = await fetch(data.preview, { headers: fetchHeaders })
    if (!audioRes.ok && audioRes.status !== 206) {
      return new Response('Audio not available', { status: 502 })
    }

    const headers = new Headers()
    headers.set('Content-Type', audioRes.headers.get('Content-Type') ?? 'audio/mpeg')
    headers.set('Cache-Control', 'public, max-age=3600, immutable')
    headers.set('Access-Control-Allow-Origin', '*')

    const contentLength = audioRes.headers.get('Content-Length')
    if (contentLength) headers.set('Content-Length', contentLength)

    const contentRange = audioRes.headers.get('Content-Range')
    if (contentRange) headers.set('Content-Range', contentRange)

    const acceptRanges = audioRes.headers.get('Accept-Ranges')
    if (acceptRanges) headers.set('Accept-Ranges', acceptRanges)

    return new Response(audioRes.body, { status: audioRes.status, headers })
  } catch {
    return new Response('Failed to fetch preview', { status: 502 })
  }
}
