'use client'

import { useQuery } from '@tanstack/react-query'
import { fetchTicketmasterEvents } from '../services/ticketmasterService'
import { fetchPredictHQEvents } from '../services/predicthqService'
import type { Event } from '../types'

type Location = { lat: number; lng: number }

export function useFeedEvents(userLocation: Location | null, radiusKm: number) {
  const { data = [] } = useQuery<Event[]>({
    queryKey: ['external-events', userLocation?.lat.toFixed(3), userLocation?.lng.toFixed(3), radiusKm],
    queryFn: async () => {
      const [tmEvents, phqEvents] = await Promise.all([
        fetchTicketmasterEvents(userLocation!.lat, userLocation!.lng, radiusKm),
        fetchPredictHQEvents(userLocation!.lat, userLocation!.lng, radiusKm),
      ])
      return [...tmEvents, ...phqEvents]
    },
    enabled: !!userLocation,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  })

  return data
}
