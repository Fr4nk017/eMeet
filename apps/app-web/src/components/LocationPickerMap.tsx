'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { GoogleMap, Marker, useJsApiLoader } from '@react-google-maps/api'
import { Loader2, Navigation } from 'lucide-react'
import { MAPS_API_KEY, MAPS_LIBRARIES, MAPS_VERSION } from '../lib/googleMapsConfig'

const DEFAULT_CENTER = { lat: -33.4489, lng: -70.6693 } // Santiago, Chile
const GOOGLE_MAPS_API_KEY = MAPS_API_KEY

const DARK_STYLES: google.maps.MapTypeStyle[] = [
  { elementType: 'geometry', stylers: [{ color: '#1e2132' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#1e2132' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#8896b3' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#2d3347' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#1a1f30' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#9ca5b3' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0f1520' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#3d4a5c' }] },
]

export type LocationValue = {
  lat: number
  lng: number
  address: string
}

interface Props {
  value: LocationValue | null
  onChange: (val: LocationValue) => void
  height?: number
}

async function nominatimReverse(lat: number, lng: number): Promise<string> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=es`,
    )
    const data = (await res.json()) as { display_name?: string }
    return data.display_name ?? `${lat.toFixed(5)}, ${lng.toFixed(5)}`
  } catch {
    return `${lat.toFixed(5)}, ${lng.toFixed(5)}`
  }
}

export function LocationPickerMap({ value, onChange, height = 200 }: Props) {
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries: MAPS_LIBRARIES,
    version: MAPS_VERSION,
  })

  const [markerPos, setMarkerPos] = useState<{ lat: number; lng: number }>(
    value ? { lat: value.lat, lng: value.lng } : DEFAULT_CENTER,
  )
  const [gpsLoading, setGpsLoading] = useState(false)
  const mapRef = useRef<google.maps.Map | null>(null)

  // Sync marker when parent sets value externally (e.g. geocoding on edit open)
  useEffect(() => {
    if (value) setMarkerPos({ lat: value.lat, lng: value.lng })
  }, [value?.lat, value?.lng]) // eslint-disable-line react-hooks/exhaustive-deps

  const pick = useCallback(
    async (lat: number, lng: number) => {
      setMarkerPos({ lat, lng })
      const address = await nominatimReverse(lat, lng)
      onChange({ lat, lng, address })
    },
    [onChange],
  )

  const handleMapClick = useCallback(
    (e: google.maps.MapMouseEvent) => {
      if (e.latLng) pick(e.latLng.lat(), e.latLng.lng())
    },
    [pick],
  )

  const handleDragEnd = useCallback(
    (e: google.maps.MapMouseEvent) => {
      if (e.latLng) pick(e.latLng.lat(), e.latLng.lng())
    },
    [pick],
  )

  const handleGPS = useCallback(() => {
    if (!navigator.geolocation) return
    setGpsLoading(true)
    navigator.geolocation.getCurrentPosition(
      async ({ coords: { latitude: lat, longitude: lng } }) => {
        mapRef.current?.panTo({ lat, lng })
        mapRef.current?.setZoom(16)
        await pick(lat, lng)
        setGpsLoading(false)
      },
      () => setGpsLoading(false),
      { enableHighAccuracy: true, timeout: 10_000 },
    )
  }, [pick])

  if (!GOOGLE_MAPS_API_KEY || loadError) {
    return (
      <div
        style={{ height }}
        className="flex items-center justify-center rounded-xl border border-white/10 bg-white/5 text-xs text-white/30"
      >
        Mapa no disponible — configura NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
      </div>
    )
  }

  if (!isLoaded) {
    return (
      <div
        style={{ height }}
        className="flex items-center justify-center rounded-xl border border-white/10 bg-white/5"
      >
        <Loader2 className="animate-spin text-white/30" size={20} />
      </div>
    )
  }

  return (
    <div className="relative overflow-hidden rounded-xl border border-white/10">
      <GoogleMap
        mapContainerStyle={{ width: '100%', height: `${height}px` }}
        center={markerPos}
        zoom={15}
        options={{
          disableDefaultUI: true,
          zoomControl: true,
          clickableIcons: false,
          gestureHandling: 'cooperative',
          styles: DARK_STYLES,
        }}
        onClick={handleMapClick}
        onLoad={(m) => { mapRef.current = m }}
      >
        <Marker position={markerPos} draggable onDragEnd={handleDragEnd} />
      </GoogleMap>

      {/* GPS button */}
      <button
        type="button"
        onClick={handleGPS}
        disabled={gpsLoading}
        className="absolute bottom-2 right-2 flex items-center gap-1.5 rounded-lg bg-black/70 px-2.5 py-1.5 text-xs font-medium text-white/80 backdrop-blur-sm transition-colors hover:bg-black/85 disabled:opacity-50"
      >
        {gpsLoading
          ? <Loader2 className="animate-spin" size={11} />
          : <Navigation size={11} />}
        Mi ubicación
      </button>

      {/* Address overlay */}
      {value?.address && (
        <div className="absolute bottom-2 left-2 max-w-[58%] truncate rounded-lg bg-black/70 px-2 py-1 text-[10px] text-white/70 backdrop-blur-sm">
          {value.address}
        </div>
      )}

      {/* Hint when no location selected */}
      {!value && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span className="rounded-lg bg-black/60 px-3 py-1.5 text-xs text-white/50 backdrop-blur-sm">
            Haz clic o arrastra el pin para seleccionar
          </span>
        </div>
      )}
    </div>
  )
}
