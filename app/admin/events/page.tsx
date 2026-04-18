'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { CalendarDays, MessageSquare, Heart, Users, RefreshCw } from 'lucide-react'
import { useAuth } from '@/src/context/AuthContext'
import { getSupabaseBrowserClient, hasSupabaseEnv } from '@/src/lib/supabase'
import KpiCard, { KpiCardSkeleton } from '@/src/components/admin/KpiCard'
import EventsTable, { EventsTableSkeleton } from '@/src/components/admin/EventsTable'
import type { AdminEvent } from '@/src/components/admin/EventsTable'
import { cn } from '@/src/lib/cn'

// ─── Types ────────────────────────────────────────────────────────────────────

type RawRecentEvent = {
  id: string
  title: string
  category: string
  address: string
  created_at: string
  organizer_name: string
  status?: 'live' | 'draft' | 'flagged' // migración 006 añade esta columna
}

type AdminKpis = {
  totalEvents: number
  totalCommunities: number
  totalLikes: number
  totalMessages: number
}

type AdminStats = {
  kpis: AdminKpis
  recentEvents: RawRecentEvent[]
}

function toAdminEvent(e: RawRecentEvent): AdminEvent {
  return {
    id: e.id,
    title: e.title,
    category: e.category,
    organizerName: e.organizer_name,
    status: e.status ?? 'draft',
    createdAt: e.created_at,
  }
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

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminEventsPage() {
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
  const events: AdminEvent[] = (stats?.recentEvents ?? []).map(toAdminEvent)

  // Todos los KPIs son reales desde /api/admin/stats
  const kpiCards = [
    { label: 'Total eventos', value: kpis ? kpis.totalEvents.toLocaleString('es-CL') : '—', change: undefined, icon: CalendarDays, accentColor: '#3B82F6' },
    { label: 'Comunidades activas', value: kpis ? kpis.totalCommunities.toLocaleString('es-CL') : '—', change: undefined, icon: Users, accentColor: '#0ECB81' },
    { label: 'Likes totales', value: kpis ? kpis.totalLikes.toLocaleString('es-CL') : '—', change: undefined, icon: Heart, accentColor: '#F6465D' },
    { label: 'Mensajes enviados', value: kpis ? kpis.totalMessages.toLocaleString('es-CL') : '—', change: undefined, icon: MessageSquare, accentColor: '#A855F7' },
  ]

  return (
    <div className="min-h-full p-6">
      {/* Header */}
      <div className="mb-7 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black tracking-tight text-em-text">Eventos</h1>
          <p className="mt-0.5 text-xs text-em-muted">Publicaciones recientes · eMeet</p>
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

        {/* Tabla real de eventos recientes */}
        <div className="col-span-1 md:col-span-12">
          <Section title="Eventos recientes">
            <div className="overflow-hidden rounded-lg border border-em-border bg-em-surface">
              {loading ? (
                <EventsTableSkeleton />
              ) : (
                <EventsTable events={events} loading={false} />
              )}
            </div>
            <p className="mt-2 text-[11px] text-em-muted">
              Mostrando los 8 más recientes. El estado será real tras ejecutar <code className="rounded bg-white/5 px-1">006_transactions_and_event_status.sql</code> en Supabase.
            </p>
          </Section>
        </div>
      </div>
    </div>
  )
}
