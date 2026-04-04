'use client'

import { useState, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import SwipeCard from '../src/components/SwipeCard'
import Layout from '../src/components/Layout'
import { placeToEvent } from '../src/data/placeFeedAdapter'
import { useNearbyPlacesContext } from '../src/context/NearbyPlacesContext'
import { useChatContext } from '../src/context/ChatContext'

export default function HomePage() {
  const {
    places,
    userLocation,
    loading,
    locating,
    invalidApiKey,
    selectedPlaceTypes,
    selectedDistanceKm,
    requestUserLocation,
    refreshPlaces,
  } = useNearbyPlacesContext()
  const { joinRoom } = useChatContext()
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set())
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set())
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set())
  const [toast, setToast] = useState<{ message: string; type: 'like' | 'nope' | 'save' } | null>(null)
  const [carretee, setCarretee] = useState<{
    title: string
    address: string
    mapUrl: string
  } | null>(null)

  const events = useMemo(() => {
    if (!userLocation) return []

    const toRad = (value: number) => (value * Math.PI) / 180
    const getDistanceKm = (lat: number, lng: number) => {
      const earthRadiusKm = 6371
      const dLat = toRad(lat - userLocation.lat)
      const dLng = toRad(lng - userLocation.lng)
      const lat1 = toRad(userLocation.lat)
      const lat2 = toRad(lat)
      const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
      return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    }

    return places
      .filter((place) => selectedPlaceTypes.includes(place.type))
      .map((place) => {
        const distance = getDistanceKm(place.position.lat, place.position.lng)
        return placeToEvent(place, distance)
      })
      .filter((event) => event.distance <= selectedDistanceKm)
      .sort((a, b) => a.distance - b.distance)
      .filter((event) => !dismissedIds.has(event.id))
      .map((event) => ({
        ...event,
        isLiked: likedIds.has(event.id),
        isSaved: savedIds.has(event.id),
      }))
  }, [dismissedIds, likedIds, places, savedIds, selectedDistanceKm, selectedPlaceTypes, userLocation])

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

  const handleSwipeRight = useCallback((id: string) => {
    const likedEvent = events.find((event) => event.id === id)

    setLikedIds((prev) => new Set(prev).add(id))
    setDismissedIds((prev) => new Set(prev).add(id))
    showToast('¡Te interesa! 💚', 'like')

    if (likedEvent) {
      showCarretee({
        id: likedEvent.id,
        title: likedEvent.title,
        address: likedEvent.address,
      })

      joinRoom(likedEvent.id, likedEvent.title, likedEvent.imageUrl, likedEvent.address)

      if (likedEvent.websiteUrl) {
        window.open(likedEvent.websiteUrl, '_blank', 'noopener,noreferrer')
      }
    }
  }, [events, joinRoom])

  const handleSwipeLeft = useCallback((id: string) => {
    setDismissedIds((prev) => new Set(prev).add(id))
    showToast('No es para ti', 'nope')
  }, [])

  const handleSave = useCallback((id: string) => {
    setSavedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
    showToast('Evento guardado 🔖', 'save')
  }, [])

  const visibleEvents = events.slice(0, 3)

  return (
    <Layout>
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

        <div className="relative flex min-h-0 flex-1 px-4 pb-4 pt-3 lg:px-5 lg:pb-5 lg:pt-4">
          {invalidApiKey ? (
            <div className="flex h-full w-full flex-col items-center justify-center gap-4 px-6 text-center">
              <span className="text-5xl">🔑</span>
              <h2 className="text-xl font-bold text-white">Configura tu API key de Google Maps</h2>
              <p className="text-sm text-muted">
                El feed de eventos cercanos usa lugares reales según tu ubicación.
              </p>
            </div>
          ) : loading || locating || !userLocation ? (
            <div className="flex h-full w-full flex-col items-center justify-center gap-4 px-6 text-center">
              <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <h2 className="text-xl font-bold text-white">Buscando lugares cerca de ti</h2>
              <p className="text-sm text-muted">
                Estamos obteniendo tu ubicación y cargando restaurantes, bares y discotecas cercanas.
              </p>
            </div>
          ) : visibleEvents.length > 0 ? (
            <div className="card-stack mx-auto h-full w-full max-w-[420px]">
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
