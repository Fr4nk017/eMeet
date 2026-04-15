'use client'

import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import Layout from '../../src/components/Layout'
import SwipeCard from '../../src/components/SwipeCard'
import { NearbyPlacesProvider, useNearbyPlacesContext } from '../../src/context/NearbyPlacesContext'
import { useLocatarioEvents } from '../../src/context/LocatarioEventsContext'
import { placeToEvent } from '../../src/data/placeFeedAdapter'
import { CATEGORY_EMOJI } from '../../src/data/mockEvents'
import type { Event, EventCategory } from '../../src/types'
import { HiXMark, HiMagnifyingGlass } from 'react-icons/hi2'

function toRad(value: number) {
  return (value * Math.PI) / 180
}

function getDistanceKm(lat: number, lng: number, refLat: number, refLng: number): number {
  const R = 6371
  const dLat = toRad(lat - refLat)
  const dLng = toRad(lng - refLng)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(refLat)) * Math.cos(toRad(lat)) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

const CATEGORIES: { key: EventCategory; label: string }[] = [
  { key: 'gastronomia', label: 'Gastronomía' },
  { key: 'musica', label: 'Música' },
  { key: 'cultura', label: 'Cultura' },
  { key: 'networking', label: 'Networking' },
  { key: 'deporte', label: 'Deporte' },
  { key: 'fiesta', label: 'Fiesta' },
  { key: 'teatro', label: 'Teatro' },
  { key: 'arte', label: 'Arte' },
]

function formatPrice(price: number | null) {
  if (price === null) return 'Gratis'
  return `$${price.toLocaleString('es-CL')}`
}

