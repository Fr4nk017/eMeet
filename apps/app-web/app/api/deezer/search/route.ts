import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q')?.trim()
  if (!q || q.length < 2) return NextResponse.json({ data: [] })

  try {
    const url = `https://api.deezer.com/search?q=${encodeURIComponent(q)}&limit=6&output=json`
    const res = await fetch(url, { next: { revalidate: 60 } })
    const data = await res.json()
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ data: [] })
  }
}
