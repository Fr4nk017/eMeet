import { randomUUID } from 'crypto'
import { Router, type Request, type Response, type NextFunction } from 'express'
import { withAuth } from '../../../../packages/shared/src/middleware/auth.js'
import { createServiceRoleClient } from '../../../../packages/shared/src/lib/supabase.js'
import { badRequest, serverError } from '../../../../packages/shared/src/utils/http.js'

const router = Router()

// ─── Service client (reusado entre requests) ──────────────────────────────────
const svc = createServiceRoleClient()

// ─── Helpers ──────────────────────────────────────────────────────────────────

function log(scope: string, msg: string, extra?: Record<string, unknown>) {
  const entry = { ts: new Date().toISOString(), service: 'app-chat', scope, msg, ...extra }
  console.log(JSON.stringify(entry))
}

// ─── POST /chat/cleanup ───────────────────────────────────────────────────────
// Job de limpieza: expira salas cuyo expires_at ya pasó.
// NO requiere auth de usuario. Protegido por X-Cleanup-Secret.
// DEBE estar antes de router.use(withAuth).

router.post('/cleanup', async (req, res) => {
  const secret = process.env.CLEANUP_SECRET
  if (secret && req.headers['x-cleanup-secret'] !== secret) {
    return res.status(401).json({ error: 'No autorizado.' })
  }

  const { data: expired, error } = await svc
    .from('chat_rooms')
    .update({ status: 'expired' })
    .eq('status', 'active')
    .lt('expires_at', new Date().toISOString())
    .select('id')

  if (error) {
    log('cleanup', 'Error al expirar salas', { code: error.code })
    return serverError(res, 'Error en cleanup de salas.')
  }

  const count = (expired ?? []).length
  log('cleanup', `Salas expiradas: ${count}`, { roomIds: (expired ?? []).map((r) => r.id) })

  return res.json({ ok: true, expired: count })
})

// ─── Auth (aplica a todas las rutas siguientes) ────────────────────────────────

router.use(withAuth)

// ─── Middlewares de sala ──────────────────────────────────────────────────────

/** Solo miembros de la sala pueden acceder. */
async function requireMember(req: Request, res: Response, next: NextFunction) {
  const roomId = req.params.id
  const userId = req.authUser!.id

  const { data, error } = await svc
    .from('room_members')
    .select('room_id')
    .eq('room_id', roomId)
    .eq('user_id', userId)
    .maybeSingle()

  if (error) return serverError(res, 'No se pudo verificar membresía.')
  if (!data) {
    log('requireMember', 'Acceso denegado a no-miembro', { roomId, userId })
    return res.status(403).json({ error: 'No eres miembro de esta sala.' })
  }

  next()
}

/** Solo salas activas admiten nuevos mensajes. */
async function requireActiveRoom(req: Request, res: Response, next: NextFunction) {
  const roomId = req.params.id

  const { data, error } = await svc
    .from('chat_rooms')
    .select('status, expires_at')
    .eq('id', roomId)
    .maybeSingle()

  if (error) return serverError(res, 'No se pudo verificar estado de la sala.')
  if (!data) return res.status(404).json({ error: 'Sala no encontrada.' })

  const pastExpiry = data.expires_at && new Date(data.expires_at) < new Date()
  if (data.status !== 'active' || pastExpiry) {
    return res.status(410).json({ error: 'Esta sala de chat ya está cerrada o expirada.' })
  }

  next()
}

// ─── GET /chat/rooms ──────────────────────────────────────────────────────────

router.get('/rooms', async (req, res) => {
  const userId = req.authUser!.id

  const { data: memberships, error: memberError } = await req.supabase!
    .from('room_members')
    .select('room_id, last_read_at')
    .eq('user_id', userId)

  if (memberError) return serverError(res, 'No se pudieron cargar las membresías de chat.')

  const roomIds = memberships.map((m) => m.room_id)
  if (roomIds.length === 0) return res.json([])

  const [
    { data: rooms, error: roomError },
    { data: messages, error: messageError },
    { data: membersCountRows, error: membersCountError },
  ] = await Promise.all([
    req.supabase!.from('chat_rooms').select('*').in('id', roomIds),
    req.supabase!
      .from('chat_messages')
      .select('id, room_id, user_id, text, created_at')
      .in('room_id', roomIds)
      .order('created_at', { ascending: false }),
    req.supabase!.from('room_members').select('room_id').in('room_id', roomIds),
  ])

  if (roomError || messageError || membersCountError) {
    return serverError(res, 'No se pudieron cargar las salas de chat.')
  }

  const memberCountMap = (membersCountRows ?? []).reduce<Record<string, number>>((acc, row) => {
    acc[row.room_id] = (acc[row.room_id] ?? 0) + 1
    return acc
  }, {})

  const lastMessageByRoom = new Map<string, (typeof messages)[number]>()
  ;(messages ?? []).forEach((msg) => {
    if (!lastMessageByRoom.has(msg.room_id)) lastMessageByRoom.set(msg.room_id, msg)
  })

  const result = (rooms ?? []).map((room) => {
    const lastReadAt = memberships.find((m) => m.room_id === room.id)?.last_read_at
    const unreadCount = (messages ?? []).filter(
      (msg) =>
        msg.room_id === room.id &&
        msg.created_at > (lastReadAt ?? '') &&
        msg.user_id !== userId,
    ).length

    return {
      id: room.id,
      eventTitle: room.event_title,
      eventImageUrl: room.event_image_url,
      eventAddress: room.event_address,
      status: room.status ?? 'active',
      expiresAt: room.expires_at ?? null,
      memberCount: memberCountMap[room.id] ?? 0,
      lastMessage: lastMessageByRoom.get(room.id) ?? null,
      unreadCount,
    }
  })

  return res.json(result)
})

