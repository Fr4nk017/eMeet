import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = (process.env.NEXT_PUBLIC_BACKEND_URL ?? '').trim().replace(/\/$/, '')
const BACKEND_TIMEOUT_MS = Number(process.env.BACKEND_FETCH_TIMEOUT_MS ?? 10000)

export async function GET(request: NextRequest) {
  if (!BACKEND_URL) {
    return NextResponse.json({ error: 'NEXT_PUBLIC_BACKEND_URL no está configurada.' }, { status: 500 })
  }

  const authHeader = request.headers.get('authorization')
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), Math.max(1000, BACKEND_TIMEOUT_MS))

  let response: Response

  try {
    response = await fetch(`${BACKEND_URL}/admin/reports`, {
      method: 'GET',
      headers: authHeader ? { Authorization: authHeader } : {},
      cache: 'no-store',
      signal: controller.signal,
    })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      return NextResponse.json({ error: 'El backend tardó demasiado en responder.' }, { status: 504 })
    }

    return NextResponse.json({ error: 'No se pudo contactar el backend.' }, { status: 502 })
  } finally {
    clearTimeout(timeoutId)
  }

  const body = (await response.json().catch(() => ({ error: 'Respuesta inválida del backend.' }))) as unknown
  return NextResponse.json(body, { status: response.status })
}
