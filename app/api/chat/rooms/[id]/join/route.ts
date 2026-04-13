import { NextResponse, type NextRequest } from 'next/server'
import { getRequestUser } from '../../../../_lib/auth'
import { apiError, createRouteSupabaseClient } from '../../../../_lib/supabase'

export const runtime = 'nodejs'

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createRouteSupabaseClient(request)
  const { user, error } = await getRequestUser(supabase, request)

  if (error || !user) return apiError('No autorizado.', 401)

  const body = (await request.json()) as {
    eventTitle?: string
    eventImageUrl?: string | null
    eventAddress?: string | null
  }

  if (!body.eventTitle) {
    return apiError('eventTitle es obligatorio.', 400)
  }

  const { error: roomError } = await supabase.from('chat_rooms').upsert(
    {
      id: params.id,
      event_title: body.eventTitle,
      event_image_url: body.eventImageUrl ?? null,
      event_address: body.eventAddress ?? null,
    },
    { onConflict: 'id' },
  )

  if (roomError) return apiError('No se pudo crear la sala.', 500)

  const { error: memberError } = await supabase.from('room_members').upsert(
    {
      room_id: params.id,
      user_id: user.id,
    },
    { onConflict: 'room_id,user_id' },
  )

  if (memberError) return apiError('No se pudo unir al chat.', 500)

  return NextResponse.json({ ok: true }, { status: 201 })
}
