import { NextResponse, type NextRequest } from 'next/server'
import { createSupabaseServerClient, hasSupabaseEnv } from './src/lib/supabase'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  if (!hasSupabaseEnv) {
    return response
  }

  const supabase = createSupabaseServerClient({
    getAll: () => request.cookies.getAll().map((c) => ({ name: c.name, value: c.value })),
    setAll: (cookiesToSet) => {
      cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
      response = NextResponse.next({
        request: {
          headers: request.headers,
        },
      })
      cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
    },
  })

  await supabase.auth.getUser()

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
