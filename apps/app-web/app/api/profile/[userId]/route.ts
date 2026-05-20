import { NextRequest, NextResponse } from 'next/server'

const PROFILE_URL = process.env.NEXT_PUBLIC_PROFILE_URL

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params

  if (PROFILE_URL) {
    try {
      const res = await fetch(`${PROFILE_URL}/profile/public/${userId}`, {
        cache: 'no-store',
      })
      if (!res.ok) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
      const data = await res.json()
      return NextResponse.json(data)
    } catch {
      return NextResponse.json({ error: 'Service unavailable' }, { status: 503 })
    }
  }

  // Fallback: query Supabase directly
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ error: 'Not configured' }, { status: 503 })
  }

  const res = await fetch(
    `${supabaseUrl}/rest/v1/profiles?id=eq.${encodeURIComponent(userId)}&select=id,name,bio,location,interests,avatar_url,cover_url,created_at&limit=1`,
    {
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
      },
      cache: 'no-store',
    }
  )

  const rows = await res.json() as unknown[]
  const profile = Array.isArray(rows) && rows.length > 0 ? rows[0] : null
  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
  return NextResponse.json(profile)
}
