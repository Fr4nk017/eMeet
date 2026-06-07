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
import { resolveServiceUrl } from '../lib/serviceUrl'

const MESSAGES_LIMIT = 50

interface ChatContextValue {
  rooms: ChatRoom[]
  messages: Record<string, ChatMessage[]>
  hasMoreMessages: Record<string, boolean>
  totalUnread: number
  openRoom: (roomId: string) => void
  closeRoom: () => void
  loadMessagesForRoom: (roomId: string) => Promise<void>
  loadMoreMessages: (roomId: string) => Promise<void>
  joinRoom: (eventId: string, eventTitle: string, eventImageUrl: string, eventAddress: string, expiresAt?: string) => Promise<void>
  leaveRoom: (roomId: string) => Promise<void>
  sendMessage: (roomId: string, text: string) => Promise<void>
  retryMessage: (roomId: string, tempId: string) => Promise<void>
  markRoomRead: (roomId: string) => Promise<void>
}

const ChatContext = createContext<ChatContextValue | undefined>(undefined)
const CHAT_URL = resolveServiceUrl(process.env.NEXT_PUBLIC_CHAT_URL, 'CHAT_URL')

type RoomPayload = {
  id: string
  eventTitle: string
  eventImageUrl: string
  eventAddress: string
  status: string
  expiresAt: string | null
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

async function fetchApi<T>(baseUrl: string, path: string, init?: RequestInit): Promise<T> {
  const endpoint = `${baseUrl}${path}`
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
  const [hasMoreMessages, setHasMoreMessages] = useState<Record<string, boolean>>({})
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null)

  const profileCache = useRef<Map<string, { name: string; avatar: string }>>(new Map())
  const activeRoomIdRef = useRef<string | null>(null)
  const messagesRef = useRef(messages)
  const isLoadingMoreRef = useRef(false)

  useEffect(() => { activeRoomIdRef.current = activeRoomId }, [activeRoomId])
  useEffect(() => { messagesRef.current = messages }, [messages])

  const totalUnread = useMemo(
    () => rooms.filter((r) => r.status === 'active').reduce((sum, r) => sum + r.unreadCount, 0),
    [rooms],
  )

  const cacheProfilesFromMessages = useCallback((msgs: ChatMessage[]) => {
    for (const msg of msgs) {
      if (!profileCache.current.has(msg.senderId)) {
        profileCache.current.set(msg.senderId, { name: msg.senderName, avatar: msg.senderAvatar ?? '' })
      }
    }
  }, [])

  // ── Carga inicial de mensajes con paginación ──────────────────────────────

  const loadMessagesForRoom = useCallback(async (roomId: string) => {
    if (!hasSupabaseEnv) {
      const local = loadLocalMessages()
      setMessages((prev) => ({ ...prev, [roomId]: local[roomId] ?? [] }))
      return
    }

    const roomMessages = await fetchApi<MessagePayload[]>(
      CHAT_URL,
      `/chat/rooms/${roomId}/messages?limit=${MESSAGES_LIMIT}`,
    )
    cacheProfilesFromMessages(roomMessages)
    setHasMoreMessages((prev) => ({ ...prev, [roomId]: roomMessages.length === MESSAGES_LIMIT }))
    setMessages((prev) => {
      const existing = prev[roomId] ?? []
      if (existing.length === 0) {
        return { ...prev, [roomId]: roomMessages.map((m) => ({ ...m, status: 'sent' as const })) }
      }
      // Merge: API es fuente de verdad; preservar mensajes realtime llegados durante la carga
      const apiIds = new Set(roomMessages.map((m) => m.id))
      const realtimeOnly = existing.filter((m) => !apiIds.has(m.id) && !m.id.startsWith('temp-'))
      const merged = [
        ...roomMessages.map((m) => ({ ...m, status: 'sent' as const })),
        ...realtimeOnly,
      ].sort((a, b) => a.timestamp.localeCompare(b.timestamp))
      return { ...prev, [roomId]: merged }
    })
  }, [cacheProfilesFromMessages])

  // ── Carga de mensajes más antiguos (infinite scroll hacia arriba) ──────────

  const loadMoreMessages = useCallback(async (roomId: string) => {
    if (!hasSupabaseEnv || isLoadingMoreRef.current) return
    const current = messagesRef.current[roomId] ?? []
    const oldest = current.find((m) => !m.id.startsWith('temp-'))
    if (!oldest) return

    isLoadingMoreRef.current = true
    try {
      const older = await fetchApi<MessagePayload[]>(
        CHAT_URL,
        `/chat/rooms/${roomId}/messages?limit=${MESSAGES_LIMIT}&before=${encodeURIComponent(oldest.timestamp)}`,
      )
      cacheProfilesFromMessages(older)
      setHasMoreMessages((prev) => ({ ...prev, [roomId]: older.length === MESSAGES_LIMIT }))
      setMessages((prev) => {
        const existing = prev[roomId] ?? []
        const existingIds = new Set(existing.map((m) => m.id))
        const newOlder = older
          .filter((m) => !existingIds.has(m.id))
          .map((m) => ({ ...m, status: 'sent' as const }))
        return { ...prev, [roomId]: [...newOlder, ...existing] }
      })
    } finally {
      isLoadingMoreRef.current = false
    }
  }, [cacheProfilesFromMessages])

  // ── Gestión del room activo ───────────────────────────────────────────────

  const openRoom = useCallback((roomId: string) => {
    setActiveRoomId(roomId)
    activeRoomIdRef.current = roomId
  }, [])

  const closeRoom = useCallback(() => {
    setActiveRoomId(null)
    activeRoomIdRef.current = null
  }, [])

  // ── Carga lista de salas ──────────────────────────────────────────────────

  const loadRoomsOnly = useCallback(async () => {
    if (!user) { setRooms([]); setMessages({}); return }

    if (!hasSupabaseEnv) {
      setRooms(loadLocalRooms())
      setMessages(loadLocalMessages())
      return
    }

    const payload = await fetchApi<RoomPayload[]>(CHAT_URL, '/chat/rooms')
    setRooms(
      payload.map((r) => ({
        id: r.id,
        eventTitle: r.eventTitle,
        eventImageUrl: r.eventImageUrl,
        eventAddress: r.eventAddress,
        status: (r.status ?? 'active') as ChatRoom['status'],
        expiresAt: r.expiresAt ?? null,
        memberCount: r.memberCount,
        lastMessage: r.lastMessage,
        unreadCount: r.unreadCount,
      })),
    )
  }, [user])

  useEffect(() => {
    loadRoomsOnly().catch(() => { setRooms([]); setMessages({}) })
  }, [loadRoomsOnly])

  // ── Canal global: actualiza metadata de salas (lastMessage + unreadCount) ─
  // No toca messages[] — el canal por sala se encarga de eso.

  useEffect(() => {
    if (!user || !hasSupabaseEnv) return
    const supabase = getSupabaseBrowserClient()

    const channel = supabase
      .channel('emeet-chat-rooms-meta')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages' },
        (payload) => {
          const row = payload.new as RealtimeMessageRow
          if (row.user_id === user.id) return

          const cached = profileCache.current.get(row.user_id)
          const preview: ChatMessage = {
            id: row.id,
            roomId: row.room_id,
            senderId: row.user_id,
            senderName: cached?.name ?? 'Usuario',
            senderAvatar: cached?.avatar ?? '',
            text: row.text,
            timestamp: row.created_at,
            status: 'sent',
          }

          setRooms((prev) =>
            prev.map((room) => {
              if (room.id !== row.room_id) return room
              return {
                ...room,
                lastMessage: preview,
                // No incrementar unread si el usuario está en esa sala ahora
                unreadCount:
                  room.id === activeRoomIdRef.current
                    ? room.unreadCount
                    : room.unreadCount + 1,
              }
            }),
          )
        },
      )
      .subscribe()

    return () => { void supabase.removeChannel(channel) }
  }, [user])

  // ── Canal por sala: mensajes en tiempo real (filtrado) ────────────────────

  useEffect(() => {
    if (!activeRoomId || !user || !hasSupabaseEnv) return
    const supabase = getSupabaseBrowserClient()

    const channel = supabase
      .channel(`emeet-room-${activeRoomId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `room_id=eq.${activeRoomId}`,
        },
        async (payload) => {
          const row = payload.new as RealtimeMessageRow
          if (row.user_id === user.id) return

          let senderName = 'Usuario'
          let senderAvatar = ''
          const cached = profileCache.current.get(row.user_id)
          if (cached) {
            senderName = cached.name
            senderAvatar = cached.avatar
          } else {
            const { data } = await supabase
              .from('profiles')
              .select('id, name, avatar_url')
              .eq('id', row.user_id)
              .single()
            if (data) {
              profileCache.current.set(row.user_id, { name: data.name, avatar: data.avatar_url ?? '' })
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
            status: 'sent',
          }

          setMessages((prev) => {
            const current = prev[row.room_id] ?? []
            if (current.some((m) => m.id === newMessage.id)) return prev
            return { ...prev, [row.room_id]: [...current, newMessage] }
          })
        },
      )
      .subscribe()

    return () => { void supabase.removeChannel(channel) }
  }, [activeRoomId, user])

  // ── Acciones ──────────────────────────────────────────────────────────────

  const joinRoom = useCallback(
    async (eventId: string, eventTitle: string, eventImageUrl: string, eventAddress: string, expiresAt?: string) => {
      if (!user) throw new Error('Debes iniciar sesión para unirte al chat.')

      if (!hasSupabaseEnv) {
        const localRooms = loadLocalRooms()
        if (!localRooms.some((r) => r.id === eventId)) {
          const next: ChatRoom[] = [{
            id: eventId, eventTitle, eventImageUrl, eventAddress,
            status: 'active', expiresAt: expiresAt ?? null,
            memberCount: 1, lastMessage: null, unreadCount: 0,
          }, ...localRooms]
          saveLocalRooms(next)
          setRooms(next)
        } else {
          setRooms(localRooms)
        }
        return
      }

      await fetchApi(CHAT_URL, `/chat/rooms/${eventId}/join`, {
        method: 'POST',
        body: JSON.stringify({ eventTitle, eventImageUrl, eventAddress, expiresAt }),
      })
      await loadRoomsOnly()
    },
    [loadRoomsOnly, user],
  )

  const leaveRoom = useCallback(
    async (roomId: string) => {
      if (!user) throw new Error('Debes iniciar sesión para salir del chat.')

      if (!hasSupabaseEnv) {
        const next = loadLocalRooms().filter((r) => r.id !== roomId)
        saveLocalRooms(next)
        setRooms(next)
        const msgs = loadLocalMessages()
        delete msgs[roomId]
        saveLocalMessages(msgs)
        setMessages((prev) => { const n = { ...prev }; delete n[roomId]; return n })
        return
      }

      await fetchApi(CHAT_URL, `/chat/rooms/${roomId}/leave`, { method: 'DELETE' })
      setRooms((prev) => prev.filter((r) => r.id !== roomId))
      setMessages((prev) => { const n = { ...prev }; delete n[roomId]; return n })
    },
    [user],
  )

  const sendMessage = useCallback(
    async (roomId: string, text: string) => {
      if (!user) throw new Error('Debes iniciar sesión para enviar mensajes.')
      const cleanText = text.trim()
      if (!cleanText) return

      if (!hasSupabaseEnv) {
        const nextMessage: ChatMessage = {
          id: `local-${Date.now()}`, roomId,
          senderId: user.id, senderName: user.name, senderAvatar: user.avatarUrl ?? '',
          text: cleanText, timestamp: new Date().toISOString(), status: 'sent',
        }
        const local = loadLocalMessages()
        const roomMsgs = [...(local[roomId] ?? []), nextMessage]
        saveLocalMessages({ ...local, [roomId]: roomMsgs })
        setMessages((prev) => ({ ...prev, [roomId]: roomMsgs }))
        const nextRooms = loadLocalRooms().map((r) =>
          r.id === roomId ? { ...r, lastMessage: nextMessage, unreadCount: 0 } : r,
        )
        saveLocalRooms(nextRooms)
        setRooms(nextRooms)
        return
      }

      const tempId = `temp-${Date.now()}`
      const optimistic: ChatMessage = {
        id: tempId, roomId,
        senderId: user.id, senderName: user.name, senderAvatar: user.avatarUrl ?? '',
        text: cleanText, timestamp: new Date().toISOString(), status: 'sending',
      }

      setMessages((prev) => ({ ...prev, [roomId]: [...(prev[roomId] ?? []), optimistic] }))
      setRooms((prev) =>
        prev.map((r) => r.id === roomId ? { ...r, lastMessage: { ...optimistic, status: 'sent' } } : r),
      )

      try {
        const saved = await fetchApi<{ id: string; created_at: string }>(
          CHAT_URL, `/chat/rooms/${roomId}/messages`,
          { method: 'POST', body: JSON.stringify({ text: cleanText }) },
        )
        setMessages((prev) => ({
          ...prev,
          [roomId]: (prev[roomId] ?? []).map((m) =>
            m.id === tempId
              ? { ...optimistic, id: saved.id, timestamp: saved.created_at, status: 'sent' as const }
              : m,
          ),
        }))
      } catch (err) {
        // Marcar como fallido en lugar de eliminar — el usuario puede reintentar
        setMessages((prev) => ({
          ...prev,
          [roomId]: (prev[roomId] ?? []).map((m) =>
            m.id === tempId ? { ...m, status: 'failed' as const } : m,
          ),
        }))
        throw err
      }
    },
    [user],
  )

  const retryMessage = useCallback(async (roomId: string, tempId: string) => {
    const failedMsg = messagesRef.current[roomId]?.find(
      (m) => m.id === tempId && m.status === 'failed',
    )
    if (!failedMsg) return

    setMessages((prev) => ({
      ...prev,
      [roomId]: (prev[roomId] ?? []).map((m) =>
        m.id === tempId ? { ...m, status: 'sending' as const } : m,
      ),
    }))

    try {
      const saved = await fetchApi<{ id: string; created_at: string }>(
        CHAT_URL, `/chat/rooms/${roomId}/messages`,
        { method: 'POST', body: JSON.stringify({ text: failedMsg.text }) },
      )
      setMessages((prev) => ({
        ...prev,
        [roomId]: (prev[roomId] ?? []).map((m) =>
          m.id === tempId
            ? { ...m, id: saved.id, timestamp: saved.created_at, status: 'sent' as const }
            : m,
        ),
      }))
    } catch {
      setMessages((prev) => ({
        ...prev,
        [roomId]: (prev[roomId] ?? []).map((m) =>
          m.id === tempId ? { ...m, status: 'failed' as const } : m,
        ),
      }))
    }
  }, [])

  const markRoomRead = useCallback(
    async (roomId: string) => {
      if (!user) return

      if (!hasSupabaseEnv) {
        const next = loadLocalRooms().map((r) => r.id === roomId ? { ...r, unreadCount: 0 } : r)
        saveLocalRooms(next)
        setRooms(next)
        return
      }

      await fetchApi(CHAT_URL, `/chat/rooms/${roomId}/read`, { method: 'POST', body: JSON.stringify({}) })
      setRooms((prev) => prev.map((r) => r.id === roomId ? { ...r, unreadCount: 0 } : r))
    },
    [user],
  )

  const contextValue = useMemo(
    () => ({
      rooms, messages, hasMoreMessages, totalUnread,
      openRoom, closeRoom,
      loadMessagesForRoom, loadMoreMessages,
      joinRoom, leaveRoom, sendMessage, retryMessage, markRoomRead,
    }),
    [
      rooms, messages, hasMoreMessages, totalUnread,
      openRoom, closeRoom,
      loadMessagesForRoom, loadMoreMessages,
      joinRoom, leaveRoom, sendMessage, retryMessage, markRoomRead,
    ],
  )

  return <ChatContext.Provider value={contextValue}>{children}</ChatContext.Provider>
}

export function useChatContext() {
  const ctx = useContext(ChatContext)
  if (!ctx) throw new Error('useChatContext must be used inside ChatProvider')
  return ctx
}
