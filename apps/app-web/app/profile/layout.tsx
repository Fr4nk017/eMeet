import type { Metadata } from 'next'
import type { ReactNode } from 'react'

export const metadata: Metadata = {
  title: 'mi perfil',
  description: 'Gestiona tu perfil, intereses y actividad en XzonaParty.',
}

export default function ProfileLayout({ children }: { children: ReactNode }) {
  return children
}
