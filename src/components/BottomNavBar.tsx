import { NavLink } from 'react-router-dom'
import { HiHome, HiBookmark, HiUser } from 'react-icons/hi'
import { HiMagnifyingGlass, HiChatBubbleLeftRight } from 'react-icons/hi2'
import { useChatContext } from '../context/ChatContext'

/**
 * BottomNavBar — Barra de navegación inferior fija.
 *
 * Tecnología: React + react-router-dom NavLink para resaltar la ruta activa.
 * Iconos: react-icons (HeroIcons v2).
 * Estilos: Tailwind CSS con clases condicionales.
 *
 * Rutas:
 *  /      → Feed principal (swipe de eventos)
 *  /search → Búsqueda y filtros
 *  /saved  → Eventos guardados
 *  /chat    → Chat de comunidad
 *  /profile → Perfil del usuario
 */
export default function BottomNavBar() {
  const { totalUnread } = useChatContext()
  const baseClass =
    'flex flex-col items-center gap-1 text-xs font-medium transition-all duration-200'
  const activeClass = 'text-primary'
  const inactiveClass = 'text-muted'

  return (
    <nav className="absolute inset-x-0 bottom-0 z-50 border-t border-white/10 bg-card/95 px-2 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full items-center justify-around lg:h-[72px]">
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            `${baseClass} ${isActive ? activeClass : inactiveClass}`
          }
        >
          {({ isActive }) => (
            <>
              <HiHome className={`w-6 h-6 ${isActive ? 'scale-110' : ''} transition-transform`} />
              <span>Inicio</span>
            </>
          )}
        </NavLink>

        <NavLink
          to="/search"
          className={({ isActive }) =>
            `${baseClass} ${isActive ? activeClass : inactiveClass}`
          }
        >
          {({ isActive }) => (
            <>
              <HiMagnifyingGlass className={`w-6 h-6 ${isActive ? 'scale-110' : ''} transition-transform`} />
              <span>Explorar</span>
            </>
          )}
        </NavLink>

        <NavLink
          to="/chat"
          className={({ isActive }) =>
            `${baseClass} ${isActive ? activeClass : inactiveClass}`
          }
        >
          {({ isActive }) => (
            <>
              <div className="relative">
                <HiChatBubbleLeftRight className={`w-6 h-6 ${isActive ? 'scale-110' : ''} transition-transform`} />
                {totalUnread > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 flex items-center justify-center rounded-full bg-primary text-white text-[10px] font-bold px-1 leading-none">
                    {totalUnread > 9 ? '9+' : totalUnread}
                  </span>
                )}
              </div>
              <span>Comunidad</span>
            </>
          )}
        </NavLink>

        <NavLink
          to="/saved"
          className={({ isActive }) =>
            `${baseClass} ${isActive ? activeClass : inactiveClass}`
          }
        >
          {({ isActive }) => (
            <>
              <HiBookmark className={`w-6 h-6 ${isActive ? 'scale-110' : ''} transition-transform`} />
              <span>Guardados</span>
            </>
          )}
        </NavLink>

        <NavLink
          to="/profile"
          className={({ isActive }) =>
            `${baseClass} ${isActive ? activeClass : inactiveClass}`
          }
        >
          {({ isActive }) => (
            <>
              <HiUser className={`w-6 h-6 ${isActive ? 'scale-110' : ''} transition-transform`} />
              <span>Perfil</span>
            </>
          )}
        </NavLink>
      </div>
    </nav>
  )
}
