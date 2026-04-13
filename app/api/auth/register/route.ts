import { NextResponse, type NextRequest } from 'next/server'
import { apiError, createRouteSupabaseClient } from '../../_lib/supabase'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  const supabase = createRouteSupabaseClient(request)

  const body = (await request.json()) as { name?: string; email?: string; password?: string }
  const name = body.name?.trim()
  const email = body.email?.trim()
  const password = body.password

  if (!name || !email || !password) {
    return apiError('Nombre, email y contraseña son obligatorios.')
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { name },
    },
  })

  if (error) {
    return apiError(error.message)
  }

  return NextResponse.json({ user: data.user, session: data.session }, { status: 201 })
}
