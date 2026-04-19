'use client'

import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import type { ReactNode } from 'react'
import type { AuthState, User } from '../types'
import { getSupabaseBrowserClient, hasSupabaseEnv } from '../lib/supabase'

// ─── Interfaz del contexto ───────────────────────────────────────────────────
type RegisterOptions = {
  role?: User['role']
  businessName?: string
  businessLocation?: string
}

type RegisterResult = { needsEmailVerification: true; email: string } | { needsEmailVerification: false }

interface AuthContextValue extends AuthState {
  isAuthReady: boolean
  login: (email: string, password: string) => Promise<User['role']>
  loginWithGoogle: () => Promise<void>
  loginWithApple: () => Promise<void>
  register: (name: string, email: string, password: string, options?: RegisterOptions) => Promise<RegisterResult>
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

type AuthResponsePayload = {
  user: {
    email?: string | null
    app_metadata?: {
      role?: User['role']
    }
    user_metadata?: {
      role?: User['role']
      business_name?: string | null
      business_location?: string | null
    }
  } | null
  session: {
    access_token: string
    refresh_token: string
  } | null
}

function readRoleBucket(value: unknown): User['role'] | undefined {
  if (!value || typeof value !== 'object') return undefined
  const role = (value as { role?: unknown }).role
  if (role === 'admin' || role === 'locatario' || role === 'user') {
    return role
  }
  return undefined
}

function extractRoleFromAuthUser(user: unknown): User['role'] | undefined {
  if (!user || typeof user !== 'object') return undefined

  const appRole = readRoleBucket((user as { app_metadata?: unknown }).app_metadata)
  if (appRole === 'admin' || appRole === 'locatario' || appRole === 'user') {
    return appRole
  }

  const userRole = readRoleBucket((user as { user_metadata?: unknown }).user_metadata)
  if (userRole === 'admin' || userRole === 'locatario' || userRole === 'user') {
    return userRole
  }

  return undefined
}

const LOCAL_AUTH_STORAGE_KEY = 'emeet-local-auth-user'
const BACKEND_URL = (process.env.NEXT_PUBLIC_BACKEND_URL ?? '').trim().replace(/\/$/, '')

function requireBackendUrl() {
  if (!BACKEND_URL) {
    throw new Error('Falta NEXT_PUBLIC_BACKEND_URL para usar autenticación con backend separado.')
  }
  return BACKEND_URL
}

function inferLocalRoleByEmail(email: string): User['role'] {
  const normalized = email.toLowerCase()
  if (normalized.includes('admin')) return 'admin'
  if (normalized.includes('locatario')) return 'locatario'
  return 'user'
}

function createLocalUser(
  name: string,
  email: string,
  previousUser?: User | null,
  options?: RegisterOptions,
): User {
  const role = options?.role ?? previousUser?.role ?? inferLocalRoleByEmail(email)

  return {
    id: previousUser?.id ?? `local-${email.toLowerCase()}`,
    name: name.trim() || previousUser?.name || email.split('@')[0],
    email,
    role,
    avatarUrl: previousUser?.avatarUrl ?? 'https://i.pravatar.cc/150?img=32',
    bio: previousUser?.bio ?? 'Explorando panoramas cerca de mi.',
    interests: previousUser?.interests ?? ['gastronomia', 'musica'],
    likedEvents: previousUser?.likedEvents ?? [],
    savedEvents: previousUser?.savedEvents ?? [],
    location: options?.businessLocation ?? previousUser?.location ?? 'Santiago, Chile',
    createdAt: previousUser?.createdAt ?? new Date().toISOString(),
    isVerified: previousUser?.isVerified ?? true,
    businessName: role === 'locatario' ? options?.businessName ?? previousUser?.businessName ?? name : undefined,
    businessLocation: role === 'locatario'
      ? options?.businessLocation ?? previousUser?.businessLocation ?? previousUser?.location ?? 'Santiago, Chile'
      : undefined,
  }
}

function loadLocalUser(): User | null {
  if (typeof window === 'undefined') return null

  try {
    const raw = window.localStorage.getItem(LOCAL_AUTH_STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as User
  } catch {
    return null
  }
}

function saveLocalUser(user: User | null) {
  if (typeof window === 'undefined') return

  if (!user) {
    window.localStorage.removeItem(LOCAL_AUTH_STORAGE_KEY)
    return
  }

  window.localStorage.setItem(LOCAL_AUTH_STORAGE_KEY, JSON.stringify(user))
}

async function fetchApi<T>(input: string, init?: RequestInit): Promise<T> {
  const endpoint = `${requireBackendUrl()}${input.replace(/^\/api/, '')}`
  const headers = new Headers({
    'Content-Type': 'application/json',
    ...(init?.headers ?? {}),
  })

  if (hasSupabaseEnv) {
    const { data } = await getSupabaseBrowserClient().auth.getSession()
    const token = data.session?.access_token
    if (token) headers.set('Authorization', `Bearer ${token}`)
  }

  const response = await fetch(endpoint, {
    credentials: 'include',
    ...init,
    headers,
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

  // Carga perfil + eventos del usuario dado un email conocido.
  // Usada post-login/register para evitar round-trip extra de sesión.
  const syncUserData = useCallback(async (
    email: string,
    roleHint?: User['role'],
    businessMeta?: { businessName?: string | null; businessLocation?: string | null },
  ) => {
    const [profileResult, likedResult, savedResult] = await Promise.allSettled([
      fetchApi<ProfilePayload>('/api/profile', { method: 'GET' }),
      fetchApi<UserEventPayload[]>('/api/events/liked', { method: 'GET' }),
      fetchApi<UserEventPayload[]>('/api/events/saved', { method: 'GET' }),
    ])

    if (profileResult.status === 'rejected') throw profileResult.reason

    const profile = profileResult.value
    const likedEvents = likedResult.status === 'fulfilled' ? likedResult.value : []
    const savedEvents = savedResult.status === 'fulfilled' ? savedResult.value : []

    const nextUser: User = {
      id: profile.id,
      name: profile.name,
      email,
      role: roleHint ?? 'user',
      avatarUrl: profile.avatar_url ?? '',
      bio: profile.bio ?? '',
      interests: profile.interests ?? [],
      likedEvents: likedEvents.map((row) => row.event_id),
      savedEvents: savedEvents.map((row) => row.event_id),
      location: profile.location ?? '',
      isVerified: true,
      businessName: businessMeta?.businessName ?? undefined,
      businessLocation: businessMeta?.businessLocation ?? undefined,
    }

    setAuthState({ user: nextUser, isAuthenticated: true })
  }, [])

  // Usada al montar la app: primero verifica si hay sesión activa, luego carga datos.
  const syncFromApi = useCallback(async () => {
    if (!hasSupabaseEnv) {
      const localUser = loadLocalUser()
      setAuthState({ user: localUser, isAuthenticated: Boolean(localUser) })
      return
    }

    requireBackendUrl()
    const { data } = await getSupabaseBrowserClient().auth.getSession()
    const sessionPayload: SessionPayload = {
      session: data.session
        ? {
            user: {
              email: data.session.user?.email,
            },
          }
        : null,
    }

    if (!sessionPayload.session) {
      setAuthState({ user: null, isAuthenticated: false })
      return
    }

    const { data: userData } = await getSupabaseBrowserClient().auth.getUser()
    const roleHint = extractRoleFromAuthUser(userData.user)
    const businessName = userData.user?.user_metadata?.business_name as string | undefined
    const businessLocation = userData.user?.user_metadata?.business_location as string | undefined
    await syncUserData(sessionPayload.session.user.email ?? '', roleHint, {
      businessName,
      businessLocation,
    })
  }, [syncUserData])

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

  const login = useCallback(async (email: string, password: string): Promise<User['role']> => {
    if (!hasSupabaseEnv) {
      const previous = loadLocalUser()
      const localUser = createLocalUser(previous?.name ?? email.split('@')[0], email, previous)
      saveLocalUser(localUser)
      setAuthState({ user: localUser, isAuthenticated: true })
      return localUser.role
    }

    const payload = await fetchApi<AuthResponsePayload>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })

    if (payload.session?.access_token && payload.session?.refresh_token) {
      await getSupabaseBrowserClient().auth.setSession({
        access_token: payload.session.access_token,
        refresh_token: payload.session.refresh_token,
      })
    }

    const role = extractRoleFromAuthUser(payload.user) ?? 'user'
    await syncUserData(email, role, {
      businessName: payload.user?.user_metadata?.business_name,
      businessLocation: payload.user?.user_metadata?.business_location,
    })
    return role
  }, [syncUserData])

  const register = useCallback(async (name: string, email: string, password: string, options?: RegisterOptions): Promise<RegisterResult> => {
    if (!hasSupabaseEnv) {
      const localUser = createLocalUser(name, email, loadLocalUser(), options)
      saveLocalUser(localUser)
      setAuthState({ user: localUser, isAuthenticated: true })
      return { needsEmailVerification: false }
    }

    const payload = await fetchApi<AuthResponsePayload>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        name,
        email,
        password,
        role: options?.role,
        businessName: options?.businessName,
        businessLocation: options?.businessLocation,
      }),
    })

