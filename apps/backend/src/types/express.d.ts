import type { SupabaseClient, User } from '@supabase/supabase-js'
import type { Database } from '../types/supabase'

declare global {
  namespace Express {
    interface Request {
      supabase?: SupabaseClient<Database>
      authUser?: User
    }
  }
}

export {}
