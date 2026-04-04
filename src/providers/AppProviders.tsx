'use client'

import type { ReactNode } from 'react'
import { AuthProvider } from '../context/AuthContext'
import { NearbyPlacesProvider } from '../context/NearbyPlacesContext'
import { ChatProvider } from '../context/ChatContext'

export default function AppProviders({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <NearbyPlacesProvider>
        <ChatProvider>{children}</ChatProvider>
      </NearbyPlacesProvider>
    </AuthProvider>
  )
}
