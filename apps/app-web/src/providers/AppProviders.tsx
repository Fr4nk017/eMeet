'use client'

import { useState } from 'react'
import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from '../context/AuthContext'
import { ChatProvider } from '../context/ChatContext'
import { LocatarioEventsProvider } from '../context/LocatarioEventsContext'

export default function AppProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: { queries: { staleTime: 5 * 60 * 1000 } },
  }))

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <LocatarioEventsProvider>
          <ChatProvider>{children}</ChatProvider>
        </LocatarioEventsProvider>
      </AuthProvider>
    </QueryClientProvider>
  )
}
