'use client'

import { useCallback, useRef, useEffect, useMemo } from 'react'
import { GoogleMap, OverlayView } from '@react-google-maps/api'
import { PLACE_TYPE_CONFIG } from '../services/placesService'
import { useNearbyPlacesContext } from '../context/NearbyPlacesContext'

const CENTER: google.maps.LatLngLiteral = { lat: -33.4364, lng: -70.6358 }

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

function getDistanceKm(
  from: google.maps.LatLngLiteral,
  to: { lat: number; lng: number },
) {
  const earthRadiusKm = 6371
  const dLat = ((to.lat - from.lat) * Math.PI) / 180
  const dLng = ((to.lng - from.lng) * Math.PI) / 180
  const lat1 = (from.lat * Math.PI) / 180
  const lat2 = (to.lat * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2

  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export default function BellavistaMap() {
  const {
    places,
    loading,
    error,
    userLocation,
    locating,
    locationError,
    mapsReady,
    invalidApiKey,
    mapsLoadError,
    selectedPlaceTypes,
    selectedDistanceKm,
    requestUserLocation,
  } = useNearbyPlacesContext()
  const mapRef = useRef<google.maps.Map | null>(null)
  // Ref para userLocation: onMapLoad es estable y no se recrea en cada cambio de ubicación
  const userLocationRef = useRef(userLocation)
  useEffect(() => { userLocationRef.current = userLocation }, [userLocation])

  const goToMyLocation = () => {
    requestUserLocation(true)
  }

  const onMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map

    map.setOptions({
      zoomControlOptions: {
        position: google.maps.ControlPosition.RIGHT_BOTTOM,
      },
    })

    if (userLocationRef.current) {
      map.panTo(userLocationRef.current)
      map.setZoom(15)
    }
  }, []) // Referencia estable — userLocationRef evita incluir userLocation como dep

  useEffect(() => {
    if (!userLocation || !mapRef.current) return
    mapRef.current.panTo(userLocation)
    mapRef.current.setZoom(15)
  }, [userLocation])

  // Memoizado: sin esto, se crea un nuevo array en cada render
  // y nearestPlaceIds (que depende de visiblePlaces) recalcula constantemente
  const visiblePlaces = useMemo(() => places.filter(
    (p) =>
      selectedPlaceTypes.includes(p.type) &&
      (!userLocation || getDistanceKm(userLocation, p.position) <= selectedDistanceKm),
  ), [places, selectedPlaceTypes, userLocation, selectedDistanceKm])

  const nearestPlaceIds = useMemo(() => {
    if (!userLocation) return new Set<string>()

    return new Set(
      [...visiblePlaces]
        .sort(
          (a, b) =>
            getDistanceKm(userLocation, a.position) -
            getDistanceKm(userLocation, b.position),
        )
        .slice(0, 3)
        .map((place) => place.placeId),
    )
  }, [userLocation, visiblePlaces])

  if (invalidApiKey) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-card px-6 text-center">
        <span className="text-3xl">🔑</span>
        <p className="text-sm font-semibold text-amber-400">API key de Google Maps inválida</p>
        <p className="text-xs text-muted leading-5">
          La variable <span className="font-mono text-primary-light">VITE_GOOGLE_MAPS_API_KEY</span> no contiene una key de Google Maps.
        </p>
        <p className="text-xs text-muted leading-5">
          Las keys de Google normalmente comienzan con <span className="font-mono text-primary-light">AIza</span>.
        </p>
      </div>
    )
  }

  if (mapsLoadError) {
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

  if (!mapsReady) {
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
      center={userLocation ?? CENTER}
      zoom={userLocation ? 15 : 14}
      options={MAP_OPTIONS}
      onLoad={onMapLoad}
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

      {locationError && (
        <div className="absolute bottom-24 left-4 z-40 max-w-xs rounded-2xl border border-amber-400/25 bg-slate-950/90 px-4 py-3 backdrop-blur-md">
          <p className="text-xs font-semibold text-amber-300">Ubicación no disponible</p>
          <p className="mt-1 text-[11px] leading-5 text-slate-300">{locationError}</p>
          <button
            type="button"
            onClick={goToMyLocation}
            className="mt-2 rounded-full bg-amber-400/20 px-3 py-1 text-[11px] font-semibold text-amber-300 hover:bg-amber-400/30"
          >
            Reintentar ubicación
          </button>
        </div>
      )}

      {error && (
        <div className="absolute bottom-24 left-4 z-40 max-w-xs rounded-2xl border border-red-400/25 bg-slate-950/90 px-4 py-3 backdrop-blur-md">
          <p className="text-xs font-semibold text-red-300">Error al buscar eventos cercanos</p>
          <p className="mt-1 text-[11px] leading-5 text-slate-300">{error}</p>
          <button
            type="button"
            onClick={goToMyLocation}
            className="mt-2 rounded-full bg-red-500/20 px-3 py-1 text-[11px] font-semibold text-red-200 hover:bg-red-500/30"
          >
            Reintentar
          </button>
        </div>
      )}

      {!userLocation && !locating && !locationError && (
        <div className="absolute bottom-24 left-4 z-40 max-w-xs rounded-2xl border border-blue-400/25 bg-slate-950/90 px-4 py-3 backdrop-blur-md">
          <p className="text-xs font-semibold text-blue-300">Activa tu ubicación</p>
          <p className="mt-1 text-[11px] leading-5 text-slate-300">
            Necesitamos tu GPS para remarcar tu posición y eventos cercanos.
          </p>
          <button
            type="button"
            onClick={goToMyLocation}
            className="mt-2 rounded-full bg-blue-500/20 px-3 py-1 text-[11px] font-semibold text-blue-200 hover:bg-blue-500/30"
          >
            Activar ubicación
          </button>
        </div>
      )}

      {/* ── Estado real de ubicación/eventos ───────────────────────────── */}
      {userLocation && (
        <div className="absolute top-4 left-4 z-30 rounded-xl border border-white/10 bg-slate-950/85 px-3 py-2 backdrop-blur-md">
          <p className="text-[11px] font-semibold text-slate-200">📍 Tu ubicación detectada</p>
          <p className="text-[11px] text-emerald-300">
            {visiblePlaces.length > 0
              ? `✨ ${Math.min(3, visiblePlaces.length)} eventos cercanos remarcados (${selectedDistanceKm} km)`
              : `Sin eventos cercanos en ${selectedDistanceKm} km`}
          </p>
        </div>
      )}

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
        const config = PLACE_TYPE_CONFIG[place.type] ?? PLACE_TYPE_CONFIG.restaurant
        const isNearest = nearestPlaceIds.has(place.placeId)

        return (
          <OverlayView
            key={place.placeId}
            position={place.position}
            mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
            getPixelPositionOffset={(w, h) => ({ x: -w / 2, y: -h / 2 })}
          >
            <button
              type="button"
              onClick={(e) => e.stopPropagation()}
              style={{
                backgroundColor: 'rgba(20, 22, 48, 0.85)',
                border: `2px solid ${config.color}`,
                boxShadow: isNearest
                  ? `0 0 0 5px ${config.color}3d, 0 8px 24px rgba(0,0,0,0.65)`
                  : `0 2px 8px rgba(0,0,0,0.5)`,
                width: isNearest ? '42px' : '34px',
                height: isNearest ? '42px' : '34px',
                transform: isNearest ? 'scale(1.1)' : 'scale(1)',
              }}
              className="flex cursor-pointer items-center justify-center rounded-full text-base transition-all duration-200"
            >
              <span style={{ filter: isNearest ? 'none' : 'grayscale(0.2)' }}>
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
            <span className="absolute inline-flex h-12 w-12 animate-ping rounded-full bg-blue-400 opacity-25" />
            {/* Punto central */}
            <span
              className="relative flex h-6 w-6 items-center justify-center rounded-full border-2 border-white shadow-lg"
              style={{ backgroundColor: '#3B82F6' }}
            >
              <span className="h-2.5 w-2.5 rounded-full bg-white" />
            </span>
          </div>
        </OverlayView>
      )}

    </GoogleMap>
  )
}
