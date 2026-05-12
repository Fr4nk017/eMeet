'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { ArrowLeft, MapPin, Calendar, Heart, Bookmark } from 'lucide-react'
import Layout from '../../../src/components/Layout'
import { useAuth } from '../../../src/context/AuthContext'

interface EventDetail {
  event_id: string
  event_title: string
  event_image_url: string | null
  event_address: string | null
  created_at: string
}

function formatDate(isoDate: string) {
  return new Date(isoDate).toLocaleDateString('es-CL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    weekday: 'long',
  })
}

export default function EventDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const { user, isAuthReady } = useAuth()
  const eventId = decodeURIComponent(params.id)
  const [event, setEvent] = useState<EventDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [isSaved, setIsSaved] = useState(true)

  useEffect(() => {
    if (isAuthReady && !user) {
      router.replace('/auth')
    }
  }, [isAuthReady, router, user])

  useEffect(() => {
    if (!user) return

    let cancelled = false
    
    // Simulate loading the event (the actual data would come from context or BE)
    const timer = setTimeout(() => {
      if (!cancelled) {
        setEvent({
          event_id: eventId,
          event_title: 'Evento Guardado',
          event_image_url: null,
          event_address: 'Ubicación no disponible',
          created_at: new Date().toISOString(),
        })
        setLoading(false)
      }
    }, 300)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [user, eventId])

  async function handleToggleSave() {
    if (!event) return
    setIsSaved(!isSaved)
  }

  if (loading) {
    return (
      <Layout>
        <div className="flex flex-col gap-4 p-4">
          <div className="flex items-center gap-2">
            <div className="shimmer h-10 w-10 rounded-full" />
          </div>
          <div className="shimmer h-64 rounded-2xl" />
          <div className="space-y-4">
            <div className="shimmer h-6 w-3/4 rounded" />
            <div className="shimmer h-4 w-full rounded" />
            <div className="shimmer h-4 w-1/2 rounded" />
          </div>
        </div>
      </Layout>
    )
  }

  if (!event) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center gap-4 p-4 py-20">
          <span className="text-4xl">⚠️</span>
          <p className="text-sm text-muted text-center">Evento no encontrado</p>
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 rounded-full bg-primary px-6 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary/90"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver
          </button>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="min-h-screen pb-20"
      >
        {/* Header Button */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/5 bg-surface/80 px-4 py-3 backdrop-blur-sm">
          <button
            onClick={() => router.back()}
            className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-white/10 transition-colors"
            aria-label="Volver"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <span className="text-sm font-semibold text-muted">Evento</span>
          <button
            onClick={handleToggleSave}
            className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-white/10 transition-colors"
            aria-label="Guardar evento"
          >
            <Bookmark
              className={`h-5 w-5 ${isSaved ? 'fill-primary text-primary' : 'text-muted'}`}
            />
          </button>
        </div>

        {/* Image */}
        {event.event_image_url ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative h-64 w-full overflow-hidden"
          >
            <img
              src={event.event_image_url}
              alt={event.event_title}
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-surface via-transparent" />
          </motion.div>
        ) : (
          <div className="flex h-64 w-full items-center justify-center bg-surface text-4xl">
            🗓️
          </div>
        )}

        {/* Content */}
        <div className="space-y-4 p-4">
          {/* Title */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="space-y-2"
          >
            <h1 className="text-2xl font-bold leading-tight text-white">
              {event.event_title}
            </h1>
          </motion.div>

          {/* Address */}
          {event.event_address && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="flex items-start gap-3 rounded-lg border border-white/10 bg-white/5 p-3"
            >
              <MapPin className="h-5 w-5 flex-shrink-0 text-primary-light" />
              <div className="flex-1">
                <p className="text-xs font-semibold text-muted">Ubicación</p>
                <p className="mt-1 text-sm text-white">{event.event_address}</p>
              </div>
            </motion.div>
          )}

          {/* Saved Date */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex items-start gap-3 rounded-lg border border-white/10 bg-white/5 p-3"
          >
            <Calendar className="h-5 w-5 flex-shrink-0 text-primary-light" />
            <div className="flex-1">
              <p className="text-xs font-semibold text-muted">Guardado</p>
              <p className="mt-1 text-sm text-white">{formatDate(event.created_at)}</p>
            </div>
          </motion.div>

          {/* Actions */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="flex flex-col gap-3 pt-4"
          >
            <button
              onClick={() => router.push('/')}
              className="flex items-center justify-center gap-2 rounded-full bg-primary py-3 text-sm font-semibold text-white transition-colors hover:bg-primary/90"
            >
              <Heart className="h-4 w-4" />
              Explorar más eventos
            </button>
            <button
              onClick={() => router.back()}
              className="flex items-center justify-center gap-2 rounded-full border border-white/20 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/5"
            >
              <ArrowLeft className="h-4 w-4" />
              Volver a guardados
            </button>
          </motion.div>
        </div>
      </motion.div>
    </Layout>
  )
}
