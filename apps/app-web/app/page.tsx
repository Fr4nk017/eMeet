'use client'

import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import dynamic from 'next/dynamic'
import { Search, X as XIcon, SlidersHorizontal } from 'lucide-react'
import SwipeCard from '@/src/components/SwipeCard'
import CommunityEventsPanel from '@/src/components/CommunityEventsPanel'
import Layout from '@/src/components/Layout'
import DistanceFilter from '@/src/components/DistanceFilter'
import PlaceTypeFilters from '@/src/components/PlaceTypeFilters'
import { placeToEvent } from '@/src/data/placeFeedAdapter'
import { NearbyPlacesProvider, useNearbyPlacesContext } from '@/src/context/NearbyPlacesContext'
import { useChatContext } from '@/src/context/ChatContext'
import { useAuth } from '@/src/context/AuthContext'
import { useLocatarioEvents } from '@/src/context/LocatarioEventsContext'
import { callSavedApi } from '@/src/lib/savedApi'
import { hasSupabaseEnv } from '@/src/lib/supabase'
import { haversineKm } from '@/src/utils/geo'
import type { PlaceType, EventCategory, Event } from '@/src/types'

const CATEGORY_OPTIONS: { value: EventCategory; emoji: string; label: string }[] = [
  { value: 'fiesta',      emoji: '🎉', label: 'Fiesta' },
  { value: 'musica',      emoji: '🎵', label: 'Música' },
  { value: 'gastronomia', emoji: '🍽️', label: 'Gastro' },
  { value: 'networking',  emoji: '🤝', label: 'Networking' },
  { value: 'deporte',     emoji: '⚽', label: 'Deporte' },
  { value: 'cultura',     emoji: '🏛️', label: 'Cultura' },
  { value: 'teatro',      emoji: '🎭', label: 'Teatro' },
  { value: 'arte',        emoji: '🎨', label: 'Arte' },
]

const BellavistaMapMobile = dynamic(() => import('@/src/components/BellavistaMap'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center bg-card text-sm text-muted">
      Cargando mapa...
    </div>
  ),
})

const DEFAULT_FEED_TYPES: PlaceType[] = ['restaurant', 'bar', 'night_club', 'cafe']
const LOCATARIO_MAX_KM = 10


