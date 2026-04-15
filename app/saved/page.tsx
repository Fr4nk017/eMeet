'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import Layout from '../../src/components/Layout'
import { useAuth } from '../../src/context/AuthContext'
import { getSupabaseBrowserClient, hasSupabaseEnv } from '../../src/lib/supabase'
import { HiMapPin } from 'react-icons/hi2'
import { HiBookmark } from 'react-icons/hi'

type SavedEvent = {
  event_id: string
  event_title: string
  event_image_url: string | null
  event_address: string | null
}

const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=800&q=80'

export default function SavedRoutePage() {
  const { user, isAuthReady, updateUser } = useAuth()
  const router = useRouter()
  const [savedEvents, setSavedEvents] = useState<SavedEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [removingId, setRemovingId] = useState<string | null>(null)

  useEffect(() => {
    if (isAuthReady && !user) {
      router.replace('/auth')
    }
  }, [isAuthReady, user, router])

  useEffect(() => {
    if (!user) return

    if (!hasSupabaseEnv) {
      setLoading(false)
      return
    }

    const supabase = getSupabaseBrowserClient()

    ;(async () => {
      try {
        const { data } = await supabase
          .from('user_events')
          .select('event_id, event_title, event_image_url, event_address')
          .eq('user_id', user.id)
          .eq('action', 'save')
          .order('created_at', { ascending: false })

        setSavedEvents((data as SavedEvent[]) ?? [])
      } catch {
        setSavedEvents([])
      } finally {
        setLoading(false)
      }
    })()
  }, [user])

  async function handleRemove(eventId: string) {
    if (!user) return
    setRemovingId(eventId)

    if (hasSupabaseEnv) {
      const supabase = getSupabaseBrowserClient()
      await supabase
        .from('user_events')
        .delete()
        .eq('user_id', user.id)
        .eq('event_id', eventId)
        .eq('action', 'save')
    }

    setSavedEvents((prev) => prev.filter((e) => e.event_id !== eventId))

    try {
      await updateUser({
        savedEvents: (user.savedEvents ?? []).filter((id) => id !== eventId),
      })
    } catch {
      // El estado local ya fue actualizado; si falla la sync de perfil no es crítico.
    }

    setRemovingId(null)
  }

  if (!isAuthReady || loading) {
    return (
      <Layout headerTitle="Guardados">
        <div className="flex flex-col gap-3 px-4 pt-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex h-28 overflow-hidden rounded-2xl bg-card">
              <div className="shimmer h-full w-28 flex-shrink-0" />
              <div className="flex flex-1 flex-col justify-between p-3">
                <div className="shimmer h-4 w-3/4 rounded-md" />
                <div className="shimmer h-3 w-1/2 rounded-md" />
              </div>
            </div>
          ))}
        </div>
      </Layout>
    )
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
            <AnimatePresence>
              <div className="flex flex-col gap-3">
                {savedEvents.map((event) => (
                  <motion.div
                    key={event.event_id}
                    layout
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="flex gap-0 overflow-hidden rounded-2xl border border-white/5 bg-card"
                  >
                    <img
                      src={event.event_image_url ?? FALLBACK_IMAGE}
                      alt={event.event_title}
                      className="h-full w-28 flex-shrink-0 object-cover"
                      onError={(e) => { (e.currentTarget as HTMLImageElement).src = FALLBACK_IMAGE }}
                    />

                    <div className="flex min-w-0 flex-1 flex-col justify-between p-3">
                      <h3 className="line-clamp-2 text-sm font-bold leading-tight text-white">
                        {event.event_title}
                      </h3>

                      {event.event_address && (
                        <div className="mt-2 flex items-center gap-1.5 text-xs text-muted">
                          <HiMapPin className="h-3.5 w-3.5 flex-shrink-0 text-primary-light" />
                          <span className="truncate">{event.event_address}</span>
                        </div>
                      )}

                      <div className="mt-2 flex items-center justify-end">
                        <button
                          onClick={() => handleRemove(event.event_id)}
                          disabled={removingId === event.event_id}
                          className="flex h-8 w-8 items-center justify-center rounded-full bg-surface text-primary transition-colors hover:bg-red-500/20 hover:text-red-400 disabled:opacity-50"
                          aria-label="Quitar guardado"
                        >
                          <HiBookmark className="h-4 w-4 fill-current" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </AnimatePresence>
          </>
        )}
      </div>
    </Layout>
  )
}
