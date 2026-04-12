'use client'

import type { ReactNode } from 'react'
import { AuthProvider } from '../context/AuthContext'
import { ChatProvider } from '../context/ChatContext'

export default function AppProviders({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <ChatProvider>{children}</ChatProvider>
    </AuthProvider>
  )
}
