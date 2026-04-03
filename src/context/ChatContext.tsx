import {
  createContext,
  useCallback,
  useContext,
  useState,
} from 'react'
import type { ReactNode } from 'react'
import type { ChatMessage, ChatRoom } from '../types'

// ─── Mock participants ────────────────────────────────────────────────────────

const MOCK_USERS = [
  { id: 'u2', name: 'Camila Torres',  avatar: 'https://i.pravatar.cc/150?img=47' },
  { id: 'u3', name: 'Sebastián Ruiz', avatar: 'https://i.pravatar.cc/150?img=52' },
  { id: 'u4', name: 'Valentina Cruz', avatar: 'https://i.pravatar.cc/150?img=44' },
  { id: 'u5', name: 'Matías Vega',    avatar: 'https://i.pravatar.cc/150?img=57' },
]

function mockMsg(
  roomId: string,
  senderId: string,
  text: string,
  minutesAgo: number,
): ChatMessage {
  const ts = new Date(Date.now() - minutesAgo * 60_000).toISOString()
  const user = MOCK_USERS.find((u) => u.id === senderId) ?? MOCK_USERS[0]
  return {
    id: `${roomId}-${senderId}-${minutesAgo}`,
    roomId,
    senderId,
    senderName: user.name,
    senderAvatar: user.avatar,
    text,
    timestamp: ts,
  }
}

// Salas de demo con mensajes pre-cargados
const DEMO_ROOM_ID = 'demo-bar-el-diablo'

const INITIAL_ROOMS: ChatRoom[] = [
  {
    id: DEMO_ROOM_ID,
    eventTitle: 'Bar El Diablo',
    eventImageUrl: 'https://images.unsplash.com/photo-1516997121675-4c2d1684aa3e?w=800&q=80',
    eventAddress: 'Constitución 52, Barrio Bellavista',
    memberCount: 4,
    lastMessage: null,
    unreadCount: 2,
  },
]

const INITIAL_MESSAGES: Record<string, ChatMessage[]> = {
  [DEMO_ROOM_ID]: [
    mockMsg(DEMO_ROOM_ID, 'u2', '¿Alguien va esta noche? 🎉', 55),
    mockMsg(DEMO_ROOM_ID, 'u3', 'Yo voy! A las 10pm', 48),
    mockMsg(DEMO_ROOM_ID, 'u4', 'Me sumo, vamos en grupo? 🙌', 40),
    mockMsg(DEMO_ROOM_ID, 'u5', 'Dale, nos juntamos en Plaza Italia y caminamos juntos', 32),
    mockMsg(DEMO_ROOM_ID, 'u2', '¡Perfecto! Avisen cuando lleguen al metro', 15),
  ],
}

// ─── Contexto ─────────────────────────────────────────────────────────────────

interface ChatContextValue {
  rooms: ChatRoom[]
  messages: Record<string, ChatMessage[]>
  totalUnread: number
  joinRoom: (eventId: string, eventTitle: string, eventImageUrl: string, eventAddress: string) => void
  sendMessage: (roomId: string, text: string, senderId: string, senderName: string, senderAvatar: string) => void
  markRoomRead: (roomId: string) => void
}

const ChatContext = createContext<ChatContextValue | undefined>(undefined)

export function ChatProvider({ children }: { children: ReactNode }) {
  const [rooms, setRooms] = useState<ChatRoom[]>(INITIAL_ROOMS)
  const [messages, setMessages] = useState<Record<string, ChatMessage[]>>(INITIAL_MESSAGES)

  const totalUnread = rooms.reduce((sum, r) => sum + r.unreadCount, 0)

  /** Crea la sala si no existe, o incrementa el contador de miembros. */
  const joinRoom = useCallback(
    (eventId: string, eventTitle: string, eventImageUrl: string, eventAddress: string) => {
      setRooms((prev) => {
        const exists = prev.find((r) => r.id === eventId)
        if (exists) {
          return prev.map((r) =>
            r.id === eventId
              ? { ...r, memberCount: r.memberCount + 1 }
              : r,
          )
        }
        const newRoom: ChatRoom = {
          id: eventId,
          eventTitle,
          eventImageUrl,
          eventAddress,
          memberCount: 1,
          lastMessage: null,
          unreadCount: 0,
        }
        return [newRoom, ...prev]
      })
    },
    [],
  )

  const sendMessage = useCallback(
    (
      roomId: string,
      text: string,
      senderId: string,
      senderName: string,
      senderAvatar: string,
    ) => {
      const msg: ChatMessage = {
        id: `${roomId}-${senderId}-${Date.now()}`,
        roomId,
        senderId,
        senderName,
        senderAvatar,
        text: text.trim(),
        timestamp: new Date().toISOString(),
      }

      setMessages((prev) => ({
        ...prev,
        [roomId]: [...(prev[roomId] ?? []), msg],
      }))

      setRooms((prev) =>
        prev.map((r) =>
          r.id === roomId ? { ...r, lastMessage: msg } : r,
        ),
      )
    },
    [],
  )

  const markRoomRead = useCallback((roomId: string) => {
    setRooms((prev) =>
      prev.map((r) => (r.id === roomId ? { ...r, unreadCount: 0 } : r)),
    )
  }, [])

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
