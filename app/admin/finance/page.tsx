'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { DollarSign, TrendingUp, Ticket, Percent, RefreshCw } from 'lucide-react'
import { useAuth } from '@/src/context/AuthContext'
import { getSupabaseBrowserClient, hasSupabaseEnv } from '@/src/lib/supabase'
import KpiCard, { KpiCardSkeleton } from '@/src/components/admin/KpiCard'
import { cn } from '@/src/lib/cn'

const TicketAreaChart = dynamic(() => import('@/src/components/admin/TicketAreaChart'), {
  ssr: false,
  loading: () => <div className="h-[220px] animate-pulse rounded-lg bg-white/5" />,
})

// ─── Types — coinciden con tabla `transactions` (migración 006) ───────────────

type TxType   = 'ticket' | 'suscripcion' | 'comision'
type TxStatus = 'completado' | 'pendiente' | 'reembolsado'

interface Transaction {
  id: string
  type: TxType
  description: string
  amount: number
  status: TxStatus
  event_id: string | null
  user_id: string | null
  created_at: string
}

type FinanceKpis = {
  gmv: number
  monthRevenue: number
  ticketsSold: number
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

function formatCLP(amount: number) {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(amount)
}

const TYPE_CONFIG: Record<TxType, { label: string; className: string }> = {
  ticket:      { label: 'Ticket',       className: 'bg-blue-500/15 text-blue-400 border border-blue-500/30' },
  suscripcion: { label: 'Suscripción',  className: 'bg-purple-500/15 text-purple-400 border border-purple-500/30' },
  comision:    { label: 'Comisión',     className: 'bg-em-accent/15 text-em-accent border border-em-accent/30' },
}

const STATUS_CONFIG: Record<TxStatus, { label: string; className: string }> = {
  completado:  { label: 'Completado',  className: 'bg-em-positive/15 text-em-positive border border-em-positive/30' },
  pendiente:   { label: 'Pendiente',   className: 'bg-em-warning/15 text-em-warning border border-em-warning/30' },
  reembolsado: { label: 'Reembolsado', className: 'bg-em-negative/15 text-em-negative border border-em-negative/30' },
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

function TxTableSkeleton() {
  return (
    <div className="divide-y divide-em-border">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-5 py-3.5">
          <div className="flex-1 space-y-1.5">
            <div className="h-3.5 w-56 animate-pulse rounded bg-white/10" />
            <div className="h-3 w-28 animate-pulse rounded bg-white/10" />
          </div>
          <div className="h-5 w-16 animate-pulse rounded-full bg-white/10" />
          <div className="h-4 w-20 animate-pulse rounded bg-white/10" />
        </div>
      ))}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminFinancePage() {
  const { user, isAuthReady } = useAuth()
  const router = useRouter()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [kpis, setKpis] = useState<FinanceKpis | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [typeFilter, setTypeFilter] = useState<TxType | 'all'>('all')

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
      const res = await fetch('/api/admin/finance', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null
        throw new Error(body?.error ?? 'Error al cargar finanzas')
      }
      const data = await res.json()
      setTransactions(data.transactions ?? [])
      setKpis(data.kpis ?? null)
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

  const kpiCards = [
    { label: 'GMV Total',       value: kpis ? formatCLP(kpis.gmv) : '—',              change: undefined, icon: DollarSign,  accentColor: '#FF6B00' },
    { label: 'Ingresos del mes', value: kpis ? formatCLP(kpis.monthRevenue) : '—',    change: undefined, icon: TrendingUp,  accentColor: '#0ECB81' },
    { label: 'Tickets vendidos', value: kpis ? String(kpis.ticketsSold) : '—',        change: undefined, icon: Ticket,      accentColor: '#3B82F6' },
    { label: 'Comisión eMeet',   value: '15%',                                         change: undefined, icon: Percent,     accentColor: '#A855F7' },
  ]

  const filteredTxs = typeFilter === 'all'
    ? transactions
    : transactions.filter((t) => t.type === typeFilter)

  return (
    <div className="min-h-full p-6">
      {/* Header */}
      <div className="mb-7 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black tracking-tight text-em-text">Finanzas</h1>
          <p className="mt-0.5 text-xs text-em-muted">Revenue y transacciones · eMeet</p>
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

        {/* Gráfico */}
        <div className="col-span-1 md:col-span-12">
          <Section title="Venta de Tickets vs Tiempo">
            <div className="rounded-lg border border-em-border bg-em-surface p-5">
              <TicketAreaChart />
            </div>
          </Section>
        </div>

        {/* Tabla de transacciones */}
        <div className="col-span-1 md:col-span-12">
          <Section title="Transacciones recientes">
            <div className="mb-3 flex gap-2">
              {(['all', 'ticket', 'suscripcion', 'comision'] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setTypeFilter(f)}
                  className={cn(
                    'rounded-full px-3 py-1 text-xs font-medium transition-colors',
                    typeFilter === f
                      ? 'bg-em-accent text-white'
                      : 'border border-em-border bg-em-surface text-em-muted hover:text-em-text',
                  )}
                >
                  {f === 'all' ? 'Todas' : f === 'ticket' ? 'Tickets' : f === 'suscripcion' ? 'Suscripciones' : 'Comisiones'}
                </button>
              ))}
            </div>

            <div className="overflow-hidden rounded-lg border border-em-border bg-em-surface">
              {loading ? (
                <TxTableSkeleton />
              ) : filteredTxs.length === 0 ? (
                <p className="py-10 text-center text-sm text-em-muted">
                  {transactions.length === 0
                    ? 'Sin transacciones registradas aún.'
                    : 'Sin transacciones con este filtro.'}
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-em-border">
                        {['Descripción', 'Tipo', 'Estado', 'Monto', 'Fecha'].map((h) => (
                          <th key={h} className="whitespace-nowrap px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-em-muted">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-em-border">
                      {filteredTxs.map((tx) => (
                        <tr key={tx.id} className="transition-colors hover:bg-white/[0.02]">
                          <td className="max-w-[260px] px-5 py-3.5">
                            <span className="block truncate font-medium text-em-text">{tx.description}</span>
                          </td>
                          <td className="px-5 py-3.5">
                            <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold', TYPE_CONFIG[tx.type].className)}>
                              {TYPE_CONFIG[tx.type].label}
                            </span>
                          </td>
                          <td className="px-5 py-3.5">
                            <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold', STATUS_CONFIG[tx.status].className)}>
                              {STATUS_CONFIG[tx.status].label}
                            </span>
                          </td>
                          <td className={cn('px-5 py-3.5 text-sm font-semibold tabular-nums', tx.amount < 0 ? 'text-em-negative' : 'text-em-text')}>
                            {formatCLP(tx.amount)}
                          </td>
                          <td className="px-5 py-3.5 text-xs text-em-muted">{formatRelative(tx.created_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </Section>
        </div>
      </div>
    </div>
  )
}
