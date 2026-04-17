'use client'

import { Bell, Search } from 'lucide-react'
import { useAuth } from '@/src/context/AuthContext'

export default function Topbar() {
  const { user } = useAuth()
  const initials = user?.name
    ? user.name
        .split(' ')
        .slice(0, 2)
        .map((w) => w[0])
        .join('')
        .toUpperCase()
    : 'A'

  return (
    <header className="flex h-14 flex-shrink-0 items-center justify-between border-b border-em-border bg-em-surface px-5">
      {/* Search */}
      <div className="relative hidden w-64 sm:block">
        <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-em-muted" />
        <input
          type="search"
          placeholder="Buscar..."
          className="h-8 w-full rounded-lg border border-em-border bg-em-bg pl-8 pr-3 text-xs text-em-text placeholder:text-em-muted focus:border-em-accent focus:outline-none"
        />
      </div>

      {/* Right side */}
      <div className="ml-auto flex items-center gap-3">
        {/* Notification bell */}
        <button
          type="button"
          className="relative flex h-8 w-8 items-center justify-center rounded-lg border border-em-border text-em-muted transition-colors hover:bg-white/5 hover:text-em-text"
        >
          <Bell className="h-4 w-4" />
          <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-em-accent" />
        </button>

        {/* User avatar */}
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-em-accent text-xs font-bold text-white">
            {initials}
          </div>
          <span className="hidden text-xs font-medium text-em-text-dim sm:block">
            {user?.name ?? 'Admin'}
          </span>
        </div>
      </div>
    </header>
  )
}
