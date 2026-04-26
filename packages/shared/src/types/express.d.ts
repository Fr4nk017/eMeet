import type { User, SupabaseClient } from '@supabase/supabase-js'
import type { Database } from './supabase'

declare global {
  namespace Express {
    interface Request {
      supabase?: SupabaseClient<Database>
      authUser?: User
    }
  }
}
