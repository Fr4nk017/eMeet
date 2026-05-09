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

export function formatPrice(price: number | null): string {
  if (price === null) return 'Gratis'
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(price)
}

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
