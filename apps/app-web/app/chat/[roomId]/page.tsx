'use client'

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { useChatContext } from '@/src/context/ChatContext'
import { useAuth } from '@/src/context/AuthContext'
import { getSupabaseBrowserClient, hasSupabaseEnv } from '@/src/lib/supabase'
import type { ChatMessage } from '@/src/types'
import {
  ArrowLeft as HiArrowLeft,
  Send as HiPaperAirplane,
  MapPin as HiMapPin,
  LogOut,
  AlertTriangle,
  Users,
  ChevronDown,
  RotateCcw,
} from 'lucide-react'

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })
}

function formatDateLabel(iso: string) {
  const date = new Date(iso)
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - date.getTime()) / 86_400_000)
  if (diffDays === 0) return 'Hoy'
  if (diffDays === 1) return 'Ayer'
  return date.toLocaleDateString('es-CL', { day: 'numeric', month: 'long' })
}

type MsgGroup = {
  key: string
  senderId: string
  senderName: string
  senderAvatar: string
  isOwn: boolean
  msgs: ChatMessage[]
}

export default function ChatRoomRoutePage() {
  const params = useParams<{ roomId: string }>()
  const roomId = typeof params?.roomId === 'string' ? params.roomId : undefined
  const router = useRouter()
  const {
    rooms, messages, hasMoreMessages,
    openRoom, closeRoom,
    loadMessagesForRoom, loadMoreMessages,
    sendMessage, retryMessage, markRoomRead, leaveRoom,
  } = useChatContext()
  const { user, isAuthReady } = useAuth()

  const [input, setInput] = useState('')
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set())
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false)
  const [leavingRoom, setLeavingRoom] = useState(false)
  const [showScrollBtn, setShowScrollBtn] = useState(false)
  const [newMsgCount, setNewMsgCount] = useState(0)
  const [loadingMore, setLoadingMore] = useState(false)

  const presenceChannelRef = useRef<RealtimeChannel | null>(null)
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const isAtBottomRef = useRef(true)
  const prevMsgCountRef = useRef(0)
  const pendingScrollRestoreRef = useRef<number | null>(null)

  const room = rooms.find((r) => r.id === roomId)
  const roomMessages = messages[roomId ?? ''] ?? []
  const isExpired = room && room.status !== 'active'
  const canLoadMore = roomId ? (hasMoreMessages[roomId] ?? false) : false

  // ── Auth redirect ──────────────────────────────────────────────────────────

  useEffect(() => {
    if (isAuthReady && !user) {
      const next = roomId ? `/chat/${roomId}` : '/chat'
      router.replace(`/auth?next=${encodeURIComponent(next)}`)
    }
  }, [isAuthReady, roomId, router, user])

  // ── Activar canal realtime por sala ───────────────────────────────────────

  useEffect(() => {
    if (!roomId || !user) return
    openRoom(roomId)
    return () => closeRoom()
  }, [roomId, user, openRoom, closeRoom])

  // ── Carga inicial de mensajes ──────────────────────────────────────────────

  useEffect(() => {
    if (!roomId || !user) return
    loadMessagesForRoom(roomId).catch(() => {})
  }, [roomId, user, loadMessagesForRoom])

  // ── Marcar como leídos ────────────────────────────────────────────────────

  useEffect(() => {
    if (roomId) markRoomRead(roomId).catch(() => {})
  }, [roomId, markRoomRead])

  // ── Auto-scroll y contador de mensajes nuevos ─────────────────────────────

  useEffect(() => {
    const msgCount = roomMessages.length
    if (msgCount === prevMsgCountRef.current) return
    const delta = msgCount - prevMsgCountRef.current
    prevMsgCountRef.current = msgCount

    if (isAtBottomRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
      setNewMsgCount(0)
    } else if (delta > 0) {
      setNewMsgCount((c) => c + delta)
      setShowScrollBtn(true)
    }
  }, [roomMessages.length])

  // ── Restaurar posición de scroll tras cargar mensajes antiguos ─────────────

  useLayoutEffect(() => {
    const el = messagesContainerRef.current
    const savedHeight = pendingScrollRestoreRef.current
    if (!el || savedHeight === null) return
    el.scrollTop = el.scrollHeight - savedHeight
    pendingScrollRestoreRef.current = null
  })

  // ── Presence: indicador de escritura real ─────────────────────────────────

  useEffect(() => {
    if (!roomId || !user || !hasSupabaseEnv || isExpired) return
    const supabase = getSupabaseBrowserClient()
    const topic = `room-typing-${roomId}`

    // Evita reusar canales previos (HMR/re-render) que ya quedaron en estado joining/joined.
    const staleChannels = supabase
      .getChannels()
      .filter((ch) => ch.topic === topic || ch.topic === `realtime:${topic}`)
    for (const staleChannel of staleChannels) {
      void supabase.removeChannel(staleChannel)
    }

    const channel = supabase.channel(topic, {
      config: { presence: { key: user.id } },
    })
    presenceChannelRef.current = channel
    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState<{ typing: boolean; name: string }>()
      const typing = new Set<string>()
      for (const [userId, presences] of Object.entries(state)) {
        if (userId === user.id) continue
        for (const p of presences) {
          if (p.typing) typing.add(p.name)
        }
      }
      setTypingUsers(typing)
    })

    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        // Marca estado inicial explícito para que otros clientes no vean typing "pegado".
        void channel.track({ typing: false, name: user.name })
      }
    })

    return () => {
      if (presenceChannelRef.current === channel) {
        presenceChannelRef.current = null
      }
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
      setTypingUsers(new Set())
      void supabase.removeChannel(channel)
    }
  }, [roomId, user?.id, user?.name, isExpired])

  // ── Agrupación: fecha → grupos de sender consecutivos ─────────────────────

  const sections = useMemo(() => {
    const result: { label: string; groups: MsgGroup[] }[] = []
    roomMessages.forEach((msg, i) => {
      const label = formatDateLabel(msg.timestamp)
      const isOwn = msg.senderId === user?.id
      let section = result[result.length - 1]
      if (!section || section.label !== label) {
        section = { label, groups: [] }
        result.push(section)
      }
      const lastGroup = section.groups[section.groups.length - 1]
      if (lastGroup && lastGroup.senderId === msg.senderId && lastGroup.msgs.length < 10) {
        lastGroup.msgs.push(msg)
      } else {
        section.groups.push({
          key: `${label}-${i}`,
          senderId: msg.senderId,
          senderName: msg.senderName,
          senderAvatar: msg.senderAvatar,
          isOwn,
          msgs: [msg],
        })
      }
    })
    return result
  }, [roomMessages, user?.id])

  // ── Early returns (todos los hooks ya declarados arriba) ──────────────────

  if (isAuthReady && !user) return null

  if (!room) {
    return (
      <div className="flex flex-col items-center justify-center text-muted" style={{ height: '100dvh' }}>
        <p>Sala no encontrada</p>
        <button onClick={() => router.push('/chat')} className="mt-3 text-sm text-primary">
          Volver
        </button>
      </div>
    )
  }

  // ── Handlers ──────────────────────────────────────────────────────────────

  function broadcastTyping(typing: boolean) {
    const ch = presenceChannelRef.current
    if (!ch || !user) return
    void ch.track({ typing, name: user.name })
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    setInput(e.target.value)
    if (!hasSupabaseEnv) return
    broadcastTyping(true)
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
    typingTimeoutRef.current = setTimeout(() => broadcastTyping(false), 3000)
  }

  function handleSend() {
    if (!input.trim() || !user || !roomId || isExpired) return
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
    broadcastTyping(false)
    sendMessage(roomId, input.trim()).catch(() => {})
    setInput('')
    inputRef.current?.focus()
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  async function handleLeave() {
    if (!roomId) return
    setLeavingRoom(true)
    try {
      await leaveRoom(roomId)
      router.push('/chat')
    } catch {
      setLeavingRoom(false)
      setShowLeaveConfirm(false)
    }
  }

  function handleScroll() {
    const el = messagesContainerRef.current
    if (!el) return
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
    isAtBottomRef.current = distFromBottom < 60
    if (isAtBottomRef.current) {
      setShowScrollBtn(false)
      setNewMsgCount(0)
    }
    if (el.scrollTop < 80 && canLoadMore && !loadingMore) {
      pendingScrollRestoreRef.current = el.scrollHeight
      setLoadingMore(true)
      loadMoreMessages(roomId!).finally(() => setLoadingMore(false))
    }
  }

  function scrollToBottom() {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    setShowScrollBtn(false)
    setNewMsgCount(0)
  }

  function handleRetry(tempId: string) {
    if (!roomId) return
    retryMessage(roomId, tempId).catch(() => {})
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col bg-surface" style={{ height: '100dvh' }}>
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div
        className="z-10 shrink-0 border-b border-white/10 bg-gradient-to-r from-card/95 to-surface/95 backdrop-blur-md"
        style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
      >
        <div className="flex items-center gap-2 px-2 py-2 sm:gap-3 sm:px-3 sm:py-3">
          <button
            onClick={() => router.push('/chat')}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-white/10"
          >
            <HiArrowLeft className="h-5 w-5 text-white" />
          </button>

          {room.eventImageUrl && (
            <div className="relative shrink-0">
              <img
                src={room.eventImageUrl}
                alt={room.eventTitle}
                className="h-9 w-9 rounded-xl border border-white/10 object-cover sm:h-10 sm:w-10"
              />
              {!isExpired && (
                <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-surface bg-green-400" />
              )}
            </div>
          )}

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold leading-tight text-white">
              {room.eventTitle}
            </p>
            {room.eventAddress && (
              <div className="hidden items-center gap-1 text-xs text-muted sm:flex">
                <HiMapPin className="h-3 w-3 shrink-0 text-primary-light" />
                <span className="truncate">{room.eventAddress}</span>
              </div>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            <div className="flex items-center gap-1 text-xs text-muted">
              <Users className="h-3.5 w-3.5 shrink-0" />
              <span className="font-semibold text-white">{room.memberCount}</span>
            </div>
            {isExpired ? (
              <span className="hidden rounded-full bg-red-500/20 px-2 py-0.5 text-[10px] font-semibold text-red-400 sm:inline">
                {room.status === 'expired' ? 'Expirado' : 'Cerrado'}
              </span>
            ) : (
              <span className="hidden text-[10px] text-green-400 sm:inline">en línea</span>
            )}
            <button
              title="Salir del chat"
              onClick={() => setShowLeaveConfirm(true)}
              className="flex h-8 w-8 items-center justify-center rounded-full text-muted transition-colors hover:bg-red-500/20 hover:text-red-400"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ── Banner sala expirada ─────────────────────────────────────────── */}
      {isExpired && (
        <div className="flex items-center gap-2 border-b border-red-500/20 bg-red-500/10 px-4 py-2">
          <AlertTriangle className="h-4 w-4 shrink-0 text-red-400" />
          <p className="text-xs text-red-300">
            Este chat está{' '}
            {room.status === 'expired' ? 'expirado — el evento ya pasó' : 'cerrado'}.
            Solo puedes leer el historial.
          </p>
        </div>
      )}

      {/* ── Área de mensajes ─────────────────────────────────────────────── */}
      <div className="relative min-h-0 flex-1">
        <div
          ref={messagesContainerRef}
          onScroll={handleScroll}
          className="h-full overflow-y-auto overscroll-contain px-3 py-3"
        >
          {/* Spinner carga mensajes antiguos */}
          <AnimatePresence>
            {loadingMore && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex justify-center py-3"
              >
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </motion.div>
            )}
          </AnimatePresence>

          {roomMessages.length === 0 && !loadingMore && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="py-8 text-center text-sm text-muted"
            >
              {isExpired ? 'No hubo mensajes en este chat.' : 'Sé el primero en escribir 👋'}
            </motion.p>
          )}

          {sections.map(({ label, groups }) => (
            <div key={label}>
              {/* Separador de fecha */}
              <div className="my-3 flex items-center gap-2">
                <div className="h-px flex-1 bg-white/10" />
                <span className="px-2 text-[11px] text-muted">{label}</span>
                <div className="h-px flex-1 bg-white/10" />
              </div>

              {groups.map((group) => (
                <div
                  key={group.key}
                  className={`mb-1 flex gap-2 ${group.isOwn ? 'flex-row-reverse' : 'flex-row'}`}
                >
                  {/* Avatar solo en último mensaje del grupo */}
                  <div className="flex w-7 shrink-0 flex-col justify-end sm:w-8">
                    {!group.isOwn && (
                      <img
                        src={
                          group.senderAvatar ||
                          `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(group.senderName)}`
                        }
                        alt={group.senderName}
                        className="h-7 w-7 rounded-full border border-white/10 object-cover sm:h-8 sm:w-8"
                      />
                    )}
                  </div>

                  {/* Columna de burbujas */}
                  <div
                    className={`flex max-w-[80%] flex-col gap-0.5 sm:max-w-[75%] ${
                      group.isOwn ? 'items-end' : 'items-start'
                    }`}
                  >
                    {/* Nombre remitente: solo primera burbuja de grupo ajeno */}
                    {!group.isOwn && (
                      <span className="px-1 text-[11px] font-medium text-primary-light">
                        {group.senderName}
                      </span>
                    )}

                    <AnimatePresence initial={false}>
                      {group.msgs.map((msg, msgIdx) => {
                        const isLast = msgIdx === group.msgs.length - 1
                        const isFailed = msg.status === 'failed'
                        const isSending = msg.status === 'sending'

                        return (
                          <motion.div
                            key={msg.id}
                            initial={{ opacity: 0, y: 6, scale: 0.96 }}
                            animate={{ opacity: isSending ? 0.65 : 1, y: 0, scale: 1 }}
                            transition={{ duration: 0.18 }}
                            className="flex flex-col gap-0.5"
                          >
                            <div
                              className={`break-words px-3 py-2 text-sm leading-relaxed ${
                                group.isOwn
                                  ? isFailed
                                    ? 'rounded-2xl rounded-tr-sm border border-red-500/40 bg-red-500/15 text-red-300'
                                    : 'rounded-2xl rounded-tr-sm bg-gradient-to-br from-primary to-violet-700 text-white shadow-lg shadow-primary/20'
                                  : 'rounded-2xl rounded-tl-sm border border-white/10 bg-white/5 text-white backdrop-blur-sm'
                              }`}
                            >
                              {msg.text}
                            </div>

                            {/* Timestamp + estado: solo en el último del grupo */}
                            {isLast && (
                              <div
                                className={`flex items-center gap-1 px-1 ${
                                  group.isOwn ? 'flex-row-reverse' : ''
                                }`}
                              >
                                <span className="text-[10px] text-muted">
                                  {formatTime(msg.timestamp)}
                                </span>
                                {group.isOwn && !isFailed && (
                                  <span
                                    className={`text-[10px] ${
                                      isSending ? 'text-muted' : 'text-primary-light'
                                    }`}
                                  >
                                    {isSending ? '○' : '✓✓'}
                                  </span>
                                )}
                                {isFailed && (
                                  <button
                                    onClick={() => handleRetry(msg.id)}
                                    className="flex items-center gap-0.5 text-[10px] text-red-400 hover:text-red-300"
                                    title="Reintentar"
                                  >
                                    <RotateCcw className="h-2.5 w-2.5" />
                                    Reintentar
                                  </button>
                                )}
                              </div>
                            )}
                          </motion.div>
                        )
                      })}
                    </AnimatePresence>
                  </div>
                </div>
              ))}
            </div>
          ))}

          <div ref={bottomRef} />

          <AnimatePresence>
            {typingUsers.size > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 6 }}
                className="mt-1 flex items-center gap-2 px-1"
              >
                <span className="h-2 w-2 animate-pulse rounded-full bg-green-400" />
                <span className="text-xs text-muted">
                  {typingUsers.size === 1
                    ? `${[...typingUsers][0]} está escribiendo...`
                    : `${typingUsers.size} personas están escribiendo...`}
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Botón scroll-to-bottom ───────────────────────────────────── */}
        <AnimatePresence>
          {showScrollBtn && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 8 }}
              onClick={scrollToBottom}
              className="absolute bottom-3 right-3 flex h-10 w-10 items-center justify-center rounded-full bg-primary text-white shadow-lg shadow-primary/30"
            >
              <ChevronDown className="h-5 w-5" />
              {newMsgCount > 0 && (
                <span className="absolute -right-1.5 -top-1.5 flex min-w-4 items-center justify-center rounded-full bg-red-500 px-1 py-px text-[9px] font-bold text-white">
                  {newMsgCount > 99 ? '99+' : newMsgCount}
                </span>
              )}
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* ── Input ───────────────────────────────────────────────────────── */}
      <div
        className="shrink-0 border-t border-white/10 bg-gradient-to-r from-card/95 to-surface/95 px-3 pt-3 backdrop-blur-md"
        style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom, 0px))' }}
      >
        {isExpired ? (
          <p className="py-1 text-center text-xs text-muted">Chat cerrado · solo lectura</p>
        ) : (
          <div className="flex items-center gap-2">
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
              onChange={handleInputChange}
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
        )}
      </div>

      {/* ── Modal confirmar salir ────────────────────────────────────────── */}
      <AnimatePresence>
        {showLeaveConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 px-4 pb-4 sm:items-center sm:px-6 sm:pb-6"
            onClick={() => !leavingRoom && setShowLeaveConfirm(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="w-full max-w-sm rounded-2xl bg-card p-6 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500/20">
                  <LogOut className="h-5 w-5 text-red-400" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Salir del chat</h3>
                  <p className="text-xs text-muted">Esta acción no afecta a los demás miembros.</p>
                </div>
              </div>
              <p className="mb-5 text-xs text-white/70">
                ¿Confirmas que deseas salir de{' '}
                <strong className="text-white">{room.eventTitle}</strong>?
              </p>
              <div className="flex gap-2">
                <button
                  disabled={leavingRoom}
                  onClick={handleLeave}
                  className="flex-1 rounded-xl bg-red-500/80 py-2.5 text-sm font-semibold text-white transition hover:bg-red-500 disabled:opacity-50"
                >
                  {leavingRoom ? 'Saliendo…' : 'Sí, salir'}
                </button>
                <button
                  disabled={leavingRoom}
                  onClick={() => setShowLeaveConfirm(false)}
                  className="flex-1 rounded-xl bg-white/10 py-2.5 text-sm text-white transition hover:bg-white/20"
                >
                  Cancelar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
