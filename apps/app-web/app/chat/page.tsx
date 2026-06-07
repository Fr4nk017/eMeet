'use client'

import { forwardRef, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  MessageCircle,
  LogOut,
  Clock,
  AlertCircle,
  Users,
  CheckSquare,
  Square,
  Trash2,
  X,
  CheckCheck,
} from 'lucide-react'
import Layout from '@/src/components/Layout'
import { useAuth } from '@/src/context/AuthContext'
import { useChatContext } from '@/src/context/ChatContext'
import type { ChatRoom } from '@/src/types'

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

const RoomRow = forwardRef<HTMLDivElement, {
  room: ChatRoom
  onOpen: () => void
  onLeave: () => void
  selectionMode: boolean
  selected: boolean
  onToggle: () => void
}>(function RoomRow({
  room,
  onOpen,
  onLeave,
  selectionMode,
  selected,
  onToggle,
}, ref) {
  const [confirmLeave, setConfirmLeave] = useState(false)
  const isActive = room.status === 'active'

  function handleClick() {
    if (selectionMode) {
      onToggle()
      return
    }
    if (isActive && !confirmLeave) onOpen()
  }

  return (
    <motion.div
      ref={ref}
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className={`group relative flex items-center gap-3 rounded-2xl border p-3 transition-all ${
        selectionMode
          ? selected
            ? 'cursor-pointer border-violet-500/50 bg-violet-500/15'
            : 'cursor-pointer border-white/10 hover:border-violet-500/20 hover:bg-violet-500/5'
          : isActive
          ? 'cursor-pointer border-violet-500/10 hover:border-violet-500/30 hover:bg-violet-500/10'
          : 'cursor-default border-white/5 opacity-60'
      }`}
      onClick={handleClick}
    >
      {/* Checkbox (selection mode) */}
      {selectionMode && (
        <div className="shrink-0">
          {selected ? (
            <CheckSquare className="h-5 w-5 text-violet-400" />
          ) : (
            <Square className="h-5 w-5 text-white/30" />
          )}
        </div>
      )}

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
        {isActive && !selectionMode && (
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

      {/* Meta / Leave button */}
      {!selectionMode && (
        <>
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
                className="ml-1 shrink-0 rounded-lg p-1.5 text-muted transition-all hover:bg-red-500/20 hover:text-red-400 sm:opacity-0 sm:group-hover:opacity-100"
              >
                <LogOut className="h-4 w-4" />
              </button>
            )}
          </AnimatePresence>
        </>
      )}
    </motion.div>
  )
})

