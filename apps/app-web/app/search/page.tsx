'use client'

import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { GoogleMap, OverlayView } from '@react-google-maps/api'
import { Search, X as XIcon, Map, LayoutGrid } from 'lucide-react'
import Layout from '../../src/components/Layout'
import SwipeCard from '../../src/components/SwipeCard'
import { NearbyPlacesProvider, useNearbyPlacesContext } from '../../src/context/NearbyPlacesContext'
import { useLocatarioEvents } from '../../src/context/LocatarioEventsContext'
import { useFeedEvents } from '../../src/hooks/useFeedEvents'
import { placeToEvent } from '../../src/data/placeFeedAdapter'
import { haversineKm } from '../../src/utils/geo'
import { CATEGORY_EMOJI, formatEventDate, formatPrice } from '../../src/data/mockEvents'
import type { Event, EventCategory, EventSource } from '../../src/types'

// ─── Constantes de UI ─────────────────────────────────────────────────────────

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

const SOURCE_LABELS: Record<EventSource, string> = {
  ticketmaster: 'Ticketmaster',
  places: 'Lugares',
  locatario: 'Locales',
}

const SOURCE_ACTIVE_CLASS: Record<EventSource, string> = {
  ticketmaster: 'border-blue-400/60 bg-blue-500/20 text-blue-200',
  places: 'border-emerald-400/60 bg-emerald-500/20 text-emerald-200',
  locatario: 'border-primary/60 bg-primary/20 text-primary-light',
}

