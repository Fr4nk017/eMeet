'use client'

import { useAuth } from '@/src/context/AuthContext'
import { useAdmin } from '@/src/context/AdminContext'
import { AdminProvider } from '@/src/context/AdminContext'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import {
  LogOut as FiLogOut,
  Users as FiUsers,
  BarChart3 as FiBarChart,
  CircleAlert as FiAlertCircle,
  Trash2 as FiTrash2,
  RefreshCw as FiRefreshCw,
} from 'lucide-react'

function AdminPageContent() {
  const { user, logout } = useAuth()
  const { users, events, statistics, isLoadingUsers, isLoadingEvents, isLoadingStats, fetchUsers, fetchEvents, fetchStatistics, deleteUser, deleteEvent, error } = useAdmin()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'events'>('overview')

  // Verificar que sea admin
  if (!user || user.role !== 'admin') {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="text-center">
          <FiAlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Acceso Denegado</h1>
          <p className="text-muted mb-6">No tienes permisos para acceder a esta página</p>
          <button
            onClick={() => router.push('/')}
            className="bg-primary hover:bg-primary-dark text-white font-semibold py-2 px-6 rounded-lg"
          >
            Volver al inicio
          </button>
        </div>
      </div>
    )
  }

  // Cargar datos al montar el componente
  useEffect(() => {
    fetchUsers()
    fetchEvents()
    fetchStatistics()
  }, [fetchUsers, fetchEvents, fetchStatistics])

  const handleLogout = async () => {
    await logout()
    router.push('/auth')
  }

  return (
    <div className="min-h-screen bg-surface">
      {/* Header */}
      <header className="bg-card border-b border-card sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Panel de Administración</h1>
            <p className="text-sm text-muted">Gestión de eMeet</p>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 px-4 py-2 rounded-lg transition-colors"
          >
            <FiLogOut size={18} />
            Cerrar sesión
          </button>
        </div>
      </header>

      {/* Contenido principal */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Error message */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Bienvenida */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-white mb-2">Bienvenido, {user.name}</h2>
          <p className="text-muted">Administra todos los aspectos de la plataforma eMeet</p>
        </div>

        {/* Estadísticas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-card border border-card rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted text-sm">Total de Usuarios</p>
                <p className="text-3xl font-bold text-white mt-2">{isLoadingStats ? '-' : statistics?.totalUsers ?? 0}</p>
              </div>
              <FiUsers className="text-primary text-4xl opacity-20" />
            </div>
          </div>

          <div className="bg-card border border-card rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted text-sm">Total de Eventos</p>
                <p className="text-3xl font-bold text-white mt-2">{isLoadingStats ? '-' : statistics?.totalEvents ?? 0}</p>
              </div>
              <FiBarChart className="text-accent text-4xl opacity-20" />
            </div>
          </div>

          <div className="bg-card border border-card rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted text-sm">Total de Likes</p>
                <p className="text-3xl font-bold text-white mt-2">{isLoadingStats ? '-' : statistics?.totalLikes ?? 0}</p>
              </div>
              <FiBarChart className="text-green-400 text-4xl opacity-20" />
            </div>
          </div>

          <div className="bg-card border border-card rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted text-sm">Usuarios Banneados</p>
                <p className="text-3xl font-bold text-white mt-2">{isLoadingStats ? '-' : statistics?.bannedUsers ?? 0}</p>
              </div>
              <FiAlertCircle className="text-red-400 text-4xl opacity-20" />
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6 flex gap-4 border-b border-card">
          {[
            { id: 'overview' as const, label: 'Resumen', icon: FiBarChart },
            { id: 'users' as const, label: 'Usuarios', icon: FiUsers },
            { id: 'events' as const, label: 'Eventos', icon: FiBarChart },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 font-medium transition-colors border-b-2 ${
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Contenido por tab */}
        {activeTab === 'overview' && (
          <div className="bg-card border border-card rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Resumen General</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-white font-semibold mb-3">Información del Sistema</h4>
                <div className="space-y-2 text-sm text-muted">
                  <p>Usuarios activos: <span className="text-white font-medium">{statistics?.totalUsers ?? 0}</span></p>
                  <p>Eventos en la plataforma: <span className="text-white font-medium">{statistics?.totalEvents ?? 0}</span></p>
                  <p>Interacciones totales: <span className="text-white font-medium">{statistics?.totalLikes ?? 0}</span></p>
                  <p>Última actualización: <span className="text-white font-medium">{statistics?.timestamp ? new Date(statistics.timestamp).toLocaleString() : '-'}</span></p>
                </div>
              </div>
              <div>
                <h4 className="text-white font-semibold mb-3">Acciones Rápidas</h4>
                <div className="space-y-2">
                  <button
                    onClick={fetchStatistics}
                    className="w-full bg-primary/10 hover:bg-primary/20 text-primary px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
                  >
                    <FiRefreshCw size={16} />
                    Actualizar Datos
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'users' && (
          <div className="bg-card border border-card rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-card flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">Gestión de Usuarios</h3>
              <button
                onClick={fetchUsers}
                disabled={isLoadingUsers}
                className="bg-primary/10 hover:bg-primary/20 text-primary px-4 py-2 rounded-lg transition-colors text-sm flex items-center gap-2"
              >
                <FiRefreshCw size={16} className={isLoadingUsers ? 'animate-spin' : ''} />
                Actualizar
              </button>
            </div>

            <div className="overflow-x-auto">
              {isLoadingUsers ? (
                <div className="p-6 text-center text-muted">Cargando usuarios...</div>
              ) : users.length > 0 ? (
                <table className="w-full">
                  <thead className="bg-surface">
                    <tr className="border-b border-card">
                      <th className="px-6 py-3 text-left text-sm font-semibold text-muted">Nombre</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-muted">Email</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-muted">Rol</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-muted">Estado</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-muted">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.id} className="border-b border-card/50 hover:bg-surface/50 transition-colors">
                        <td className="px-6 py-4 text-sm text-white">{u.name}</td>
                        <td className="px-6 py-4 text-sm text-muted">{u.email}</td>
                        <td className="px-6 py-4 text-sm">
                          <span className="px-3 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">
                            {u.role}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                            u.is_banned
                              ? 'bg-red-500/10 text-red-400'
                              : 'bg-green-500/10 text-green-400'
                          }`}>
                            {u.is_banned ? 'Banneado' : 'Activo'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <button
                            onClick={() => deleteUser(u.id)}
                            className="text-red-400 hover:text-red-300 transition-colors flex items-center gap-1"
                          >
                            <FiTrash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="p-6 text-center text-muted">No hay usuarios</div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'events' && (
          <div className="bg-card border border-card rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-card flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">Gestión de Eventos</h3>
              <button
                onClick={fetchEvents}
                disabled={isLoadingEvents}
                className="bg-primary/10 hover:bg-primary/20 text-primary px-4 py-2 rounded-lg transition-colors text-sm flex items-center gap-2"
              >
                <FiRefreshCw size={16} className={isLoadingEvents ? 'animate-spin' : ''} />
                Actualizar
              </button>
            </div>

            <div className="overflow-x-auto">
              {isLoadingEvents ? (
                <div className="p-6 text-center text-muted">Cargando eventos...</div>
              ) : events.length > 0 ? (
                <table className="w-full">
                  <thead className="bg-surface">
                    <tr className="border-b border-card">
                      <th className="px-6 py-3 text-left text-sm font-semibold text-muted">Título</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-muted">Ubicación</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-muted">Fecha</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-muted">Organizador</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-muted">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {events.map((e) => (
                      <tr key={e.id} className="border-b border-card/50 hover:bg-surface/50 transition-colors">
                        <td className="px-6 py-4 text-sm text-white truncate">{e.title}</td>
                        <td className="px-6 py-4 text-sm text-muted truncate">{e.location}</td>
                        <td className="px-6 py-4 text-sm text-muted">{new Date(e.date).toLocaleDateString()}</td>
                        <td className="px-6 py-4 text-sm text-muted">{e.created_by}</td>
                        <td className="px-6 py-4 text-sm">
                          <button
                            onClick={() => deleteEvent(e.id)}
                            className="text-red-400 hover:text-red-300 transition-colors flex items-center gap-1"
                          >
                            <FiTrash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="p-6 text-center text-muted">No hay eventos</div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

export default function AdminPage() {
  return (
    <AdminProvider>
      <AdminPageContent />
    </AdminProvider>
  )
}
