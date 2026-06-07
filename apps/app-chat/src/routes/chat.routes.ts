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

/**
 * @openapi
 * /chat/cleanup:
 *   post:
 *     tags: [Sistema]
 *     summary: Job de limpieza de salas expiradas
 *     description: Expira salas cuyo `expires_at` ya pasó. Protegido por header `X-Cleanup-Secret`. No requiere token de usuario.
 *     security: []
 *     parameters:
 *       - in: header
 *         name: X-Cleanup-Secret
 *         schema:
 *           type: string
 *         description: Clave secreta de protección del job
 *     responses:
 *       200:
 *         description: Limpieza completada
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok: { type: boolean, example: true }
 *                 expired: { type: integer, example: 3 }
 *       401:
 *         description: Clave incorrecta
 */
router.post('/cleanup', async (req, res) => {
  const secret = process.env.CLEANUP_SECRET
  if (!secret || req.headers['x-cleanup-secret'] !== secret) {
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

/**
 * @openapi
 * /chat/rooms:
 *   get:
 *     tags: [Rooms]
 *     summary: Listar salas del usuario
 *     description: Devuelve todas las salas de chat en las que el usuario es miembro, con el último mensaje y el conteo de no leídos.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de salas
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/ChatRoom'
 *             example:
 *               - id: "b3d9a1c2-0001-4f3a-9e2d-000000000001"
 *                 eventTitle: "Festival de Jazz 2025"
 *                 eventImageUrl: "https://cdn.example.com/jazz.jpg"
 *                 eventAddress: "Parque Simón Bolívar"
 *                 status: "active"
 *                 expiresAt: null
 *                 memberCount: 8
 *                 unreadCount: 2
 *                 lastMessage:
 *                   id: "msg-uuid-001"
 *                   roomId: "b3d9a1c2-0001-4f3a-9e2d-000000000001"
 *                   senderId: "user-uuid-001"
 *                   senderName: "Ana García"
 *                   senderAvatar: null
 *                   text: "Nos vemos mañana!"
 *                   timestamp: "2025-06-01T18:30:00.000Z"
 *       401:
 *         description: Token inválido o ausente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error401'
 *       500:
 *         description: Error interno
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error500'
 */
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
    svc.from('room_members').select('room_id').in('room_id', roomIds),
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

  const lastMsgSenderIds = Array.from(new Set(Array.from(lastMessageByRoom.values()).map((m) => m.user_id)))
  let lastMsgProfileMap = new Map<string, { name: string; avatar_url: string | null }>()
  if (lastMsgSenderIds.length > 0) {
    const { data: profiles } = await svc
      .from('profiles')
      .select('id, name, avatar_url')
      .in('id', lastMsgSenderIds)
    if (profiles) lastMsgProfileMap = new Map(profiles.map((p) => [p.id, p]))
  }

  const result = (rooms ?? []).map((room) => {
    const lastReadAt = memberships.find((m) => m.room_id === room.id)?.last_read_at
    const unreadCount = (messages ?? []).filter(
      (msg) =>
        msg.room_id === room.id &&
        msg.created_at > (lastReadAt ?? '') &&
        msg.user_id !== userId,
    ).length

    const rawLast = lastMessageByRoom.get(room.id) ?? null
    const lastMsgSender = rawLast ? lastMsgProfileMap.get(rawLast.user_id) : null
    const lastMessage = rawLast
      ? {
          id: rawLast.id,
          roomId: rawLast.room_id,
          senderId: rawLast.user_id,
          senderName: lastMsgSender?.name ?? 'Usuario',
          senderAvatar: lastMsgSender?.avatar_url ?? '',
          text: rawLast.text,
          timestamp: rawLast.created_at,
        }
      : null

    return {
      id: room.id,
      eventTitle: room.event_title,
      eventImageUrl: room.event_image_url,
      eventAddress: room.event_address,
      status: room.status ?? 'active',
      expiresAt: room.expires_at ?? null,
      memberCount: memberCountMap[room.id] ?? 0,
      lastMessage,
      unreadCount,
    }
  })

  return res.json(result)
})

// ─── POST /chat/rooms/:id/join ────────────────────────────────────────────────

/**
 * @openapi
 * /chat/rooms/{id}/join:
 *   post:
 *     tags: [Rooms]
 *     summary: Crear o unirse a una sala
 *     description: Crea la sala si no existe (upsert) y registra al usuario como miembro. Se llama tras hacer swipe derecho (like) en un evento.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID del evento (se usa como ID de la sala)
 *         example: "b3d9a1c2-0001-4f3a-9e2d-000000000001"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [eventTitle]
 *             properties:
 *               eventTitle:
 *                 type: string
 *                 example: "Festival de Jazz 2025"
 *               eventImageUrl:
 *                 type: string
 *                 nullable: true
 *                 example: "https://cdn.example.com/jazz.jpg"
 *               eventAddress:
 *                 type: string
 *                 nullable: true
 *                 example: "Parque Simón Bolívar, Bogotá"
 *               expiresAt:
 *                 type: string
 *                 format: date-time
 *                 nullable: true
 *                 example: "2025-12-31T23:59:59.000Z"
 *     responses:
 *       201:
 *         description: Sala creada o unión exitosa
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok: { type: boolean, example: true }
 *       400:
 *         description: Falta eventTitle
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error400'
 *       401:
 *         description: No autorizado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error401'
 *       500:
 *         description: Error interno
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error500'
 */
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

/**
 * @openapi
 * /chat/rooms/{id}/leave:
 *   delete:
 *     tags: [Rooms]
 *     summary: Salir de una sala
 *     description: Elimina al usuario de los miembros. Si la sala queda vacía, se marca como `deleted`.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID de la sala
 *     responses:
 *       204:
 *         description: Salida exitosa (sin cuerpo)
 *       401:
 *         description: No autorizado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error401'
 *       403:
 *         description: No eres miembro de esta sala
 *       500:
 *         description: Error interno
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error500'
 */
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

/**
 * @openapi
 * /chat/rooms/{id}/members:
 *   get:
 *     tags: [Rooms]
 *     summary: Miembros de una sala
 *     description: Devuelve la lista de miembros con su perfil y fecha de ingreso.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID de la sala
 *     responses:
 *       200:
 *         description: Lista de miembros
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   userId: { type: string, format: uuid }
 *                   name: { type: string, example: "Ana García" }
 *                   avatarUrl: { type: string, nullable: true }
 *                   joinedAt: { type: string, format: date-time }
 *       401:
 *         description: No autorizado
 *       403:
 *         description: No eres miembro de esta sala
 *       500:
 *         description: Error interno
 */
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

/**
 * @openapi
 * /chat/rooms/{id}/messages:
 *   get:
 *     tags: [Messages]
 *     summary: Obtener mensajes de una sala
 *     description: Devuelve el historial paginado de mensajes ordenado cronológicamente, enriquecido con el perfil del remitente.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID de la sala
 *         example: "b3d9a1c2-0001-4f3a-9e2d-000000000001"
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *           maximum: 100
 *         description: Cantidad máxima de mensajes a devolver
 *       - in: query
 *         name: before
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Cursor de paginación — devuelve mensajes anteriores a este timestamp
 *     responses:
 *       200:
 *         description: Lista de mensajes
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/ChatMessage'
 *       401:
 *         description: No autorizado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error401'
 *       403:
 *         description: No eres miembro de esta sala
 *       500:
 *         description: Error interno
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error500'
 */
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

/**
 * @openapi
 * /chat/rooms/{id}/messages:
 *   post:
 *     tags: [Messages]
 *     summary: Enviar un mensaje
 *     description: Inserta un nuevo mensaje en la sala. La sala debe estar activa. El remitente se infiere del token.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID de la sala
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [text]
 *             properties:
 *               text:
 *                 type: string
 *                 minLength: 1
 *                 example: "Nos vemos mañana a las 7pm!"
 *     responses:
 *       201:
 *         description: Mensaje creado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id: { type: string, format: uuid }
 *                 room_id: { type: string, format: uuid }
 *                 user_id: { type: string, format: uuid }
 *                 text: { type: string }
 *                 created_at: { type: string, format: date-time }
 *       400:
 *         description: Mensaje vacío
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error400'
 *       401:
 *         description: No autorizado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error401'
 *       403:
 *         description: No eres miembro de esta sala
 *       410:
 *         description: Sala cerrada o expirada
 *       500:
 *         description: Error interno
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error500'
 */
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

/**
 * @openapi
 * /chat/rooms/{id}/read:
 *   post:
 *     tags: [Messages]
 *     summary: Marcar sala como leída
 *     description: Actualiza `last_read_at` del usuario en la sala, reseteando el contador de no leídos.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID de la sala
 *     responses:
 *       204:
 *         description: Marcado como leído (sin cuerpo)
 *       401:
 *         description: No autorizado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error401'
 *       403:
 *         description: No eres miembro de esta sala
 *       500:
 *         description: Error interno
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error500'
 */
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

/**
 * @openapi
 * /chat/rooms/{id}/unread:
 *   get:
 *     tags: [Messages]
 *     summary: No leídos de una sala
 *     description: Devuelve el conteo de mensajes no leídos para el usuario en una sala específica.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID de la sala
 *     responses:
 *       200:
 *         description: Conteo de no leídos
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UnreadCount'
 *             example:
 *               roomId: "b3d9a1c2-0001-4f3a-9e2d-000000000001"
 *               unread: 4
 *       401:
 *         description: No autorizado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error401'
 *       403:
 *         description: No eres miembro de esta sala
 *       500:
 *         description: Error interno
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error500'
 */
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

/**
 * @openapi
 * /chat/unread:
 *   get:
 *     tags: [Messages]
 *     summary: No leídos de todas las salas
 *     description: Devuelve un array con el conteo de mensajes no leídos del usuario en cada sala donde es miembro.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de no leídos por sala
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/UnreadCount'
 *             example:
 *               - roomId: "b3d9a1c2-0001-4f3a-9e2d-000000000001"
 *                 unread: 2
 *               - roomId: "b3d9a1c2-0002-4f3a-9e2d-000000000002"
 *                 unread: 0
 *       401:
 *         description: No autorizado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error401'
 *       500:
 *         description: Error interno
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error500'
 */
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
