import type { Metadata } from 'next'
import type { ReactNode } from 'react'

export const metadata: Metadata = {
  title: 'Guardados',
  description: 'Tus eventos y lugares guardados en eMeet.',
}

export default function SavedLayout({ children }: { children: ReactNode }) {
  return children
}
