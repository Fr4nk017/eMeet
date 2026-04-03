import React from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import Layout from '../components/Layout'
import { useAuth } from '../context/AuthContext'
import { useNearbyPlacesContext } from '../context/NearbyPlacesContext'
import PlaceTypeFilters from '../components/PlaceTypeFilters'
import DistanceFilter from '../components/DistanceFilter'
import { CATEGORY_EMOJI } from '../data/mockEvents'
import type { EventCategory } from '../types'
import { HiMapPin, HiPencil, HiArrowRightOnRectangle, HiEnvelope, HiCalendarDays } from 'react-icons/hi2'

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

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
}

const itemVariants = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <div className="w-1 h-4 rounded-full bg-gradient-to-b from-primary to-purple-500" />
      <h3 className="text-white text-base font-semibold">{children}</h3>
    </div>
  )
}

export default function ProfilePage() {
  const { user, logout, updateUser } = useAuth()
  const {
    selectedPlaceTypes,
    selectedDistanceKm,
    togglePlaceType,
    setDistanceKm,
  } = useNearbyPlacesContext()
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
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="pb-8"
      >
        {/* ── Banner degradado ─────────────────────────────────────────── */}
        <motion.div
          variants={itemVariants}
          className="relative h-36 overflow-hidden bg-gradient-to-br from-primary/50 via-purple-600/40 to-pink-600/30"
        >
          <div className="absolute -top-8 -left-8 w-48 h-48 rounded-full bg-primary/20 blur-3xl" />
          <div className="absolute top-2 right-6 w-32 h-32 rounded-full bg-purple-500/25 blur-2xl" />
          <div className="absolute -bottom-6 left-1/3 w-28 h-28 rounded-full bg-pink-500/20 blur-2xl" />
        </motion.div>

        <div className="px-4">
          {/* ── Avatar + info principal ──────────────────────────────────── */}
          <motion.div
            variants={itemVariants}
            className="flex flex-col items-center text-center -mt-12 mb-6"
          >
            <div className="relative mb-3">
              {/* Anillo degradado */}
              <div className="p-[3px] rounded-full bg-gradient-to-br from-primary via-purple-500 to-pink-500 shadow-lg shadow-primary/30">
                <div className="rounded-full bg-surface p-0.5">
                  <img
                    src={user.avatarUrl}
                    alt={user.name}
                    className="w-24 h-24 rounded-full object-cover"
                  />
                </div>
              </div>
              <button className="absolute bottom-1 right-1 w-7 h-7 bg-primary rounded-full flex items-center justify-center border-2 border-surface shadow-md">
                <HiPencil className="w-3.5 h-3.5 text-white" />
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
          <motion.div variants={itemVariants} className="grid grid-cols-3 gap-2 mb-8">
            {[
              { label: 'Me gustaron', value: user.likedEvents.length, emoji: '💚', from: 'from-green-500/20', border: 'border-green-500/20' },
              { label: 'Guardados', value: user.savedEvents.length, emoji: '🔖', from: 'from-primary/20', border: 'border-primary/20' },
              { label: 'Intereses', value: user.interests.length, emoji: '✨', from: 'from-purple-500/20', border: 'border-purple-500/20' },
            ].map((stat) => (
              <div key={stat.label} className={`rounded-2xl p-3 text-center border bg-gradient-to-b ${stat.from} to-card ${stat.border}`}>
                <span className="text-xl">{stat.emoji}</span>
                <p className="text-white text-xl font-bold mt-0.5">{stat.value}</p>
                <p className="text-muted text-[10px] leading-tight mt-0.5">{stat.label}</p>
              </div>
            ))}
          </motion.div>

          {/* ── Intereses ────────────────────────────────────────────────── */}
          <motion.div variants={itemVariants} className="mb-8">
            <SectionTitle>Mis intereses</SectionTitle>
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
          </motion.div>

          {/* ── Preferencias de descubrimiento ─────────────────────────── */}
          <motion.div variants={itemVariants} className="mb-8 rounded-2xl border border-white/5 bg-card p-4">
            <SectionTitle>Preferencias de descubrimiento</SectionTitle>
            <p className="mt-1 text-xs text-muted">
              Configura qué lugares quieres ver en el mapa y en el feed.
            </p>

            <div className="mt-4">
              <p className="mb-2 text-xs font-semibold text-slate-300">Tipos de lugar</p>
              <PlaceTypeFilters
                selectedTypes={selectedPlaceTypes}
                onToggleType={togglePlaceType}
                className="flex flex-wrap gap-2"
              />
            </div>

            <div className="mt-4">
              <p className="mb-2 text-xs font-semibold text-slate-300">Distancia máxima</p>
              <DistanceFilter
                selectedKm={selectedDistanceKm}
                onChange={setDistanceKm}
                className="flex flex-wrap gap-2"
              />
            </div>
          </motion.div>

          {/* ── Cuenta ───────────────────────────────────────────────────── */}
          <motion.div variants={itemVariants}>
            <SectionTitle>Cuenta</SectionTitle>
            <div className="bg-card rounded-2xl border border-white/5 overflow-hidden mb-6">
              <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/5">
                <HiEnvelope className="w-4 h-4 text-primary-light shrink-0" />
                <div>
                  <p className="text-[10px] text-muted uppercase tracking-wide">Email</p>
                  <p className="text-white text-sm font-medium">{user.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 px-4 py-3.5">
                <HiCalendarDays className="w-4 h-4 text-primary-light shrink-0" />
                <div>
                  <p className="text-[10px] text-muted uppercase tracking-wide">Miembro desde</p>
                  <p className="text-white text-sm font-medium">Marzo 2026</p>
                </div>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm font-semibold hover:bg-red-500/20 transition-colors active:scale-95"
            >
              <HiArrowRightOnRectangle className="w-5 h-5" />
              Cerrar sesión
            </button>
          </motion.div>

        </div>
      </motion.div>
    </Layout>
  )
}
