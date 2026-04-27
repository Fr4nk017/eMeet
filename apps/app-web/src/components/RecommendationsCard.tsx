'use client'

import { useEffect, useState } from 'react'
import { memo } from 'react'
import Image from 'next/image'
import { motion } from 'framer-motion'
import type { Event, EventCategory } from '../types'

interface RecommendationsCardProps {
  events: Event[]
  onClose: () => void
  userInterests?: EventCategory[]
}

function computeScore(event: Event, userInterests: EventCategory[]): number {
  const interestMatch = userInterests.includes(event.category) ? 60 : 0
  const distanceKm = event.distance ?? 99
  const distanceScore = Math.max(0, 40 - (distanceKm / 5) * 40)
  return interestMatch + distanceScore
}

const RecommendationsCard = memo(function RecommendationsCard({
  events,
  onClose,
  userInterests = [],
}: RecommendationsCardProps) {
  const [recommendations, setRecommendations] = useState<Array<Event & { score: number }>>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => {
      setRecommendations(
        events
          .slice(0, 10)
          .map((e) => ({ ...e, score: computeScore(e, userInterests) }))
          .sort((a, b) => b.score - a.score)
          .slice(0, 3),
      )
      setLoading(false)
    }, 600)

    return () => clearTimeout(timer)
  }, [events, userInterests])

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
        <h3 className="font-semibold text-primary-light">
          {userInterests.length > 0 ? '✨ Para ti' : '📍 Popular cerca'}
        </h3>
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
              <Image
                src={event.imageUrl}
                alt={event.title}
                fill
                className="object-cover group-hover:scale-105 transition-transform"
                sizes="(max-width: 768px) 100vw, 300px"
                unoptimized={event.imageUrl.startsWith('blob:')}
                onError={(e) => { (e.currentTarget.parentElement as HTMLElement).style.display = 'none' }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            </div>
          )}

          {/* Content */}
          <div className="p-3">
            <h4 className="font-semibold text-white line-clamp-1">{event.title}</h4>
            <p className="text-xs text-muted line-clamp-1">{event.address}</p>

            <div className="mt-2 flex items-center justify-between">
              <div className="text-xs text-violet-400">
                {userInterests.includes(event.category)
                  ? '✓ Coincide con tus intereses'
                  : `${event.distance.toFixed(1)} km de ti`}
              </div>
              {event.distance > 0 && userInterests.includes(event.category) && (
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
})

RecommendationsCard.displayName = 'RecommendationsCard'

export default RecommendationsCard
