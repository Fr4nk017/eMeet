'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useChatContext } from '../../../src/context/ChatContext'
import { useAuth } from '../../../src/context/AuthContext'
import { HiArrowLeft, HiPaperAirplane, HiMapPin } from 'react-icons/hi2'

const CURRENT_USER_ID = 'user-1'

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
  const { user } = useAuth()
  const [input, setInput] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const room = rooms.find((r) => r.id === roomId)
  const roomMessages = messages[roomId ?? ''] ?? []

  useEffect(() => {
    if (roomId) markRoomRead(roomId)
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [roomId, markRoomRead])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [roomMessages.length])

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
    sendMessage(roomId, input.trim(), CURRENT_USER_ID, user.name, user.avatarUrl)
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
      <div className="z-10 flex shrink-0 items-center gap-3 border-b border-white/10 bg-card/90 px-3 py-3 backdrop-blur-md">
        <button
          onClick={() => router.push('/chat')}
          className="flex h-9 w-9 items-center justify-center rounded-full transition-colors hover:bg-white/10"
        >
          <HiArrowLeft className="h-5 w-5 text-white" />
        </button>

        <img
          src={room.eventImageUrl}
          alt={room.eventTitle}
          className="h-10 w-10 shrink-0 rounded-xl border border-white/10 object-cover"
        />

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-white">{room.eventTitle}</p>
          <div className="flex items-center gap-1 text-xs text-muted">
            <HiMapPin className="h-3 w-3 shrink-0 text-primary-light" />
            <span className="truncate">{room.eventAddress}</span>
          </div>
        </div>

        <span className="shrink-0 rounded-full bg-white/5 px-2 py-1 text-xs text-muted">
          👥 {room.memberCount}
        </span>
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
                const isOwn = msg.senderId === CURRENT_USER_ID
                return (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 8, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.2 }}
                    className={`mb-2 flex gap-2 ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}
                  >
                    {!isOwn && (
                      <img
                        src={msg.senderAvatar}
                        alt={msg.senderName}
                        className="h-8 w-8 shrink-0 self-end rounded-full border border-white/10 object-cover"
                      />
                    )}

                    <div className={`flex max-w-[75%] flex-col gap-0.5 ${isOwn ? 'items-end' : 'items-start'}`}>
                      {!isOwn && (
                        <span className="px-1 text-[11px] font-medium text-primary-light">
                          {msg.senderName}
                        </span>
                      )}

                      <div
                        className={`rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                          isOwn
                            ? 'rounded-tr-sm bg-primary text-white'
                            : 'rounded-tl-sm border border-white/10 bg-card text-white'
                        }`}
                      >
                        {msg.text}
                      </div>

                      <span className="px-1 text-[10px] text-muted">{formatTime(msg.timestamp)}</span>
                    </div>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>
        ))}

        <div ref={bottomRef} />
      </div>

      <div className="shrink-0 border-t border-white/10 bg-card/90 px-3 py-3 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Escribe un mensaje..."
            className="flex-1 rounded-full border border-white/15 bg-surface px-4 py-2.5 text-sm text-white placeholder:text-muted transition-colors focus:border-primary/60 focus:outline-none"
          />
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={handleSend}
            disabled={!input.trim()}
            className={`flex h-10 w-10 items-center justify-center rounded-full transition-all ${
              input.trim()
                ? 'bg-primary text-white shadow-md shadow-primary/30'
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
