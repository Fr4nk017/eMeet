import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

function buildSupabase(cookieStore: ReturnType<typeof cookies>) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        },
      },
    },
  )
}

function roleRedirectPath(user: { app_metadata?: Record<string, unknown>; user_metadata?: Record<string, unknown> }, fallback: string): string {
  const role =
    (user.app_metadata?.role as string | undefined) ??
    (user.user_metadata?.role as string | undefined) ??
    'user'

  if (role === 'locatario') return '/locatario'
  if (role === 'admin') return '/admin'
  return fallback.startsWith('/') ? fallback : '/'
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const next = searchParams.get('next') ?? '/'
  const cookieStore = cookies()
  const supabase = buildSupabase(cookieStore)

  // ── Flujo OAuth: Supabase devuelve un `code` PKCE ─────────────────────────
  const code = searchParams.get('code')
  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    if (error || !data.user) {
      return NextResponse.redirect(`${origin}/auth?error=oauth_error`)
    }
    return NextResponse.redirect(`${origin}${roleRedirectPath(data.user, next)}`)
  }

  // ── Flujo confirmación de email: Supabase envía `token_hash` + `type` ──────
  const tokenHash = searchParams.get('token_hash')
  const type = searchParams.get('type') as 'signup' | 'email_change' | 'recovery' | null
  if (tokenHash && type) {
    const { data, error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
    if (error || !data.user) {
      return NextResponse.redirect(`${origin}/auth?error=verification_failed`)
    }
    // Tras confirmar, redirigir al home (ya tiene sesión)
    return NextResponse.redirect(`${origin}${roleRedirectPath(data.user, '/')}`)
  }

  return NextResponse.redirect(`${origin}/auth?error=missing_params`)
}
