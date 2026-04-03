import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import Layout from '../components/Layout'
import { useChatContext } from '../context/ChatContext'
import type { ChatRoom } from '../types'
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
      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors"
    >
      {/* Foto del evento */}
      <div className="relative shrink-0">
        <img
          src={room.eventImageUrl}
          alt={room.eventTitle}
          className="w-14 h-14 rounded-2xl object-cover border border-white/10"
        />
        <span className="absolute -bottom-1 -right-1 bg-surface text-xs px-1.5 py-0.5 rounded-full border border-white/10 text-muted leading-none">
          👥 {room.memberCount}
        </span>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0 text-left">
        <div className="flex items-center justify-between gap-2">
          <p className="text-white text-sm font-semibold truncate">{room.eventTitle}</p>
          {room.lastMessage && (
            <span className="text-muted text-[11px] shrink-0">
              {formatTime(room.lastMessage.timestamp)}
            </span>
          )}
        </div>
        <p className="text-muted text-xs truncate mt-0.5">
          {room.lastMessage
            ? `${room.lastMessage.senderName.split(' ')[0]}: ${room.lastMessage.text}`
            : room.eventAddress}
        </p>
      </div>

      {/* Badge no leídos */}
      {room.unreadCount > 0 && (
        <span className="shrink-0 min-w-[20px] h-5 flex items-center justify-center rounded-full bg-primary text-white text-[11px] font-bold px-1.5">
          {room.unreadCount}
        </span>
      )}
    </motion.button>
  )
}

export default function ChatListPage() {
  const { rooms } = useChatContext()
  const navigate = useNavigate()

  return (
    <Layout headerTitle="Comunidad">
      <div className="flex flex-col h-full">
        {rooms.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center flex-1 px-8 text-center gap-4"
          >
            <div className="w-20 h-20 rounded-full bg-card border border-white/10 flex items-center justify-center">
              <HiChatBubbleLeftRight className="w-9 h-9 text-muted" />
            </div>
            <div>
              <p className="text-white font-semibold text-lg">Sin chats aún</p>
              <p className="text-muted text-sm mt-1">
                Dale like a un lugar en el feed para unirte a su comunidad y chatear con quienes también van a ir.
              </p>
            </div>
          </motion.div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            <p className="px-4 pt-4 pb-2 text-muted text-xs uppercase tracking-wide font-semibold">
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
                  <RoomCard
                    room={room}
                    onClick={() => navigate(`/chat/${room.id}`)}
                  />
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}
