'use client'

import React, { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import Link from 'next/link'
import Layout from '../../src/components/Layout'
import { useAuth } from '../../src/context/AuthContext'
import { useChatContext } from '../../src/context/ChatContext'
import { getSupabaseBrowserClient, hasSupabaseEnv } from '../../src/lib/supabase'
import { CATEGORY_EMOJI } from '../../src/data/mockEvents'
import type { EventCategory } from '../../src/types'
import {
  HiMapPin, HiPencil, HiArrowRightOnRectangle, HiEnvelope,
  HiCalendarDays, HiHeart, HiBookmark, HiSparkles, HiChevronRight,
  HiChatBubbleLeftRight, HiCheck,
} from 'react-icons/hi2'

const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=800&q=80'

type SavedEventPreview = {
  event_id: string
  event_title: string
  event_image_url: string | null
  event_address: string | null
}

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

function SectionTitle({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div className="h-4 w-1 rounded-full bg-gradient-to-b from-primary to-purple-500" />
        <h3 className="text-base font-semibold text-white">{children}</h3>
      </div>
      {action}
    </div>
  )
}

function ProfilePageContent() {
  const { user, logout, updateUser, isAuthReady } = useAuth()
  const { rooms, totalUnread } = useChatContext()
  const router = useRouter()

  const [avatarError, setAvatarError] = useState(false)
  const [savedPreviews, setSavedPreviews] = useState<SavedEventPreview[]>([])
  const [loadingPreviews, setLoadingPreviews] = useState(true)

  // Inline editing
  const [editingField, setEditingField] = useState<'name' | 'bio' | null>(null)
  const [editValues, setEditValues] = useState({ name: '', bio: '' })
  const bioRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (user) {
      setEditValues({ name: user.name, bio: user.bio ?? '' })
    }
  }, [user?.name, user?.bio])

  useEffect(() => {
    if (isAuthReady && !user) {
      router.replace('/auth')
    }
  }, [isAuthReady, router, user])

  useEffect(() => {
    if (!user) return
    if (!hasSupabaseEnv) {
      setLoadingPreviews(false)
      return
    }

    const supabase = getSupabaseBrowserClient()
    ;(async () => {
      try {
        const { data } = await supabase
          .from('user_events')
          .select('event_id, event_title, event_image_url, event_address')
          .eq('user_id', user.id)
          .eq('action', 'save')
          .order('created_at', { ascending: false })
          .limit(3)
        setSavedPreviews((data as SavedEventPreview[]) ?? [])
      } catch {
        setSavedPreviews([])
      } finally {
        setLoadingPreviews(false)
      }
    })()
  }, [user])

  // Auto-resize textarea al abrir edición de bio
  useEffect(() => {
    if (editingField === 'bio' && bioRef.current) {
      bioRef.current.style.height = 'auto'
      bioRef.current.style.height = `${bioRef.current.scrollHeight}px`
      bioRef.current.focus()
    }
  }, [editingField])

  if (!isAuthReady) {
    return (
      <Layout headerTitle="Perfil">
        <div className="px-4 py-8">
          <div className="shimmer h-10 w-40 rounded-xl" />
          <div className="mt-4 shimmer h-40 w-full rounded-3xl" />
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="shimmer h-24 rounded-2xl" />
            <div className="shimmer h-24 rounded-2xl" />
            <div className="shimmer h-24 rounded-2xl" />
            <div className="shimmer h-24 rounded-2xl" />
          </div>
        </div>
      </Layout>
    )
  }

  if (!user) return null

  function confirmEdit(field: 'name' | 'bio') {
    const value = editValues[field].trim()
    setEditingField(null)
    if (!value || value === (field === 'name' ? user!.name : user!.bio ?? '')) return
    updateUser({ [field]: value }).catch(() => {
      setEditValues((prev) => ({
        ...prev,
        [field]: field === 'name' ? user!.name : user!.bio ?? '',
      }))
    })
  }

  function cancelEdit(field: 'name' | 'bio') {
    setEditValues((prev) => ({
      ...prev,
      [field]: field === 'name' ? user!.name : user!.bio ?? '',
    }))
    setEditingField(null)
  }

  const stats = [
    {
      label: 'Me gustaron',
      value: user.likedEvents.length,
      icon: HiHeart,
      tint: 'text-green-300',
      bg: 'from-green-500/20',
      border: 'border-green-500/25',
      href: null,
    },
    {
      label: 'Guardados',
      value: user.savedEvents.length,
      icon: HiBookmark,
      tint: 'text-primary-light',
      bg: 'from-primary/20',
      border: 'border-primary/25',
      href: '/saved',
    },
    {
      label: 'Intereses',
      value: user.interests.length,
      icon: HiSparkles,
      tint: 'text-purple-200',
      bg: 'from-purple-500/20',
      border: 'border-purple-500/25',
      href: null,
      progress: Math.min(100, (user.interests.length / ALL_INTERESTS.length) * 100),
    },
    {
      label: 'Planes activos',
      value: rooms.length,
      icon: HiChatBubbleLeftRight,
      tint: 'text-pink-300',
      bg: 'from-pink-500/20',
      border: 'border-pink-500/25',
      href: '/chat',
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
    updateUser({ interests: updated }).catch(() => {})
  }

  return (
    <Layout headerTitle="Perfil">
      <motion.div variants={containerVariants} initial="hidden" animate="visible" className="pb-8">
        {/* ── Banner ── */}
        <motion.div
          variants={itemVariants}
          className="relative h-36 overflow-hidden bg-gradient-to-br from-primary/50 via-purple-600/40 to-pink-600/30"
        >
          <div className="absolute -left-8 -top-8 h-48 w-48 rounded-full bg-primary/20 blur-3xl" />
          <div className="absolute right-6 top-2 h-32 w-32 rounded-full bg-purple-500/25 blur-2xl" />
          <div className="absolute -bottom-6 left-1/3 h-28 w-28 rounded-full bg-pink-500/20 blur-2xl" />
        </motion.div>

        <div className="px-4">
          {/* ── Avatar + info editable ── */}
          <motion.div variants={itemVariants} className="mb-6 -mt-12 flex flex-col items-center text-center">
            <div className="relative mb-3">
              <div className="rounded-full bg-gradient-to-br from-primary via-purple-500 to-pink-500 p-[3px] shadow-lg shadow-primary/30">
                <div className="flex h-24 w-24 items-center justify-center rounded-full bg-surface p-0.5">
                  {!avatarError && user.avatarUrl ? (
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

            {/* Nombre editable */}
            {editingField === 'name' ? (
              <div className="flex items-center gap-2">
                <input
                  autoFocus
                  value={editValues.name}
                  onChange={(e) => setEditValues((p) => ({ ...p, name: e.target.value }))}
                  onBlur={() => confirmEdit('name')}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') confirmEdit('name')
                    if (e.key === 'Escape') cancelEdit('name')
                  }}
                  maxLength={40}
                  className="bg-transparent text-center text-xl font-bold text-white outline-none border-b border-primary w-48"
                />
                <button
                  onMouseDown={(e) => { e.preventDefault(); confirmEdit('name') }}
                  className="flex h-6 w-6 items-center justify-center rounded-full bg-primary"
                >
                  <HiCheck className="h-3.5 w-3.5 text-white" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setEditingField('name')}
                className="group flex items-center gap-1.5"
              >
                <h2 className="text-xl font-bold text-white">{user.name}</h2>
                <HiPencil className="h-3.5 w-3.5 text-muted opacity-0 transition-opacity group-hover:opacity-100" />
              </button>
            )}

            {/* Bio editable */}
            {editingField === 'bio' ? (
              <div className="mt-1 flex w-full max-w-xs flex-col items-center gap-2">
                <textarea
                  ref={bioRef}
                  value={editValues.bio}
                  onChange={(e) => {
                    setEditValues((p) => ({ ...p, bio: e.target.value }))
                    e.target.style.height = 'auto'
                    e.target.style.height = `${e.target.scrollHeight}px`
                  }}
                  onBlur={() => confirmEdit('bio')}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') cancelEdit('bio')
                  }}
                  maxLength={120}
                  rows={2}
                  placeholder="Escribe algo sobre ti..."
                  className="w-full resize-none bg-transparent text-center text-sm text-muted outline-none border-b border-primary"
                />
                <button
                  onMouseDown={(e) => { e.preventDefault(); confirmEdit('bio') }}
                  className="flex h-6 w-6 items-center justify-center rounded-full bg-primary"
                >
                  <HiCheck className="h-3.5 w-3.5 text-white" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setEditingField('bio')}
                className="group mt-1 flex max-w-xs items-start gap-1.5 text-center"
              >
                <p className="text-sm text-muted">
                  {user.bio || <span className="italic opacity-50">Agrega una bio...</span>}
                </p>
                <HiPencil className="mt-0.5 h-3 w-3 flex-shrink-0 text-muted opacity-0 transition-opacity group-hover:opacity-100" />
              </button>
            )}

            {user.location && (
              <div className="mt-2 flex items-center gap-1.5 text-xs text-muted">
                <HiMapPin className="h-3.5 w-3.5 text-primary-light" />
                <span>{user.location}</span>
              </div>
            )}
          </motion.div>

          {/* ── Stats 2×2 ── */}
          <motion.div variants={itemVariants} className="mb-8 grid grid-cols-2 gap-3">
            {stats.map((stat) => {
              const inner = (
                <>
                  <div className="flex items-start justify-between">
                    <stat.icon className={`h-5 w-5 ${stat.tint}`} />
                    {stat.href && <HiChevronRight className="h-4 w-4 text-muted" />}
                  </div>
                  <p className="mt-1 text-2xl font-black text-white">{stat.value}</p>
                  <p className="text-[11px] text-muted">{stat.label}</p>
                  {stat.progress !== undefined && (
                    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${stat.progress}%` }}
                        transition={{ duration: 0.5, ease: 'easeOut' }}
                        className="h-full rounded-full bg-gradient-to-r from-primary to-pink-500"
                      />
                    </div>
                  )}
                </>
              )

              const cardClass = `rounded-2xl border bg-gradient-to-b ${stat.bg} ${stat.border} to-card p-3`

              return stat.href ? (
                <Link key={stat.label} href={stat.href} className={`${cardClass} transition-opacity active:opacity-70`}>
                  {inner}
                </Link>
              ) : (
                <div key={stat.label} className={cardClass}>
                  {inner}
                </div>
              )
            })}
          </motion.div>

          {/* ── Guardados preview ── */}
          <motion.div variants={itemVariants} className="mb-8">
            <SectionTitle
              action={
                <Link href="/saved" className="text-xs text-primary-light">
                  Ver todos →
                </Link>
              }
            >
              Guardados
            </SectionTitle>

            {loadingPreviews ? (
              <div className="flex flex-col gap-2">
                {[1, 2].map((i) => (
                  <div key={i} className="flex h-20 overflow-hidden rounded-2xl bg-card">
                    <div className="shimmer h-full w-20 flex-shrink-0" />
                    <div className="flex flex-1 flex-col justify-center gap-2 p-3">
                      <div className="shimmer h-3 w-3/4 rounded-md" />
                      <div className="shimmer h-2.5 w-1/2 rounded-md" />
                    </div>
                  </div>
                ))}
              </div>
            ) : savedPreviews.length === 0 ? (
              <div className="flex flex-col items-center gap-2 rounded-2xl border border-white/5 bg-card py-6 text-center">
                <span className="text-3xl">🔖</span>
                <p className="text-sm text-muted">Aún no guardaste eventos</p>
                <Link href="/" className="text-xs text-primary-light">
                  Explorar feed →
                </Link>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {savedPreviews.map((event) => (
                  <div key={event.event_id} className="flex overflow-hidden rounded-2xl border border-white/5 bg-card">
                    <img
                      src={event.event_image_url ?? FALLBACK_IMAGE}
                      alt={event.event_title}
                      className="h-20 w-20 flex-shrink-0 object-cover"
                      onError={(e) => { (e.currentTarget as HTMLImageElement).src = FALLBACK_IMAGE }}
                    />
                    <div className="flex min-w-0 flex-1 flex-col justify-center p-3">
                      <p className="line-clamp-2 text-sm font-semibold leading-tight text-white">
                        {event.event_title}
                      </p>
                      {event.event_address && (
                        <div className="mt-1 flex items-center gap-1 text-xs text-muted">
                          <HiMapPin className="h-3 w-3 flex-shrink-0 text-primary-light" />
                          <span className="truncate">{event.event_address}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {user.savedEvents.length > 3 && (
                  <Link href="/saved" className="mt-1 text-center text-xs text-primary-light">
                    +{user.savedEvents.length - 3} más →
                  </Link>
                )}
              </div>
            )}
          </motion.div>

          {/* ── Mis comunidades ── */}
          <motion.div variants={itemVariants} className="mb-8">
            <SectionTitle
              action={
                rooms.length > 0 ? (
                  <Link href="/chat" className="flex items-center gap-1.5 text-xs text-primary-light">
                    Ver todas
                    {totalUnread > 0 && (
                      <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-white">
                        {totalUnread}
                      </span>
                    )}
                  </Link>
                ) : undefined
              }
            >
              Mis comunidades
            </SectionTitle>

            {rooms.length === 0 ? (
              <div className="flex flex-col items-center gap-3 rounded-2xl border border-white/5 bg-card px-6 py-6 text-center">
                <HiChatBubbleLeftRight className="h-8 w-8 text-muted" />
                <p className="text-sm font-medium text-white">Aún no te uniste a ninguna comunidad</p>
                <p className="text-xs text-muted">
                  Dale like a un lugar en el feed para conectar con otros que también van a ir
                </p>
                <Link href="/" className="mt-1 rounded-full bg-primary/20 px-4 py-1.5 text-xs font-semibold text-primary-light">
                  Ir al feed
                </Link>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {rooms.slice(0, 2).map((room) => (
                  <Link
                    key={room.id}
                    href={`/chat/${room.id}`}
                    className="flex items-center gap-3 overflow-hidden rounded-2xl border border-white/5 bg-card p-3 transition-opacity active:opacity-70"
                  >
                    <div className="relative flex-shrink-0">
                      <img
                        src={room.eventImageUrl}
                        alt={room.eventTitle}
                        className="h-12 w-12 rounded-xl object-cover"
                      />
                      <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-card bg-green-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-white">{room.eventTitle}</p>
                      <p className="text-xs text-muted">👥 {room.memberCount} miembros</p>
                    </div>
                    {room.unreadCount > 0 && (
                      <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-bold text-white">
                        {room.unreadCount}
                      </span>
                    )}
                  </Link>
                ))}
                {rooms.length > 2 && (
                  <Link href="/chat" className="mt-1 text-center text-xs text-primary-light">
                    +{rooms.length - 2} más →
                  </Link>
                )}
              </div>
            )}
          </motion.div>

          {/* ── Mis intereses ── */}
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

          {/* ── Cuenta ── */}
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
