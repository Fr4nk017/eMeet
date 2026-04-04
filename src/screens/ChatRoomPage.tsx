'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useChatContext } from '../context/ChatContext'
import { useAuth } from '../context/AuthContext'
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

export default function ChatRoomPage() {
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

  // Marcar como leídos al entrar y hacer scroll al final
  useEffect(() => {
    if (roomId) markRoomRead(roomId)
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [roomId, markRoomRead])

  // Scroll al fondo cuando llegan nuevos mensajes
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [roomMessages.length])

  if (!room) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted">
        <p>Sala no encontrada</p>
        <button onClick={() => router.push('/chat')} className="mt-3 text-primary text-sm">
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

  // Agrupa mensajes por día para mostrar separadores de fecha
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
    <div className="flex flex-col h-full bg-surface">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-3 py-3 border-b border-white/10 bg-card/90 backdrop-blur-md z-10 shrink-0">
        <button
          onClick={() => router.push('/chat')}
          className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors"
        >
          <HiArrowLeft className="w-5 h-5 text-white" />
        </button>

        <img
          src={room.eventImageUrl}
          alt={room.eventTitle}
          className="w-10 h-10 rounded-xl object-cover border border-white/10 shrink-0"
        />

        <div className="flex-1 min-w-0">
          <p className="text-white text-sm font-semibold truncate">{room.eventTitle}</p>
          <div className="flex items-center gap-1 text-muted text-xs">
            <HiMapPin className="w-3 h-3 text-primary-light shrink-0" />
            <span className="truncate">{room.eventAddress}</span>
          </div>
        </div>

        <span className="shrink-0 text-muted text-xs bg-white/5 px-2 py-1 rounded-full">
          👥 {room.memberCount}
        </span>
      </div>

      {/* ── Mensajes ────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
        {roomMessages.length === 0 && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center text-muted text-sm py-8"
          >
            Sé el primero en escribir 👋
          </motion.p>
        )}

        {groupedMessages.map(({ label, msgs }) => (
          <div key={label}>
            {/* Separador de fecha */}
            <div className="flex items-center gap-2 my-3">
              <div className="flex-1 h-px bg-white/10" />
              <span className="text-muted text-[11px] px-2">{label}</span>
              <div className="flex-1 h-px bg-white/10" />
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
                    className={`flex gap-2 mb-2 ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}
                  >
                    {/* Avatar */}
                    {!isOwn && (
                      <img
                        src={msg.senderAvatar}
                        alt={msg.senderName}
                        className="w-8 h-8 rounded-full object-cover shrink-0 self-end border border-white/10"
                      />
                    )}

                    <div
                      className={`max-w-[75%] flex flex-col gap-0.5 ${isOwn ? 'items-end' : 'items-start'}`}
                    >
                      {/* Nombre del emisor (solo para otros) */}
                      {!isOwn && (
                        <span className="text-[11px] text-primary-light font-medium px-1">
                          {msg.senderName}
                        </span>
                      )}

                      {/* Burbuja */}
                      <div
                        className={`px-3 py-2 rounded-2xl text-sm leading-relaxed ${
                          isOwn
                            ? 'bg-primary text-white rounded-tr-sm'
                            : 'bg-card text-white border border-white/10 rounded-tl-sm'
                        }`}
                      >
                        {msg.text}
                      </div>

                      {/* Hora */}
                      <span className="text-[10px] text-muted px-1">
                        {formatTime(msg.timestamp)}
                      </span>
                    </div>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>
        ))}

        <div ref={bottomRef} />
      </div>

      {/* ── Input de mensaje ────────────────────────────────────────────── */}
      <div className="shrink-0 px-3 py-3 border-t border-white/10 bg-card/90 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Escribe un mensaje..."
            className="flex-1 px-4 py-2.5 rounded-full bg-surface border border-white/15 text-white text-sm placeholder:text-muted focus:outline-none focus:border-primary/60 transition-colors"
          />
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={handleSend}
            disabled={!input.trim()}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
              input.trim()
                ? 'bg-primary text-white shadow-md shadow-primary/30'
                : 'bg-white/10 text-muted cursor-not-allowed'
            }`}
          >
            <HiPaperAirplane className="w-5 h-5" />
          </motion.button>
        </div>
      </div>
    </div>
  )
}
