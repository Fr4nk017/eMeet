import { createClient } from '@supabase/supabase-js'

export function createAnonClient(authToken?: string) {
  const url = process.env.SUPABASE_URL!
  const key = process.env.SUPABASE_ANON_KEY!

  return createClient(
    url,
    key,
    authToken ? { global: { headers: { Authorization: `Bearer ${authToken}` } } } : undefined,
  )
}
