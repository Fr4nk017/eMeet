'use client'

import { memo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import { Calendar, MapPin, Sparkles, ChevronRight } from 'lucide-react'
import type { Event, EventCategory } from '../types'

const CATEGORY_META: Record<EventCategory, { emoji: string; gradient: string; badge: string; text: string }> = {
  fiesta:      { emoji: '🎉', gradient: 'from-violet-600/40 to-purple-900/60',   badge: 'bg-violet-500/25 border-violet-400/40',  text: 'text-violet-300' },
  musica:      { emoji: '🎵', gradient: 'from-rose-600/40 to-pink-900/60',       badge: 'bg-rose-500/25 border-rose-400/40',      text: 'text-rose-300' },
  gastronomia: { emoji: '🍽️', gradient: 'from-amber-600/40 to-orange-900/60',   badge: 'bg-amber-500/25 border-amber-400/40',    text: 'text-amber-300' },
  networking:  { emoji: '🤝', gradient: 'from-sky-600/40 to-blue-900/60',        badge: 'bg-sky-500/25 border-sky-400/40',        text: 'text-sky-300' },
  deporte:     { emoji: '⚽', gradient: 'from-green-600/40 to-emerald-900/60',   badge: 'bg-green-500/25 border-green-400/40',    text: 'text-green-300' },
  cultura:     { emoji: '🏛️', gradient: 'from-teal-600/40 to-cyan-900/60',      badge: 'bg-teal-500/25 border-teal-400/40',      text: 'text-teal-300' },
  teatro:      { emoji: '🎭', gradient: 'from-indigo-600/40 to-slate-900/60',    badge: 'bg-indigo-500/25 border-indigo-400/40',  text: 'text-indigo-300' },
  arte:        { emoji: '🎨', gradient: 'from-fuchsia-600/40 to-purple-900/60',  badge: 'bg-fuchsia-500/25 border-fuchsia-400/40', text: 'text-fuchsia-300' },
}

const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=600&q=70'

function formatEventDate(iso: string): { date: string; time: string } {
  try {
    const d = new Date(iso)
    return {
      date: d.toLocaleDateString('es-CL', { weekday: 'short', day: 'numeric', month: 'short' }),
      time: d.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }),
    }
  } catch {
    return { date: '', time: '' }
  }
}

function isUpcomingEvent(iso: string): boolean {
  try { return new Date(iso) > new Date() } catch { return false }
}

