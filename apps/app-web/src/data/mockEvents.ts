import type { Event } from '../types'

/**
 * Datos mock de eventos para desarrollo.
 * Simula la respuesta de una futura API REST.
 * Las imágenes usan Unsplash (CDN público, sin clave de API).
 */
export const MOCK_EVENTS: Event[] = [
  {
    id: '1',
    title: 'Jazz Night en La Bodeguita',
    description:
      'Una noche íntima con los mejores músicos de jazz de la ciudad. Reserva tu mesa y disfruta de coctelería artesanal mientras el trío en vivo llena el ambiente.',
    category: 'musica',
    source: 'locatario',
    date: '2026-03-22T21:00:00',
    location: 'La Bodeguita del Medio',
    address: 'Av. Providencia 1234, Santiago',
    distance: 0.8,
    price: 5000,
    imageUrl: 'https://images.unsplash.com/photo-1415201364774-f6f0bb35f28f?w=800&q=80',
    organizerName: 'La Bodeguita del Medio',
    organizerAvatar: 'https://i.pravatar.cc/150?img=1',
    attendees: 42,
    capacity: 80,
    tags: ['jazz', 'en vivo', 'coctelería', 'íntimo'],
    isLiked: false,
    isSaved: false,
  },
  {
    id: '2',
    title: 'Brunch Emprendedor — Networking Dominical',
    description:
      'Conecta con emprendedores, freelancers y creativos de Santiago. Café de especialidad, buen rollo y conversaciones que mueven proyectos. Cupos muy limitados.',
    category: 'networking',
    source: 'locatario',
    date: '2026-03-23T11:00:00',
    location: 'Café Quínoa',
    address: 'Loreto 56, Providencia',
    distance: 1.2,
    price: null,
    imageUrl: 'https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=800&q=80',
    organizerName: 'Startup Meetup SCL',
    organizerAvatar: 'https://i.pravatar.cc/150?img=2',
    attendees: 18,
    capacity: 25,
    tags: ['networking', 'emprendimiento', 'brunch', 'gratuito'],
    isLiked: false,
    isSaved: false,
  },
  {
    id: '3',
    title: 'Showcase Electrónica — Club Baum',
    description:
      'Cuatro DJs nacionales en una misma noche. Techno, house y electrónica experimental en la pista más oscura de Santiago. Puertas abren a las 23:00.',
    category: 'fiesta',
    source: 'locatario',
    date: '2026-03-22T23:00:00',
    location: 'Club Baum',
    address: 'Av. Baquedano 0120, Santiago',
    distance: 2.5,
    price: 12000,
    imageUrl: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800&q=80',
    organizerName: 'Baum oficial',
    organizerAvatar: 'https://i.pravatar.cc/150?img=3',
    attendees: 210,
    capacity: 350,
    tags: ['techno', 'house', 'electrónica', 'club'],
    isLiked: false,
    isSaved: false,
  },
  {
    id: '4',
    title: 'Exposición: "Fracturas" — Arte contemporáneo',
    description:
      'Muestra individual de la artista Valentina Rojas. Collage, fotografía intervenida y textil exploran la memoria y el territorio. Entrada libre hasta las 20:00.',
    category: 'arte',
    source: 'locatario',
    date: '2026-03-21T18:00:00',
    location: 'GAM — Centro Cultural',
    address: 'Av. Libertador Bernardo O\'Higgins 227',
    distance: 3.1,
    price: null,
    imageUrl: 'https://images.unsplash.com/photo-1531913764164-f85c52e6e654?w=800&q=80',
    organizerName: 'GAM Santiago',
    organizerAvatar: 'https://i.pravatar.cc/150?img=4',
    attendees: 95,
    capacity: null,
    tags: ['arte', 'exposición', 'gratuito', 'GAM'],
    isLiked: false,
    isSaved: false,
  },
  {
    id: '5',
    title: 'Cena Maridaje — Temporada Otoño',
    description:
      'Chef Pablo Concha presenta un menú de 5 tiempos con maridaje de vinos chilenos de viñas boutique. Plazas limitadas, reserva obligatoria.',
    category: 'gastronomia',
    source: 'locatario',
    date: '2026-03-28T20:00:00',
    location: 'Restaurante Nómada',
    address: 'General del Canto 45, Providencia',
    distance: 1.8,
    price: 55000,
    imageUrl: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&q=80',
    organizerName: 'Restaurante Nómada',
    organizerAvatar: 'https://i.pravatar.cc/150?img=5',
    attendees: 14,
    capacity: 20,
    tags: ['gastronomía', 'vinos', 'maridaje', 'chef'],
    isLiked: false,
    isSaved: false,
  },
  {
    id: '6',
    title: 'Open Mic — Poesía y Música Folclórica',
    description:
      'Escenario abierto para poetas, cantautores y músicos folklóricos. Cualquiera puede inscribirse para presentar 5 minutos. Ambiente familiar y relajado.',
    category: 'cultura',
    source: 'locatario',
    date: '2026-03-24T19:30:00',
    location: 'Casa de la Cultura Ñuñoa',
    address: 'Irarrázaval 3635, Ñuñoa',
    distance: 4.4,
    price: null,
    imageUrl: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800&q=80',
    organizerName: 'Casa de la Cultura Ñuñoa',
    organizerAvatar: 'https://i.pravatar.cc/150?img=6',
    attendees: 31,
    capacity: 60,
    tags: ['open mic', 'poesía', 'folklore', 'gratuito'],
    isLiked: false,
    isSaved: false,
  },
  {
    id: '7',
    title: 'Yoga en el Parque — Domingo AM',
    description:
      'Clase de yoga al aire libre en el Parque Bustamante. Nivel principiante-intermedio. Trae tu mat y ropa cómoda. El instructor Paula guía la sesión de 75 min.',
    category: 'deporte',
    source: 'locatario',
    date: '2026-03-23T09:00:00',
    location: 'Parque Bustamante',
    address: 'Av. Bustamante 964, Providencia',
    distance: 0.6,
    price: 3000,
    imageUrl: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800&q=80',
    organizerName: 'Paula Yoga SCL',
    organizerAvatar: 'https://i.pravatar.cc/150?img=7',
    attendees: 22,
    capacity: 30,
    tags: ['yoga', 'parque', 'bienestar', 'domingo'],
    isLiked: false,
    isSaved: false,
  },
  {
    id: '8',
    title: 'Obra: "El Principito" — Teatro Itinerante',
    description:
      'Adaptación visual del clásico de Saint-Exupéry con títeres gigantes y música en vivo. Para toda la familia. Función única al aire libre en la plaza.',
    category: 'teatro',
    source: 'locatario',
    date: '2026-03-29T17:00:00',
    location: 'Plaza Ñuñoa',
    address: 'Av. Irarrázaval esq. Carlos Antúnez',
    distance: 5.0,
    price: null,
    imageUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&q=80',
    organizerName: 'Compañía Títeres del Sur',
    organizerAvatar: 'https://i.pravatar.cc/150?img=8',
    attendees: 0,
    capacity: null,
    tags: ['teatro', 'familiar', 'gratuito', 'al aire libre'],
    isLiked: false,
    isSaved: false,
  },
]

