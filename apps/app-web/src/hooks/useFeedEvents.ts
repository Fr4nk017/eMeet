'use client'

import { useQuery } from '@tanstack/react-query'
import { fetchTicketmasterEvents } from '../services/ticketmasterService'
import type { Event } from '../types'

type Location = { lat: number; lng: number }
type FeedData = { events: Event[]; failedSources: string[] }

export function useFeedEvents(userLocation: Location | null, radiusKm: number) {
  const { data } = useQuery<FeedData>({
    queryKey: ['external-events', userLocation?.lat.toFixed(2), userLocation?.lng.toFixed(2), radiusKm],
    queryFn: async () => {
      const tm = await fetchTicketmasterEvents(userLocation!.lat, userLocation!.lng, radiusKm)

      const failedSources = [
        tm.configured && tm.error ? 'Ticketmaster' : null,
      ].filter((s): s is string => s !== null)

      return {
        events: tm.events,
        failedSources,
      }
    },
    enabled: !!userLocation,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  })

  return {
    events: data?.events ?? [],
    failedSources: data?.failedSources ?? [],
  }
}
