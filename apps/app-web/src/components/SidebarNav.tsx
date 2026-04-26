'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { HiHome, HiBookmark, HiUser } from 'react-icons/hi'
import { HiMagnifyingGlass, HiChatBubbleLeftRight } from 'react-icons/hi2'
import { HiBuildingStorefront } from 'react-icons/hi2'
import { useChatContext } from '../context/ChatContext'
import { useAuth } from '../context/AuthContext'

const NAV_ITEMS = [
  { href: '/', label: 'Feed', icon: HiHome },
  { href: '/search', label: 'Busqueda', icon: HiMagnifyingGlass },
  { href: '/chat', label: 'Chat', icon: HiChatBubbleLeftRight },
  { href: '/saved', label: 'Guardados', icon: HiBookmark },
  { href: '/profile', label: 'Perfil', icon: HiUser },
]

export default function SidebarNav() {
  const { totalUnread } = useChatContext()
  const { user } = useAuth()
  const pathname = usePathname() ?? '/'

  const isRouteActive = (href: string) => {
    if (href === '/') return pathname === '/'
    return pathname === href || pathname.startsWith(`${href}/`)
  }

  return (
    <aside className="metal-top-border hidden h-full w-56 shrink-0 flex-col p-4
      border-r border-violet-500/20
      bg-[linear-gradient(180deg,_#160D30_0%,_#0A0518_100%)]
      lg:flex">

      {/* Logo metálico */}
      <Link href="/" className="mb-8 inline-flex items-center gap-1 px-2">
        <span className="text-2xl font-extrabold tracking-tight">
          <span className="text-white">e</span>
          <span className="bg-gradient-to-r from-primary-light via-white to-primary-light bg-clip-text text-transparent">
            Meet
          </span>
        </span>
      </Link>

      <nav className="flex flex-1 flex-col gap-1">
        {user?.role === 'locatario' && (
          <Link
            href="/locatario"
            className={`group relative flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 border ${
              pathname === '/locatario'
                ? 'bg-gradient-to-r from-violet-600/25 via-violet-500/15 to-violet-600/20 text-white border-violet-400/25'
                : 'text-muted hover:bg-violet-500/10 hover:text-white border-transparent'
            }`}
          >
            <HiBuildingStorefront className={`h-5 w-5 ${
              pathname === '/locatario'
                ? 'text-primary-light drop-shadow-[0_0_6px_rgba(196,181,253,0.6)]'
                : 'text-muted group-hover:text-primary-light'
            }`} />
            <span>Mi Panel</span>
          </Link>
        )}
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = isRouteActive(href)
          return (
            <Link
              key={href}
              href={href}
              className={`group relative flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                active
                  ? 'bg-gradient-to-r from-violet-600/25 via-violet-500/15 to-violet-600/20 text-white border border-violet-400/25'
                  : 'text-muted hover:bg-violet-500/10 hover:text-white border border-transparent'
              }`}
            >
              {/* Brillo metálico en el borde superior del ítem activo */}
              {active && (
                <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary-light/50 to-transparent rounded-t-xl" />
              )}

              <span className="flex items-center gap-2.5">
                <Icon className={`h-5 w-5 transition-colors ${
                  active
                    ? 'text-primary-light drop-shadow-[0_0_6px_rgba(196,181,253,0.6)]'
                    : 'text-muted group-hover:text-primary-light'
                }`} />
                <span>{label}</span>
              </span>

              {href === '/chat' && totalUnread > 0 && (
                <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full
                  bg-gradient-to-br from-primary-light to-primary
                  px-1.5 text-[11px] font-bold text-white
                  shadow-[0_0_8px_rgba(124,58,237,0.5)]">
                  {totalUnread > 9 ? '9+' : totalUnread}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Card decorativa inferior */}
      <div className="mt-4 rounded-xl border border-violet-500/20 bg-violet-500/5 p-3">
        <p className="text-xs text-muted">Descubre lugares y planes cercanos en tiempo real.</p>
      </div>
    </aside>
  )
}
