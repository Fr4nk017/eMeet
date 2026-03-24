import { useState, useCallback, useRef } from 'react'
import { GoogleMap, useJsApiLoader, OverlayView } from '@react-google-maps/api'
import type { Libraries } from '@react-google-maps/api'

const LIBRARIES: Libraries = ['places']

const CENTER: google.maps.LatLngLiteral = { lat: -33.4364, lng: -70.6358 }

interface Place {
  id: string
  name: string
  category: string
  position: google.maps.LatLng
  rating: number
  type: string
  address: string
  isOpen?: boolean | null
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

  // Re-buscar cuando se mueva/zoom el mapa
  const onBoundsChanged = useCallback(() => {
    searchPlaces()
  }, [searchPlaces])

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
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40">
          <div className="flex items-center gap-2 bg-slate-950/80 px-4 py-2 rounded-full border border-white/10 backdrop-blur-md shadow-lg">
            <div className="h-3 w-3 animate-spin rounded-full border border-primary border-t-transparent" />
            <span className="text-xs font-medium text-slate-300">Buscando lugares...</span>
          </div>
        </div>
      )}

      {/* ── Marcadores de lugares reales ────────────────────────────────── */}
      {places.map((place) => {
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
              onClick={(e) => {
                e.stopPropagation()
                setActivePlace((prev) => (prev?.id === place.id ? null : place))
              }}
              style={{
                backgroundColor: config.color,
                border: `2px solid rgba(255,255,255,${isActive ? '0.45' : '0.18'})`,
                boxShadow: isActive
                  ? `0 0 0 3px ${config.color}50, 0 8px 28px rgba(0,0,0,0.6)`
                  : '0 4px 16px rgba(0,0,0,0.5)',
                transform: isActive ? 'scale(1.12)' : 'scale(1)',
              }}
              className="flex cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-bold text-white transition-all duration-200"
            >
              <span>{config.emoji}</span>
              <span className="max-w-[120px] truncate">{place.name}</span>
            </button>
          </OverlayView>
        )
      })}

      {/* ── Mini card del lugar activo ──────────────────────────────────── */}
      {activePlace && (() => {
        const config = TYPE_CONFIG[activePlace.type] || TYPE_CONFIG.restaurant
        return (
          <OverlayView
            position={activePlace.position}
            mapPaneName={OverlayView.FLOAT_PANE}
            getPixelPositionOffset={(w, h) => ({ x: -w / 2, y: -h - 26 })}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-56 overflow-hidden rounded-2xl border border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.65)]"
              style={{
                background: 'rgba(13, 16, 38, 0.96)',
                backdropFilter: 'blur(24px)',
                WebkitBackdropFilter: 'blur(24px)',
              }}
            >
              {/* Header */}
              <div
                className="flex items-center gap-2.5 px-4 py-3"
                style={{ background: config.color }}
              >
                <span className="text-xl">{config.emoji}</span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-white leading-tight">
                    {activePlace.name}
                  </p>
                  <p className="text-xs text-white/75">{config.category}</p>
                </div>
              </div>

              {/* Detalles */}
              <div className="space-y-2 px-4 py-3">
                {activePlace.rating > 0 && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-yellow-400 text-xs">
                      {'★'.repeat(Math.round(activePlace.rating))}
                      {'☆'.repeat(5 - Math.round(activePlace.rating))}
                    </span>
                    <span className="text-white text-xs font-semibold">{activePlace.rating.toFixed(1)}</span>
                  </div>
                )}
                {activePlace.address && (
                  <p className="text-slate-300 text-xs leading-4">{activePlace.address}</p>
                )}
                {activePlace.isOpen !== null && (
                  <p className={`text-xs font-medium ${activePlace.isOpen ? 'text-emerald-400' : 'text-red-400'}`}>
                    {activePlace.isOpen ? '🟢 Abierto ahora' : '🔴 Cerrado'}
                  </p>
                )}
              </div>
            </div>
          </OverlayView>
        )
      })()}
    </GoogleMap>
  )
}
