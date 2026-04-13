import { NextResponse, type NextRequest } from 'next/server'
import { apiError, createRouteSupabaseClient } from '../../_lib/supabase'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  const supabase = createRouteSupabaseClient(request)

  const body = (await request.json()) as { email?: string; password?: string }
  const email = body.email?.trim()
  const password = body.password

  if (!email || !password) {
    return apiError('Email y contraseña son obligatorios.')
  }

  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) {
    return apiError(error.message)
  }

  return NextResponse.json({ user: data.user, session: data.session })
}
