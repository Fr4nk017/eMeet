import { NextRequest, NextResponse } from 'next/server'

const AUTH_SERVICE_URL = (process.env.NEXT_PUBLIC_AUTH_URL ?? '').trim().replace(/\/$/, '')

export async function POST(request: NextRequest) {
  if (!AUTH_SERVICE_URL) {
    return NextResponse.json(
      { error: 'Falta NEXT_PUBLIC_AUTH_URL para el proxy del servicio de autenticación.' },
      { status: 500 },
    )
  }

  const headers = new Headers({ 'content-type': 'application/json' })
  const authorization = request.headers.get('authorization')
  if (authorization) headers.set('authorization', authorization)

  try {
    const upstream = await fetch(`${AUTH_SERVICE_URL}/auth/register`, {
      method: 'POST',
      headers,
      body: await request.text(),
      cache: 'no-store',
    })

    const responseHeaders = new Headers()
    const contentType = upstream.headers.get('content-type')
    if (contentType) responseHeaders.set('content-type', contentType)

    return new Response(await upstream.text(), {
      status: upstream.status,
      headers: responseHeaders,
    })
  } catch {
    return NextResponse.json(
      { error: 'No se pudo comunicar con el servicio de autenticación.' },
      { status: 502 },
    )
  }
}
