'use client'

import { useEffect, useRef, useState } from 'react'
import { memo } from 'react'
import Image from 'next/image'
import { motion, useMotionValue, useTransform, animate } from 'framer-motion'
import type { PanInfo } from 'framer-motion'
import {
  MapPin as HiMapPin,
  Clock3 as HiClock,
  Users as HiUsers,
  Globe as HiGlobeAlt,
  Heart as HiHeart,
  X as HiX,
  Bookmark as HiBookmark,
} from 'lucide-react'
import type { Event } from '../types'
import { formatEventDate, formatPrice, CATEGORY_COLORS, CATEGORY_EMOJI } from '../data/mockEvents'

interface SwipeCardProps {
  event: Event
  onSwipeRight: (id: string) => void   // like
  onSwipeLeft: (id: string) => void    // descarte
  onSave: (id: string) => void
  onRefresh?: () => void
  /** Índice en el stack (0 = carta superior/activa) */
  stackIndex: number
}

// ─── Umbral de px para considerar un swipe válido ────────────────────────────
const SWIPE_THRESHOLD = 120
const REFRESH_THRESHOLD = 100

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

function optimizeCardImageUrl(url: string) {
  try {
    const parsedUrl = new URL(url)

    // Unsplash acepta params de transformación; pedir menor ancho reduce bytes y tiempo de decode.
    if (parsedUrl.hostname === 'images.unsplash.com') {
      parsedUrl.searchParams.set('auto', 'format')
      parsedUrl.searchParams.set('fit', 'crop')
      parsedUrl.searchParams.set('w', '900')
      parsedUrl.searchParams.set('q', '70')
      return parsedUrl.toString()
    }

    return url
  } catch {
    return url
  }
}

function StarRating({ rating }: { rating: number }) {
  const filled = Math.round(rating)
  return (
    <div className="inline-flex items-center gap-1 rounded-full border border-amber-300/35 bg-black/35 px-2.5 py-1 backdrop-blur-sm">
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} className={`text-sm leading-none ${i < filled ? 'text-amber-300' : 'text-white/25'}`}>★</span>
      ))}
      <span className="ml-1 text-[11px] font-bold text-amber-100">{rating.toFixed(1)}</span>
    </div>
  )
}

/**
 * SwipeCard — Tarjeta de evento con interacción de swipe.
 *
 * Tecnología: Framer Motion para el gesto de arrastre + animación de salida.
 *
 * Mecánica:
 *  • Arrastrar la tarjeta activa (stackIndex === 0).
 *  • Si el usuario suelta con x > SWIPE_THRESHOLD → swipe right (like).
 *  • Si el usuario suelta con x < -SWIPE_THRESHOLD → swipe left (descarte).
 *  • Las tarjetas de abajo se escalan y apilan visualmente (z-index + scale).
 *
 * Props:
 *  - onSwipeRight / onSwipeLeft: callbacks al padre para actualizar el estado.
 *  - stackIndex: determina escala y opacidad de fondo.
 */
const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=800&q=75'
const CARD_BLUR_DATA_URL =
  'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjE0MCIgdmlld0JveD0iMCAwIDEwMCAxNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGxpbmVhckdyYWRpZW50IGlkPSJnIiB4MT0iMCIgeTE9IjAiIHgyPSIxIiB5Mj0iMSI+PHN0b3Agc3RvcC1jb2xvcj0iIzIxMTIzNCIgb2Zmc2V0PSIwIi8+PHN0b3Agc3RvcC1jb2xvcj0iIzBkMGYxOCIgb2Zmc2V0PSIxIi8+PC9saW5lYXJHcmFkaWVudD48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjE0MCIgZmlsbD0idXJsKCNnKSIvPjwvc3ZnPg=='

