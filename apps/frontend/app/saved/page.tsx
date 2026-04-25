'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import Layout from '../../src/components/Layout'
import { MOCK_EVENTS, formatEventDate, formatPrice, CATEGORY_COLORS, CATEGORY_EMOJI } from '../../src/data/mockEvents'
import { HiMapPin, HiClock } from 'react-icons/hi2'
import { HiBookmark } from 'react-icons/hi'

export default function SavedRoutePage() {
  const [savedEvents, setSavedEvents] = useState(
    MOCK_EVENTS.filter((_, i) => i % 2 === 0).map((e) => ({ ...e, isSaved: true })),
  )

  function handleRemove(id: string) {
    setSavedEvents((prev) => prev.filter((e) => e.id !== id))
  }

  return (
    <Layout headerTitle="Guardados">
      <div className="px-4 pb-4 pt-4">
        {savedEvents.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
            <span className="text-5xl">🔖</span>
            <h2 className="text-lg font-bold text-white">Sin eventos guardados</h2>
            <p className="max-w-xs text-sm text-muted">
              Desliza el feed y toca el ícono de bookmark para guardar eventos que te interesen.
            </p>
          </div>
        ) : (
          <>
            <p className="mb-4 text-xs text-muted">{savedEvents.length} eventos guardados</p>
            <div className="flex flex-col gap-3">
              {savedEvents.map((event) => (
                <motion.div
                  key={event.id}
                  layout
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="flex gap-0 overflow-hidden rounded-2xl border border-white/5 bg-card"
                >
                  <img src={event.imageUrl} alt={event.title} className="h-full w-28 flex-shrink-0 object-cover" />

                  <div className="flex min-w-0 flex-1 flex-col justify-between p-3">
                    <div>
                      <span className={`${CATEGORY_COLORS[event.category]} rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase text-white`}>
                        {CATEGORY_EMOJI[event.category]} {event.category}
                      </span>
                      <h3 className="mt-1 line-clamp-2 text-sm font-bold leading-tight text-white">
                        {event.title}
                      </h3>
                    </div>

                    <div className="mt-2 flex flex-col gap-1">
                      <div className="flex items-center gap-1.5 text-xs text-muted">
                        <HiClock className="h-3.5 w-3.5 flex-shrink-0 text-primary-light" />
                        <span className="truncate">{formatEventDate(event.date)}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-muted">
                        <HiMapPin className="h-3.5 w-3.5 flex-shrink-0 text-primary-light" />
                        <span className="truncate">{event.location}</span>
                      </div>
                    </div>

                    <div className="mt-2 flex items-center justify-between">
                      <span className={`text-xs font-bold ${event.price === null ? 'text-green-400' : 'text-primary-light'}`}>
                        {formatPrice(event.price)}
                      </span>

                      <button
                        onClick={() => handleRemove(event.id)}
                        className="flex h-8 w-8 items-center justify-center rounded-full bg-surface text-primary transition-colors hover:bg-red-500/20 hover:text-red-400"
                        aria-label="Quitar guardado"
                      >
                        <HiBookmark className="h-4 w-4 fill-current" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </>
        )}
      </div>
    </Layout>
  )
}
