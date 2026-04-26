'use client'

import { useAuth } from '@/src/context/AuthContext'
import { useRouter } from 'next/navigation'
import { FiLogOut, FiUsers, FiBarChart, FiAlertCircle, FiSettings } from 'react-icons/fi'

export default function AdminPage() {
  const { user, logout } = useAuth()
  const router = useRouter()

  const handleLogout = () => {
    logout()
    router.push('/auth')
  }

  if (!user || user.role !== 'admin') {
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
        {/* Bienvenida */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-white mb-2">Bienvenido, {user.name}</h2>
          <p className="text-muted">Administra todos los aspectos de la plataforma eMeet</p>
        </div>

        {/* Grid de opciones */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {/* Card: Usuarios */}
          <div className="bg-card border border-card hover:border-primary/30 rounded-lg p-6 cursor-pointer hover:shadow-lg transition-all">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-primary/10 rounded-lg mb-4">
              <FiUsers className="text-primary" size={24} />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Usuarios</h3>
            <p className="text-sm text-muted mb-4">Gestiona usuarios, roles y permisos</p>
            <div className="text-2xl font-bold text-accent">1.234</div>
            <p className="text-xs text-muted mt-1">+12% este mes</p>
          </div>

          {/* Card: Eventos */}
          <div className="bg-card border border-card hover:border-primary/30 rounded-lg p-6 cursor-pointer hover:shadow-lg transition-all">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-accent/10 rounded-lg mb-4">
              <FiBarChart className="text-accent" size={24} />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Eventos</h3>
            <p className="text-sm text-muted mb-4">Revisa y modera eventos publicados</p>
            <div className="text-2xl font-bold text-accent">456</div>
            <p className="text-xs text-muted mt-1">+8 nuevos hoy</p>
          </div>

          {/* Card: Reportes */}
          <div className="bg-card border border-card hover:border-primary/30 rounded-lg p-6 cursor-pointer hover:shadow-lg transition-all">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-orange-500/10 rounded-lg mb-4">
              <FiAlertCircle className="text-orange-400" size={24} />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Reportes</h3>
            <p className="text-sm text-muted mb-4">Revisa reportes y quejas de usuarios</p>
            <div className="text-2xl font-bold text-orange-400">23</div>
            <p className="text-xs text-muted mt-1">Pendientes de revisión</p>
          </div>
        </div>

        {/* Tabla de estadísticas */}
        <div className="bg-card border border-card rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-card">
            <h3 className="text-lg font-semibold text-white">Actividad Reciente</h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-surface">
                <tr className="border-b border-card">
                  <th className="px-6 py-3 text-left text-sm font-semibold text-muted">Tipo</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-muted">Descripción</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-muted">Usuario</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-muted">Hora</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-muted">Estado</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { type: 'Nuevo evento', desc: 'Club Social Bellavista creó un evento', user: 'Carlos R.', time: 'Hace 2h', status: 'Pendiente' },
                  { type: 'Reporte', desc: 'Usuario reportó comentario inapropiado', user: 'Juan P.', time: 'Hace 4h', status: 'Nuevo' },
                  { type: 'Registro', desc: 'Nuevo usuario se registró', user: 'María L.', time: 'Hace 6h', status: 'Completado' },
                  { type: 'Evento cancelado', desc: 'Evento cancelado por organizador', user: 'Admin', time: 'Hace 8h', status: 'Completado' },
                ].map((item, i) => (
                  <tr key={i} className="border-b border-card/50 hover:bg-surface/50 transition-colors">
                    <td className="px-6 py-4 text-sm text-primary font-medium">{item.type}</td>
                    <td className="px-6 py-4 text-sm text-white">{item.desc}</td>
                    <td className="px-6 py-4 text-sm text-muted">{item.user}</td>
                    <td className="px-6 py-4 text-sm text-muted">{item.time}</td>
                    <td className="px-6 py-4 text-sm">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        item.status === 'Completado' ? 'bg-green-500/10 text-green-400' :
                        item.status === 'Nuevo' ? 'bg-blue-500/10 text-blue-400' :
                        'bg-yellow-500/10 text-yellow-400'
                      }`}>
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Configuración rápida */}
        <div className="mt-8 bg-card border border-card rounded-lg p-6">
          <div className="flex items-center gap-4">
            <FiSettings className="text-primary" size={24} />
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-white">Configuración del Sistema</h3>
              <p className="text-sm text-muted">Accede a la configuración avanzada de la plataforma</p>
            </div>
            <button className="bg-primary hover:bg-primary-dark text-white px-6 py-2 rounded-lg transition-colors">
              Ir a Configuración
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}
