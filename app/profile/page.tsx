'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import Layout from '../../src/components/Layout'
import { useAuth } from '../../src/context/AuthContext'
import { CATEGORY_EMOJI } from '../../src/data/mockEvents'
import type { EventCategory } from '../../src/types'
import { HiMapPin, HiPencil, HiArrowRightOnRectangle, HiEnvelope, HiCalendarDays, HiHeart, HiBookmark, HiSparkles } from 'react-icons/hi2'

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
    <div className="mb-3 flex items-center gap-2">
      <div className="h-4 w-1 rounded-full bg-gradient-to-b from-primary to-purple-500" />
      <h3 className="text-base font-semibold text-white">{children}</h3>
    </div>
  )
}

function ProfilePageContent() {
  const { user, logout, updateUser, isAuthReady } = useAuth()
  const router = useRouter()
  const [avatarError, setAvatarError] = useState(false)

  useEffect(() => {
    if (isAuthReady && !user) {
      router.replace('/auth')
    }
  }, [isAuthReady, router, user])

  if (!isAuthReady) {
    return (
      <Layout headerTitle="Perfil">
        <div className="px-4 py-8">
          <div className="shimmer h-10 w-40 rounded-xl" />
          <div className="mt-4 shimmer h-40 w-full rounded-3xl" />
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="shimmer h-24 rounded-2xl" />
            <div className="shimmer h-24 rounded-2xl" />
            <div className="shimmer h-24 rounded-2xl" />
          </div>
        </div>
      </Layout>
    )
  }

  if (!user) return null

  const stats = [
    {
      label: 'Me gustaron',
      value: user.likedEvents.length,
      goal: 20,
      icon: HiHeart,
      tint: 'text-green-300',
      bg: 'from-green-500/20',
      border: 'border-green-500/25',
      progress: Math.min(100, (user.likedEvents.length / 20) * 100),
    },
    {
      label: 'Guardados',
      value: user.savedEvents.length,
      goal: 15,
      icon: HiBookmark,
      tint: 'text-primary-light',
      bg: 'from-primary/20',
      border: 'border-primary/25',
      progress: Math.min(100, (user.savedEvents.length / 15) * 100),
    },
    {
      label: 'Intereses',
      value: user.interests.length,
      goal: ALL_INTERESTS.length,
      icon: HiSparkles,
      tint: 'text-purple-200',
      bg: 'from-purple-500/20',
      border: 'border-purple-500/25',
      progress: Math.min(100, (user.interests.length / ALL_INTERESTS.length) * 100),
    },
  ]

  async function handleLogout() {
    try {
      await logout()
      router.push('/auth')
    } catch {
      // Se mantiene en pantalla si falla el cierre de sesión.
    }
  }

  function toggleInterest(key: EventCategory) {
    const current = user!.interests
    const updated = current.includes(key)
      ? current.filter((i) => i !== key)
      : [...current, key]
    updateUser({ interests: updated }).catch(() => {
      // Evita bloquear la UI si falla la actualización remota.
    })
  }

  return (
    <Layout headerTitle="Perfil">
      <motion.div variants={containerVariants} initial="hidden" animate="visible" className="pb-8">
        <motion.div
          variants={itemVariants}
          className="relative h-36 overflow-hidden bg-gradient-to-br from-primary/50 via-purple-600/40 to-pink-600/30"
        >
          <div className="absolute -left-8 -top-8 h-48 w-48 rounded-full bg-primary/20 blur-3xl" />
          <div className="absolute right-6 top-2 h-32 w-32 rounded-full bg-purple-500/25 blur-2xl" />
          <div className="absolute -bottom-6 left-1/3 h-28 w-28 rounded-full bg-pink-500/20 blur-2xl" />
        </motion.div>

        <div className="px-4">
          <motion.div variants={itemVariants} className="mb-6 -mt-12 flex flex-col items-center text-center">
            <div className="relative mb-3">
              <div className="rounded-full bg-gradient-to-br from-primary via-purple-500 to-pink-500 p-[3px] shadow-lg shadow-primary/30">
                <div className="flex h-24 w-24 items-center justify-center rounded-full bg-surface p-0.5">
                  {!avatarError ? (
                    <img
                      src={user.avatarUrl}
                      alt={user.name}
                      className="h-24 w-24 rounded-full object-cover"
                      onError={() => setAvatarError(true)}
                    />
                  ) : (
                    <div className="flex h-24 w-24 items-center justify-center rounded-full bg-[radial-gradient(circle_at_25%_20%,_rgba(124,58,237,0.45),_rgba(10,14,28,1)_70%)] text-2xl font-extrabold text-white">
                      {user.name
                        .split(' ')
                        .map((n) => n[0])
                        .join('')
                        .slice(0, 2)
                        .toUpperCase()}
                    </div>
                  )}
                </div>
              </div>
              <button className="absolute bottom-1 right-1 flex h-7 w-7 items-center justify-center rounded-full border-2 border-surface bg-primary shadow-md">
                <HiPencil className="h-3.5 w-3.5 text-white" />
              </button>
            </div>

            <h2 className="text-xl font-bold text-white">{user.name}</h2>
            <p className="mt-1 max-w-xs text-sm text-muted">{user.bio}</p>

            <div className="mt-2 flex items-center gap-1.5 text-xs text-muted">
              <HiMapPin className="h-3.5 w-3.5 text-primary-light" />
              <span>{user.location}</span>
            </div>
          </motion.div>

          <motion.div variants={itemVariants} className="mb-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {stats.map((stat) => (
              <div key={stat.label} className={`rounded-2xl border bg-gradient-to-b ${stat.bg} ${stat.border} to-card p-3`}>
                <div className="flex items-start justify-between">
                  <stat.icon className={`h-5 w-5 ${stat.tint}`} />
                  <span className="text-[10px] text-muted">Meta {stat.goal}</span>
                </div>
                <p className="mt-1 text-2xl font-black text-white">{stat.value}</p>
                <p className="text-[11px] text-muted">{stat.label}</p>
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${stat.progress}%` }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                    className="h-full rounded-full bg-gradient-to-r from-primary to-pink-500"
                  />
                </div>
              </div>
            ))}
          </motion.div>

          <motion.div variants={itemVariants} className="mb-8">
            <SectionTitle>Mis intereses</SectionTitle>
            <p className="mb-3 text-xs text-muted">
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
                    className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-all duration-200 ${
                      isActive
                        ? 'border-primary bg-primary/90 text-white'
                        : 'border-white/20 text-muted hover:border-white/40 hover:text-white'
                    }`}
                  >
                    <span>{CATEGORY_EMOJI[key]} {label}</span>
                    <span
                      className={`relative h-5 w-9 rounded-full border transition-colors ${
                        isActive ? 'border-primary-light bg-white/25' : 'border-white/20 bg-white/10'
                      }`}
                    >
                      <motion.span
                        animate={{ x: isActive ? 16 : 1 }}
                        transition={{ type: 'spring', stiffness: 420, damping: 26 }}
                        className={`absolute top-[1px] h-3.5 w-3.5 rounded-full ${isActive ? 'bg-white' : 'bg-white/70'}`}
                      />
                    </span>
                  </motion.button>
                )
              })}
            </div>
          </motion.div>

          <motion.div variants={itemVariants}>
            <SectionTitle>Cuenta</SectionTitle>
            <div className="mb-6 overflow-hidden rounded-2xl border border-white/5 bg-card">
              <div className="flex items-center gap-3 border-b border-white/5 px-4 py-3.5">
                <HiEnvelope className="h-4 w-4 shrink-0 text-primary-light" />
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-muted">Email</p>
                  <p className="text-sm font-medium text-white">{user.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 px-4 py-3.5">
                <HiCalendarDays className="h-4 w-4 shrink-0 text-primary-light" />
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-muted">Miembro desde</p>
                  <p className="text-sm font-medium text-white">
                    {user.createdAt
                      ? new Date(user.createdAt).toLocaleDateString('es-CL', { month: 'long', year: 'numeric' })
                      : '—'}
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-red-500/30 bg-red-500/10 py-3.5 text-sm font-semibold text-red-400 transition-colors active:scale-95 hover:bg-red-500/20"
            >
              <HiArrowRightOnRectangle className="h-5 w-5" />
              Cerrar sesión
            </button>
          </motion.div>
        </div>
      </motion.div>
    </Layout>
  )
}

export default function ProfileRoutePage() {
  return <ProfilePageContent />
}
