import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import SwipeCard from '../components/SwipeCard'
import Layout from '../components/Layout'
import type { Event } from '../types'
import { MOCK_EVENTS } from '../data/mockEvents'

/**
 * FeedPage — Pantalla principal de eMeet.
 *
 * Mecánica tipo Tinder:
 *  • Se muestra un stack de hasta 3 tarjetas visibles.
 *  • La carta del tope (stackIndex 0) es la activa e interactuable.
 *  • Al hacer swipe right → evento queda en "likes" (verde).
 *  • Al hacer swipe left → evento descartado (rojo).
 *  • Al agotar el stack → pantalla de "no hay más eventos".
 *
 * Estado local:
 *  - events: array completo de eventos pendientes de evaluar.
 *  - likedIds: set de IDs con like.
 *  - toast: mensaje temporal de feedback tras swipe.
 */
export default function FeedPage() {
  const [events, setEvents] = useState<Event[]>(MOCK_EVENTS)
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set())
  const [toast, setToast] = useState<{ message: string; type: 'like' | 'nope' | 'save' } | null>(null)

  // Muestra un toast breve de feedback
  function showToast(message: string, type: 'like' | 'nope' | 'save') {
    setToast({ message, type })
    setTimeout(() => setToast(null), 1800)
  }

  const handleSwipeRight = useCallback((id: string) => {
    setLikedIds((prev) => new Set(prev).add(id))
    setEvents((prev) => prev.filter((e) => e.id !== id))
    showToast('¡Te interesa! 💚', 'like')
  }, [])

  const handleSwipeLeft = useCallback((id: string) => {
    setEvents((prev) => prev.filter((e) => e.id !== id))
    showToast('No es para ti', 'nope')
  }, [])

  const handleSave = useCallback((id: string) => {
    setEvents((prev) =>
      prev.map((e) => (e.id === id ? { ...e, isSaved: !e.isSaved } : e)),
    )
    showToast('Evento guardado 🔖', 'save')
  }, [])

  // Los primeros 3 del array (index 0 = tope del stack)
  const visibleEvents = events.slice(0, 3)

  return (
    <Layout>
      <div className="relative flex h-full min-h-0 flex-col overflow-hidden">

        {/* ── Toast de feedback ─────────────────────────────────────────── */}
        <AnimatePresence>
          {toast && (
            <motion.div
              key="toast"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={`absolute top-3 left-1/2 -translate-x-1/2 z-50 px-5 py-2 rounded-full text-sm font-semibold shadow-lg ${
                toast.type === 'like'
                  ? 'bg-green-500 text-white'
                  : toast.type === 'nope'
                  ? 'bg-red-500 text-white'
                  : 'bg-primary text-white'
              }`}
            >
              {toast.message}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Stack de tarjetas ─────────────────────────────────────────── */}
        <div className="relative flex min-h-0 flex-1 px-4 pb-4 pt-3 lg:px-5 lg:pb-5 lg:pt-4">
          {visibleEvents.length > 0 ? (
            <div className="card-stack mx-auto h-full w-full max-w-[420px]">
              {/* Renderizamos de atrás hacia adelante para que el z-index sea correcto */}
              {[...visibleEvents].reverse().map((event, reverseIndex) => {
                const stackIndex = visibleEvents.length - 1 - reverseIndex
                return (
                  <SwipeCard
                    key={event.id}
                    event={event}
                    stackIndex={stackIndex}
                    onSwipeRight={handleSwipeRight}
                    onSwipeLeft={handleSwipeLeft}
                    onSave={handleSave}
                  />
                )
              })}
            </div>
          ) : (
            /* ── Estado vacío ─────────────────────────────────────────── */
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center justify-center h-full gap-5 text-center px-6"
            >
              <span className="text-6xl">🎉</span>
              <h2 className="text-white text-2xl font-bold">¡Has visto todo!</h2>
              <p className="text-muted text-sm">
                No hay más eventos por ahora. Vuelve más tarde o amplía tus intereses.
              </p>
              <button
                onClick={() => setEvents(MOCK_EVENTS)}
                className="mt-2 bg-primary text-white font-semibold px-6 py-3 rounded-full hover:bg-primary-dark transition-colors active:scale-95"
              >
                Ver de nuevo
              </button>
            </motion.div>
          )}
        </div>

        {/* ── Contador inferior ─────────────────────────────────────────── */}
        {visibleEvents.length > 0 && (
          <div className="flex items-center justify-center gap-3 px-4 pb-2 lg:px-5 lg:pb-3">
            <span className="text-muted text-xs">
              {events.length} eventos cerca de ti
            </span>
            {likedIds.size > 0 && (
              <span className="text-xs text-green-400 font-medium">
                · {likedIds.size} te interesaron
              </span>
            )}
          </div>
        )}
      </div>
    </Layout>
  )
}
