import { NextResponse, type NextRequest } from 'next/server'
import { getRequestUser } from '../../../../_lib/auth'
import { apiError, createRouteSupabaseClient } from '../../../../_lib/supabase'

export const runtime = 'nodejs'

type ChatMessageRow = {
  id: string
  room_id: string
  user_id: string
  text: string
  created_at: string
}

type ProfileRow = {
  id: string
  name: string
  avatar_url: string | null
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createRouteSupabaseClient(request)
  const { error } = await getRequestUser(supabase, request)

  if (error) return apiError('No autorizado.', 401)

  const { data, error: messagesError } = await supabase
    .from('chat_messages')
    .select('id, room_id, user_id, text, created_at')
    .eq('room_id', params.id)
    .order('created_at', { ascending: true })

  if (messagesError) return apiError('No se pudieron cargar los mensajes.', 500)

  const messages = data as ChatMessageRow[]
  if (messages.length === 0) return NextResponse.json([])

  const senderIds = Array.from(new Set(messages.map((message) => message.user_id)))
  const { data: profilesData, error: profilesError } = await supabase
    .from('profiles')
    .select('id, name, avatar_url')
    .in('id', senderIds)

  if (profilesError) return apiError('No se pudieron cargar los remitentes.', 500)

  const profiles = profilesData as ProfileRow[]
  const profileMap = new Map(profiles.map((profile) => [profile.id, profile]))

  const payload = messages.map((message) => {
    const profile = profileMap.get(message.user_id)
    return {
      id: message.id,
      roomId: message.room_id,
      senderId: message.user_id,
      senderName: profile?.name ?? 'Usuario',
      senderAvatar: profile?.avatar_url,
      text: message.text,
      timestamp: message.created_at,
    }
  })

  return NextResponse.json(payload)
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createRouteSupabaseClient(request)
  const { user, error } = await getRequestUser(supabase, request)

  if (error || !user) return apiError('No autorizado.', 401)

  const body = (await request.json()) as { text?: string }
  const text = body.text?.trim()

  if (!text) return apiError('El mensaje no puede estar vacío.', 400)

  const { data, error: insertError } = await supabase
    .from('chat_messages')
    .insert({
      room_id: params.id,
      user_id: user.id,
      text,
    })
    .select('id, room_id, user_id, text, created_at')
    .single()

  if (insertError) return apiError('No se pudo enviar el mensaje.', 500)

  return NextResponse.json(data, { status: 201 })
}
