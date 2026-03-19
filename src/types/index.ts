// ─── Tipos centrales de eMeet ───────────────────────────────────────────────

/**
 * Categorías disponibles para clasificar eventos.
 * Se usan para filtrado y personalización del feed.
 */
export type EventCategory =
  | 'gastronomia'
  | 'musica'
  | 'cultura'
  | 'networking'
  | 'deporte'
  | 'fiesta'
  | 'teatro'
  | 'arte'

/**
 * Representa un evento publicado en la plataforma.
 */
export interface Event {
  id: string
  title: string
  description: string
  category: EventCategory
  date: string           // ISO 8601 — ej: "2026-03-25T21:00:00"
  location: string       // nombre del lugar
  address: string
  distance: number       // distancia en km desde el usuario
  price: number | null   // null = gratis
  imageUrl: string
  organizerName: string
  organizerAvatar: string
  attendees: number
  capacity: number | null
  tags: string[]
  isLiked?: boolean
  isSaved?: boolean
}

/**
 * Perfil del usuario autenticado.
 */
export interface User {
  id: string
  name: string
  email: string
  avatarUrl: string
  bio: string
  interests: EventCategory[]
  likedEvents: string[]   // IDs de eventos con like
  savedEvents: string[]   // IDs de eventos guardados
  location: string
}

/**
 * Estado global de autenticación (usado en AuthContext).
 */
export interface AuthState {
  user: User | null
  isAuthenticated: boolean
}
