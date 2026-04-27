'use client'

import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import dynamic from 'next/dynamic'
import SwipeCard from '../src/components/SwipeCard'
import RecommendationsCard from '../src/components/RecommendationsCard'
import Layout from '../src/components/Layout'
import DistanceFilter from '../src/components/DistanceFilter'
import PlaceTypeFilters from '../src/components/PlaceTypeFilters'
import { placeToEvent } from '../src/data/placeFeedAdapter'
import { NearbyPlacesProvider, useNearbyPlacesContext } from '../src/context/NearbyPlacesContext'
import { useChatContext } from '../src/context/ChatContext'
import { useAuth } from '../src/context/AuthContext'
import { useLocatarioEvents } from '../src/context/LocatarioEventsContext'
import { getSupabaseBrowserClient, hasSupabaseEnv } from '../src/lib/supabase'
import { useFeedEvents } from '../src/hooks/useFeedEvents'
import { haversineKm } from '../src/utils/geo'
import type { PlaceType } from '../src/types'

const BellavistaMapMobile = dynamic(() => import('../src/components/BellavistaMap'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center bg-card text-sm text-muted">
      Cargando mapa...
    </div>
  ),
})

const DEFAULT_FEED_TYPES: PlaceType[] = ['restaurant', 'bar', 'night_club', 'cafe']
const SAVED_URL = (process.env.NEXT_PUBLIC_SAVED_URL ?? '').trim().replace(/\/$/, '')

async function getAccessToken() {
  if (!hasSupabaseEnv) return null

  const supabase = getSupabaseBrowserClient()
  const { data } = await supabase.auth.getSession()

  if (data.session?.access_token) {
    return data.session.access_token
  }

  const { data: refreshed, error } = await supabase.auth.refreshSession()
  if (error) return null

  return refreshed.session?.access_token ?? null
}

async function callSavedApi(path: string, init?: RequestInit) {
  if (!SAVED_URL) {
    throw new Error('Falta NEXT_PUBLIC_SAVED_URL en .env.local')
  }

  const headers = new Headers({
    'Content-Type': 'application/json',
    ...(init?.headers ?? {}),
  })

  if (hasSupabaseEnv) {
    const token = await getAccessToken()
    if (!token) {
      throw new Error('Tu sesión expiró o no tiene token. Vuelve a iniciar sesión.')
    }
    headers.set('Authorization', `Bearer ${token}`)
  }

  const response = await fetch(`${SAVED_URL}${path}`, {
    credentials: 'include',
    ...init,
    headers,
  })

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null
    throw new Error(body?.error ?? 'Error al comunicarse con el servicio de guardados.')
  }
}


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
        <h2 className="mb-1 text-center text-xl font-bold text-white">Bienvenido a eMeet</h2>
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
  const { locatarioEvents } = useLocatarioEvents()
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set())
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set())
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set())
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const processingIds = useRef<Set<string>>(new Set())
  const [isFiltersOpen, setIsFiltersOpen] = useState(false)
  const [showRecommendations, setShowRecommendations] = useState(true)
  const [showOnboarding, setShowOnboarding] = useState(false)

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
  const externalEvents = useFeedEvents(userLocation, selectedDistanceKm)

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
    const placeEvents = userLocation
      ? places
          .filter((place) => selectedPlaceTypes.includes(place.type))
          .map((place) => {
            const distance = haversineKm(place.position.lat, place.position.lng, userLocation.lat, userLocation.lng)
            return placeToEvent(place, distance)
          })
      : []

    return placeEvents
      .concat(
        locatarioEvents.map((e) => {
          if (e.lat != null && e.lng != null && userLocation) {
            return { ...e, distance: haversineKm(e.lat, e.lng, userLocation.lat, userLocation.lng) }
          }
          return e
        }),
      )
      .concat(externalEvents)
      .filter((event) => event.distance <= selectedDistanceKm)
      .sort((a, b) => a.distance - b.distance)
  }, [externalEvents, locatarioEvents, places, selectedDistanceKm, selectedPlaceTypes, userLocation])

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
            }),
          })
        } catch {
          showToast('No se pudo registrar tu like.', 'nope')
          return
        }
      }

      setLikedIds((prev) => new Set(prev).add(id))
      setDismissedIds((prev) => new Set(prev).add(id))
      excludePlace(id)

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

  const visibleEvents = useMemo(() => events.slice(0, 3), [events])

  const activeFilterCount =
    (selectedDistanceKm !== 3 ? 1 : 0) +
    (selectedPlaceTypes.length !== DEFAULT_FEED_TYPES.length ? 1 : 0)

  function restoreDefaultFilters() {
    setDistanceKm(3)

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
          <div className="absolute left-4 top-2 z-30 lg:left-5">
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
              className={`rounded-full border px-3 py-2 text-xs font-semibold shadow-lg backdrop-blur-md transition-colors ${
                isFiltersOpen || activeFilterCount > 0
                  ? 'border-primary/70 bg-primary/20 text-primary-light'
                  : 'border-white/20 bg-surface/70 text-slate-200 hover:border-white/40'
              }`}
            >
              Filtros {activeFilterCount > 0 ? `(${activeFilterCount})` : ''}
            </button>

            <AnimatePresence>
              {isFiltersOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.98 }}
                  transition={{ duration: 0.16 }}
                  className="mt-3 w-[320px] rounded-2xl border border-white/10 bg-card/95 p-3 shadow-2xl backdrop-blur-lg"
                >
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-300">Opciones de filtro</p>

                  <div className="space-y-3">
                    <div>
                      <p className="mb-1 text-[11px] font-semibold text-muted">Distancia</p>
                      <DistanceFilter
                        selectedKm={selectedDistanceKm}
                        onChange={setDistanceKm}
                        className="flex flex-wrap gap-2"
                      />
                    </div>

                    <div>
                      <p className="mb-1 text-[11px] font-semibold text-muted">Tipos de lugar</p>
                      <PlaceTypeFilters
                        selectedTypes={selectedPlaceTypes}
                        onToggleType={togglePlaceType}
                        className="flex flex-wrap gap-2"
                      />
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={restoreDefaultFilters}
                      className="rounded-full border border-white/20 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:border-white/40"
                    >
                      Limpiar filtros
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsFiltersOpen(false)}
                      className="rounded-full border border-primary/60 bg-primary/15 px-3 py-1.5 text-xs font-semibold text-primary-light"
                    >
                      Aplicar
                    </button>
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
                          onRefresh={refreshPlaces}
                        />
                      )
                    })}
                  </div>

                  {showRecommendations && (
                    <aside className="hidden h-full min-h-[500px] w-[300px] overflow-y-auto rounded-2xl border border-white/10 bg-card/50 p-3 shadow-xl backdrop-blur-md lg:block lg:min-h-[560px] xl:min-h-[620px]">
                      <RecommendationsCard
                        events={events}
                        onClose={() => setShowRecommendations(false)}
                        userInterests={user?.interests ?? []}
                      />
                    </aside>
                  )}
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
            <span className="text-xs text-muted">{events.length} lugares cerca de ti</span>
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
