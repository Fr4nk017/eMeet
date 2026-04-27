'use client'

import { useAuth } from '@/src/context/AuthContext'
import { useLocatarioEvents } from '@/src/context/LocatarioEventsContext'
import type { CreateLocatarioEventInput } from '@/src/context/LocatarioEventsContext'
import { CreateEventModal } from '@/src/components/CreateEventModal'
import { useRouter } from 'next/navigation'
import {
  LogOut as FiLogOut,
  Plus as FiPlus,
  Calendar as FiCalendar,
  Loader2 as FiLoader,
  Trash2 as FiTrash2,
  House as FiHome,
  Pencil as FiEdit2,
} from 'lucide-react'
import type { Event } from '@/src/types'
import { useEffect, useRef, useState } from 'react'

export default function LocatarioPage() {
  const { user, logout, isAuthReady } = useAuth()
  const { createLocatarioEvent, locatarioEvents, removeLocatarioEvent, updateLocatarioEvent, isLoading } = useLocatarioEvents()
  const router = useRouter()

  const [showCreateEvent, setShowCreateEvent] = useState(false)
  const [editingEvent, setEditingEvent] = useState<Event | null>(null)
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!isAuthReady) return
    if (!user) { router.replace('/auth'); return }
    if (user.role !== 'locatario') router.replace('/')
  }, [isAuthReady, user, router])

  useEffect(() => {
    if (!feedback) return
    if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current)
    feedbackTimerRef.current = setTimeout(() => setFeedback(null), 4000)
    return () => { if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current) }
  }, [feedback])

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
    try {
      await removeLocatarioEvent(eventId)
    } catch {
      setFeedback({ message: 'No se pudo eliminar el evento.', type: 'error' })
    } finally {
      setDeletingId(null)
    }
  }

  if (!isAuthReady || !user || user.role !== 'locatario') return null

  const totalAttendees = locatarioEvents.reduce((sum, e) => sum + e.attendees, 0)
  const initials = ((user.businessName || user.name || '?')[0]).toUpperCase()

  return (
    <div className="min-h-screen bg-surface">
      {/* ── Header ── */}
      <header className="bg-card border-b border-card sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {user.avatarUrl ? (
              <img src={user.avatarUrl} alt="" className="w-9 h-9 rounded-full object-cover ring-2 ring-violet-500/30" />
            ) : (
              <div className="w-9 h-9 rounded-full bg-violet-600/30 flex items-center justify-center text-violet-300 font-bold text-sm">
                {initials}
              </div>
            )}
            <div>
              <h1 className="text-base font-bold text-white leading-tight">Panel de Locatario</h1>
              <p className="text-xs text-muted">{user.businessName || user.name}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push('/')}
              className="flex items-center gap-2 text-white/60 hover:text-white px-3 py-2 rounded-lg transition-colors text-sm"
            >
              <FiHome size={16} />
              <span className="hidden sm:inline">Ver feed</span>
            </button>
            <button
              onClick={() => setShowCreateEvent(true)}
              className="flex items-center gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold px-4 py-2 rounded-xl text-sm shadow-lg shadow-violet-900/40 transition-all"
            >
              <FiPlus size={16} />
              <span>Crear Evento</span>
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 text-red-400/70 hover:text-red-400 px-3 py-2 rounded-lg transition-colors text-sm"
            >
              <FiLogOut size={16} />
              <span className="hidden sm:inline">Salir</span>
            </button>
          </div>
        </div>
      </header>

      {/* ── Main ── */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-white mb-1">Bienvenido, {user.name}</h2>
          <p className="text-muted">Gestiona tus eventos en {user.businessName || 'tu local'}</p>
        </div>

        {feedback && (
          <div className={`mb-6 rounded-xl border px-4 py-3 text-sm flex items-center justify-between gap-4 ${
            feedback.type === 'success'
              ? 'border-green-500/20 bg-green-500/10 text-green-300'
              : 'border-red-500/20 bg-red-500/10 text-red-300'
          }`}>
            <span>{feedback.message}</span>
            {feedback.type === 'success' && (
              <button
                onClick={() => router.push('/')}
                className="flex items-center gap-1 font-semibold underline underline-offset-2 whitespace-nowrap hover:opacity-80"
              >
                <FiHome size={14} /> Ir al feed
              </button>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="bg-card border border-card rounded-xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-violet-500/15 flex items-center justify-center">
                <FiCalendar className="text-violet-400" size={15} />
              </div>
              <p className="text-muted text-sm">Eventos Activos</p>
            </div>
            <div className="text-3xl font-bold text-white">
              {isLoading ? <FiLoader className="animate-spin" size={26} /> : locatarioEvents.length}
            </div>
            <p className="text-xs text-muted mt-1">Publicados desde tu panel</p>
          </div>
          <div className="bg-card border border-card rounded-xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center">
                <svg className="text-primary" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              </div>
              <p className="text-muted text-sm">Asistentes Totales</p>
            </div>
            <div className="text-3xl font-bold text-white">{totalAttendees}</div>
            <p className="text-xs text-muted mt-1">Acumulado de tus eventos</p>
          </div>
        </div>

        <div className="bg-card border border-card rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-card flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FiCalendar className="text-violet-400" size={17} />
              <h3 className="text-base font-semibold text-white">Tus Eventos</h3>
            </div>
            <button
              onClick={() => setShowCreateEvent(true)}
              className="text-xs flex items-center gap-1 text-violet-400 hover:text-violet-300 transition-colors font-medium"
            >
              <FiPlus size={13} /> Nuevo evento
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-card">
                  {['Evento', 'Fecha', 'Asistentes', 'Estado', 'Acciones'].map((col) => (
                    <th key={col} className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-card/40">
                {isLoading && (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-sm text-muted">
                      <FiLoader className="animate-spin inline mr-2" size={15} />Cargando eventos...
                    </td>
                  </tr>
                )}
                {!isLoading && locatarioEvents.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-16 text-center">
                      <div className="flex flex-col items-center gap-4">
                        <div className="w-16 h-16 rounded-2xl bg-violet-500/10 flex items-center justify-center">
                          <FiCalendar className="text-violet-400" size={26} />
                        </div>
                        <div>
                          <p className="text-white font-medium mb-1">Aún no tienes eventos</p>
                          <p className="text-sm text-muted">Crea tu primer evento y aparecerá en el feed principal</p>
                        </div>
                        <button
                          onClick={() => setShowCreateEvent(true)}
                          className="flex items-center gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold px-5 py-2.5 rounded-xl transition-all text-sm shadow-lg shadow-violet-900/30"
                        >
                          <FiPlus size={15} /> Crear primer evento
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
                {!isLoading && locatarioEvents.map((event) => (
                  <tr key={event.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-white/5">
                          {event.imageUrl && (
                            <img src={event.imageUrl} alt="" className="w-full h-full object-cover" />
                          )}
                        </div>
                        <span className="text-sm text-white font-medium">{event.title}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-muted whitespace-nowrap">
                      {new Date(event.date).toLocaleString('es-CL', { dateStyle: 'medium', timeStyle: 'short' })}
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-violet-400">{event.attendees}</td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-500/10 text-green-400 ring-1 ring-green-500/20">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-400" />Activo
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => setEditingEvent(event)}
                          className="flex items-center gap-1.5 text-xs text-violet-400/60 hover:text-violet-400 transition-colors"
                        >
                          <FiEdit2 size={12} />
                          Editar
                        </button>
                        <button
                          onClick={() => handleDelete(event.id)}
                          disabled={deletingId === event.id}
                          className="flex items-center gap-1.5 text-xs text-red-400/60 hover:text-red-400 transition-colors disabled:opacity-40"
                        >
                          {deletingId === event.id
                            ? <FiLoader className="animate-spin" size={12} />
                            : <FiTrash2 size={12} />}
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      <CreateEventModal
        isOpen={showCreateEvent}
        onClose={() => setShowCreateEvent(false)}
        onSubmit={handleModalSubmit}
        defaultAddress={user.businessLocation ?? user.location ?? ''}
        organizerName={user.businessName || user.name || ''}
        organizerAvatar={user.avatarUrl || 'https://i.pravatar.cc/150?img=32'}
        avatarUrl={user.avatarUrl}
        initials={initials}
      />

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
          category: editingEvent.category,
        } : undefined}
        defaultAddress={user.businessLocation ?? user.location ?? ''}
        organizerName={user.businessName || user.name || ''}
        organizerAvatar={user.avatarUrl || 'https://i.pravatar.cc/150?img=32'}
        avatarUrl={user.avatarUrl}
        initials={initials}
      />
    </div>
  )
}
