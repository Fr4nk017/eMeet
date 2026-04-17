import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { cn } from '@/src/lib/cn'
import type { LucideIcon } from 'lucide-react'

export interface KpiCardProps {
  label: string
  value: string
  change?: number
  icon: LucideIcon
  accentColor?: string
  loading?: boolean
}

export function KpiCardSkeleton() {
  return (
    <div className="rounded-lg border border-em-border bg-em-surface p-5">
      <div className="mb-4 flex items-center justify-between">
        <div className="h-8 w-8 animate-pulse rounded-lg bg-white/10" />
        <div className="h-4 w-16 animate-pulse rounded bg-white/10" />
      </div>
      <div className="h-8 w-24 animate-pulse rounded bg-white/10" />
      <div className="mt-2 h-3.5 w-32 animate-pulse rounded bg-white/10" />
    </div>
  )
}

export default function KpiCard({ label, value, change, icon: Icon, accentColor = '#FF6B00', loading }: KpiCardProps) {
  if (loading) return <KpiCardSkeleton />

  const isPositive = change !== undefined && change > 0
  const isNegative = change !== undefined && change < 0

  return (
    <div
      className="group relative overflow-hidden rounded-lg border border-em-border bg-em-surface p-5 transition-colors hover:border-white/20"
      style={{ '--accent': accentColor } as React.CSSProperties}
    >
      {/* Top-left accent glow */}
      <div
        className="pointer-events-none absolute -left-6 -top-6 h-20 w-20 rounded-full opacity-20 blur-2xl"
        style={{ background: accentColor }}
      />

      {/* Header row */}
      <div className="mb-4 flex items-start justify-between">
        <div
          className="flex h-9 w-9 items-center justify-center rounded-lg"
          style={{ background: `${accentColor}20` }}
        >
          <Icon className="h-5 w-5" style={{ color: accentColor }} />
        </div>

        {change !== undefined && (
          <span
            className={cn(
              'flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold',
              isPositive && 'bg-em-positive/15 text-em-positive',
              isNegative && 'bg-em-negative/15 text-em-negative',
              !isPositive && !isNegative && 'bg-white/5 text-em-muted',
            )}
          >
            {isPositive && <TrendingUp className="h-3 w-3" />}
            {isNegative && <TrendingDown className="h-3 w-3" />}
            {!isPositive && !isNegative && <Minus className="h-3 w-3" />}
            {Math.abs(change).toFixed(1)}%
          </span>
        )}
      </div>

      <p className="text-2xl font-black tracking-tight text-em-text">{value}</p>
      <p className="mt-1 text-xs font-medium text-em-muted">{label}</p>
    </div>
  )
}
