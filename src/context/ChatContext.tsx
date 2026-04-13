'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import type { ReactNode } from 'react'
import type { ChatMessage, ChatRoom } from '../types'
import { useAuth } from './AuthContext'
import { hasSupabaseEnv } from '../lib/supabase'

interface ChatContextValue {
  rooms: ChatRoom[]
  messages: Record<string, ChatMessage[]>
  totalUnread: number
  loadMessagesForRoom: (roomId: string) => Promise<void>
  joinRoom: (eventId: string, eventTitle: string, eventImageUrl: string, eventAddress: string) => Promise<void>
  sendMessage: (roomId: string, text: string) => Promise<void>
  markRoomRead: (roomId: string) => Promise<void>
}

const ChatContext = createContext<ChatContextValue | undefined>(undefined)

type RoomPayload = {
  id: string
  eventTitle: string
  eventImageUrl: string
  eventAddress: string
  memberCount: number
  lastMessage: ChatMessage | null
  unreadCount: number
}

type MessagePayload = ChatMessage

const LOCAL_CHAT_ROOMS_STORAGE_KEY = 'emeet-local-chat-rooms'
const LOCAL_CHAT_MESSAGES_STORAGE_KEY = 'emeet-local-chat-messages'

function loadLocalRooms(): ChatRoom[] {
  if (typeof window === 'undefined') return []

  try {
    const raw = window.localStorage.getItem(LOCAL_CHAT_ROOMS_STORAGE_KEY)
    if (!raw) return []
    return JSON.parse(raw) as ChatRoom[]
  } catch {
    return []
  }
}

function loadLocalMessages(): Record<string, ChatMessage[]> {
  if (typeof window === 'undefined') return {}

  try {
    const raw = window.localStorage.getItem(LOCAL_CHAT_MESSAGES_STORAGE_KEY)
    if (!raw) return {}
    return JSON.parse(raw) as Record<string, ChatMessage[]>
  } catch {
    return {}
  }
}

function saveLocalRooms(nextRooms: ChatRoom[]) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(LOCAL_CHAT_ROOMS_STORAGE_KEY, JSON.stringify(nextRooms))
}

function saveLocalMessages(nextMessages: Record<string, ChatMessage[]>) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(LOCAL_CHAT_MESSAGES_STORAGE_KEY, JSON.stringify(nextMessages))
}

async function fetchApi<T>(input: string, init?: RequestInit): Promise<T> {
  const response = await fetch(input, {
    credentials: 'include',
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  })

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null
    throw new Error(body?.error ?? 'Error de comunicacion con el servidor.')
  }

  if (response.status === 204) {
    return undefined as T
  }

  return response.json() as Promise<T>
}

