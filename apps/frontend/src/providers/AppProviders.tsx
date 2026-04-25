'use client'

import type { ReactNode } from 'react'
import { AuthProvider } from '../context/AuthContext'
import { ChatProvider } from '../context/ChatContext'
import { LocatarioEventsProvider } from '../context/LocatarioEventsContext'

export default function AppProviders({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <LocatarioEventsProvider>
        <ChatProvider>{children}</ChatProvider>
      </LocatarioEventsProvider>
    </AuthProvider>
  )
}
