import { Router } from 'express'
import { createServiceRoleClient } from '../../../../packages/shared/src/lib/supabase'
import { withAuth } from '../../../../packages/shared/src/middleware/auth'
import { serverError } from '../../../../packages/shared/src/utils/http'

const router = Router()

const adminOnly = async (req: any, res: any, next: any) => {
  if (!req.authUser) return res.status(401).json({ error: 'No autorizado' })

  // Primero revisar el metadata del token (app_metadata > user_metadata)
  const metaRole =
    req.authUser.app_metadata?.role ??
    req.authUser.user_metadata?.role

  console.log('[adminOnly] user:', req.authUser.id, '| app_metadata:', JSON.stringify(req.authUser.app_metadata), '| user_metadata:', JSON.stringify(req.authUser.user_metadata))

  if (metaRole === 'admin') return next()

  // Fallback: consultar la tabla profiles
  try {
    const supabase = createServiceRoleClient()
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', req.authUser.id)
      .single()

    if (profile?.role === 'admin') return next()

    return res.status(403).json({ error: 'Acceso denegado' })
  } catch {
    return res.status(403).json({ error: 'Acceso denegado' })
  }
}

// ─── Usuarios ─────────────────────────────────────────────────────────────────

router.get('/users', withAuth, adminOnly, async (_req, res) => {
  try {
    const supabase = createServiceRoleClient()

    const [{ data: profiles, error: profilesError }, { data: authData }] = await Promise.all([
      supabase.from('profiles').select('*').order('created_at', { ascending: false }),
      supabase.auth.admin.listUsers({ perPage: 1000 }),
    ])

    if (profilesError) return serverError(res, profilesError.message)

    const emailMap = new Map<string, string>(
      (authData?.users ?? []).map((u) => [u.id, u.email ?? ''])
    )

    const users = (profiles ?? []).map((p) => ({
      id: p.id,
      name: p.name,
      email: emailMap.get(p.id) ?? '',
      role: p.role ?? 'user',
      is_banned: (p as any).is_banned ?? false,
      created_at: p.created_at,
    }))

    return res.json({ users })
  } catch (err) {
    return serverError(res, (err as Error).message)
  }
})

router.get('/users/:id', withAuth, adminOnly, async (req, res) => {
  try {
    const { id } = req.params
    const supabase = createServiceRoleClient()

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !data) return res.status(404).json({ error: 'Usuario no encontrado' })

    return res.json({ user: data })
  } catch (err) {
    return serverError(res, (err as Error).message)
  }
})

router.put('/users/:id', withAuth, adminOnly, async (req, res) => {
  try {
    const { id } = req.params
    const { role, is_banned } = req.body
    const supabase = createServiceRoleClient()

    const updates: Record<string, unknown> = {}
    if (role !== undefined) updates.role = role
    if (is_banned !== undefined) updates.is_banned = is_banned

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No hay campos para actualizar' })
    }

    const { data, error } = await supabase
      .from('profiles')
      .update(updates as any)
      .eq('id', id)
      .select()
      .single()

    if (error) return serverError(res, error.message)

    return res.json({ user: data, message: 'Usuario actualizado' })
  } catch (err) {
    return serverError(res, (err as Error).message)
  }
})

router.delete('/users/:id', withAuth, adminOnly, async (req, res) => {
  try {
    const { id } = req.params
    const supabase = createServiceRoleClient()

    const { error } = await supabase.from('profiles').delete().eq('id', id)

    if (error) return serverError(res, error.message)

    return res.json({ message: 'Usuario eliminado correctamente' })
  } catch (err) {
    return serverError(res, (err as Error).message)
  }
})

// ─── Eventos ──────────────────────────────────────────────────────────────────

router.get('/events', withAuth, adminOnly, async (_req, res) => {
  try {
    const supabase = createServiceRoleClient()

    const { data, error } = await supabase
      .from('locatario_events')
      .select('id, title, description, address, event_date, organizer_name, created_at')
      .order('created_at', { ascending: false })

    if (error) return serverError(res, error.message)

    const events = (data ?? []).map((e) => ({
      id: e.id,
      title: e.title,
      description: e.description ?? '',
      location: e.address ?? '',
      date: e.event_date,
      created_by: e.organizer_name ?? '',
      created_at: e.created_at,
    }))

    return res.json({ events, total: events.length })
  } catch (err) {
    return serverError(res, (err as Error).message)
  }
})

router.delete('/events/:id', withAuth, adminOnly, async (req, res) => {
  try {
    const { id } = req.params
    const supabase = createServiceRoleClient()

    const { error } = await supabase.from('locatario_events').delete().eq('id', id)

    if (error) return serverError(res, error.message)

    return res.json({ message: 'Evento eliminado correctamente' })
  } catch (err) {
    return serverError(res, (err as Error).message)
  }
})

// ─── Estadísticas ─────────────────────────────────────────────────────────────

router.get('/statistics', withAuth, adminOnly, async (_req, res) => {
  try {
    const supabase = createServiceRoleClient()

    const [
      { count: totalUsers },
      { count: totalEvents },
      { count: totalLikes },
      { count: bannedUsers },
    ] = await Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('locatario_events').select('*', { count: 'exact', head: true }),
      supabase.from('user_events').select('*', { count: 'exact', head: true }).eq('action', 'like'),
      supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('is_banned' as any, true),
    ])

    return res.json({
      statistics: {
        totalUsers: totalUsers ?? 0,
        totalEvents: totalEvents ?? 0,
        totalLikes: totalLikes ?? 0,
        bannedUsers: bannedUsers ?? 0,
        timestamp: new Date().toISOString(),
      },
    })
  } catch (err) {
    return serverError(res, (err as Error).message)
  }
})

export default router
