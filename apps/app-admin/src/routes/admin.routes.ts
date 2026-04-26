import { Router } from 'express'
import { createServiceClient } from '@emeet/shared/lib/supabase'
import { authMiddleware } from '@emeet/shared/middleware/auth'
import { badRequest, serverError, unauthorized } from '@emeet/shared/utils/http'

const router = Router()

// Middleware para verificar que sea admin
const adminMiddleware = (req: any, _res: any, next: any) => {
  if (!req.user || req.user.role !== 'admin') {
    throw new Error('No autorizado')
  }
  next()
}

// ─── Rutas de Usuarios ────────────────────────────────────────────────────

/**
 * GET /admin/users
 * Lista todos los usuarios del sistema
 */
router.get('/users', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const supabase = createServiceClient()
    
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) return serverError(res, error.message)

    return res.json({ users: data })
  } catch (err) {
    return serverError(res, (err as Error).message)
  }
})

/**
 * GET /admin/users/:id
 * Obtener un usuario específico
 */
router.get('/users/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { id } = req.params

    const supabase = createServiceClient()
    
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single()

    if (error) return badRequest(res, 'Usuario no encontrado')
    if (!data) return badRequest(res, 'Usuario no encontrado')

    return res.json({ user: data })
  } catch (err) {
    return serverError(res, (err as Error).message)
  }
})

/**
 * PUT /admin/users/:id
 * Actualizar un usuario
 */
router.put('/users/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { id } = req.params
    const { role, is_banned } = req.body

    const supabase = createServiceClient()
    
    const updates: any = {}
    if (role) updates.role = role
    if (is_banned !== undefined) updates.is_banned = is_banned

    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) return serverError(res, error.message)

    return res.json({ user: data, message: 'Usuario actualizado' })
  } catch (err) {
    return serverError(res, (err as Error).message)
  }
})

/**
 * DELETE /admin/users/:id
 * Eliminar un usuario
 */
router.delete('/users/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { id } = req.params

    const supabase = createServiceClient()
    
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', id)

    if (error) return serverError(res, error.message)

    return res.json({ message: 'Usuario eliminado correctamente' })
  } catch (err) {
    return serverError(res, (err as Error).message)
  }
})

// ─── Rutas de Eventos ─────────────────────────────────────────────────────

/**
 * GET /admin/events
 * Lista todos los eventos
 */
router.get('/events', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const supabase = createServiceClient()
    
    const { data, error } = await supabase
      .from('places')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) return serverError(res, error.message)

    return res.json({ events: data, total: data?.length ?? 0 })
  } catch (err) {
    return serverError(res, (err as Error).message)
  }
})

/**
 * DELETE /admin/events/:id
 * Eliminar un evento
 */
router.delete('/events/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { id } = req.params

    const supabase = createServiceClient()
    
    const { error } = await supabase
      .from('places')
      .delete()
      .eq('id', id)

    if (error) return serverError(res, error.message)

    return res.json({ message: 'Evento eliminado correctamente' })
  } catch (err) {
    return serverError(res, (err as Error).message)
  }
})

// ─── Rutas de Estadísticas ────────────────────────────────────────────────

/**
 * GET /admin/statistics
 * Obtener estadísticas del sistema
 */
router.get('/statistics', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const supabase = createServiceClient()

    // Total de usuarios
    const { count: totalUsers } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })

    // Total de eventos
    const { count: totalEvents } = await supabase
      .from('places')
      .select('*', { count: 'exact', head: true })

    // Total de likes
    const { count: totalLikes } = await supabase
      .from('likes')
      .select('*', { count: 'exact', head: true })

    // Usuarios banneados
    const { count: bannedUsers } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('is_banned', true)

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
