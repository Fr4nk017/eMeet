import { NextResponse, type NextRequest } from 'next/server'
import { getRequestUser } from '../../_lib/auth'
import { apiError, createRouteSupabaseClient } from '../../_lib/supabase'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const supabase = createRouteSupabaseClient(request)
  const { user, error } = await getRequestUser(supabase, request)

  if (error || !user) return apiError('No autorizado.', 401)

  const { data, error: queryError } = await supabase
    .from('user_events')
    .select('*')
    .eq('user_id', user.id)
    .eq('action', 'save')
    .order('created_at', { ascending: false })

  if (queryError) return apiError('No se pudieron cargar los guardados.', 500)

  return NextResponse.json(data)
}
