import { useState } from 'react'
import { motion } from 'framer-motion'
import Layout from '../components/Layout'
import { MOCK_EVENTS } from '../data/mockEvents'
import { formatEventDate, formatPrice, CATEGORY_COLORS, CATEGORY_EMOJI } from '../data/mockEvents'
import { HiMapPin, HiClock } from 'react-icons/hi2'
import { HiBookmark } from 'react-icons/hi'

/**
 * SavedPage — Eventos que el usuario ha guardado.
 *
 * En esta versión mock, muestra los primeros 3 eventos como guardados
 * para que haya contenido visible por defecto.
 *
 * En producción, los IDs vendrán del contexto de usuario (AuthContext)
 * y se consultará la API para obtener los detalles.
 */
export default function SavedPage() {
  // Mock: los eventos con índice par están "guardados" por defecto
  const [savedEvents, setSavedEvents] = useState(
    MOCK_EVENTS.filter((_, i) => i % 2 === 0).map((e) => ({ ...e, isSaved: true })),
  )

  function handleRemove(id: string) {
    setSavedEvents((prev) => prev.filter((e) => e.id !== id))
  }

  return (
    <Layout headerTitle="Guardados">
      <div className="px-4 pt-4 pb-4">
        {savedEvents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
            <span className="text-5xl">🔖</span>
            <h2 className="text-white text-lg font-bold">Sin eventos guardados</h2>
            <p className="text-muted text-sm max-w-xs">
              Desliza el feed y toca el ícono de bookmark para guardar eventos que te interesen.
            </p>
          </div>
        ) : (
          <>
            <p className="text-muted text-xs mb-4">{savedEvents.length} eventos guardados</p>
            <div className="flex flex-col gap-3">
              {savedEvents.map((event) => (
                <motion.div
                  key={event.id}
                  layout
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-card rounded-2xl overflow-hidden border border-white/5 flex gap-0"
                >
                  {/* Imagen lateral */}
                  <img
                    src={event.imageUrl}
                    alt={event.title}
                    className="w-28 h-full object-cover flex-shrink-0"
                  />

                  {/* Contenido */}
                  <div className="flex-1 p-3 flex flex-col justify-between min-w-0">
                    <div>
                      <span
                        className={`${CATEGORY_COLORS[event.category]} text-white text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase`}
                      >
                        {CATEGORY_EMOJI[event.category]} {event.category}
                      </span>
                      <h3 className="text-white text-sm font-bold mt-1 leading-tight line-clamp-2">
                        {event.title}
                      </h3>
                    </div>

                    <div className="flex flex-col gap-1 mt-2">
                      <div className="flex items-center gap-1.5 text-muted text-xs">
                        <HiClock className="w-3.5 h-3.5 text-primary-light flex-shrink-0" />
                        <span className="truncate">{formatEventDate(event.date)}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-muted text-xs">
                        <HiMapPin className="w-3.5 h-3.5 text-primary-light flex-shrink-0" />
                        <span className="truncate">{event.location}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-2">
                      <span
                        className={`text-xs font-bold ${
                          event.price === null ? 'text-green-400' : 'text-primary-light'
                        }`}
                      >
                        {formatPrice(event.price)}
                      </span>

                      {/* Botón para quitar guardado */}
                      <button
                        onClick={() => handleRemove(event.id)}
                        className="w-8 h-8 rounded-full bg-surface flex items-center justify-center text-primary hover:bg-red-500/20 hover:text-red-400 transition-colors"
                        aria-label="Quitar guardado"
                      >
                        <HiBookmark className="w-4 h-4 fill-current" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </>
        )}
      </div>
    </Layout>
  )
}
