import { NextResponse, type NextRequest } from 'next/server'
import { getRequestUser } from '../../_lib/auth'
import { apiError, createRouteSupabaseClient } from '../../_lib/supabase'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  const supabase = createRouteSupabaseClient(request)
  const { error } = await getRequestUser(supabase, request)

  if (error) return apiError('No autorizado.', 401)

  const body = (await request.json()) as {
    eventId?: string
    eventTitle?: string
    eventImageUrl?: string | null
    eventAddress?: string | null
  }

  if (!body.eventId || !body.eventTitle) {
    return apiError('eventId y eventTitle son obligatorios.', 400)
  }

  const { error: saveError } = await supabase.from('user_events').upsert(
    {
      event_id: body.eventId,
      event_title: body.eventTitle,
      event_image_url: body.eventImageUrl ?? null,
      event_address: body.eventAddress ?? null,
      action: 'save',
    },
    { onConflict: 'user_id,event_id,action' },
  )

  if (saveError) return apiError('No se pudo guardar el evento.', 500)

  return NextResponse.json({ ok: true }, { status: 201 })
}
