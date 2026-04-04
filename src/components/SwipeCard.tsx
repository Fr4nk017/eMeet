'use client'

import { useState, useRef } from 'react'
import { motion, useMotionValue, useTransform, animate } from 'framer-motion'
import type { PanInfo } from 'framer-motion'
import { HiMapPin, HiClock, HiUsers, HiGlobeAlt } from 'react-icons/hi2'
import { HiHeart, HiX, HiBookmark } from 'react-icons/hi'
import type { Event } from '../types'
import { formatEventDate, formatPrice, CATEGORY_COLORS, CATEGORY_EMOJI } from '../data/mockEvents'

interface SwipeCardProps {
  event: Event
  onSwipeRight: (id: string) => void   // like
  onSwipeLeft: (id: string) => void    // descarte
  onSave: (id: string) => void
  /** Índice en el stack (0 = carta superior/activa) */
  stackIndex: number
}

// ─── Umbral de px para considerar un swipe válido ────────────────────────────
const SWIPE_THRESHOLD = 120

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
export default function SwipeCard({
  event,
  onSwipeRight,
  onSwipeLeft,
  onSave,
  stackIndex,
}: SwipeCardProps) {
  const x = useMotionValue(0)
  const [isDragging, setIsDragging] = useState(false)

  // Rotación proporcional al arrastre horizontal
  const rotate = useTransform(x, [-200, 0, 200], [-15, 0, 15])

  // Opacidad de los indicadores LIKE / NOPE
  const likeOpacity = useTransform(x, [0, SWIPE_THRESHOLD], [0, 1])
  const nopeOpacity = useTransform(x, [-SWIPE_THRESHOLD, 0], [1, 0])

  // Escala de las tarjetas de fondo
  const scale = 1 - stackIndex * 0.04
  const yOffset = stackIndex * 10

  const cardRef = useRef<HTMLDivElement>(null)

  const isActive = stackIndex === 0

  function handleDragEnd(_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) {
    setIsDragging(false)
    if (!isActive) return

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
      drag={isActive ? 'x' : false}
      dragConstraints={{ left: 0, right: 0 }}
      onDragStart={() => setIsDragging(true)}
      onDragEnd={handleDragEnd}
      whileTap={{ scale: isActive ? 1.02 : scale }}
      transition={{ duration: 0 }}
    >
      {/* Tarjeta contenido */}
      <div className="relative h-full w-full overflow-hidden rounded-[30px] bg-card shadow-2xl select-none lg:rounded-[36px]">

        {/* Imagen de fondo */}
        <img
          src={event.imageUrl}
          alt={event.title}
          className="absolute inset-0 w-full h-full object-cover"
          draggable={false}
        />

        {/* Gradiente oscuro inferior */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />

        {/* Badge de categoría */}
        <div className="absolute left-4 top-4 lg:left-5 lg:top-5">
          <span
            className={`${CATEGORY_COLORS[event.category] ?? 'bg-purple-600'} rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white lg:px-4 lg:py-1.5`}
          >
            {CATEGORY_EMOJI[event.category]} {event.category}
          </span>
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
        <div className={`absolute bottom-0 left-0 right-0 p-5 transition-all duration-200 lg:p-6 ${isDragging ? 'opacity-80' : 'opacity-100'}`}>

          <h2 className="mb-1 line-clamp-2 text-xl font-bold leading-tight text-white lg:text-[1.7rem]">
            {event.title}
          </h2>

          <p className="mb-3 line-clamp-2 text-sm text-white/70 lg:text-[0.95rem] lg:leading-6">
            {event.description}
          </p>

          {/* Meta información */}
          <div className="flex flex-col gap-1.5 mb-4">
            <div className="flex items-center gap-2 text-sm text-white/80 lg:text-[0.95rem]">
              <HiClock className="w-4 h-4 flex-shrink-0 text-primary-light" />
              <span>{formatEventDate(event.date)}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-white/80 lg:text-[0.95rem]">
              <HiMapPin className="w-4 h-4 flex-shrink-0 text-primary-light" />
              <span className="truncate">{event.location}</span>
              <span className="text-white/50 text-xs flex-shrink-0">· {event.distance} km</span>
            </div>
            {event.capacity && (
              <div className="flex items-center gap-2 text-sm text-white/80 lg:text-[0.95rem]">
                <HiUsers className="w-4 h-4 flex-shrink-0 text-primary-light" />
                <span>{event.attendees}/{event.capacity} asistentes</span>
              </div>
            )}
          </div>

          {/* Precio + Organizador */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <img
                src={event.organizerAvatar}
                alt={event.organizerName}
                className="w-6 h-6 rounded-full border border-white/20"
              />
              <span className="max-w-[160px] truncate text-xs text-white/60 lg:max-w-[200px]">
                {event.organizerName}
              </span>
            </div>
            <span
              className={`text-sm font-bold px-3 py-1 rounded-full ${
                event.price === null
                  ? 'bg-green-500/20 text-green-400'
                  : 'bg-primary/20 text-primary-light'
              }`}
            >
              {formatPrice(event.price)}
            </span>
          </div>

          {event.websiteUrl && (
            <div className="mt-3">
              <a
                href={event.websiteUrl}
                target="_blank"
                rel="noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-500/10 px-3 py-1.5 text-xs font-semibold text-cyan-200 backdrop-blur-sm transition-colors hover:bg-cyan-500/20"
              >
                <HiGlobeAlt className="h-4 w-4" />
                Ver sitio web
              </a>
            </div>
          )}

          {/* Botones de acción (solo en carta activa) */}
          {isActive && (
            <div className="mt-4 flex items-center justify-center gap-6 lg:mt-5">
              <button
                onClick={() => onSwipeLeft(event.id)}
                className="flex h-14 w-14 items-center justify-center rounded-full border border-white/20 bg-white/10 text-red-400 backdrop-blur-sm transition-all duration-200 hover:border-red-400 hover:bg-red-500/20 active:scale-90 lg:h-16 lg:w-16"
                aria-label="No me interesa"
              >
                <HiX className="h-7 w-7 lg:h-8 lg:w-8" />
              </button>

              <button
                onClick={() => onSwipeRight(event.id)}
                className="flex h-14 w-14 items-center justify-center rounded-full border border-white/20 bg-white/10 text-green-400 backdrop-blur-sm transition-all duration-200 hover:border-green-400 hover:bg-green-500/20 active:scale-90 lg:h-16 lg:w-16"
                aria-label="Me interesa"
              >
                <HiHeart className="h-7 w-7 lg:h-8 lg:w-8" />
              </button>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}
