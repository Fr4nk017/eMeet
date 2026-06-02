import { Router } from 'express'
import { withAuth } from '../../../../packages/shared/src/middleware/auth.js'
import { badRequest, serverError } from '../../../../packages/shared/src/utils/http.js'

const router = Router()

router.use(withAuth)

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
  const { data: memberships, error: memberError } = await req.supabase!
    .from('room_members')
    .select('room_id, last_read_at')
    .eq('user_id', req.authUser!.id)

  if (memberError) {
    return serverError(res, 'No se pudieron cargar las membresías de chat.')
  }

  const roomIds = memberships.map((m) => m.room_id)
  if (roomIds.length === 0) return res.json([])

  const [{ data: rooms, error: roomError }, { data: messages, error: messageError }, { data: membersCountRows, error: membersCountError }] =
    await Promise.all([
      req.supabase!.from('chat_rooms').select('*').in('id', roomIds),
      req.supabase!.from('chat_messages').select('id, room_id, user_id, text, created_at').in('room_id', roomIds).order('created_at', { ascending: false }),
      req.supabase!.from('room_members').select('room_id').in('room_id', roomIds),
    ])

  if (roomError || messageError || membersCountError) {
    return serverError(res, 'No se pudieron cargar las salas de chat.')
  }

  const memberCountMap = membersCountRows.reduce<Record<string, number>>((acc, row) => {
    acc[row.room_id] = (acc[row.room_id] ?? 0) + 1
    return acc
  }, {})

  const lastMessageByRoom = new Map<string, (typeof messages)[number]>()
  messages.forEach((msg) => {
    if (!lastMessageByRoom.has(msg.room_id)) lastMessageByRoom.set(msg.room_id, msg)
  })

  const lastMsgSenderIds = Array.from(new Set(Array.from(lastMessageByRoom.values()).map((m) => m.user_id)))
  let lastMsgProfileMap = new Map<string, { name: string; avatar_url: string | null }>()
  if (lastMsgSenderIds.length > 0) {
    const { data: profiles } = await req.supabase!
      .from('profiles')
      .select('id, name, avatar_url')
      .in('id', lastMsgSenderIds)
    if (profiles) lastMsgProfileMap = new Map(profiles.map((p) => [p.id, p]))
  }

  const result = rooms.map((room) => {
    const lastReadAt = memberships.find((m) => m.room_id === room.id)?.last_read_at
    const unreadCount = messages.filter(
      (msg) => msg.room_id === room.id && msg.created_at > (lastReadAt ?? '') && msg.user_id !== req.authUser!.id,
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
      memberCount: memberCountMap[room.id] ?? 0,
      lastMessage,
      unreadCount,
    }
  })

  return res.json(result)
})

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
 *     responses:
 *       201:
 *         description: Sala creada o unión exitosa
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                   example: true
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
  const { eventTitle, eventImageUrl, eventAddress } = req.body as {
    eventTitle?: string
    eventImageUrl?: string
    eventAddress?: string
  }

  if (!eventTitle) {
    return badRequest(res, 'eventTitle es obligatorio para crear/unir sala.')
  }

  const { error: roomError } = await req.supabase!
    .from('chat_rooms')
    .upsert({ id, event_title: eventTitle, event_image_url: eventImageUrl ?? null, event_address: eventAddress ?? null }, { onConflict: 'id' })

  if (roomError) return serverError(res, 'No se pudo crear la sala.')

  const { error: memberError } = await req.supabase!
    .from('room_members')
    .upsert({ room_id: id, user_id: req.authUser!.id }, { onConflict: 'room_id,user_id' })

  if (memberError) return serverError(res, 'No se pudo unir al chat.')

  return res.status(201).json({ ok: true })
})

/**
 * @openapi
 * /chat/rooms/{id}/messages:
 *   get:
 *     tags: [Messages]
 *     summary: Obtener mensajes de una sala
 *     description: Devuelve el historial completo de mensajes ordenado cronológicamente, enriquecido con el perfil del remitente.
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
 *     responses:
 *       200:
 *         description: Lista de mensajes
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/ChatMessage'
 *             example:
 *               - id: "msg-uuid-001"
 *                 roomId: "b3d9a1c2-0001-4f3a-9e2d-000000000001"
 *                 senderId: "user-uuid-001"
 *                 senderName: "Ana García"
 *                 senderAvatar: null
 *                 text: "Hola a todos!"
 *                 timestamp: "2025-06-01T18:00:00.000Z"
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         description: Error interno
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error500'
 */
