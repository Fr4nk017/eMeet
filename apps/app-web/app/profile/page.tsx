'use client'

import React, { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import Layout from '@/src/components/Layout'
import { useAuth } from '@/src/context/AuthContext'
import { useFollowersCount } from '@/src/hooks/useFollowersCount'
import { CATEGORY_EMOJI } from '@/src/utils/eventUtils'
import { callSavedApi } from '@/src/lib/savedApi'
import type { EventCategory } from '@/src/types'
import {
  LogOut,
  Bookmark,
  CalendarDays,
  MessageCircle,
  Mail,
  Heart,
  MapPin,
  Pencil,
  ImageIcon,
  Plus,
  Sparkles,
  Users,
  Camera,
  Check,
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
  visible: { transition: { staggerChildren: 0.07 } },
}

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
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
  const cleanName = name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '')
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

function formatSavedAt(isoDate: string) {
  return new Date(isoDate).toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' })
}

function loadPostsByUser(userId: string): UserPost[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(PROFILE_POSTS_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as Record<string, UserPost[]>
    return Array.isArray(parsed[userId]) ? parsed[userId] : []
  } catch { return [] }
}

function savePostsByUser(userId: string, posts: UserPost[]) {
  if (typeof window === 'undefined') return
  try {
    const raw = window.localStorage.getItem(PROFILE_POSTS_STORAGE_KEY)
    const parsed = raw ? (JSON.parse(raw) as Record<string, UserPost[]>) : {}
    parsed[userId] = posts
    window.localStorage.setItem(PROFILE_POSTS_STORAGE_KEY, JSON.stringify(parsed))
  } catch {}
}

function formatMemberSince(isoDate?: string) {
  if (!isoDate) return 'No disponible'
  const parsed = new Date(isoDate)
  if (Number.isNaN(parsed.getTime())) return 'No disponible'
  return parsed.toLocaleDateString('es-CL', { month: 'long', year: 'numeric' })
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-3 flex items-center gap-2">
      <div className="h-4 w-1 rounded-full bg-gradient-to-b from-primary to-purple-500" />
      <h3 className="text-sm font-semibold text-white">{children}</h3>
    </div>
  )
}

