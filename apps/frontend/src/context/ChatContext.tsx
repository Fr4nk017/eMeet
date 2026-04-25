'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import type { ReactNode } from 'react'
import type { ChatMessage, ChatRoom } from '../types'
import { useAuth } from './AuthContext'
import { getSupabaseBrowserClient, hasSupabaseEnv } from '../lib/supabase'

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
const BACKEND_URL = (process.env.NEXT_PUBLIC_BACKEND_URL ?? '').trim().replace(/\/$/, '')

function requireBackendUrl() {
  if (!BACKEND_URL) {
    throw new Error('Falta NEXT_PUBLIC_BACKEND_URL para usar chat con backend separado.')
  }
  return BACKEND_URL
}

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

// ── LocalStorage (modo sin Supabase) ─────────────────────────────────────────

const LOCAL_CHAT_ROOMS_KEY = 'emeet-local-chat-rooms'
const LOCAL_CHAT_MESSAGES_KEY = 'emeet-local-chat-messages'

function loadLocalRooms(): ChatRoom[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(LOCAL_CHAT_ROOMS_KEY)
    return raw ? (JSON.parse(raw) as ChatRoom[]) : []
  } catch { return [] }
}

function loadLocalMessages(): Record<string, ChatMessage[]> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(LOCAL_CHAT_MESSAGES_KEY)
    return raw ? (JSON.parse(raw) as Record<string, ChatMessage[]>) : {}
  } catch { return {} }
}

function saveLocalRooms(rooms: ChatRoom[]) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(LOCAL_CHAT_ROOMS_KEY, JSON.stringify(rooms))
}

function saveLocalMessages(messages: Record<string, ChatMessage[]>) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(LOCAL_CHAT_MESSAGES_KEY, JSON.stringify(messages))
}

// ── Fetch helper ──────────────────────────────────────────────────────────────

async function fetchApi<T>(input: string, init?: RequestInit): Promise<T> {
  const endpoint = `${requireBackendUrl()}${input.replace(/^\/api/, '')}`
  const headers = new Headers({ 'Content-Type': 'application/json', ...(init?.headers ?? {}) })

  if (hasSupabaseEnv) {
    const { data } = await getSupabaseBrowserClient().auth.getSession()
    const token = data.session?.access_token
    if (token) headers.set('Authorization', `Bearer ${token}`)
  }

  const response = await fetch(endpoint, {
    credentials: 'include',
    ...init,
    headers,
  })

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null
    throw new Error(body?.error ?? 'Error de comunicación con el servidor.')
  }

  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}

// ── Tipos de fila Supabase Realtime ───────────────────────────────────────────

type RealtimeMessageRow = {
  id: string
  room_id: string
  user_id: string
  text: string
  created_at: string
}

// ── Provider ──────────────────────────────────────────────────────────────────

