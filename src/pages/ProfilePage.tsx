import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import Layout from '../components/Layout'
import { useAuth } from '../context/AuthContext'
import { CATEGORY_EMOJI } from '../data/mockEvents'
import type { EventCategory } from '../types'
import { HiMapPin, HiPencil, HiArrowRightOnRectangle } from 'react-icons/hi2'

const ALL_INTERESTS: { key: EventCategory; label: string }[] = [
  { key: 'gastronomia', label: 'Gastronomía' },
  { key: 'musica', label: 'Música' },
  { key: 'cultura', label: 'Cultura' },
  { key: 'networking', label: 'Networking' },
  { key: 'deporte', label: 'Deporte' },
  { key: 'fiesta', label: 'Fiesta' },
  { key: 'teatro', label: 'Teatro' },
  { key: 'arte', label: 'Arte' },
]

/**
 * ProfilePage — Perfil del usuario autenticado.
 *
 * Muestra:
 *  - Avatar, nombre, bio, ubicación
 *  - Intereses seleccionados (chips editables)
 *  - Estadísticas rápidas (likes, guardados)
 *  - Botón de cerrar sesión
 *
 * En esta versión mock, la edición de intereses persiste
 * en el estado local del componente.
 */
export default function ProfilePage() {
  const { user, logout, updateUser } = useAuth()
  const navigate = useNavigate()

  if (!user) {
    navigate('/auth')
    return null
  }

  function handleLogout() {
    logout()
    navigate('/auth')
  }

  function toggleInterest(key: EventCategory) {
    const current = user!.interests
    const updated = current.includes(key)
      ? current.filter((i) => i !== key)
      : [...current, key]
    updateUser({ interests: updated })
  }

  return (
    <Layout headerTitle="Perfil">
      <div className="px-4 pt-6 pb-8">

        {/* ── Avatar + info principal ──────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center text-center mb-8"
        >
          <div className="relative mb-3">
            <img
              src={user.avatarUrl}
              alt={user.name}
              className="w-24 h-24 rounded-full border-4 border-primary object-cover"
            />
            <button className="absolute bottom-0 right-0 w-8 h-8 bg-primary rounded-full flex items-center justify-center border-2 border-surface">
              <HiPencil className="w-4 h-4 text-white" />
            </button>
          </div>

          <h2 className="text-white text-xl font-bold">{user.name}</h2>
          <p className="text-muted text-sm mt-1 max-w-xs">{user.bio}</p>

          <div className="flex items-center gap-1.5 text-muted text-xs mt-2">
            <HiMapPin className="w-3.5 h-3.5 text-primary-light" />
            <span>{user.location}</span>
          </div>
        </motion.div>

        {/* ── Estadísticas ─────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-3 mb-8">
          {[
            { label: 'Me interesaron', value: user.likedEvents.length, emoji: '💚' },
            { label: 'Guardados', value: user.savedEvents.length, emoji: '🔖' },
          ].map((stat) => (
            <div key={stat.label} className="bg-card rounded-2xl p-4 text-center border border-white/5">
              <span className="text-2xl">{stat.emoji}</span>
              <p className="text-white text-2xl font-bold mt-1">{stat.value}</p>
              <p className="text-muted text-xs">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* ── Intereses ────────────────────────────────────────────────── */}
        <div className="mb-8">
          <h3 className="text-white text-base font-semibold mb-3">Mis intereses</h3>
          <p className="text-muted text-xs mb-3">
            Selecciona los que más te gustan para personalizar el feed.
          </p>
          <div className="flex flex-wrap gap-2">
            {ALL_INTERESTS.map(({ key, label }) => {
              const isActive = user.interests.includes(key)
              return (
                <motion.button
                  key={key}
                  whileTap={{ scale: 0.93 }}
                  onClick={() => toggleInterest(key)}
                  className={`px-4 py-2 rounded-full text-sm font-medium border transition-all duration-200 ${
                    isActive
                      ? 'bg-primary border-primary text-white'
                      : 'border-white/20 text-muted hover:border-white/40 hover:text-white'
                  }`}
                >
                  {CATEGORY_EMOJI[key]} {label}
                </motion.button>
              )
            })}
          </div>
        </div>

        {/* ── Cuenta ───────────────────────────────────────────────────── */}
        <div className="bg-card rounded-2xl border border-white/5 overflow-hidden mb-4">
          <div className="px-4 py-3 border-b border-white/5">
            <p className="text-xs text-muted">Email</p>
            <p className="text-white text-sm font-medium">{user.email}</p>
          </div>
          <div className="px-4 py-3">
            <p className="text-xs text-muted">Miembro desde</p>
            <p className="text-white text-sm font-medium">Marzo 2026</p>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border border-red-500/30 text-red-400 text-sm font-semibold hover:bg-red-500/10 transition-colors active:scale-95"
        >
          <HiArrowRightOnRectangle className="w-5 h-5" />
          Cerrar sesión
        </button>
      </div>
    </Layout>
  )
}
