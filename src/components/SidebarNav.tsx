'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { HiHome, HiBookmark, HiUser } from 'react-icons/hi'
import { HiMagnifyingGlass, HiChatBubbleLeftRight } from 'react-icons/hi2'
import { useChatContext } from '../context/ChatContext'

const NAV_ITEMS = [
  { href: '/', label: 'Feed', icon: HiHome },
  { href: '/search', label: 'Busqueda', icon: HiMagnifyingGlass },
  { href: '/chat', label: 'Chat', icon: HiChatBubbleLeftRight },
  { href: '/saved', label: 'Guardados', icon: HiBookmark },
  { href: '/profile', label: 'Perfil', icon: HiUser },
]

export default function SidebarNav() {
  const { totalUnread } = useChatContext()
  const pathname = usePathname() ?? '/'

  const isRouteActive = (href: string) => {
    if (href === '/') return pathname === '/'
    return pathname === href || pathname.startsWith(`${href}/`)
  }

  return (
    <aside className="hidden h-full w-56 shrink-0 border-r border-white/10 bg-card/70 p-4 backdrop-blur-lg lg:flex lg:flex-col">
      <Link href="/" className="mb-6 inline-flex items-center gap-1 px-2">
        <span className="text-2xl font-extrabold tracking-tight">
          <span className="text-white">e</span>
          <span className="text-primary">Meet</span>
        </span>
      </Link>

      <nav className="flex flex-1 flex-col gap-1.5">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = isRouteActive(href)
          return (
            <Link
              key={href}
              href={href}
              className={`group flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                active
                  ? 'bg-primary/20 text-white'
                  : 'text-slate-300 hover:bg-white/10 hover:text-white'
              }`}
            >
              <span className="flex items-center gap-2.5">
                <Icon className={`h-5 w-5 ${active ? 'text-primary-light' : 'text-slate-300 group-hover:text-white'}`} />
                <span>{label}</span>
              </span>

              {href === '/chat' && totalUnread > 0 && (
                <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-bold text-white">
                  {totalUnread > 9 ? '9+' : totalUnread}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-3">
        <p className="text-xs text-muted">Descubre lugares y planes cercanos en tiempo real.</p>
      </div>
    </aside>
  )
}