export function ChatProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [rooms, setRooms] = useState<ChatRoom[]>([])
  const [messages, setMessages] = useState<Record<string, ChatMessage[]>>({})

  // Cache de perfiles para enriquecer mensajes realtime sin fetches extra
  const profileCache = useRef<Map<string, { name: string; avatar: string }>>(new Map())

  const totalUnread = useMemo(() => rooms.reduce((sum, r) => sum + r.unreadCount, 0), [rooms])

  // Llena el cache al cargar mensajes desde la API
  const cacheProfilesFromMessages = useCallback((msgs: ChatMessage[]) => {
    for (const msg of msgs) {
      if (!profileCache.current.has(msg.senderId)) {
        profileCache.current.set(msg.senderId, {
          name: msg.senderName,
          avatar: msg.senderAvatar,
        })
      }
    }
  }, [])

  // Carga mensajes de una sala (al entrar). También llena el cache de perfiles.
  const loadMessagesForRoom = useCallback(async (roomId: string) => {
    if (!hasSupabaseEnv) {
      const local = loadLocalMessages()
      setMessages((prev) => ({ ...prev, [roomId]: local[roomId] ?? [] }))
      return
    }

    const roomMessages = await fetchApi<MessagePayload[]>(`/api/chat/rooms/${roomId}/messages`)
    cacheProfilesFromMessages(roomMessages)
    setMessages((prev) => ({ ...prev, [roomId]: roomMessages }))
  }, [cacheProfilesFromMessages])

  // Carga la lista de rooms (sin mensajes). Solo para la carga inicial.
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

    const payload = await fetchApi<RoomPayload[]>('/api/chat/rooms')
    setRooms(
      payload.map((r) => ({
        id: r.id,
        eventTitle: r.eventTitle,
        eventImageUrl: r.eventImageUrl,
        eventAddress: r.eventAddress,
        memberCount: r.memberCount,
        lastMessage: r.lastMessage,
        unreadCount: r.unreadCount,
      })),
    )
  }, [user])

  // Carga inicial de rooms
  useEffect(() => {
    loadRoomsOnly().catch(() => {
      setRooms([])
      setMessages({})
    })
  }, [loadRoomsOnly])

  // ── Supabase Realtime ──────────────────────────────────────────────────────
  // Sustituye completamente el polling de 8s.
  // Recibe INSERT en chat_messages y actualiza estado en tiempo real.
  useEffect(() => {
    if (!user || !hasSupabaseEnv) return

    const supabase = getSupabaseBrowserClient()

    const channel = supabase
      .channel('emeet-chat-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages' },
        async (payload) => {
          const row = payload.new as RealtimeMessageRow

          // Los mensajes propios se manejan de forma optimista en sendMessage
          if (row.user_id === user.id) return

          // Resolver nombre y avatar del remitente
          let senderName = 'Usuario'
          let senderAvatar = 'https://i.pravatar.cc/150?img=1'

          const cached = profileCache.current.get(row.user_id)
          if (cached) {
            senderName = cached.name
            senderAvatar = cached.avatar
          } else {
            // Fetch del perfil solo si no está en cache
            const { data } = await supabase
              .from('profiles')
              .select('id, name, avatar_url')
              .eq('id', row.user_id)
              .single()

            if (data) {
              profileCache.current.set(row.user_id, {
                name: data.name,
                avatar: data.avatar_url ?? '',
              })
              senderName = data.name
              senderAvatar = data.avatar_url ?? ''
            }
          }

          const newMessage: ChatMessage = {
            id: row.id,
            roomId: row.room_id,
            senderId: row.user_id,
            senderName,
            senderAvatar,
            text: row.text,
            timestamp: row.created_at,
          }

          // Solo añadir a messages si esa sala ya fue cargada (abierta por el usuario)
          setMessages((prev) => {
            if (!(row.room_id in prev)) return prev
            return { ...prev, [row.room_id]: [...prev[row.room_id], newMessage] }
          })

          // Actualizar preview de la sala (lastMessage + unreadCount)
          setRooms((prev) =>
            prev.map((room) => {
              if (room.id !== row.room_id) return room
              return {
                ...room,
                lastMessage: newMessage,
                unreadCount: room.unreadCount + 1,
              }
            }),
          )
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user])

  // ── Acciones ──────────────────────────────────────────────────────────────

  const joinRoom = useCallback(
    async (eventId: string, eventTitle: string, eventImageUrl: string, eventAddress: string) => {
      if (!user) throw new Error('Debes iniciar sesión para unirte al chat.')

      if (!hasSupabaseEnv) {
        const localRooms = loadLocalRooms()
        if (!localRooms.some((r) => r.id === eventId)) {
          const next: ChatRoom[] = [
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
          saveLocalRooms(next)
          setRooms(next)
        } else {
          setRooms(localRooms)
        }
        return
      }

      await fetchApi(`/api/chat/rooms/${eventId}/join`, {
        method: 'POST',
        body: JSON.stringify({ eventTitle, eventImageUrl, eventAddress }),
      })

      await loadRoomsOnly()
    },
    [loadRoomsOnly, user],
  )

  // Optimistic update: mensaje propio aparece al instante.
  // Se reemplaza con el ID real una vez que la API responde.
  // Realtime ignora mensajes propios (row.user_id === user.id).
  const sendMessage = useCallback(
    async (roomId: string, text: string) => {
      if (!user) throw new Error('Debes iniciar sesión para enviar mensajes.')

      const cleanText = text.trim()
      if (!cleanText) return

      if (!hasSupabaseEnv) {
        const nextMessage: ChatMessage = {
          id: `local-${Date.now()}`,
          roomId,
          senderId: user.id,
          senderName: user.name,
          senderAvatar: user.avatarUrl ?? 'https://i.pravatar.cc/150?img=32',
          text: cleanText,
          timestamp: new Date().toISOString(),
        }
        const local = loadLocalMessages()
        const roomMsgs = [...(local[roomId] ?? []), nextMessage]
        const nextMessages = { ...local, [roomId]: roomMsgs }
        saveLocalMessages(nextMessages)
        setMessages((prev) => ({ ...prev, [roomId]: roomMsgs }))

        const localRooms = loadLocalRooms()
        const nextRooms = localRooms.map((r) =>
          r.id === roomId ? { ...r, lastMessage: nextMessage, unreadCount: 0 } : r,
        )
        saveLocalRooms(nextRooms)
        setRooms(nextRooms)
        return
      }

      // Mensaje optimista con ID temporal
      const tempId = `temp-${Date.now()}`
      const optimistic: ChatMessage = {
        id: tempId,
        roomId,
        senderId: user.id,
        senderName: user.name,
        senderAvatar: user.avatarUrl ?? 'https://i.pravatar.cc/150?img=32',
        text: cleanText,
        timestamp: new Date().toISOString(),
      }

      setMessages((prev) => ({
        ...prev,
        [roomId]: [...(prev[roomId] ?? []), optimistic],
      }))
      setRooms((prev) =>
        prev.map((r) => (r.id === roomId ? { ...r, lastMessage: optimistic } : r)),
      )

      try {
        // La API devuelve la fila insertada con el ID real
        const saved = await fetchApi<{ id: string; created_at: string }>(
          `/api/chat/rooms/${roomId}/messages`,
          { method: 'POST', body: JSON.stringify({ text: cleanText }) },
        )

        // Reemplazar mensaje temporal con el ID y timestamp reales
        setMessages((prev) => ({
          ...prev,
          [roomId]: (prev[roomId] ?? []).map((m) =>
            m.id === tempId ? { ...optimistic, id: saved.id, timestamp: saved.created_at } : m,
          ),
        }))
      } catch (err) {
        // Rollback si la API falla
        setMessages((prev) => ({
          ...prev,
          [roomId]: (prev[roomId] ?? []).filter((m) => m.id !== tempId),
        }))
        throw err
      }
    },
    [user],
  )

  const markRoomRead = useCallback(
    async (roomId: string) => {
      if (!user) return

      if (!hasSupabaseEnv) {
        const next = loadLocalRooms().map((r) =>
          r.id === roomId ? { ...r, unreadCount: 0 } : r,
        )
        saveLocalRooms(next)
        setRooms(next)
        return
      }

      await fetchApi(`/api/chat/rooms/${roomId}/read`, { method: 'POST', body: JSON.stringify({}) })
      setRooms((prev) => prev.map((r) => (r.id === roomId ? { ...r, unreadCount: 0 } : r)))
    },
    [user],
  )

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
