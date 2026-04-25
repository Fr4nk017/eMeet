import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { env } from '../config/env'
import type { Database } from '../types/supabase'

export function createAnonClient(authToken?: string): SupabaseClient<Database> {
  return createClient<Database>(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    global: authToken
      ? {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      : undefined,
  })
}

export function createServiceRoleClient(): SupabaseClient<Database> {
  return createClient<Database>(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
}
