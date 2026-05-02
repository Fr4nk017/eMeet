import { Router } from 'express'
import { createHash } from 'node:crypto'
import { withAuth } from '../../../../packages/shared/src/middleware/auth.js'
import { createServiceRoleClient } from '../../../../packages/shared/src/lib/supabase.js'
import { badRequest, serverError } from '../../../../packages/shared/src/utils/http.js'

type RedisLikeEvent = {
  id: string
  type: string
  lat: number
  lng: number
  distance: number
}

type RedisTools = {
  cacheLikedEvent: (userId: string, event: RedisLikeEvent) => Promise<void>
  generateRecommendations: (
    userId: string,
    availableEvents: RedisLikeEvent[],
    limit?: number,
  ) => Promise<Array<RedisLikeEvent & { similarity: number }>>
}

let redisToolsPromise: Promise<RedisTools | null> | null = null

async function getRedisTools(): Promise<RedisTools | null> {
  if (!redisToolsPromise) {
    redisToolsPromise = import('@emeet/redis')
      .then((mod) => ({
        cacheLikedEvent: mod.cacheLikedEvent,
        generateRecommendations: mod.generateRecommendations,
      }))
      .catch((err) => {
        logSupabaseError('redis module load', err)
        return null
      })
  }

  return redisToolsPromise
}

const router = Router()

router.use(withAuth)

async function ensureProfile(req: Parameters<typeof router.post>[1] extends (...args: infer T) => any ? T[0] : never) {
  const roleFromMetadata =
    req.authUser?.user_metadata?.role === 'admin' ||
    req.authUser?.user_metadata?.role === 'locatario' ||
    req.authUser?.user_metadata?.role === 'user'
      ? req.authUser.user_metadata.role
      : 'user'

  const nameFromMetadata =
    typeof req.authUser?.user_metadata?.name === 'string'
      ? req.authUser.user_metadata.name
      : undefined

  const locationFromMetadata =
    typeof req.authUser?.user_metadata?.business_location === 'string'
      ? req.authUser.user_metadata.business_location
      : typeof req.authUser?.user_metadata?.location === 'string'
        ? req.authUser.user_metadata.location
        : null

  const fallbackName = req.authUser?.email?.split('@')[0] ?? 'usuario'

  const basePayload = {
    id: req.authUser!.id,
    name: (nameFromMetadata ?? fallbackName).trim() || 'usuario',
    bio: '',
    // Mantener payload compatible con el schema actual de profiles.
    location: locationFromMetadata ?? 'Santiago, Chile',
  }

  const { error } = await createServiceRoleClient()
    .from('profiles')
    .upsert(basePayload, { onConflict: 'id' })

  if (!error) return null

  // Compatibilidad con ambientes donde profiles aun exige columnas legacy.
  const legacyPayload = {
    ...basePayload,
    role: roleFromMetadata,
    business_name: roleFromMetadata === 'locatario'
      ? typeof req.authUser?.user_metadata?.business_name === 'string'
        ? req.authUser.user_metadata.business_name
        : null
      : null,
    business_location: roleFromMetadata === 'locatario'
      ? locationFromMetadata
      : null,
  }

  const { error: legacyError } = await createServiceRoleClient()
    .from('profiles')
    .upsert(legacyPayload, { onConflict: 'id' })

  return legacyError
}

function logSupabaseError(scope: string, error: unknown) {
  try {
    console.error(`[app-saved] ${scope}`, JSON.stringify(error, null, 2))
  } catch {
    console.error(`[app-saved] ${scope}`, error)
  }
}

