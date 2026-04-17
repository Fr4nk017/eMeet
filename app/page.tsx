'use client'

import { useState, useCallback, useMemo, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { motion, AnimatePresence } from 'framer-motion'
import SwipeCard from '../src/components/SwipeCard'
import Layout from '../src/components/Layout'

const BellavistaMapMobile = dynamic(() => import('../src/components/BellavistaMap'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center text-sm text-muted">
      Cargando mapa...
    </div>
  ),
})
import DistanceFilter from '../src/components/DistanceFilter'
import PlaceTypeFilters from '../src/components/PlaceTypeFilters'
import { placeToEvent } from '../src/data/placeFeedAdapter'
import { NearbyPlacesProvider, useNearbyPlacesContext } from '../src/context/NearbyPlacesContext'
import { useChatContext } from '../src/context/ChatContext'
import { useAuth } from '../src/context/AuthContext'
import { useLocatarioEvents } from '../src/context/LocatarioEventsContext'
import { hasSupabaseEnv } from '../src/lib/supabase'
import { fetchApi } from '../src/lib/fetchApi'
import type { PlaceType } from '../src/types'

const DEFAULT_FEED_TYPES: PlaceType[] = ['restaurant', 'bar', 'night_club', 'cafe']

function toRad(value: number) {
  return (value * Math.PI) / 180
}

function getDistanceKm(
  lat: number,
  lng: number,
  refLat: number,
  refLng: number,
): number {
  const earthRadiusKm = 6371
  const dLat = toRad(lat - refLat)
  const dLng = toRad(lng - refLng)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(refLat)) * Math.cos(toRad(lat)) * Math.sin(dLng / 2) ** 2
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
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

