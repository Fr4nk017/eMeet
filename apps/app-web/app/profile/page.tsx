'use client'

import React, { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { motion } from 'framer-motion'
import Layout from '../../src/components/Layout'
import { useAuth } from '../../src/context/AuthContext'
import { useFollowersCount } from '../../src/hooks/useFollowersCount'
import { CATEGORY_EMOJI } from '../../src/data/mockEvents'
import { getSupabaseBrowserClient, hasSupabaseEnv } from '../../src/lib/supabase'
import type { EventCategory } from '../../src/types'
import {
  LogOut as HiArrowRightOnRectangle,
  Bookmark as HiBookmark,
  CalendarDays as HiCalendarDays,
  MessageCircle as HiChatBubbleLeftEllipsis,
  Mail as HiEnvelope,
  Heart as HiHeart,
  MapPin as HiMapPin,
  Pencil as HiPencil,
  ImageIcon as HiPhoto,
  Plus as HiPlus,
  Sparkles as HiSparkles,
  Users as HiUsers,
} from 'lucide-react'

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

type ProfileTab = 'posts' | 'attended' | 'about'

type UserPost = {
  id: string
  eventId: string
  title: string
  caption: string
  imageUrl: string
  location: string
  dateLabel: string
  createdAt: string
}

const PROFILE_POSTS_STORAGE_KEY = 'emeet-profile-posts-v1'

function toHandle(name: string, email: string) {
  const cleanName = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '')
  if (cleanName) return `@${cleanName}`
  return `@${email.split('@')[0].toLowerCase().replace(/[^a-z0-9]+/g, '')}`
}

type AttendedEventRow = {
  event_id: string
  event_title: string
  event_image_url: string | null
  event_address: string | null
  created_at: string
}

type AttendedEventItem = {
  id: string
  title: string
  imageUrl: string
  location: string
  savedAt: string
}

const SAVED_URL = '/api/saved'

async function getAccessToken(): Promise<string | null> {
  if (!hasSupabaseEnv) return null
  const supabase = getSupabaseBrowserClient()
  const { data } = await supabase.auth.getSession()
  if (data.session?.access_token) return data.session.access_token
  const { data: refreshed, error } = await supabase.auth.refreshSession()
  if (error) return null
  return refreshed.session?.access_token ?? null
}

async function callSavedApi<T>(path: string, init?: RequestInit): Promise<T> {
  if (!SAVED_URL) throw new Error('Falta NEXT_PUBLIC_SAVED_URL en .env.local')
  const headers = new Headers({ 'Content-Type': 'application/json' })
  if (hasSupabaseEnv) {
    const token = await getAccessToken()
    if (!token) throw new Error('Sesión expirada. Vuelve a iniciar sesión.')
    headers.set('Authorization', `Bearer ${token}`)
  }
  const res = await fetch(`${SAVED_URL}${path}`, { credentials: 'include', ...init, headers })
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null
    throw new Error(body?.error ?? 'Error al comunicarse con el servicio de guardados.')
  }
  if (res.status === 204) return undefined as T
  return res.json()
}

