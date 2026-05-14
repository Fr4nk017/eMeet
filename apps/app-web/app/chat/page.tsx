'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  MessageCircle,
  LogOut,
  Clock,
  AlertCircle,
  Users,
} from 'lucide-react'
import Layout from '../../src/components/Layout'
import { useAuth } from '../../src/context/AuthContext'
import { useChatContext } from '../../src/context/ChatContext'
import type { ChatRoom } from '../../src/types'

function formatRelativeTime(iso: string | null): string {
  if (!iso) return ''
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return 'ahora'
  if (mins < 60) return `${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h`
  return `${Math.floor(hrs / 24)}d`
}

function RoomStatusBadge({ status }: { status: ChatRoom['status'] }) {
  if (status === 'active') return null
  return (
    <span className="flex items-center gap-1 rounded-full bg-red-500/20 px-2 py-0.5 text-[10px] font-semibold text-red-400">
      <AlertCircle className="h-3 w-3" />
      {status === 'expired' ? 'Expirado' : 'Cerrado'}
    </span>
  )
}

function RoomRow({
  room,
  onOpen,
  onLeave,
}: {
  room: ChatRoom
  onOpen: () => void
  onLeave: () => void
}) {
  const [confirmLeave, setConfirmLeave] = useState(false)
  const isActive = room.status === 'active'

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className={`group relative flex items-center gap-3 rounded-2xl border p-3 transition-all ${
        isActive
          ? 'cursor-pointer border-violet-500/10 hover:border-violet-500/30 hover:bg-violet-500/10'
          : 'cursor-default border-white/5 opacity-60'
      }`}
      onClick={() => {
        if (isActive && !confirmLeave) onOpen()
      }}
    >
      {/* Avatar */}
      <div className="relative shrink-0">
        <div className="h-12 w-12 overflow-hidden rounded-xl border border-white/10">
          {room.eventImageUrl ? (
            <img src={room.eventImageUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-violet-500/20 text-lg">
              🎉
            </div>
          )}
        </div>
        {isActive && (
          <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-surface bg-green-400" />
        )}
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-semibold text-white">{room.eventTitle}</p>
          <RoomStatusBadge status={room.status} />
        </div>
        <p className="truncate text-xs text-muted">
          {room.lastMessage?.text ?? 'Sin mensajes aún'}
        </p>
      </div>

      {/* Meta */}
      <div className="flex shrink-0 flex-col items-end gap-1">
        {room.lastMessage && (
          <span className="text-[10px] text-muted">
            {formatRelativeTime(room.lastMessage.timestamp)}
          </span>
        )}
        <div className="flex items-center gap-1.5">
          {room.unreadCount > 0 && isActive && (
            <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-white">
              {room.unreadCount > 99 ? '99+' : room.unreadCount}
            </span>
          )}
          <div className="flex items-center gap-0.5 text-[10px] text-muted">
            <Users className="h-3 w-3" />
            <span>{room.memberCount}</span>
          </div>
        </div>
      </div>

      {/* Botón Salir */}
      <AnimatePresence>
        {confirmLeave ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-end gap-2 rounded-2xl bg-surface/95 px-4 backdrop-blur-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="text-xs text-white/70">¿Salir del chat?</span>
            <button
              className="rounded-lg bg-red-500/80 px-3 py-1 text-xs font-semibold text-white hover:bg-red-500"
              onClick={onLeave}
            >
              Sí, salir
            </button>
            <button
              className="rounded-lg bg-white/10 px-3 py-1 text-xs text-white hover:bg-white/20"
              onClick={() => setConfirmLeave(false)}
            >
              Cancelar
            </button>
          </motion.div>
        ) : (
          <button
            title="Salir del chat"
            onClick={(e) => {
              e.stopPropagation()
              setConfirmLeave(true)
            }}
            className="ml-1 shrink-0 rounded-lg p-1.5 text-muted opacity-0 transition-all hover:bg-red-500/20 hover:text-red-400 group-hover:opacity-100"
          >
            <LogOut className="h-4 w-4" />
          </button>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export default function ChatPage() {
  const router = useRouter()
  const { user, isAuthReady } = useAuth()
  const { rooms, leaveRoom } = useChatContext()
  const [leavingId, setLeavingId] = useState<string | null>(null)

  useEffect(() => {
    if (isAuthReady && !user) {
      router.replace('/auth?next=/chat')
    }
  }, [isAuthReady, router, user])

  if (isAuthReady && !user) return null

  const activeRooms = rooms.filter((r) => r.status === 'active')
  const closedRooms = rooms.filter((r) => r.status !== 'active')

  async function handleLeave(roomId: string) {
    setLeavingId(roomId)
    try {
      await leaveRoom(roomId)
    } catch {
      // el contexto ya limpió el estado local
    } finally {
      setLeavingId(null)
    }
  }

  return (
    <Layout headerTitle="Chats" showHeader={true}>
      <div className="mx-auto max-w-lg px-4 py-4">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-white">Mis Chats</h1>
            <p className="text-xs text-muted">
              {activeRooms.length} activo{activeRooms.length !== 1 ? 's' : ''}
            </p>
          </div>
          {rooms.some((r) => r.unreadCount > 0) && (
            <span className="rounded-full bg-primary/20 px-3 py-1 text-xs font-semibold text-primary-light">
              Nuevos mensajes
            </span>
          )}
        </div>

        {/* Lista de salas activas */}
        {rooms.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <MessageCircle className="mb-4 h-10 w-10 text-primary-light/20" />
            <h2 className="text-sm font-semibold text-white">Sin chats todavía</h2>
            <p className="mt-1 text-xs text-muted">
              Dale like a un evento para unirte a su chat grupal automáticamente.
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            <AnimatePresence mode="popLayout">
              {activeRooms.map((room) => (
                <RoomRow
                  key={room.id}
                  room={room}
                  onOpen={() => router.push(`/chat/${room.id}`)}
                  onLeave={() => handleLeave(room.id)}
                />
              ))}
            </AnimatePresence>

            {/* Salas cerradas/expiradas */}
            {closedRooms.length > 0 && (
              <div className="mt-6">
                <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-muted">
                  <Clock className="h-3 w-3" />
                  Chats cerrados
                </p>
                <AnimatePresence mode="popLayout">
                  {closedRooms.map((room) => (
                    <RoomRow
                      key={room.id}
                      room={room}
                      onOpen={() => {}}
                      onLeave={() => handleLeave(room.id)}
                    />
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
        )}

        {leavingId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
            <div className="rounded-2xl bg-surface p-6 text-sm text-white shadow-xl">
              Saliendo del chat…
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}
