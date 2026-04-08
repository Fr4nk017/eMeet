'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
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
  const [userLocation, setUserLocation] = useState<google.maps.LatLngLiteral | null>(null)
  const [locating, setLocating] = useState(false)
  const [locationError, setLocationError] = useState<string | null>(null)

  const invalidApiKey = !HAS_GOOGLE_MAPS_KEY || !LOOKS_LIKE_GOOGLE_MAPS_KEY

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries: LIBRARIES,
    version: 'weekly',
  })

  const refreshPlaces = useCallback(() => {
    if (!isLoaded || !userLocation || selectedPlaceTypes.length === 0) return
    fetchNearby(
      createBoundsAround(userLocation, selectedDistanceKm),
      selectedPlaceTypes,
    )
  }, [fetchNearby, isLoaded, selectedDistanceKm, selectedPlaceTypes, userLocation])

  const togglePlaceType = useCallback((type: PlaceType) => {
    setSelectedPlaceTypes((prev) => {
      const exists = prev.includes(type)
      if (exists && prev.length === 1) return prev
      return exists ? prev.filter((item) => item !== type) : [...prev, type]
    })
  }, [])

  const requestUserLocation = useCallback((_recenter = true) => {
    if (!navigator.geolocation || locating) return

    setLocating(true)
    setLocationError(null)

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const nextLocation = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        }
        setUserLocation(nextLocation)
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
        setLocating(false)
      },
      {
        enableHighAccuracy: false,
        timeout: 8000,
        maximumAge: 300000,
      },
    )
  }, [locating])

  const setDistanceKm = useCallback((km: number) => {
    setSelectedDistanceKm(km)
  }, [])

  useEffect(() => {
    if (!isLoaded || userLocation || locating || invalidApiKey) return
    requestUserLocation(true)
  }, [invalidApiKey, isLoaded, locating, requestUserLocation, userLocation])

  useEffect(() => {
    if (!userLocation || !isLoaded) return
    refreshPlaces()
  }, [isLoaded, refreshPlaces, selectedPlaceTypes, userLocation])

  useEffect(() => {
    places.slice(0, 2).forEach((place) => {
      if (
        place.photoUrl === undefined ||
        place.website === undefined ||
        place.phone === undefined ||
        place.openingHours === undefined
      ) {
        void enrichPlace(place.placeId)
      }
    })
  }, [enrichPlace, places])

  const value = useMemo(
    () => ({
      places,
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
    }),
    [
      enrichPlace,
      error,
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