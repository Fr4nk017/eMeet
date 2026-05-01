import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../types/supabase'

const SUPABASE_URL = (process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL)!
const SUPABASE_ANON_KEY = (process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)!

export function createAnonClient(authToken?: string): SupabaseClient<Database> {
  return createClient<Database>(
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    authToken ? { global: { headers: { Authorization: `Bearer ${authToken}` } } } : undefined,
  )
}

export function createServiceRoleClient(): SupabaseClient<Database> {
  return createClient<Database>(SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}
