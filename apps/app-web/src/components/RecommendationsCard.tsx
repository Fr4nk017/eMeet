'use client'

import { useMemo, useState } from 'react'
import { memo } from 'react'
import Image from 'next/image'
import { motion } from 'framer-motion'
import type { Event, EventCategory } from '../types'

interface RecommendationsCardProps {
  events: Event[]
  onClose: () => void
  userInterests?: EventCategory[]
}

const THUMB_BLUR_DATA_URL =
  'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIwIiBoZWlnaHQ9IjgwIiB2aWV3Qm94PSIwIDAgMTIwIDgwIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxsaW5lYXJHcmFkaWVudCBpZD0iZyIgeDE9IjAiIHkxPSIwIiB4Mj0iMSIgeTI9IjEiPjxzdG9wIHN0b3AtY29sb3I9IiMxYjE2MmQiIG9mZnNldD0iMCIvPjxzdG9wIHN0b3AtY29sb3I9IiMwYjBhMTMiIG9mZnNldD0iMSIvPjwvbGluZWFyR3JhZGllbnQ+PHJlY3Qgd2lkdGg9IjEyMCIgaGVpZ2h0PSI4MCIgZmlsbD0idXJsKCNnKSIvPjwvc3ZnPg=='

const FALLBACK_THUMB = 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=600&q=70'

function shouldBypassImageOptimization(url: string) {
  if (url.startsWith('blob:') || url.startsWith('data:image/svg')) return true

  try {
    const parsedUrl = new URL(url)
    const pathname = parsedUrl.pathname.toLowerCase()
    return pathname.endsWith('.svg') || pathname.endsWith('/svg')
  } catch {
    const normalized = url.toLowerCase()
    return normalized.includes('.svg') || normalized.includes('/svg')
  }
}

function optimizeThumbUrl(url: string) {
  try {
    const parsedUrl = new URL(url)

    if (parsedUrl.hostname === 'images.unsplash.com') {
      parsedUrl.searchParams.set('auto', 'format')
      parsedUrl.searchParams.set('fit', 'crop')
      parsedUrl.searchParams.set('w', '600')
      parsedUrl.searchParams.set('q', '65')
      return parsedUrl.toString()
    }

    return url
  } catch {
    return url
  }
}

function computeScore(event: Event, userInterests: EventCategory[]): number {
  const interestMatch = userInterests.includes(event.category) ? 60 : 0
  const distanceKm = event.distance ?? 99
  const distanceScore = Math.max(0, 40 - (distanceKm / 5) * 40)
  return interestMatch + distanceScore
}

function RecommendationItem({
  event,
  idx,
  userInterests,
}: {
  event: Event & { score: number }
  idx: number
  userInterests: EventCategory[]
}) {
  const [imgSrc, setImgSrc] = useState(optimizeThumbUrl(event.imageUrl || FALLBACK_THUMB))
  const [isImageLoading, setIsImageLoading] = useState(true)
  const [isVideoReady, setIsVideoReady] = useState(false)
  const hasVideo = Boolean(event.videoUrl)

  return (
    <motion.div
      key={event.id}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: idx * 0.08 }}
      className="group relative cursor-pointer overflow-hidden rounded-lg border border-violet-500/10 bg-card/40 transition-all hover:border-violet-500/30"
    >
      <div className="relative h-32 overflow-hidden">
        {(!hasVideo && isImageLoading) || (hasVideo && !isVideoReady) ? (
          <div className="absolute inset-0 z-[1] animate-pulse bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900" />
        ) : null}

        {hasVideo ? (
          <video
            src={event.videoUrl!}
            className={`h-full w-full object-cover transition-all duration-300 group-hover:scale-105 ${isVideoReady ? 'opacity-100' : 'opacity-0'}`}
            autoPlay
            muted
            loop
            playsInline
            onCanPlay={() => setIsVideoReady(true)}
          />
        ) : (
          <Image
            src={imgSrc}
            alt={event.title}
            fill
            className={`object-cover transition-all duration-300 group-hover:scale-105 ${isImageLoading ? 'opacity-0' : 'opacity-100'}`}
            loading="lazy"
            sizes="(max-width: 1280px) 280px, 300px"
            quality={65}
            placeholder="blur"
            blurDataURL={THUMB_BLUR_DATA_URL}
            unoptimized={shouldBypassImageOptimization(imgSrc)}
            onLoadingComplete={() => setIsImageLoading(false)}
            onError={() => {
              if (imgSrc !== FALLBACK_THUMB) {
                setImgSrc(optimizeThumbUrl(FALLBACK_THUMB))
                return
              }
              setIsImageLoading(false)
            }}
          />
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        {hasVideo && (
          <div className="absolute bottom-2 right-2 flex items-center gap-1 rounded-full bg-black/50 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur-sm">
            ▶ Video
          </div>
        )}
      </div>

      <div className="p-3">
        <h4 className="line-clamp-1 font-semibold text-white">{event.title}</h4>
        <p className="line-clamp-1 text-xs text-muted">{event.address}</p>

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
  )
}

const RecommendationsCard = memo(function RecommendationsCard({
  events,
  onClose,
  userInterests = [],
}: RecommendationsCardProps) {
  const recommendations = useMemo(
    () =>
      events
        .slice(0, 10)
        .map((e) => ({ ...e, score: computeScore(e, userInterests) }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 3),
    [events, userInterests],
  )

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
        <RecommendationItem
          key={event.id}
          event={event}
          idx={idx}
          userInterests={userInterests}
        />
      ))}
    </motion.div>
  )
})

RecommendationsCard.displayName = 'RecommendationsCard'

export default RecommendationsCard
