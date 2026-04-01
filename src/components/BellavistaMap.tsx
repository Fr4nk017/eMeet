import { useState, useCallback, useRef, useEffect } from 'react'
import { GoogleMap, useJsApiLoader, OverlayView } from '@react-google-maps/api'
import type { Libraries } from '@react-google-maps/api'

const LIBRARIES: Libraries = ['places']

const CENTER: google.maps.LatLngLiteral = { lat: -33.4364, lng: -70.6358 }

interface Place {
  id: string
  placeId: string
  name: string
  category: string
  position: google.maps.LatLng
  rating: number
  type: string
  address: string
  isOpen?: boolean | null
  photoUrl?: string
  photoLoading?: boolean
}

const DARK_STYLE: google.maps.MapTypeStyle[] = [
  { elementType: 'geometry', stylers: [{ color: '#1a1a2e' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#16213e' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#8896aa' }] },
  { featureType: 'administrative', elementType: 'geometry', stylers: [{ color: '#334155' }] },
  {
    featureType: 'administrative.locality',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#c8d5e0' }],
  },
  {
    featureType: 'administrative.neighborhood',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#a78bfa' }],
  },
  { featureType: 'poi', elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#6b7a8d' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#0d2318' }] },
  { featureType: 'poi.park', elementType: 'labels.text.fill', stylers: [{ color: '#2e6e4a' }] },
  { featureType: 'road', elementType: 'geometry.fill', stylers: [{ color: '#262d46' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#1e2440' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#8896aa' }] },
  { featureType: 'road.arterial', elementType: 'geometry.fill', stylers: [{ color: '#2d3654' }] },
  { featureType: 'road.highway', elementType: 'geometry.fill', stylers: [{ color: '#3b4878' }] },
  {
    featureType: 'road.highway',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#1e2555' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#b0bbc8' }],
  },
  { featureType: 'road.local', elementType: 'labels.text.fill', stylers: [{ color: '#6b7a8d' }] },
  { featureType: 'transit', elementType: 'labels.text.fill', stylers: [{ color: '#7285a0' }] },
  { featureType: 'transit.station', elementType: 'geometry', stylers: [{ color: '#222840' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0b1522' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#3d597a' }] },
]

const MAP_OPTIONS: google.maps.MapOptions = {
  styles: DARK_STYLE,
  disableDefaultUI: true,
  zoomControl: true,
  scrollwheel: true,
  clickableIcons: false,
  gestureHandling: 'greedy',
}

// Mapeo de tipos de Google Places a categorías y colores
const TYPE_CONFIG: Record<string, { category: string; emoji: string; color: string }> = {
  restaurant: { category: 'Restaurante', emoji: '🍽️', color: '#F97316' },
  cafe: { category: 'Café', emoji: '☕', color: '#A1662F' },
  bar: { category: 'Bar', emoji: '🍺', color: '#F59E0B' },
  night_club: { category: 'Discoteca', emoji: '🎉', color: '#EC4899' },
  liquor_store: { category: 'Licorería', emoji: '🍷', color: '#8B5CF6' },
  food: { category: 'Comida', emoji: '🍴', color: '#10B981' },
}

export default function BellavistaMap() {
  const [places, setPlaces] = useState<Place[]>([])
  const [activePlace, setActivePlace] = useState<Place | null>(null)
  const [loading, setLoading] = useState(false)
  const mapRef = useRef<google.maps.Map | null>(null)
  const serviceRef = useRef<google.maps.places.PlacesService | null>(null)
  const hoverTimeoutRef = useRef<number | null>(null)
  const searchDebounceRef = useRef<number | null>(null)
  // Cache para no repetir llamadas getDetails del mismo lugar
  const detailsCacheRef = useRef<Record<string, string | null>>({})
  const [activeFilters, setActiveFilters] = useState<Set<string>>(
    new Set(['restaurant', 'bar', 'night_club', 'cafe'])
  )
  const [userLocation, setUserLocation] = useState<google.maps.LatLngLiteral | null>(null)
  const [locating, setLocating] = useState(false)

  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current)
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current)
    }
  }, [])

  const handleMarkerEnter = (place: Place) => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current)

    // Si ya tenemos foto en cache, mostrar directo
    if (detailsCacheRef.current[place.placeId] !== undefined) {
      setActivePlace({ ...place, photoUrl: detailsCacheRef.current[place.placeId] ?? undefined })
      return
    }

    // Mostrar card de inmediato (sin foto) mientras carga
    setActivePlace({ ...place, photoLoading: true })

    // Pedir detalles del lugar para obtener foto confiable
    if (!serviceRef.current) return
    serviceRef.current.getDetails(
      {
        placeId: place.placeId,
        fields: ['photos', 'opening_hours', 'rating'],
      },
      (result, status) => {
        let photoUrl: string | null = null
        if (status === google.maps.places.PlacesServiceStatus.OK && result?.photos?.length) {
          photoUrl = result.photos[0].getUrl({ maxWidth: 400 })
        }
        // Guardar en cache
        detailsCacheRef.current[place.placeId] = photoUrl

        // Actualizar card solo si sigue siendo el lugar activo
        setActivePlace((prev) =>
          prev?.placeId === place.placeId
            ? { ...prev, photoUrl: photoUrl ?? undefined, photoLoading: false }
            : prev
        )
      }
    )
  }

  const handleMarkerLeave = () => {
    hoverTimeoutRef.current = window.setTimeout(() => setActivePlace(null), 180)
  }

  const handleCardEnter = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current)
  }

  const handleCardLeave = () => {
    setActivePlace(null)
  }

  const toggleFilter = (type: string) => {
    setActiveFilters((prev) => {
      if (prev.size === 1 && prev.has(type)) return prev // al menos 1 activo
      const next = new Set(prev)
      next.has(type) ? next.delete(type) : next.add(type)
      return next
    })
  }

  const goToMyLocation = () => {
    if (!navigator.geolocation || locating) return
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        setUserLocation(loc)
        mapRef.current?.panTo(loc)
        mapRef.current?.setZoom(15)
        setLocating(false)
      },
      () => setLocating(false),
      { timeout: 10000 }
    )
  }

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? '',
    libraries: LIBRARIES,
  })

  const searchPlaces = useCallback(() => {
    if (!mapRef.current || !serviceRef.current) return

    setLoading(true)
    const bounds = mapRef.current.getBounds()

    if (!bounds) {
      setLoading(false)
      return
    }

    // Buscar cada tipo de lugar
    const searches = [
      { type: 'restaurant', keyword: 'restaurante OR comida' },
      { type: 'bar', keyword: 'bar OR pub' },
      { type: 'night_club', keyword: 'discoteca OR nightclub' },
      { type: 'cafe', keyword: 'café OR cafetería' },
    ]

    let completed = 0
    const allResults: Place[] = []

    searches.forEach((search) => {
      const request = {
        bounds,
        keyword: search.keyword,
      } as any

      serviceRef.current!.nearbySearch(request, (results, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && results) {
          const mapped = results.slice(0, 8).map((place, idx) => ({
            id: `${search.type}-${idx}`,
            placeId: place.place_id || `${search.type}-${idx}`,
            name: place.name || 'Sin nombre',
            category: TYPE_CONFIG[search.type]?.category || 'Lugar',
            position: place.geometry?.location || new google.maps.LatLng(0, 0),
            rating: place.rating || 0,
            type: search.type,
            address: place.vicinity || '',
            isOpen: place.opening_hours?.open_now,
          }))
          allResults.push(...mapped)
        }

        completed++
        if (completed === searches.length) {
          // Eliminar duplicados por nombre (similar)
          const unique = allResults.reduce((acc: Place[], curr) => {
            if (!acc.find((p) => p.name.toLowerCase() === curr.name.toLowerCase())) {
              acc.push(curr)
            }
            return acc
          }, [])

          setPlaces(unique.sort((a, b) => (b.rating || 0) - (a.rating || 0)))
          setLoading(false)
        }
      })
    })
  }, [])

  const onMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map
    serviceRef.current = new google.maps.places.PlacesService(map)

    map.setOptions({
      zoomControlOptions: {
        position: google.maps.ControlPosition.RIGHT_BOTTOM,
      },
    })

    // Primera búsqueda
    setTimeout(() => searchPlaces(), 500)
  }, [searchPlaces])

  // Re-buscar cuando se mueva/zoom el mapa (con debounce para no saturar la API)
  const onBoundsChanged = useCallback(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current)
    searchDebounceRef.current = window.setTimeout(() => searchPlaces(), 600)
  }, [searchPlaces])

  const visiblePlaces = places.filter((p) => activeFilters.has(p.type))

  if (loadError) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-card px-6 text-center">
        <span className="text-3xl">⚠️</span>
        <p className="text-sm font-semibold text-red-400">Error al cargar Google Maps</p>
        <p className="text-xs text-muted leading-5">
          Verifica que tu API key esté configurada en <span className="font-mono text-primary-light">.env.local</span>
        </p>
      </div>
    )
  }

  if (!isLoaded) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-card">
        <div className="h-7 w-7 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <p className="text-sm text-muted">Cargando mapa...</p>
      </div>
    )
  }

  return (
    <GoogleMap
      mapContainerStyle={{ width: '100%', height: '100%' }}
      center={CENTER}
      zoom={14}
      options={MAP_OPTIONS}
      onLoad={onMapLoad}
      onBoundsChanged={onBoundsChanged}
      onClick={() => setActivePlace(null)}
    >
      {/* ── Indicador de carga ──────────────────────────────────────────── */}
      {loading && (
        <div className="absolute top-4 right-4 z-40">
          <div className="flex items-center gap-1.5 bg-slate-950/85 px-3 py-1.5 rounded-full border border-white/10 backdrop-blur-md shadow-lg">
            <div className="h-3 w-3 animate-spin rounded-full border border-primary border-t-transparent" />
            <span className="text-xs font-medium text-slate-300">Buscando...</span>
          </div>
        </div>
      )}

      {/* ── Filtros por categoría ───────────────────────────────────────── */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 flex gap-2">
        {(['restaurant', 'bar', 'night_club', 'cafe'] as const).map((type) => {
          const cfg = TYPE_CONFIG[type]
          const isOn = activeFilters.has(type)
          return (
            <button
              key={type}
              type="button"
              onClick={() => toggleFilter(type)}
              style={{
                backgroundColor: isOn ? cfg.color : 'rgba(10,12,30,0.88)',
                borderColor: cfg.color,
                color: isOn ? '#fff' : cfg.color,
                boxShadow: isOn ? `0 0 10px ${cfg.color}55` : 'none',
              }}
              className="flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold backdrop-blur-md transition-all duration-200 whitespace-nowrap select-none"
            >
              <span>{cfg.emoji}</span>
              <span>{cfg.category}</span>
            </button>
          )
        })}
      </div>

      {/* ── Botón mi ubicación ──────────────────────────────────────────── */}
      <div className="absolute bottom-24 right-3 z-30">
        <button
          type="button"
          onClick={goToMyLocation}
          disabled={locating}
          title="Ir a mi ubicación"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-[rgba(10,12,30,0.92)] backdrop-blur-md shadow-lg transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-60"
        >
          {locating ? (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/25 border-t-blue-400" />
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-5 w-5 text-blue-400"
            >
              <circle cx="12" cy="12" r="3" />
              <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
            </svg>
          )}
        </button>
      </div>

      {/* ── Marcadores de lugares reales ────────────────────────────────── */}
      {visiblePlaces.map((place) => {
        const config = TYPE_CONFIG[place.type] || TYPE_CONFIG.restaurant
        const isActive = activePlace?.id === place.id

        return (
          <OverlayView
            key={place.id}
            position={place.position}
            mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
            getPixelPositionOffset={(w, h) => ({ x: -w / 2, y: -h / 2 })}
          >
            <button
              type="button"
              onMouseEnter={() => handleMarkerEnter(place)}
              onMouseLeave={handleMarkerLeave}
              onClick={(e) => e.stopPropagation()}
              style={{
                backgroundColor: isActive ? config.color : 'rgba(20, 22, 48, 0.85)',
                border: `2px solid ${config.color}`,
                boxShadow: isActive
                  ? `0 0 0 4px ${config.color}40, 0 6px 20px rgba(0,0,0,0.6)`
                  : `0 2px 8px rgba(0,0,0,0.5)`,
                width: '34px',
                height: '34px',
                transform: isActive ? 'scale(1.25)' : 'scale(1)',
              }}
              className="flex cursor-pointer items-center justify-center rounded-full text-base transition-all duration-200"
            >
              <span style={{ filter: isActive ? 'none' : 'grayscale(0.2)' }}>
                {config.emoji}
              </span>
            </button>
          </OverlayView>
        )
      })}

      {/* ── Marcador de ubicación del usuario ──────────────────────────── */}
      {userLocation && (
        <OverlayView
          position={userLocation}
          mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
          getPixelPositionOffset={(w, h) => ({ x: -w / 2, y: -h / 2 })}
        >
          <div className="relative flex items-center justify-center">
            {/* Aro pulsante exterior */}
            <span className="absolute inline-flex h-10 w-10 animate-ping rounded-full bg-blue-400 opacity-20" />
            {/* Punto central */}
            <span
              className="relative flex h-5 w-5 items-center justify-center rounded-full border-2 border-white shadow-lg"
              style={{ backgroundColor: '#3B82F6' }}
            >
              <span className="h-2 w-2 rounded-full bg-white" />
            </span>
          </div>
        </OverlayView>
      )}

      {/* ── Hover card del lugar ──────────────────────────────────────── */}
      {activePlace && (() => {
        const config = TYPE_CONFIG[activePlace.type] || TYPE_CONFIG.restaurant
        return (
          <OverlayView
            position={activePlace.position}
            mapPaneName={OverlayView.FLOAT_PANE}
            getPixelPositionOffset={(w, h) => ({ x: -w / 2, y: -h - 22 })}
          >
            <div
              onMouseEnter={handleCardEnter}
              onMouseLeave={handleCardLeave}
              onClick={(e) => e.stopPropagation()}
              className="w-60 overflow-hidden rounded-2xl border border-white/10 shadow-[0_24px_64px_rgba(0,0,0,0.75)]"
              style={{
                background: 'rgba(10, 12, 30, 0.97)',
                backdropFilter: 'blur(28px)',
                WebkitBackdropFilter: 'blur(28px)',
              }}
            >
              {/* Foto del lugar */}
              {activePlace.photoLoading ? (
                /* Skeleton mientras carga la foto */
                <div
                  className="flex h-32 w-full items-center justify-center"
                  style={{ background: `${config.color}18` }}
                >
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white/80" />
                </div>
              ) : activePlace.photoUrl ? (
                <div className="relative h-32 w-full overflow-hidden">
                  <img
                    src={activePlace.photoUrl}
                    alt={activePlace.name}
                    className="h-full w-full object-cover"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      // Si la imagen falla, ocultar el elemento y mostrar fallback
                      const target = e.currentTarget as HTMLImageElement
                      target.style.display = 'none'
                    }}
                  />
                  {/* Gradiente sobre la foto */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  {/* Badge categoría encima de la foto */}
                  <span
                    className="absolute bottom-2 left-3 rounded-full px-2 py-0.5 text-[10px] font-bold text-white"
                    style={{ backgroundColor: config.color }}
                  >
                    {config.emoji} {config.category}
                  </span>
                </div>
              ) : (
                /* Fallback si no hay foto disponible */
                <div
                  className="flex h-14 items-center justify-center gap-2"
                  style={{ background: `${config.color}18` }}
                >
                  <span className="text-3xl">{config.emoji}</span>
                  <span className="text-xs text-white/40">Sin foto disponible</span>
                </div>
              )}

              {/* Info */}
              <div className="px-4 py-3 space-y-1.5">
                <p className="text-sm font-bold text-white leading-snug">{activePlace.name}</p>

                {activePlace.rating > 0 && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-yellow-400 text-xs tracking-tight">
                      {'★'.repeat(Math.round(activePlace.rating))}
                      {'☆'.repeat(5 - Math.round(activePlace.rating))}
                    </span>
                    <span className="text-slate-300 text-xs font-semibold">
                      {activePlace.rating.toFixed(1)}
                    </span>
                  </div>
                )}

                {activePlace.isOpen !== null && activePlace.isOpen !== undefined && (
                  <p
                    className={`text-[11px] font-medium ${
                      activePlace.isOpen ? 'text-emerald-400' : 'text-red-400'
                    }`}
                  >
                    {activePlace.isOpen ? '● Abierto ahora' : '● Cerrado'}
                  </p>
                )}

                {/* Enlace a Google Maps */}
                <a
                  href={`https://www.google.com/maps/place/?q=place_id:${activePlace.placeId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-white transition-colors duration-150 hover:brightness-110"
                  style={{ backgroundColor: TYPE_CONFIG[activePlace.type]?.color ?? '#F97316' }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                  </svg>
                  Cómo llegar
                </a>
              </div>

              {/* Flecha apuntando al marcador */}
              <div
                className="absolute -bottom-[7px] left-1/2 -translate-x-1/2 h-3.5 w-3.5 rotate-45 border-r border-b border-white/10"
                style={{ background: 'rgba(10, 12, 30, 0.97)' }}
              />
            </div>
          </OverlayView>
        )
      })()}
    </GoogleMap>
  )
}
