'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  House as HiHome,
  Bookmark as HiBookmark,
  User as HiUser,
  Search as HiMagnifyingGlass,
  MessageCircle as HiChatBubbleLeftRight,
  Store as HiBuildingStorefront,
} from 'lucide-react'
import { useChatContext } from '../context/ChatContext'
import { useAuth } from '../context/AuthContext'

const USER_NAV_ITEMS = [
  { href: '/', label: 'Inicio', icon: HiHome },
  { href: '/search', label: 'Explorar', icon: HiMagnifyingGlass },
  { href: '/chat', label: 'Comunidad', icon: HiChatBubbleLeftRight },
  { href: '/saved', label: 'Guardados', icon: HiBookmark },
  { href: '/profile', label: 'Perfil', icon: HiUser },
]

const LOCATARIO_NAV_ITEMS = [
  { href: '/chat', label: 'Comunidad', icon: HiChatBubbleLeftRight },
  { href: '/profile', label: 'Perfil', icon: HiUser },
]

export default function BottomNavBar() {
  const { totalUnread } = useChatContext()
  const { user } = useAuth()
  const pathname = usePathname() ?? '/'
  const navItems = user?.role === 'locatario' ? LOCATARIO_NAV_ITEMS : USER_NAV_ITEMS

  const isRouteActive = (href: string) => {
    if (href === '/') return pathname === '/'
    return pathname === href || pathname.startsWith(`${href}/`)
  }

  return (
    <nav className="absolute inset-x-0 bottom-0 z-50 lg:hidden
      border-t border-violet-500/20
      bg-[linear-gradient(0deg,_#0A0518_0%,_#160D30/95_100%)]
      backdrop-blur-sm px-2">

      {/* Línea de brillo metálico en el borde superior */}
      <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary-light/40 to-transparent" />

      <div className="mx-auto flex h-16 w-full items-center justify-around">
        {user?.role === 'locatario' && (
          <Link
            href="/locatario"
            className={`flex flex-col items-center gap-1 text-xs font-medium transition-all duration-200 ${
              pathname === '/locatario' ? 'text-white' : 'text-muted hover:text-primary-light'
            }`}
          >
            <HiBuildingStorefront className={`h-6 w-6 transition-all duration-200 ${
              pathname === '/locatario'
                ? 'scale-110 text-primary-light drop-shadow-[0_0_8px_rgba(196,181,253,0.7)]'
                : ''
            }`} />
            <span className={pathname === '/locatario' ? 'text-primary-light' : ''}>Mi Panel</span>
          </Link>
        )}
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = isRouteActive(href)
          return (
            <Link
              key={href}
              href={href}
              prefetch
              className={`flex flex-col items-center gap-1 text-xs font-medium transition-all duration-200 ${
                isActive ? 'text-white' : 'text-muted hover:text-primary-light'
              }`}
            >
              <div className="relative">
                {/* Ícono con glow metálico cuando está activo */}
                <Icon className={`h-6 w-6 transition-all duration-200 ${
                  isActive
                    ? 'scale-110 text-primary-light drop-shadow-[0_0_8px_rgba(196,181,253,0.7)]'
                    : ''
                }`} />

                {href === '/chat' && totalUnread > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full
                    bg-gradient-to-br from-primary-light to-primary
                    px-1 text-[10px] font-bold leading-none text-white
                    shadow-[0_0_6px_rgba(124,58,237,0.6)]">
                    {totalUnread > 9 ? '9+' : totalUnread}
                  </span>
                )}
              </div>

              <span className={isActive ? 'text-primary-light' : ''}>{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
