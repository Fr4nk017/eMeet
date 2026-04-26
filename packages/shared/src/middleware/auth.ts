import type { NextFunction, Request, Response } from 'express'
import { createAnonClient } from '../lib/supabase'
import { unauthorized } from '../utils/http'

export async function withAuth(req: Request, res: Response, next: NextFunction) {
  const rawAuth = req.headers.authorization
  const token = rawAuth?.startsWith('Bearer ') ? rawAuth.slice(7) : null

  if (!token) {
    return unauthorized(res, 'Falta token de autorización.')
  }

  const supabase = createAnonClient(token)
  const { data, error } = await supabase.auth.getUser()

  if (error || !data.user) {
    return unauthorized(res, 'Sesión inválida o expirada.')
  }

  req.supabase = supabase
  req.authUser = data.user
  next()
}