function formatSavedAt(isoDate: string) {
  return new Date(isoDate).toLocaleDateString('es-CL', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function loadPostsByUser(userId: string): UserPost[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(PROFILE_POSTS_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as Record<string, UserPost[]>
    return Array.isArray(parsed[userId]) ? parsed[userId] : []
  } catch {
    return []
  }
}

function savePostsByUser(userId: string, posts: UserPost[]) {
  if (typeof window === 'undefined') return
  try {
    const raw = window.localStorage.getItem(PROFILE_POSTS_STORAGE_KEY)
    const parsed = raw ? (JSON.parse(raw) as Record<string, UserPost[]>) : {}
    parsed[userId] = posts
    window.localStorage.setItem(PROFILE_POSTS_STORAGE_KEY, JSON.stringify(parsed))
  } catch {
    // Evita bloquear UI si localStorage falla.
  }
}

function formatMemberSince(isoDate?: string) {
  if (!isoDate) return 'No disponible'
  const parsed = new Date(isoDate)
  if (Number.isNaN(parsed.getTime())) return 'No disponible'
  return parsed.toLocaleDateString('es-CL', {
    month: 'long',
    year: 'numeric',
  })
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
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const [activeTab, setActiveTab] = useState<ProfileTab>('posts')
  const [showBioEditor, setShowBioEditor] = useState(false)
  const [bioDraft, setBioDraft] = useState('')
  const [isSavingBio, setIsSavingBio] = useState(false)
  const [userPosts, setUserPosts] = useState<UserPost[]>([])
  const [selectedEventId, setSelectedEventId] = useState('')
  const [postCaption, setPostCaption] = useState('')
  const [postError, setPostError] = useState<string | null>(null)
  const { followersCount, loadingFollowers } = useFollowersCount(user)

  useEffect(() => {
    if (isAuthReady && !user) {
      router.replace('/auth')
    }
  }, [isAuthReady, router, user])

  useEffect(() => {
    if (!user) return
    setBioDraft(user.bio ?? '')
    const storedPosts = loadPostsByUser(user.id)
    setUserPosts(storedPosts)
  }, [user])

  const [attendedEvents, setAttendedEvents] = useState<AttendedEventItem[]>([])

  useEffect(() => {
    if (!user) {
      setAttendedEvents([])
      return
    }
    let cancelled = false
    Promise.all([
      callSavedApi<AttendedEventRow[]>('/events/saved').catch(() => [] as AttendedEventRow[]),
      callSavedApi<AttendedEventRow[]>('/events/liked').catch(() => [] as AttendedEventRow[]),
    ]).then(([saved, liked]) => {
      if (cancelled) return
      const seen = new Set<string>()
      const unique = [...saved, ...liked].filter((e) => {
        if (seen.has(e.event_id)) return false
        seen.add(e.event_id)
        return true
      })
      setAttendedEvents(
        unique.map((e) => ({
          id: e.event_id,
          title: e.event_title,
          imageUrl: e.event_image_url ?? 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800&q=80',
          location: e.event_address ?? 'Santiago, Chile',
          savedAt: e.created_at,
        })),
      )
    })
    return () => { cancelled = true }
  }, [user])

  useEffect(() => {
    if (!selectedEventId && attendedEvents.length > 0) {
      setSelectedEventId(attendedEvents[0].id)
    }
  }, [attendedEvents, selectedEventId])

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

  const profileStats = [
    {
      label: 'Publicaciones',
      value: userPosts.length,
      icon: HiPhoto,
      tint: 'text-fuchsia-200',
    },
    {
      label: 'Asistidos',
      value: attendedEvents.length,
      icon: HiCalendarDays,
      tint: 'text-cyan-200',
    },
    {
      label: 'Likes',
      value: user.likedEvents.length,
      icon: HiHeart,
      tint: 'text-rose-200',
    },
    {
      label: 'Seguidores',
      value: loadingFollowers ? '...' : (followersCount ?? 'N/D'),
      icon: HiUsers,
      tint: 'text-primary-light',
    },
  ]

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setIsUploadingAvatar(true)
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = reject
        reader.readAsDataURL(file)
      })
      await updateUser({ avatarUrl: dataUrl })
      setAvatarError(false)
    } catch {
      // silently fail
    } finally {
      setIsUploadingAvatar(false)
      if (avatarInputRef.current) avatarInputRef.current.value = ''
    }
  }

  async function handleSaveBio() {
    setIsSavingBio(true)
    try {
      await updateUser({ bio: bioDraft.trim() })
      setShowBioEditor(false)
    } catch {
      // Mantener al usuario en el editor si falla la actualización.
    } finally {
      setIsSavingBio(false)
    }
  }

  function handlePublishPost() {
    if (!selectedEventId) {
      setPostError('Selecciona un evento asistido para publicar.')
      return
    }

    if (postCaption.trim().length < 8) {
      setPostError('Escribe una descripción de al menos 8 caracteres.')
      return
    }

    const event = attendedEvents.find((item) => item.id === selectedEventId)
    if (!event) {
      setPostError('No pudimos cargar el evento seleccionado.')
      return
    }

    const nextPost: UserPost = {
      id: `${Date.now()}-${event.id}`,
      eventId: event.id,
      title: event.title,
      caption: postCaption.trim(),
      imageUrl: event.imageUrl,
      location: event.location,
      dateLabel: formatSavedAt(event.savedAt),
      createdAt: new Date().toISOString(),
    }

    const nextPosts = [nextPost, ...userPosts]
    setUserPosts(nextPosts)
    savePostsByUser(user!.id, nextPosts)
    setPostCaption('')
    setPostError(null)
    setActiveTab('posts')
  }

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
                  {!avatarError && user.avatarUrl ? (
                    <Image
                      src={user.avatarUrl}
                      alt={user.name}
                      width={96}
                      height={96}
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
              <button
                onClick={() => avatarInputRef.current?.click()}
                disabled={isUploadingAvatar}
                className="absolute bottom-1 right-1 flex h-7 w-7 items-center justify-center rounded-full border-2 border-surface bg-primary shadow-md disabled:opacity-70"
              >
                {isUploadingAvatar
                  ? <span className="h-3 w-3 animate-spin rounded-full border border-white border-t-transparent" />
                  : <HiPencil className="h-3.5 w-3.5 text-white" />}
              </button>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarChange}
              />
            </div>

            <h2 className="text-xl font-bold text-white">{user.name}</h2>
            <p className="mt-1 text-xs font-semibold tracking-wide text-primary-light">
              {toHandle(user.name, user.email)}
            </p>
            <p className="mt-2 max-w-sm text-sm text-muted">{user.bio || 'Cuéntale a la comunidad quién eres y qué planes te gustan.'}</p>

            <div className="mt-2 flex items-center gap-1.5 text-xs text-muted">
              <HiMapPin className="h-3.5 w-3.5 text-primary-light" />
              <span>{user.location}</span>
            </div>

            <div className="mt-4 flex items-center gap-2">
              <button
                onClick={() => setShowBioEditor((prev) => !prev)}
                className="inline-flex items-center gap-1 rounded-full border border-white/20 px-3 py-1.5 text-xs font-semibold text-slate-200 transition-colors hover:border-white/40"
              >
                <HiPencil className="h-3.5 w-3.5" />
                Editar perfil
              </button>
            </div>
          </motion.div>

          {showBioEditor && (
            <motion.div
              variants={itemVariants}
              className="mb-6 rounded-2xl border border-white/10 bg-card/60 p-4"
            >
              <SectionTitle>Descripción del perfil</SectionTitle>
              <textarea
                value={bioDraft}
                onChange={(event) => setBioDraft(event.target.value)}
                maxLength={220}
                rows={4}
                className="w-full rounded-xl border border-white/10 bg-surface px-3 py-2 text-sm text-white outline-none transition-colors focus:border-primary"
                placeholder="Ejemplo: Amante del jazz, brunchs y planes culturales con amigos."
              />
              <div className="mt-3 flex items-center justify-between">
                <p className="text-[11px] text-muted">{bioDraft.length}/220</p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setShowBioEditor(false)
                      setBioDraft(user.bio ?? '')
                    }}
                    className="rounded-full border border-white/20 px-3 py-1.5 text-xs font-semibold text-slate-200"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSaveBio}
                    disabled={isSavingBio}
                    className="rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
                  >
                    {isSavingBio ? 'Guardando...' : 'Guardar bio'}
                  </button>
                </div>
              </div>
            </motion.div>
          )}

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

          <motion.div variants={itemVariants} className="mb-6 rounded-2xl border border-white/10 bg-card/60 p-4">
            <div className="mb-4 flex items-center justify-between">
              <SectionTitle>Modo creador</SectionTitle>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {profileStats.map((stat) => (
                <div key={stat.label} className="rounded-xl border border-white/10 bg-surface/70 px-3 py-2">
                  <div className="flex items-center gap-1.5">
                    <stat.icon className={`h-4 w-4 ${stat.tint}`} />
                    <p className="text-[11px] text-muted">{stat.label}</p>
                  </div>
                  <p className="mt-1 text-lg font-black text-white">{stat.value}</p>
                </div>
              ))}
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2 rounded-xl border border-white/10 bg-surface/60 p-1">
              <button
                onClick={() => setActiveTab('posts')}
                className={`rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
                  activeTab === 'posts' ? 'bg-primary text-white' : 'text-slate-200 hover:bg-white/10'
                }`}
              >
                Publicaciones
              </button>
              <button
                onClick={() => setActiveTab('attended')}
                className={`rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
                  activeTab === 'attended' ? 'bg-primary text-white' : 'text-slate-200 hover:bg-white/10'
                }`}
              >
                Asistidos
              </button>
              <button
                onClick={() => setActiveTab('about')}
                className={`rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
                  activeTab === 'about' ? 'bg-primary text-white' : 'text-slate-200 hover:bg-white/10'
                }`}
              >
                Perfil
              </button>
            </div>

            <div className="mt-4">
              {activeTab === 'posts' && (
                <div>
                  <div className="mb-4 rounded-xl border border-white/10 bg-surface/70 p-3">
                    <p className="mb-2 text-xs font-semibold text-primary-light">Publicar evento asistido</p>
                    <div className="grid gap-2 sm:grid-cols-[1fr_2fr_auto]">
                      <select
                        value={selectedEventId}
                        onChange={(event) => setSelectedEventId(event.target.value)}
                        className="rounded-lg border border-white/10 bg-card px-3 py-2 text-sm text-white outline-none"
                      >
                        {attendedEvents.map((event) => (
                          <option key={event.id} value={event.id}>
                            {event.title}
                          </option>
                        ))}
                      </select>
                      <input
                        value={postCaption}
                        onChange={(event) => setPostCaption(event.target.value)}
                        placeholder="Describe cómo te fue en ese evento..."
                        className="rounded-lg border border-white/10 bg-card px-3 py-2 text-sm text-white outline-none"
                      />
                      <button
                        onClick={handlePublishPost}
                        className="inline-flex items-center justify-center gap-1 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-white"
                      >
                        <HiPlus className="h-4 w-4" />
                        Publicar
                      </button>
                    </div>
                    {postError && <p className="mt-2 text-xs text-red-300">{postError}</p>}
                  </div>

                  {userPosts.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-white/20 bg-surface/40 px-4 py-8 text-center">
                      <HiPhoto className="mx-auto h-6 w-6 text-primary-light" />
                      <p className="mt-2 text-sm font-semibold text-white">Aun no publicas experiencias</p>
                      <p className="mt-1 text-xs text-muted">Publica el primer evento al que asististe para mostrar tu estilo.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
                      {userPosts.map((post) => (
                        <article key={post.id} className="group overflow-hidden rounded-xl border border-white/10 bg-surface/60">
                          <div className="relative h-36 overflow-hidden">
                            <Image
                              src={post.imageUrl}
                              alt={post.title}
                              fill
                              className="object-cover transition-transform duration-300 group-hover:scale-105"
                              sizes="(max-width: 768px) 50vw, 33vw"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                            <span className="absolute left-2 top-2 rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-semibold text-white">
                              {post.dateLabel}
                            </span>
                          </div>
                          <div className="space-y-1 p-2.5">
                            <p className="line-clamp-1 text-xs font-semibold text-white">{post.title}</p>
                            <p className="line-clamp-2 text-[11px] text-muted">{post.caption}</p>
                            <div className="flex items-center justify-between pt-1">
                              <span className="text-[10px] text-primary-light">{post.location}</span>
                              <span className="inline-flex items-center gap-1 text-[10px] text-muted">
                                <HiChatBubbleLeftEllipsis className="h-3 w-3" />
                                Publicado
                              </span>
                            </div>
                          </div>
                        </article>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'attended' && (
                <div>
                  {attendedEvents.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-white/20 bg-surface/40 px-4 py-8 text-center">
                      <HiCalendarDays className="mx-auto h-6 w-6 text-primary-light" />
                      <p className="mt-2 text-sm font-semibold text-white">Aun no registras eventos asistidos</p>
                      <p className="mt-1 text-xs text-muted">Cuando des like o guardes eventos, apareceran aqui como historial.</p>
                    </div>
                  ) : (
                    <div className="grid gap-2">
                      {attendedEvents.map((event) => (
                        <article key={event.id} className="flex gap-3 rounded-xl border border-white/10 bg-surface/60 p-2.5">
                          <Image
                            src={event.imageUrl}
                            alt={event.title}
                            width={80}
                            height={80}
                            className="flex-shrink-0 rounded-lg object-cover"
                          />
                          <div className="min-w-0">
                            <p className="line-clamp-1 text-sm font-semibold text-white">{event.title}</p>
                            <p className="mt-0.5 text-[11px] text-muted">Guardado el {formatSavedAt(event.savedAt)}</p>
                            <p className="mt-1 line-clamp-1 text-xs text-primary-light">{event.location}</p>
                          </div>
                        </article>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'about' && (
                <div className="space-y-4">
                  <div className="rounded-xl border border-white/10 bg-surface/60 p-3">
                    <p className="text-[11px] uppercase tracking-wide text-muted">Descripcion</p>
                    <p className="mt-1 text-sm text-white">
                      {user.bio || 'Sin descripcion por ahora. Usa el boton Editar perfil para agregar una bio.'}
                    </p>
                  </div>

                  <div className="rounded-xl border border-white/10 bg-surface/60 p-3">
                    <p className="text-[11px] uppercase tracking-wide text-muted">Intereses activos</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {user.interests.map((interest) => (
                        <span key={interest} className="rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs text-primary-light">
                          {CATEGORY_EMOJI[interest]} {interest}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
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
                  <p className="text-sm font-medium text-white">{formatMemberSince(user.createdAt)}</p>
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
