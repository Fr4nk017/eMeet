'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { MessagesSquare as HiChatBubbleLeftRight, MapPin as HiMapPin, Users as HiUsers } from 'lucide-react'
import Layout from '../../src/components/Layout'
import { useAuth } from '../../src/context/AuthContext'
import { useChatContext } from '../../src/context/ChatContext'

function formatTime(iso: string | null | undefined) {
  if (!iso) return ''
  return new Date(iso).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })
}

export default function ChatPage() {
  const router = useRouter()
  const { user, isAuthReady } = useAuth()
  const { rooms } = useChatContext()
  const [tab, setTab] = useState<'comunidad' | 'eventos'>('comunidad')

  useEffect(() => {
    if (isAuthReady && !user) {
      router.replace('/auth?next=/chat')
    }
  }, [isAuthReady, user, router])

  if (!isAuthReady || !user) return null

  const communityRooms = rooms
  const savedRooms = rooms.filter((r) => user.savedEvents?.includes(r.id))
  const activeRooms = tab === 'comunidad' ? communityRooms : savedRooms

  return (
    <Layout headerTitle="Chat eMeet" showHeader={true}>
      <div className="flex h-[calc(100vh-8rem)] flex-col gap-3 p-3 font-sans lg:p-4">

        {/* TABS */}
        <div className="flex gap-6 border-b border-violet-500/10 px-2">
          <button
            onClick={() => setTab('comunidad')}
            className={`pb-3 text-[10px] font-bold uppercase tracking-widest transition-all ${tab === 'comunidad' ? 'border-b-2 border-primary-light text-white' : 'text-muted'}`}
          >
            Comunidad
          </button>
          <button
            onClick={() => setTab('eventos')}
            className={`relative pb-3 text-[10px] font-bold uppercase tracking-widest transition-all ${tab === 'eventos' ? 'border-b-2 border-primary-light text-white' : 'text-muted'}`}
          >
            Mis Eventos
          </button>
        </div>

        {/* LISTA DE SALAS */}
        <div className="flex-1 overflow-y-auto space-y-1 pr-1">
          <AnimatePresence mode="wait">
            {activeRooms.length === 0 ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex flex-col items-center justify-center py-20 px-8 text-center"
              >
                <HiChatBubbleLeftRight className="mb-4 text-5xl text-primary-light/20" />
                <h3 className="mb-2 text-sm font-bold text-white/70">
                  {tab === 'comunidad' ? 'Sin chats aún' : 'Sin eventos guardados'}
                </h3>
                <p className="text-xs leading-relaxed text-muted">
                  {tab === 'comunidad'
                    ? 'Desliza a la derecha en un evento para unirte a su comunidad de chat.'
                    : 'Guarda eventos con el botón 🔖 para ver sus salas de chat aquí.'}
                </p>
              </motion.div>
            ) : (
              <motion.div
                key="list"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-1"
              >
                {activeRooms.map((room) => (
                  <motion.button
                    key={room.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    onClick={() => router.push(`/chat/${room.id}`)}
                    className="group w-full rounded-2xl border border-transparent p-3 transition-all hover:border-violet-500/20 hover:bg-violet-500/10 active:scale-[0.98]"
                  >
                    <div className="flex items-center gap-3">
                      {/* Imagen del evento */}
                      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-violet-500/20">
                        {room.eventImageUrl ? (
                          <img
                            src={room.eventImageUrl}
                            alt={room.eventTitle}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-violet-900/40 text-xl">
                            🎉
                          </div>
                        )}
                        {/* Indicador de no leídos encima de la imagen */}
                        {room.unreadCount > 0 && (
                          <span className="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-white shadow-lg">
                            {room.unreadCount > 99 ? '99+' : room.unreadCount}
                          </span>
                        )}
                      </div>

                      {/* Info de la sala */}
                      <div className="min-w-0 flex-1 text-left">
                        <div className="mb-0.5 flex items-center justify-between gap-2">
                          <h4 className="truncate text-sm font-semibold text-white">
                            {room.eventTitle}
                          </h4>
                          {room.lastMessage && (
                            <span className="shrink-0 text-[10px] text-muted">
                              {formatTime(room.lastMessage.timestamp)}
                            </span>
                          )}
                        </div>

                        <div className="mb-1 flex items-center gap-1">
                          <HiMapPin className="h-2.5 w-2.5 shrink-0 text-primary-light" />
                          <p className="truncate text-[10px] text-muted">{room.eventAddress}</p>
                        </div>

                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-xs italic text-white/40">
                            {room.lastMessage
                              ? `${room.lastMessage.senderName}: ${room.lastMessage.text}`
                              : 'Sé el primero en escribir 👋'}
                          </p>
                          <div className="flex shrink-0 items-center gap-1 text-[10px] text-muted">
                            <HiUsers className="h-3 w-3" />
                            <span>{room.memberCount}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </Layout>
  )
}
