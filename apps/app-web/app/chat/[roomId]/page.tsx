'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useChatContext } from '@/src/context/ChatContext'
import { useAuth } from '@/src/context/AuthContext'
import { CATEGORY_EMOJI } from '@/src/utils/eventUtils'
import {
  ArrowLeft as HiArrowLeft,
  Send as HiPaperAirplane,
  MapPin as HiMapPin,
  LogOut,
  AlertTriangle,
  Users,
  X,
} from 'lucide-react'

type PublicProfile = {
  id: string
  name: string
  bio?: string
  location?: string
  interests?: string[]
  avatar_url?: string
  cover_url?: string
}

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

function toHandle(name: string) {
  return `@${name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '')}`
}

export default function ChatRoomRoutePage() {
  const params = useParams<{ roomId: string }>()
  const roomId = typeof params?.roomId === 'string' ? params.roomId : undefined
  const router = useRouter()
  const { rooms, messages, loadMessagesForRoom, sendMessage, markRoomRead, leaveRoom } = useChatContext()
  const { user, isAuthReady } = useAuth()
  const [input, setInput] = useState('')
  const [typingUser, setTypingUser] = useState<string | null>(null)
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false)
  const [leavingRoom, setLeavingRoom] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // ── Participants panel ─────────────────────────────────────────────────────
  const [showParticipants, setShowParticipants] = useState(false)
  const [viewingProfile, setViewingProfile] = useState<{ id: string; name: string; avatar: string } | null>(null)
  const [profileData, setProfileData] = useState<PublicProfile | null>(null)
  const [loadingProfile, setLoadingProfile] = useState(false)

  const room = rooms.find((r) => r.id === roomId)
  const roomMessages = messages[roomId ?? ''] ?? []
  const isExpired = room && room.status !== 'active'

  useEffect(() => {
    if (isAuthReady && !user) {
      const next = roomId ? `/chat/${roomId}` : '/chat'
      router.replace(`/auth?next=${encodeURIComponent(next)}`)
    }
  }, [isAuthReady, roomId, router, user])

  useEffect(() => {
    if (!roomId || !user) return
    loadMessagesForRoom(roomId).catch(() => {})
  }, [roomId, user, loadMessagesForRoom])

  useEffect(() => {
    if (roomId) {
      markRoomRead(roomId).catch(() => {})
    }
  }, [roomId, markRoomRead])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [roomMessages.length])

  // ── Fetch public profile when viewingProfile changes ──────────────────────
  useEffect(() => {
    if (!viewingProfile) { setProfileData(null); return }
    setLoadingProfile(true)
    setProfileData(null)
    fetch(`/api/profile/${viewingProfile.id}`, { cache: 'no-store' })
      .then((r) => r.ok ? r.json() : null)
      .then((data: PublicProfile | null) => setProfileData(data))
      .catch(() => setProfileData(null))
      .finally(() => setLoadingProfile(false))
  }, [viewingProfile])

  if (isAuthReady && !user) return null

  const otherParticipants = useMemo(() => {
    const bySender = new Map<string, { id: string; name: string; avatar: string }>()
    for (const msg of roomMessages) {
      if (msg.senderId !== user?.id && !bySender.has(msg.senderId)) {
        bySender.set(msg.senderId, { id: msg.senderId, name: msg.senderName, avatar: msg.senderAvatar })
      }
    }
    return Array.from(bySender.values())
  }, [roomMessages, user?.id])

  useEffect(() => {
    if (!roomId || otherParticipants.length === 0 || isExpired) return

    const interval = setInterval(() => {
      if (Math.random() > 0.45) return
      const randomUser = otherParticipants[Math.floor(Math.random() * otherParticipants.length)]
      setTypingUser(randomUser.name)
      setTimeout(() => setTypingUser((curr) => (curr === randomUser.name ? null : curr)), 2000)
    }, 6500)

    return () => clearInterval(interval)
  }, [otherParticipants, roomId, isExpired])

  if (!room) {
    return (
      <div className="flex h-screen flex-col items-center justify-center text-muted" style={{ height: '100dvh' }}>
        <p>Sala no encontrada</p>
        <button onClick={() => router.push('/chat')} className="mt-3 text-sm text-primary">
          Volver
        </button>
      </div>
    )
  }

  function handleSend() {
    if (!input.trim() || !user || !roomId || isExpired) return
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
    <div
      className="flex flex-col bg-surface"
      style={{ height: '100dvh' }}
    >
      {/* ── Header ────────────────────────────────────────────────────── */}
      <div className="z-10 shrink-0 border-b border-white/10 bg-gradient-to-r from-card/95 to-surface/95 backdrop-blur-md"
        style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
      >
        <div className="flex items-center gap-2 px-2 py-2 sm:gap-3 sm:px-3 sm:py-3">
          {/* Botón volver */}
          <button
            onClick={() => router.push('/chat')}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-white/10"
          >
            <HiArrowLeft className="h-5 w-5 text-white" />
          </button>

          {/* Imagen del evento */}
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

          {/* Título + dirección */}
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

          {/* Miembros + estado */}
          <div className="flex shrink-0 items-center gap-1.5">
            {/* Participants toggle button */}
            <button
              title="Ver participantes"
              onClick={() => setShowParticipants((prev) => !prev)}
              className={`flex items-center gap-1 rounded-full px-2 py-1 text-xs transition-colors ${
                showParticipants ? 'bg-primary/20 text-primary-light' : 'text-muted hover:bg-white/10 hover:text-white'
              }`}
            >
              <Users className="h-3.5 w-3.5 shrink-0" />
              <span className="font-semibold text-white">{room.memberCount}</span>
            </button>
            {isExpired ? (
              <span className="hidden rounded-full bg-red-500/20 px-2 py-0.5 text-[10px] font-semibold text-red-400 sm:inline">
                {room.status === 'expired' ? 'Expirado' : 'Cerrado'}
              </span>
            ) : (
              <span className="hidden text-[10px] text-green-400 sm:inline">en línea</span>
            )}

            {/* Botón salir */}
            <button
              title="Salir del chat"
              onClick={() => setShowLeaveConfirm(true)}
              className="flex h-8 w-8 items-center justify-center rounded-full text-muted transition-colors hover:bg-red-500/20 hover:text-red-400"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* ── Participants panel ── */}
        <AnimatePresence>
          {showParticipants && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden border-t border-white/10"
            >
              <div className="flex gap-3 overflow-x-auto px-3 py-3 scrollbar-hide">
                {/* Current user */}
                {user && (
                  <button
                    onClick={() => setViewingProfile({ id: user.id, name: user.name, avatar: user.avatarUrl ?? '' })}
                    className="flex flex-col items-center gap-1 shrink-0"
                  >
                    <div className="relative">
                      {user.avatarUrl ? (
                        <img
                          src={user.avatarUrl}
                          alt={user.name}
                          className="h-10 w-10 rounded-full border-2 border-primary object-cover"
                        />
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-primary bg-primary/20 text-xs font-bold text-white">
                          {user.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border border-surface bg-green-400" />
                    </div>
                    <span className="max-w-[56px] truncate text-[10px] text-primary-light">Tú</span>
                  </button>
                )}
                {/* Other participants */}
                {otherParticipants.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setViewingProfile({ id: p.id, name: p.name, avatar: p.avatar })}
                    className="flex flex-col items-center gap-1 shrink-0"
                  >
                    {p.avatar ? (
                      <img
                        src={p.avatar}
                        alt={p.name}
                        className="h-10 w-10 rounded-full border border-white/20 object-cover"
                      />
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-white/10 text-xs font-bold text-white">
                        {p.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <span className="max-w-[56px] truncate text-[10px] text-muted">{p.name.split(' ')[0]}</span>
                  </button>
                ))}
                {otherParticipants.length === 0 && (
                  <p className="py-1 text-xs text-muted">Aún no hay otros participantes.</p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Banner sala expirada ───────────────────────────────────────── */}
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

      {/* ── Mensajes ──────────────────────────────────────────────────── */}
      <div className="min-h-0 flex-1 space-y-1 overflow-y-auto overscroll-contain px-3 py-3">
        {roomMessages.length === 0 && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="py-8 text-center text-sm text-muted"
          >
            {isExpired ? 'No hubo mensajes en este chat.' : 'Sé el primero en escribir 👋'}
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
                      src={
                        msg.senderAvatar ||
                        `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(msg.senderName)}`
                      }
                      alt={msg.senderName}
                      className="h-7 w-7 shrink-0 self-end rounded-full border border-white/10 object-cover sm:h-8 sm:w-8"
                    />

                    <div
                      className={`flex max-w-[80%] flex-col gap-0.5 sm:max-w-[75%] ${
                        isOwn ? 'items-end' : 'items-start'
                      }`}
                    >
                      {!isOwn && (
                        <span className="px-1 text-[11px] font-medium text-primary-light">
                          {msg.senderName}
                        </span>
                      )}

                      <div
                        className={`break-words rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                          isOwn
                            ? 'rounded-tr-sm bg-gradient-to-br from-primary to-violet-700 text-white shadow-lg shadow-primary/20'
                            : 'rounded-tl-sm border border-white/10 bg-white/5 text-white backdrop-blur-sm'
                        }`}
                      >
                        {msg.text}
                      </div>

                      <div
                        className={`flex items-center gap-1 px-1 ${isOwn ? 'flex-row-reverse' : ''}`}
                      >
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
              <span className="text-xs text-muted">{typingUser} está escribiendo...</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Input ─────────────────────────────────────────────────────── */}
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
        )}
      </div>

      {/* ── Modal confirmar salir ──────────────────────────────────────── */}
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

      {/* ── Mini profile sheet ────────────────────────────────────────── */}
      <AnimatePresence>
        {viewingProfile && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
              onClick={() => setViewingProfile(null)}
            />
            {/* Drawer */}
            <motion.div
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ type: 'spring', stiffness: 380, damping: 34 }}
              className="fixed bottom-0 left-0 right-0 z-50 mx-auto max-w-lg rounded-t-3xl border border-white/10 bg-card shadow-2xl"
              style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom, 0px))' }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Drag handle */}
              <div className="flex justify-center pt-3 pb-1">
                <div className="h-1 w-10 rounded-full bg-white/20" />
              </div>

              {/* Close button */}
              <button
                onClick={() => setViewingProfile(null)}
                className="absolute right-4 top-4 flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-muted hover:bg-white/20"
              >
                <X className="h-4 w-4" />
              </button>

              <div className="px-5 pb-2 pt-3">
                {loadingProfile ? (
                  <div className="flex flex-col items-center gap-3 py-8">
                    <div className="h-16 w-16 animate-pulse rounded-full bg-white/10" />
                    <div className="h-4 w-32 animate-pulse rounded bg-white/10" />
                    <div className="h-3 w-48 animate-pulse rounded bg-white/5" />
                  </div>
                ) : (
                  <>
                    {/* Avatar + name */}
                    <div className="flex flex-col items-center text-center">
                      <div className="mb-3 rounded-full bg-gradient-to-br from-primary via-purple-500 to-pink-500 p-[2px] shadow-lg shadow-primary/30">
                        {(profileData?.avatar_url ?? viewingProfile.avatar) ? (
                          <img
                            src={profileData?.avatar_url ?? viewingProfile.avatar}
                            alt={viewingProfile.name}
                            className="h-16 w-16 rounded-full border-2 border-surface object-cover"
                          />
                        ) : (
                          <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-surface bg-surface text-lg font-bold text-white">
                            {viewingProfile.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <h3 className="text-base font-bold text-white">{profileData?.name ?? viewingProfile.name}</h3>
                      <p className="text-xs font-semibold text-primary-light">
                        {toHandle(profileData?.name ?? viewingProfile.name)}
                      </p>
                      {(profileData?.bio) && (
                        <p className="mt-2 max-w-xs text-xs text-muted leading-relaxed line-clamp-2">{profileData.bio}</p>
                      )}
                      {(profileData?.location) && (
                        <div className="mt-1.5 flex items-center gap-1 text-[11px] text-muted">
                          <HiMapPin className="h-3 w-3 text-primary-light" />
                          <span>{profileData.location}</span>
                        </div>
                      )}
                    </div>

                    {/* Interests */}
                    {profileData?.interests && profileData.interests.length > 0 && (
                      <div className="mt-4">
                        <p className="mb-2 text-[11px] uppercase tracking-wide text-muted">Intereses</p>
                        <div className="flex flex-wrap gap-1.5">
                          {profileData.interests.slice(0, 6).map((interest) => (
                            <span
                              key={interest}
                              className="inline-flex items-center gap-1 rounded-full border border-violet-500/30 bg-violet-500/10 px-2.5 py-1 text-[11px] text-violet-300"
                            >
                              {CATEGORY_EMOJI[interest as keyof typeof CATEGORY_EMOJI] ?? '🎯'} {interest}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* No profile data fallback */}
                    {!profileData && !loadingProfile && (
                      <p className="mt-4 text-center text-xs text-muted">No se pudo cargar el perfil.</p>
                    )}
                  </>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
