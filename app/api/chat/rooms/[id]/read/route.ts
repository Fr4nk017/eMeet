import type { NextRequest } from 'next/server'
import { getRequestUser } from '../../../../_lib/auth'
import { apiError, createRouteSupabaseClient } from '../../../../_lib/supabase'

export const runtime = 'nodejs'

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createRouteSupabaseClient(request)
  const { user, error } = await getRequestUser(supabase, request)

  if (error || !user) return apiError('No autorizado.', 401)

  const { error: updateError } = await supabase
    .from('room_members')
    .update({ last_read_at: new Date().toISOString() })
    .eq('room_id', params.id)
    .eq('user_id', user.id)

  if (updateError) return apiError('No se pudo marcar como leído.', 500)

  return new Response(null, { status: 204 })
}
