import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = (process.env.NEXT_PUBLIC_BACKEND_URL ?? '').trim().replace(/\/$/, '')

export async function GET(request: NextRequest) {
  if (!BACKEND_URL) {
    return NextResponse.json({ error: 'NEXT_PUBLIC_BACKEND_URL no está configurada.' }, { status: 500 })
  }

  const authHeader = request.headers.get('authorization')
  const response = await fetch(`${BACKEND_URL}/admin/reports`, {
    method: 'GET',
    headers: authHeader ? { Authorization: authHeader } : {},
    cache: 'no-store',
  })

  const body = (await response.json().catch(() => ({ error: 'Respuesta inválida del backend.' }))) as unknown
  return NextResponse.json(body, { status: response.status })
}
