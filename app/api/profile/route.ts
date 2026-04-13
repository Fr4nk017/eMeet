import { NextResponse, type NextRequest } from 'next/server'
import { getRequestUser } from '../_lib/auth'
import { apiError, createRouteSupabaseClient } from '../_lib/supabase'
import type { EventCategory } from '../../../src/lib/supabase'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const supabase = createRouteSupabaseClient(request)
  const { user, error } = await getRequestUser(supabase, request)

  if (error || !user) return apiError('No autorizado.', 401)

  const { data, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (profileError) {
    return apiError('No se pudo cargar el perfil.', 500)
  }

  return NextResponse.json(data)
}

export async function PATCH(request: NextRequest) {
  const supabase = createRouteSupabaseClient(request)
  const { user, error } = await getRequestUser(supabase, request)

  if (error || !user) return apiError('No autorizado.', 401)

  const body = (await request.json()) as {
    name?: string
    bio?: string
    location?: string
    interests?: EventCategory[]
  }

  const payload: {
    name?: string
    bio?: string
    location?: string
    interests?: EventCategory[]
  } = {}

  if (typeof body.name === 'string') payload.name = body.name.trim()
  if (typeof body.bio === 'string') payload.bio = body.bio.trim()
  if (typeof body.location === 'string') payload.location = body.location.trim()
  if (Array.isArray(body.interests)) payload.interests = body.interests

  if (Object.keys(payload).length === 0) {
    return apiError('No hay campos para actualizar.', 400)
  }

  const { data, error: updateError } = await supabase
    .from('profiles')
    .update(payload)
    .eq('id', user.id)
    .select('*')
    .single()

  if (updateError) {
    return apiError('No se pudo actualizar el perfil.', 500)
  }

  return NextResponse.json(data)
}
