'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { Event, EventCategory } from '../types'
import { getSupabaseBrowserClient, hasSupabaseEnv } from '../lib/supabase'

interface CreateLocatarioEventInput {
  title: string
  description: string
  category: EventCategory
  date: string
  address: string
  price: number | null
  imageUrl?: string
  organizerName: string
  organizerAvatar: string
  lat?: number
  lng?: number
}

interface LocatarioEventsContextValue {
  locatarioEvents: Event[]
  isLoading: boolean
  createLocatarioEvent: (input: CreateLocatarioEventInput) => Promise<Event>
  removeLocatarioEvent: (eventId: string) => Promise<void>
}

const LocatarioEventsContext = createContext<LocatarioEventsContextValue | undefined>(undefined)

const STORAGE_KEY = 'emeet-locatario-events'
const FALLBACK_EVENT_IMAGE = 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=1200&q=80'
const EVENTS_URL = (process.env.NEXT_PUBLIC_EVENTS_URL ?? '').trim().replace(/\/$/, '')

// ── localStorage helpers (modo local sin Supabase) ───────────────────────────

function loadEventsFromStorage(): Event[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as Event[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function saveEventsToStorage(events: Event[]) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(events))
}

// ── Mapper: fila de Supabase → Event ────────────────────────────────────────

type LocatarioEventRow = {
  id: string
  title: string
  description: string
  category: string
  event_date: string
  address: string
  price: number | null
  image_url: string | null
  organizer_name: string
  organizer_avatar: string | null
}

function dbRowToEvent(row: LocatarioEventRow): Event {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    category: row.category as EventCategory,
    date: row.event_date,
    location: row.organizer_name,
    address: row.address,
    distance: 0,
    price: row.price,
    imageUrl: row.image_url || FALLBACK_EVENT_IMAGE,
    websiteUrl: null,
    organizerName: row.organizer_name,
    organizerAvatar: row.organizer_avatar || 'https://i.pravatar.cc/150?img=32',
    attendees: 0,
    capacity: null,
    tags: ['locatario', row.category as EventCategory],
    isLiked: false,
    isSaved: false,
    rating: undefined,
    isOpen: null,
  }
}

// ── Fetch helper ─────────────────────────────────────────────────────────────

async function apiFetch<T>(baseUrl: string, path: string, init?: RequestInit): Promise<T> {
  const endpoint = `${baseUrl}${path}`
  const headers = new Headers({ 'Content-Type': 'application/json', ...(init?.headers ?? {}) })

  if (hasSupabaseEnv) {
    const { data } = await getSupabaseBrowserClient().auth.getSession()
    const accessToken = data.session?.access_token
    if (accessToken) {
      headers.set('Authorization', `Bearer ${accessToken}`)
    }
  }

  const res = await fetch(endpoint, {
    credentials: 'include',
    ...init,
    headers,
  })
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null
    throw new Error(body?.error ?? 'Error al comunicarse con el servidor.')
  }
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

// ── Provider ─────────────────────────────────────────────────────────────────

export function LocatarioEventsProvider({ children }: { children: ReactNode }) {
  const [locatarioEvents, setLocatarioEvents] = useState<Event[]>([])
  const [isLoading, setIsLoading] = useState(false)

  // Carga inicial
  useEffect(() => {
    if (!hasSupabaseEnv) {
      setLocatarioEvents(loadEventsFromStorage())
      return
    }

    let mounted = true
    setIsLoading(true)

    ;(async () => {
      const { data } = await getSupabaseBrowserClient().auth.getSession()

      // Evita request 401 en frío cuando aún no hay sesión.
      if (!data.session) {
        if (!mounted) return
        setLocatarioEvents(loadEventsFromStorage())
        return
      }

      apiFetch<LocatarioEventRow[]>(EVENTS_URL, '/events/locatario')
        .then((rows) => {
          if (!mounted) return
          setLocatarioEvents(rows.map(dbRowToEvent))
        })
        .catch(() => {
          if (!mounted) return
          // Si falla la API, intentar con localStorage como fallback
          setLocatarioEvents(loadEventsFromStorage())
        })
        .finally(() => {
          if (mounted) setIsLoading(false)
        })
    })().catch(() => {
      if (!mounted) return
      setLocatarioEvents(loadEventsFromStorage())
      setIsLoading(false)
    })

    return () => { mounted = false }
  }, [])

  const createLocatarioEvent = useCallback(async (input: CreateLocatarioEventInput): Promise<Event> => {
    if (!hasSupabaseEnv) {
      // Modo local: guardar en localStorage
      const newEvent: Event = {
        id: `loc-event-${Date.now()}`,
        title: input.title.trim(),
        description: input.description.trim(),
        category: input.category,
        date: new Date(input.date).toISOString(),
        location: input.organizerName,
        address: input.address.trim(),
        distance: 0,
        lat: input.lat,
        lng: input.lng,
        price: input.price,
        imageUrl: input.imageUrl?.trim() || FALLBACK_EVENT_IMAGE,
        websiteUrl: null,
        organizerName: input.organizerName,
        organizerAvatar: input.organizerAvatar,
        attendees: 0,
        capacity: null,
        tags: ['locatario', input.category],
        isLiked: false,
        isSaved: false,
        rating: undefined,
        isOpen: null,
      }
      setLocatarioEvents((prev) => {
        const next = [newEvent, ...prev]
        saveEventsToStorage(next)
        return next
      })
      return newEvent
    }

    const { data: sessionData } = await getSupabaseBrowserClient().auth.getSession()
    if (!sessionData.session) {
      throw new Error('Debes iniciar sesión para crear eventos de locatario.')
    }

    // Modo Supabase: persistir en la base de datos
    const row = await apiFetch<LocatarioEventRow>(EVENTS_URL, '/events/locatario', {
      method: 'POST',
      body: JSON.stringify({
        title: input.title,
        description: input.description,
        category: input.category,
        event_date: input.date,
        address: input.address,
        price: input.price,
        image_url: input.imageUrl || null,
        organizer_name: input.organizerName,
        organizer_avatar: input.organizerAvatar,
      }),
    })

    const newEvent = dbRowToEvent(row)
    setLocatarioEvents((prev) => [newEvent, ...prev])
    return newEvent
  }, [])

  const removeLocatarioEvent = useCallback(async (eventId: string): Promise<void> => {
    // Optimistic update
    setLocatarioEvents((prev) => {
      const next = prev.filter((e) => e.id !== eventId)
      if (!hasSupabaseEnv) saveEventsToStorage(next)
      return next
    })

    if (!hasSupabaseEnv) return

    const { data: sessionData } = await getSupabaseBrowserClient().auth.getSession()
    if (!sessionData.session) {
      throw new Error('Debes iniciar sesión para eliminar eventos de locatario.')
    }

    await apiFetch<void>(EVENTS_URL, `/events/locatario/${eventId}`, { method: 'DELETE' })
  }, [])

  const value = useMemo(
    () => ({ locatarioEvents, isLoading, createLocatarioEvent, removeLocatarioEvent }),
    [locatarioEvents, isLoading, createLocatarioEvent, removeLocatarioEvent],
  )

  return <LocatarioEventsContext.Provider value={value}>{children}</LocatarioEventsContext.Provider>
}

export function useLocatarioEvents() {
  const context = useContext(LocatarioEventsContext)
  if (!context) {
    throw new Error('useLocatarioEvents debe usarse dentro de LocatarioEventsProvider')
  }
  return context
}
