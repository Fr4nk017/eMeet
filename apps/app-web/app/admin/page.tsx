'use client'

import { useAuth } from '@/src/context/AuthContext'
import { useAdmin, AdminProvider } from '@/src/context/AdminContext'
import type { AdminUser } from '@/src/context/AdminContext'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LogOut, Users, BarChart3, Calendar, AlertCircle, Trash2,
  RefreshCw, Search, ShieldOff, Shield, Heart, Home, X,
  ChevronUp, ChevronDown, ChevronsUpDown, ChevronLeft, ChevronRight,
} from 'lucide-react'

const USERS_PER_PAGE = 10
const EVENTS_PER_PAGE = 10

// ─── Small components ─────────────────────────────────────────────────────────

function RoleBadge({ role }: { role: AdminUser['role'] }) {
  const cls = {
    admin: 'border-[hsl(262,80%,60%)]/25 bg-[hsl(262,80%,60%)]/12 text-[hsl(262,80%,70%)]',
    locatario: 'border-[hsl(38,95%,55%)]/25 bg-[hsl(38,95%,55%)]/12 text-[hsl(38,95%,65%)]',
    user: 'border-white/12 bg-white/6 text-slate-300',
  }[role]
  return (
    <span className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${cls}`}>{role}</span>
  )
}

function StatusBadge({ banned }: { banned: boolean }) {
  return (
    <span className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${
      banned
        ? 'border-red-500/25 bg-red-500/10 text-red-400'
        : 'border-emerald-500/25 bg-emerald-500/10 text-emerald-400'
    }`}>
      {banned ? 'Suspendido' : 'Activo'}
    </span>
  )
}

function UserAvatar({ name, role }: { name: string; role: AdminUser['role'] }) {
  const cls = {
    admin: 'bg-[hsl(262,80%,60%)]/20 text-[hsl(262,80%,70%)]',
    locatario: 'bg-[hsl(38,95%,55%)]/18 text-[hsl(38,95%,65%)]',
    user: 'bg-white/10 text-slate-300',
  }[role]
  return (
    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${cls}`}>
      {name.charAt(0).toUpperCase()}
    </div>
  )
}

function ConfirmDelete({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-slate-400">¿Eliminar?</span>
      <button
        onClick={onConfirm}
        className="rounded-lg bg-red-500/15 px-2.5 py-1 text-xs font-semibold text-red-400 transition-colors hover:bg-red-500/25"
      >
        Sí
      </button>
      <button
        onClick={onCancel}
        className="rounded-lg bg-white/8 px-2.5 py-1 text-xs font-medium text-slate-300 transition-colors hover:bg-white/15"
      >
        No
      </button>
    </div>
  )
}

function StatCard({
  label, value, icon: Icon, accentClass, loading,
}: {
  label: string; value: number; icon: React.ElementType; accentClass: string; loading: boolean
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[rgba(15,23,42,0.75)] p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-slate-400">{label}</p>
          {loading ? (
            <div className="mt-2 h-8 w-14 animate-pulse rounded-lg bg-white/10" />
          ) : (
            <p className="mt-1 text-3xl font-bold text-white">{value}</p>
          )}
        </div>
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${accentClass}`}>
          <Icon size={19} />
        </div>
      </div>
    </div>
  )
}

type SortDir = 'asc' | 'desc'

function SortTh({
  col, label, sortCol, sortDir, onSort,
}: {
  col: string; label: string; sortCol: string; sortDir: SortDir; onSort: (col: string) => void
}) {
  const active = sortCol === col
  return (
    <th
      onClick={() => onSort(col)}
      className="cursor-pointer select-none px-5 py-3 text-left text-xs font-medium text-slate-500 transition-colors hover:text-slate-300"
    >
      <div className="flex items-center gap-1">
        {label}
        <span className={active ? 'text-[hsl(262,80%,65%)]' : 'text-slate-700'}>
          {active
            ? sortDir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />
            : <ChevronsUpDown size={12} />}
        </span>
      </div>
    </th>
  )
}

function Pagination({
  page, total, perPage, onPageChange,
}: {
  page: number; total: number; perPage: number; onPageChange: (p: number) => void
}) {
  const totalPages = Math.ceil(total / perPage)
  if (totalPages <= 1) return null
  const start = (page - 1) * perPage + 1
  const end = Math.min(page * perPage, total)

  return (
    <div className="flex items-center justify-between border-t border-white/8 px-5 py-3">
      <span className="text-xs text-slate-500">{start}–{end} de {total}</span>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-white/8 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
        >
          <ChevronLeft size={14} />
        </button>
        <span className="min-w-[3.5rem] text-center text-xs text-slate-400">{page} / {totalPages}</span>
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page === totalPages}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-white/8 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
        >
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  )
}

