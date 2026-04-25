import { Router } from 'express'
import { withAuth } from '../middleware/auth'
import { badRequest, serverError } from '../utils/http'

const router = Router()

router.use(withAuth)

router.get('/rooms', async (req, res) => {
  const { data: memberships, error: memberError } = await req.supabase!
    .from('room_members')
    .select('room_id, last_read_at')
    .eq('user_id', req.authUser!.id)

  if (memberError) {
    return serverError(res, 'No se pudieron cargar las membresías de chat.')
  }

  const roomIds = memberships.map((m) => m.room_id)
  if (roomIds.length === 0) {
    return res.json([])
  }

  const [{ data: rooms, error: roomError }, { data: messages, error: messageError }, { data: membersCountRows, error: membersCountError }] = await Promise.all([
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

  const memberCountMap = membersCountRows.reduce<Record<string, number>>((acc, row) => {
    acc[row.room_id] = (acc[row.room_id] ?? 0) + 1
    return acc
  }, {})

  const lastMessageByRoom = new Map<string, (typeof messages)[number]>()
  messages.forEach((msg) => {
    if (!lastMessageByRoom.has(msg.room_id)) {
      lastMessageByRoom.set(msg.room_id, msg)
    }
  })

  const result = rooms.map((room) => {
    const lastReadAt = memberships.find((m) => m.room_id === room.id)?.last_read_at
    const unreadCount = messages.filter(
      (msg) =>
        msg.room_id === room.id &&
        msg.created_at > (lastReadAt ?? '') &&
        msg.user_id !== req.authUser!.id,
    ).length

    return {
      id: room.id,
      eventTitle: room.event_title,
      eventImageUrl: room.event_image_url,
      eventAddress: room.event_address,
      memberCount: memberCountMap[room.id] ?? 0,
      lastMessage: lastMessageByRoom.get(room.id) ?? null,
      unreadCount,
    }
  })

  return res.json(result)
})

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
    .upsert(
      {
        id,
        event_title: eventTitle,
        event_image_url: eventImageUrl ?? null,
        event_address: eventAddress ?? null,
      },
      { onConflict: 'id' },
    )

  if (roomError) {
    return serverError(res, 'No se pudo crear la sala.')
  }

  const { error: memberError } = await req.supabase!
    .from('room_members')
    .upsert(
      {
        room_id: id,
        user_id: req.authUser!.id,
      },
      { onConflict: 'room_id,user_id' },
    )

  if (memberError) {
    return serverError(res, 'No se pudo unir al chat.')
  }

  return res.status(201).json({ ok: true })
})

router.get('/rooms/:id/messages', async (req, res) => {
  const { id } = req.params

  const { data, error } = await req.supabase!
    .from('chat_messages')
    .select('id, room_id, user_id, text, created_at')
    .eq('room_id', id)
    .order('created_at', { ascending: true })

  if (error) {
    return serverError(res, 'No se pudieron obtener los mensajes.')
  }

  const senderIds = Array.from(new Set(data.map((row) => row.user_id)))

  let profileMap = new Map<string, { id: string; name: string; avatar_url: string | null }>()

  if (senderIds.length > 0) {
    const { data: profiles, error: profileError } = await req.supabase!
      .from('profiles')
      .select('id, name, avatar_url')
      .in('id', senderIds)

    if (profileError) {
      return serverError(res, 'No se pudieron cargar los perfiles de chat.')
    }

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

router.post('/rooms/:id/messages', async (req, res) => {
  const { id } = req.params
  const { text } = req.body as { text?: string }

  if (!text || !text.trim()) {
    return badRequest(res, 'El mensaje no puede estar vacío.')
  }

  const { data, error } = await req.supabase!
    .from('chat_messages')
    .insert({
      room_id: id,
      user_id: req.authUser!.id,
      text: text.trim(),
    })
    .select('*')
    .single()

  if (error) {
    return serverError(res, 'No se pudo enviar el mensaje.')
  }

  return res.status(201).json(data)
})

router.post('/rooms/:id/read', async (req, res) => {
  const { id } = req.params

  const { error } = await req.supabase!
    .from('room_members')
    .update({ last_read_at: new Date().toISOString() })
    .eq('room_id', id)
    .eq('user_id', req.authUser!.id)

  if (error) {
    return serverError(res, 'No se pudo actualizar el estado de lectura.')
  }

  return res.status(204).send()
})

router.get('/rooms/:id/unread', async (req, res) => {
  const { id } = req.params

  const { data: membership, error: memberError } = await req.supabase!
    .from('room_members')
    .select('last_read_at')
    .eq('room_id', id)
    .eq('user_id', req.authUser!.id)
    .single()

  if (memberError) {
    return serverError(res, 'No se pudo obtener estado de lectura.')
  }

  const { data: messages, error: unreadError } = await req.supabase!
    .from('chat_messages')
    .select('id')
    .eq('room_id', id)
    .gt('created_at', membership.last_read_at)
    .neq('user_id', req.authUser!.id)

  if (unreadError) {
    return serverError(res, 'No se pudo calcular mensajes no leídos.')
  }

  return res.json({ roomId: id, unread: messages.length })
})

router.get('/unread', async (req, res) => {
  const { data: memberships, error: membershipError } = await req.supabase!
    .from('room_members')
    .select('room_id, last_read_at')
    .eq('user_id', req.authUser!.id)

  if (membershipError) {
    return serverError(res, 'No se pudo obtener membresías para no leídos.')
  }

  const roomIds = memberships.map((m) => m.room_id)
  if (roomIds.length === 0) {
    return res.json([])
  }

  const { data: messages, error: messagesError } = await req.supabase!
    .from('chat_messages')
    .select('id, room_id, user_id, created_at')
    .in('room_id', roomIds)
    .neq('user_id', req.authUser!.id)

  if (messagesError) {
    return serverError(res, 'No se pudieron calcular no leídos.')
  }

  const unreadByRoom = roomIds.reduce<Record<string, number>>((acc, roomId) => {
    const lastRead = memberships.find((m) => m.room_id === roomId)?.last_read_at ?? ''
    acc[roomId] = messages.filter((msg) => msg.room_id === roomId && msg.created_at > lastRead).length
    return acc
  }, {})

  return res.json(Object.entries(unreadByRoom).map(([roomId, unread]) => ({ roomId, unread })))
})

export default router
