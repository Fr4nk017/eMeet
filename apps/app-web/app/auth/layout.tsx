import type { Metadata } from 'next'
import type { ReactNode } from 'react'

export const metadata: Metadata = {
  title: 'Iniciar sesión',
  description: 'Inicia sesión o crea tu cuenta en eMeet para descubrir eventos y lugares cerca tuyo.',
}

export default function AuthLayout({ children }: { children: ReactNode }) {
  return children
}
