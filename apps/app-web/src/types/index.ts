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
  videoUrl?: string | null
  websiteUrl?: string | null
  organizerName: string
  organizerAvatar: string
  attendees: number
  capacity: number | null
  tags: string[]
  isLiked?: boolean
  isSaved?: boolean
  rating?: number          // 0-5, de Google Maps (opcional — no aplica a eventos mock)
  isOpen?: boolean | null  // null = sin info
  lat?: number             // coordenada real del evento (si fue geolocado)
  lng?: number
}

/** Roles disponibles en la plataforma */
export type UserRole = 'user' | 'admin' | 'locatario'

/**
 * Perfil del usuario autenticado.
 */
export interface User {
  id: string
  name: string
  email: string
  role: UserRole
  avatarUrl?: string
  bio?: string
  interests: EventCategory[]
  likedEvents: string[]   // IDs de eventos con like
  savedEvents: string[]   // IDs de eventos guardados
  location?: string
  createdAt?: string // ISO 8601
  isVerified?: boolean
  phone?: string
  businessName?: string
  businessLocation?: string
}

/**
 * Estado global de autenticación (usado en AuthContext).
 */
export interface AuthState {
  user: User | null
  isAuthenticated: boolean
}

// ─── Google Maps Places ──────────────────────────────────────────────────────

/** Tipos de lugar soportados por la integración de Google Maps Places. */
export type PlaceType =
  | 'restaurant'
  | 'bar'
  | 'night_club'
  | 'cafe'
  | 'liquor_store'
  | 'food'

/**
 * Lugar real extraído desde Google Maps Places API.
 *
 * Convención de `photoUrl`:
 *   undefined → aún no se ha consultado el detalle
 *   null      → se consultó y no hay foto disponible
 *   string    → URL de la foto obtenida
 */
export interface ScrapedPlace {
  placeId: string
  name: string
  address: string
  type: PlaceType
  category: string
  rating: number
  totalRatings: number
  priceLevel: number | null
  isOpen: boolean | null
  position: { lat: number; lng: number }
  photoUrl?: string | null
  website?: string | null
  phone?: string | null
  openingHours?: string[] | null
}

// ─── Chat comunitario ────────────────────────────────────────────────────────

/** Mensaje dentro de una sala de chat. */
export interface ChatMessage {
  id: string
  roomId: string
  senderId: string
  senderName: string
  senderAvatar: string
  text: string
  timestamp: string  // ISO 8601
}

/**
 * Sala de chat comunitaria asociada a un evento/lugar.
 * Se crea automáticamente cuando el primer usuario le da like al lugar.
 */
export interface ChatRoom {
  id: string            // igual al placeId / eventId
  eventTitle: string
  eventImageUrl: string
  eventAddress: string
  memberCount: number
  lastMessage: ChatMessage | null
  unreadCount: number
}
