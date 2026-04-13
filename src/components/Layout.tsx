import dynamic from 'next/dynamic'
import type { ReactNode } from 'react'
import BottomNavBar from './BottomNavBar'
import SidebarNav from './SidebarNav'

const BellavistaMap = dynamic(() => import('./BellavistaMap'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full min-h-[320px] items-center justify-center bg-card text-sm text-muted">
      Cargando mapa...
    </div>
  ),
})

interface LayoutProps {
  children: ReactNode
  /** Si se muestra el header con el logo */
  showHeader?: boolean
  /** Título opcional en el header */
  headerTitle?: string
  /** Si se muestra el mapa decorativo en escritorio */
  showDesktopMap?: boolean
}

/**
 * Layout principal de la app.
 *
 * Estructura:
 *  ┌─────────────────┐
 *  │   Header (opt)  │  ← Logo eMeet + acciones
 *  ├─────────────────┤
 *  │                 │
 *  │    Contenido    │  ← Slot children (cada pantalla)
 *  │                 │
 *  ├─────────────────┤
 *  │  Bottom NavBar  │  ← Navegación fija inferior
 *  └─────────────────┘
 *
 * El padding-bottom en el contenido compensa la altura de la NavBar (64px).
 */
export default function Layout({
  children,
  showHeader = true,
  headerTitle,
  showDesktopMap = false,
}: LayoutProps) {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(124,58,237,0.2),_transparent_28%),linear-gradient(180deg,_#101426_0%,_#1A1A2E_45%,_#15172B_100%)]">
      <div className="mx-auto flex min-h-screen w-full max-w-[1600px] items-stretch gap-0 px-0 sm:px-3 lg:px-5 lg:py-4">
        <SidebarNav />

        <section className="relative flex min-w-0 flex-1 flex-col overflow-hidden bg-surface sm:rounded-l-[28px] sm:border sm:border-white/5 sm:shadow-[0_24px_80px_rgba(5,10,30,0.45)] lg:h-[calc(100vh-2rem)]">
          {showHeader && (
            <header className="flex items-center justify-between px-4 py-3 bg-surface/95 backdrop-blur-sm border-b border-white/5 z-40 flex-shrink-0 lg:px-5 lg:py-4">
              <div className="flex items-center gap-2">
                <span className="text-2xl font-extrabold tracking-tight lg:text-[1.75rem]">
                  <span className="text-white">e</span>
                  <span className="text-primary">Meet</span>
                </span>
              </div>

              {headerTitle && (
                <h1 className="text-base font-semibold text-white lg:text-lg">{headerTitle}</h1>
              )}

              <div className="w-8" />
            </header>
          )}

          <main className="flex min-h-0 flex-1 overflow-y-auto overflow-x-hidden pb-16 lg:pb-0">
            <div className="w-full">{children}</div>
          </main>

          <BottomNavBar />
        </section>

        {showDesktopMap && (
          <aside className="hidden w-[360px] shrink-0 border-l border-white/10 bg-card/50 backdrop-blur-md lg:block">
            <div className="h-full overflow-hidden sm:rounded-r-[28px] sm:border sm:border-white/5">
              <BellavistaMap />
            </div>
          </aside>
        )}
      </div>
    </div>
  )
}
