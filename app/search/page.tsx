'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import Layout from '../../src/components/Layout'
import SwipeCard from '../../src/components/SwipeCard'
import { MOCK_EVENTS, CATEGORY_EMOJI } from '../../src/data/mockEvents'
import type { Event, EventCategory } from '../../src/types'

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

export default function SearchRoutePage() {
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
      <div className="px-4 pb-4 pt-4 lg:px-5 lg:pt-5">
        <div className="relative mb-4">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar eventos, categorías o tags..."
            className="w-full rounded-2xl border border-white/10 bg-card px-4 py-3 pl-10 text-sm text-white placeholder-muted transition-colors focus:border-primary focus:outline-none"
          />
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-base text-muted">🔍</span>
        </div>

        <div className="mb-5 flex gap-2 overflow-x-auto pb-2 scrollbar-none">
          <button
            onClick={() => setActiveCategory(null)}
            className={`flex-shrink-0 rounded-full border px-4 py-1.5 text-xs font-semibold transition-colors ${
              activeCategory === null
                ? 'border-primary bg-primary text-white'
                : 'border-white/20 text-muted hover:border-white/40'
            }`}
          >
            Todos
          </button>
          {CATEGORIES.map((cat) => (
            <button
              key={cat.key}
              onClick={() => setActiveCategory(activeCategory === cat.key ? null : cat.key)}
              className={`flex-shrink-0 rounded-full border px-4 py-1.5 text-xs font-semibold transition-colors ${
                activeCategory === cat.key
                  ? 'border-primary bg-primary text-white'
                  : 'border-white/20 text-muted hover:border-white/40'
              }`}
            >
              {CATEGORY_EMOJI[cat.key]} {cat.label}
            </button>
          ))}
        </div>

        <p className="mb-3 text-xs text-muted">{filtered.length} eventos encontrados</p>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
            <span className="text-4xl">🔎</span>
            <p className="text-sm text-muted">No hay eventos que coincidan con tu búsqueda.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 lg:gap-4">
            {filtered.map((event) => (
              <motion.button
                key={event.id}
                whileTap={{ scale: 0.97 }}
                onClick={() => setSelectedEvent(event)}
                className="overflow-hidden rounded-2xl border border-white/5 bg-card text-left transition-colors hover:border-primary/40"
              >
                <img src={event.imageUrl} alt={event.title} className="h-28 w-full object-cover" />
                <div className="p-3">
                  <span className="text-xs font-medium text-primary-light">
                    {CATEGORY_EMOJI[event.category]} {event.category}
                  </span>
                  <h3 className="mt-0.5 line-clamp-2 text-sm font-semibold leading-tight text-white">
                    {event.title}
                  </h3>
                  <p className="mt-1 text-xs text-muted">{event.distance} km</p>
                </div>
              </motion.button>
            ))}
          </div>
        )}
      </div>

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
