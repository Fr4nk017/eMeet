import type { Metadata } from 'next'
import type { ReactNode } from 'react'

export const metadata: Metadata = {
  title: 'Buscar',
  description: 'Explora y filtra eventos, bares, restaurantes y más cerca tuyo en eMeet.',
}

export default function SearchLayout({ children }: { children: ReactNode }) {
  return children
}