    if (payload.session?.access_token && payload.session?.refresh_token) {
      await getSupabaseBrowserClient().auth.setSession({
        access_token: payload.session.access_token,
        refresh_token: payload.session.refresh_token,
      })
      await syncUserData(email, options?.role ?? extractRoleFromAuthUser(payload.user), {
        businessName: options?.businessName ?? payload.user?.user_metadata?.business_name,
        businessLocation: options?.businessLocation ?? payload.user?.user_metadata?.business_location,
      })
      return { needsEmailVerification: false }
    }

    // Supabase requiere confirmación por email — user creado pero sin sesión activa.
    return { needsEmailVerification: true, email }
  }, [syncUserData])

  const loginWithGoogle = useCallback(async () => {
    const { error } = await getSupabaseBrowserClient().auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
    if (error) throw error
  }, [])

  const loginWithApple = useCallback(async () => {
    const { error } = await getSupabaseBrowserClient().auth.signInWithOAuth({
      provider: 'apple',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
    if (error) throw error
  }, [])

  const logout = useCallback(async () => {
    if (!hasSupabaseEnv) {
      saveLocalUser(null)
      setAuthState({ user: null, isAuthenticated: false })
      return
    }

    try {
      await fetchApi('/api/auth/logout', { method: 'POST' })
    } catch {
      // El backend puede fallar si el token ya expiró — continuar igual
    }

    await getSupabaseBrowserClient().auth.signOut()
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

    if (hasSupabaseEnv && Object.keys(profilePayload).length > 0) {
      await fetchApi('/api/profile', {
        method: 'PATCH',
        body: JSON.stringify(profilePayload),
      })
    }

    setAuthState((prev) => {
      if (!prev.user) return prev
      const nextUser = { ...prev.user, ...data }
      if (!hasSupabaseEnv) saveLocalUser(nextUser)
      return { ...prev, user: nextUser }
    })
  }, [authState.user])

  return (
    <AuthContext.Provider value={{ ...authState, isAuthReady, login, loginWithGoogle, loginWithApple, register, logout, updateUser }}>
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
