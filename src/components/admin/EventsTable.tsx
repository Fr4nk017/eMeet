import { cn } from '@/src/lib/cn'

export type EventStatus = 'live' | 'draft' | 'flagged'

export interface AdminEvent {
  id: string
  title: string
  category: string
  organizerName: string
  status: EventStatus
  createdAt: string
}

const CATEGORY_LABEL: Record<string, string> = {
  gastronomia: 'Gastronomía',
  musica: 'Música',
  cultura: 'Cultura',
  networking: 'Networking',
  deporte: 'Deporte',
  fiesta: 'Fiesta',
  teatro: 'Teatro',
  arte: 'Arte',
}

const STATUS_CONFIG: Record<EventStatus, { label: string; className: string }> = {
  live: {
    label: 'Live',
    className: 'bg-em-positive/15 text-em-positive border border-em-positive/30',
  },
  draft: {
    label: 'Draft',
    className: 'bg-em-warning/15 text-em-warning border border-em-warning/30',
  },
  flagged: {
    label: 'Flagged',
    className: 'bg-em-negative/15 text-em-negative border border-em-negative/30',
  },
}

function formatRelative(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime()
  const diffMin = Math.floor(diffMs / 60_000)
  if (diffMin < 1) return 'ahora'
  if (diffMin < 60) return `${diffMin}m`
  const diffH = Math.floor(diffMin / 60)
  if (diffH < 24) return `${diffH}h`
  return `${Math.floor(diffH / 24)}d`
}

function StatusBadge({ status }: { status: EventStatus }) {
  const config = STATUS_CONFIG[status]
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold',
        config.className,
      )}
    >
      {status === 'live' && (
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-em-positive opacity-75" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-em-positive" />
        </span>
      )}
      {config.label}
    </span>
  )
}

export function EventsTableSkeleton() {
  return (
    <div className="divide-y divide-em-border">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-5 py-3.5">
          <div className="h-8 w-8 animate-pulse rounded-lg bg-white/10" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3.5 w-40 animate-pulse rounded bg-white/10" />
            <div className="h-3 w-28 animate-pulse rounded bg-white/10" />
          </div>
          <div className="h-5 w-14 animate-pulse rounded-full bg-white/10" />
        </div>
      ))}
    </div>
  )
}

export default function EventsTable({ events, loading }: { events: AdminEvent[]; loading?: boolean }) {
  if (loading) return <EventsTableSkeleton />

  if (events.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-em-muted">Sin eventos publicados aún.</p>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-em-border">
            {['Evento', 'Categoría', 'Organizador', 'Estado', 'Publicado'].map((h) => (
              <th
                key={h}
                className="whitespace-nowrap px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-em-muted"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-em-border">
          {events.map((e) => (
            <tr key={e.id} className="transition-colors hover:bg-white/[0.02]">
              <td className="max-w-[200px] px-5 py-3.5">
                <span className="block truncate font-medium text-em-text">{e.title}</span>
              </td>
              <td className="px-5 py-3.5">
                <span className="rounded-full bg-em-accent/10 px-2.5 py-0.5 text-[11px] font-medium text-em-accent">
                  {CATEGORY_LABEL[e.category] ?? e.category}
                </span>
              </td>
              <td className="px-5 py-3.5 text-xs text-em-muted">{e.organizerName}</td>
              <td className="px-5 py-3.5">
                <StatusBadge status={e.status} />
              </td>
              <td className="px-5 py-3.5 text-xs text-em-muted">{formatRelative(e.createdAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