/**
 * Formatea la fecha de un evento en texto legible.
 * Ej: "Sáb 22 Mar · 21:00"
 */
export function formatEventDate(isoDate: string): string {
  const date = new Date(isoDate)
  return date.toLocaleDateString('es-CL', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }) + ' · ' + date.toLocaleTimeString('es-CL', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * Formatea el precio de un evento.
 * Devuelve "Gratis" si el precio es null.
 */
export function formatPrice(price: number | null): string {
  if (price === null) return 'Gratis'
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(price)
}

/**
 * Devuelve el color de fondo asociado a cada categoría (para badges).
 */
export const CATEGORY_COLORS: Record<string, string> = {
  gastronomia: 'bg-orange-500',
  musica: 'bg-purple-600',
  cultura: 'bg-cyan-600',
  networking: 'bg-blue-600',
  deporte: 'bg-green-600',
  fiesta: 'bg-pink-600',
  teatro: 'bg-yellow-600',
  arte: 'bg-rose-600',
}

/**
 * Devuelve el emoji representativo de cada categoría.
 */
export const CATEGORY_EMOJI: Record<string, string> = {
  gastronomia: '🍽️',
  musica: '🎵',
  cultura: '🎭',
  networking: '🤝',
  deporte: '⚡',
  fiesta: '🎉',
  teatro: '🎬',
  arte: '🎨',
}