function SearchPageContent() {
  const { places, userLocation, loading, locating } = useNearbyPlacesContext()
  const { locatarioEvents } = useLocatarioEvents()

  const [query, setQuery] = useState('')
  const [isFiltersOpen, setIsFiltersOpen] = useState(false)
  const [activeCategory, setActiveCategory] = useState<EventCategory | null>(null)
  const [maxDistanceKm, setMaxDistanceKm] = useState<number | null>(5)
  const [onlyFree, setOnlyFree] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)

  const allEvents = useMemo<Event[]>(() => {
    if (!userLocation) return []

    const placeEvents = places.map((place) => {
      const distance = getDistanceKm(
        place.position.lat,
        place.position.lng,
        userLocation.lat,
        userLocation.lng,
      )
      return placeToEvent(place, distance)
    })

    const locEvents = locatarioEvents.map((e) => {
      if (e.lat != null && e.lng != null) {
        return { ...e, distance: getDistanceKm(e.lat, e.lng, userLocation.lat, userLocation.lng) }
      }
      return e
    })

    return [...placeEvents, ...locEvents].sort((a, b) => a.distance - b.distance)
  }, [places, locatarioEvents, userLocation])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return allEvents.filter((e) => {
      const matchesQuery =
        !q || e.title.toLowerCase().includes(q) || e.address.toLowerCase().includes(q)
      const matchesCategory = activeCategory === null || e.category === activeCategory
      const matchesDistance = maxDistanceKm === null || e.distance <= maxDistanceKm
      const matchesFree = !onlyFree || e.price === null
      return matchesQuery && matchesCategory && matchesDistance && matchesFree
    })
  }, [allEvents, query, activeCategory, maxDistanceKm, onlyFree])

  const activeFilterCount =
    (activeCategory ? 1 : 0) + (maxDistanceKm !== null ? 1 : 0) + (onlyFree ? 1 : 0)

  function resetFilters() {
    setActiveCategory(null)
    setMaxDistanceKm(5)
    setOnlyFree(false)
  }

  const isLoading = loading || locating

  return (
    <Layout headerTitle="Explorar">
      <div className="px-4 pb-4 pt-4 lg:px-5 lg:pt-5">

        {/* Barra de búsqueda + filtros */}
        <div className="sticky top-0 z-20 -mx-4 mb-4 border-b border-white/10 bg-surface/90 px-4 py-3 backdrop-blur-md lg:-mx-5 lg:px-5">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <HiMagnifyingGlass className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar por nombre o dirección..."
                className="w-full rounded-full border border-white/10 bg-card py-2 pl-9 pr-4 text-sm text-white placeholder-muted outline-none focus:border-primary/50"
              />
            </div>
            <button
              type="button"
              onClick={() => setIsFiltersOpen((v) => !v)}
              className={`rounded-full border px-3 py-2 text-xs font-semibold transition-colors ${
                isFiltersOpen || activeFilterCount > 0
                  ? 'border-primary/70 bg-primary/20 text-primary-light'
                  : 'border-white/20 text-slate-200 hover:border-white/40'
              }`}
            >
              Filtros {activeFilterCount > 0 ? `(${activeFilterCount})` : ''}
            </button>
          </div>

          <AnimatePresence>
            {isFiltersOpen && (
              <motion.div
                initial={{ opacity: 0, y: -8, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.98 }}
                transition={{ duration: 0.16 }}
                className="mt-3 rounded-2xl border border-white/10 bg-card/95 p-3 shadow-2xl backdrop-blur-lg"
              >
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-300">
                    Opciones de filtro
                  </p>
                  <button
                    type="button"
                    onClick={() => setIsFiltersOpen(false)}
                    className="rounded-full p-1 text-muted hover:bg-white/10 hover:text-white"
                    aria-label="Cerrar filtros"
                  >
                    <HiXMark className="h-4 w-4" />
                  </button>
                </div>

                <div className="space-y-3">
                  <div>
                    <p className="mb-1 text-[11px] font-semibold text-muted">Tipo de evento</p>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => setActiveCategory(null)}
                        className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                          activeCategory === null
                            ? 'border-primary bg-primary text-white'
                            : 'border-white/20 text-muted hover:border-white/40'
                        }`}
                      >
                        Todos
                      </button>
                      {CATEGORIES.map((cat) => (
                        <button
                          key={cat.key}
                          onClick={() =>
                            setActiveCategory(activeCategory === cat.key ? null : cat.key)
                          }
                          className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                            activeCategory === cat.key
                              ? 'border-primary bg-primary text-white'
                              : 'border-white/20 text-muted hover:border-white/40'
                          }`}
                        >
                          {CATEGORY_EMOJI[cat.key]} {cat.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="mb-1 text-[11px] font-semibold text-muted">Distancia</p>
                    <div className="flex flex-wrap gap-2">
                      {[1, 3, 5, 10].map((km) => (
                        <button
                          key={km}
                          type="button"
                          onClick={() => setMaxDistanceKm(km)}
                          className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                            maxDistanceKm === km
                              ? 'border-primary bg-primary text-white'
                              : 'border-white/20 text-muted hover:border-white/40'
                          }`}
                        >
                          {km} km
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => setMaxDistanceKm(null)}
                        className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                          maxDistanceKm === null
                            ? 'border-primary bg-primary text-white'
                            : 'border-white/20 text-muted hover:border-white/40'
                        }`}
                      >
                        Cualquiera
                      </button>
                    </div>
                  </div>

                  <div>
                    <p className="mb-1 text-[11px] font-semibold text-muted">Precio</p>
                    <button
                      type="button"
                      onClick={() => setOnlyFree((v) => !v)}
                      className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                        onlyFree
                          ? 'border-green-400/70 bg-green-500/20 text-green-200'
                          : 'border-white/20 text-muted hover:border-white/40'
                      }`}
                    >
                      Solo gratis
                    </button>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={resetFilters}
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

        {/* Contenido */}
        {isLoading ? (
          <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(240px,1fr))]">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="overflow-hidden rounded-2xl bg-card">
                <div className="shimmer aspect-[16/10] w-full" />
                <div className="p-3.5 space-y-2">
                  <div className="shimmer h-3 w-1/3 rounded-md" />
                  <div className="shimmer h-4 w-3/4 rounded-md" />
                  <div className="shimmer h-3 w-1/2 rounded-md" />
                </div>
              </div>
            ))}
          </div>
        ) : !userLocation ? (
          <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
            <span className="text-5xl">📍</span>
            <h2 className="text-lg font-bold text-white">Ubicación requerida</h2>
            <p className="max-w-xs text-sm text-muted">
              Activa la ubicación en el feed principal para ver lugares y eventos cercanos.
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
            <span className="text-4xl">🔎</span>
            <p className="text-sm text-muted">No hay resultados que coincidan con tu búsqueda.</p>
          </div>
        ) : (
          <>
            <p className="mb-3 text-xs text-muted">{filtered.length} lugares encontrados</p>
            <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(240px,1fr))]">
              {filtered.map((event) => (
                <motion.button
                  key={event.id}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setSelectedEvent(event)}
                  className="overflow-hidden rounded-2xl border border-white/10 bg-card text-left transition-colors hover:border-primary/50"
                >
                  <img
                    src={event.imageUrl}
                    alt={event.title}
                    className="aspect-[16/10] w-full object-cover"
                  />
                  <div className="p-3.5">
                    <span className="text-xs font-semibold text-primary-light">
                      {CATEGORY_EMOJI[event.category]} {event.category}
                    </span>
                    <h3 className="mt-1 line-clamp-2 text-base font-semibold leading-tight text-white">
                      {event.title}
                    </h3>
                    <p className="mt-1 text-xs text-muted">{event.address}</p>
                    <div className="mt-2 flex items-center justify-between text-xs">
                      <span className="text-slate-300">{event.distance.toFixed(1)} km</span>
                      <span className="font-semibold text-primary-light">
                        {formatPrice(event.price)}
                      </span>
                    </div>
                  </div>
                </motion.button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Modal SwipeCard al hacer click */}
      {selectedEvent && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end bg-black/80 backdrop-blur-sm lg:items-center lg:justify-center lg:p-8"
          onClick={() => setSelectedEvent(null)}
        >
          <motion.div
            initial={{ y: '100%', opacity: 0.8 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="relative h-[80vh] w-full px-4 pb-4 lg:h-[85vh] lg:max-h-[900px] lg:max-w-[430px] lg:px-0 lg:pb-0"
            onClick={(e) => e.stopPropagation()}
          >
            <SwipeCard
              event={selectedEvent}
              stackIndex={0}
              onSwipeRight={() => setSelectedEvent(null)}
              onSwipeLeft={() => setSelectedEvent(null)}
              onSave={() => setSelectedEvent(null)}
            />
          </motion.div>
        </motion.div>
      )}
    </Layout>
  )
}

export default function SearchRoutePage() {
  return (
    <NearbyPlacesProvider>
      <SearchPageContent />
    </NearbyPlacesProvider>
  )
}
