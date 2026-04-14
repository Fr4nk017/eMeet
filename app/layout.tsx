import type { Metadata } from 'next'
import '../src/index.css'
import AppProviders from '../src/providers/AppProviders'

export const metadata: Metadata = {
  title: 'eMeet',
  description: 'Descubre bares, restaurantes y eventos cercanos.',
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
    apple: '/favicon.svg',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  )
}
