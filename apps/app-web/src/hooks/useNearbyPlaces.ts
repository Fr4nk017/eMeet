import { useState, useCallback, useRef } from 'react'
import { searchNearbyPlaces, fetchPlaceDetails } from '../services/placesService'
import type { ScrapedPlace, PlaceType } from '../types'

export interface UseNearbyPlacesReturn {
  places: ScrapedPlace[]
  loading: boolean
  error: string | null
  fetchNearby: (
    bounds: google.maps.LatLngBounds,
    types: PlaceType[],
  ) => void
  enrichPlace: (
    placeId: string,
  ) => Promise<Partial<ScrapedPlace>>
}

/**
 * Hook para buscar y enriquecer lugares con la nueva Google Maps Place API.
 *
 * - `fetchNearby`  → lanza Place.searchNearby por bounds y tipos de lugar.
 * - `enrichPlace`  → solicita foto, horario y datos extra con caché interno.
 *                    Llamadas repetidas para el mismo placeId no generan
 *                    nuevas peticiones a la API.
 */
export function useNearbyPlaces(): UseNearbyPlacesReturn {
  const [places, setPlaces] = useState<ScrapedPlace[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const detailsCache = useRef<Map<string, Partial<ScrapedPlace>>>(new Map())
  // Contador de requests: permite descartar respuestas de llamadas anteriores
  const fetchIdRef = useRef(0)

  const fetchNearby = useCallback(
    (
      bounds: google.maps.LatLngBounds,
      types: PlaceType[],
    ) => {
      const id = ++fetchIdRef.current
      setLoading(true)
      setError(null)
      searchNearbyPlaces(bounds, types)
        .then((results) => {
          if (id !== fetchIdRef.current) return // respuesta obsoleta — ignorar
          setPlaces(results.sort((a, b) => b.rating - a.rating))
        })
        .catch(() => {
          if (id !== fetchIdRef.current) return
          setError('Error al buscar lugares cercanos')
        })
        .finally(() => {
          if (id !== fetchIdRef.current) return
          setLoading(false)
        })
    },
    [],
  )

  const enrichPlace = useCallback(
    async (placeId: string): Promise<Partial<ScrapedPlace>> => {
      // Retornar desde caché si ya fue consultado (evita llamadas duplicadas)
      if (detailsCache.current.has(placeId)) {
        return detailsCache.current.get(placeId)!
      }

      const details = await fetchPlaceDetails(placeId)
      detailsCache.current.set(placeId, details)

      // Actualizar el lugar en el estado global con los datos enriquecidos
      setPlaces((prev) =>
        prev.map((p) => (p.placeId === placeId ? { ...p, ...details } : p)),
      )

      return details
    },
    [],
  )

  return { places, loading, error, fetchNearby, enrichPlace }
}
