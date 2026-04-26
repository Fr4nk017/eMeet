import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../types/supabase'

export function createAnonClient(authToken?: string): SupabaseClient<Database> {
  const url = process.env.SUPABASE_URL!
  const key = process.env.SUPABASE_ANON_KEY!
  return createClient<Database>(
    url,
    key,
    authToken ? { global: { headers: { Authorization: `Bearer ${authToken}` } } } : undefined,
  )
}

export function createServiceRoleClient(): SupabaseClient<Database> {
  return createClient<Database>(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}
