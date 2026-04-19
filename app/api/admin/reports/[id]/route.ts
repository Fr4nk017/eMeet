import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = (process.env.NEXT_PUBLIC_BACKEND_URL ?? '').trim().replace(/\/$/, '')
const BACKEND_TIMEOUT_MS = Number(process.env.BACKEND_FETCH_TIMEOUT_MS ?? 10000)

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!BACKEND_URL) {
    return NextResponse.json({ error: 'NEXT_PUBLIC_BACKEND_URL no está configurada.' }, { status: 500 })
  }

  const { id } = await params
  const authHeader = request.headers.get('authorization')
  const body = (await request.json().catch(() => null)) as { status?: 'resolved' | 'dismissed' } | null

  if (!body?.status) {
    return NextResponse.json({ error: 'Body inválido. status es obligatorio.' }, { status: 400 })
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), Math.max(1000, BACKEND_TIMEOUT_MS))

  let response: Response

  try {
    response = await fetch(`${BACKEND_URL}/admin/reports/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...(authHeader ? { Authorization: authHeader } : {}),
      },
      body: JSON.stringify(body),
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

  const responseBody = (await response.json().catch(() => ({ error: 'Respuesta inválida del backend.' }))) as unknown
  return NextResponse.json(responseBody, { status: response.status })
}
