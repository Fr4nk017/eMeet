'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { HiHome, HiBookmark, HiUser } from 'react-icons/hi'
import { HiMagnifyingGlass, HiChatBubbleLeftRight } from 'react-icons/hi2'
import { useChatContext } from '../context/ChatContext'

const NAV_ITEMS = [
  { href: '/', label: 'Inicio', icon: HiHome },
  { href: '/search', label: 'Explorar', icon: HiMagnifyingGlass },
  { href: '/chat', label: 'Comunidad', icon: HiChatBubbleLeftRight },
  { href: '/saved', label: 'Guardados', icon: HiBookmark },
  { href: '/profile', label: 'Perfil', icon: HiUser },
]

export default function BottomNavBar() {
  const { totalUnread } = useChatContext()
  const pathname = usePathname() ?? '/'
  const baseClass = 'flex flex-col items-center gap-1 text-xs font-medium transition-all duration-200'

  const isRouteActive = (href: string) => {
    if (href === '/') return pathname === '/'
    return pathname === href || pathname.startsWith(`${href}/`)
  }

  return (
    <nav className="absolute inset-x-0 bottom-0 z-50 border-t border-white/10 bg-card/95 px-2 backdrop-blur-md lg:hidden">
      <div className="mx-auto flex h-16 w-full items-center justify-around lg:h-[72px]">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const isActive = isRouteActive(href)
          return (
            <Link
              key={href}
              href={href}
              className={`${baseClass} ${isActive ? 'text-primary' : 'text-muted'}`}
            >
              <div className="relative">
                <Icon className={`h-6 w-6 ${isActive ? 'scale-110' : ''} transition-transform`} />
                {href === '/chat' && totalUnread > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 flex items-center justify-center rounded-full bg-primary text-white text-[10px] font-bold px-1 leading-none">
                    {totalUnread > 9 ? '9+' : totalUnread}
                  </span>
                )}
              </div>
              <span>{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
