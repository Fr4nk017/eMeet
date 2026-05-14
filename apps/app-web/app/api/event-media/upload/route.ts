import { NextRequest, NextResponse } from 'next/server'

const EVENTS_SERVICE_URL = (
  process.env.NEXT_PUBLIC_EVENTS_URL ?? process.env.NEXT_PUBLIC_APP_EVENTS_URL ?? ''
).trim().replace(/\/$/, '')

export async function POST(request: NextRequest) {
  if (!EVENTS_SERVICE_URL) {
    return NextResponse.json(
      { error: 'Falta NEXT_PUBLIC_EVENTS_URL para el proxy del servicio de eventos.' },
      { status: 500 },
    )
  }

  const authorization = request.headers.get('authorization')
  if (!authorization) {
    return NextResponse.json({ error: 'Token de autorización requerido.' }, { status: 401 })
  }

  // content-type debe reenviarse con el boundary de multipart/form-data
  // o multer no puede parsear el archivo en app-events
  const headers = new Headers()
  headers.set('authorization', authorization)
  const contentType = request.headers.get('content-type')
  if (contentType) headers.set('content-type', contentType)

  try {
    const upstream = await fetch(`${EVENTS_SERVICE_URL}/events/upload`, {
      method: 'POST',
      headers,
      body: await request.arrayBuffer(),
      cache: 'no-store',
    })

    const responseHeaders = new Headers()
    const upstreamContentType = upstream.headers.get('content-type')
    if (upstreamContentType) responseHeaders.set('content-type', upstreamContentType)

    return new Response(await upstream.text(), {
      status: upstream.status,
      headers: responseHeaders,
    })
  } catch {
    return NextResponse.json(
      { error: 'No se pudo comunicar con el servicio de eventos.' },
      { status: 502 },
    )
  }
}
