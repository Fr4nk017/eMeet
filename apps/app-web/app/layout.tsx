import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import '../src/index.css'
import AppProviders from '../src/providers/AppProviders'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

export const viewport: Viewport = {
  themeColor: '#07040F',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export const metadata: Metadata = {
  title: {
    default: 'eMeet',
    template: '%s — eMeet',
  },
  description: 'Descubre bares, restaurantes y eventos cercanos a ti.',
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
    apple: '/favicon.svg',
  },
  openGraph: {
    title: 'eMeet',
    description: 'Descubre bares, restaurantes y eventos cercanos a ti.',
    type: 'website',
    locale: 'es_CL',
    siteName: 'eMeet',
  },
  twitter: {
    card: 'summary',
    title: 'eMeet',
    description: 'Descubre bares, restaurantes y eventos cercanos a ti.',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={inter.variable}>
      <body>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  )
}
