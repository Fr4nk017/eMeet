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
  showHeader?: boolean
  headerTitle?: string
  showDesktopMap?: boolean
  focusedPlaceId?: string | null
}

export default function Layout({
  children,
  showHeader = true,
  headerTitle,
  showDesktopMap = false,
  focusedPlaceId,
}: LayoutProps) {
  return (
    /* Fondo metálico: gradiente oscuro con tinte púrpura profundo */
    <div className="min-h-screen bg-[linear-gradient(160deg,_#12082C_0%,_#07040F_45%,_#0E0520_100%)]">
      <div className="mx-auto flex min-h-screen w-full max-w-[1600px] items-stretch gap-0 px-0 sm:px-3 lg:px-5 lg:py-4">

        <SidebarNav />

        {/* Sección principal — superficie metálica elevada */}
        <section className="metal-top-border relative flex min-w-0 flex-1 flex-col overflow-hidden
          bg-[linear-gradient(145deg,_#1E1240_0%,_#110926_55%,_#0C0618_100%)]
          sm:rounded-l-[28px]
          sm:border sm:border-violet-500/15
          sm:shadow-2xl
          lg:h-[calc(100vh-2rem)]">

          {showHeader && (
            <header className="metal-top-border z-40 flex flex-shrink-0 items-center justify-between
              border-b border-violet-500/15
              bg-[linear-gradient(90deg,_#1A0F35/95_0%,_#130A28/95_50%,_#1A0F35/95_100%)]
              px-4 py-3 backdrop-blur-sm lg:px-5 lg:py-4">

              <div className="flex items-center gap-2">
                <span className="text-2xl font-extrabold tracking-tight lg:text-[1.75rem]">
                  <span className="text-white">e</span>
                  {/* Logo con gradiente metálico morado-plata */}
                  <span className="bg-gradient-to-r from-primary-light via-white to-primary-light bg-clip-text text-transparent">
                    Meet
                  </span>
                </span>
              </div>

              {headerTitle && (
                <h1 className="bg-gradient-to-r from-silver via-white to-silver bg-clip-text text-base font-semibold text-transparent lg:text-lg">
                  {headerTitle}
                </h1>
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
          <aside className="hidden w-[360px] shrink-0
            border-l border-violet-500/15
            bg-[linear-gradient(180deg,_#160D30_0%,_#0A0518_100%)]
            lg:block">
            <div className="h-full overflow-hidden sm:rounded-r-[28px] sm:border sm:border-violet-500/15">
              <BellavistaMap focusedPlaceId={focusedPlaceId} />
            </div>
          </aside>
        )}

      </div>
    </div>
  )
}
