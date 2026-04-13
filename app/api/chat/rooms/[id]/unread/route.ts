import { NextResponse, type NextRequest } from 'next/server'
import { getRequestUser } from '../../../../_lib/auth'
import { apiError, createRouteSupabaseClient } from '../../../../_lib/supabase'

export const runtime = 'nodejs'

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createRouteSupabaseClient(request)
  const { user, error } = await getRequestUser(supabase, request)

  if (error || !user) return apiError('No autorizado.', 401)

  const { data: membership, error: membershipError } = await supabase
    .from('room_members')
    .select('last_read_at')
    .eq('room_id', params.id)
    .eq('user_id', user.id)
    .single()

  if (membershipError) return apiError('No se pudo obtener el estado de lectura.', 500)

  const { data: messages, error: unreadError } = await supabase
    .from('chat_messages')
    .select('id')
    .eq('room_id', params.id)
    .gt('created_at', membership.last_read_at)
    .neq('user_id', user.id)

  if (unreadError) return apiError('No se pudo calcular no leídos.', 500)

  return NextResponse.json({ roomId: params.id, unread: messages.length })
}
