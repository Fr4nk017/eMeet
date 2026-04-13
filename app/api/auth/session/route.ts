import { NextResponse, type NextRequest } from 'next/server'
import { createRouteSupabaseClient } from '../../_lib/supabase'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const supabase = createRouteSupabaseClient(request)

  const { data } = await supabase.auth.getSession()
  return NextResponse.json({ session: data.session })
}
