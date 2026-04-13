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

interface ChatContextValue {
  rooms: ChatRoom[]
  messages: Record<string, ChatMessage[]>
  totalUnread: number
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

  const loadMessagesForRoom = useCallback(async (roomId: string) => {
    const roomMessages = await fetchApi<MessagePayload[]>(`/api/chat/rooms/${roomId}/messages`, {
      method: 'GET',
    })

    setMessages((prev) => ({
      ...prev,
      [roomId]: roomMessages,
    }))
  }, [])

  const loadChatState = useCallback(async () => {
    if (!user) {
      setRooms([])
      setMessages({})
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

    if (roomPayload.length === 0) {
      setMessages({})
      return
    }

    await Promise.all(roomPayload.map((room) => loadMessagesForRoom(room.id)))
  }, [loadMessagesForRoom, user])

  useEffect(() => {
    const run = async () => {
      try {
        await loadChatState()
      } catch {
        setRooms([])
        setMessages({})
      }
    }

    run()
  }, [loadChatState])

  useEffect(() => {
    if (!user) return

    const intervalId = setInterval(() => {
      loadChatState().catch(() => {
        // Mantiene la UI estable si una consulta periodica falla.
      })
    }, 8000)

    return () => clearInterval(intervalId)
  }, [loadChatState, user])

  const joinRoom = useCallback(async (eventId: string, eventTitle: string, eventImageUrl: string, eventAddress: string) => {
    if (!user) throw new Error('Debes iniciar sesion para unirte al chat.')

    await fetchApi(`/api/chat/rooms/${eventId}/join`, {
      method: 'POST',
      body: JSON.stringify({
        eventTitle,
        eventImageUrl,
        eventAddress,
      }),
    })

    await loadChatState()
  }, [loadChatState, user])

  const sendMessage = useCallback(async (roomId: string, text: string) => {
    if (!user) throw new Error('Debes iniciar sesion para enviar mensajes.')

    const cleanText = text.trim()
    if (!cleanText) return

    await fetchApi(`/api/chat/rooms/${roomId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ text: cleanText }),
    })

    await loadMessagesForRoom(roomId)
    await loadChatState()
  }, [loadChatState, loadMessagesForRoom, user])

  const markRoomRead = useCallback(async (roomId: string) => {
    if (!user) return

    await fetchApi(`/api/chat/rooms/${roomId}/read`, {
      method: 'POST',
      body: JSON.stringify({}),
    })

    setRooms((prev) => prev.map((room) => (room.id === roomId ? { ...room, unreadCount: 0 } : room)))
  }, [user])

  return (
    <ChatContext.Provider
      value={{ rooms, messages, totalUnread, joinRoom, sendMessage, markRoomRead }}
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
