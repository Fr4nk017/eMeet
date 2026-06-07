'use client'

import { useAuth } from '@/src/context/AuthContext'
import { useLocatarioEvents } from '@/src/context/LocatarioEventsContext'
import type { CreateLocatarioEventInput } from '@/src/context/LocatarioEventsContext'
import { CreateEventModal } from '@/src/components/CreateEventModal'
import { useRouter } from 'next/navigation'
import {
  LogOut,
  Plus,
  Calendar,
  Loader2,
  Trash2,
  Home,
  Pencil,
  Users,
  Search,
  CheckCircle,
  AlertCircle,
  X,
} from 'lucide-react'
import type { Event } from '@/src/types'
import { useEffect, useRef, useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const CATEGORY_LABELS: Record<string, string> = {
  gastronomia: 'Gastronomía',
  musica: 'Música',
  cultura: 'Cultura',
  networking: 'Networking',
  deporte: 'Deporte',
  fiesta: 'Fiesta',
  teatro: 'Teatro',
  arte: 'Arte',
}

const CATEGORY_COLORS: Record<string, string> = {
  gastronomia: 'bg-orange-500/12 text-orange-300 border-orange-500/20',
  musica: 'bg-purple-500/12 text-purple-300 border-purple-500/20',
  cultura: 'bg-blue-500/12 text-blue-300 border-blue-500/20',
  networking: 'bg-cyan-500/12 text-cyan-300 border-cyan-500/20',
  deporte: 'bg-green-500/12 text-green-300 border-green-500/20',
  fiesta: 'bg-pink-500/12 text-pink-300 border-pink-500/20',
  teatro: 'bg-yellow-500/12 text-yellow-300 border-yellow-500/20',
  arte: 'bg-rose-500/12 text-rose-300 border-rose-500/20',
}

function CategoryBadge({ category }: { category: string }) {
  const cls = CATEGORY_COLORS[category] ?? 'bg-white/8 text-slate-300 border-white/12'
  return (
    <span className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${cls}`}>
      {CATEGORY_LABELS[category] ?? category}
    </span>
  )
}

function ConfirmDelete({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-slate-400">¿Eliminar?</span>
      <button
        onClick={onConfirm}
        className="rounded-lg bg-red-500/15 px-2.5 py-1 text-xs font-semibold text-red-400 transition-colors hover:bg-red-500/25"
      >
        Sí
      </button>
      <button
        onClick={onCancel}
        className="rounded-lg bg-white/8 px-2.5 py-1 text-xs font-medium text-slate-300 transition-colors hover:bg-white/15"
      >
        No
      </button>
    </div>
  )
}

export default function LocatarioPage() {
  const { user, logout, isAuthReady } = useAuth()
  const { createLocatarioEvent, locatarioEvents, removeLocatarioEvent, updateLocatarioEvent, isLoading } = useLocatarioEvents()
  const router = useRouter()

  const [showCreateEvent, setShowCreateEvent] = useState(false)
  const [editingEvent, setEditingEvent] = useState<Event | null>(null)
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!isAuthReady) return
    if (!user) { router.replace('/auth'); return }
    if (user.role !== 'locatario') router.replace('/')
  }, [isAuthReady, user, router])

  useEffect(() => {
    if (!feedback) return
    if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current)
    feedbackTimerRef.current = setTimeout(() => setFeedback(null), 4500)
    return () => { if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current) }
  }, [feedback])

  const filteredEvents = useMemo(() =>
    locatarioEvents.filter((e) =>
      e.title.toLowerCase().includes(search.toLowerCase()) ||
      (e.address ?? '').toLowerCase().includes(search.toLowerCase())
    ),
    [locatarioEvents, search]
  )

  const handleLogout = () => { logout(); router.push('/auth') }

  const handleModalSubmit = async (input: CreateLocatarioEventInput) => {
    try {
      await createLocatarioEvent(input)
      setShowCreateEvent(false)
      setFeedback({ message: '¡Evento publicado! Ya aparece en el feed principal.', type: 'success' })
    } catch (err) {
      setFeedback({ message: err instanceof Error ? err.message : 'No se pudo crear el evento.', type: 'error' })
      throw err
    }
  }

  const handleEditSubmit = async (input: CreateLocatarioEventInput) => {
    if (!editingEvent) return
    try {
      await updateLocatarioEvent(editingEvent.id, input)
      setEditingEvent(null)
      setFeedback({ message: '¡Evento actualizado correctamente!', type: 'success' })
    } catch (err) {
      setFeedback({ message: err instanceof Error ? err.message : 'No se pudo actualizar el evento.', type: 'error' })
      throw err
    }
  }

  const handleDelete = async (eventId: string) => {
    setDeletingId(eventId)
    setConfirmDeleteId(null)
    try {
      await removeLocatarioEvent(eventId)
      setFeedback({ message: 'Evento eliminado correctamente.', type: 'success' })
    } catch {
      setFeedback({ message: 'No se pudo eliminar el evento.', type: 'error' })
    } finally {
      setDeletingId(null)
    }
  }

  if (!isAuthReady || !user || user.role !== 'locatario') return null

  const totalAttendees = locatarioEvents.reduce((sum, e) => sum + e.attendees, 0)
  const initials = ((user.businessName || user.name || '?')[0]).toUpperCase()
  const displayName = user.businessName || user.name

  return (
    <div className="min-h-screen bg-[hsl(222,47%,6%)] text-white">

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-white/8 bg-[rgba(15,23,42,0.94)] backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          {/* Brand + user */}
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-[hsl(262,80%,60%)] to-[hsl(262,80%,44%)] shadow-lg shadow-purple-900/30">
              <span className="text-base">🎉</span>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-[hsl(262,80%,65%)]">eMeet</p>
              <p className="text-sm font-semibold leading-tight text-white">{displayName}</p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push('/')}
              className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-slate-400 transition-colors hover:bg-white/6 hover:text-white"
            >
              <Home size={15} />
              <span className="hidden sm:inline">Ver feed</span>
            </button>

            <button
              onClick={() => setShowCreateEvent(true)}
              className="flex items-center gap-2 rounded-xl bg-[hsl(38,95%,55%)] px-4 py-2 text-sm font-semibold text-black shadow-lg shadow-amber-900/20 transition-all hover:-translate-y-0.5 hover:bg-[hsl(38,95%,60%)]"
            >
              <Plus size={15} />
              <span>Crear evento</span>
            </button>

            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-red-400/70 transition-colors hover:bg-red-500/10 hover:text-red-400"
            >
              <LogOut size={15} />
              <span className="hidden sm:inline">Salir</span>
            </button>
          </div>
        </div>
      </header>

      {/* Feedback toast */}
      <div className="pointer-events-none fixed bottom-6 left-1/2 z-50 -translate-x-1/2">
        <AnimatePresence>
          {feedback && (
            <motion.div
              initial={{ opacity: 0, y: 16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.96 }}
              transition={{ duration: 0.22 }}
              className={`pointer-events-auto flex items-center gap-3 rounded-2xl border px-5 py-3.5 shadow-2xl backdrop-blur-xl ${
                feedback.type === 'success'
                  ? 'border-emerald-500/30 bg-[rgba(15,23,42,0.96)] text-emerald-300'
                  : 'border-red-500/30 bg-[rgba(15,23,42,0.96)] text-red-300'
              }`}
            >
              {feedback.type === 'success' ? (
                <CheckCircle size={17} className="shrink-0" />
              ) : (
                <AlertCircle size={17} className="shrink-0" />
              )}
              <span className="text-sm font-medium">{feedback.message}</span>
              {feedback.type === 'success' && (
                <button
                  onClick={() => router.push('/')}
                  className="ml-2 whitespace-nowrap text-xs font-semibold text-emerald-400 underline underline-offset-2 hover:text-emerald-300"
                >
                  Ir al feed
                </button>
              )}
              <button
                onClick={() => setFeedback(null)}
                className="ml-1 text-current opacity-50 transition-opacity hover:opacity-100"
              >
                <X size={14} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Main */}
      <main className="mx-auto max-w-7xl px-4 py-8">

        {/* Welcome */}
        <div className="mb-7">
          <h1 className="text-2xl font-bold text-white">Bienvenido, {displayName}</h1>
          <p className="mt-1 text-sm text-slate-400">Gestiona tus eventos desde este panel.</p>
        </div>

        {/* Stats */}
        <div className="mb-7 grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-white/10 bg-[rgba(15,23,42,0.75)] p-5">
            <div className="mb-3 flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[hsl(262,80%,60%)]/15">
                <Calendar size={15} className="text-[hsl(262,80%,65%)]" />
              </div>
              <p className="text-xs text-slate-400">Eventos activos</p>
            </div>
            <p className="text-3xl font-bold text-white">
              {isLoading ? <Loader2 className="animate-spin" size={26} /> : locatarioEvents.length}
            </p>
            <p className="mt-1 text-xs text-slate-500">Publicados en tu panel</p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[rgba(15,23,42,0.75)] p-5">
            <div className="mb-3 flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[hsl(38,95%,55%)]/15">
                <Users size={15} className="text-[hsl(38,95%,65%)]" />
              </div>
              <p className="text-xs text-slate-400">Asistentes totales</p>
            </div>
            <p className="text-3xl font-bold text-white">{totalAttendees}</p>
            <p className="mt-1 text-xs text-slate-500">Acumulado de todos los eventos</p>
          </div>
        </div>

        {/* Events table */}
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-[rgba(15,23,42,0.75)]">
          {/* Table header */}
          <div className="flex flex-col gap-3 border-b border-white/8 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2.5">
              <Calendar size={16} className="text-[hsl(262,80%,65%)]" />
              <h2 className="font-semibold text-white">Tus eventos</h2>
              {locatarioEvents.length > 0 && (
                <span className="rounded-full bg-white/8 px-2 py-0.5 text-xs text-slate-400">
                  {locatarioEvents.length}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {locatarioEvents.length > 0 && (
                <div className="relative">
                  <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Buscar evento…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-48 rounded-xl border border-white/10 bg-[hsl(222,30%,13%)] py-1.5 pl-8 pr-3 text-sm text-white placeholder-slate-600 outline-none transition-colors focus:border-[hsl(262,80%,60%)] focus:ring-1 focus:ring-[hsl(262,80%,60%)]/30"
                  />
                </div>
              )}
              <button
                onClick={() => setShowCreateEvent(true)}
                className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3.5 py-1.5 text-sm font-medium text-slate-300 transition-all hover:border-white/20 hover:bg-white/10 hover:text-white"
              >
                <Plus size={13} />
                Nuevo
              </button>
            </div>
          </div>

          {/* Table body */}
          <div className="overflow-x-auto">
            {isLoading ? (
              <div className="space-y-4 p-5">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-4">
                    <div className="h-10 w-10 animate-pulse rounded-xl bg-white/10" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3 w-44 animate-pulse rounded bg-white/10" />
                      <div className="h-2.5 w-28 animate-pulse rounded bg-white/7" />
                    </div>
                    <div className="h-5 w-20 animate-pulse rounded-full bg-white/8" />
                  </div>
                ))}
              </div>
            ) : locatarioEvents.length === 0 ? (
              <div className="flex flex-col items-center gap-4 py-20 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[hsl(262,80%,60%)]/12">
                  <Calendar size={26} className="text-[hsl(262,80%,65%)]" />
                </div>
                <div>
                  <p className="font-semibold text-white">Aún no tienes eventos</p>
                  <p className="mt-1 text-sm text-slate-400">Crea tu primer evento y aparecerá en el feed principal</p>
                </div>
                <button
                  onClick={() => setShowCreateEvent(true)}
                  className="flex items-center gap-2 rounded-xl bg-[hsl(38,95%,55%)] px-5 py-2.5 text-sm font-semibold text-black shadow-lg shadow-amber-900/20 transition-all hover:-translate-y-0.5 hover:bg-[hsl(38,95%,60%)]"
                >
                  <Plus size={15} /> Crear primer evento
                </button>
              </div>
            ) : filteredEvents.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-12 text-center">
                <Search size={24} className="text-slate-600" />
                <p className="text-sm text-slate-400">Sin resultados para "{search}"</p>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/6 text-left">
                    <th className="px-5 py-3 text-xs font-medium text-slate-500">Evento</th>
                    <th className="px-5 py-3 text-xs font-medium text-slate-500">Categoría</th>
                    <th className="px-5 py-3 text-xs font-medium text-slate-500">Fecha</th>
                    <th className="px-5 py-3 text-xs font-medium text-slate-500">Asistentes</th>
                    <th className="px-5 py-3 text-xs font-medium text-slate-500">Estado</th>
                    <th className="px-5 py-3 text-xs font-medium text-slate-500">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredEvents.map((event) => (
                    <tr key={event.id} className="transition-colors hover:bg-white/3">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 shrink-0 overflow-hidden rounded-xl bg-white/6">
                            {event.imageUrl ? (
                              <img src={event.imageUrl} alt="" className="h-full w-full object-cover" />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center">
                                <Calendar size={16} className="text-slate-600" />
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="max-w-[180px] truncate text-sm font-medium text-white">{event.title}</p>
                            {event.address && (
                              <p className="max-w-[180px] truncate text-xs text-slate-500">{event.address}</p>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-3.5">
                        <CategoryBadge category={event.category} />
                      </td>

                      <td className="px-5 py-3.5 text-xs text-slate-400 whitespace-nowrap">
                        {new Date(event.date).toLocaleString('es-CL', { dateStyle: 'medium', timeStyle: 'short' })}
                      </td>

                      <td className="px-5 py-3.5">
                        <span className="text-sm font-semibold text-[hsl(262,80%,70%)]">{event.attendees}</span>
                      </td>

                      <td className="px-5 py-3.5">
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-400">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                          Activo
                        </span>
                      </td>

                      <td className="px-5 py-3.5">
                        {confirmDeleteId === event.id ? (
                          <ConfirmDelete
                            onConfirm={() => handleDelete(event.id)}
                            onCancel={() => setConfirmDeleteId(null)}
                          />
                        ) : (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setEditingEvent(event)}
                              className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-400 transition-colors hover:bg-white/8 hover:text-white"
                            >
                              <Pencil size={12} />
                              Editar
                            </button>
                            <button
                              onClick={() => setConfirmDeleteId(event.id)}
                              disabled={deletingId === event.id}
                              className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-red-500/10 hover:text-red-400 disabled:opacity-40"
                            >
                              {deletingId === event.id
                                ? <Loader2 size={14} className="animate-spin" />
                                : <Trash2 size={14} />}
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </main>

      {/* Create modal */}
      <CreateEventModal
        isOpen={showCreateEvent}
        onClose={() => setShowCreateEvent(false)}
        onSubmit={handleModalSubmit}
        defaultAddress={user.businessLocation ?? user.location ?? ''}
        organizerName={user.businessName || user.name || ''}
        organizerAvatar={user.avatarUrl || 'https://i.pravatar.cc/150?img=32'}
        avatarUrl={user.avatarUrl}
        initials={initials}
        userId={user.id}
      />

      {/* Edit modal */}
      <CreateEventModal
        isOpen={editingEvent !== null}
        onClose={() => setEditingEvent(null)}
        onSubmit={handleEditSubmit}
        mode="edit"
        initialValues={editingEvent ? {
          title: editingEvent.title,
          description: editingEvent.description,
          date: editingEvent.date,
          price: editingEvent.price,
          address: editingEvent.address,
          imageUrl: editingEvent.imageUrl,
          videoUrl: editingEvent.videoUrl ?? undefined,
          audioUrl: editingEvent.audioUrl ?? undefined,
          category: editingEvent.category,
        } : undefined}
        defaultAddress={user.businessLocation ?? user.location ?? ''}
        organizerName={user.businessName || user.name || ''}
        organizerAvatar={user.avatarUrl || 'https://i.pravatar.cc/150?img=32'}
        avatarUrl={user.avatarUrl}
        initials={initials}
        userId={user.id}
      />
    </div>
  )
}
