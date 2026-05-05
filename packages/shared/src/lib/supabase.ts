import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../types/supabase'

function getUrl(): string {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!url) throw new Error('Missing env var: define SUPABASE_URL in the Vercel project settings.')
  return url
}

function getAnonKey(): string {
  const key = process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!key) throw new Error('Missing env var: define SUPABASE_ANON_KEY in the Vercel project settings.')
  return key
}

export function createAnonClient(authToken?: string): SupabaseClient<Database> {
  return createClient<Database>(
    getUrl(),
    getAnonKey(),
    authToken ? { global: { headers: { Authorization: `Bearer ${authToken}` } } } : undefined,
  )
}

export function createServiceRoleClient(): SupabaseClient<Database> {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) throw new Error('Missing env var: define SUPABASE_SERVICE_ROLE_KEY in the Vercel project settings.')
  return createClient<Database>(getUrl(), key)
}