// ─── Main content ─────────────────────────────────────────────────────────────

function AdminPageContent() {
  const { user, logout } = useAuth()
  const {
    users, events, statistics,
    isLoadingUsers, isLoadingEvents, isLoadingStats,
    fetchUsers, fetchEvents, fetchStatistics,
    deleteUser, deleteEvent, updateUser,
    error,
  } = useAdmin()
  const router = useRouter()

  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'events'>('overview')

  // Search
  const [userSearch, setUserSearch] = useState('')
  const [eventSearch, setEventSearch] = useState('')

  // Filters
  const [roleFilter, setRoleFilter] = useState<'all' | 'user' | 'locatario'>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'banned'>('all')

  // Sort
  const [userSort, setUserSort] = useState<{ col: string; dir: SortDir }>({ col: 'created_at', dir: 'desc' })
  const [eventSort, setEventSort] = useState<{ col: string; dir: SortDir }>({ col: 'date', dir: 'desc' })

  // Pagination
  const [userPage, setUserPage] = useState(1)
  const [eventPage, setEventPage] = useState(1)

  // Actions
  const [confirmDeleteUser, setConfirmDeleteUser] = useState<string | null>(null)
  const [confirmDeleteEvent, setConfirmDeleteEvent] = useState<string | null>(null)
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null)

  useEffect(() => {
    fetchUsers()
    fetchEvents()
    fetchStatistics()
  }, [fetchUsers, fetchEvents, fetchStatistics])

  // Reset page on filter/search change
  useEffect(() => { setUserPage(1) }, [userSearch, roleFilter, statusFilter, userSort])
  useEffect(() => { setEventPage(1) }, [eventSearch, eventSort])

  // ── Filtered + sorted + paginated users ──────────────────────────────────
  const filteredUsers = useMemo(() => {
    let result = users.filter((u) =>
      u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email.toLowerCase().includes(userSearch.toLowerCase())
    )
    if (roleFilter !== 'all') result = result.filter((u) => u.role === roleFilter)
    if (statusFilter === 'active') result = result.filter((u) => !u.is_banned)
    if (statusFilter === 'banned') result = result.filter((u) => u.is_banned)

    return [...result].sort((a, b) => {
      const { col, dir } = userSort
      const aVal = String((a as unknown as Record<string, unknown>)[col] ?? '')
      const bVal = String((b as unknown as Record<string, unknown>)[col] ?? '')
      return dir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal)
    })
  }, [users, userSearch, roleFilter, statusFilter, userSort])

  const paginatedUsers = useMemo(() => {
    const start = (userPage - 1) * USERS_PER_PAGE
    return filteredUsers.slice(start, start + USERS_PER_PAGE)
  }, [filteredUsers, userPage])

  // ── Filtered + sorted + paginated events ─────────────────────────────────
  const filteredEvents = useMemo(() => {
    const result = events.filter((e) =>
      e.title.toLowerCase().includes(eventSearch.toLowerCase()) ||
      (e.location ?? '').toLowerCase().includes(eventSearch.toLowerCase()) ||
      (e.created_by ?? '').toLowerCase().includes(eventSearch.toLowerCase())
    )

    return [...result].sort((a, b) => {
      const { col, dir } = eventSort
      const aVal = String((a as unknown as Record<string, unknown>)[col] ?? '')
      const bVal = String((b as unknown as Record<string, unknown>)[col] ?? '')
      return dir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal)
    })
  }, [events, eventSearch, eventSort])

  const paginatedEvents = useMemo(() => {
    const start = (eventPage - 1) * EVENTS_PER_PAGE
    return filteredEvents.slice(start, start + EVENTS_PER_PAGE)
  }, [filteredEvents, eventPage])

  // ── Role distribution ─────────────────────────────────────────────────────
  const roleDistribution = useMemo(() => ({
    user: users.filter((u) => u.role === 'user').length,
    locatario: users.filter((u) => u.role === 'locatario').length,
    admin: users.filter((u) => u.role === 'admin').length,
  }), [users])

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleLogout = async () => {
    await logout()
    router.push('/auth')
  }

  const handleToggleBan = async (u: AdminUser) => {
    setUpdatingUserId(u.id)
    await updateUser(u.id, undefined, !u.is_banned)
    setUpdatingUserId(null)
  }

  const handleRoleChange = async (u: AdminUser, newRole: string) => {
    setUpdatingUserId(u.id)
    await updateUser(u.id, newRole, undefined)
    setUpdatingUserId(null)
  }

  const handleUserSort = (col: string) => {
    setUserSort((prev) => ({ col, dir: prev.col === col && prev.dir === 'asc' ? 'desc' : 'asc' }))
  }

  const handleEventSort = (col: string) => {
    setEventSort((prev) => ({ col, dir: prev.col === col && prev.dir === 'asc' ? 'desc' : 'asc' }))
  }

  const refreshAll = () => { fetchUsers(); fetchEvents(); fetchStatistics() }

  // ── Loading / access guards ───────────────────────────────────────────────
  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[hsl(222,47%,6%)]">
        <span className="h-8 w-8 animate-spin rounded-full border-2 border-white/15 border-t-white" />
      </div>
    )
  }

  if (user.role !== 'admin') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[hsl(222,47%,6%)]">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/15 ring-1 ring-red-500/25">
            <AlertCircle size={30} className="text-red-400" />
          </div>
          <h1 className="mb-1.5 text-2xl font-bold text-white">Acceso Denegado</h1>
          <p className="mb-6 text-sm text-slate-400">No tienes permisos para acceder a esta página.</p>
          <button
            onClick={() => router.push('/')}
            className="rounded-xl bg-[hsl(262,80%,60%)] px-6 py-2.5 text-sm font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-[hsl(262,80%,65%)]"
          >
            Volver al inicio
          </button>
        </div>
      </div>
    )
  }

  const NAV_ITEMS = [
    { id: 'overview' as const, label: 'Resumen', icon: BarChart3 },
    { id: 'users' as const, label: 'Usuarios', icon: Users, count: users.length },
    { id: 'events' as const, label: 'Eventos', icon: Calendar, count: events.length },
  ]

  return (
    <div className="min-h-screen bg-[hsl(222,47%,6%)] text-white">

      {/* Mobile sticky header */}
      <header className="sticky top-0 z-50 border-b border-white/8 bg-[rgba(15,23,42,0.94)] px-4 py-3 backdrop-blur-xl lg:hidden">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-[hsl(262,80%,60%)] to-[hsl(262,80%,44%)]">
              <span className="text-sm">🎉</span>
            </div>
            <span className="font-semibold text-white">Admin</span>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 rounded-lg bg-red-500/10 px-3 py-1.5 text-sm text-red-400 transition-colors hover:bg-red-500/20"
          >
            <LogOut size={14} /> Salir
          </button>
        </div>
        <div className="mt-3 flex gap-1 rounded-xl bg-white/5 p-1">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`relative flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition-colors ${
                activeTab === item.id ? 'bg-[hsl(262,80%,60%)] text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <item.icon size={13} />
              {item.label}
              {'count' in item && (item.count ?? 0) > 0 && (
                <span className="rounded-full bg-white/20 px-1.5 py-0.5 text-[10px]">{item.count}</span>
              )}
            </button>
          ))}
        </div>
      </header>

      <div className="flex">
        {/* Sidebar — desktop */}
        <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-white/8 bg-[rgba(15,23,42,0.88)] lg:flex">
          <div className="flex flex-col gap-1 p-5">
            <div className="mb-7 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-[hsl(262,80%,60%)] to-[hsl(262,80%,44%)] shadow-lg shadow-purple-900/30">
                <span className="text-lg">🎉</span>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-[hsl(262,80%,65%)]">eMeet</p>
                <p className="text-sm font-semibold text-white">Panel Admin</p>
              </div>
            </div>

            {NAV_ITEMS.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all ${
                  activeTab === item.id
                    ? 'bg-[hsl(262,80%,60%)]/15 text-white ring-1 ring-inset ring-[hsl(262,80%,60%)]/20'
                    : 'text-slate-400 hover:bg-white/6 hover:text-slate-200'
                }`}
              >
                <item.icon
                  size={17}
                  className={activeTab === item.id ? 'text-[hsl(262,80%,65%)]' : ''}
                />
                <span className="flex-1 text-left">{item.label}</span>
                {'count' in item && (item.count ?? 0) > 0 && (
                  <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] text-slate-400">
                    {item.count}
                  </span>
                )}
              </button>
            ))}

            <div className="mt-2 border-t border-white/8 pt-2">
              <button
                onClick={() => router.push('/')}
                className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium text-slate-400 transition-all hover:bg-white/6 hover:text-slate-200"
              >
                <Home size={17} />
                Ir al inicio
              </button>
            </div>
          </div>

          <div className="mt-auto border-t border-white/8 p-4">
            <div className="mb-3 flex items-center gap-3 rounded-xl bg-white/5 px-3 py-2.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[hsl(262,80%,60%)]/20 text-sm font-semibold text-[hsl(262,80%,70%)]">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-white">{user.name}</p>
                <p className="truncate text-[11px] text-slate-500">{user.email}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-500/10 py-2 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/18"
            >
              <LogOut size={15} /> Cerrar sesión
            </button>
          </div>
        </aside>

        {/* Main area */}
        <main className="flex-1 px-4 py-6 lg:px-8 lg:py-8">

          {/* Page title bar */}
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-white lg:text-2xl">
                {activeTab === 'overview' ? 'Resumen general' : activeTab === 'users' ? 'Usuarios' : 'Eventos'}
              </h1>
              <p className="mt-0.5 text-sm text-slate-400">
                {activeTab === 'overview'
                  ? `Bienvenido, ${user.name}`
                  : activeTab === 'users'
                  ? `${filteredUsers.length} registro${filteredUsers.length !== 1 ? 's' : ''}`
                  : `${filteredEvents.length} evento${filteredEvents.length !== 1 ? 's' : ''}`}
              </p>
            </div>
            <button
              onClick={refreshAll}
              className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3.5 py-2 text-sm text-slate-300 transition-all hover:border-white/20 hover:bg-white/10 hover:text-white"
            >
              <RefreshCw size={14} />
              <span className="hidden sm:inline">Actualizar</span>
            </button>
          </div>

          {/* Error banner */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.15 }}
                className="mb-5 overflow-hidden"
              >
                <div className="flex items-center gap-2.5 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                  <AlertCircle size={16} className="shrink-0" />
                  {error}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Stats — always visible */}
          <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard label="Total usuarios" value={statistics?.totalUsers ?? 0} icon={Users} accentClass="bg-[hsl(262,80%,60%)]/15 text-[hsl(262,80%,65%)]" loading={isLoadingStats} />
            <StatCard label="Total eventos" value={statistics?.totalEvents ?? 0} icon={Calendar} accentClass="bg-[hsl(38,95%,55%)]/15 text-[hsl(38,95%,65%)]" loading={isLoadingStats} />
            <StatCard label="Interacciones" value={statistics?.totalLikes ?? 0} icon={Heart} accentClass="bg-emerald-500/15 text-emerald-400" loading={isLoadingStats} />
            <StatCard label="Suspendidos" value={statistics?.bannedUsers ?? 0} icon={ShieldOff} accentClass="bg-red-500/15 text-red-400" loading={isLoadingStats} />
          </div>

          {/* Tab content */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
            >

              {/* ── OVERVIEW ── */}
              {activeTab === 'overview' && (
                <div className="grid gap-5 lg:grid-cols-2">

                  {/* Recent users */}
                  <div className="rounded-2xl border border-white/10 bg-[rgba(15,23,42,0.75)] p-5">
                    <div className="mb-4 flex items-center justify-between">
                      <h3 className="font-semibold text-white">Usuarios recientes</h3>
                      <button onClick={() => setActiveTab('users')} className="text-xs text-[hsl(262,80%,65%)] transition-colors hover:text-[hsl(262,80%,75%)]">
                        Ver todos →
                      </button>
                    </div>
                    {isLoadingUsers ? (
                      <div className="space-y-3.5">
                        {[1, 2, 3].map((i) => (
                          <div key={i} className="flex items-center gap-3">
                            <div className="h-8 w-8 animate-pulse rounded-full bg-white/10" />
                            <div className="flex-1 space-y-1.5">
                              <div className="h-3 w-28 animate-pulse rounded bg-white/10" />
                              <div className="h-2.5 w-40 animate-pulse rounded bg-white/7" />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : users.length === 0 ? (
                      <p className="text-sm text-slate-500">Sin datos disponibles.</p>
                    ) : (
                      <div className="space-y-3">
                        {users.slice(0, 6).map((u) => (
                          <div key={u.id} className="flex items-center gap-3">
                            <UserAvatar name={u.name} role={u.role} />
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium text-white">{u.name}</p>
                              <p className="truncate text-xs text-slate-500">{u.email}</p>
                            </div>
                            <RoleBadge role={u.role} />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Recent events */}
                  <div className="rounded-2xl border border-white/10 bg-[rgba(15,23,42,0.75)] p-5">
                    <div className="mb-4 flex items-center justify-between">
                      <h3 className="font-semibold text-white">Eventos recientes</h3>
                      <button onClick={() => setActiveTab('events')} className="text-xs text-[hsl(262,80%,65%)] transition-colors hover:text-[hsl(262,80%,75%)]">
                        Ver todos →
                      </button>
                    </div>
                    {isLoadingEvents ? (
                      <div className="space-y-3.5">
                        {[1, 2, 3].map((i) => (
                          <div key={i} className="space-y-1.5">
                            <div className="h-3 w-44 animate-pulse rounded bg-white/10" />
                            <div className="h-2.5 w-28 animate-pulse rounded bg-white/7" />
                          </div>
                        ))}
                      </div>
                    ) : events.length === 0 ? (
                      <p className="text-sm text-slate-500">Sin eventos disponibles.</p>
                    ) : (
                      <div className="divide-y divide-white/6">
                        {events.slice(0, 6).map((e) => (
                          <div key={e.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[hsl(38,95%,55%)]/15 text-[hsl(38,95%,65%)]">
                              <Calendar size={14} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium text-white">{e.title}</p>
                              <p className="text-xs text-slate-500">
                                {new Date(e.date).toLocaleDateString('es-CL')} · {e.created_by ?? '—'}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Role distribution */}
                  <div className="rounded-2xl border border-white/10 bg-[rgba(15,23,42,0.75)] p-5">
                    <h3 className="mb-4 font-semibold text-white">Distribución de roles</h3>
                    {isLoadingUsers ? (
                      <div className="grid grid-cols-3 gap-3">
                        {[1, 2, 3].map((i) => (
                          <div key={i} className="h-20 animate-pulse rounded-xl bg-white/8" />
                        ))}
                      </div>
                    ) : (
                      <div className="grid grid-cols-3 gap-3">
                        {([
                          { key: 'user', label: 'Usuarios', count: roleDistribution.user, textCls: 'text-slate-200', barCls: 'bg-white/20' },
                          { key: 'locatario', label: 'Locatarios', count: roleDistribution.locatario, textCls: 'text-[hsl(38,95%,65%)]', barCls: 'bg-[hsl(38,95%,55%)]/50' },
                          { key: 'admin', label: 'Admins', count: roleDistribution.admin, textCls: 'text-[hsl(262,80%,70%)]', barCls: 'bg-[hsl(262,80%,60%)]/50' },
                        ] as const).map(({ key, label, count, textCls, barCls }) => {
                          const pct = users.length > 0 ? Math.round((count / users.length) * 100) : 0
                          return (
                            <div key={key} className="flex flex-col items-center rounded-xl bg-white/5 px-3 py-4">
                              <p className={`text-2xl font-bold ${textCls}`}>{count}</p>
                              <p className="mt-1 text-xs text-slate-500">{label}</p>
                              <div className="mt-2.5 h-1 w-full rounded-full bg-white/10">
                                <div className={`h-full rounded-full transition-all ${barCls}`} style={{ width: `${pct}%` }} />
                              </div>
                              <p className="mt-1 text-[10px] text-slate-600">{pct}%</p>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>

                  {/* System info */}
                  <div className="rounded-2xl border border-white/10 bg-[rgba(15,23,42,0.75)] p-5">
                    <h3 className="mb-4 font-semibold text-white">Información del sistema</h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      {[
                        { label: 'Usuarios activos', value: (statistics?.totalUsers ?? 0) - (statistics?.bannedUsers ?? 0) },
                        { label: 'Eventos publicados', value: statistics?.totalEvents ?? 0 },
                        { label: 'Total interacciones', value: statistics?.totalLikes ?? 0 },
                        {
                          label: 'Actualización',
                          value: statistics?.timestamp
                            ? new Date(statistics.timestamp).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })
                            : '—',
                        },
                      ].map(({ label, value }) => (
                        <div key={label}>
                          <p className="text-xs text-slate-500">{label}</p>
                          <p className="mt-1 text-lg font-bold text-white">{value}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ── USERS ── */}
              {activeTab === 'users' && (
                <div className="overflow-hidden rounded-2xl border border-white/10 bg-[rgba(15,23,42,0.75)]">
                  {/* Toolbar */}
                  <div className="space-y-3 border-b border-white/8 px-5 py-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                      {/* Search */}
                      <div className="relative flex-1 sm:max-w-sm">
                        <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                        <input
                          type="text"
                          placeholder="Buscar por nombre o email…"
                          value={userSearch}
                          onChange={(e) => setUserSearch(e.target.value)}
                          className="w-full rounded-xl border border-white/10 bg-[hsl(222,30%,13%)] py-2 pl-9 pr-8 text-sm text-white placeholder-slate-600 outline-none transition-colors focus:border-[hsl(262,80%,60%)] focus:ring-1 focus:ring-[hsl(262,80%,60%)]/30"
                        />
                        {userSearch && (
                          <button onClick={() => setUserSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                            <X size={13} />
                          </button>
                        )}
                      </div>
                      <button
                        onClick={fetchUsers}
                        disabled={isLoadingUsers}
                        className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3.5 py-2 text-sm text-slate-300 transition-all hover:bg-white/10 disabled:opacity-50"
                      >
                        <RefreshCw size={13} className={isLoadingUsers ? 'animate-spin' : ''} />
                        Actualizar
                      </button>
                    </div>

                    {/* Filters */}
                    <div className="flex flex-wrap gap-3">
                      {/* Role filter */}
                      <div className="flex items-center gap-1 rounded-lg bg-white/5 p-1">
                        {(['all', 'user', 'locatario'] as const).map((r) => (
                          <button
                            key={r}
                            onClick={() => setRoleFilter(r)}
                            className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                              roleFilter === r
                                ? 'bg-[hsl(262,80%,60%)]/20 text-[hsl(262,80%,70%)]'
                                : 'text-slate-500 hover:text-slate-300'
                            }`}
                          >
                            {r === 'all' ? 'Todos' : r === 'user' ? 'Usuarios' : 'Locatarios'}
                          </button>
                        ))}
                      </div>

                      {/* Status filter */}
                      <div className="flex items-center gap-1 rounded-lg bg-white/5 p-1">
                        {(['all', 'active', 'banned'] as const).map((s) => (
                          <button
                            key={s}
                            onClick={() => setStatusFilter(s)}
                            className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                              statusFilter === s
                                ? s === 'banned'
                                  ? 'bg-red-500/15 text-red-400'
                                  : s === 'active'
                                  ? 'bg-emerald-500/15 text-emerald-400'
                                  : 'bg-[hsl(262,80%,60%)]/20 text-[hsl(262,80%,70%)]'
                                : 'text-slate-500 hover:text-slate-300'
                            }`}
                          >
                            {s === 'all' ? 'Todos' : s === 'active' ? 'Activos' : 'Suspendidos'}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    {isLoadingUsers ? (
                      <div className="space-y-4 p-5">
                        {[1, 2, 3, 4, 5].map((i) => (
                          <div key={i} className="flex items-center gap-4">
                            <div className="h-8 w-8 animate-pulse rounded-full bg-white/10" />
                            <div className="flex-1 space-y-1.5">
                              <div className="h-3 w-32 animate-pulse rounded bg-white/10" />
                              <div className="h-2.5 w-48 animate-pulse rounded bg-white/7" />
                            </div>
                            <div className="h-5 w-14 animate-pulse rounded-full bg-white/8" />
                            <div className="h-5 w-16 animate-pulse rounded-full bg-white/8" />
                          </div>
                        ))}
                      </div>
                    ) : filteredUsers.length === 0 ? (
                      <div className="flex flex-col items-center gap-2 py-16 text-center">
                        <Users size={30} className="text-slate-600" />
                        <p className="text-sm text-slate-400">
                          {userSearch || roleFilter !== 'all' || statusFilter !== 'all'
                            ? 'Sin resultados para esos filtros'
                            : 'No hay usuarios'}
                        </p>
                        {(userSearch || roleFilter !== 'all' || statusFilter !== 'all') && (
                          <button
                            onClick={() => { setUserSearch(''); setRoleFilter('all'); setStatusFilter('all') }}
                            className="mt-1 text-xs text-[hsl(262,80%,65%)] hover:underline"
                          >
                            Limpiar filtros
                          </button>
                        )}
                      </div>
                    ) : (
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-white/6 text-left">
                            <SortTh col="name" label="Usuario" sortCol={userSort.col} sortDir={userSort.dir} onSort={handleUserSort} />
                            <SortTh col="role" label="Rol" sortCol={userSort.col} sortDir={userSort.dir} onSort={handleUserSort} />
                            <SortTh col="is_banned" label="Estado" sortCol={userSort.col} sortDir={userSort.dir} onSort={handleUserSort} />
                            <SortTh col="created_at" label="Registrado" sortCol={userSort.col} sortDir={userSort.dir} onSort={handleUserSort} />
                            <th className="px-5 py-3 text-xs font-medium text-slate-500">Acciones</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {paginatedUsers.map((u) => (
                            <tr key={u.id} className="transition-colors hover:bg-white/3">
                              <td className="px-5 py-3.5">
                                <div className="flex items-center gap-3">
                                  <UserAvatar name={u.name} role={u.role} />
                                  <div className="min-w-0">
                                    <p className="max-w-[140px] truncate text-sm font-medium text-white">{u.name}</p>
                                    <p className="max-w-[180px] truncate text-xs text-slate-500">{u.email}</p>
                                  </div>
                                </div>
                              </td>

                              <td className="px-5 py-3.5">
                                {u.role === 'admin' ? (
                                  <RoleBadge role="admin" />
                                ) : (
                                  <select
                                    value={u.role}
                                    disabled={updatingUserId === u.id}
                                    onChange={(e) => handleRoleChange(u, e.target.value)}
                                    className="cursor-pointer rounded-lg border border-white/10 bg-[hsl(222,30%,13%)] px-2 py-1 text-xs text-white outline-none transition-colors focus:border-[hsl(262,80%,60%)] disabled:cursor-not-allowed disabled:opacity-50"
                                  >
                                    <option value="user">user</option>
                                    <option value="locatario">locatario</option>
                                  </select>
                                )}
                              </td>

                              <td className="px-5 py-3.5">
                                <StatusBadge banned={u.is_banned} />
                              </td>

                              <td className="px-5 py-3.5 text-xs text-slate-500">
                                {new Date(u.created_at).toLocaleDateString('es-CL')}
                              </td>

                              <td className="px-5 py-3.5">
                                {u.role === 'admin' ? (
                                  <span className="text-xs text-slate-600">—</span>
                                ) : confirmDeleteUser === u.id ? (
                                  <ConfirmDelete
                                    onConfirm={async () => { await deleteUser(u.id); setConfirmDeleteUser(null) }}
                                    onCancel={() => setConfirmDeleteUser(null)}
                                  />
                                ) : (
                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={() => handleToggleBan(u)}
                                      disabled={updatingUserId === u.id}
                                      title={u.is_banned ? 'Reactivar usuario' : 'Suspender usuario'}
                                      className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 ${
                                        u.is_banned
                                          ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                                          : 'bg-amber-500/10 text-amber-400 hover:bg-amber-500/20'
                                      }`}
                                    >
                                      {updatingUserId === u.id ? (
                                        <RefreshCw size={11} className="animate-spin" />
                                      ) : u.is_banned ? (
                                        <Shield size={11} />
                                      ) : (
                                        <ShieldOff size={11} />
                                      )}
                                      {u.is_banned ? 'Reactivar' : 'Suspender'}
                                    </button>
                                    <button
                                      onClick={() => setConfirmDeleteUser(u.id)}
                                      title="Eliminar usuario"
                                      className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-red-500/10 hover:text-red-400"
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  </div>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>

                  {filteredUsers.length > USERS_PER_PAGE && (
                    <Pagination
                      page={userPage}
                      total={filteredUsers.length}
                      perPage={USERS_PER_PAGE}
                      onPageChange={setUserPage}
                    />
                  )}
                </div>
              )}

              {/* ── EVENTS ── */}
              {activeTab === 'events' && (
                <div className="overflow-hidden rounded-2xl border border-white/10 bg-[rgba(15,23,42,0.75)]">
                  <div className="flex flex-col gap-3 border-b border-white/8 px-5 py-4 sm:flex-row sm:items-center">
                    <div className="relative flex-1 sm:max-w-sm">
                      <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                      <input
                        type="text"
                        placeholder="Buscar por título, lugar u organizador…"
                        value={eventSearch}
                        onChange={(e) => setEventSearch(e.target.value)}
                        className="w-full rounded-xl border border-white/10 bg-[hsl(222,30%,13%)] py-2 pl-9 pr-8 text-sm text-white placeholder-slate-600 outline-none transition-colors focus:border-[hsl(262,80%,60%)] focus:ring-1 focus:ring-[hsl(262,80%,60%)]/30"
                      />
                      {eventSearch && (
                        <button onClick={() => setEventSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                          <X size={13} />
                        </button>
                      )}
                    </div>
                    <button
                      onClick={fetchEvents}
                      disabled={isLoadingEvents}
                      className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3.5 py-2 text-sm text-slate-300 transition-all hover:bg-white/10 disabled:opacity-50"
                    >
                      <RefreshCw size={13} className={isLoadingEvents ? 'animate-spin' : ''} />
                      Actualizar
                    </button>
                  </div>

                  <div className="overflow-x-auto">
                    {isLoadingEvents ? (
                      <div className="space-y-4 p-5">
                        {[1, 2, 3, 4, 5].map((i) => (
                          <div key={i} className="space-y-1.5">
                            <div className="h-3 w-52 animate-pulse rounded bg-white/10" />
                            <div className="h-2.5 w-32 animate-pulse rounded bg-white/7" />
                          </div>
                        ))}
                      </div>
                    ) : filteredEvents.length === 0 ? (
                      <div className="flex flex-col items-center gap-2 py-16 text-center">
                        <Calendar size={30} className="text-slate-600" />
                        <p className="text-sm text-slate-400">
                          {eventSearch ? 'Sin resultados para esa búsqueda' : 'No hay eventos'}
                        </p>
                        {eventSearch && (
                          <button onClick={() => setEventSearch('')} className="mt-1 text-xs text-[hsl(262,80%,65%)] hover:underline">
                            Limpiar búsqueda
                          </button>
                        )}
                      </div>
                    ) : (
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-white/6 text-left">
                            <SortTh col="title" label="Evento" sortCol={eventSort.col} sortDir={eventSort.dir} onSort={handleEventSort} />
                            <SortTh col="location" label="Ubicación" sortCol={eventSort.col} sortDir={eventSort.dir} onSort={handleEventSort} />
                            <SortTh col="date" label="Fecha" sortCol={eventSort.col} sortDir={eventSort.dir} onSort={handleEventSort} />
                            <SortTh col="created_by" label="Organizador" sortCol={eventSort.col} sortDir={eventSort.dir} onSort={handleEventSort} />
                            <th className="px-5 py-3 text-xs font-medium text-slate-500">Acciones</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {paginatedEvents.map((e) => (
                            <tr key={e.id} className="transition-colors hover:bg-white/3">
                              <td className="px-5 py-3.5">
                                <p className="max-w-[200px] truncate text-sm font-medium text-white">{e.title}</p>
                                {e.description && (
                                  <p className="mt-0.5 max-w-[200px] truncate text-xs text-slate-500">{e.description}</p>
                                )}
                              </td>
                              <td className="px-5 py-3.5">
                                <p className="max-w-[140px] truncate text-sm text-slate-300">{e.location || '—'}</p>
                              </td>
                              <td className="px-5 py-3.5 text-xs text-slate-400">
                                {new Date(e.date).toLocaleDateString('es-CL', {
                                  day: '2-digit', month: 'short', year: 'numeric',
                                })}
                              </td>
                              <td className="px-5 py-3.5 text-xs text-slate-400">{e.created_by || '—'}</td>
                              <td className="px-5 py-3.5">
                                {confirmDeleteEvent === e.id ? (
                                  <ConfirmDelete
                                    onConfirm={async () => { await deleteEvent(e.id); setConfirmDeleteEvent(null) }}
                                    onCancel={() => setConfirmDeleteEvent(null)}
                                  />
                                ) : (
                                  <button
                                    onClick={() => setConfirmDeleteEvent(e.id)}
                                    title="Eliminar evento"
                                    className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-red-500/10 hover:text-red-400"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>

                  {filteredEvents.length > EVENTS_PER_PAGE && (
                    <Pagination
                      page={eventPage}
                      total={filteredEvents.length}
                      perPage={EVENTS_PER_PAGE}
                      onPageChange={setEventPage}
                    />
                  )}
                </div>
              )}

            </motion.div>
          </AnimatePresence>
        </main>
      </div>
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
