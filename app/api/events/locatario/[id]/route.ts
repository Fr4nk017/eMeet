import { NextResponse, type NextRequest } from 'next/server'
import { getRequestUser } from '../../../_lib/auth'
import { apiError, createRouteSupabaseClient } from '../../../_lib/supabase'

export const runtime = 'nodejs'

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const supabase = createRouteSupabaseClient(request)
  const { user, error } = await getRequestUser(supabase, request)

  if (error || !user) return apiError('No autorizado.', 401)

  const { error: dbError } = await supabase
    .from('locatario_events')
    .delete()
    .eq('id', params.id)
    .eq('creator_id', user.id)

  if (dbError) return apiError('No se pudo eliminar el evento.', 500)

  return new NextResponse(null, { status: 204 })
}