const SwipeCard = memo(function SwipeCard({
  event,
  onSwipeRight,
  onSwipeLeft,
  onSave,
  onRefresh,
  stackIndex,
}: SwipeCardProps) {
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const [isDragging, setIsDragging] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [imgSrc, setImgSrc] = useState(optimizeCardImageUrl(event.imageUrl || FALLBACK_IMAGE))
  const [isImageLoading, setIsImageLoading] = useState(true)
  const isBlob = imgSrc.startsWith('blob:')

  // Rotación proporcional al arrastre horizontal
  const rotate = useTransform(x, [-200, 0, 200], [-15, 0, 15])

  // Opacidad de los indicadores LIKE / NOPE
  const likeOpacity = useTransform(x, [0, SWIPE_THRESHOLD], [0, 1])
  const nopeOpacity = useTransform(x, [-SWIPE_THRESHOLD, 0], [1, 0])

  const refreshIndicatorOpacity = useTransform(y, [-50, -REFRESH_THRESHOLD], [0, 1])
  const refreshIndicatorRotate = useTransform(y, [-REFRESH_THRESHOLD, 0], [180, 0])

  // Escala de las tarjetas de fondo
  const scale = 1 - stackIndex * 0.04
  const yOffset = stackIndex * 10

  const cardRef = useRef<HTMLDivElement>(null)

  const isActive = stackIndex === 0

  useEffect(() => {
    setImgSrc(optimizeCardImageUrl(event.imageUrl || FALLBACK_IMAGE))
  }, [event.imageUrl])

  useEffect(() => {
    setIsImageLoading(true)
  }, [imgSrc])

  function handleDragEnd(_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) {
    setIsDragging(false)
    if (!isActive) {
      animate(y, 0, { type: 'spring', stiffness: 400, damping: 25 })
      return
    }

    // Detección de pull-to-refresh: arrastré hacia arriba (y < -REFRESH_THRESHOLD) sin mover mucho en x
    if (info.offset.y < -REFRESH_THRESHOLD && Math.abs(info.offset.x) < 50 && onRefresh && !isRefreshing) {
      setIsRefreshing(true)
      onRefresh()
      animate(x, 0, { type: 'spring', stiffness: 400, damping: 25 })
      animate(y, 0, {
        type: 'spring',
        stiffness: 400,
        damping: 25,
        onComplete: () => setIsRefreshing(false),
      })
      return
    }

    if (info.offset.x > SWIPE_THRESHOLD) {
      // Animar salida por la derecha
      animate(x, 600, {
        duration: 0.3,
        onComplete: () => onSwipeRight(event.id),
      })
    } else if (info.offset.x < -SWIPE_THRESHOLD) {
      // Animar salida por la izquierda
      animate(x, -600, {
        duration: 0.3,
        onComplete: () => onSwipeLeft(event.id),
      })
    } else {
      // Volver al centro
      animate(y, 0, { type: 'spring', stiffness: 400, damping: 25 })
      animate(x, 0, { type: 'spring', stiffness: 400, damping: 25 })
    }
  }

  return (
    <motion.div
      ref={cardRef}
      className="swipe-card"
      style={{
        x: isActive ? x : 0,
        rotate: isActive ? rotate : 0,
        scale,
        y: yOffset,
        zIndex: 10 - stackIndex,
        // Las cartas de fondo no reciben eventos de puntero
        pointerEvents: isActive ? 'auto' : 'none',
      }}
      drag={isActive}
      dragElastic={0.2}
      onDragStart={() => setIsDragging(true)}
      onDragEnd={handleDragEnd}
      whileTap={{ scale: isActive ? 1.02 : scale }}
      transition={{ duration: 0 }}
    >
      {/* Tarjeta contenido */}
      <div className="relative h-full w-full overflow-hidden rounded-[30px] bg-card shadow-2xl select-none lg:rounded-[36px]">

        {/* Pull-to-refresh indicator (solo en carta activa) */}
        {isActive && (
          <motion.div
            style={{ opacity: refreshIndicatorOpacity }}
            className="absolute top-2 left-1/2 z-50 -translate-x-1/2"
          >
            <motion.div
              style={{ rotate: refreshIndicatorRotate }}
              className="text-2xl"
            >
              ⬇️
            </motion.div>
          </motion.div>
        )}

        {/* Imagen de fondo */}
        {isImageLoading && (
          <div className="absolute inset-0 z-[1] animate-pulse bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900" />
        )}

        <Image
          src={imgSrc}
          alt={event.title}
          fill
          className={`object-cover transition-opacity duration-300 ${isImageLoading ? 'opacity-0' : 'opacity-100'}`}
          draggable={false}
          priority={isActive}
          loading={isActive ? 'eager' : 'lazy'}
          sizes="(max-width: 640px) 92vw, (max-width: 1024px) 78vw, 380px"
          quality={70}
          placeholder="blur"
          blurDataURL={CARD_BLUR_DATA_URL}
          unoptimized={isBlob || shouldBypassImageOptimization(imgSrc)}
          onLoadingComplete={() => setIsImageLoading(false)}
          onError={() => {
            if (imgSrc !== FALLBACK_IMAGE) {
              setImgSrc(optimizeCardImageUrl(FALLBACK_IMAGE))
              return
            }
            setIsImageLoading(false)
          }}
        />

        {/* Doble gradiente para elevar contraste en textos y badges */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-black/20" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-transparent" />

        {/* Badges top-left: categoría + estado abierto/cerrado */}
        <div className="absolute left-4 top-4 z-10 flex flex-col gap-1.5 lg:left-5 lg:top-5">
          <span
            className={`${CATEGORY_COLORS[event.category] ?? 'bg-purple-600'} rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white lg:px-4 lg:py-1.5`}
          >
            {CATEGORY_EMOJI[event.category]} {event.category}
          </span>
          {event.isOpen !== null && event.isOpen !== undefined && (
            <span
              className={`inline-flex w-fit items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold shadow-lg backdrop-blur-md ${
                event.isOpen
                  ? 'border-green-300/50 bg-green-500/30 text-green-100 shadow-green-900/40'
                  : 'border-red-300/50 bg-red-500/30 text-red-100 shadow-red-900/40'
              }`}
            >
              <span className={`h-2 w-2 rounded-full ${event.isOpen ? 'bg-green-200' : 'bg-red-200'}`} />
              {event.isOpen ? 'Abierto' : 'Cerrado'}
            </span>
          )}
        </div>

        {/* Botón guardar (bookmark) */}
        {isActive && (
          <button
            onClick={() => onSave(event.id)}
            className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm transition-colors hover:bg-black/60 lg:right-5 lg:top-5 lg:h-11 lg:w-11"
            aria-label="Guardar evento"
          >
            <HiBookmark className={`w-5 h-5 ${event.isSaved ? 'text-primary fill-current' : ''}`} />
          </button>
        )}

        {/* ── Indicadores de swipe ────────────────────────────────────────── */}
        {isActive && (
          <>
            {/* LIKE indicator */}
            <motion.div
              style={{ opacity: likeOpacity }}
              className="absolute left-5 top-1/4 rounded-xl border-4 border-green-400 px-4 py-2 -rotate-12 lg:left-6"
            >
              <span className="text-2xl font-extrabold tracking-widest text-green-400 lg:text-3xl">LIKE</span>
            </motion.div>

            {/* NOPE indicator */}
            <motion.div
              style={{ opacity: nopeOpacity }}
              className="absolute right-5 top-1/4 rounded-xl border-4 border-red-400 px-4 py-2 rotate-12 lg:right-6"
            >
              <span className="text-2xl font-extrabold tracking-widest text-red-400 lg:text-3xl">NOPE</span>
            </motion.div>
          </>
        )}

        {/* ── Info del evento (parte inferior) ────────────────────────────── */}
        <div className={`absolute bottom-0 left-0 right-0 p-4 pb-20 transition-all duration-200 lg:p-5 lg:pb-24 ${isDragging ? 'opacity-80' : 'opacity-100'}`}>

          {event.rating && event.rating > 0 && (
            <div className="mb-1.5">
              <StarRating rating={event.rating} />
            </div>
          )}

          <h2 className="mb-1 line-clamp-2 text-lg font-bold leading-tight text-white lg:text-[1.55rem]">
            {event.title}
          </h2>

          <p className="mb-2 line-clamp-2 text-[13px] text-white/70 lg:text-sm lg:leading-5">
            {event.description}
          </p>

          {/* Meta información */}
          <div className="mb-3 flex flex-col gap-1">
            <div className="flex items-center gap-2 text-[13px] text-white/80 lg:text-sm">
              <HiClock className="w-4 h-4 flex-shrink-0 text-primary-light" />
              <span>{formatEventDate(event.date)}</span>
            </div>
            <div className="flex items-center gap-2 text-[13px] text-white/80 lg:text-sm">
              <HiMapPin className="w-4 h-4 flex-shrink-0 text-primary-light" />
              <span className="truncate">{event.location}</span>
              <span className="text-white/50 text-xs flex-shrink-0">· {event.distance} km</span>
            </div>
            {event.capacity && (
              <div className="flex items-center gap-2 text-[13px] text-white/80 lg:text-sm">
                <HiUsers className="w-4 h-4 flex-shrink-0 text-primary-light" />
                <span>{event.attendees}/{event.capacity} asistentes</span>
              </div>
            )}
          </div>

          {/* Precio + Organizador */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {event.organizerAvatar ? (
                <Image
                  src={event.organizerAvatar}
                  alt={event.organizerName}
                  width={24}
                  height={24}
                  className="rounded-full border border-white/20"
                  unoptimized={shouldBypassImageOptimization(event.organizerAvatar)}
                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
                />
              ) : (
                <div className="w-6 h-6 rounded-full border border-white/20 bg-primary/40 flex items-center justify-center text-[9px] text-white font-bold">
                  {event.organizerName.charAt(0).toUpperCase()}
                </div>
              )}
              <span className="max-w-[150px] truncate text-[11px] text-white/60 lg:max-w-[190px]">
                {event.organizerName}
              </span>
            </div>
            <span
              className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                event.price === null
                  ? 'bg-green-500/20 text-green-400'
                  : 'bg-primary/20 text-primary-light'
              }`}
            >
              {formatPrice(event.price)}
            </span>
          </div>

          {event.websiteUrl && (
            <div className="mt-2.5">
              <a
                href={event.websiteUrl}
                target="_blank"
                rel="noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-1.5 rounded-full border border-cyan-400/30 bg-cyan-500/10 px-3 py-1 text-[11px] font-semibold text-cyan-200 backdrop-blur-sm transition-colors hover:bg-cyan-500/20"
              >
                <HiGlobeAlt className="h-4 w-4" />
                Ver sitio web
              </a>
            </div>
          )}

        </div>

        {/* Botones de acción (solo en carta activa) */}
        {isActive && (
          <div className="absolute inset-x-0 bottom-4 z-20 flex items-center justify-center gap-4 px-4 lg:bottom-5">
            <button
              onClick={() => onSwipeLeft(event.id)}
              className="flex h-14 w-14 items-center justify-center rounded-full border border-red-300/55 bg-red-500/30 text-red-100 shadow-lg shadow-red-900/35 backdrop-blur-md transition-all duration-200 hover:border-red-300/80 hover:bg-red-500/40 active:scale-90"
              aria-label="No me interesa"
            >
              <HiX className="h-7 w-7" />
            </button>

            <button
              onClick={() => onSwipeRight(event.id)}
              className="flex h-14 w-14 items-center justify-center rounded-full border border-green-300/55 bg-green-500/30 text-green-100 shadow-lg shadow-green-900/35 backdrop-blur-md transition-all duration-200 hover:border-green-300/80 hover:bg-green-500/40 active:scale-90"
              aria-label="Me interesa"
            >
              <HiHeart className="h-7 w-7" />
            </button>
          </div>
        )}
      </div>
    </motion.div>
  )
})

SwipeCard.displayName = 'SwipeCard'

export default SwipeCard