function EventCard({ event, idx, onClick }: { event: Event; idx: number; onClick: () => void }) {
  const [imgSrc, setImgSrc] = useState(event.imageUrl || FALLBACK_IMAGE)
  const [videoReady, setVideoReady] = useState(false)
  const meta = CATEGORY_META[event.category] ?? CATEGORY_META.fiesta
  const upcoming = event.date ? isUpcomingEvent(event.date) : false
  const isFree = event.price === null || event.price === 0
  const hasVideo = Boolean(event.videoUrl)
  const { date, time } = event.date ? formatEventDate(event.date) : { date: '', time: '' }

  return (
    <motion.div
      initial={{ opacity: 0, y: 14, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: idx * 0.06, type: 'spring', stiffness: 300, damping: 26 }}
      onClick={onClick}
      className="group relative overflow-hidden rounded-2xl border border-white/[0.07] bg-[#14142a] transition-all duration-300 hover:border-white/20 hover:shadow-xl hover:shadow-violet-950/40 cursor-pointer"
    >
      {/* Hero */}
      <div className="relative h-[130px] overflow-hidden">
        {hasVideo ? (
          <>
            {!videoReady && (
              <div className={`absolute inset-0 bg-gradient-to-br ${meta.gradient}`} />
            )}
            <video
              src={event.videoUrl!}
              className={`h-full w-full object-cover transition-all duration-500 group-hover:scale-105 ${videoReady ? 'opacity-100' : 'opacity-0'}`}
              autoPlay muted loop playsInline
              onCanPlay={() => setVideoReady(true)}
            />
          </>
        ) : (
          <>
            <Image
              src={imgSrc}
              alt={event.title}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              sizes="280px"
              onError={() => setImgSrc(FALLBACK_IMAGE)}
            />
          </>
        )}

        {/* Dark gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#14142a] via-black/30 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-black/40" />

        {/* Top badges row */}
        <div className="absolute left-2.5 right-2.5 top-2.5 flex items-center justify-between">
          <span className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold backdrop-blur-md ${meta.badge} ${meta.text}`}>
            <span>{meta.emoji}</span>
            <span className="capitalize">{event.category}</span>
          </span>
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold backdrop-blur-md border ${
            isFree
              ? 'bg-emerald-500/25 border-emerald-400/40 text-emerald-300'
              : 'bg-white/15 border-white/20 text-white'
          }`}>
            {isFree ? 'Gratis' : `$${event.price?.toLocaleString()}`}
          </span>
        </div>

        {/* Upcoming indicator */}
        {upcoming && (
          <div className="absolute bottom-2.5 left-2.5 flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
            </span>
            <span className="text-[10px] font-semibold text-emerald-300 drop-shadow">Próximo</span>
          </div>
        )}

        {/* Arrow hover hint */}
        <div className="absolute bottom-2.5 right-2.5 opacity-0 transition-opacity group-hover:opacity-100">
          <div className="flex items-center gap-0.5 rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur-md">
            Ver <ChevronRight className="h-3 w-3" />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-3 pb-3 pt-2.5">
        <h4 className="mb-2 line-clamp-2 text-[13px] font-semibold leading-snug text-white transition-colors group-hover:text-violet-200">
          {event.title}
        </h4>

        <div className="space-y-1.5">
          {date && (
            <div className="flex items-center gap-1.5">
              <Calendar className="h-3 w-3 shrink-0 text-violet-400" />
              <span className="text-[11px] text-slate-400">
                {date}{time ? ` · ${time}` : ''}
              </span>
            </div>
          )}
          {event.address && (
            <div className="flex items-center gap-1.5">
              <MapPin className="h-3 w-3 shrink-0 text-rose-400" />
              <span className="line-clamp-1 text-[11px] text-slate-400">{event.address}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-2.5 flex items-center justify-between border-t border-white/[0.06] pt-2.5">
          <div className="flex items-center gap-1.5 min-w-0">
            {event.organizerAvatar ? (
              <img
                src={event.organizerAvatar}
                alt=""
                className="h-5 w-5 shrink-0 rounded-full border border-white/20 object-cover"
              />
            ) : (
              <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-violet-500/30 bg-violet-600/30 text-[9px] font-bold text-violet-300">
                {event.organizerName.charAt(0).toUpperCase()}
              </div>
            )}
            <span className="truncate text-[10px] text-slate-500">{event.organizerName}</span>
          </div>

          {event.distance > 0 && (
            <span className="shrink-0 text-[10px] font-semibold text-violet-400">
              {event.distance < 1
                ? `${Math.round(event.distance * 1000)} m`
                : `${event.distance.toFixed(1)} km`}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  )
}

interface CommunityEventsPanelProps {
  events: Event[]
}

const CommunityEventsPanel = memo(function CommunityEventsPanel({ events }: CommunityEventsPanelProps) {
  const router = useRouter()
  const communityEvents = events.filter((e) => e.source === 'locatario')

  return (
    <div className="flex h-full flex-col">

      {/* ── Header ── */}
      <div className="mb-1 flex items-center gap-2.5">
        <div className="relative">
          <div className="absolute -inset-2 rounded-xl bg-gradient-to-r from-violet-500/15 to-fuchsia-500/15 blur-md" />
          <div className="relative flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-600 shadow-lg shadow-violet-500/30">
              <Sparkles className="h-3.5 w-3.5 text-white" />
            </div>
            <h3 className="bg-gradient-to-r from-white to-violet-200 bg-clip-text text-sm font-bold tracking-tight text-transparent">
              Eventos
            </h3>
          </div>
        </div>

        <AnimatePresence>
          {communityEvents.length > 0 && (
            <motion.span
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              className="ml-auto rounded-full border border-violet-500/30 bg-violet-500/20 px-2 py-0.5 text-[10px] font-bold text-violet-300"
            >
              {communityEvents.length}
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      <p className="mb-3.5 text-[11px] text-slate-500">De la comunidad · cerca tuyo</p>

      {/* ── List ── */}
      {communityEvents.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="flex flex-1 flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-white/[0.08] bg-white/[0.02] py-12 text-center"
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600/20 to-fuchsia-600/20 text-3xl shadow-inner">
            🎪
          </div>
          <div className="space-y-1 px-4">
            <p className="text-xs font-medium text-slate-400">Sin eventos cerca</p>
            <p className="text-[11px] text-slate-600">
              Cuando los locatarios de tu zona publiquen eventos, aparecerán aquí
            </p>
          </div>
        </motion.div>
      ) : (
        <div className="space-y-2.5">
          {communityEvents.slice(0, 6).map((event, idx) => (
            <EventCard
              key={event.id}
              event={event}
              idx={idx}
              onClick={() => router.push(`/event/${encodeURIComponent(event.id)}`)}
            />
          ))}
        </div>
      )}
    </div>
  )
})

CommunityEventsPanel.displayName = 'CommunityEventsPanel'
export default CommunityEventsPanel
