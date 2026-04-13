import type { NextRequest } from 'next/server'
import { getRequestUser } from '../../../_lib/auth'
import { apiError, createRouteSupabaseClient } from '../../../_lib/supabase'

export const runtime = 'nodejs'

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createRouteSupabaseClient(request)
  const { user, error } = await getRequestUser(supabase, request)

  if (error || !user) return apiError('No autorizado.', 401)

  const { error: deleteError } = await supabase
    .from('user_events')
    .delete()
    .eq('user_id', user.id)
    .eq('event_id', params.id)
    .eq('action', 'save')

  if (deleteError) return apiError('No se pudo eliminar el guardado.', 500)

  return new Response(null, { status: 204 })
}
