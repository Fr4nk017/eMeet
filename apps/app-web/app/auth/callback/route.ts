import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createSupabaseServerClient } from '../../../src/lib/supabase'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const redirectResponse = NextResponse.redirect(`${origin}${next}`)

    const supabase = createSupabaseServerClient({
      getAll: () => request.cookies.getAll().map((c) => ({ name: c.name, value: c.value })),
      setAll: (cookiesToSet) => {
        cookiesToSet.forEach(({ name, value, options }) => {
          redirectResponse.cookies.set(name, value, options)
        })
      },
    })

    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) return redirectResponse
  }

  return NextResponse.redirect(`${origin}/auth?error=oauth`)
}