function asStableUuid(value: string): string {
  const hex = createHash('md5').update(value).digest('hex')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`
}

function shouldFallbackToUuid(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false

  const maybeError = error as { code?: string; message?: string; details?: string }
  const message = `${maybeError.message ?? ''} ${maybeError.details ?? ''}`.toLowerCase()

  return maybeError.code === '22P02' || message.includes('uuid')
}

async function writeUserEvent(
  req: Parameters<typeof router.post>[1] extends (...args: infer T) => any ? T[0] : never,
  payload: {
    eventId: string
    eventTitle: string
    eventImageUrl?: string
    eventAddress?: string
    action: 'like' | 'save'
  },
) {
  const insertRow = async (eventId: string) => {
    const { error: deleteError } = await createServiceRoleClient()
      .from('user_events')
      .delete()
      .eq('user_id', req.authUser!.id)
      .eq('event_id', eventId)
      .eq('action', payload.action)

    if (deleteError) {
      return deleteError
    }

    const { error: insertError } = await createServiceRoleClient()
      .from('user_events')
      .insert({
        user_id: req.authUser!.id,
        event_id: eventId,
        event_title: payload.eventTitle,
        event_image_url: payload.eventImageUrl ?? null,
        event_address: payload.eventAddress ?? null,
        action: payload.action,
        created_at: new Date().toISOString(),
      })

    return insertError
  }

  const firstTryError = await insertRow(payload.eventId)
  if (!firstTryError) return null

  if (!shouldFallbackToUuid(firstTryError)) {
    return firstTryError
  }

  // Compatibilidad con instalaciones antiguas donde event_id se definio como UUID.
  return insertRow(asStableUuid(payload.eventId))
}

async function deleteUserEvent(
  req: Parameters<typeof router.post>[1] extends (...args: infer T) => any ? T[0] : never,
  payload: { eventId: string; action: 'like' | 'save' },
) {
  const runDelete = async (eventId: string) => {
    const { error } = await createServiceRoleClient()
      .from('user_events')
      .delete()
      .eq('user_id', req.authUser!.id)
      .eq('event_id', eventId)
      .eq('action', payload.action)

    return error
  }

  const firstTryError = await runDelete(payload.eventId)
  if (!firstTryError) return null

  if (!shouldFallbackToUuid(firstTryError)) {
    return firstTryError
  }

  return runDelete(asStableUuid(payload.eventId))
}

async function ensureRoomMember(
  req: Parameters<typeof router.post>[1] extends (...args: infer T) => any ? T[0] : never,
  roomId: string,
) {
  const { error: deleteError } = await createServiceRoleClient()
    .from('room_members')
    .delete()
    .eq('room_id', roomId)
    .eq('user_id', req.authUser!.id)

  if (deleteError) {
    return deleteError
  }

  const now = new Date().toISOString()
  const { error: insertError } = await createServiceRoleClient()
    .from('room_members')
    .insert({ room_id: roomId, user_id: req.authUser!.id, joined_at: now, last_read_at: now })

  return insertError
}

router.post('/like', async (req, res) => {
  const { eventId, eventTitle, eventImageUrl, eventAddress, eventType, eventLat, eventLng, eventDistance } = req.body as {
    eventId?: string
    eventTitle?: string
    eventImageUrl?: string
    eventAddress?: string
    eventType?: string
    eventLat?: number
    eventLng?: number
    eventDistance?: number
  }

  if (!eventId || !eventTitle) {
    return badRequest(res, 'eventId y eventTitle son obligatorios.')
  }

  const profileError = await ensureProfile(req)
  if (profileError) {
    logSupabaseError('ensureProfile /like', profileError)
    return res.status(500).json({
      error: 'No se pudo preparar el perfil del usuario para registrar el like.',
      debug: { step: 'ensureProfile', code: (profileError as any).code, message: (profileError as any).message, details: (profileError as any).details, hint: (profileError as any).hint },
    })
  }

  const likeError = await writeUserEvent(req, {
    eventId,
    eventTitle,
    eventImageUrl,
    eventAddress,
    action: 'like',
  })

  if (likeError) {
    logSupabaseError('upsert user_events /like', likeError)
    return res.status(500).json({
      error: 'No se pudo registrar el like.',
      debug: { step: 'writeUserEvent', code: (likeError as any).code, message: (likeError as any).message, details: (likeError as any).details, hint: (likeError as any).hint },
    })
  }

  // Crea sala de chat para el evento si no existe.
  // Si esta parte falla, no se cae el like: el objetivo principal ya se persistio.
  let chatLinked = true

  const { error: roomError } = await createServiceRoleClient()
    .from('chat_rooms')
    .upsert(
      {
        id: eventId,
        event_title: eventTitle,
        event_image_url: eventImageUrl ?? null,
        event_address: eventAddress ?? null,
        created_at: new Date().toISOString(),
      },
      { onConflict: 'id' },
    )

  if (roomError) {
    logSupabaseError('upsert chat_rooms /like', roomError)
    chatLinked = false
  }

  if (chatLinked) {
    const memberError = await ensureRoomMember(req, eventId)

    if (memberError) {
      logSupabaseError('upsert room_members /like', memberError)
      chatLinked = false
    }
  }

  // Cache el like en Redis para recomendaciones
  if (eventLat != null && eventLng != null && eventDistance != null && eventType) {
    const redisTools = await getRedisTools()

    if (redisTools) {
      await redisTools.cacheLikedEvent(req.authUser!.id, {
        id: eventId,
        type: eventType,
        lat: eventLat,
        lng: eventLng,
        distance: eventDistance,
      }).catch(err => {
        logSupabaseError('cacheLikedEvent', err)
        // No es crítico, continúa
      })
    }
  }

  return res.status(201).json({ ok: true, chatLinked })
})

router.post('/save', async (req, res) => {
  const { eventId, eventTitle, eventImageUrl, eventAddress } = req.body as {
    eventId?: string
    eventTitle?: string
    eventImageUrl?: string
    eventAddress?: string
  }

  if (!eventId || !eventTitle) {
    return badRequest(res, 'eventId y eventTitle son obligatorios.')
  }

  const profileError = await ensureProfile(req)
  if (profileError) {
    logSupabaseError('ensureProfile /save', profileError)
    return serverError(res, 'No se pudo preparar el perfil del usuario para guardar el evento.')
  }

  const error = await writeUserEvent(req, {
    eventId,
    eventTitle,
    eventImageUrl,
    eventAddress,
    action: 'save',
  })

  if (error) {
    logSupabaseError('upsert user_events /save', error)
    return serverError(res, 'No se pudo guardar el evento.')
  }

  return res.status(201).json({ ok: true })
})

router.delete('/like/:id', async (req, res) => {
  const { id } = req.params

  const error = await deleteUserEvent(req, { eventId: id, action: 'like' })

  if (error) {
    logSupabaseError('delete user_events /like/:id', error)
    return serverError(res, 'No se pudo eliminar el like.')
  }

  return res.status(204).send()
})

router.delete('/save/:id', async (req, res) => {
  const { id } = req.params

  const error = await deleteUserEvent(req, { eventId: id, action: 'save' })

  if (error) {
    logSupabaseError('delete user_events /save/:id', error)
    return serverError(res, 'No se pudo eliminar el guardado.')
  }

  return res.status(204).send()
})

router.get('/liked', async (req, res) => {
  const { data, error } = await createServiceRoleClient()
    .from('user_events')
    .select('*')
    .eq('user_id', req.authUser!.id)
    .eq('action', 'like')
    .order('created_at', { ascending: false })

  if (error) {
    logSupabaseError('select user_events /liked', error)
    return serverError(res, 'No se pudieron obtener los likes.')
  }

  return res.json(data)
})

router.get('/saved', async (req, res) => {
  const { data, error } = await createServiceRoleClient()
    .from('user_events')
    .select('*')
    .eq('user_id', req.authUser!.id)
    .eq('action', 'save')
    .order('created_at', { ascending: false })

  if (error) {
    logSupabaseError('select user_events /saved', error)
    return serverError(res, 'No se pudieron obtener los guardados.')
  }

  return res.json(data)
})

// Endpoint de diagnóstico — SOLO desarrollo, remover antes de producción.
router.get('/debug/test', async (req, res) => {
  const userId = req.authUser?.id
  const results: Record<string, unknown> = { userId }

  // 1. Probar upsert de perfil
  const profilePayload = {
    id: userId!,
    name: req.authUser?.email?.split('@')[0] ?? 'test',
    bio: '',
    location: 'Santiago, Chile',
  }
  const { error: profileErr } = await createServiceRoleClient()
    .from('profiles')
    .upsert(profilePayload, { onConflict: 'id' })
  results.profileUpsert = profileErr
    ? { code: (profileErr as any).code, message: profileErr.message, details: (profileErr as any).details, hint: (profileErr as any).hint }
    : 'ok'

  // 2. Probar insert en user_events con un event_id de prueba
  const testEventId = 'debug-test-' + Date.now()
  const { error: eventErr } = await createServiceRoleClient()
    .from('user_events')
    .insert({ user_id: userId!, event_id: testEventId, event_title: 'Debug Test', action: 'like' })
  results.userEventInsert = eventErr
    ? { code: (eventErr as any).code, message: eventErr.message, details: (eventErr as any).details, hint: (eventErr as any).hint }
    : 'ok'

  // Limpiar la fila de test
  if (!eventErr) {
    await createServiceRoleClient().from('user_events').delete().eq('event_id', testEventId).eq('user_id', userId!)
  }

  return res.json(results)
})

/**
 * POST /recommendations
 * Genera recomendaciones basadas en likes anteriores del usuario
 * Body: { availableEvents: Array<{ id, type, lat, lng, distance }>, limit?: number }
 */
router.post('/recommendations', async (req, res) => {
  const { availableEvents, limit = 5 } = req.body as {
    availableEvents?: Array<{ id: string; type: string; lat: number; lng: number; distance: number }>
    limit?: number
  }

  if (!availableEvents || !Array.isArray(availableEvents)) {
    return badRequest(res, 'availableEvents debe ser un array.')
  }

  try {
    const userId = req.authUser?.id
    if (!userId) {
      return res.status(401).json({ error: 'Usuario no autenticado.' })
    }

    const redisTools = await getRedisTools()
    const recommendations = redisTools
      ? await redisTools.generateRecommendations(userId, availableEvents, Math.min(limit, 10))
      : availableEvents.slice(0, Math.min(limit, 10)).map((event) => ({ ...event, similarity: 0 }))

    return res.json({
      recommendations,
      count: recommendations.length,
    })
  } catch (err) {
    logSupabaseError('POST /recommendations', err)
    return serverError(res, 'Error generando recomendaciones.')
  }
})

export default router
