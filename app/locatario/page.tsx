'use client'

import { useAuth } from '@/src/context/AuthContext'
import { useRouter } from 'next/navigation'
import { FiLogOut, FiPlus, FiBarChart2, FiCalendar, FiAlertCircle } from 'react-icons/fi'
import { useState } from 'react'

export default function LocatarioPage() {
  const { user, logout } = useAuth()
  const router = useRouter()
  const [showCreateEvent, setShowCreateEvent] = useState(false)

  const handleLogout = () => {
    logout()
    router.push('/auth')
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

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-card border border-card rounded-lg p-4">
            <p className="text-muted text-sm mb-2">Eventos Activos</p>
            <div className="text-3xl font-bold text-accent">3</div>
            <p className="text-xs text-muted mt-2">+1 en 7 días</p>
          </div>
          <div className="bg-card border border-card rounded-lg p-4">
            <p className="text-muted text-sm mb-2">Asistentes Totales</p>
            <div className="text-3xl font-bold text-primary">234</div>
            <p className="text-xs text-muted mt-2">+45 en 7 días</p>
          </div>
          <div className="bg-card border border-card rounded-lg p-4">
            <p className="text-muted text-sm mb-2">Cupones Disponibles</p>
            <div className="text-3xl font-bold text-orange-400">12</div>
            <p className="text-xs text-muted mt-2">+8 redeemidos</p>
          </div>
          <div className="bg-card border border-card rounded-lg p-4">
            <p className="text-muted text-sm mb-2">Ingresos Estimados</p>
            <div className="text-3xl font-bold text-green-400">$2,340</div>
            <p className="text-xs text-muted mt-2">+$340 en 7 días</p>
          </div>
        </div>

        {/* Eventos */}
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
                  <th className="px-6 py-3 text-left text-sm font-semibold text-muted">Asistentes</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-muted">Estado</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-muted">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { name: 'Happy Hour Viernes', date: '15 Abr, 18:00', attendees: 145, status: 'Activo' },
                  { name: 'Show en Vivo', date: '22 Abr, 21:00', attendees: 89, status: 'Activo' },
                  { name: 'Noche de Samba', date: '29 Abr, 20:00', attendees: 0, status: 'Borrador' },
                ].map((event, i) => (
                  <tr key={i} className="border-b border-card/50 hover:bg-surface/50 transition-colors">
                    <td className="px-6 py-4 text-sm text-white font-medium">{event.name}</td>
                    <td className="px-6 py-4 text-sm text-muted">{event.date}</td>
                    <td className="px-6 py-4 text-sm text-accent font-semibold">{event.attendees}</td>
                    <td className="px-6 py-4 text-sm">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        event.status === 'Activo' ? 'bg-green-500/10 text-green-400' : 'bg-gray-500/10 text-gray-400'
                      }`}>
                        {event.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <button className="text-primary hover:text-primary-light transition-colors mr-3">Editar</button>
                      <button className="text-red-400 hover:text-red-300 transition-colors">Eliminar</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Cupones */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Cupones disponibles */}
          <div className="bg-card border border-card rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Crea Cupones de Descuento</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-muted mb-2">Descripción del cupón</label>
                <input
                  type="text"
                  placeholder="Ej: Descuento de bienvenida"
                  className="w-full bg-surface border border-card hover:border-primary/30 focus:border-primary outline-none py-2 px-3 rounded-lg text-white placeholder-muted transition-colors"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-muted mb-2">Descuento (%)</label>
                  <input
                    type="number"
                    placeholder="20"
                    className="w-full bg-surface border border-card hover:border-primary/30 focus:border-primary outline-none py-2 px-3 rounded-lg text-white placeholder-muted transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm text-muted mb-2">Cantidad</label>
                  <input
                    type="number"
                    placeholder="50"
                    className="w-full bg-surface border border-card hover:border-primary/30 focus:border-primary outline-none py-2 px-3 rounded-lg text-white placeholder-muted transition-colors"
                  />
                </div>
              </div>
              <button className="w-full bg-accent hover:bg-accent/80 text-black font-semibold py-2 px-4 rounded-lg transition-colors">
                Crear Cupón
              </button>
            </div>
          </div>

          {/* Analytics rápido */}
          <div className="bg-card border border-card rounded-lg p-6">
            <div className="flex items-center gap-2 mb-4">
              <FiBarChart2 className="text-accent" size={20} />
              <h3 className="text-lg font-semibold text-white">Analítica Rápida</h3>
            </div>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted">Visitas a perfil</span>
                  <span className="text-lg font-bold text-accent">342</span>
                </div>
                <div className="w-full bg-surface rounded-full h-2">
                  <div className="bg-accent h-2 rounded-full" style={{ width: '75%' }} />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted">Tasa de conversión</span>
                  <span className="text-lg font-bold text-primary">68%</span>
                </div>
                <div className="w-full bg-surface rounded-full h-2">
                  <div className="bg-primary h-2 rounded-full" style={{ width: '68%' }} />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted">Satisfacción</span>
                  <span className="text-lg font-bold text-green-400">4.8/5.0</span>
                </div>
                <div className="flex gap-1">
                  {[...Array(5)].map((_, i) => (
                    <span key={i} className="text-xl">⭐</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Modal crear evento (simplificado) */}
      {showCreateEvent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-lg max-w-lg w-full p-8 max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-white mb-6">Crear Nuevo Evento</h2>
            <div className="space-y-4 mb-6">
              <input
                type="text"
                placeholder="Nombre del evento"
                className="w-full bg-surface border border-card focus:border-primary outline-none py-3 px-4 rounded-lg text-white placeholder-muted"
              />
              <textarea
                placeholder="Descripción del evento"
                rows={3}
                className="w-full bg-surface border border-card focus:border-primary outline-none py-3 px-4 rounded-lg text-white placeholder-muted resize-none"
              />
              <input
                type="datetime-local"
                className="w-full bg-surface border border-card focus:border-primary outline-none py-3 px-4 rounded-lg text-white"
              />
              <input
                type="number"
                placeholder="Precio (0 = gratis)"
                className="w-full bg-surface border border-card focus:border-primary outline-none py-3 px-4 rounded-lg text-white placeholder-muted"
              />
            </div>
            <div className="flex gap-4">
              <button
                onClick={() => setShowCreateEvent(false)}
                className="flex-1 bg-card hover:bg-card/80 text-white py-2 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  setShowCreateEvent(false)
                  alert('Evento creado exitosamente!')
                }}
                className="flex-1 bg-accent hover:bg-accent/80 text-black font-semibold py-2 rounded-lg transition-colors"
              >
                Crear Evento
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
