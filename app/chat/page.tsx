'use client'

import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import Layout from '../../src/components/Layout'
import { useChatContext } from '../../src/context/ChatContext'
import type { ChatRoom } from '../../src/types'
import { HiChatBubbleLeftRight } from 'react-icons/hi2'

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
  return (
    <motion.button
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="flex w-full items-center gap-3 px-4 py-3 transition-colors hover:bg-white/5"
    >
      <div className="relative shrink-0">
        <img
          src={room.eventImageUrl}
          alt={room.eventTitle}
          className="h-14 w-14 rounded-2xl border border-white/10 object-cover"
        />
        <span className="absolute -bottom-1 -right-1 rounded-full border border-white/10 bg-surface px-1.5 py-0.5 text-xs leading-none text-muted">
          👥 {room.memberCount}
        </span>
      </div>

      <div className="min-w-0 flex-1 text-left">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-sm font-semibold text-white">{room.eventTitle}</p>
          {room.lastMessage && (
            <span className="shrink-0 text-[11px] text-muted">{formatTime(room.lastMessage.timestamp)}</span>
          )}
        </div>
        <p className="mt-0.5 truncate text-xs text-muted">
          {room.lastMessage
            ? `${room.lastMessage.senderName.split(' ')[0]}: ${room.lastMessage.text}`
            : room.eventAddress}
        </p>
      </div>

      {room.unreadCount > 0 && (
        <span className="flex h-5 min-w-[20px] shrink-0 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-bold text-white">
          {room.unreadCount}
        </span>
      )}
    </motion.button>
  )
}

export default function ChatRoutePage() {
  const { rooms } = useChatContext()
  const router = useRouter()

  return (
    <Layout headerTitle="Comunidad">
      <div className="flex h-full flex-col">
        {rooms.length === 0 ? (
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
