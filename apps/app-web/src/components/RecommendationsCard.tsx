'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import type { Event } from '../types'

interface RecommendationsCardProps {
  events: Event[]
  onClose: () => void
}

export default function RecommendationsCard({
  events,
  onClose,
}: RecommendationsCardProps) {
  const [recommendations, setRecommendations] = useState<Array<Event & { similarity: number }>>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Simular carga de recomendaciones (en producción viene del backend)
    const timer = setTimeout(() => {
      setRecommendations(
        events
          .slice(0, 3)
          .map((e, i) => ({
            ...e,
            similarity: Math.random() * 100,
          }))
          .sort((a, b) => b.similarity - a.similarity)
      )
      setLoading(false)
    }, 600)

    return () => clearTimeout(timer)
  }, [events])

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="space-y-3"
      >
        {[1, 2, 3].map(i => (
          <div key={i} className="h-24 animate-pulse rounded-lg bg-card/50" />
        ))}
      </motion.div>
    )
  }

  if (recommendations.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="rounded-lg border border-violet-500/20 bg-card/30 p-4 text-center text-sm text-muted"
      >
        Sigue indicando qué te gusta para ver recomendaciones personalizadas.
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-3"
    >
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-primary-light">✨ Algo como esto</h3>
        <button
          onClick={onClose}
          className="text-xs text-muted hover:text-primary-light transition-colors"
        >
          Cerrar
        </button>
      </div>

      {recommendations.map((event, idx) => (
        <motion.div
          key={event.id}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: idx * 0.1 }}
          className="group relative overflow-hidden rounded-lg bg-card/40 border border-violet-500/10 hover:border-violet-500/30 transition-all cursor-pointer"
        >
          {/* Thumbnail */}
          {event.imageUrl && (
            <div className="relative h-32 overflow-hidden">
              <img
                src={event.imageUrl}
                alt={event.title}
                className="h-full w-full object-cover group-hover:scale-105 transition-transform"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            </div>
          )}

          {/* Content */}
          <div className="p-3">
            <h4 className="font-semibold text-white line-clamp-1">{event.title}</h4>
            <p className="text-xs text-muted line-clamp-1">{event.address}</p>

            {/* Similarity badge */}
            <div className="mt-2 flex items-center justify-between">
              <div className="text-xs text-violet-400">
                {Math.round(event.similarity)}% compatibilidad
              </div>
              {event.distance && (
                <span className="text-xs text-muted">
                  {event.distance.toFixed(1)} km
                </span>
              )}
            </div>
          </div>
        </motion.div>
      ))}
    </motion.div>
  )
}
