import { Router } from 'express'
import { createAnonClient } from '@emeet/shared/lib/supabase'
import { badRequest, serverError } from '@emeet/shared/utils/http'

const router = Router()

router.post('/login', async (req, res) => {
  const { email, password } = req.body as { email?: string; password?: string }

  if (!email || !password) {
    return badRequest(res, 'Email y contraseña son obligatorios.')
  }

  const supabase = createAnonClient()
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    if (error.message.toLowerCase().includes('rate limit')) {
      return res.status(429).json({ error: 'Demasiados intentos. Espera unos minutos e inténtalo de nuevo.' })
    }
    return badRequest(res, error.message)
  }

  return res.json({ user: data.user, session: data.session })
})

router.post('/register', async (req, res) => {
  const { name, email, password, role, businessName, businessLocation } = req.body as {
    name?: string
    email?: string
    password?: string
    role?: 'user' | 'locatario' | 'admin'
    businessName?: string
    businessLocation?: string
  }

  if (!name || !email || !password) {
    return badRequest(res, 'Nombre, email y contraseña son obligatorios.')
  }

  if (password.length < 6) {
    return badRequest(res, 'La contraseña debe tener al menos 6 caracteres.')
  }

  const supabase = createAnonClient()
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        name,
        role: role ?? 'user',
        business_name: businessName ?? null,
        business_location: businessLocation ?? null,
      },
    },
  })

  if (error) {
    return badRequest(res, error.message)
  }

  return res.status(201).json({ user: data.user, session: data.session })
})

router.post('/logout', async (req, res) => {
  const rawAuth = req.headers.authorization
  const token = rawAuth?.startsWith('Bearer ') ? rawAuth.slice(7) : undefined

  const supabase = createAnonClient(token)
  const { error } = await supabase.auth.signOut()

  if (error) {
    return serverError(res, error.message)
  }

  return res.status(204).send()
})

router.get('/session', async (req, res) => {
  const rawAuth = req.headers.authorization
  const token = rawAuth?.startsWith('Bearer ') ? rawAuth.slice(7) : undefined

  if (!token) {
    return res.json({ session: null })
  }

  const supabase = createAnonClient(token)
  const { data, error } = await supabase.auth.getSession()

  if (error) {
    return serverError(res, error.message)
  }

  return res.json({ session: data.session })
})

router.get('/callback', async (req, res) => {
  const { code, token_hash: tokenHash, type, next } = req.query
  const frontendUrl = process.env.FRONTEND_ORIGIN || 'http://localhost:3000'

  // Helper para determinar ruta según rol
  function roleRedirectPath(user: any): string {
    const role =
      (user.app_metadata?.role as string | undefined) ??
      (user.user_metadata?.role as string | undefined) ??
      'user'

    if (role === 'locatario') return '/locatario'
    if (role === 'admin') return '/admin'
    return '/'
  }

  try {
    const supabase = createAnonClient()

    // ── Flujo OAuth: Supabase devuelve un `code` PKCE ─────────────────────────
    if (code) {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code as string)
      if (error || !data.user) {
        return res.redirect(`${frontendUrl}/auth?error=oauth_error`)
      }

      const redirectPath = roleRedirectPath(data.user)
      return res.redirect(
        `${frontendUrl}${redirectPath}?access_token=${encodeURIComponent(data.session?.access_token || '')}&refresh_token=${encodeURIComponent(data.session?.refresh_token || '')}`
      )
    }

    // ── Flujo confirmación de email: Supabase envía `token_hash` + `type` ──────
    if (tokenHash && type) {
      const { data, error } = await supabase.auth.verifyOtp({
        token_hash: tokenHash as string,
        type: type as 'signup' | 'email_change' | 'recovery',
      })
      if (error || !data.user) {
        return res.redirect(`${frontendUrl}/auth?error=verification_failed`)
      }

      const redirectPath = roleRedirectPath(data.user)
      return res.redirect(
        `${frontendUrl}${redirectPath}?access_token=${encodeURIComponent(data.session?.access_token || '')}&refresh_token=${encodeURIComponent(data.session?.refresh_token || '')}`
      )
    }

    return res.redirect(`${frontendUrl}/auth?error=missing_params`)
  } catch (error) {
    console.error('Auth callback error:', error)
    return res.redirect(`${frontendUrl}/auth?error=server_error`)
  }
})

export default router