function HomePageContent() {
  const {
    places,
    excludePlace,
    userLocation,
    loading,
    locating,
    invalidApiKey,
    selectedPlaceTypes,
    selectedDistanceKm,
    requestUserLocation,
    resetExcludedPlaces,
    setDistanceKm,
    togglePlaceType,
    refreshPlaces,
    setSelectedDestination,
  } = useNearbyPlacesContext()
  const { joinRoom } = useChatContext()
  const { user, updateUser } = useAuth()
  const { locatarioEvents } = useLocatarioEvents()
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set())
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set())
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set())
  const [isFiltersOpen, setIsFiltersOpen] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'like' | 'nope' | 'save' } | null>(null)
  const [mobileView, setMobileView] = useState<'cards' | 'map'>('cards')
  const [carretee, setCarretee] = useState<{
    title: string
    address: string
    mapUrl: string
  } | null>(null)

  useEffect(() => {
    if (!user) {
      setLikedIds(new Set())
      setSavedIds(new Set())
      return
    }

    setLikedIds(new Set(user.likedEvents))
    setSavedIds(new Set(user.savedEvents))
  }, [user])

  const events = useMemo(() => {
    const placeEvents = userLocation
      ? places
          .filter((place) => selectedPlaceTypes.includes(place.type))
          .map((place) => {
            const distance = getDistanceKm(place.position.lat, place.position.lng, userLocation.lat, userLocation.lng)
            return placeToEvent(place, distance)
          })
      : []

    return placeEvents
      .concat(
        locatarioEvents.map((e) => {
          if (e.lat != null && e.lng != null && userLocation) {
            return { ...e, distance: getDistanceKm(e.lat, e.lng, userLocation.lat, userLocation.lng) }
          }
          return e
        }),
      )
      .filter((event) => event.distance <= selectedDistanceKm)
      .sort((a, b) => a.distance - b.distance)
      .filter((event) => !dismissedIds.has(event.id))
      .map((event) => ({
        ...event,
        isLiked: likedIds.has(event.id),
        isSaved: savedIds.has(event.id),
      }))
  }, [dismissedIds, likedIds, locatarioEvents, places, savedIds, selectedDistanceKm, selectedPlaceTypes, userLocation])

  function showToast(message: string, type: 'like' | 'nope' | 'save') {
    setToast({ message, type })
    setTimeout(() => setToast(null), 1800)
  }

  function showCarretee(event: { id: string; title: string; address: string }) {
    setCarretee({
      title: event.title,
      address: event.address,
      mapUrl: `https://www.google.com/maps/place/?q=place_id:${event.id}`,
    })
    setTimeout(() => setCarretee(null), 2600)
  }

  const handleSwipeRight = useCallback(async (id: string) => {
    const likedEvent = events.find((event) => event.id === id)

    if (!user || !likedEvent) {
      showToast('Inicia sesión para guardar tus likes.', 'nope')
      return
    }

    // Actualizar estado local inmediatamente — la tarjeta ya salió de pantalla
    setLikedIds((prev) => new Set(prev).add(id))
    setDismissedIds((prev) => new Set(prev).add(id))
    excludePlace(id)
    showToast('¡Te interesa! 💚', 'like')

    showCarretee({ id: likedEvent.id, title: likedEvent.title, address: likedEvent.address })

    const likedPlace = places.find((p) => p.placeId === likedEvent.id)
    if (likedPlace) {
      setSelectedDestination({
        placeId: likedEvent.id,
        title: likedEvent.title,
        position: likedPlace.position,
      })
    }

    if (likedEvent.websiteUrl) {
      window.open(likedEvent.websiteUrl, '_blank', 'noopener,noreferrer')
    }

    // Persistir en backend — si falla no revertimos (la tarjeta ya salió)
    if (hasSupabaseEnv) {
      try {
        await fetchApi('/api/events/like', {
          method: 'POST',
          body: JSON.stringify({
            eventId: likedEvent.id,
            eventTitle: likedEvent.title,
            eventImageUrl: likedEvent.imageUrl,
            eventAddress: likedEvent.address,
          }),
        })
      } catch (error) {
        const message = error instanceof Error ? error.message : ''
        if (message.toLowerCase().includes('sesión') || message.toLowerCase().includes('token')) {
          showToast('Tu sesión expiró. Inicia sesión nuevamente.', 'nope')
        }
        return
      }
    }

    try {
      await updateUser({ likedEvents: Array.from(new Set([...(user.likedEvents ?? []), likedEvent.id])) })
    } catch {
      // Fallo silencioso de sync de perfil — el like ya fue persistido en Supabase.
    }

    try {
      await joinRoom(likedEvent.id, likedEvent.title, likedEvent.imageUrl, likedEvent.address)
    } catch {
      // No bloquear el flujo si falla la sincronización del chat.
    }
  }, [events, excludePlace, joinRoom, places, setSelectedDestination, updateUser, user])

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

    // Actualizar estado optimisticamente antes del fetch
    const nextSaved = new Set(savedIds)
    if (nextSaved.has(id)) nextSaved.delete(id)
    else nextSaved.add(id)
    setSavedIds(nextSaved)

    if (hasSupabaseEnv) {
      try {
        if (isCurrentlySaved) {
          await fetchApi(`/api/events/save/${id}`, { method: 'DELETE' })
        } else {
          await fetchApi('/api/events/save', {
            method: 'POST',
            body: JSON.stringify({
              eventId: eventToSave.id,
              eventTitle: eventToSave.title,
              eventImageUrl: eventToSave.imageUrl,
              eventAddress: eventToSave.address,
            }),
          })
        }
      } catch (error) {
        // Revertir el estado optimista si falla la API
        setSavedIds(savedIds)
        const message = error instanceof Error ? error.message : ''
        if (message.toLowerCase().includes('sesión') || message.toLowerCase().includes('token')) {
          showToast('Tu sesión expiró. Inicia sesión nuevamente.', 'nope')
        } else {
          showToast(isCurrentlySaved ? 'No se pudo quitar de guardados.' : 'No se pudo guardar el evento.', 'nope')
        }
        return
      }
    }

    try {
      await updateUser({ savedEvents: Array.from(nextSaved) })
    } catch {
      // Fallo silencioso de sync de perfil — el guardado ya fue persistido en Supabase.
    }

    showToast(!isCurrentlySaved ? 'Evento guardado 🔖' : 'Quitado de guardados', 'save')
  }, [events, savedIds, updateUser, user])

  const visibleEvents = events.slice(0, 3)

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
    <Layout showDesktopMap>
      <div className="relative flex h-full min-h-0 flex-col overflow-hidden">
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

        <AnimatePresence>
          {carretee && (
            <motion.div
              key="carretee"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 px-5 backdrop-blur-[2px]"
            >
              <motion.div
                initial={{ scale: 0.75, y: 18, opacity: 0 }}
                animate={{ scale: 1, y: 0, opacity: 1 }}
                exit={{ scale: 0.92, y: 8, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 260, damping: 18 }}
                className="relative w-full max-w-sm overflow-hidden rounded-3xl border border-primary/30 bg-[linear-gradient(150deg,_rgba(14,18,42,0.96),_rgba(40,16,78,0.92))] p-5 shadow-[0_24px_80px_rgba(14,0,40,0.55)]"
              >
                <motion.span
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: [0.9, 1.08, 1], opacity: 1 }}
                  transition={{ duration: 0.45 }}
                  className="pointer-events-none absolute -right-5 -top-5 h-20 w-20 rounded-full bg-fuchsia-500/30 blur-xl"
                />

                <motion.p
                  initial={{ y: 8, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.05 }}
                  className="text-center text-3xl font-black tracking-tight text-white"
                >
                  Carretee!!!
                </motion.p>

                <p className="mt-2 text-center text-sm font-semibold text-primary-light">{carretee.title}</p>
                <p className="mt-1 text-center text-xs text-slate-300">{carretee.address}</p>

                <a
                  href={carretee.mapUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-flex w-full items-center justify-center rounded-full bg-primary px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-primary-dark"
                >
                  Ver dirección
                </a>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="relative flex min-h-0 flex-1 px-4 pb-4 pt-3 lg:px-5 lg:pb-5 lg:pt-2">
          {/* Toggle Tarjetas / Mapa — solo visible en móvil */}
          <div className="absolute left-1/2 top-2 z-30 -translate-x-1/2 lg:hidden">
            <div className="flex rounded-full bg-white/10 p-1 backdrop-blur-md border border-white/15 shadow-lg">
              <button
                type="button"
                onClick={() => setMobileView('cards')}
                className={`rounded-full px-5 py-1.5 text-xs font-semibold transition-all ${
                  mobileView === 'cards'
                    ? 'bg-primary text-white shadow-md'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                Tarjetas
              </button>
              <button
                type="button"
                onClick={() => setMobileView('map')}
                className={`rounded-full px-5 py-1.5 text-xs font-semibold transition-all ${
                  mobileView === 'map'
                    ? 'bg-primary text-white shadow-md'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                Mapa
              </button>
            </div>
          </div>

          {/* Vista mapa en móvil */}
          {mobileView === 'map' && (
            <div className="absolute inset-0 lg:hidden">
              <BellavistaMapMobile />
            </div>
          )}
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

          <div className={mobileView === 'map' ? 'hidden lg:contents' : 'contents'}>
          {invalidApiKey ? (
            <div className="flex h-full w-full flex-col items-center justify-center gap-4 px-6 text-center">
              <span className="text-5xl">🔑</span>
              <h2 className="text-xl font-bold text-white">Configura tu API key de Google Maps</h2>
              <p className="text-sm text-muted">
                El feed de eventos cercanos usa lugares reales según tu ubicación.
              </p>
            </div>
          ) : loading || locating || !userLocation ? (
            <FeedSkeleton />
          ) : visibleEvents.length > 0 ? (
            <div className="card-stack mx-auto h-full min-h-[500px] w-full max-w-[380px] lg:min-h-[560px] xl:min-h-[620px]">
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
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex h-full flex-col items-center justify-center gap-5 px-6 text-center"
            >
              <span className="text-6xl">🎉</span>
              <h2 className="text-2xl font-bold text-white">No quedan más lugares cercanos</h2>
              <p className="text-sm text-muted">
                Ya recorriste los resultados cercanos a tu ubicación actual.
              </p>
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
