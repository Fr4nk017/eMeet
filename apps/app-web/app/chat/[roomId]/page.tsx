'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useChatContext } from '../../../src/context/ChatContext'
import { useAuth } from '../../../src/context/AuthContext'
import { ArrowLeft as HiArrowLeft, Send as HiPaperAirplane, MapPin as HiMapPin } from 'lucide-react'

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('es-CL', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatDateLabel(iso: string) {
  const date = new Date(iso)
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - date.getTime()) / 86_400_000)
  if (diffDays === 0) return 'Hoy'
  if (diffDays === 1) return 'Ayer'
  return date.toLocaleDateString('es-CL', { day: 'numeric', month: 'long' })
}

export default function ChatRoomRoutePage() {
  const params = useParams<{ roomId: string }>()
  const roomId = typeof params?.roomId === 'string' ? params.roomId : undefined
  const router = useRouter()
  const { rooms, messages, sendMessage, markRoomRead } = useChatContext()
  const { user, isAuthReady } = useAuth()
  const [input, setInput] = useState('')
  const [typingUser, setTypingUser] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const room = rooms.find((r) => r.id === roomId)
  const roomMessages = messages[roomId ?? ''] ?? []

  useEffect(() => {
    if (roomId) {
      markRoomRead(roomId).catch(() => {
        // Evita romper la vista si falla el marcado de leído.
      })
    }
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [roomId, markRoomRead])

  useEffect(() => {
    if (isAuthReady && !user) {
      const next = roomId ? `/chat/${roomId}` : '/chat'
      router.replace(`/auth?next=${encodeURIComponent(next)}`)
    }
  }, [isAuthReady, roomId, router, user])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [roomMessages.length])

  if (isAuthReady && !user) {
    return null
  }

  const otherParticipants = useMemo(() => {
    const bySender = new Map<string, { name: string; avatar: string }>()
    for (const msg of roomMessages) {
      if (msg.senderId !== user?.id && !bySender.has(msg.senderId)) {
        bySender.set(msg.senderId, { name: msg.senderName, avatar: msg.senderAvatar })
      }
    }
    return Array.from(bySender.values())
  }, [roomMessages, user?.id])

  useEffect(() => {
    if (!roomId || otherParticipants.length === 0) return

    const interval = setInterval(() => {
      const chance = Math.random()
      if (chance > 0.45) return
      const randomUser = otherParticipants[Math.floor(Math.random() * otherParticipants.length)]
      setTypingUser(randomUser.name)
      setTimeout(() => setTypingUser((curr) => (curr === randomUser.name ? null : curr)), 2000)
    }, 6500)

    return () => clearInterval(interval)
  }, [otherParticipants, roomId])

  if (!room) {
    return (
      <div className="flex h-full flex-col items-center justify-center text-muted">
        <p>Sala no encontrada</p>
        <button onClick={() => router.push('/chat')} className="mt-3 text-sm text-primary">
          Volver
        </button>
      </div>
    )
  }

  function handleSend() {
    if (!input.trim() || !user || !roomId) return
    sendMessage(roomId, input.trim()).catch(() => {
      // El error se informa desde el contexto con mensajes en español.
    })
    setInput('')
    inputRef.current?.focus()
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const groupedMessages: { label: string; msgs: typeof roomMessages }[] = []
  for (const msg of roomMessages) {
    const label = formatDateLabel(msg.timestamp)
    const last = groupedMessages[groupedMessages.length - 1]
    if (last && last.label === label) {
      last.msgs.push(msg)
    } else {
      groupedMessages.push({ label, msgs: [msg] })
    }
  }

  return (
    <div className="flex h-full flex-col bg-surface">
      {/* Header mejorado */}
      <div className="z-10 shrink-0 border-b border-white/10 bg-gradient-to-r from-card/95 to-surface/95 px-3 py-3 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/chat')}
            className="flex h-9 w-9 items-center justify-center rounded-full transition-colors hover:bg-white/10"
          >
            <HiArrowLeft className="h-5 w-5 text-white" />
          </button>

          {/* Imagen con punto de actividad */}
          <div className="relative shrink-0">
            <img
              src={room.eventImageUrl}
              alt={room.eventTitle}
              className="h-10 w-10 rounded-xl border border-white/10 object-cover"
            />
            <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-surface bg-green-400" />
          </div>

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-white">{room.eventTitle}</p>
            <div className="flex items-center gap-1 text-xs text-muted">
              <HiMapPin className="h-3 w-3 shrink-0 text-primary-light" />
              <span className="truncate">{room.eventAddress}</span>
            </div>
          </div>

          <div className="flex shrink-0 flex-col items-end gap-0.5">
            <span className="text-xs font-semibold text-white">👥 {room.memberCount}</span>
            <span className="text-[10px] text-green-400">en línea</span>
          </div>
        </div>
      </div>

      <div className="flex-1 space-y-1 overflow-y-auto px-3 py-3">
        {roomMessages.length === 0 && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="py-8 text-center text-sm text-muted"
          >
            Sé el primero en escribir 👋
          </motion.p>
        )}

        {groupedMessages.map(({ label, msgs }) => (
          <div key={label}>
            <div className="my-3 flex items-center gap-2">
              <div className="h-px flex-1 bg-white/10" />
              <span className="px-2 text-[11px] text-muted">{label}</span>
              <div className="h-px flex-1 bg-white/10" />
            </div>

            <AnimatePresence initial={false}>
              {msgs.map((msg) => {
                const isOwn = msg.senderId === user?.id
                return (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 8, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.2 }}
                    className={`mb-2 flex gap-2 ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}
                  >
                    <img
                      src={msg.senderAvatar}
                      alt={msg.senderName}
                      className="h-8 w-8 shrink-0 self-end rounded-full border border-white/10 object-cover"
                    />

                    <div className={`flex max-w-[75%] flex-col gap-0.5 ${isOwn ? 'items-end' : 'items-start'}`}>
                      {!isOwn && (
                        <span className="px-1 text-[11px] font-medium text-primary-light">
                          {msg.senderName}
                        </span>
                      )}

                      <div
                        className={`rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                          isOwn
                            ? 'rounded-tr-sm bg-gradient-to-br from-primary to-violet-700 text-white shadow-lg shadow-primary/20'
                            : 'rounded-tl-sm border border-white/10 bg-white/5 text-white backdrop-blur-sm'
                        }`}
                      >
                        {msg.text}
                      </div>

                      <div className={`flex items-center gap-1 px-1 ${isOwn ? 'flex-row-reverse' : ''}`}>
                        <span className="text-[10px] text-muted">{formatTime(msg.timestamp)}</span>
                        {isOwn && <span className="text-[10px] text-primary-light">✓✓</span>}
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>
        ))}

        <div ref={bottomRef} />

        <AnimatePresence>
          {typingUser && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              className="mt-1 flex items-center gap-2 px-1"
            >
              <span className="h-2 w-2 animate-pulse rounded-full bg-green-400" />
              <span className="text-xs text-muted">
                {typingUser} está escribiendo...
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="shrink-0 border-t border-white/10 bg-gradient-to-r from-card/95 to-surface/95 px-3 py-3 backdrop-blur-md">
        <div className="flex items-center gap-2">
          {/* Botón emoji */}
          <button
            type="button"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-lg text-muted transition-colors hover:bg-white/10 hover:text-white"
            aria-label="Emojis"
          >
            😊
          </button>

          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Escribe un mensaje..."
            className="flex-1 rounded-full border border-white/15 bg-surface px-4 py-2.5 text-sm text-white placeholder:text-muted transition-colors focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/30"
          />

          <motion.button
            whileTap={{ scale: 0.88 }}
            onClick={handleSend}
            disabled={!input.trim()}
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-all ${
              input.trim()
                ? 'bg-gradient-to-br from-primary to-violet-700 text-white shadow-lg shadow-primary/30'
                : 'cursor-not-allowed bg-white/10 text-muted'
            }`}
          >
            <HiPaperAirplane className="h-5 w-5" />
          </motion.button>
        </div>
      </div>
    </div>
  )
}
