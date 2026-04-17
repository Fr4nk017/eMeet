'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  ShieldAlert,
  DollarSign,
  ChevronLeft,
  ChevronRight,
  Zap,
} from 'lucide-react'
import { cn } from '@/src/lib/cn'

const NAV = [
  { href: '/admin', label: 'Overview', icon: LayoutDashboard, exact: true },
  { href: '/admin/users', label: 'Usuarios', icon: Users, exact: false },
  { href: '/admin/events', label: 'Eventos', icon: CalendarDays, exact: false },
  { href: '/admin/moderation', label: 'Moderación', icon: ShieldAlert, exact: false },
  { href: '/admin/finance', label: 'Finanzas', icon: DollarSign, exact: false },
]

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
}

export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname()

  function isActive(href: string, exact: boolean) {
    return exact ? pathname === href : pathname.startsWith(href)
  }

  return (
    <aside
      className={cn(
        'relative flex h-full flex-col border-r border-em-border bg-em-surface transition-all duration-300',
        collapsed ? 'w-16' : 'w-56',
      )}
    >
      {/* Logo */}
      <div className="flex h-14 items-center border-b border-em-border px-4">
        <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-em-accent">
          <Zap className="h-4 w-4 text-white" strokeWidth={2.5} />
        </div>
        {!collapsed && (
          <span className="ml-2.5 truncate text-sm font-bold tracking-tight text-em-text">
            eMeet Admin
          </span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto p-2 pt-3">
        {NAV.map(({ href, label, icon: Icon, exact }) => {
          const active = isActive(href, exact)
          return (
            <Link
              key={href}
              href={href}
              title={collapsed ? label : undefined}
              className={cn(
                'group flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors',
                active
                  ? 'border-l-2 border-em-accent bg-em-accent/10 text-em-accent'
                  : 'border-l-2 border-transparent text-em-muted hover:bg-white/5 hover:text-em-text',
              )}
            >
              <Icon
                className={cn(
                  'h-4 w-4 flex-shrink-0 transition-colors',
                  active ? 'text-em-accent' : 'text-em-muted group-hover:text-em-text',
                )}
              />
              {!collapsed && <span className="truncate">{label}</span>}
            </Link>
          )
        })}
      </nav>

      {/* Collapse toggle */}
      <div className="border-t border-em-border p-2">
        <button
          type="button"
          onClick={onToggle}
          className="flex w-full items-center justify-center rounded-lg p-2 text-em-muted transition-colors hover:bg-white/5 hover:text-em-text"
          aria-label={collapsed ? 'Expandir sidebar' : 'Colapsar sidebar'}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </button>
      </div>
    </aside>
  )
}
