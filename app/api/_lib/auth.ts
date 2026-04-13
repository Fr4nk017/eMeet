import type { SupabaseClient, User } from '@supabase/supabase-js'
import type { NextRequest } from 'next/server'
import type { Database } from '../../../src/lib/supabase'

function readBearerToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) return null
  return authHeader.slice(7)
}

export async function getRequestUser(
  supabase: SupabaseClient<Database>,
  request: NextRequest,
): Promise<{ user: User | null; error: string | null }> {
  const bearerToken = readBearerToken(request)

  const { data, error } = bearerToken
    ? await supabase.auth.getUser(bearerToken)
    : await supabase.auth.getUser()

  if (error || !data.user) {
    return { user: null, error: 'No autorizado.' }
  }

  return { user: data.user, error: null }
}
