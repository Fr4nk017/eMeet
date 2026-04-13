import { NextResponse, type NextRequest } from 'next/server'
import { apiError, createRouteSupabaseClient } from '../../_lib/supabase'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  const supabase = createRouteSupabaseClient(request)

  const { error } = await supabase.auth.signOut()
  if (error) {
    return apiError(error.message, 500)
  }

  return NextResponse.json({ ok: true })
}
