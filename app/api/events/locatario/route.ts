import { NextResponse, type NextRequest } from 'next/server'
import { getRequestUser } from '../../_lib/auth'
import { apiError, createRouteSupabaseClient } from '../../_lib/supabase'
import type { EventCategory } from '@/src/types'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const supabase = createRouteSupabaseClient(request)
  const { user, error } = await getRequestUser(supabase, request)

  if (error || !user) return apiError('No autorizado.', 401)

  const { data, error: dbError } = await supabase
    .from('locatario_events')
    .select('*')
    .eq('creator_id', user.id)
    .order('created_at', { ascending: false })

  if (dbError) return apiError('No se pudieron obtener los eventos.', 500)

  return NextResponse.json(data ?? [])
}

export async function POST(request: NextRequest) {
  const supabase = createRouteSupabaseClient(request)
  const { user, error } = await getRequestUser(supabase, request)

  if (error || !user) return apiError('No autorizado.', 401)

  const body = (await request.json()) as {
    title?: string
    description?: string
    category?: EventCategory
    event_date?: string
    address?: string
    price?: number | null
    image_url?: string | null
    organizer_name?: string
    organizer_avatar?: string | null
  }

  if (!body.title?.trim() || !body.description?.trim() || !body.event_date || !body.category) {
    return apiError('Título, descripción, categoría y fecha son obligatorios.', 400)
  }

  const { data, error: dbError } = await supabase
    .from('locatario_events')
    .insert({
      creator_id: user.id,
      title: body.title.trim(),
      description: body.description.trim(),
      category: body.category,
      event_date: new Date(body.event_date).toISOString(),
      address: body.address?.trim() ?? '',
      price: body.price ?? null,
      image_url: body.image_url?.trim() || null,
      organizer_name: body.organizer_name ?? '',
      organizer_avatar: body.organizer_avatar ?? null,
    })
    .select()
    .single()

  if (dbError) return apiError('No se pudo crear el evento.', 500)

  return NextResponse.json(data, { status: 201 })
}