function ProfilePageContent() {
  const { user, logout, updateUser, isAuthReady } = useAuth()
  const router = useRouter()
  const [avatarError, setAvatarError] = useState(false)
  const [coverError, setCoverError] = useState(false)
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)
  const [isUploadingCover, setIsUploadingCover] = useState(false)
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const coverInputRef = useRef<HTMLInputElement>(null)
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
    if (isAuthReady && !user) router.replace('/auth')
  }, [isAuthReady, router, user])

  useEffect(() => {
    if (!user) return
    setBioDraft(user.bio ?? '')
    setUserPosts(loadPostsByUser(user.id))
  }, [user])

  const [attendedEvents, setAttendedEvents] = useState<AttendedEventItem[]>([])

  useEffect(() => {
    if (!user) { setAttendedEvents([]); return }
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
      setAttendedEvents(unique.map((e) => ({
        id: e.event_id,
        title: e.event_title,
        imageUrl: e.event_image_url ?? 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800&q=80',
        location: e.event_address ?? 'Santiago, Chile',
        savedAt: e.created_at,
      })))
    })
    return () => { cancelled = true }
  }, [user])

  useEffect(() => {
    if (!selectedEventId && attendedEvents.length > 0) setSelectedEventId(attendedEvents[0].id)
  }, [attendedEvents, selectedEventId])

  if (!isAuthReady) {
    return (
      <Layout headerTitle="Perfil">
        <div className="animate-pulse space-y-4 px-4 py-6">
          <div className="h-52 rounded-2xl bg-white/5" />
          <div className="h-20 w-20 -mt-10 mx-auto rounded-full bg-white/10" />
          <div className="h-5 w-40 mx-auto rounded bg-white/5" />
          <div className="grid grid-cols-3 gap-3 mt-6">
            {[0,1,2].map(i => <div key={i} className="h-24 rounded-2xl bg-white/5" />)}
          </div>
        </div>
      </Layout>
    )
  }

  if (!user) return null

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
    } catch {} finally {
      setIsUploadingAvatar(false)
      if (avatarInputRef.current) avatarInputRef.current.value = ''
    }
  }

  async function handleCoverChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setIsUploadingCover(true)
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = reject
        reader.readAsDataURL(file)
      })
      await updateUser({ coverUrl: dataUrl })
      setCoverError(false)
    } catch {} finally {
      setIsUploadingCover(false)
      if (coverInputRef.current) coverInputRef.current.value = ''
    }
  }

  async function handleSaveBio() {
    setIsSavingBio(true)
    try {
      await updateUser({ bio: bioDraft.trim() })
      setShowBioEditor(false)
    } catch {} finally { setIsSavingBio(false) }
  }

  function handlePublishPost() {
    if (!selectedEventId) { setPostError('Selecciona un evento asistido para publicar.'); return }
    if (postCaption.trim().length < 8) { setPostError('Escribe una descripción de al menos 8 caracteres.'); return }
    const event = attendedEvents.find((item) => item.id === selectedEventId)
    if (!event) { setPostError('No pudimos cargar el evento seleccionado.'); return }
    const nextPost: UserPost = {
      id: `${Date.now()}-${event.id}`, eventId: event.id, title: event.title,
      caption: postCaption.trim(), imageUrl: event.imageUrl, location: event.location,
      dateLabel: formatSavedAt(event.savedAt), createdAt: new Date().toISOString(),
    }
    const nextPosts = [nextPost, ...userPosts]
    setUserPosts(nextPosts)
    savePostsByUser(user!.id, nextPosts)
    setPostCaption('')
    setPostError(null)
    setActiveTab('posts')
  }

  async function handleLogout() {
    try { await logout(); router.push('/auth') } catch {}
  }

  function toggleInterest(key: EventCategory) {
    const current = user!.interests
    const updated = current.includes(key) ? current.filter((i) => i !== key) : [...current, key]
    updateUser({ interests: updated }).catch(() => {})
  }

  const followersVal = loadingFollowers ? '...' : (followersCount ?? 0)

  const achievements = [
    {
      emoji: '❤️', label: 'Me gustaron', value: user.likedEvents.length,
      goal: 20, color: 'from-rose-500/20 to-transparent', border: 'border-rose-500/20',
      bar: 'bg-rose-500',
    },
    {
      emoji: '🔖', label: 'Guardados', value: user.savedEvents.length,
      goal: 15, color: 'from-violet-500/20 to-transparent', border: 'border-violet-500/20',
      bar: 'bg-violet-500',
    },
    {
      emoji: '✨', label: 'Intereses', value: user.interests.length,
      goal: ALL_INTERESTS.length, color: 'from-fuchsia-500/20 to-transparent', border: 'border-fuchsia-500/20',
      bar: 'bg-fuchsia-500',
    },
  ]

  return (
    <Layout headerTitle="Perfil">
      <motion.div variants={containerVariants} initial="hidden" animate="visible" className="pb-10">

        {/* ── Cover photo ── */}
        <motion.div variants={itemVariants} className="relative h-52 overflow-hidden">
          {user.coverUrl && !coverError ? (
            <Image
              src={user.coverUrl}
              alt="Portada"
              fill
              className="object-cover"
              sizes="100vw"
              onError={() => setCoverError(true)}
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-violet-900/70 via-purple-800/50 to-pink-800/40">
              <div className="absolute -left-10 -top-10 h-64 w-64 rounded-full bg-violet-500/20 blur-3xl" />
              <div className="absolute right-0 top-0 h-48 w-48 rounded-full bg-fuchsia-500/20 blur-3xl" />
              <div className="absolute bottom-0 left-1/2 h-32 w-32 rounded-full bg-pink-500/15 blur-2xl" />
              {/* Aurora mesh */}
              <div className="absolute inset-0 opacity-30" style={{
                backgroundImage: 'radial-gradient(ellipse at 20% 50%, rgba(124,58,237,0.4) 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, rgba(217,70,239,0.35) 0%, transparent 55%)',
              }} />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-surface via-transparent to-transparent" />

          {/* Cover upload button */}
          <button
            onClick={() => coverInputRef.current?.click()}
            disabled={isUploadingCover}
            className="absolute right-3 top-3 flex items-center gap-1.5 rounded-full border border-white/20 bg-black/50 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-md transition-colors hover:bg-black/70 disabled:opacity-60"
          >
            {isUploadingCover
              ? <span className="h-3 w-3 animate-spin rounded-full border border-white border-t-transparent" />
              : <Camera className="h-3.5 w-3.5" />}
            {isUploadingCover ? 'Subiendo...' : 'Editar portada'}
          </button>
          <input ref={coverInputRef} type="file" accept="image/*" className="hidden" onChange={handleCoverChange} />
        </motion.div>

        <div className="px-4">

          {/* ── Avatar + identity ── */}
          <motion.div variants={itemVariants} className="-mt-14 flex flex-col items-center text-center">
            <div className="relative mb-3">
              <div className="rounded-full bg-gradient-to-br from-primary via-purple-500 to-pink-500 p-[3px] shadow-2xl shadow-primary/40 ring-4 ring-surface">
                <div className="flex h-24 w-24 items-center justify-center rounded-full bg-surface p-0.5">
                  {!avatarError && user.avatarUrl ? (
                    <Image
                      src={user.avatarUrl} alt={user.name} width={96} height={96}
                      className="h-24 w-24 rounded-full object-cover"
                      onError={() => setAvatarError(true)}
                    />
                  ) : (
                    <div className="flex h-24 w-24 items-center justify-center rounded-full bg-[radial-gradient(circle_at_25%_20%,_rgba(124,58,237,0.45),_rgba(10,14,28,1)_70%)] text-2xl font-extrabold text-white">
                      {user.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
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
                  : <Pencil className="h-3.5 w-3.5 text-white" />}
              </button>
              <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
            </div>

            <h2 className="text-xl font-bold text-white">{user.name}</h2>
            <p className="mt-0.5 text-xs font-semibold tracking-wide text-primary-light">
              {toHandle(user.name, user.email)}
            </p>
            <p className="mt-2 max-w-xs text-sm text-muted leading-relaxed">
              {user.bio || 'Cuéntale a la comunidad quién eres.'}
            </p>
            {user.location && (
              <div className="mt-1.5 flex items-center gap-1 text-xs text-muted">
                <MapPin className="h-3 w-3 text-primary-light" />
                <span>{user.location}</span>
              </div>
            )}

            {/* Stats row */}
            <div className="mt-4 flex items-center divide-x divide-white/10 rounded-2xl border border-white/10 bg-white/[0.04] px-1">
              <div className="flex flex-col items-center px-4 py-2">
                <span className="text-base font-black text-white">{user.likedEvents.length}</span>
                <span className="text-[10px] text-muted">Likes</span>
              </div>
              <div className="flex flex-col items-center px-4 py-2">
                <span className="text-base font-black text-white">{user.savedEvents.length}</span>
                <span className="text-[10px] text-muted">Guardados</span>
              </div>
              <div className="flex flex-col items-center px-4 py-2">
                <span className="text-base font-black text-white">{followersVal}</span>
                <span className="text-[10px] text-muted">Seguidores</span>
              </div>
              <div className="flex flex-col items-center px-4 py-2">
                <span className="text-base font-black text-white">{userPosts.length}</span>
                <span className="text-[10px] text-muted">Posts</span>
              </div>
            </div>

            <div className="mt-4">
              <button
                onClick={() => setShowBioEditor((prev) => !prev)}
                className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/[0.05] px-4 py-2 text-xs font-semibold text-slate-200 transition-colors hover:border-white/40 hover:bg-white/10"
              >
                <Pencil className="h-3.5 w-3.5" />
                Editar perfil
              </button>
            </div>
          </motion.div>

          {/* ── Bio editor ── */}
          <AnimatePresence>
            {showBioEditor && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-4 overflow-hidden"
              >
                <div className="rounded-2xl border border-white/10 bg-card/60 p-4">
                  <SectionTitle>Descripción del perfil</SectionTitle>
                  <textarea
                    value={bioDraft}
                    onChange={(e) => setBioDraft(e.target.value)}
                    maxLength={220}
                    rows={3}
                    className="w-full rounded-xl border border-white/10 bg-surface px-3 py-2 text-sm text-white outline-none transition-colors focus:border-primary placeholder:text-muted"
                    placeholder="Amante del jazz, brunchs y planes culturales con amigos."
                  />
                  <div className="mt-3 flex items-center justify-between">
                    <p className="text-[11px] text-muted">{bioDraft.length}/220</p>
                    <div className="flex gap-2">
                      <button onClick={() => { setShowBioEditor(false); setBioDraft(user.bio ?? '') }}
                        className="rounded-full border border-white/20 px-3 py-1.5 text-xs font-semibold text-slate-200">
                        Cancelar
                      </button>
                      <button onClick={handleSaveBio} disabled={isSavingBio}
                        className="rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60">
                        {isSavingBio ? 'Guardando...' : 'Guardar bio'}
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Achievements ── */}
          <motion.div variants={itemVariants} className="mt-6 mb-6">
            <SectionTitle>Logros</SectionTitle>
            <div className="grid grid-cols-3 gap-2.5">
              {achievements.map((a) => {
                const pct = Math.min(100, (a.value / a.goal) * 100)
                const done = a.value >= a.goal
                return (
                  <div key={a.label} className={`relative overflow-hidden rounded-2xl border bg-gradient-to-b ${a.color} ${a.border} p-3`}>
                    {done && (
                      <div className="absolute right-2 top-2 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500">
                        <Check className="h-2.5 w-2.5 text-white" />
                      </div>
                    )}
                    <p className="text-2xl mb-1">{a.emoji}</p>
                    <p className="text-2xl font-black text-white leading-none">{a.value}</p>
                    <p className="text-[11px] text-muted mt-0.5">{a.label}</p>
                    <div className="mt-2.5 h-1 w-full overflow-hidden rounded-full bg-white/10">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.6, ease: 'easeOut', delay: 0.2 }}
                        className={`h-full rounded-full ${a.bar}`}
                      />
                    </div>
                    <p className="text-[9px] text-muted mt-1">Meta {a.goal}</p>
                  </div>
                )
              })}
            </div>
          </motion.div>

          {/* ── Creator mode ── */}
          <motion.div variants={itemVariants} className="mb-6 rounded-2xl border border-white/10 bg-card/60 p-4">
            <SectionTitle>Modo creador</SectionTitle>

            {/* Tab bar */}
            <div className="mb-4 grid grid-cols-3 gap-1 rounded-xl border border-white/10 bg-surface/60 p-1">
              {(['posts', 'attended', 'about'] as ProfileTab[]).map((tab) => {
                const labels: Record<ProfileTab, string> = { posts: 'Posts', attended: 'Asistidos', about: 'Perfil' }
                return (
                  <button key={tab} onClick={() => setActiveTab(tab)}
                    className={`rounded-lg py-2 text-xs font-semibold transition-colors ${
                      activeTab === tab ? 'bg-primary text-white shadow-sm' : 'text-slate-400 hover:bg-white/10 hover:text-slate-200'
                    }`}
                  >
                    {labels[tab]}
                  </button>
                )
              })}
            </div>

            {activeTab === 'posts' && (
              <div>
                <div className="mb-4 rounded-xl border border-white/10 bg-surface/70 p-3">
                  <p className="mb-2 text-xs font-semibold text-primary-light">Publicar evento asistido</p>
                  <div className="grid gap-2 sm:grid-cols-[1fr_2fr_auto]">
                    <select value={selectedEventId} onChange={(e) => setSelectedEventId(e.target.value)}
                      className="rounded-lg border border-white/10 bg-card px-3 py-2 text-sm text-white outline-none">
                      {attendedEvents.map((ev) => (
                        <option key={ev.id} value={ev.id}>{ev.title}</option>
                      ))}
                    </select>
                    <input value={postCaption} onChange={(e) => setPostCaption(e.target.value)}
                      placeholder="Describe cómo te fue en ese evento..."
                      className="rounded-lg border border-white/10 bg-card px-3 py-2 text-sm text-white outline-none" />
                    <button onClick={handlePublishPost}
                      className="inline-flex items-center justify-center gap-1 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-white">
                      <Plus className="h-4 w-4" /> Publicar
                    </button>
                  </div>
                  {postError && <p className="mt-2 text-xs text-red-300">{postError}</p>}
                </div>

                {userPosts.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-white/20 bg-surface/40 px-4 py-8 text-center">
                    <ImageIcon className="mx-auto h-6 w-6 text-primary-light" />
                    <p className="mt-2 text-sm font-semibold text-white">Aún no publicas experiencias</p>
                    <p className="mt-1 text-xs text-muted">Publica el primer evento al que asististe.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
                    {userPosts.map((post) => (
                      <article key={post.id} className="group overflow-hidden rounded-xl border border-white/10 bg-surface/60">
                        <div className="relative h-36 overflow-hidden">
                          <Image src={post.imageUrl} alt={post.title} fill
                            className="object-cover transition-transform duration-300 group-hover:scale-105" sizes="(max-width: 768px) 50vw, 33vw" />
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
                              <MessageCircle className="h-3 w-3" /> Publicado
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
                    <CalendarDays className="mx-auto h-6 w-6 text-primary-light" />
                    <p className="mt-2 text-sm font-semibold text-white">Aún no registras eventos asistidos</p>
                    <p className="mt-1 text-xs text-muted">Cuando des like o guardes eventos, aparecerán aquí.</p>
                  </div>
                ) : (
                  <div className="grid gap-2">
                    {attendedEvents.map((ev) => (
                      <article key={ev.id} className="flex gap-3 rounded-xl border border-white/10 bg-surface/60 p-2.5">
                        <Image src={ev.imageUrl} alt={ev.title} width={72} height={72}
                          className="h-[72px] w-[72px] flex-shrink-0 rounded-lg object-cover" />
                        <div className="min-w-0">
                          <p className="line-clamp-1 text-sm font-semibold text-white">{ev.title}</p>
                          <p className="mt-0.5 text-[11px] text-muted">Guardado el {formatSavedAt(ev.savedAt)}</p>
                          <p className="mt-1 line-clamp-1 text-xs text-primary-light">{ev.location}</p>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'about' && (
              <div className="space-y-3">
                <div className="rounded-xl border border-white/10 bg-surface/60 p-3">
                  <p className="text-[11px] uppercase tracking-wide text-muted">Descripción</p>
                  <p className="mt-1 text-sm text-white">
                    {user.bio || 'Sin descripción. Usa "Editar perfil" para agregar una bio.'}
                  </p>
                </div>
                <div className="rounded-xl border border-white/10 bg-surface/60 p-3">
                  <p className="text-[11px] uppercase tracking-wide text-muted">Intereses activos</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {user.interests.map((interest) => (
                      <span key={interest} className="rounded-full border border-violet-500/30 bg-violet-500/15 px-2.5 py-1 text-xs text-violet-300">
                        {CATEGORY_EMOJI[interest]} {interest}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </motion.div>

          {/* ── Interests ── */}
          <motion.div variants={itemVariants} className="mb-6">
            <SectionTitle>Mis intereses</SectionTitle>
            <p className="mb-3 text-xs text-muted">Personaliza tu feed seleccionando lo que más te gusta.</p>
            <div className="flex flex-wrap gap-2">
              {ALL_INTERESTS.map(({ key, label }) => {
                const isActive = user.interests.includes(key)
                return (
                  <motion.button key={key} whileTap={{ scale: 0.93 }} onClick={() => toggleInterest(key)}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm font-medium transition-all duration-200 ${
                      isActive
                        ? 'border-violet-500 bg-violet-600 text-white shadow-lg shadow-violet-700/30'
                        : 'border-white/15 bg-white/[0.04] text-slate-400 hover:border-white/30 hover:text-slate-200'
                    }`}
                  >
                    <span>{CATEGORY_EMOJI[key]}</span>
                    <span>{label}</span>
                  </motion.button>
                )
              })}
            </div>
          </motion.div>

          {/* ── Account ── */}
          <motion.div variants={itemVariants}>
            <SectionTitle>Cuenta</SectionTitle>
            <div className="mb-4 overflow-hidden rounded-2xl border border-white/5 bg-card">
              <div className="flex items-center gap-3 border-b border-white/5 px-4 py-3.5">
                <Mail className="h-4 w-4 shrink-0 text-primary-light" />
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-muted">Email</p>
                  <p className="text-sm font-medium text-white">{user.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 px-4 py-3.5">
                <CalendarDays className="h-4 w-4 shrink-0 text-primary-light" />
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-muted">Miembro desde</p>
                  <p className="text-sm font-medium text-white">{formatMemberSince(user.createdAt)}</p>
                </div>
              </div>
            </div>
            <button onClick={handleLogout}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-red-500/30 bg-red-500/10 py-3.5 text-sm font-semibold text-red-400 transition-colors hover:bg-red-500/20 active:scale-95">
              <LogOut className="h-5 w-5" />
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