export function ChatProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [rooms, setRooms] = useState<ChatRoom[]>([])
  const [messages, setMessages] = useState<Record<string, ChatMessage[]>>({})

  const totalUnread = useMemo(() => rooms.reduce((sum, r) => sum + r.unreadCount, 0), [rooms])

  // Carga solo los mensajes de una sala específica. Usada al entrar a un room
  // y después de enviar un mensaje — evita recargar todas las salas.
  const loadMessagesForRoom = useCallback(async (roomId: string) => {
    if (!hasSupabaseEnv) {
      const localMessages = loadLocalMessages()
      setMessages((prev) => ({
        ...prev,
        [roomId]: localMessages[roomId] ?? [],
      }))
      return
    }

    const roomMessages = await fetchApi<MessagePayload[]>(`/api/chat/rooms/${roomId}/messages`, {
      method: 'GET',
    })

    setMessages((prev) => ({
      ...prev,
      [roomId]: roomMessages,
    }))
  }, [])

  // Carga solo la lista de salas (sin mensajes). Usada en el init y el polling.
  // Reducción: de N+1 requests a 1 por ciclo.
  const loadRoomsOnly = useCallback(async () => {
    if (!user) {
      setRooms([])
      setMessages({})
      return
    }

    if (!hasSupabaseEnv) {
      setRooms(loadLocalRooms())
      setMessages(loadLocalMessages())
      return
    }

    const roomPayload = await fetchApi<RoomPayload[]>('/api/chat/rooms', {
      method: 'GET',
    })

    setRooms(
      roomPayload.map((room) => ({
        id: room.id,
        eventTitle: room.eventTitle,
        eventImageUrl: room.eventImageUrl,
        eventAddress: room.eventAddress,
        memberCount: room.memberCount,
        lastMessage: room.lastMessage,
        unreadCount: room.unreadCount,
      })),
    )
  }, [user])

  // Init: solo carga rooms. Los mensajes se cargan lazy al entrar a cada sala.
  useEffect(() => {
    const run = async () => {
      try {
        await loadRoomsOnly()
      } catch {
        setRooms([])
        setMessages({})
      }
    }

    run()
  }, [loadRoomsOnly])

  // Polling: solo actualiza la lista de rooms (unread counts, last message).
  // Antes: N+1 requests cada 8s. Ahora: 1 request cada 8s.
  useEffect(() => {
    if (!user || !hasSupabaseEnv) return

    const intervalId = setInterval(() => {
      loadRoomsOnly().catch(() => {
        // Mantiene la UI estable si una consulta periodica falla.
      })
    }, 8000)

    return () => clearInterval(intervalId)
  }, [loadRoomsOnly, user])

  const joinRoom = useCallback(async (eventId: string, eventTitle: string, eventImageUrl: string, eventAddress: string) => {
    if (!user) throw new Error('Debes iniciar sesion para unirte al chat.')

    if (!hasSupabaseEnv) {
      const localRooms = loadLocalRooms()
      const exists = localRooms.some((room) => room.id === eventId)
      if (!exists) {
        const nextRooms: ChatRoom[] = [
          {
            id: eventId,
            eventTitle,
            eventImageUrl,
            eventAddress,
            memberCount: 1,
            lastMessage: null,
            unreadCount: 0,
          },
          ...localRooms,
        ]
        saveLocalRooms(nextRooms)
        setRooms(nextRooms)
      } else {
        setRooms(localRooms)
      }
      return
    }

    await fetchApi(`/api/chat/rooms/${eventId}/join`, {
      method: 'POST',
      body: JSON.stringify({
        eventTitle,
        eventImageUrl,
        eventAddress,
      }),
    })

    await loadRoomsOnly()
  }, [loadRoomsOnly, user])

  // Antes: POST + loadMessagesForRoom + loadChatState (N+2 requests).
  // Ahora: POST + loadMessagesForRoom (2 requests, solo lo necesario).
  const sendMessage = useCallback(async (roomId: string, text: string) => {
    if (!user) throw new Error('Debes iniciar sesion para enviar mensajes.')

    const cleanText = text.trim()
    if (!cleanText) return

    if (!hasSupabaseEnv) {
      const nextMessage: ChatMessage = {
        id: `local-${Date.now()}`,
        roomId,
        senderId: user.id,
        senderName: user.name,
        senderAvatar: user.avatarUrl,
        text: cleanText,
        timestamp: new Date().toISOString(),
      }

      const localMessages = loadLocalMessages()
      const roomMessages = [...(localMessages[roomId] ?? []), nextMessage]
      const nextMessages = { ...localMessages, [roomId]: roomMessages }
      saveLocalMessages(nextMessages)
      setMessages((prev) => ({ ...prev, [roomId]: roomMessages }))

      const localRooms = loadLocalRooms()
      const nextRooms = localRooms.map((room) =>
        room.id === roomId
          ? { ...room, lastMessage: nextMessage, unreadCount: 0 }
          : room
      )
      saveLocalRooms(nextRooms)
      setRooms(nextRooms)
      return
    }

    await fetchApi(`/api/chat/rooms/${roomId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ text: cleanText }),
    })

    await loadMessagesForRoom(roomId)
  }, [loadMessagesForRoom, user])

  const markRoomRead = useCallback(async (roomId: string) => {
    if (!user) return

    if (!hasSupabaseEnv) {
      const nextRooms = loadLocalRooms().map((room) =>
        room.id === roomId ? { ...room, unreadCount: 0 } : room
      )
      saveLocalRooms(nextRooms)
      setRooms(nextRooms)
      return
    }

    await fetchApi(`/api/chat/rooms/${roomId}/read`, {
      method: 'POST',
      body: JSON.stringify({}),
    })

    setRooms((prev) => prev.map((room) => (room.id === roomId ? { ...room, unreadCount: 0 } : room)))
  }, [user])

  return (
    <ChatContext.Provider
      value={{ rooms, messages, totalUnread, loadMessagesForRoom, joinRoom, sendMessage, markRoomRead }}
    >
      {children}
    </ChatContext.Provider>
  )
}

export function useChatContext() {
  const ctx = useContext(ChatContext)
  if (!ctx) throw new Error('useChatContext must be used inside ChatProvider')
  return ctx
}
