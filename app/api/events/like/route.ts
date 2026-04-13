import { NextResponse, type NextRequest } from 'next/server'
import { getRequestUser } from '../../_lib/auth'
import { apiError, createRouteSupabaseClient } from '../../_lib/supabase'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  const supabase = createRouteSupabaseClient(request)
  const { user, error } = await getRequestUser(supabase, request)

  if (error || !user) return apiError('No autorizado.', 401)

  const body = (await request.json()) as {
    eventId?: string
    eventTitle?: string
    eventImageUrl?: string | null
    eventAddress?: string | null
  }

  if (!body.eventId || !body.eventTitle) {
    return apiError('eventId y eventTitle son obligatorios.', 400)
  }

  const { error: likeError } = await supabase.from('user_events').upsert(
    {
      event_id: body.eventId,
      event_title: body.eventTitle,
      event_image_url: body.eventImageUrl ?? null,
      event_address: body.eventAddress ?? null,
      action: 'like',
    },
    { onConflict: 'user_id,event_id,action' },
  )

  if (likeError) return apiError('No se pudo registrar el like.', 500)

  const { error: roomError } = await supabase.from('chat_rooms').upsert(
    {
      id: body.eventId,
      event_title: body.eventTitle,
      event_image_url: body.eventImageUrl ?? null,
      event_address: body.eventAddress ?? null,
    },
    { onConflict: 'id' },
  )

  if (roomError) return apiError('No se pudo preparar la sala del lugar.', 500)

  const { error: memberError } = await supabase.from('room_members').upsert(
    {
      room_id: body.eventId,
      user_id: user.id,
    },
    { onConflict: 'room_id,user_id' },
  )

  if (memberError) return apiError('No se pudo unir al chat del lugar.', 500)

  return NextResponse.json({ ok: true }, { status: 201 })
}
