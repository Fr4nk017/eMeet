import type { Metadata } from 'next'
import type { ReactNode } from 'react'

export const metadata: Metadata = {
  title: 'Chat',
  description: 'Chatea con la comunidad de eventos en eMeet.',
}

export default function ChatLayout({ children }: { children: ReactNode }) {
  return children
}
