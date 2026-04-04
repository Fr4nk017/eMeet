'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import Layout from '../components/Layout'
import SwipeCard from '../components/SwipeCard'
import { MOCK_EVENTS, CATEGORY_EMOJI } from '../data/mockEvents'
import type { Event, EventCategory } from '../types'

const CATEGORIES: { key: EventCategory; label: string }[] = [
  { key: 'gastronomia', label: 'Gastronomía' },
  { key: 'musica', label: 'Música' },
  { key: 'cultura', label: 'Cultura' },
  { key: 'networking', label: 'Networking' },
  { key: 'deporte', label: 'Deporte' },
  { key: 'fiesta', label: 'Fiesta' },
  { key: 'teatro', label: 'Teatro' },
  { key: 'arte', label: 'Arte' },
]

/**
 * SearchPage — Explorar eventos con filtros por categoría.
 *
 * Funcionalidad:
 *  - Barra de búsqueda por texto (título / tags).
 *  - Filtros por categoría en chips horizontales.
 *  - Grid de tarjetas (vista compacta, 2 columnas en mobile).
 *
 * Al hacer clic en una tarjeta se muestra el stack de swipe
 * del evento seleccionado para mantener consistencia de UX.
 */
export default function SearchPage() {
  const [query, setQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState<EventCategory | null>(null)
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)

  const filtered = MOCK_EVENTS.filter((e) => {
    const matchesQuery =
      query.trim() === '' ||
      e.title.toLowerCase().includes(query.toLowerCase()) ||
      e.tags.some((t) => t.toLowerCase().includes(query.toLowerCase()))

    const matchesCategory = activeCategory === null || e.category === activeCategory

    return matchesQuery && matchesCategory
  })

  return (
    <Layout headerTitle="Explorar">
      <div className="px-4 pt-4 pb-4 lg:px-5 lg:pt-5">
        {/* Barra de búsqueda */}
        <div className="relative mb-4">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar eventos, categorías o tags..."
            className="w-full bg-card rounded-2xl px-4 py-3 pl-10 text-white text-sm placeholder-muted border border-white/10 focus:border-primary focus:outline-none transition-colors"
          />
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted text-base">🔍</span>
        </div>

        {/* Chips de categoría */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-5 scrollbar-none">
          <button
            onClick={() => setActiveCategory(null)}
            className={`flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
              activeCategory === null
                ? 'bg-primary border-primary text-white'
                : 'border-white/20 text-muted hover:border-white/40'
            }`}
          >
            Todos
          </button>
          {CATEGORIES.map((cat) => (
            <button
              key={cat.key}
              onClick={() =>
                setActiveCategory(activeCategory === cat.key ? null : cat.key)
              }
              className={`flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                activeCategory === cat.key
                  ? 'bg-primary border-primary text-white'
                  : 'border-white/20 text-muted hover:border-white/40'
              }`}
            >
              {CATEGORY_EMOJI[cat.key]} {cat.label}
            </button>
          ))}
        </div>

        {/* Resultados */}
        <p className="text-muted text-xs mb-3">{filtered.length} eventos encontrados</p>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
            <span className="text-4xl">🔎</span>
            <p className="text-muted text-sm">No hay eventos que coincidan con tu búsqueda.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 lg:gap-4">
            {filtered.map((event) => (
              <motion.button
                key={event.id}
                whileTap={{ scale: 0.97 }}
                onClick={() => setSelectedEvent(event)}
                className="bg-card rounded-2xl overflow-hidden text-left border border-white/5 hover:border-primary/40 transition-colors"
              >
                <img
                  src={event.imageUrl}
                  alt={event.title}
                  className="w-full h-28 object-cover"
                />
                <div className="p-3">
                  <span className="text-xs text-primary-light font-medium">
                    {CATEGORY_EMOJI[event.category]} {event.category}
                  </span>
                  <h3 className="text-white text-sm font-semibold leading-tight mt-0.5 line-clamp-2">
                    {event.title}
                  </h3>
                  <p className="text-muted text-xs mt-1">{event.distance} km</p>
                </div>
              </motion.button>
            ))}
          </div>
        )}
      </div>

      {/* Modal de detalle (carta de swipe superpuesta) */}
      {selectedEvent && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end bg-black/80 backdrop-blur-sm lg:items-center lg:justify-center lg:p-8"
          onClick={() => setSelectedEvent(null)}
        >
          <motion.div
            initial={{ y: '100%', opacity: 0.8 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="relative h-[80vh] w-full px-4 pb-4 lg:h-[85vh] lg:max-h-[900px] lg:max-w-[430px] lg:px-0 lg:pb-0"
            onClick={(e) => e.stopPropagation()}
          >
            <SwipeCard
              event={selectedEvent}
              stackIndex={0}
              onSwipeRight={() => setSelectedEvent(null)}
              onSwipeLeft={() => setSelectedEvent(null)}
              onSave={() => {}}
            />
          </motion.div>
        </motion.div>
      )}
    </Layout>
  )
}
