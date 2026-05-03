'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { MapPin, Bookmark, Calendar } from 'lucide-react'
import Layout from '../../src/components/Layout'
import { useAuth } from '../../src/context/AuthContext'
import { getSupabaseBrowserClient, hasSupabaseEnv } from '../../src/lib/supabase'

type SavedEventRow = {
  event_id: string
  event_title: string
  event_image_url: string | null
  event_address: string | null
  created_at: string
}

const SAVED_URL = (process.env.NEXT_PUBLIC_SAVED_URL ?? '').trim().replace(/\/$/, '')

async function getAccessToken(): Promise<string | null> {
  if (!hasSupabaseEnv) return null
  const supabase = getSupabaseBrowserClient()
  const { data } = await supabase.auth.getSession()
  if (data.session?.access_token) return data.session.access_token
  const { data: refreshed, error } = await supabase.auth.refreshSession()
  if (error) return null
  return refreshed.session?.access_token ?? null
}

async function callSavedApi<T>(path: string, init?: RequestInit): Promise<T> {
  if (!SAVED_URL) throw new Error('Falta NEXT_PUBLIC_SAVED_URL en .env.local')

  const headers = new Headers({ 'Content-Type': 'application/json' })

  if (hasSupabaseEnv) {
    const token = await getAccessToken()
    if (!token) throw new Error('Sesión expirada. Vuelve a iniciar sesión.')
    headers.set('Authorization', `Bearer ${token}`)
  }

  const res = await fetch(`${SAVED_URL}${path}`, {
    credentials: 'include',
    ...init,
    headers,
  })

  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null
    throw new Error(body?.error ?? 'Error al comunicarse con el servicio de guardados.')
  }

  if (res.status === 204) return undefined as T
  return res.json()
}

function formatSavedDate(isoDate: string) {
  return new Date(isoDate).toLocaleDateString('es-CL', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export default function SavedRoutePage() {
  const { user, isAuthReady, updateUser } = useAuth()
  const router = useRouter()
  const [savedEvents, setSavedEvents] = useState<SavedEventRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isAuthReady && !user) {
      router.replace('/auth')
    }
  }, [isAuthReady, router, user])

  useEffect(() => {
    if (!user) return

    let cancelled = false
    setLoading(true)
    setError(null)

    callSavedApi<SavedEventRow[]>('/events/saved')
      .then((data) => { if (!cancelled) setSavedEvents(data) })
      .catch((err: Error) => { if (!cancelled) setError(err.message) })
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [user])

  async function handleRemove(eventId: string) {
    const snapshot = savedEvents
    setSavedEvents((prev) => prev.filter((e) => e.event_id !== eventId))
    try {
      await callSavedApi(`/events/save/${eventId}`, { method: 'DELETE' })
      // Keep AuthContext in sync so the feed's bookmark icon reflects the removal
      const nextSaved = (user?.savedEvents ?? []).filter((id) => id !== eventId)
      updateUser({ savedEvents: nextSaved }).catch(() => {})
    } catch {
      setSavedEvents(snapshot)
    }
  }

  function handleRetry() {
    setLoading(true)
    setError(null)
    callSavedApi<SavedEventRow[]>('/events/saved')
      .then(setSavedEvents)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false))
  }

  return (
    <Layout headerTitle="Guardados">
      <div className="px-4 pb-4 pt-4">
        {loading ? (
          <div className="flex flex-col gap-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex overflow-hidden rounded-2xl border border-white/5 bg-card">
                <div className="shimmer h-28 w-28 flex-shrink-0" />
                <div className="flex flex-1 flex-col gap-2 p-3">
                  <div className="shimmer h-4 w-3/4 rounded-md" />
                  <div className="shimmer h-3 w-full rounded-md" />
                  <div className="shimmer h-3 w-1/2 rounded-md" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
            <span className="text-4xl">⚠️</span>
            <p className="text-sm text-muted">{error}</p>
            <button
              onClick={handleRetry}
              className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white"
            >
              Reintentar
            </button>
          </div>
        ) : savedEvents.length === 0 ? (
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
                    className="flex overflow-hidden rounded-2xl border border-white/5 bg-card"
                  >
                    {event.event_image_url ? (
                      <img
                        src={event.event_image_url}
                        alt={event.event_title}
                        className="h-full w-28 flex-shrink-0 object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-28 flex-shrink-0 items-center justify-center bg-surface/60 text-2xl">
                        🗓️
                      </div>
                    )}

                    <div className="flex min-w-0 flex-1 flex-col justify-between p-3">
                      <h3 className="line-clamp-2 text-sm font-bold leading-tight text-white">
                        {event.event_title}
                      </h3>

                      <div className="mt-2 flex flex-col gap-1">
                        {event.event_address && (
                          <div className="flex items-center gap-1.5 text-xs text-muted">
                            <MapPin className="h-3.5 w-3.5 flex-shrink-0 text-primary-light" />
                            <span className="truncate">{event.event_address}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1.5 text-xs text-muted">
                          <Calendar className="h-3.5 w-3.5 flex-shrink-0 text-primary-light" />
                          <span>Guardado el {formatSavedDate(event.created_at)}</span>
                        </div>
                      </div>

                      <div className="mt-2 flex items-center justify-end">
                        <button
                          onClick={() => handleRemove(event.event_id)}
                          className="flex h-8 w-8 items-center justify-center rounded-full bg-surface text-primary transition-colors hover:bg-red-500/20 hover:text-red-400"
                          aria-label="Quitar guardado"
                        >
                          <Bookmark className="h-4 w-4 fill-current" />
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