// ─── POST /chat/rooms/:id/join ────────────────────────────────────────────────

router.post('/rooms/:id/join', async (req, res) => {
  const { id } = req.params
  const userId = req.authUser!.id
  const { eventTitle, eventImageUrl, eventAddress, expiresAt } = req.body as {
    eventTitle?: string
    eventImageUrl?: string
    eventAddress?: string
    expiresAt?: string
  }

  if (!eventTitle) return badRequest(res, 'eventTitle es obligatorio para crear/unir sala.')

  const { error: roomError } = await svc.from('chat_rooms').upsert(
    {
      id,
      event_title: eventTitle,
      event_image_url: eventImageUrl ?? null,
      event_address: eventAddress ?? null,
      expires_at: expiresAt ?? null,
      status: 'active',
    },
    { onConflict: 'id', ignoreDuplicates: true },
  )

  if (roomError) {
    log('join', 'Error al crear sala', {
      roomId: id,
      userId,
      code: roomError.code,
      message: roomError.message,
      details: roomError.details,
      hint: roomError.hint,
    })
    return serverError(res, 'No se pudo crear la sala.')
  }

  const now = new Date().toISOString()
  const { error: memberError } = await svc
    .from('room_members')
    .upsert(
      { room_id: id, user_id: userId, joined_at: now, last_read_at: now },
      { onConflict: 'room_id,user_id', ignoreDuplicates: true },
    )

  if (memberError) {
    log('join', 'Error al unir miembro', { roomId: id, userId, code: memberError.code })
    return serverError(res, 'No se pudo unir al chat.')
  }

  log('join', 'Usuario unido a sala', { roomId: id, userId })
  return res.status(201).json({ ok: true })
})

// ─── DELETE /chat/rooms/:id/leave ────────────────────────────────────────────

router.delete('/rooms/:id/leave', requireMember, async (req, res) => {
  const { id } = req.params
  const userId = req.authUser!.id

  const { error } = await svc
    .from('room_members')
    .delete()
    .eq('room_id', id)
    .eq('user_id', userId)

  if (error) {
    log('leave', 'Error al salir de sala', { roomId: id, userId, code: error.code })
    return serverError(res, 'No se pudo salir del chat.')
  }

  log('leave', 'Usuario salió de sala', { roomId: id, userId })

  // Si no quedan miembros, marcar la sala como deleted
  const { count, error: countError } = await svc
    .from('room_members')
    .select('*', { count: 'exact', head: true })
    .eq('room_id', id)

  if (!countError && (count ?? 0) === 0) {
    await svc.from('chat_rooms').update({ status: 'deleted' }).eq('id', id)
    log('leave', 'Sala eliminada por quedar vacía', { roomId: id })
  }

  return res.status(204).send()
})

// ─── GET /chat/rooms/:id/members ────────────────────────────────────────────

router.get('/rooms/:id/members', requireMember, async (req, res) => {
  const { id } = req.params

  const { data: memberRows, error } = await svc
    .from('room_members')
    .select('user_id, joined_at')
    .eq('room_id', id)

  if (error) return serverError(res, 'No se pudieron obtener los miembros.')

  const userIds = memberRows.map((r) => r.user_id)
  if (userIds.length === 0) return res.json([])

  const { data: profiles, error: profileError } = await svc
    .from('profiles')
    .select('id, name, avatar_url')
    .in('id', userIds)

  if (profileError) return serverError(res, 'No se pudieron cargar perfiles de miembros.')

  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]))

  const members = memberRows.map((row) => {
    const profile = profileMap.get(row.user_id)
    return {
      userId: row.user_id,
      name: profile?.name ?? 'Usuario',
      avatarUrl: profile?.avatar_url ?? null,
      joinedAt: row.joined_at,
    }
  })

  return res.json(members)
})

// ─── GET /chat/rooms/:id/messages ────────────────────────────────────────────

