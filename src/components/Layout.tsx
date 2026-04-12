import dynamic from 'next/dynamic'
import type { ReactNode } from 'react'
import BottomNavBar from './BottomNavBar'

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
      <div className="mx-auto flex min-h-screen w-full max-w-[1400px] items-stretch gap-8 px-0 sm:px-4 lg:px-8 lg:py-6">
        <section className="relative flex w-full min-w-0 flex-col overflow-hidden bg-surface sm:rounded-[32px] sm:border sm:border-white/5 sm:shadow-[0_24px_80px_rgba(5,10,30,0.45)] lg:h-[calc(100vh-3rem)] lg:max-w-[430px]">
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

          <main className="flex min-h-0 flex-1 overflow-y-auto overflow-x-hidden pb-16 lg:pb-[72px]">
            <div className="w-full">{children}</div>
          </main>

          <BottomNavBar />
        </section>

        <aside className="hidden min-w-0 flex-1 lg:flex lg:flex-col lg:gap-5 lg:py-8">
          {/* Título compacto */}
          <div className="flex-shrink-0 max-w-2xl">
            <p className="mb-3 inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-4 py-2 text-sm font-medium text-primary-light">
              eMeet web preview
            </p>
            <h2 className="max-w-3xl text-4xl font-black leading-[1.05] tracking-tight text-white xl:text-5xl">
              Descubre eventos cercanos con una interfaz pensada para decidir rápido.
            </h2>
          </div>

          {showDesktopMap ? (
            <div className="min-h-0 flex-1 overflow-hidden rounded-[28px] border border-white/10 shadow-[0_24px_60px_rgba(0,0,0,0.45)]">
              <BellavistaMap />
            </div>
          ) : (
            <div className="flex min-h-[320px] flex-1 flex-col justify-between rounded-[28px] border border-white/10 bg-white/5 p-6 shadow-[0_24px_60px_rgba(0,0,0,0.32)]">
              <div>
                <p className="text-sm font-semibold text-white">Navegación más rápida</p>
                <p className="mt-2 max-w-xl text-sm leading-6 text-slate-300">
                  El mapa en vivo ahora se carga solo donde aporta valor para hacer las transiciones entre páginas más fluidas.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-surface/70 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-primary-light">Feed</p>
                  <p className="mt-2 text-sm text-slate-300">Descubre lugares cercanos con menor tiempo de espera.</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-surface/70 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-primary-light">Perfil</p>
                  <p className="mt-2 text-sm text-slate-300">Ajusta preferencias sin cargar componentes pesados en cada ruta.</p>
                </div>
              </div>
            </div>
          )}

          {/* Cards de features */}
          <div className="flex-shrink-0 grid max-w-3xl grid-cols-3 gap-4">
            <div className="rounded-[28px] border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
              <p className="text-sm font-semibold text-white">Feed principal</p>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                Stack de tarjetas con swipe, guardado y estados visuales claros.
              </p>
            </div>
            <div className="rounded-[28px] border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
              <p className="text-sm font-semibold text-white">Exploración</p>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                Búsqueda, filtros por categoría y acceso rápido a eventos destacados.
              </p>
            </div>
            <div className="rounded-[28px] border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
              <p className="text-sm font-semibold text-white">Base para API</p>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                La estructura ya está lista para conectar autenticación, favoritos y backend real.
              </p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