const DARK_MAP_OPTIONS: google.maps.MapOptions = {
  styles: [
    { elementType: 'geometry', stylers: [{ color: '#1a1a2e' }] },
    { elementType: 'labels.text.fill', stylers: [{ color: '#8896aa' }] },
    { featureType: 'poi', elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
    { featureType: 'road', elementType: 'geometry.fill', stylers: [{ color: '#262d46' }] },
    { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0b1522' }] },
  ],
  disableDefaultUI: true,
  zoomControl: true,
  scrollwheel: true,
  clickableIcons: false,
  gestureHandling: 'greedy',
}

// ─── Helpers de fecha ─────────────────────────────────────────────────────────

function startOfDay(d: Date): number {
  const r = new Date(d)
  r.setHours(0, 0, 0, 0)
  return r.getTime()
}

function isToday(dateStr: string): boolean {
  return startOfDay(new Date(dateStr)) === startOfDay(new Date())
}

function isThisWeekend(dateStr: string): boolean {
  const d = new Date(dateStr)
  const now = new Date()
  const dayOfWeek = now.getDay() // 0=Dom, 6=Sáb
  const daysToSat = dayOfWeek === 6 ? 0 : (6 - dayOfWeek)
  const sat = new Date(now)
  sat.setDate(now.getDate() + daysToSat)
  sat.setHours(0, 0, 0, 0)
  const sun = new Date(sat)
  sun.setDate(sat.getDate() + 1)
  sun.setHours(23, 59, 59, 999)
  return d >= sat && d <= sun
}

function isThisWeek(dateStr: string): boolean {
  const d = new Date(dateStr)
  const now = new Date()
  const weekEnd = new Date(now)
  weekEnd.setDate(now.getDate() + 7)
  return d >= now && d <= weekEnd
}

type DateFilter = 'today' | 'weekend' | 'week' | null
type PriceFilter = 'free' | 'paid' | null

function matchesDate(dateStr: string, filter: DateFilter): boolean {
  if (!filter) return true
  if (filter === 'today') return isToday(dateStr)
  if (filter === 'weekend') return isThisWeekend(dateStr)
  return isThisWeek(dateStr)
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SearchSkeleton() {
  return (
    <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(240px,1fr))]">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i} className="overflow-hidden rounded-2xl border border-white/10 bg-card">
          <div className="shimmer aspect-[16/10] w-full" />
          <div className="space-y-2 p-3.5">
            <div className="shimmer h-3 w-1/3 rounded-md" />
            <div className="shimmer h-4 w-3/4 rounded-md" />
            <div className="shimmer h-3 w-full rounded-md" />
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Vista mapa ───────────────────────────────────────────────────────────────

function EventsMapView({
  events,
  userLocation,
  onSelectEvent,
}: {
  events: Event[]
  userLocation: { lat: number; lng: number } | null
  onSelectEvent: (e: Event) => void
}) {
  const mappable = useMemo(
    () => events.filter((e) => e.lat != null && e.lng != null),
    [events],
  )

  if (!userLocation) {
    return (
      <div className="flex h-64 items-center justify-center rounded-2xl border border-white/10 bg-card">
        <p className="text-sm text-muted">Activa tu ubicación para ver el mapa</p>
      </div>
    )
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10" style={{ height: 480 }}>
      <GoogleMap
        mapContainerStyle={{ width: '100%', height: '100%' }}
        center={userLocation}
        zoom={13}
        options={DARK_MAP_OPTIONS}
      >
        {/* Punto del usuario */}
        <OverlayView
          position={userLocation}
          mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
          getPixelPositionOffset={(w, h) => ({ x: -w / 2, y: -h / 2 })}
        >
          <div className="relative flex items-center justify-center">
            <span className="absolute inline-flex h-10 w-10 animate-ping rounded-full bg-blue-400 opacity-20" />
            <span
              className="relative flex h-5 w-5 items-center justify-center rounded-full border-2 border-white shadow-lg"
              style={{ backgroundColor: '#3B82F6' }}
            >
              <span className="h-2 w-2 rounded-full bg-white" />
            </span>
          </div>
        </OverlayView>

        {/* Marcadores de eventos */}
        {mappable.map((event) => (
          <OverlayView
            key={event.id}
            position={{ lat: event.lat!, lng: event.lng! }}
            mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
            getPixelPositionOffset={(w, h) => ({ x: -w / 2, y: -h })}
          >
            <button
              type="button"
              onClick={() => onSelectEvent(event)}
              className="flex flex-col items-center gap-0.5"
            >
              <div
                className="max-w-[130px] truncate rounded-full border border-white/20 bg-slate-900/90 px-2.5 py-1 text-[10px] font-semibold text-white shadow-lg backdrop-blur-sm"
                title={event.title}
              >
                {CATEGORY_EMOJI[event.category]} {event.title}
              </div>
              <div className="h-2 w-px bg-white/40" />
              <div className="h-1.5 w-1.5 rounded-full bg-white/60" />
            </button>
          </OverlayView>
        ))}
      </GoogleMap>

      {mappable.length === 0 && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="rounded-xl border border-white/10 bg-slate-900/80 px-4 py-2 backdrop-blur-sm">
            <p className="text-xs text-muted">Sin eventos con coordenadas disponibles</p>
          </div>
        </div>
      )}

      <div className="absolute bottom-3 right-3 rounded-full border border-white/10 bg-slate-900/80 px-2.5 py-1 backdrop-blur-sm">
        <p className="text-[10px] text-muted">{mappable.length} de {events.length} eventos en mapa</p>
      </div>
    </div>
  )
}

// ─── Contenido principal ──────────────────────────────────────────────────────

function SearchPageContent() {
  const {
    places,
    userLocation,
    loading,
    locating,
    invalidApiKey,
    mapsReady,
    requestUserLocation,
  } = useNearbyPlacesContext()

  const { locatarioEvents } = useLocatarioEvents()
  const { events: externalEvents, failedSources } = useFeedEvents(userLocation, 20)

  // ── Estado de filtros ────────────────────────────────────────────────────
  const [isFiltersOpen, setIsFiltersOpen] = useState(false)
  const [activeCategory, setActiveCategory] = useState<EventCategory | null>(null)
  const [maxDistanceKm, setMaxDistanceKm] = useState<number | null>(5)
  const [priceFilter, setPriceFilter] = useState<PriceFilter>(null)
  const [dateFilter, setDateFilter] = useState<DateFilter>(null)
  const [activeSources, setActiveSources] = useState<Set<EventSource>>(new Set())
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
  const [viewMode, setViewMode] = useState<'grid' | 'map'>('grid')

  // ── Búsqueda con debounce ────────────────────────────────────────────────
  const [searchText, setSearchText] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchText.trim().toLowerCase()), 200)
    return () => clearTimeout(timer)
  }, [searchText])

  // ── Todos los eventos combinados ─────────────────────────────────────────
  const allEvents = useMemo(() => {
    const placeEvents = userLocation
      ? places.map((place) => {
          const distance = haversineKm(
            place.position.lat,
            place.position.lng,
            userLocation.lat,
            userLocation.lng,
          )
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
      .sort((a, b) => a.distance - b.distance)
  }, [externalEvents, locatarioEvents, places, userLocation])

  // Fuentes presentes en los resultados (para mostrar solo las que aplican)
  const availableSources = useMemo(
    () => Array.from(new Set(allEvents.map((e) => e.source))) as EventSource[],
    [allEvents],
  )

  // ── Eventos filtrados ────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return allEvents.filter((e) => {
      if (activeCategory !== null && e.category !== activeCategory) return false
      if (maxDistanceKm !== null && e.distance > maxDistanceKm) return false
      if (priceFilter === 'free' && e.price !== null) return false
      if (priceFilter === 'paid' && e.price === null) return false
      if (activeSources.size > 0 && !activeSources.has(e.source)) return false
      if (!matchesDate(e.date, dateFilter)) return false
      if (debouncedSearch) {
        const q = debouncedSearch
        if (
          !e.title.toLowerCase().includes(q) &&
          !e.location.toLowerCase().includes(q) &&
          !e.address.toLowerCase().includes(q)
        ) return false
      }
      return true
    })
  }, [allEvents, activeCategory, maxDistanceKm, priceFilter, activeSources, dateFilter, debouncedSearch])

  const activeFilterCount =
    (activeCategory ? 1 : 0) +
    (maxDistanceKm !== null ? 1 : 0) +
    (priceFilter !== null ? 1 : 0) +
    (dateFilter !== null ? 1 : 0) +
    (activeSources.size > 0 ? 1 : 0)

  function resetFilters() {
    setActiveCategory(null)
    setMaxDistanceKm(5)
    setPriceFilter(null)
    setDateFilter(null)
    setActiveSources(new Set())
    setSearchText('')
  }

  function toggleSource(source: EventSource) {
    setActiveSources((prev) => {
      const next = new Set(prev)
      if (next.has(source)) next.delete(source)
      else next.add(source)
      return next
    })
  }

  const isLoading = loading || locating || !userLocation

  return (
    <Layout headerTitle="Explorar">
      <div className="px-4 pb-4 pt-4 lg:px-5 lg:pt-5">

        {/* ── Header sticky ────────────────────────────────────────────────── */}
        <div className="sticky top-0 z-20 -mx-4 mb-4 border-b border-white/10 bg-surface/90 px-4 py-3 backdrop-blur-md lg:-mx-5 lg:px-5">

          {/* Barra: buscador + toggle mapa + filtros */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted pointer-events-none" />
              <input
                type="search"
                placeholder="Buscar eventos, lugares, artistas..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="h-9 w-full rounded-full border border-white/15 bg-card/80 pl-8 pr-8 text-xs text-white placeholder:text-muted focus:border-primary/60 focus:outline-none focus:ring-1 focus:ring-primary/40"
              />
              {searchText && (
                <button
                  type="button"
                  onClick={() => setSearchText('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-white"
                  aria-label="Limpiar búsqueda"
                >
                  <XIcon className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {mapsReady && (
              <button
                type="button"
                onClick={() => setViewMode((v) => (v === 'grid' ? 'map' : 'grid'))}
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition-colors ${
                  viewMode === 'map'
                    ? 'border-primary/70 bg-primary/20 text-primary-light'
                    : 'border-white/20 text-slate-300 hover:border-white/40'
                }`}
                aria-label={viewMode === 'map' ? 'Ver cuadrícula' : 'Ver en mapa'}
              >
                {viewMode === 'map'
                  ? <LayoutGrid className="h-4 w-4" />
                  : <Map className="h-4 w-4" />}
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsFiltersOpen((v) => !v)}
              className={`shrink-0 rounded-full border px-3 py-2 text-xs font-semibold transition-colors ${
                isFiltersOpen || activeFilterCount > 0
                  ? 'border-primary/70 bg-primary/20 text-primary-light'
                  : 'border-white/20 text-slate-200 hover:border-white/40'
              }`}
            >
              Filtros {activeFilterCount > 0 ? `(${activeFilterCount})` : ''}
            </button>
          </div>

          {/* Panel de filtros */}
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
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-300">Filtros</p>
                  <button
                    type="button"
                    onClick={() => setIsFiltersOpen(false)}
                    className="rounded-full p-1 text-muted hover:bg-white/10 hover:text-white"
                    aria-label="Cerrar filtros"
                  >
                    <XIcon className="h-4 w-4" />
                  </button>
                </div>

                <div className="space-y-3.5">
                  {/* Categoría */}
                  <div>
                    <p className="mb-1.5 text-[11px] font-semibold text-muted">Tipo de evento</p>
                    <div className="flex flex-wrap gap-1.5">
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
                          onClick={() => setActiveCategory(activeCategory === cat.key ? null : cat.key)}
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

                  {/* Fecha */}
                  <div>
                    <p className="mb-1.5 text-[11px] font-semibold text-muted">Fecha</p>
                    <div className="flex flex-wrap gap-1.5">
                      {(
                        [
                          { key: null, label: 'Cualquier fecha' },
                          { key: 'today', label: 'Hoy' },
                          { key: 'weekend', label: 'Fin de semana' },
                          { key: 'week', label: 'Esta semana' },
                        ] as const
                      ).map(({ key, label }) => (
                        <button
                          key={String(key)}
                          onClick={() => setDateFilter(key)}
                          className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                            dateFilter === key
                              ? 'border-primary bg-primary text-white'
                              : 'border-white/20 text-muted hover:border-white/40'
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Distancia */}
                  <div>
                    <p className="mb-1.5 text-[11px] font-semibold text-muted">Distancia</p>
                    <div className="flex flex-wrap gap-1.5">
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

                  {/* Precio */}
                  <div>
                    <p className="mb-1.5 text-[11px] font-semibold text-muted">Precio</p>
                    <div className="flex flex-wrap gap-1.5">
                      {(
                        [
                          { key: null, label: 'Todos' },
                          { key: 'free', label: 'Gratis' },
                          { key: 'paid', label: 'Con costo' },
                        ] as const
                      ).map(({ key, label }) => (
                        <button
                          key={String(key)}
                          type="button"
                          onClick={() => setPriceFilter(key)}
                          className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                            priceFilter === key
                              ? key === 'free'
                                ? 'border-green-400/70 bg-green-500/20 text-green-200'
                                : 'border-primary bg-primary text-white'
                              : 'border-white/20 text-muted hover:border-white/40'
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Fuente (solo si hay más de una) */}
                  {availableSources.length > 1 && (
                    <div>
                      <p className="mb-1.5 text-[11px] font-semibold text-muted">Fuente</p>
                      <div className="flex flex-wrap gap-1.5">
                        {availableSources.map((source) => (
                          <button
                            key={source}
                            type="button"
                            onClick={() => toggleSource(source)}
                            className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                              activeSources.has(source)
                                ? SOURCE_ACTIVE_CLASS[source]
                                : 'border-white/20 text-muted hover:border-white/40'
                            }`}
                          >
                            {SOURCE_LABELS[source]}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
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

        {/* ── Contenido ────────────────────────────────────────────────────── */}
        {invalidApiKey ? (
          <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
            <span className="text-5xl">🔑</span>
            <h2 className="text-lg font-bold text-white">Configura tu API key de Google Maps</h2>
            <p className="max-w-xs text-sm text-muted">
              El explorador usa lugares reales según tu ubicación. Agrega la clave en .env.local para activarlo.
            </p>
          </div>
        ) : isLoading ? (
          <>
            <p className="mb-3 text-xs text-muted">Buscando lugares cercanos...</p>
            <SearchSkeleton />
          </>
        ) : (
          <>
            {failedSources.length > 0 && (
              <div className="mb-3 flex items-start gap-2 rounded-xl border border-amber-400/20 bg-amber-500/10 px-3 py-2.5">
                <span className="mt-px text-sm">⚠️</span>
                <p className="text-xs leading-5 text-amber-200">
                  Algunos servicios no respondieron ({failedSources.join(', ')}). Los resultados pueden estar incompletos.
                </p>
              </div>
            )}

            <p className="mb-3 text-xs text-muted">
              {filtered.length} evento{filtered.length !== 1 ? 's' : ''} encontrado{filtered.length !== 1 ? 's' : ''}
            </p>

            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
                <span className="text-4xl">🔎</span>
                <p className="text-sm text-muted">
                  {debouncedSearch
                    ? `Sin resultados para "${debouncedSearch}"`
                    : 'No hay eventos que coincidan con los filtros aplicados.'}
                </p>
                <button
                  type="button"
                  onClick={resetFilters}
                  className="rounded-full border border-white/20 px-4 py-2 text-xs font-semibold text-slate-200 hover:border-white/40"
                >
                  Limpiar filtros
                </button>
              </div>
            ) : viewMode === 'map' ? (
              <EventsMapView
                events={filtered}
                userLocation={userLocation}
                onSelectEvent={setSelectedEvent}
              />
            ) : (
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
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-primary-light">
                          {CATEGORY_EMOJI[event.category]} {event.category}
                        </span>
                        <span className="shrink-0 text-[10px] text-muted">
                          {SOURCE_LABELS[event.source]}
                        </span>
                      </div>
                      <h3 className="mt-1 line-clamp-2 text-base font-semibold leading-tight text-white">
                        {event.title}
                      </h3>
                      <p className="mt-1 text-xs text-muted">{event.location}</p>
                      <div className="mt-2 flex items-center justify-between text-xs">
                        <span className="text-slate-300">{event.distance} km</span>
                        <span className="font-semibold text-primary-light">{formatPrice(event.price)}</span>
                      </div>
                      <p className="mt-1 text-[11px] text-muted">{formatEventDate(event.date)}</p>
                    </div>
                  </motion.button>
                ))}
              </div>
            )}
          </>
        )}

        {!isLoading && !invalidApiKey && (
          <div className="mt-4 flex justify-center">
            <button
              type="button"
              onClick={() => requestUserLocation(true)}
              className="text-xs font-medium text-primary-light hover:text-primary"
            >
              Actualizar mi ubicación
            </button>
          </div>
        )}
      </div>

      {/* ── Modal detalle evento ──────────────────────────────────────────── */}
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
              onSave={() => {}}
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
