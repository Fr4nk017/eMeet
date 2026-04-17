'use client'

import { useDeferredValue, useEffect, useMemo, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
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

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

const VALID_CATEGORIES = new Set<EventCategory>(CATEGORIES.map((c) => c.key))
type SortMode = 'relevance' | 'distance' | 'rating'

const SORT_OPTIONS: Array<{ key: SortMode; label: string }> = [
  { key: 'relevance', label: 'Relevancia' },
  { key: 'distance', label: 'Distancia' },
  { key: 'rating', label: 'Rating' },
]

function isEventCategory(value: string): value is EventCategory {
  return VALID_CATEGORIES.has(value as EventCategory)
}

function isSortMode(value: string): value is SortMode {
  return value === 'relevance' || value === 'distance' || value === 'rating'
}

function SearchPageContent() {
  const { places, userLocation, loading, locating } = useNearbyPlacesContext()
  const { locatarioEvents } = useLocatarioEvents()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const initialQuery = searchParams.get('q') ?? ''
  const initialCategory = searchParams.get('cat')
  const initialDistance = searchParams.get('dist')
  const initialOnlyFree = searchParams.get('free') === '1'
  const initialSort = searchParams.get('sort')

  const parsedInitialDistance =
    initialDistance === null
      ? 5
      : initialDistance === 'any'
      ? null
      : Number.isFinite(Number(initialDistance))
      ? Number(initialDistance)
      : 5

  const [query, setQuery] = useState(initialQuery)
  const [isFiltersOpen, setIsFiltersOpen] = useState(false)
  const [activeCategory, setActiveCategory] = useState<EventCategory | null>(
    initialCategory && isEventCategory(initialCategory) ? initialCategory : null,
  )
  const [maxDistanceKm, setMaxDistanceKm] = useState<number | null>(parsedInitialDistance)
  const [onlyFree, setOnlyFree] = useState(initialOnlyFree)
  const [sortMode, setSortMode] = useState<SortMode>(
    initialSort && isSortMode(initialSort) ? initialSort : 'relevance',
  )
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
  const deferredQuery = useDeferredValue(query)

  useEffect(() => {
    const params = new URLSearchParams()

    if (query.trim()) params.set('q', query.trim())
    if (activeCategory) params.set('cat', activeCategory)
    if (maxDistanceKm !== null && maxDistanceKm !== 5) params.set('dist', String(maxDistanceKm))
    if (maxDistanceKm === null) params.set('dist', 'any')
    if (onlyFree) params.set('free', '1')
    if (sortMode !== 'relevance') params.set('sort', sortMode)

    const nextQuery = params.toString()
    const currentQuery = searchParams.toString()
    if (nextQuery === currentQuery) return

    const nextUrl = nextQuery ? `${pathname}?${nextQuery}` : pathname
    router.replace(nextUrl, { scroll: false })
  }, [activeCategory, maxDistanceKm, onlyFree, pathname, query, router, searchParams, sortMode])

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
    const q = normalizeText(deferredQuery)
    const categoryLabelMap = new Map(CATEGORIES.map((c) => [c.key, normalizeText(c.label)]))

    return allEvents
      .map((e) => {
        const normalizedTitle = normalizeText(e.title)
        const normalizedAddress = normalizeText(e.address)
        const normalizedCategory = categoryLabelMap.get(e.category) ?? ''
        const normalizedTags = e.tags.map(normalizeText).join(' ')

        const matchesQuery =
          !q ||
          normalizedTitle.includes(q) ||
          normalizedAddress.includes(q) ||
          normalizedCategory.includes(q) ||
          normalizedTags.includes(q)

        if (!matchesQuery) return null

        let score = 0
        if (q) {
          if (normalizedTitle.includes(q)) score += 120
          if (normalizedAddress.includes(q)) score += 70
          if (normalizedCategory.includes(q)) score += 45
          if (normalizedTags.includes(q)) score += 25
        }

        score += (e.rating ?? 0) * 12
        score -= e.distance * 2.5

        return { event: e, score }
      })
      .filter((entry): entry is { event: Event; score: number } => entry !== null)
      .filter(({ event: e }) => {
      const matchesCategory = activeCategory === null || e.category === activeCategory
      const matchesDistance = maxDistanceKm === null || e.distance <= maxDistanceKm
      const matchesFree = !onlyFree || e.price === null
      return matchesCategory && matchesDistance && matchesFree
      })
      .sort((a, b) => {
        if (sortMode === 'distance') {
          return a.event.distance - b.event.distance || b.score - a.score
        }

        if (sortMode === 'rating') {
          return (b.event.rating ?? 0) - (a.event.rating ?? 0) || a.event.distance - b.event.distance
        }

        return b.score - a.score || a.event.distance - b.event.distance
      })
      .map(({ event }) => event)
  }, [activeCategory, allEvents, deferredQuery, maxDistanceKm, onlyFree, sortMode])

  const activeFilterCount =
    (query.trim() ? 1 : 0) +
    (activeCategory ? 1 : 0) +
    (maxDistanceKm !== null && maxDistanceKm !== 5 ? 1 : 0) +
    (maxDistanceKm === null ? 1 : 0) +
    (onlyFree ? 1 : 0) +
    (sortMode !== 'relevance' ? 1 : 0)

  function resetFilters() {
    setActiveCategory(null)
    setMaxDistanceKm(5)
    setOnlyFree(false)
  }

  const activeChips = [
    query.trim()
      ? {
          key: 'query',
          label: `Busqueda: ${query.trim()}`,
          clear: () => setQuery(''),
        }
      : null,
    activeCategory
      ? {
          key: 'category',
          label: `Categoria: ${CATEGORIES.find((c) => c.key === activeCategory)?.label ?? activeCategory}`,
          clear: () => setActiveCategory(null),
        }
      : null,
    maxDistanceKm !== null && maxDistanceKm !== 5
      ? {
          key: 'distance',
          label: `Distancia: hasta ${maxDistanceKm} km`,
          clear: () => setMaxDistanceKm(5),
        }
      : null,
    maxDistanceKm === null
      ? {
          key: 'distance-any',
          label: 'Distancia: cualquiera',
          clear: () => setMaxDistanceKm(5),
        }
      : null,
    onlyFree
      ? {
          key: 'free',
          label: 'Solo gratis',
          clear: () => setOnlyFree(false),
        }
      : null,
    sortMode !== 'relevance'
      ? {
          key: 'sort',
          label: `Orden: ${SORT_OPTIONS.find((opt) => opt.key === sortMode)?.label ?? sortMode}`,
          clear: () => setSortMode('relevance'),
        }
      : null,
  ].filter((chip): chip is { key: string; label: string; clear: () => void } => chip !== null)

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

          {activeChips.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {activeChips.map((chip) => (
                <button
                  key={chip.key}
                  type="button"
                  onClick={chip.clear}
                  className="rounded-full border border-white/20 bg-white/5 px-3 py-1 text-[11px] font-semibold text-slate-200 transition-colors hover:border-white/40"
                >
                  {chip.label} ✕
                </button>
              ))}
            </div>
          )}

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
                    <p className="mb-1 text-[11px] font-semibold text-muted">Ordenar por</p>
                    <div className="flex flex-wrap gap-2">
                      {SORT_OPTIONS.map((option) => (
                        <button
                          key={option.key}
                          type="button"
                          onClick={() => setSortMode(option.key)}
                          className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                            sortMode === option.key
                              ? 'border-primary bg-primary text-white'
                              : 'border-white/20 text-muted hover:border-white/40'
                          }`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>

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
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-muted">{filtered.length} lugares encontrados</p>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-300">
                Orden: {SORT_OPTIONS.find((opt) => opt.key === sortMode)?.label}
              </p>
            </div>
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
