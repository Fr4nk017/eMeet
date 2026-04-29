'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import Layout from '../../src/components/Layout'
import { useChatContext } from '../../src/context/ChatContext'
import { useAuth } from '../../src/context/AuthContext'
import type { ChatRoom } from '../../src/types'
import { MessageCircle as HiChatBubbleLeftRight } from 'lucide-react'

function RoomSkeleton() {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <div className="shimmer h-14 w-14 flex-shrink-0 rounded-2xl" />
      <div className="flex-1 space-y-2">
        <div className="shimmer h-4 w-2/3 rounded-md" />
        <div className="shimmer h-3 w-full rounded-md" />
        <div className="shimmer h-2.5 w-1/3 rounded-md" />
      </div>
    </div>
  )
}

function formatTime(iso: string) {
  const date = new Date(iso)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60_000)

  if (diffMin < 1) return 'ahora'
  if (diffMin < 60) return `${diffMin}m`
  const diffH = Math.floor(diffMin / 60)
  if (diffH < 24) return `${diffH}h`
  return date.toLocaleDateString('es-CL', { day: 'numeric', month: 'short' })
}

function RoomCard({ room, onClick }: { room: ChatRoom; onClick: () => void }) {
  const hasUnread = room.unreadCount > 0
  return (
    <motion.button
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`flex w-full items-center gap-3 px-4 py-3 transition-colors hover:bg-white/5 ${
        hasUnread ? 'bg-primary/[0.06]' : ''
      }`}
    >
      {/* Imagen con indicador de actividad */}
      <div className="relative shrink-0">
        <img
          src={room.eventImageUrl}
          alt={room.eventTitle}
          className="h-14 w-14 rounded-2xl border border-white/10 object-cover"
        />
        {/* Punto verde de actividad */}
        <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-surface bg-green-400" />
      </div>

      <div className="min-w-0 flex-1 text-left">
        <div className="flex items-center justify-between gap-2">
          <p className={`truncate text-sm font-semibold ${hasUnread ? 'text-white' : 'text-slate-300'}`}>
            {room.eventTitle}
          </p>
          {room.lastMessage && (
            <span className={`shrink-0 text-[11px] ${hasUnread ? 'font-semibold text-primary-light' : 'text-muted'}`}>
              {formatTime(room.lastMessage.timestamp)}
            </span>
          )}
        </div>
        <p className={`mt-0.5 truncate text-xs ${hasUnread ? 'font-medium text-slate-300' : 'text-muted'}`}>
          {room.lastMessage
            ? `${room.lastMessage.senderName.split(' ')[0]}: ${room.lastMessage.text}`
            : room.eventAddress}
        </p>
        {/* Contador de miembros inline */}
        <p className="mt-0.5 text-[10px] text-muted">👥 {room.memberCount} miembros</p>
      </div>

      {hasUnread && (
        <motion.span
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 400, damping: 20 }}
          className="flex h-5 min-w-[20px] shrink-0 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-bold text-white shadow-md shadow-primary/40"
        >
          {room.unreadCount}
        </motion.span>
      )}
    </motion.button>
  )
}

export default function ChatRoutePage() {
  const { rooms } = useChatContext()
  const { user, isAuthReady } = useAuth()
  const router = useRouter()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 400)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    if (isAuthReady && !user) {
      router.replace('/auth?next=/chat')
    }
  }, [isAuthReady, router, user])

  if (isAuthReady && !user) {
    return null
  }

  return (
    <Layout headerTitle="Comunidad">
      <div className="flex h-full flex-col">
        {!mounted ? (
          <div className="divide-y divide-white/5">
            {[1, 2, 3].map((i) => <RoomSkeleton key={i} />)}
          </div>
        ) : rooms.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-1 flex-col items-center justify-center gap-4 px-8 text-center"
          >
            <div className="flex h-20 w-20 items-center justify-center rounded-full border border-white/10 bg-card">
              <HiChatBubbleLeftRight className="h-9 w-9 text-muted" />
            </div>
            <div>
              <p className="text-lg font-semibold text-white">Sin chats aún</p>
              <p className="mt-1 text-sm text-muted">
                Dale like a un lugar en el feed para unirte a su comunidad y chatear con quienes también van a ir.
              </p>
            </div>
          </motion.div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            <p className="px-4 pb-2 pt-4 text-xs font-semibold uppercase tracking-wide text-muted">
              Tus comunidades
            </p>

            <div className="divide-y divide-white/5">
              {rooms.map((room, i) => (
                <motion.div
                  key={room.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06 }}
                >
                  <RoomCard room={room} onClick={() => router.push(`/chat/${room.id}`)} />
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}
