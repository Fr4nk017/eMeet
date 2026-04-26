'use client'

import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import type { ReactNode } from 'react'
import { useAuth } from './AuthContext'

// ─── Types ───────────────────────────────────────────────────────────────────
export interface AdminUser {
  id: string
  email: string
  name: string
  role: 'admin' | 'user' | 'locatario'
  is_banned: boolean
  created_at: string
}

export interface AdminEvent {
  id: string
  title: string
  description: string
  location: string
  date: string
  created_by: string
  created_at: string
}

export interface AdminStatistics {
  totalUsers: number
  totalEvents: number
  totalLikes: number
  bannedUsers: number
  timestamp: string
}

interface AdminContextValue {
  // Users
  users: AdminUser[]
  isLoadingUsers: boolean
  fetchUsers: () => Promise<void>
  updateUser: (id: string, role?: string, is_banned?: boolean) => Promise<void>
  deleteUser: (id: string) => Promise<void>

  // Events
  events: AdminEvent[]
  isLoadingEvents: boolean
  fetchEvents: () => Promise<void>
  deleteEvent: (id: string) => Promise<void>

  // Statistics
  statistics: AdminStatistics | null
  isLoadingStats: boolean
  fetchStatistics: () => Promise<void>

  // Error handling
  error: string | null
  clearError: () => void
}

// ─── Creación del contexto ───────────────────────────────────────────────────
const AdminContext = createContext<AdminContextValue | undefined>(undefined)

const ADMIN_API_URL = process.env.NEXT_PUBLIC_ADMIN_API_URL || 'http://localhost:3007'

// ─── Provider ────────────────────────────────────────────────────────────────
export function AdminProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  
  const [users, setUsers] = useState<AdminUser[]>([])
  const [events, setEvents] = useState<AdminEvent[]>([])
  const [statistics, setStatistics] = useState<AdminStatistics | null>(null)
  const [isLoadingUsers, setIsLoadingUsers] = useState(false)
  const [isLoadingEvents, setIsLoadingEvents] = useState(false)
  const [isLoadingStats, setIsLoadingStats] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Verificar que el usuario sea admin
  useEffect(() => {
    if (!user || user.role !== 'admin') {
      setUsers([])
      setEvents([])
      setStatistics(null)
    }
  }, [user])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  // ─── Users ───────────────────────────────────────────────────────────────
  const fetchUsers = useCallback(async () => {
    if (!user?.email) return

    try {
      setIsLoadingUsers(true)
      setError(null)

      const res = await fetch(`${ADMIN_API_URL}/admin/users`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.email}`,
        },
      })

      if (!res.ok) throw new Error('Error al cargar usuarios')

      const { users: data } = await res.json()
      setUsers(data ?? [])
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido'
      setError(message)
      console.error('AdminContext.fetchUsers:', message)
    } finally {
      setIsLoadingUsers(false)
    }
  }, [user?.email])

  const updateUser = useCallback(
    async (id: string, role?: string, is_banned?: boolean) => {
      if (!user?.email) return

      try {
        setError(null)

        const body: any = {}
        if (role) body.role = role
        if (is_banned !== undefined) body.is_banned = is_banned

        const res = await fetch(`${ADMIN_API_URL}/admin/users/${id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${user.email}`,
          },
          body: JSON.stringify(body),
        })

        if (!res.ok) throw new Error('Error al actualizar usuario')

        await fetchUsers()
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Error desconocido'
        setError(message)
        console.error('AdminContext.updateUser:', message)
      }
    },
    [user?.email, fetchUsers]
  )

  const deleteUser = useCallback(
    async (id: string) => {
      if (!user?.email) return

      try {
        setError(null)

        const res = await fetch(`${ADMIN_API_URL}/admin/users/${id}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${user.email}`,
          },
        })

        if (!res.ok) throw new Error('Error al eliminar usuario')

        await fetchUsers()
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Error desconocido'
        setError(message)
        console.error('AdminContext.deleteUser:', message)
      }
    },
    [user?.email, fetchUsers]
  )

  // ─── Events ──────────────────────────────────────────────────────────────
  const fetchEvents = useCallback(async () => {
    if (!user?.email) return

    try {
      setIsLoadingEvents(true)
      setError(null)

      const res = await fetch(`${ADMIN_API_URL}/admin/events`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.email}`,
        },
      })

      if (!res.ok) throw new Error('Error al cargar eventos')

      const { events: data } = await res.json()
      setEvents(data ?? [])
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido'
      setError(message)
      console.error('AdminContext.fetchEvents:', message)
    } finally {
      setIsLoadingEvents(false)
    }
  }, [user?.email])

  const deleteEvent = useCallback(
    async (id: string) => {
      if (!user?.email) return

      try {
        setError(null)

        const res = await fetch(`${ADMIN_API_URL}/admin/events/${id}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${user.email}`,
          },
        })

        if (!res.ok) throw new Error('Error al eliminar evento')

        await fetchEvents()
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Error desconocido'
        setError(message)
        console.error('AdminContext.deleteEvent:', message)
      }
    },
    [user?.email, fetchEvents]
  )

  // ─── Statistics ──────────────────────────────────────────────────────────
  const fetchStatistics = useCallback(async () => {
    if (!user?.email) return

    try {
      setIsLoadingStats(true)
      setError(null)

      const res = await fetch(`${ADMIN_API_URL}/admin/statistics`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.email}`,
        },
      })

      if (!res.ok) throw new Error('Error al cargar estadísticas')

      const { statistics: data } = await res.json()
      setStatistics(data ?? null)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido'
      setError(message)
      console.error('AdminContext.fetchStatistics:', message)
    } finally {
      setIsLoadingStats(false)
    }
  }, [user?.email])

  const value: AdminContextValue = {
    users,
    isLoadingUsers,
    fetchUsers,
    updateUser,
    deleteUser,
    events,
    isLoadingEvents,
    fetchEvents,
    deleteEvent,
    statistics,
    isLoadingStats,
    fetchStatistics,
    error,
    clearError,
  }

  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>
}

// ─── Hook ────────────────────────────────────────────────────────────────────
export function useAdmin() {
  const context = useContext(AdminContext)
  if (!context) {
    throw new Error('useAdmin debe usarse dentro de AdminProvider')
  }
  return context
}
