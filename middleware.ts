import { NextResponse, type NextRequest } from 'next/server'
import { createSupabaseServerClient, hasSupabaseEnv } from './src/lib/supabase'

// Rutas que requieren sesión activa (cualquier rol)
const AUTH_ROUTES = ['/profile', '/chat', '/saved', '/search']

// Rutas que requieren un rol específico
const ROLE_ROUTES: Record<string, 'admin' | 'locatario'> = {
  '/admin': 'admin',
  '/locatario': 'locatario',
}

function extractRole(user: { app_metadata?: Record<string, unknown>; user_metadata?: Record<string, unknown> }): string | undefined {
  return (
    (user.app_metadata?.role as string | undefined) ??
    (user.user_metadata?.role as string | undefined)
  )
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  let response = NextResponse.next({
    request: { headers: request.headers },
  })

  // Sin Supabase configurado no podemos validar sesión server-side
  if (!hasSupabaseEnv) return response

  const isAuthRoute = AUTH_ROUTES.some((r) => pathname.startsWith(r))
  const roleRouteKey = Object.keys(ROLE_ROUTES).find((r) => pathname.startsWith(r))
  const needsCheck = isAuthRoute || !!roleRouteKey || pathname === '/auth'

  // Optimización: rutas públicas no pasan por getUser()
  if (!needsCheck) return response

  const supabase = createSupabaseServerClient({
    getAll: () => request.cookies.getAll().map((c) => ({ name: c.name, value: c.value })),
    setAll: (cookiesToSet) => {
      cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
      response = NextResponse.next({ request: { headers: request.headers } })
      cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
    },
  })

  const { data: { user } } = await supabase.auth.getUser()

  // Sin sesión → redirigir a /auth si la ruta lo requiere
  if (!user) {
    if (isAuthRoute || roleRouteKey) {
      const redirectUrl = new URL('/auth', request.url)
      redirectUrl.searchParams.set('next', pathname)
      return NextResponse.redirect(redirectUrl)
    }
    return response
  }

  // Con sesión → verificar rol para rutas restringidas
  if (roleRouteKey) {
    const requiredRole = ROLE_ROUTES[roleRouteKey]
    const userRole = extractRole(user)

    // Admin puede acceder a todo; locatario solo a /locatario
    const allowed =
      userRole === 'admin' ||
      userRole === requiredRole

    if (!allowed) {
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  // Usuario autenticado que visita /auth → mandarlo al home
  if (pathname === '/auth') {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