router.get('/rooms/:id/messages', async (req, res) => {
  const { id } = req.params

  const { data, error } = await req.supabase!
    .from('chat_messages')
    .select('id, room_id, user_id, text, created_at')
    .eq('room_id', id)
    .order('created_at', { ascending: true })

  if (error) return serverError(res, 'No se pudieron obtener los mensajes.')

  const senderIds = Array.from(new Set(data.map((row) => row.user_id)))
  let profileMap = new Map<string, { id: string; name: string; avatar_url: string | null }>()

  if (senderIds.length > 0) {
    const { data: profiles, error: profileError } = await req.supabase!
      .from('profiles')
      .select('id, name, avatar_url')
      .in('id', senderIds)

    if (profileError) return serverError(res, 'No se pudieron cargar los perfiles de chat.')
    profileMap = new Map(profiles.map((p) => [p.id, p]))
  }

  const messages = data.map((row) => {
    const sender = profileMap.get(row.user_id)
    return {
      id: row.id,
      roomId: row.room_id,
      senderId: row.user_id,
      senderName: sender?.name ?? 'Usuario',
      senderAvatar: sender?.avatar_url,
      text: row.text,
      timestamp: row.created_at,
    }
  })

  return res.json(messages)
})

/**
 * @openapi
 * /chat/rooms/{id}/messages:
 *   post:
 *     tags: [Messages]
 *     summary: Enviar un mensaje
 *     description: Inserta un nuevo mensaje en la sala. El remitente se infiere del token de autenticación.
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
 *               description: Fila insertada en chat_messages (raw de Supabase)
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
 *       500:
 *         description: Error interno
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error500'
 */
router.post('/rooms/:id/messages', async (req, res) => {
  const { id } = req.params
  const { text } = req.body as { text?: string }

  if (!text || !text.trim()) return badRequest(res, 'El mensaje no puede estar vacío.')

  const { data, error } = await req.supabase!
    .from('chat_messages')
    .insert({ room_id: id, user_id: req.authUser!.id, text: text.trim() })
    .select('*')
    .single()

  if (error) return serverError(res, 'No se pudo enviar el mensaje.')

  return res.status(201).json(data)
})

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
 *         example: "b3d9a1c2-0001-4f3a-9e2d-000000000001"
 *     responses:
 *       204:
 *         description: Marcado como leído (sin cuerpo)
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
router.post('/rooms/:id/read', async (req, res) => {
  const { id } = req.params

  const { error } = await req.supabase!
    .from('room_members')
    .update({ last_read_at: new Date().toISOString() })
    .eq('room_id', id)
    .eq('user_id', req.authUser!.id)

  if (error) return serverError(res, 'No se pudo actualizar el estado de lectura.')

  return res.status(204).send()
})

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
 *         example: "b3d9a1c2-0001-4f3a-9e2d-000000000001"
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
 *       500:
 *         description: Error interno
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error500'
 */
router.get('/rooms/:id/unread', async (req, res) => {
  const { id } = req.params

  const { data: membership, error: memberError } = await req.supabase!
    .from('room_members')
    .select('last_read_at')
    .eq('room_id', id)
    .eq('user_id', req.authUser!.id)
    .single()

  if (memberError) return serverError(res, 'No se pudo obtener estado de lectura.')

  const { data: messages, error: unreadError } = await req.supabase!
    .from('chat_messages')
    .select('id')
    .eq('room_id', id)
    .gt('created_at', membership.last_read_at)
    .neq('user_id', req.authUser!.id)

  if (unreadError) return serverError(res, 'No se pudo calcular mensajes no leídos.')

  return res.json({ roomId: id, unread: messages.length })
})

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
  const { data: memberships, error: membershipError } = await req.supabase!
    .from('room_members')
    .select('room_id, last_read_at')
    .eq('user_id', req.authUser!.id)

  if (membershipError) return serverError(res, 'No se pudo obtener membresías para no leídos.')

  const roomIds = memberships.map((m) => m.room_id)
  if (roomIds.length === 0) return res.json([])

  const { data: messages, error: messagesError } = await req.supabase!
    .from('chat_messages')
    .select('id, room_id, user_id, created_at')
    .in('room_id', roomIds)
    .neq('user_id', req.authUser!.id)

  if (messagesError) return serverError(res, 'No se pudieron calcular no leídos.')

  const unreadByRoom = roomIds.reduce<Record<string, number>>((acc, roomId) => {
    const lastRead = memberships.find((m) => m.room_id === roomId)?.last_read_at ?? ''
    acc[roomId] = messages.filter((msg) => msg.room_id === roomId && msg.created_at > lastRead).length
    return acc
  }, {})

  return res.json(Object.entries(unreadByRoom).map(([roomId, unread]) => ({ roomId, unread })))
})

export default router
