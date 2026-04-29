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
  users: AdminUser[]
  isLoadingUsers: boolean
  fetchUsers: () => Promise<void>
  updateUser: (id: string, role?: string, is_banned?: boolean) => Promise<void>
  deleteUser: (id: string) => Promise<void>

  events: AdminEvent[]
  isLoadingEvents: boolean
  fetchEvents: () => Promise<void>
  deleteEvent: (id: string) => Promise<void>

  statistics: AdminStatistics | null
  isLoadingStats: boolean
  fetchStatistics: () => Promise<void>

  error: string | null
  clearError: () => void
}

const AdminContext = createContext<AdminContextValue | undefined>(undefined)

const ADMIN_API_URL = (process.env.NEXT_PUBLIC_ADMIN_API_URL ?? 'http://localhost:3007').replace(/\/$/, '')

// ─── Provider ────────────────────────────────────────────────────────────────
export function AdminProvider({ children }: { children: ReactNode }) {
  const { user, getAccessToken } = useAuth()

  const [users, setUsers] = useState<AdminUser[]>([])
  const [events, setEvents] = useState<AdminEvent[]>([])
  const [statistics, setStatistics] = useState<AdminStatistics | null>(null)
  const [isLoadingUsers, setIsLoadingUsers] = useState(false)
  const [isLoadingEvents, setIsLoadingEvents] = useState(false)
  const [isLoadingStats, setIsLoadingStats] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      setUsers([])
      setEvents([])
      setStatistics(null)
    }
  }, [user])

  const clearError = useCallback(() => setError(null), [])

  const adminFetch = useCallback(
    async (path: string, init?: RequestInit): Promise<Response> => {
      const token = await getAccessToken()
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (token) headers['Authorization'] = `Bearer ${token}`

      return fetch(`${ADMIN_API_URL}${path}`, {
        ...init,
        headers: { ...headers, ...(init?.headers ?? {}) },
      })
    },
    [getAccessToken]
  )

  // ─── Users ───────────────────────────────────────────────────────────────
  const fetchUsers = useCallback(async () => {
    if (!user?.email) return
    try {
      setIsLoadingUsers(true)
      setError(null)
      const res = await adminFetch('/admin/users')
      if (!res.ok) throw new Error('Error al cargar usuarios')
      const { users: data } = await res.json()
      setUsers(data ?? [])
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido'
      setError(message)
    } finally {
      setIsLoadingUsers(false)
    }
  }, [user?.email, adminFetch])

  const updateUser = useCallback(
    async (id: string, role?: string, is_banned?: boolean) => {
      if (!user?.email) return
      try {
        setError(null)
        const body: Record<string, unknown> = {}
        if (role !== undefined) body.role = role
        if (is_banned !== undefined) body.is_banned = is_banned

        const res = await adminFetch(`/admin/users/${id}`, {
          method: 'PUT',
          body: JSON.stringify(body),
        })
        if (!res.ok) throw new Error('Error al actualizar usuario')
        await fetchUsers()
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Error desconocido'
        setError(message)
      }
    },
    [user?.email, adminFetch, fetchUsers]
  )

  const deleteUser = useCallback(
    async (id: string) => {
      if (!user?.email) return
      try {
        setError(null)
        const res = await adminFetch(`/admin/users/${id}`, { method: 'DELETE' })
        if (!res.ok) throw new Error('Error al eliminar usuario')
        await fetchUsers()
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Error desconocido'
        setError(message)
      }
    },
    [user?.email, adminFetch, fetchUsers]
  )

  // ─── Events ──────────────────────────────────────────────────────────────
  const fetchEvents = useCallback(async () => {
    if (!user?.email) return
    try {
      setIsLoadingEvents(true)
      setError(null)
      const res = await adminFetch('/admin/events')
      if (!res.ok) throw new Error('Error al cargar eventos')
      const { events: data } = await res.json()
      setEvents(data ?? [])
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido'
      setError(message)
    } finally {
      setIsLoadingEvents(false)
    }
  }, [user?.email, adminFetch])

  const deleteEvent = useCallback(
    async (id: string) => {
      if (!user?.email) return
      try {
        setError(null)
        const res = await adminFetch(`/admin/events/${id}`, { method: 'DELETE' })
        if (!res.ok) throw new Error('Error al eliminar evento')
        await fetchEvents()
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Error desconocido'
        setError(message)
      }
    },
    [user?.email, adminFetch, fetchEvents]
  )

  // ─── Statistics ──────────────────────────────────────────────────────────
  const fetchStatistics = useCallback(async () => {
    if (!user?.email) return
    try {
      setIsLoadingStats(true)
      setError(null)
      const res = await adminFetch('/admin/statistics')
      if (!res.ok) throw new Error('Error al cargar estadísticas')
      const { statistics: data } = await res.json()
      setStatistics(data ?? null)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido'
      setError(message)
    } finally {
      setIsLoadingStats(false)
    }
  }, [user?.email, adminFetch])

  const value: AdminContextValue = {
    users, isLoadingUsers, fetchUsers, updateUser, deleteUser,
    events, isLoadingEvents, fetchEvents, deleteEvent,
    statistics, isLoadingStats, fetchStatistics,
    error, clearError,
  }

  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>
}

// ─── Hook ────────────────────────────────────────────────────────────────────
export function useAdmin() {
  const context = useContext(AdminContext)
  if (!context) throw new Error('useAdmin debe usarse dentro de AdminProvider')
  return context
}
