'use client'

import { useAuth } from '@/src/context/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import type { UserRole } from '@/src/types'

interface ProtectedRouteProps {
  children: React.ReactNode
  requiredRole?: UserRole | UserRole[]
}

export default function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { user, isAuthenticated } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth')
      return
    }

    if (requiredRole) {
      const allowedRoles = Array.isArray(requiredRole) ? requiredRole : [requiredRole]
      if (!user || !allowedRoles.includes(user.role)) {
        router.push('/chat')
      }
    }
  }, [isAuthenticated, user, requiredRole, router])

  if (
    !isAuthenticated ||
    !user ||
    (requiredRole && (!Array.isArray(requiredRole) ? user.role !== requiredRole : !requiredRole.includes(user.role)))
  ) {
    return null
  }

  return <>{children}</>
}