router.get('/rooms/:id/messages', requireMember, async (req, res) => {
  const { id } = req.params
  const limit = Math.min(Number(req.query.limit) || 50, 100)
  const before = typeof req.query.before === 'string' ? req.query.before : undefined

  const baseQuery = req.supabase!
    .from('chat_messages')
    .select('id, room_id, user_id, text, created_at')
    .eq('room_id', id)
    .order('created_at', { ascending: false })
    .limit(limit)

  const { data, error } = await (before ? baseQuery.lt('created_at', before) : baseQuery)

  if (error) return serverError(res, 'No se pudieron obtener los mensajes.')

  // Re-order to chronological (ascending) for the client
  const chronological = (data ?? []).reverse()

  const senderIds = Array.from(new Set(chronological.map((row) => row.user_id)))
  let profileMap = new Map<string, { id: string; name: string; avatar_url: string | null }>()

  if (senderIds.length > 0) {
    const { data: profiles, error: profileError } = await svc
      .from('profiles')
      .select('id, name, avatar_url')
      .in('id', senderIds)

    if (profileError) return serverError(res, 'No se pudieron cargar los perfiles de chat.')
    profileMap = new Map((profiles ?? []).map((p) => [p.id, p]))
  }

  const messages = chronological.map((row) => {
    const sender = profileMap.get(row.user_id)
    return {
      id: row.id,
      roomId: row.room_id,
      senderId: row.user_id,
      senderName: sender?.name ?? 'Usuario',
      senderAvatar: sender?.avatar_url ?? null,
      text: row.text,
      timestamp: row.created_at,
    }
  })

  return res.json(messages)
})

// ─── POST /chat/rooms/:id/messages ───────────────────────────────────────────

router.post('/rooms/:id/messages', requireMember, requireActiveRoom, async (req, res) => {
  const { id } = req.params
  const userId = req.authUser!.id
  const { text } = req.body as { text?: string }

  if (!text || !text.trim()) return badRequest(res, 'El mensaje no puede estar vacío.')

  const { data, error } = await svc
    .from('chat_messages')
    .insert({
      id: randomUUID(),
      room_id: id,
      user_id: userId,
      text: text.trim(),
      created_at: new Date().toISOString(),
    })
    .select('*')
    .single()

  if (error) {
    log('sendMessage', 'Error al enviar mensaje', { roomId: id, userId, code: error.code })
    return serverError(res, 'No se pudo enviar el mensaje.')
  }

  return res.status(201).json(data)
})

// ─── POST /chat/rooms/:id/read ───────────────────────────────────────────────

router.post('/rooms/:id/read', requireMember, async (req, res) => {
  const { id } = req.params
  const userId = req.authUser!.id

  const { error } = await req.supabase!
    .from('room_members')
    .update({ last_read_at: new Date().toISOString() })
    .eq('room_id', id)
    .eq('user_id', userId)

  if (error) return serverError(res, 'No se pudo actualizar el estado de lectura.')

  return res.status(204).send()
})

// ─── GET /chat/rooms/:id/unread ──────────────────────────────────────────────

router.get('/rooms/:id/unread', requireMember, async (req, res) => {
  const { id } = req.params
  const userId = req.authUser!.id

  const { data: membership, error: memberError } = await req.supabase!
    .from('room_members')
    .select('last_read_at')
    .eq('room_id', id)
    .eq('user_id', userId)
    .single()

  if (memberError) return serverError(res, 'No se pudo obtener estado de lectura.')

  const { data: messages, error: unreadError } = await req.supabase!
    .from('chat_messages')
    .select('id')
    .eq('room_id', id)
    .gt('created_at', membership.last_read_at)
    .neq('user_id', userId)

  if (unreadError) return serverError(res, 'No se pudo calcular mensajes no leídos.')

  return res.json({ roomId: id, unread: (messages ?? []).length })
})

// ─── GET /chat/unread ────────────────────────────────────────────────────────

router.get('/unread', async (req, res) => {
  const userId = req.authUser!.id

  const { data: memberships, error: membershipError } = await req.supabase!
    .from('room_members')
    .select('room_id, last_read_at')
    .eq('user_id', userId)

  if (membershipError) return serverError(res, 'No se pudo obtener membresías para no leídos.')

  const roomIds = memberships.map((m) => m.room_id)
  if (roomIds.length === 0) return res.json([])

  const { data: messages, error: messagesError } = await req.supabase!
    .from('chat_messages')
    .select('id, room_id, user_id, created_at')
    .in('room_id', roomIds)
    .neq('user_id', userId)

  if (messagesError) return serverError(res, 'No se pudieron calcular no leídos.')

  const unreadByRoom = roomIds.reduce<Record<string, number>>((acc, roomId) => {
    const lastRead = memberships.find((m) => m.room_id === roomId)?.last_read_at ?? ''
    acc[roomId] = (messages ?? []).filter(
      (msg) => msg.room_id === roomId && msg.created_at > lastRead,
    ).length
    return acc
  }, {})

  return res.json(Object.entries(unreadByRoom).map(([roomId, unread]) => ({ roomId, unread })))
})

export default router
