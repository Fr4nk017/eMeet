import { NavLink } from 'react-router-dom'
import { HiHome, HiBookmark, HiUser } from 'react-icons/hi'
import { HiMagnifyingGlass } from 'react-icons/hi2'

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
 *  /profile → Perfil del usuario
 */
export default function BottomNavBar() {
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
