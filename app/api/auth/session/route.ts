import { NextResponse, type NextRequest } from 'next/server'
import { createRouteSupabaseClient } from '../../_lib/supabase'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const supabase = createRouteSupabaseClient(request)

  // getUser() valida el JWT contra el servidor de Supabase.
  // getSession() solo lee la cookie local sin validarla — inseguro para server-side.
  const { data } = await supabase.auth.getUser()
  return NextResponse.json({ session: data.user ? { user: data.user } : null })
}
