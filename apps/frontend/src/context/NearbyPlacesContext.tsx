'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { useJsApiLoader } from '@react-google-maps/api'
import type { ReactNode } from 'react'
import type { Libraries } from '@react-google-maps/api'
import type { PlaceType, ScrapedPlace } from '../types'
import { useNearbyPlaces } from '../hooks/useNearbyPlaces'

const LIBRARIES: Libraries = ['places']
const DEFAULT_PLACE_TYPES: PlaceType[] = ['restaurant', 'bar', 'night_club', 'cafe']

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim() ?? ''
const HAS_GOOGLE_MAPS_KEY = GOOGLE_MAPS_API_KEY.length > 0
const LOOKS_LIKE_GOOGLE_MAPS_KEY = GOOGLE_MAPS_API_KEY.startsWith('AIza')

interface NearbyPlacesContextValue {
  places: ScrapedPlace[]
  excludedPlaceIds: Set<string>
  selectedPlaceTypes: PlaceType[]
  selectedDistanceKm: number
  userLocation: google.maps.LatLngLiteral | null
  loading: boolean
  locating: boolean
  error: string | null
  locationError: string | null
  mapsReady: boolean
  invalidApiKey: boolean
  mapsLoadError: Error | undefined
  requestUserLocation: (recenter?: boolean) => void
  togglePlaceType: (type: PlaceType) => void
  setDistanceKm: (km: number) => void
  refreshPlaces: () => void
  enrichPlace: (placeId: string) => Promise<Partial<ScrapedPlace>>
  excludePlace: (placeId: string) => void
  resetExcludedPlaces: () => void
}

const NearbyPlacesContext = createContext<NearbyPlacesContextValue | undefined>(undefined)

function createBoundsAround(
  location: google.maps.LatLngLiteral,
  distanceKm = 3,
) {
  // Aproximacion lat/lng: 1 grado ~ 111 km
  const delta = Math.max(0.005, distanceKm / 111)
  return new google.maps.LatLngBounds(
    { lat: location.lat - delta, lng: location.lng - delta },
    { lat: location.lat + delta, lng: location.lng + delta },
  )
}

