import { NextRequest, NextResponse } from 'next/server'

const SAVED_SERVICE_URL = (process.env.NEXT_PUBLIC_SAVED_URL ?? '').trim().replace(/\/$/, '')

async function proxySaved(request: NextRequest, path: string[]) {
  if (!SAVED_SERVICE_URL) {
    return NextResponse.json(
      { error: 'Falta NEXT_PUBLIC_SAVED_URL para el proxy del servicio de guardados.' },
      { status: 500 },
    )
  }

  const targetUrl = new URL(`${SAVED_SERVICE_URL}/${path.join('/')}`)
  targetUrl.search = request.nextUrl.search

  const headers = new Headers()
  const authorization = request.headers.get('authorization')
  const contentType = request.headers.get('content-type')

  if (authorization) headers.set('authorization', authorization)
  if (contentType) headers.set('content-type', contentType)

  try {
    const upstream = await fetch(targetUrl.toString(), {
      method: request.method,
      headers,
      body: request.method === 'GET' || request.method === 'HEAD' ? undefined : await request.text(),
      cache: 'no-store',
    })

    const responseHeaders = new Headers()
    const upstreamContentType = upstream.headers.get('content-type')

    if (upstreamContentType) {
      responseHeaders.set('content-type', upstreamContentType)
    }

    return new Response(await upstream.text(), {
      status: upstream.status,
      headers: responseHeaders,
    })
  } catch {
    return NextResponse.json(
      { error: 'No se pudo comunicar con el servicio de guardados.' },
      { status: 502 },
    )
  }
}

export async function GET(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params
  return proxySaved(request, path)
}

export async function POST(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params
  return proxySaved(request, path)
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params
  return proxySaved(request, path)
}