export default function ChatPage() {
  const router = useRouter()
  const { user, isAuthReady } = useAuth()
  const { rooms, leaveRoom } = useChatContext()

  const [leavingId, setLeavingId] = useState<string | null>(null)
  const [selectionMode, setSelectionMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkLeaving, setBulkLeaving] = useState(false)
  const [confirmBulk, setConfirmBulk] = useState(false)

  useEffect(() => {
    if (isAuthReady && !user) {
      router.replace('/auth?next=/chat')
    }
  }, [isAuthReady, router, user])

  if (isAuthReady && !user) return null

  const activeRooms = rooms.filter((r) => r.status === 'active')
  const closedRooms = rooms.filter((r) => r.status !== 'active')
  const allIds = rooms.map((r) => r.id)
  const allSelected = selectedIds.size === rooms.length && rooms.length > 0

  function toggleSelect(roomId: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(roomId)) next.delete(roomId)
      else next.add(roomId)
      return next
    })
  }

  function toggleSelectAll() {
    if (allSelected) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(allIds))
    }
  }

  function exitSelectionMode() {
    setSelectionMode(false)
    setSelectedIds(new Set())
    setConfirmBulk(false)
  }

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

  async function handleBulkLeave() {
    if (selectedIds.size === 0) return
    setBulkLeaving(true)
    try {
      await Promise.all([...selectedIds].map((id) => leaveRoom(id)))
      exitSelectionMode()
    } finally {
      setBulkLeaving(false)
      setConfirmBulk(false)
    }
  }

  return (
    <Layout headerTitle="Chats" showHeader={true}>
      <div className="mx-auto max-w-lg px-4 py-4">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          {selectionMode ? (
            /* ─ Selection mode header ─ */
            <div className="flex w-full items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={exitSelectionMode}
                  className="rounded-lg p-1.5 text-muted hover:bg-white/10 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
                <span className="text-sm font-semibold text-white">
                  {selectedIds.size === 0
                    ? 'Seleccionar'
                    : `${selectedIds.size} seleccionado${selectedIds.size !== 1 ? 's' : ''}`}
                </span>
              </div>
              <button
                onClick={toggleSelectAll}
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-violet-300 hover:bg-violet-500/10"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                {allSelected ? 'Deseleccionar todo' : 'Seleccionar todo'}
              </button>
            </div>
          ) : (
            /* ─ Normal header ─ */
            <>
              <div>
                <h1 className="text-lg font-bold text-white">Mis Chats</h1>
                <p className="text-xs text-muted">
                  {activeRooms.length} activo{activeRooms.length !== 1 ? 's' : ''}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {rooms.some((r) => r.unreadCount > 0) && (
                  <span className="rounded-full bg-primary/20 px-3 py-1 text-xs font-semibold text-primary-light">
                    Nuevos mensajes
                  </span>
                )}
                {rooms.length > 0 && (
                  <button
                    onClick={() => setSelectionMode(true)}
                    className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs font-semibold text-muted hover:border-white/20 hover:text-white"
                  >
                    <CheckSquare className="h-3.5 w-3.5" />
                    Seleccionar
                  </button>
                )}
              </div>
            </>
          )}
        </div>

        {/* Lista de salas */}
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
                  selectionMode={selectionMode}
                  selected={selectedIds.has(room.id)}
                  onToggle={() => toggleSelect(room.id)}
                />
              ))}
            </AnimatePresence>

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
                      selectionMode={selectionMode}
                      selected={selectedIds.has(room.id)}
                      onToggle={() => toggleSelect(room.id)}
                    />
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
        )}

        {/* ─ Barra de acción bulk (selection mode) ─ */}
        <AnimatePresence>
          {selectionMode && selectedIds.size > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="fixed bottom-20 left-1/2 z-40 -translate-x-1/2"
            >
              <button
                onClick={() => setConfirmBulk(true)}
                className="flex items-center gap-2 rounded-2xl bg-red-500 px-5 py-3 text-sm font-semibold text-white shadow-xl hover:bg-red-600 active:scale-95"
              >
                <Trash2 className="h-4 w-4" />
                Salir de {selectedIds.size} chat{selectedIds.size !== 1 ? 's' : ''}
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ─ Modal confirmación bulk ─ */}
        <AnimatePresence>
          {confirmBulk && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 pb-8 sm:items-center sm:pb-0"
              onClick={() => !bulkLeaving && setConfirmBulk(false)}
            >
              <motion.div
                initial={{ scale: 0.95, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 20 }}
                className="mx-4 w-full max-w-sm rounded-2xl bg-surface p-6 shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <h3 className="mb-1 text-base font-bold text-white">
                  ¿Salir de {selectedIds.size} chat{selectedIds.size !== 1 ? 's' : ''}?
                </h3>
                <p className="mb-5 text-sm text-muted">
                  No podrás ver los mensajes anteriores de estos grupos.
                </p>
                <div className="flex gap-3">
                  <button
                    disabled={bulkLeaving}
                    onClick={() => setConfirmBulk(false)}
                    className="flex-1 rounded-xl bg-white/10 py-2.5 text-sm font-semibold text-white hover:bg-white/20 disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                  <button
                    disabled={bulkLeaving}
                    onClick={handleBulkLeave}
                    className="flex-1 rounded-xl bg-red-500 py-2.5 text-sm font-semibold text-white hover:bg-red-600 disabled:opacity-50"
                  >
                    {bulkLeaving ? 'Saliendo…' : 'Sí, salir'}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Spinner leave individual */}
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
