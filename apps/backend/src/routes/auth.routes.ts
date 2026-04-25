import { Router } from 'express'
import { createAnonClient } from '../lib/supabase'
import { badRequest, serverError } from '../utils/http'

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
      return res.status(429).json({ error: 'Demasiados intentos de inicio de sesión. Espera unos minutos e inténtalo de nuevo.' })
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

export default router
