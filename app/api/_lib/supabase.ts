import { createServerClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextResponse, type NextRequest } from 'next/server'
import type { Database } from '../../../src/lib/supabase'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

function isPlaceholder(value: string | undefined) {
  if (!value) return true
  const normalized = value.toLowerCase()
  return normalized.includes('placeholder') || normalized.includes('your_')
}

export function getSupabaseEnvErrorMessage(): string | null {
  if (isPlaceholder(supabaseUrl) || isPlaceholder(supabaseAnonKey)) {
    return 'Configuración inválida de Supabase. Define NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY en .env.local con valores reales.'
  }

  return null
}

export function createRouteSupabaseClient(request: NextRequest): SupabaseClient<Database> {
  const cookieStore = cookies()

  return createServerClient<Database>(
    supabaseUrl ?? 'https://placeholder.supabase.co',
    supabaseAnonKey ?? 'placeholder-anon-key',
    {
    cookies: {
      getAll() {
        return request.cookies.getAll().map((cookie) => ({
          name: cookie.name,
          value: cookie.value,
        }))
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          cookieStore.set(name, value, options)
        })
      },
    },
    }
  )
}

export function apiError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status })
}
