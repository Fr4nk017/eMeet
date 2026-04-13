'use client'

import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import type { ReactNode } from 'react'
import type { AuthState, User } from '../types'

// ─── Interfaz del contexto ───────────────────────────────────────────────────
interface AuthContextValue extends AuthState {
  isAuthReady: boolean
  login: (email: string, password: string) => Promise<void>
  register: (name: string, email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  updateUser: (data: Partial<User>) => Promise<void>
}

// ─── Creación del contexto ───────────────────────────────────────────────────
const AuthContext = createContext<AuthContextValue | undefined>(undefined)

type SessionPayload = {
  session: {
    user: {
      email?: string | null
    }
  } | null
}

type ProfilePayload = {
  id: string
  name: string
  bio: string
  avatar_url: string | null
  location: string
  interests: User['interests']
}

type UserEventPayload = {
  event_id: string
}

async function fetchApi<T>(input: string, init?: RequestInit): Promise<T> {
  const response = await fetch(input, {
    credentials: 'include',
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  })

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null
    throw new Error(body?.error ?? 'Error de comunicación con el servidor.')
  }

  return response.json() as Promise<T>
}

// ─── Provider ────────────────────────────────────────────────────────────────
export function AuthProvider({ children }: { children: ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
  })
  const [isAuthReady, setIsAuthReady] = useState(false)

  const syncFromApi = useCallback(async () => {
    const sessionPayload = await fetchApi<SessionPayload>('/api/auth/session', {
      method: 'GET',
    })

    if (!sessionPayload.session) {
      setAuthState({ user: null, isAuthenticated: false })
      return
    }

    const [profile, likedEvents, savedEvents] = await Promise.all([
      fetchApi<ProfilePayload>('/api/profile', { method: 'GET' }),
      fetchApi<UserEventPayload[]>('/api/events/liked', { method: 'GET' }),
      fetchApi<UserEventPayload[]>('/api/events/saved', { method: 'GET' }),
    ])

    const nextUser: User = {
      id: profile.id,
      name: profile.name,
      email: sessionPayload.session.user.email ?? '',
      avatarUrl: profile.avatar_url ?? '',
      bio: profile.bio ?? '',
      interests: profile.interests ?? [],
      likedEvents: likedEvents.map((row) => row.event_id),
      savedEvents: savedEvents.map((row) => row.event_id),
      location: profile.location ?? '',
    }

    setAuthState({ user: nextUser, isAuthenticated: true })
  }, [])

  useEffect(() => {
    let mounted = true

    const loadAuth = async () => {
      try {
        if (!mounted) return
        await syncFromApi()
      } catch {
        if (!mounted) return
        setAuthState({ user: null, isAuthenticated: false })
      } finally {
        if (mounted) setIsAuthReady(true)
      }
    }

    loadAuth()

    return () => {
      mounted = false
    }
  }, [syncFromApi])

  const login = useCallback(async (email: string, password: string) => {
    await fetchApi('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })

    await syncFromApi()
  }, [syncFromApi])

  const register = useCallback(async (name: string, email: string, password: string) => {
    await fetchApi('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    })

    await syncFromApi()
  }, [syncFromApi])

  const logout = useCallback(async () => {
    await fetchApi('/api/auth/logout', {
      method: 'POST',
    })

    setAuthState({ user: null, isAuthenticated: false })
  }, [])

  const updateUser = useCallback(async (data: Partial<User>) => {
    if (!authState.user) {
      throw new Error('No hay usuario autenticado.')
    }

    const profilePayload: {
      name?: string
      bio?: string
      avatar_url?: string
      location?: string
      interests?: User['interests']
    } = {}

    if (typeof data.name === 'string') profilePayload.name = data.name
    if (typeof data.bio === 'string') profilePayload.bio = data.bio
    if (typeof data.avatarUrl === 'string') profilePayload.avatar_url = data.avatarUrl
    if (typeof data.location === 'string') profilePayload.location = data.location
    if (Array.isArray(data.interests)) profilePayload.interests = data.interests

    if (Object.keys(profilePayload).length > 0) {
      await fetchApi('/api/profile', {
        method: 'PATCH',
        body: JSON.stringify(profilePayload),
      })
    }

    setAuthState((prev) => {
      if (!prev.user) return prev
      return { ...prev, user: { ...prev.user, ...data } }
    })
  }, [authState.user])

  return (
    <AuthContext.Provider value={{ ...authState, isAuthReady, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  )
}

// ─── Hook de acceso ──────────────────────────────────────────────────────────
export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth debe usarse dentro de <AuthProvider>')
  return context
}
