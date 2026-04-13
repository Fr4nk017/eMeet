import { NextResponse, type NextRequest } from 'next/server'
import { getRequestUser } from '../../_lib/auth'
import { apiError, createRouteSupabaseClient } from '../../_lib/supabase'

export const runtime = 'nodejs'

type Membership = { room_id: string; last_read_at: string }
type ChatRoomRow = {
  id: string
  event_title: string
  event_image_url: string | null
  event_address: string | null
}
type ChatMessageRow = {
  id: string
  room_id: string
  user_id: string
  text: string
  created_at: string
}

export async function GET(request: NextRequest) {
  const supabase = createRouteSupabaseClient(request)
  const { user, error } = await getRequestUser(supabase, request)

  if (error || !user) return apiError('No autorizado.', 401)

  const { data: membershipsData, error: membershipsError } = await supabase
    .from('room_members')
    .select('room_id, last_read_at')
    .eq('user_id', user.id)

  if (membershipsError) return apiError('No se pudieron cargar tus salas.', 500)

  const memberships = membershipsData as Membership[]
  const roomIds = memberships.map((m) => m.room_id)
  if (roomIds.length === 0) return NextResponse.json([])

  const [{ data: roomsData, error: roomsError }, { data: messagesData, error: messagesError }, { data: roomMembersData, error: membersError }] = await Promise.all([
    supabase.from('chat_rooms').select('id, event_title, event_image_url, event_address').in('id', roomIds),
    supabase.from('chat_messages').select('id, room_id, user_id, text, created_at').in('room_id', roomIds).order('created_at', { ascending: false }),
    supabase.from('room_members').select('room_id').in('room_id', roomIds),
  ])

  if (roomsError || messagesError || membersError) {
    return apiError('No se pudieron cargar tus chats.', 500)
  }

  const rooms = roomsData as ChatRoomRow[]
  const messages = messagesData as ChatMessageRow[]
  const memberRows = roomMembersData as { room_id: string }[]

  const memberCountMap = memberRows.reduce<Record<string, number>>((acc, row) => {
    acc[row.room_id] = (acc[row.room_id] ?? 0) + 1
    return acc
  }, {})

  const lastMessageByRoom = new Map<string, ChatMessageRow>()
  messages.forEach((msg) => {
    if (!lastMessageByRoom.has(msg.room_id)) {
      lastMessageByRoom.set(msg.room_id, msg)
    }
  })

  const payload = rooms.map((room) => {
    const membership = memberships.find((m) => m.room_id === room.id)
    const unreadCount = messages.filter(
      (msg) =>
        msg.room_id === room.id &&
        msg.created_at > (membership?.last_read_at ?? '') &&
        msg.user_id !== user.id,
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

  return NextResponse.json(payload)
}