export function NearbyPlacesProvider({ children }: { children: ReactNode }) {
  const { places, loading, error, fetchNearby, enrichPlace } = useNearbyPlaces()
  const [selectedPlaceTypes, setSelectedPlaceTypes] = useState<PlaceType[]>(DEFAULT_PLACE_TYPES)
  const [selectedDistanceKm, setSelectedDistanceKm] = useState(3)
  const [excludedPlaceIds, setExcludedPlaceIds] = useState<Set<string>>(new Set())
  const [userLocation, setUserLocation] = useState<google.maps.LatLngLiteral | null>(null)
  const [locating, setLocating] = useState(false)
  const [locationError, setLocationError] = useState<string | null>(null)

  // Refs para evitar re-renders en cascada y loops de efectos
  const locatingRef = useRef(false)
  const hasRequestedLocation = useRef(false)
  const enrichRequestedRef = useRef<Set<string>>(new Set())
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const invalidApiKey = !HAS_GOOGLE_MAPS_KEY || !LOOKS_LIKE_GOOGLE_MAPS_KEY

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: invalidApiKey ? '' : GOOGLE_MAPS_API_KEY,
    libraries: LIBRARIES,
    version: 'weekly',
  })

  const refreshPlaces = useCallback(() => {
    if (!isLoaded || !userLocation || selectedPlaceTypes.length === 0) return
    if (refreshTimer.current) clearTimeout(refreshTimer.current)
    refreshTimer.current = setTimeout(() => {
      fetchNearby(
        createBoundsAround(userLocation, selectedDistanceKm),
        selectedPlaceTypes,
      )
    }, 300)
  }, [fetchNearby, isLoaded, selectedDistanceKm, selectedPlaceTypes, userLocation])

  const togglePlaceType = useCallback((type: PlaceType) => {
    setSelectedPlaceTypes((prev) => {
      const exists = prev.includes(type)
      if (exists && prev.length === 1) return prev
      return exists ? prev.filter((item) => item !== type) : [...prev, type]
    })
  }, [])

  const requestUserLocation = useCallback((_recenter = true) => {
    if (!navigator.geolocation || locatingRef.current) return

    locatingRef.current = true
    setLocating(true)
    setLocationError(null)

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const nextLocation = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        }
        setUserLocation(nextLocation)
        locatingRef.current = false
        setLocating(false)
      },
      (geoError) => {
        let message = 'No se pudo obtener tu ubicación actual.'

        if (geoError.code === geoError.PERMISSION_DENIED) {
          message = 'Permiso de ubicación denegado. Habilítalo para mostrar tu posición.'
        } else if (geoError.code === geoError.TIMEOUT) {
          message = 'Se agotó el tiempo al buscar tu ubicación. Intenta nuevamente.'
        } else if (geoError.code === geoError.POSITION_UNAVAILABLE) {
          message = 'Tu ubicación no está disponible en este momento.'
        }

        setLocationError(message)
        locatingRef.current = false
        setLocating(false)
      },
      {
        enableHighAccuracy: false,
        timeout: 8000,
        maximumAge: 300000,
      },
    )
  }, []) // Referencia estable — locatingRef evita llamadas duplicadas sin dep en state

  const setDistanceKm = useCallback((km: number) => {
    setSelectedDistanceKm(km)
  }, [])

  const excludePlace = useCallback((placeId: string) => {
    setExcludedPlaceIds((prev) => {
      if (prev.has(placeId)) return prev
      const next = new Set(prev)
      next.add(placeId)
      return next
    })
  }, [])

  const resetExcludedPlaces = useCallback(() => {
    setExcludedPlaceIds(new Set())
  }, [])

  // Solicita ubicación una sola vez cuando Maps carga.
  // locating se lee del ref para evitar que el effect se re-ejecute en cada cambio de estado.
  useEffect(() => {
    if (!isLoaded || invalidApiKey || hasRequestedLocation.current) return
    hasRequestedLocation.current = true
    requestUserLocation(true)
  }, [invalidApiKey, isLoaded, requestUserLocation])

  useEffect(() => {
    if (!userLocation || !isLoaded) return
    refreshPlaces()
  }, [isLoaded, refreshPlaces, selectedPlaceTypes, userLocation])

  // Enriquece solo los 2 primeros lugares y registra cuáles ya fueron solicitados.
  // La salida temprana evita iteraciones extra cuando enrichPlace actualiza `places`
  // y vuelve a disparar el efecto: si no hay nada nuevo que enriquecer, se corta de inmediato.
  useEffect(() => {
    const toEnrich = places.slice(0, 2).filter(
      (place) =>
        !enrichRequestedRef.current.has(place.placeId) &&
        (place.photoUrl === undefined ||
          place.website === undefined ||
          place.phone === undefined ||
          place.openingHours === undefined),
    )
    if (toEnrich.length === 0) return

    toEnrich.forEach((place) => {
      enrichRequestedRef.current.add(place.placeId)
      void enrichPlace(place.placeId)
    })
  }, [enrichPlace, places])

  const value = useMemo(
    () => ({
      places,
      excludedPlaceIds,
      selectedPlaceTypes,
      selectedDistanceKm,
      userLocation,
      loading,
      locating,
      error,
      locationError,
      mapsReady: isLoaded,
      invalidApiKey,
      mapsLoadError: loadError,
      requestUserLocation,
      togglePlaceType,
      setDistanceKm,
      refreshPlaces,
      enrichPlace,
      excludePlace,
      resetExcludedPlaces,
    }),
    [
      excludePlace,
      enrichPlace,
      error,
      excludedPlaceIds,
      invalidApiKey,
      isLoaded,
      loadError,
      loading,
      locationError,
      locating,
      places,
      selectedDistanceKm,
      selectedPlaceTypes,
      refreshPlaces,
      requestUserLocation,
      resetExcludedPlaces,
      setDistanceKm,
      togglePlaceType,
      userLocation,
    ],
  )

  return (
    <NearbyPlacesContext.Provider value={value}>
      {children}
    </NearbyPlacesContext.Provider>
  )
}

export function useNearbyPlacesContext() {
  const context = useContext(NearbyPlacesContext)
  if (!context) {
    throw new Error('useNearbyPlacesContext debe usarse dentro de <NearbyPlacesProvider>')
  }
  return context
}