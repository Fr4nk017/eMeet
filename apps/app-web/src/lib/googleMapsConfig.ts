import type { Libraries } from '@react-google-maps/api'

export const MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim() ?? ''
export const MAPS_LIBRARIES: Libraries = ['places']
export const MAPS_VERSION = 'weekly'
