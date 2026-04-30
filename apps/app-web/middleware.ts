import { NextResponse, type NextRequest } from 'next/server'
import { createSupabaseServerClient, hasSupabaseEnv } from './src/lib/supabase'

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL?.trim()

// Rutas que requieren sesión activa. El usuario sin sesión es redirigido a /auth.
const PROTECTED_ROUTES = ['/profile', '/chat', '/saved', '/search']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  let response = NextResponse.next({
    request: { headers: request.headers },
  })

  if (!hasSupabaseEnv) {
    return response
  }

  // En arquitectura frontend/backend separada, la sesión se gestiona en cliente
  // con Supabase JS y se envía por Bearer token al backend Express.
  // Evitamos forzar redirects server-side desde Next middleware.
  if (BACKEND_URL) {
    return response
  }

  const supabase = createSupabaseServerClient({
    getAll: () => request.cookies.getAll().map((c) => ({ name: c.name, value: c.value })),
    setAll: (cookiesToSet) => {
      cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
      response = NextResponse.next({ request: { headers: request.headers } })
      cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
    },
  })

  // getUser() valida el JWT contra Supabase y refresca la sesión si es necesario.
  // Si falla por error de red o timeout, dejamos pasar y el cliente maneja el auth.
  let user = null
  try {
    const { data } = await supabase.auth.getUser()
    user = data.user
  } catch {
    return response
  }

  const isProtected = PROTECTED_ROUTES.some((route) => pathname.startsWith(route))

  if (!user && isProtected) {
    const redirectUrl = new URL('/auth', request.url)
    redirectUrl.searchParams.set('next', pathname)
    return NextResponse.redirect(redirectUrl)
  }

  // Si ya tiene sesión y visita /auth, lo mandamos al home.
  if (user && pathname === '/auth') {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
