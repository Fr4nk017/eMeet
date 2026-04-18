'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Users, Store, Heart, Bookmark, RefreshCw } from 'lucide-react'
import { useAuth } from '@/src/context/AuthContext'
import { getSupabaseBrowserClient, hasSupabaseEnv } from '@/src/lib/supabase'
import KpiCard, { KpiCardSkeleton } from '@/src/components/admin/KpiCard'
import { cn } from '@/src/lib/cn'

// ─── Types ────────────────────────────────────────────────────────────────────

// Shape that /api/admin/stats returns in recentProfiles
interface RecentProfile {
  id: string
  name: string
  created_at: string
}

type AdminKpis = {
  totalProfiles: number
  locatariosWithEvents: number
  totalLikes: number
  totalSaves: number
}

type AdminStats = {
  kpis: AdminKpis
  recentProfiles: RecentProfile[]
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatRelative(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime()
  const diffMin = Math.floor(diffMs / 60_000)
  if (diffMin < 1) return 'ahora'
  if (diffMin < 60) return `${diffMin}m`
  const diffH = Math.floor(diffMin / 60)
  if (diffH < 24) return `${diffH}h`
  const diffD = Math.floor(diffH / 24)
  if (diffD < 30) return `${diffD}d`
  return new Date(iso).toLocaleDateString('es-CL', { day: '2-digit', month: 'short' })
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-em-text">
        <span className="h-4 w-0.5 rounded-full bg-em-accent" />
        {title}
      </h2>
      {children}
    </div>
  )
}

function UsersTableSkeleton() {
  return (
    <div className="divide-y divide-em-border">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-5 py-3.5">
          <div className="h-8 w-8 animate-pulse rounded-full bg-white/10" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3.5 w-36 animate-pulse rounded bg-white/10" />
            <div className="h-3 w-24 animate-pulse rounded bg-white/10" />
          </div>
          <div className="h-4 w-20 animate-pulse rounded bg-white/10" />
        </div>
      ))}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminUsersPage() {
  const { user, isAuthReady } = useAuth()
  const router = useRouter()
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    if (isAuthReady && (!user || user.role !== 'admin')) {
      router.replace('/auth')
    }
  }, [isAuthReady, user, router])

  const load = useCallback(async () => {
    if (!user || user.role !== 'admin') return
    setLoading(true)
    setError(null)
    try {
      let token: string | null = null
      if (hasSupabaseEnv) {
        const { data } = await getSupabaseBrowserClient().auth.getSession()
        token = data.session?.access_token ?? null
      }
      const res = await fetch('/api/admin/stats', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null
        throw new Error(body?.error ?? 'Error al cargar estadísticas')
      }
      setStats((await res.json()) as AdminStats)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => { load() }, [load, refreshKey])

  if (!isAuthReady) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-em-border border-t-em-accent" />
      </div>
    )
  }
  if (!user || user.role !== 'admin') return null

  const kpis = stats?.kpis
  const profiles = stats?.recentProfiles ?? []

  const kpiCards = [
    { label: 'Total usuarios', value: kpis ? kpis.totalProfiles.toLocaleString('es-CL') : '—', change: undefined, icon: Users, accentColor: '#3B82F6' },
    { label: 'Locatarios con eventos', value: kpis ? kpis.locatariosWithEvents.toLocaleString('es-CL') : '—', change: undefined, icon: Store, accentColor: '#FF6B00' },
    { label: 'Likes totales', value: kpis ? kpis.totalLikes.toLocaleString('es-CL') : '—', change: undefined, icon: Heart, accentColor: '#F6465D' },
    { label: 'Guardados totales', value: kpis ? kpis.totalSaves.toLocaleString('es-CL') : '—', change: undefined, icon: Bookmark, accentColor: '#A855F7' },
  ]

  return (
    <div className="min-h-full p-6">
      {/* Header */}
      <div className="mb-7 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black tracking-tight text-em-text">Usuarios</h1>
          <p className="mt-0.5 text-xs text-em-muted">Últimos registros · eMeet</p>
        </div>
        <button
          type="button"
          onClick={() => setRefreshKey((k) => k + 1)}
          disabled={loading}
          className="flex items-center gap-2 rounded-lg border border-em-border bg-em-surface px-3 py-2 text-xs font-medium text-em-muted transition-colors hover:border-white/30 hover:text-em-text disabled:opacity-50"
        >
          <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
          Actualizar
        </button>
      </div>

      {error && (
        <div className="mb-6 rounded-lg border border-em-negative/30 bg-em-negative/10 px-4 py-3 text-sm text-em-negative">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-12">
        {/* KPIs — todos reales */}
        <div className="col-span-1 grid grid-cols-2 gap-3 md:col-span-12 lg:grid-cols-4">
          {loading
            ? Array.from({ length: 4 }).map((_, i) => <KpiCardSkeleton key={i} />)
            : kpiCards.map((c) => (
                <KpiCard key={c.label} label={c.label} value={c.value} change={c.change} icon={c.icon} accentColor={c.accentColor} />
              ))}
        </div>

        {/* Tabla real de perfiles recientes */}
        <div className="col-span-1 md:col-span-12">
          <Section title="Usuarios recientes">
            <div className="overflow-hidden rounded-lg border border-em-border bg-em-surface">
              {loading ? (
                <UsersTableSkeleton />
              ) : profiles.length === 0 ? (
                <p className="py-10 text-center text-sm text-em-muted">Sin perfiles registrados aún.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-em-border">
                        {['Usuario', 'ID', 'Registrado'].map((h) => (
                          <th key={h} className="whitespace-nowrap px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-em-muted">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-em-border">
                      {profiles.map((p) => {
                        const initials = p.name
                          .split(' ')
                          .map((w) => w[0])
                          .join('')
                          .slice(0, 2)
                          .toUpperCase()
                        return (
                          <tr key={p.id} className="transition-colors hover:bg-white/[0.02]">
                            <td className="px-5 py-3.5">
                              <div className="flex items-center gap-3">
                                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-em-accent/20 text-xs font-bold text-em-accent">
                                  {initials}
                                </div>
                                <span className="font-medium text-em-text">{p.name}</span>
                              </div>
                            </td>
                            <td className="px-5 py-3.5 font-mono text-[11px] text-em-muted">
                              {p.id.slice(0, 8)}…
                            </td>
                            <td className="px-5 py-3.5 text-xs text-em-muted">
                              {formatRelative(p.created_at)}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            <p className="mt-2 text-[11px] text-em-muted">
              Mostrando los 6 más recientes. Email, rol y estado requieren campos adicionales en la tabla <code className="rounded bg-white/5 px-1">profiles</code>.
            </p>
          </Section>
        </div>
      </div>
    </div>
  )
}