function FeedSkeleton() {
  return (
    <div className="card-stack mx-auto h-full min-h-[500px] w-full max-w-[380px] lg:min-h-[560px] xl:min-h-[620px]">
      {[2, 1, 0].map((i) => (
        <div
          key={i}
          className="swipe-card"
          style={{
            transform: `scale(${1 - i * 0.04}) translateY(${i * 10}px)`,
            zIndex: 10 - i,
            opacity: 1 - i * 0.15,
          }}
        >
          <div className="flex h-full w-full flex-col overflow-hidden rounded-[30px] bg-card shadow-2xl lg:rounded-[36px]">
            <div className="relative shrink-0 basis-[62%]">
              <div className="shimmer absolute inset-0" />
              <div className="absolute left-4 top-4">
                <div className="h-6 w-24 rounded-full shimmer" style={{ background: 'rgba(255,255,255,0.12)' }} />
              </div>
            </div>

            <div className="flex flex-1 flex-col justify-between p-5">
              <div className="space-y-2">
                <div className="shimmer h-6 w-3/4 rounded-xl" />
                <div className="shimmer h-3.5 w-full rounded-md" />
                <div className="shimmer h-3.5 w-2/3 rounded-md" />
                <div className="mt-1 flex items-center gap-2">
                  <div className="shimmer h-4 w-4 flex-shrink-0 rounded-full" />
                  <div className="shimmer h-3.5 w-28 rounded-md" />
                </div>
                <div className="flex items-center gap-2">
                  <div className="shimmer h-4 w-4 flex-shrink-0 rounded-full" />
                  <div className="shimmer h-3.5 w-36 rounded-md" />
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="shimmer h-6 w-6 rounded-full" />
                    <div className="shimmer h-3.5 w-24 rounded-md" />
                  </div>
                  <div className="shimmer h-7 w-20 rounded-full" />
                </div>
                <div className="flex items-center justify-center gap-6">
                  <div className="shimmer h-14 w-14 rounded-full" />
                  <div className="shimmer h-14 w-14 rounded-full" />
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function OnboardingModal({ onDismiss }: { onDismiss: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        className="mx-4 w-full max-w-[320px] rounded-3xl border border-white/15 bg-card p-6 shadow-2xl"
      >
        <div className="mb-4 text-center text-4xl">👋</div>
        <h2 className="mb-1 text-center text-xl font-bold text-white">Bienvenido a XzonaParty</h2>
        <p className="mb-5 text-center text-sm text-muted">Descubre eventos y lugares cerca tuyo.</p>

        <div className="mb-6 space-y-2.5">
          {([
            { icon: '👉', title: 'Swipe derecha', desc: 'Me interesa — te unes a la comunidad del evento' },
            { icon: '👈', title: 'Swipe izquierda', desc: 'No me interesa — pasa al siguiente' },
            { icon: '🔖', title: 'Guardar', desc: 'Guarda para verlo después sin dar like' },
          ] as const).map(({ icon, title, desc }) => (
            <div key={title} className="flex items-center gap-3 rounded-2xl bg-surface/60 px-3 py-2.5">
              <span className="text-2xl">{icon}</span>
              <div>
                <p className="text-sm font-semibold text-white">{title}</p>
                <p className="text-xs text-muted">{desc}</p>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={onDismiss}
          className="w-full rounded-full bg-primary py-3 font-semibold text-white transition-colors active:scale-95 hover:bg-primary-dark"
        >
          ¡Entendido, explorar!
        </button>
      </motion.div>
    </motion.div>
  )
}

function HomePageContent() {
  const {
    places,
    excludePlace,
    userLocation,
    loading,
    locating,
    invalidApiKey,
    locationError,
    selectedPlaceTypes,
    selectedDistanceKm,
    requestUserLocation,
    resetExcludedPlaces,
    setDistanceKm,
    togglePlaceType,
    refreshPlaces,
  } = useNearbyPlacesContext()
  const { joinRoom } = useChatContext()
  const { user, updateUser } = useAuth()
  const { locatarioEvents, publicLocatarioEvents } = useLocatarioEvents()

  const allLocatarioEvents = useMemo(() => {
    const seen = new Set<string>()
    return [...publicLocatarioEvents, ...locatarioEvents].filter((e) => {
      if (seen.has(e.id)) return false
      seen.add(e.id)
      return true
    })
  }, [publicLocatarioEvents, locatarioEvents])
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set())
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set())
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set())
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const processingIds = useRef<Set<string>>(new Set())
  const [isFiltersOpen, setIsFiltersOpen] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategories, setSelectedCategories] = useState<Set<EventCategory>>(new Set())
  const [onlyCommunity, setOnlyCommunity] = useState(false)
  const [pinnedEventId, setPinnedEventId] = useState<string | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!window.localStorage.getItem('emeet-onboarding-v1')) setShowOnboarding(true)
  }, [])

  function dismissOnboarding() {
    window.localStorage.setItem('emeet-onboarding-v1', '1')
    setShowOnboarding(false)
  }
  const [toast, setToast] = useState<{ message: string; type: 'like' | 'nope' | 'save' } | null>(null)
  const [focusedPlaceId, setFocusedPlaceId] = useState<string | null>(null)
  const [showMobileMap, setShowMobileMap] = useState(false)
  useEffect(() => {
    if (!user) {
      setLikedIds(new Set())
      setSavedIds(new Set())
      return
    }

    setLikedIds(new Set(user.likedEvents))
    setSavedIds(new Set(user.savedEvents))
  }, [user])

  useEffect(() => {
    const mediaQuery = window.matchMedia('(min-width: 1024px)')
    const onDesktop = () => {
      if (mediaQuery.matches) {
        setShowMobileMap(false)
      }
    }

    onDesktop()
    mediaQuery.addEventListener('change', onDesktop)

    return () => mediaQuery.removeEventListener('change', onDesktop)
  }, [])

  const baseEvents = useMemo(() => {
    const locatarioMapped = allLocatarioEvents
      .map((e) => {
        if (e.lat != null && e.lng != null && userLocation) {
          return { ...e, distance: haversineKm(e.lat, e.lng, userLocation.lat, userLocation.lng) }
        }
        return e
      })
      .filter((e) => e.distance <= LOCATARIO_MAX_KM)

    const placeEvents = userLocation
      ? places
          .filter((place) => selectedPlaceTypes.includes(place.type))
          .map((place) => {
            const distance = haversineKm(place.position.lat, place.position.lng, userLocation.lat, userLocation.lng)
            return placeToEvent(place, distance)
          })
          .filter((e) => e.distance <= selectedDistanceKm)
      : []

    return placeEvents
      .concat(locatarioMapped)
      .sort((a, b) => a.distance - b.distance)
  }, [allLocatarioEvents, places, selectedDistanceKm, selectedPlaceTypes, userLocation])

  const events = useMemo(() => {
    return baseEvents
      .filter((event) => !dismissedIds.has(event.id))
      .map((event) => ({
        ...event,
        isLiked: likedIds.has(event.id),
        isSaved: savedIds.has(event.id),
      }))
  }, [baseEvents, dismissedIds, likedIds, savedIds])

  function showToast(message: string, type: 'like' | 'nope' | 'save') {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    setToast({ message, type })
    toastTimerRef.current = setTimeout(() => setToast(null), 1800)
  }

  const openGpsMap = useCallback(() => {
    requestUserLocation(true)
    showToast('Mapa centrado en tu ubicación.', 'save')
  }, [requestUserLocation])

  const handleSwipeRight = useCallback(async (id: string) => {
    if (processingIds.current.has(id)) return
    processingIds.current.add(id)

    try {
      const likedEvent = events.find((event) => event.id === id)

      if (!likedEvent) {
        showToast('No pudimos cargar ese evento.', 'nope')
        return
      }

      // Invitado: no persiste like, pero si permite navegar la ruta del evento.
      if (!user) {
        setDismissedIds((prev) => new Set(prev).add(id))
        excludePlace(id)
        setFocusedPlaceId(likedEvent.id)
        if (window.innerWidth < 1024) {
          setShowMobileMap(true)
        }
        showToast('Ruta abierta. Inicia sesión para guardar likes.', 'save')
        return
      }

      if (hasSupabaseEnv) {
        try {
          await callSavedApi('/events/like', {
            method: 'POST',
            body: JSON.stringify({
              eventId: likedEvent.id,
              eventTitle: likedEvent.title,
              eventImageUrl: likedEvent.imageUrl,
              eventAddress: likedEvent.address,
              eventType: likedEvent.category,
              eventLat: likedEvent.lat,
              eventLng: likedEvent.lng,
              eventDistance: likedEvent.distance,
              eventDate: likedEvent.date ?? null,
            }),
          })
        } catch (err) {
          console.error('[like] callSavedApi failed:', err)
          showToast('No se pudo registrar tu like.', 'nope')
          return
        }
      }

      setLikedIds((prev) => new Set(prev).add(id))
      setDismissedIds((prev) => new Set(prev).add(id))
      excludePlace(id)
      setPinnedEventId((prev) => prev === id ? null : prev)

      showToast(`¡Like! ${likedEvent.title}`, 'like')
      setFocusedPlaceId(likedEvent.id)
      if (window.innerWidth < 1024) {
        setShowMobileMap(true)
      }

      try {
        await updateUser({ likedEvents: Array.from(new Set([...(user.likedEvents ?? []), likedEvent.id])) })
      } catch {
        // El like ya fue persistido, solo falló la sincronización local del perfil.
      }

      // joinRoom es secundario: si falla no interrumpe ni sobreescribe la confirmación
      joinRoom(likedEvent.id, likedEvent.title, likedEvent.imageUrl, likedEvent.address).catch(() => {})
    } finally {
      processingIds.current.delete(id)
    }
    }, [events, excludePlace, joinRoom, updateUser, user])

  const handleSwipeLeft = useCallback((id: string) => {
    setDismissedIds((prev) => new Set(prev).add(id))
    excludePlace(id)
    setPinnedEventId((prev) => prev === id ? null : prev)
    showToast('No es para ti', 'nope')
  }, [excludePlace])

  const handleSave = useCallback(async (id: string) => {
    if (!user) {
      showToast('Inicia sesión para guardar eventos.', 'nope')
      return
    }

    const eventToSave = events.find((event) => event.id === id)
    if (!eventToSave) return

    const isCurrentlySaved = savedIds.has(id)

    if (hasSupabaseEnv) {
      try {
        if (isCurrentlySaved) {
          await callSavedApi(`/events/save/${id}`, { method: 'DELETE' })
        } else {
          await callSavedApi('/events/save', {
            method: 'POST',
            body: JSON.stringify({
              eventId: eventToSave.id,
              eventTitle: eventToSave.title,
              eventImageUrl: eventToSave.imageUrl,
              eventAddress: eventToSave.address,
            }),
          })
        }
      } catch {
        showToast(
          isCurrentlySaved ? 'No se pudo quitar de guardados.' : 'No se pudo guardar el evento.',
          'nope',
        )
        return
      }
    }

    const nextSaved = new Set(savedIds)
    if (nextSaved.has(id)) nextSaved.delete(id)
    else nextSaved.add(id)

    setSavedIds(nextSaved)

    try {
      await updateUser({ savedEvents: Array.from(nextSaved) })
    } catch {
      // El guardado ya fue persistido, solo falló la sincronización local del perfil.
    }

    showToast('Evento guardado 🔖', 'save')
  }, [events, savedIds, updateUser, user])

  const filteredEvents = useMemo(() => {
    let result = events
    if (onlyCommunity) {
      result = result.filter((e) => e.source === 'locatario')
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter((e) =>
        e.title.toLowerCase().includes(q) ||
        e.address?.toLowerCase().includes(q) ||
        e.location?.toLowerCase().includes(q) ||
        e.description?.toLowerCase().includes(q)
      )
    }
    if (selectedCategories.size > 0) {
      result = result.filter((e) => selectedCategories.has(e.category))
    }
    return result
  }, [events, onlyCommunity, searchQuery, selectedCategories])

  const visibleEvents = useMemo(() => {
    if (pinnedEventId) {
      const pinned = events.find((e) => e.id === pinnedEventId)
      if (pinned) {
        const rest = filteredEvents.filter((e) => e.id !== pinnedEventId)
        return [pinned, ...rest].slice(0, 3)
      }
    }
    return filteredEvents.slice(0, 3)
  }, [filteredEvents, events, pinnedEventId])

  const activeFilterCount =
    (selectedDistanceKm !== 3 ? 1 : 0) +
    (selectedPlaceTypes.length !== DEFAULT_FEED_TYPES.length ? 1 : 0) +
    (searchQuery.trim() ? 1 : 0) +
    selectedCategories.size +
    (onlyCommunity ? 1 : 0)

  function toggleCategory(cat: EventCategory) {
    setSelectedCategories((prev) => {
      const next = new Set(prev)
      if (next.has(cat)) next.delete(cat)
      else next.add(cat)
      return next
    })
  }

  function handlePinEvent(event: Event) {
    setDismissedIds((prev) => {
      const next = new Set(prev)
      next.delete(event.id)
      return next
    })
    setPinnedEventId(event.id)
  }

  function restoreDefaultFilters() {
    setDistanceKm(3)
    setSearchQuery('')
    setSelectedCategories(new Set())
    setOnlyCommunity(false)

    const selectedSet = new Set(selectedPlaceTypes)
    const defaultSet = new Set(DEFAULT_FEED_TYPES)

    selectedPlaceTypes.forEach((type) => {
      if (!defaultSet.has(type)) togglePlaceType(type)
    })

    DEFAULT_FEED_TYPES.forEach((type) => {
      if (!selectedSet.has(type)) togglePlaceType(type)
    })
  }

  return (
    <Layout showDesktopMap focusedPlaceId={focusedPlaceId}>
      <div className="relative flex h-full min-h-0 flex-col overflow-hidden">
        <AnimatePresence>
          {showOnboarding && (
            <OnboardingModal onDismiss={dismissOnboarding} />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {toast && (
            <motion.div
              key="toast"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={`absolute top-3 left-1/2 z-50 -translate-x-1/2 rounded-full px-5 py-2 text-sm font-semibold shadow-lg ${
                toast.type === 'like'
                  ? 'bg-green-500 text-white'
                  : toast.type === 'nope'
                    ? 'bg-red-500 text-white'
                    : 'bg-primary text-white'
              }`}
            >
              {toast.message}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="relative flex min-h-0 flex-1 px-4 pb-4 pt-3 lg:px-5 lg:pb-5 lg:pt-2">
          <div className="absolute left-4 top-2 z-30 flex items-center gap-2 lg:left-5">
            <button
              type="button"
              onClick={openGpsMap}
              className="rounded-full border border-emerald-400/40 bg-emerald-500/15 px-3 py-2 text-xs font-semibold text-emerald-200 shadow-lg backdrop-blur-md transition-colors hover:bg-emerald-500/25"
            >
              GPS en mapa
            </button>
          </div>

          <div className="absolute right-4 top-2 z-30 hidden lg:block lg:right-5">
            <button
              type="button"
              onClick={() => setIsFiltersOpen((v) => !v)}
              className={`flex items-center gap-1.5 rounded-full border px-3 py-2 text-xs font-semibold shadow-lg backdrop-blur-md transition-colors ${
                isFiltersOpen || activeFilterCount > 0
                  ? 'border-primary/70 bg-primary/20 text-primary-light'
                  : 'border-white/20 bg-surface/70 text-slate-200 hover:border-white/40'
              }`}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Filtros
              {activeFilterCount > 0 && (
                <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-white">
                  {activeFilterCount}
                </span>
              )}
            </button>

            <AnimatePresence>
              {isFiltersOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.97 }}
                  transition={{ duration: 0.18, ease: 'easeOut' }}
                  className="mt-3 w-[340px] overflow-hidden rounded-2xl border border-white/10 bg-[#111127]/95 shadow-2xl shadow-violet-950/40 backdrop-blur-xl"
                >
                  {/* Header */}
                  <div className="flex items-center justify-between border-b border-white/[0.07] px-4 py-3">
                    <div className="flex items-center gap-2">
                      <SlidersHorizontal className="h-3.5 w-3.5 text-violet-400" />
                      <span className="text-[13px] font-semibold text-white">Filtrar eventos</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsFiltersOpen(false)}
                      className="flex h-6 w-6 items-center justify-center rounded-full bg-white/[0.06] text-slate-400 hover:text-white transition-colors"
                    >
                      <XIcon className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <div className="space-y-4 p-4">
                    {/* Search */}
                    <div>
                      <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                        Buscar
                      </label>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Nombre, lugar, dirección…"
                          className="w-full rounded-xl border border-white/[0.08] bg-white/[0.05] py-2 pl-8 pr-8 text-[13px] text-white placeholder-slate-600 outline-none transition-all focus:border-violet-500/50 focus:bg-white/[0.07]"
                        />
                        {searchQuery && (
                          <button
                            type="button"
                            onClick={() => setSearchQuery('')}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                          >
                            <XIcon className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Eventos CD toggle */}
                    <div>
                      <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                        Fuente
                      </label>
                      <button
                        type="button"
                        onClick={() => setOnlyCommunity((v) => !v)}
                        className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-[12px] font-semibold transition-all w-full ${
                          onlyCommunity
                            ? 'border-violet-500/60 bg-violet-500/20 text-violet-200'
                            : 'border-white/[0.08] bg-white/[0.04] text-slate-400 hover:border-white/20 hover:text-slate-200'
                        }`}
                      >
                        <span className="text-base">🏘️</span>
                        <span>Eventos CD</span>
                        <span className="ml-auto text-[10px] text-slate-500">Solo eventos de la comunidad</span>
                        <span className={`h-4 w-4 rounded-full border-2 transition-all ${onlyCommunity ? 'border-violet-400 bg-violet-400' : 'border-slate-600'}`} />
                      </button>
                    </div>

                    {/* Categories */}
                    <div>
                      <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                        Categoría
                      </label>
                      <div className="flex flex-wrap gap-1.5">
                        {CATEGORY_OPTIONS.map(({ value, emoji, label }) => {
                          const active = selectedCategories.has(value)
                          return (
                            <button
                              key={value}
                              type="button"
                              onClick={() => toggleCategory(value)}
                              className={`flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-all ${
                                active
                                  ? 'border-violet-500/60 bg-violet-500/25 text-violet-200'
                                  : 'border-white/[0.08] bg-white/[0.04] text-slate-400 hover:border-white/20 hover:text-slate-200'
                              }`}
                            >
                              <span>{emoji}</span>
                              {label}
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    {/* Distance */}
                    <div>
                      <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                        Distancia
                      </label>
                      <DistanceFilter
                        selectedKm={selectedDistanceKm}
                        onChange={setDistanceKm}
                        className="flex flex-wrap gap-2"
                      />
                    </div>

                    {/* Place types */}
                    <div>
                      <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                        Tipos de lugar
                      </label>
                      <PlaceTypeFilters
                        selectedTypes={selectedPlaceTypes}
                        onToggleType={togglePlaceType}
                        className="flex flex-wrap gap-2"
                      />
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between border-t border-white/[0.07] px-4 py-3">
                    <button
                      type="button"
                      onClick={restoreDefaultFilters}
                      disabled={activeFilterCount === 0}
                      className="rounded-full border border-white/15 px-3 py-1.5 text-xs font-semibold text-slate-400 transition-colors hover:border-white/30 hover:text-slate-200 disabled:opacity-40"
                    >
                      Limpiar todo
                    </button>
                    <div className="flex items-center gap-2">
                      {filteredEvents.length > 0 && (
                        <span className="text-[11px] text-slate-500">
                          {filteredEvents.length} resultado{filteredEvents.length !== 1 ? 's' : ''}
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => setIsFiltersOpen(false)}
                        className="rounded-full bg-primary/20 border border-primary/50 px-3 py-1.5 text-xs font-semibold text-primary-light transition-colors hover:bg-primary/30"
                      >
                        Ver resultados
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {invalidApiKey ? (
            <div className="flex h-full w-full flex-col items-center justify-center gap-4 px-6 text-center">
              <span className="text-5xl">🔑</span>
              <h2 className="text-xl font-bold text-white">Configura tu API key de Google Maps</h2>
              <p className="text-sm text-muted">
                El feed de eventos cercanos usa lugares reales según tu ubicación.
              </p>
            </div>
          ) : loading || locating ? (
            <FeedSkeleton />
          ) : !userLocation ? (
            /* Ubicación no concedida o denegada */
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex h-full w-full flex-col items-center justify-center gap-5 px-6 text-center"
            >
              <span className="text-6xl">📍</span>
              <div>
                <h2 className="text-xl font-bold text-white mb-1">
                  {locationError ? 'Permiso de ubicación denegado' : 'Activa tu ubicación'}
                </h2>
                <p className="text-sm text-muted max-w-[280px]">
                  {locationError
                    ? 'Para ver eventos cercanos necesitamos acceso a tu GPS. Actívalo desde la configuración de tu navegador.'
                    : 'Necesitamos tu ubicación para mostrarte eventos y lugares interesantes cerca tuyo.'}
                </p>
              </div>
              {!locationError && (
                <button
                  onClick={() => requestUserLocation(true)}
                  className="rounded-full bg-primary px-6 py-3 font-semibold text-white transition-colors active:scale-95 hover:bg-primary-dark"
                >
                  Activar GPS
                </button>
              )}
              {locationError && (
                <button
                  onClick={() => requestUserLocation(true)}
                  className="rounded-full border border-white/20 px-6 py-3 text-sm font-medium text-slate-300 transition-colors hover:border-white/40 hover:text-white"
                >
                  Reintentar
                </button>
              )}
            </motion.div>
          ) : visibleEvents.length > 0 ? (
            <>
              {/* Mobile Map View - solo mostrar en pantallas pequeñas cuando hay like */}
              <AnimatePresence>
                {showMobileMap && (
                  <motion.div
                    key="mobile-map"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                    className="absolute inset-0 z-40 flex flex-col overflow-hidden rounded-[24px] lg:hidden"
                  >
                    {/* Mapa dinámico */}
                    <div className="flex-1 overflow-hidden rounded-t-[24px]">
                      <BellavistaMapMobile focusedPlaceId={focusedPlaceId} />
                    </div>

                    {/* Botón para cerrar el mapa y volver a la card */}
                    <motion.button
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                      onClick={() => setShowMobileMap(false)}
                      className="shrink-0 border-t border-white/10 bg-gradient-to-t from-card to-card/80 px-4 py-4 font-semibold text-primary-light transition-colors hover:text-primary"
                    >
                      ← Volver a eventos
                    </motion.button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Desktop Card View + Mobile Card View (cuando no hay showMobileMap) */}
              {!showMobileMap && (
                <div className="mx-auto flex h-full w-full max-w-[980px] items-start justify-center gap-4 lg:gap-6">
                  <div className="card-stack h-full min-h-[500px] w-full max-w-[380px] lg:min-h-[560px] xl:min-h-[620px]">
                    {[...visibleEvents].reverse().map((event, reverseIndex) => {
                      const stackIndex = visibleEvents.length - 1 - reverseIndex
                      return (
                        <SwipeCard
                          key={event.id}
                          event={event}
                          stackIndex={stackIndex}
                          onSwipeRight={handleSwipeRight}
                          onSwipeLeft={handleSwipeLeft}
                          onSave={handleSave}
                        />
                      )
                    })}
                  </div>

                  <aside className="hidden h-full min-h-[500px] w-[300px] overflow-y-auto rounded-2xl border border-white/[0.08] bg-gradient-to-b from-[#12122a]/80 to-[#0d0d1a]/60 p-3.5 shadow-2xl shadow-violet-950/20 backdrop-blur-md lg:block lg:min-h-[560px] xl:min-h-[620px]">
                    <CommunityEventsPanel events={events} onEventClick={handlePinEvent} />
                  </aside>
                </div>
              )}
            </>
          ) : baseEvents.length === 0 ? (
            /* No hay eventos en esta área */
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex h-full flex-col items-center justify-center gap-5 px-6 text-center"
            >
              <span className="text-6xl">🗺️</span>
              <div>
                <h2 className="text-2xl font-bold text-white mb-1">Sin eventos cerca</h2>
                <p className="text-sm text-muted max-w-[260px]">
                  No encontramos lugares ni eventos en un radio de {selectedDistanceKm} km desde tu ubicación.
                </p>
              </div>
              <div className="mt-1 flex flex-col items-center gap-3">
                <button
                  onClick={() => setDistanceKm(Math.min(selectedDistanceKm + 2, 20))}
                  className="rounded-full bg-primary px-6 py-3 font-semibold text-white transition-colors active:scale-95 hover:bg-primary-dark"
                >
                  Ampliar radio de búsqueda
                </button>
                <button
                  onClick={() => requestUserLocation(true)}
                  className="text-sm font-medium text-primary-light"
                >
                  Actualizar mi ubicación
                </button>
              </div>
            </motion.div>
          ) : (
            /* Ya viste todos los eventos */
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex h-full flex-col items-center justify-center gap-5 px-6 text-center"
            >
              <span className="text-6xl">🎉</span>
              <div>
                <h2 className="text-2xl font-bold text-white mb-1">¡Lo viste todo!</h2>
                <p className="text-sm text-muted max-w-[260px]">
                  Ya recorriste todos los lugares cercanos a tu ubicación actual.
                </p>
              </div>
              <div className="mt-2 flex flex-col items-center gap-3">
                <button
                  onClick={() => {
                    setDismissedIds(new Set())
                    resetExcludedPlaces()
                    refreshPlaces()
                  }}
                  className="rounded-full bg-primary px-6 py-3 font-semibold text-white transition-colors active:scale-95 hover:bg-primary-dark"
                >
                  Ver de nuevo
                </button>
                <button
                  onClick={() => requestUserLocation(true)}
                  className="text-sm font-medium text-primary-light"
                >
                  Actualizar mi ubicación
                </button>
              </div>
            </motion.div>
          )}
        </div>

        {visibleEvents.length > 0 && (
          <div className="flex items-center justify-center gap-3 px-4 pb-2 lg:px-5 lg:pb-3">
            <span className="text-xs text-muted">
              {filteredEvents.length !== events.length
                ? `${filteredEvents.length} de ${events.length} eventos`
                : `${events.length} lugares cerca de ti`}
            </span>
            {likedIds.size > 0 && (
              <span className="text-xs font-medium text-green-400">· {likedIds.size} te interesaron</span>
            )}
          </div>
        )}
      </div>
    </Layout>
  )
}

export default function HomePage() {
  return (
    <NearbyPlacesProvider>
      <HomePageContent />
    </NearbyPlacesProvider>
  )
}
