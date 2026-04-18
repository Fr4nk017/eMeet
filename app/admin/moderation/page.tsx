'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ShieldAlert, ShieldCheck, Clock, AlertTriangle, RefreshCw, Check, X, Eye } from 'lucide-react'
import { useAuth } from '@/src/context/AuthContext'
import { getSupabaseBrowserClient, hasSupabaseEnv } from '@/src/lib/supabase'
import KpiCard, { KpiCardSkeleton } from '@/src/components/admin/KpiCard'
import { cn } from '@/src/lib/cn'

// ─── Types — coinciden con tabla `reports` (migración 005) ────────────────────

type ReportType = 'spam' | 'inappropriate' | 'fake' | 'other'
type ReportStatus = 'pending' | 'resolved' | 'dismissed'

interface Report {
  id: string
  type: ReportType
  description: string
  target_title?: string
  target_type: 'event' | 'user' | 'comment'
  target_id: string
  reporter_id: string
  status: ReportStatus
  created_at: string
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatRelative(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime()
  const diffMin = Math.floor(diffMs / 60_000)
  if (diffMin < 1) return 'ahora'
  if (diffMin < 60) return `${diffMin}m`
  const diffH = Math.floor(diffMin / 60)
  if (diffH < 24) return `${diffH}h`
  return `${Math.floor(diffH / 24)}d`
}

const TYPE_CONFIG: Record<ReportType, { label: string; className: string }> = {
  spam:          { label: 'Spam',         className: 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/30' },
  inappropriate: { label: 'Inapropiado',  className: 'bg-em-negative/15 text-em-negative border border-em-negative/30' },
  fake:          { label: 'Falso',        className: 'bg-purple-500/15 text-purple-400 border border-purple-500/30' },
  other:         { label: 'Otro',         className: 'bg-white/5 text-em-muted border border-em-border' },
}

const TARGET_LABEL: Record<Report['target_type'], string> = {
  event:   'Evento',
  user:    'Usuario',
  comment: 'Comentario',
}

const STATUS_CONFIG: Record<ReportStatus, { label: string; className: string }> = {
  pending:   { label: 'Pendiente',   className: 'bg-em-warning/15 text-em-warning border border-em-warning/30' },
  resolved:  { label: 'Resuelto',    className: 'bg-em-positive/15 text-em-positive border border-em-positive/30' },
  dismissed: { label: 'Descartado',  className: 'bg-white/5 text-em-muted border border-em-border' },
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

export default function AdminModerationPage() {
  const { user, isAuthReady } = useAuth()
  const router = useRouter()
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [statusFilter, setStatusFilter] = useState<ReportStatus | 'all'>('pending')

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
      const res = await fetch('/api/admin/reports', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null
        throw new Error(body?.error ?? 'Error al cargar reportes')
      }
      const data = await res.json()
      setReports(data.reports ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => { load() }, [load, refreshKey])

  async function handleAction(id: string, action: 'resolved' | 'dismissed') {
    // Optimistic update
    setReports((prev) => prev.map((r) => (r.id === id ? { ...r, status: action } : r)))
    try {
      let token: string | null = null
      if (hasSupabaseEnv) {
        const { data } = await getSupabaseBrowserClient().auth.getSession()
        token = data.session?.access_token ?? null
      }
      await fetch(`/api/admin/reports/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ status: action }),
      })
    } catch {
      // Revert on error
      load()
    }
  }

  if (!isAuthReady) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-em-border border-t-em-accent" />
      </div>
    )
  }
  if (!user || user.role !== 'admin') return null

  const pending   = reports.filter((r) => r.status === 'pending').length
  const resolved  = reports.filter((r) => r.status === 'resolved').length
  const dismissed = reports.filter((r) => r.status === 'dismissed').length
  const total     = reports.length
  const resolutionRate = total > 0 ? Math.round(((resolved + dismissed) / total) * 100) : 0

  const kpiCards = [
    { label: 'Reportes pendientes',    value: String(pending),         change: undefined, icon: ShieldAlert,  accentColor: '#F6465D' },
    { label: 'Resueltos',              value: String(resolved),        change: undefined, icon: ShieldCheck,  accentColor: '#0ECB81' },
    { label: 'Tasa de resolución',     value: `${resolutionRate}%`,    change: undefined, icon: AlertTriangle, accentColor: '#F59E0B' },
    { label: 'Tiempo prom. respuesta', value: '—',                     change: undefined, icon: Clock,        accentColor: '#A855F7' },
  ]

  const filteredReports = statusFilter === 'all'
    ? reports
    : reports.filter((r) => r.status === statusFilter)

  return (
    <div className="min-h-full p-6">
      {/* Header */}
      <div className="mb-7 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black tracking-tight text-em-text">Moderación</h1>
          <p className="mt-0.5 text-xs text-em-muted">Revisión de contenido reportado · eMeet</p>
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
        {/* KPIs */}
        <div className="col-span-1 grid grid-cols-2 gap-3 md:col-span-12 lg:grid-cols-4">
          {loading
            ? Array.from({ length: 4 }).map((_, i) => <KpiCardSkeleton key={i} />)
            : kpiCards.map((c) => (
                <KpiCard key={c.label} label={c.label} value={c.value} change={c.change} icon={c.icon} accentColor={c.accentColor} />
              ))}
        </div>

        {/* Lista de reportes */}
        <div className="col-span-1 md:col-span-12">
          <Section title="Cola de reportes">
            {/* Filtros */}
            <div className="mb-3 flex gap-2">
              {(['all', 'pending', 'resolved', 'dismissed'] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setStatusFilter(f)}
                  className={cn(
                    'rounded-full px-3 py-1 text-xs font-medium transition-colors',
                    statusFilter === f
                      ? 'bg-em-accent text-white'
                      : 'border border-em-border bg-em-surface text-em-muted hover:text-em-text',
                  )}
                >
                  {f === 'all' ? 'Todos' : f === 'pending' ? `Pendientes (${pending})` : f === 'resolved' ? 'Resueltos' : 'Descartados'}
                </button>
              ))}
            </div>

            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-24 animate-pulse rounded-lg border border-em-border bg-em-surface" />
                ))}
              </div>
            ) : filteredReports.length === 0 ? (
              <div className="rounded-lg border border-em-border bg-em-surface py-16 text-center">
                <ShieldCheck className="mx-auto mb-3 h-10 w-10 text-em-positive/50" />
                <p className="text-sm font-medium text-em-text">
                  {total === 0 ? 'Sin reportes aún' : 'Sin reportes con este filtro'}
                </p>
                <p className="mt-1 text-xs text-em-muted">
                  {total === 0 ? 'Los reportes de usuarios aparecerán aquí.' : 'La cola está limpia.'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredReports.map((report) => (
                  <div
                    key={report.id}
                    className={cn(
                      'rounded-lg border bg-em-surface p-4 transition-colors',
                      report.status === 'pending' ? 'border-em-negative/20' : 'border-em-border',
                    )}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold', TYPE_CONFIG[report.type].className)}>
                            {TYPE_CONFIG[report.type].label}
                          </span>
                          <span className="rounded-full border border-em-border bg-white/5 px-2.5 py-0.5 text-[11px] font-medium text-em-muted">
                            {TARGET_LABEL[report.target_type]}
                          </span>
                          <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold', STATUS_CONFIG[report.status].className)}>
                            {STATUS_CONFIG[report.status].label}
                          </span>
                        </div>
                        <p className="truncate font-semibold text-em-text">
                          {report.target_title ?? report.target_id}
                        </p>
                        {report.description && (
                          <p className="mt-1 text-xs text-em-muted line-clamp-2">{report.description}</p>
                        )}
                        <p className="mt-2 text-[11px] text-em-muted">
                          ID <span className="font-mono text-em-text">{report.reporter_id.slice(0, 8)}…</span> · {formatRelative(report.created_at)}
                        </p>
                      </div>

                      {report.status === 'pending' && (
                        <div className="flex flex-shrink-0 gap-2">
                          <button
                            type="button"
                            title="Ver contenido"
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-em-border bg-em-surface text-em-muted transition-colors hover:border-white/30 hover:text-em-text"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            title="Resolver — tomar acción"
                            onClick={() => handleAction(report.id, 'resolved')}
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-em-positive/30 bg-em-positive/10 text-em-positive transition-colors hover:bg-em-positive/20"
                          >
                            <Check className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            title="Descartar — falso positivo"
                            onClick={() => handleAction(report.id, 'dismissed')}
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-em-border bg-em-surface text-em-muted transition-colors hover:border-em-negative/30 hover:text-em-negative"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Section>
        </div>
      </div>
    </div>
  )
}
