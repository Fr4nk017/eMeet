import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = (process.env.NEXT_PUBLIC_BACKEND_URL ?? '').trim().replace(/\/$/, '')

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

  const response = await fetch(`${BACKEND_URL}/admin/reports/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...(authHeader ? { Authorization: authHeader } : {}),
    },
    body: JSON.stringify(body),
    cache: 'no-store',
  })

  const responseBody = (await response.json().catch(() => ({ error: 'Respuesta inválida del backend.' }))) as unknown
  return NextResponse.json(responseBody, { status: response.status })
}
