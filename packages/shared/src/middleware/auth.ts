import type { User } from '@supabase/supabase-js'
import type { NextFunction, Request, Response } from 'express'
import { createAnonClient, createServiceRoleClient } from '../lib/supabase'
import { unauthorized, serverError } from '../utils/http'

const AUTH_CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes
const authCache = new Map<string, { user: User; expiresAt: number }>()

export async function withAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const rawAuth = req.headers.authorization
    const token = rawAuth?.startsWith('Bearer ') ? rawAuth.slice(7) : null

    if (!token) {
      return unauthorized(res, 'Falta token de autorización.')
    }

    const cached = authCache.get(token)
    if (cached && cached.expiresAt > Date.now()) {
      const { data: profile } = await createServiceRoleClient()
        .from('profiles')
        .select('is_banned')
        .eq('id', cached.user.id)
        .single()

      if ((profile as any)?.is_banned) {
        authCache.delete(token)
        return unauthorized(res, 'Cuenta suspendida.')
      }

      req.supabase = createAnonClient(token)
      req.authUser = cached.user
      return next()
    }

    const supabase = createAnonClient(token)
    const { data, error } = await supabase.auth.getUser()

    if (error || !data.user) {
      return unauthorized(res, 'Sesión inválida o expirada.')
    }

    authCache.set(token, { user: data.user, expiresAt: Date.now() + AUTH_CACHE_TTL_MS })
    req.supabase = supabase
    req.authUser = data.user
    next()
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error interno de autenticación.'
    console.error('[withAuth] fatal:', message)
    return serverError(res, message)
  }
}
