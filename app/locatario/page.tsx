'use client'

import { useAuth } from '@/src/context/AuthContext'
import { useLocatarioEvents } from '@/src/context/LocatarioEventsContext'
import { useRouter } from 'next/navigation'
import { FiLogOut, FiPlus, FiBarChart2, FiCalendar, FiAlertCircle, FiLoader, FiTrash2, FiHome, FiMapPin, FiNavigation } from 'react-icons/fi'
import { useEffect, useRef, useState } from 'react'
import type { EventCategory } from '@/src/types'

const EMPTY_FORM = {
  title: '',
  description: '',
  date: '',
  price: '',
  address: '',
  imageUrl: '',
  category: 'fiesta' as EventCategory,
}

export default function LocatarioPage() {
  const { user, logout } = useAuth()
  const { createLocatarioEvent, locatarioEvents, removeLocatarioEvent, isLoading } = useLocatarioEvents()
  const router = useRouter()

  const [showCreateEvent, setShowCreateEvent] = useState(false)
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [gpsStatus, setGpsStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [gpsCoords, setGpsCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [eventForm, setEventForm] = useState({
    ...EMPTY_FORM,
    address: user?.businessLocation ?? user?.location ?? '',
  })
  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Limpiar feedback automáticamente después de 4s
  useEffect(() => {
    if (!feedback) return
    if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current)
    feedbackTimerRef.current = setTimeout(() => setFeedback(null), 4000)
    return () => {
      if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current)
    }
  }, [feedback])

  const handleLogout = () => {
    logout()
    router.push('/auth')
  }

  const handleSubmitEvent = async () => {
    if (!eventForm.title.trim() || !eventForm.description.trim() || !eventForm.date) {
      setFeedback({ message: 'Completa al menos título, descripción y fecha.', type: 'error' })
      return
    }

    setIsSubmitting(true)
    try {
      await createLocatarioEvent({
        title: eventForm.title,
        description: eventForm.description,
        category: eventForm.category,
        date: eventForm.date,
        address: eventForm.address || user?.businessLocation || user?.location || 'Santiago, Chile',
        price: eventForm.price.trim() === '' ? null : Number(eventForm.price),
        imageUrl: eventForm.imageUrl,
        organizerName: user?.businessName || user?.name || '',
        organizerAvatar: user?.avatarUrl || 'https://i.pravatar.cc/150?img=32',
        lat: gpsCoords?.lat,
        lng: gpsCoords?.lng,
      })

      setEventForm({ ...EMPTY_FORM, address: user?.businessLocation ?? user?.location ?? '' })
      setGpsCoords(null)
      setGpsStatus('idle')
      setShowCreateEvent(false)
      setFeedback({ message: '¡Evento publicado! Ya aparece en el feed principal.', type: 'success' })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo crear el evento.'
      setFeedback({ message, type: 'error' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleGetGPS = () => {
    if (!navigator.geolocation) {
      setFeedback({ message: 'Tu navegador no soporta geolocalización.', type: 'error' })
      return
    }
    setGpsStatus('loading')
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords
        setGpsCoords({ lat: latitude, lng: longitude })
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&accept-language=es`,
          )
          const data = (await res.json()) as { display_name?: string }
          const addr = data.display_name ?? `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`
          setEventForm((prev) => ({ ...prev, address: addr }))
        } catch {
          setEventForm((prev) => ({ ...prev, address: `${latitude.toFixed(5)}, ${longitude.toFixed(5)}` }))
        }
        setGpsStatus('success')
      },
      () => {
        setGpsStatus('error')
        setFeedback({ message: 'No se pudo obtener tu ubicación. Verifica los permisos del navegador.', type: 'error' })
      },
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }

  const handleDelete = async (eventId: string) => {
    setDeletingId(eventId)
    try {
      await removeLocatarioEvent(eventId)
    } catch {
      setFeedback({ message: 'No se pudo eliminar el evento.', type: 'error' })
    } finally {
      setDeletingId(null)
    }
  }

  if (!user || user.role !== 'locatario') {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="text-center">
          <FiAlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Acceso Denegado</h1>
          <p className="text-muted mb-6">No tienes permisos para acceder a esta página</p>
          <button
            onClick={() => router.push('/chat')}
            className="bg-primary hover:bg-primary-dark text-white font-semibold py-2 px-6 rounded-lg"
          >
            Volver al inicio
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-surface">
      {/* Header */}
      <header className="bg-card border-b border-card sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Panel de Locatario</h1>
            <p className="text-sm text-muted">{user.businessName}</p>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/')}
              className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg transition-colors"
            >
              <FiHome size={18} />
              Ver feed
            </button>
            <button
              onClick={() => setShowCreateEvent(true)}
              className="flex items-center gap-2 bg-accent hover:bg-accent/80 text-black font-semibold px-4 py-2 rounded-lg transition-colors"
            >
              <FiPlus size={18} />
              Crear Evento
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 px-4 py-2 rounded-lg transition-colors"
            >
              <FiLogOut size={18} />
              Cerrar sesión
            </button>
          </div>
        </div>
      </header>

      {/* Contenido principal */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Bienvenida */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-white mb-2">Bienvenido, {user.name}</h2>
          <p className="text-muted">Gestiona tus eventos y promociones en {user.businessName}</p>
        </div>

        {/* Feedback global */}
        {feedback && (
          <div
            className={`mb-6 rounded-lg border px-4 py-3 text-sm transition-all flex items-center justify-between gap-4 ${
              feedback.type === 'success'
                ? 'border-green-500/20 bg-green-500/10 text-green-300'
                : 'border-red-500/20 bg-red-500/10 text-red-300'
            }`}
          >
            <span>{feedback.message}</span>
            {feedback.type === 'success' && (
              <button
                onClick={() => router.push('/')}
                className="flex items-center gap-1 font-semibold underline underline-offset-2 whitespace-nowrap hover:opacity-80"
              >
                <FiHome size={14} />
                Ir al feed
              </button>
            )}
          </div>
        )}

        {/* Stats */}
        {(() => {
          const withGps = locatarioEvents.filter((e) => e.lat != null && e.lng != null).length
          const free = locatarioEvents.filter((e) => e.price === null).length
          const paid = locatarioEvents.filter((e) => e.price !== null)
          const avgPrice = paid.length > 0
            ? Math.round(paid.reduce((sum, e) => sum + (e.price ?? 0), 0) / paid.length)
            : null

          return (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-card border border-card rounded-lg p-4">
                <p className="text-muted text-sm mb-2">Eventos Activos</p>
                <div className="text-3xl font-bold text-accent">
                  {isLoading ? <FiLoader className="animate-spin" size={28} /> : locatarioEvents.length}
                </div>
                <p className="text-xs text-muted mt-2">Publicados desde tu panel</p>
              </div>
              <div className="bg-card border border-card rounded-lg p-4">
                <p className="text-muted text-sm mb-2">Con Ubicación GPS</p>
                <div className="text-3xl font-bold text-primary">
                  {isLoading ? <FiLoader className="animate-spin" size={28} /> : withGps}
                </div>
                <p className="text-xs text-muted mt-2">Aparecen en el mapa del feed</p>
              </div>
              <div className="bg-card border border-card rounded-lg p-4">
                <p className="text-muted text-sm mb-2">Eventos Gratuitos</p>
                <div className="text-3xl font-bold text-green-400">
                  {isLoading ? <FiLoader className="animate-spin" size={28} /> : free}
                </div>
                <p className="text-xs text-muted mt-2">Sin costo de entrada</p>
              </div>
              <div className="bg-card border border-card rounded-lg p-4">
                <p className="text-muted text-sm mb-2">Precio Promedio</p>
                <div className="text-3xl font-bold text-orange-400">
                  {isLoading
                    ? <FiLoader className="animate-spin" size={28} />
                    : avgPrice != null
                      ? `$${avgPrice.toLocaleString('es-CL')}`
                      : '—'}
                </div>
                <p className="text-xs text-muted mt-2">
                  {paid.length > 0 ? `${paid.length} eventos de pago` : 'Sin eventos de pago'}
                </p>
              </div>
            </div>
          )
        })()}

        {/* Tabla de eventos */}
        <div className="bg-card border border-card rounded-lg overflow-hidden mb-8">
          <div className="px-6 py-4 border-b border-card flex items-center gap-2">
            <FiCalendar className="text-accent" size={20} />
            <h3 className="text-lg font-semibold text-white">Tus Eventos</h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-surface">
                <tr className="border-b border-card">
                  <th className="px-6 py-3 text-left text-sm font-semibold text-muted">Evento</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-muted">Fecha</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-muted">Precio</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-muted">GPS</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-muted">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {isLoading && (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-sm text-muted">
                      <FiLoader className="animate-spin inline mr-2" size={16} />
                      Cargando eventos...
                    </td>
                  </tr>
                )}
                {!isLoading && locatarioEvents.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-sm text-muted">
                      Aún no tienes eventos creados. Crea uno y aparecerá en el feed principal.
                    </td>
                  </tr>
                )}
                {!isLoading && locatarioEvents.map((event) => (
                  <tr key={event.id} className="border-b border-card/50 hover:bg-surface/50 transition-colors">
                    <td className="px-6 py-4 text-sm text-white font-medium">{event.title}</td>
                    <td className="px-6 py-4 text-sm text-muted">
                      {new Date(event.date).toLocaleString('es-CL')}
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold">
                      {event.price == null
                        ? <span className="text-green-400">Gratis</span>
                        : <span className="text-primary-light">${event.price.toLocaleString('es-CL')}</span>}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {event.lat != null && event.lng != null
                        ? <span className="flex items-center gap-1 text-green-400"><FiMapPin size={13} /> Sí</span>
                        : <span className="text-muted">—</span>}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <button
                        onClick={() => handleDelete(event.id)}
                        disabled={deletingId === event.id}
                        className="flex items-center gap-1 text-red-400 hover:text-red-300 transition-colors disabled:opacity-50"
                      >
                        {deletingId === event.id
                          ? <FiLoader className="animate-spin" size={14} />
                          : <FiTrash2 size={14} />
                        }
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Cupones + Analytics */}
        {(() => {
          const total = locatarioEvents.length
          const withGps = locatarioEvents.filter((e) => e.lat != null && e.lng != null).length
          const free = locatarioEvents.filter((e) => e.price === null).length
          const paid = total - free
          const gpsPercent = total > 0 ? Math.round((withGps / total) * 100) : 0
          const freePercent = total > 0 ? Math.round((free / total) * 100) : 0

          const categoryCount = locatarioEvents.reduce<Record<string, number>>((acc, e) => {
            acc[e.category] = (acc[e.category] ?? 0) + 1
            return acc
          }, {})
          const topCategories = Object.entries(categoryCount)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 4)

          return (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Cupones — próximamente */}
              <div className="bg-card border border-card rounded-lg p-6 flex flex-col items-center justify-center gap-3 text-center min-h-[200px]">
                <span className="text-4xl">🎟️</span>
                <h3 className="text-lg font-semibold text-white">Cupones de Descuento</h3>
                <span className="inline-block rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary-light">
                  Próximamente
                </span>
                <p className="max-w-xs text-sm text-muted">
                  Pronto podrás crear y gestionar cupones de descuento para tus eventos directamente desde aquí.
                </p>
              </div>

              {/* Analítica real derivada de los eventos */}
              <div className="bg-card border border-card rounded-lg p-6">
                <div className="flex items-center gap-2 mb-4">
                  <FiBarChart2 className="text-accent" size={20} />
                  <h3 className="text-lg font-semibold text-white">Resumen de Eventos</h3>
                </div>

                {total === 0 ? (
                  <p className="text-sm text-muted">Crea tu primer evento para ver estadísticas aquí.</p>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-muted">Con ubicación GPS</span>
                        <span className="text-sm font-bold text-primary-light">{withGps} / {total}</span>
                      </div>
                      <div className="w-full bg-surface rounded-full h-2">
                        <div className="bg-primary h-2 rounded-full transition-all" style={{ width: `${gpsPercent}%` }} />
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-muted">Eventos gratuitos</span>
                        <span className="text-sm font-bold text-green-400">{free} gratis · {paid} de pago</span>
                      </div>
                      <div className="w-full bg-surface rounded-full h-2">
                        <div className="bg-green-500 h-2 rounded-full transition-all" style={{ width: `${freePercent}%` }} />
                      </div>
                    </div>

                    {topCategories.length > 0 && (
                      <div>
                        <p className="text-sm text-muted mb-2">Categorías más usadas</p>
                        <div className="flex flex-wrap gap-2">
                          {topCategories.map(([cat, count]) => (
                            <span
                              key={cat}
                              className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary-light"
                            >
                              {cat} · {count}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )
        })()}
      </main>

      {/* Modal crear evento */}
      {showCreateEvent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-lg max-w-lg w-full p-8 max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-white mb-6">Crear Nuevo Evento</h2>

            <div className="space-y-4 mb-6">
              <input
                type="text"
                placeholder="Nombre del evento *"
                value={eventForm.title}
                onChange={(e) => setEventForm((prev) => ({ ...prev, title: e.target.value }))}
                className="w-full bg-surface border border-card focus:border-primary outline-none py-3 px-4 rounded-lg text-white placeholder-muted"
              />
              <textarea
                placeholder="Descripción del evento *"
                rows={3}
                value={eventForm.description}
                onChange={(e) => setEventForm((prev) => ({ ...prev, description: e.target.value }))}
                className="w-full bg-surface border border-card focus:border-primary outline-none py-3 px-4 rounded-lg text-white placeholder-muted resize-none"
              />
              <select
                value={eventForm.category}
                onChange={(e) => setEventForm((prev) => ({ ...prev, category: e.target.value as EventCategory }))}
                className="w-full bg-surface border border-card focus:border-primary outline-none py-3 px-4 rounded-lg text-white"
              >
                <option value="fiesta">Fiesta</option>
                <option value="musica">Música</option>
                <option value="gastronomia">Gastronomía</option>
                <option value="networking">Networking</option>
                <option value="arte">Arte</option>
                <option value="cultura">Cultura</option>
                <option value="teatro">Teatro</option>
                <option value="deporte">Deporte</option>
              </select>
              <input
                type="datetime-local"
                value={eventForm.date}
                onChange={(e) => setEventForm((prev) => ({ ...prev, date: e.target.value }))}
                className="w-full bg-surface border border-card focus:border-primary outline-none py-3 px-4 rounded-lg text-white"
              />
              <div className="relative">
                <input
                  type="text"
                  placeholder="Dirección"
                  value={eventForm.address}
                  onChange={(e) => {
                    setEventForm((prev) => ({ ...prev, address: e.target.value }))
                    setGpsCoords(null)
                    setGpsStatus('idle')
                  }}
                  className="w-full bg-surface border border-card focus:border-primary outline-none py-3 pl-4 pr-28 rounded-lg text-white placeholder-muted"
                />
                <button
                  type="button"
                  onClick={handleGetGPS}
                  disabled={gpsStatus === 'loading'}
                  title="Usar mi ubicación GPS"
                  className={`absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors disabled:opacity-60 ${
                    gpsStatus === 'success'
                      ? 'bg-green-500/20 text-green-300'
                      : 'bg-primary/20 hover:bg-primary/30 text-primary-light'
                  }`}
                >
                  {gpsStatus === 'loading' ? (
                    <FiLoader className="animate-spin" size={13} />
                  ) : gpsStatus === 'success' ? (
                    <FiMapPin size={13} />
                  ) : (
                    <FiNavigation size={13} />
                  )}
                  {gpsStatus === 'loading' ? 'Buscando...' : gpsStatus === 'success' ? 'GPS ✓' : 'GPS'}
                </button>
              </div>
              <input
                type="url"
                placeholder="URL de imagen (opcional)"
                value={eventForm.imageUrl}
                onChange={(e) => setEventForm((prev) => ({ ...prev, imageUrl: e.target.value }))}
                className="w-full bg-surface border border-card focus:border-primary outline-none py-3 px-4 rounded-lg text-white placeholder-muted"
              />
              <input
                type="number"
                placeholder="Precio (vacío = gratis)"
                value={eventForm.price}
                onChange={(e) => setEventForm((prev) => ({ ...prev, price: e.target.value }))}
                className="w-full bg-surface border border-card focus:border-primary outline-none py-3 px-4 rounded-lg text-white placeholder-muted"
              />
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => setShowCreateEvent(false)}
                disabled={isSubmitting}
                className="flex-1 bg-surface hover:bg-surface/80 text-white py-2 rounded-lg transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleSubmitEvent}
                disabled={isSubmitting}
                className="flex-1 flex items-center justify-center gap-2 bg-accent hover:bg-accent/80 text-black font-semibold py-2 rounded-lg transition-colors disabled:opacity-60"
              >
                {isSubmitting && <FiLoader className="animate-spin" size={16} />}
                {isSubmitting ? 'Creando...' : 'Crear Evento'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
