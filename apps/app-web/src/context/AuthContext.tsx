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

interface AuthContextValue extends AuthState {
  isAuthReady: boolean
  login: (email: string, password: string) => Promise<User['role']>
  loginWithOAuth: (provider: 'google' | 'facebook') => Promise<void>
  register: (name: string, email: string, password: string, options?: RegisterOptions) => Promise<void>
  logout: () => Promise<void>
  updateUser: (data: Partial<User>) => Promise<void>
  getAccessToken: () => Promise<string | null>
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
  role?: string | null
  business_name?: string | null
  business_location?: string | null
  created_at?: string
}

type UserEventPayload = {
  event_id: string
}

type AuthResponsePayload = {
  user: {
    email?: string | null
    app_metadata?: {
      role?: User['role']
      business_name?: string | null
      business_location?: string | null
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

function resolveRole(_email: string, roleHint?: User['role']): User['role'] {
  if (roleHint === 'admin' || roleHint === 'locatario' || roleHint === 'user') {
    return roleHint
  }
  return 'user'
}

const LOCAL_AUTH_STORAGE_KEY = 'emeet-local-auth-user'
const AUTH_URL = (process.env.NEXT_PUBLIC_AUTH_URL ?? process.env.NEXT_PUBLIC_BACKEND_URL ?? '').trim().replace(/\/$/, '')
const PROFILE_URL = (process.env.NEXT_PUBLIC_PROFILE_URL ?? '').trim().replace(/\/$/, '')
const SAVED_URL = '/api/saved'

function resolveRoleFromClaims(
  appMetadataRole?: unknown,
  userMetadataRole?: unknown,
): User['role'] | undefined {
  if (appMetadataRole === 'admin' || appMetadataRole === 'locatario' || appMetadataRole === 'user') {
    return appMetadataRole
  }
  if (userMetadataRole === 'admin' || userMetadataRole === 'locatario' || userMetadataRole === 'user') {
    return userMetadataRole
  }
  return undefined
}

function createLocalUser(
  name: string,
  email: string,
  previousUser?: User | null,
  options?: RegisterOptions,
): User {
  const role = options?.role ?? previousUser?.role ?? 'user'

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

async function fetchApi<T>(baseUrl: string, path: string, init?: RequestInit): Promise<T> {
  const endpoint = `${baseUrl}${path}`
  const headers = new Headers({
    'Content-Type': 'application/json',
    ...(init?.headers ?? {}),
  })

  if (hasSupabaseEnv) {
    const { data } = await getSupabaseBrowserClient().auth.getSession()
    let token = data.session?.access_token
    if (!token) {
      const { data: refreshed } = await getSupabaseBrowserClient().auth.refreshSession()
      token = refreshed.session?.access_token
    }
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
    // El perfil y los eventos son opcionales: si los microservicios no responden,
    // completamos con datos mínimos del token de Supabase para no bloquear el login.
    const [profile, likedEvents, savedEvents] = await Promise.all([
      fetchApi<ProfilePayload>(PROFILE_URL, '/profile', { method: 'GET' }).catch(() => null),
      fetchApi<UserEventPayload[]>(SAVED_URL, '/events/liked', { method: 'GET' }).catch(() => [] as UserEventPayload[]),
      fetchApi<UserEventPayload[]>(SAVED_URL, '/events/saved', { method: 'GET' }).catch(() => [] as UserEventPayload[]),
    ])

    const profileRole = profile?.role as User['role'] | undefined
    const nextUser: User = {
      id: profile?.id ?? `auth-${email.toLowerCase()}`,
      name: profile?.name ?? email.split('@')[0],
      email,
      role: resolveRole(email, roleHint ?? profileRole),
      avatarUrl: profile?.avatar_url ?? '',
      bio: profile?.bio ?? '',
      interests: profile?.interests ?? [],
      likedEvents: likedEvents.map((row) => row.event_id),
      savedEvents: savedEvents.map((row) => row.event_id),
      location: profile?.location ?? '',
      createdAt: profile?.created_at,
      isVerified: true,
      businessName: businessMeta?.businessName ?? profile?.business_name ?? undefined,
      businessLocation: businessMeta?.businessLocation ?? profile?.business_location ?? undefined,
    }

    setAuthState({ user: nextUser, isAuthenticated: true })
    saveLocalUser(nextUser)
    return nextUser.role
  }, [])

  // Usada al montar la app: primero verifica si hay sesión activa, luego carga datos.
  const syncFromApi = useCallback(async () => {
    if (!hasSupabaseEnv) {
      const localUser = loadLocalUser()
      setAuthState({ user: localUser, isAuthenticated: Boolean(localUser) })
      return
    }

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
    const roleHint = resolveRoleFromClaims(
      userData.user?.app_metadata?.role,
      userData.user?.user_metadata?.role,
    )
    const businessName =
      (userData.user?.app_metadata?.business_name as string | undefined) ??
      (userData.user?.user_metadata?.business_name as string | undefined)
    const businessLocation =
      (userData.user?.app_metadata?.business_location as string | undefined) ??
      (userData.user?.user_metadata?.business_location as string | undefined)

    // Use cached role as last resort so the user's role survives refreshes
    // even when user_metadata and the profile service don't return it.
    const sessionEmail = sessionPayload.session.user.email ?? ''
    const cachedUser = loadLocalUser()
    const cachedRole = cachedUser?.email?.toLowerCase() === sessionEmail.toLowerCase()
      ? cachedUser?.role
      : undefined

    await syncUserData(sessionEmail, roleHint ?? cachedRole, {
      businessName: businessName ?? cachedUser?.businessName,
      businessLocation: businessLocation ?? cachedUser?.businessLocation,
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
        // Network error — fall back to cache instead of kicking the user out
        const cached = loadLocalUser()
        setAuthState(cached
          ? { user: cached, isAuthenticated: true }
          : { user: null, isAuthenticated: false },
        )
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

    const { data, error } = await getSupabaseBrowserClient().auth.signInWithPassword({ email, password })

    if (error) {
      const msg = error.message.toLowerCase()
      if (msg.includes('rate limit') || msg.includes('too many requests')) {
        throw new Error('Demasiados intentos. Espera unos minutos e inténtalo de nuevo.')
      }
      if (msg.includes('invalid login credentials') || msg.includes('invalid credentials')) {
        throw new Error('Correo o contraseña incorrectos. Verifica tus datos e inténtalo de nuevo.')
      }
      if (msg.includes('email not confirmed')) {
        throw new Error('Debes confirmar tu correo electrónico antes de iniciar sesión.')
      }
      if (msg.includes('user not found')) {
        throw new Error('No existe una cuenta con ese correo.')
      }
      throw new Error(error.message)
    }

    return syncUserData(
      data.user?.email ?? email,
      resolveRoleFromClaims(data.user?.app_metadata?.role, data.user?.user_metadata?.role),
      {
        businessName:
          (data.user?.app_metadata?.business_name as string | undefined) ??
          (data.user?.user_metadata?.business_name as string | undefined),
        businessLocation:
          (data.user?.app_metadata?.business_location as string | undefined) ??
          (data.user?.user_metadata?.business_location as string | undefined),
      },
    )
  }, [syncUserData])

  const register = useCallback(async (name: string, email: string, password: string, options?: RegisterOptions) => {
    if (!hasSupabaseEnv) {
      const localUser = createLocalUser(name, email, loadLocalUser(), options)
      saveLocalUser(localUser)
      setAuthState({ user: localUser, isAuthenticated: true })
      return
    }

    if (!AUTH_URL) {
      throw new Error('Falta NEXT_PUBLIC_AUTH_URL en Vercel. Configura la URL pública del microservicio auth.')
    }

    const payload = await fetchApi<AuthResponsePayload>(AUTH_URL, '/auth/register', {
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
      await syncUserData(
        email,
        options?.role ?? resolveRoleFromClaims(payload.user?.app_metadata?.role, payload.user?.user_metadata?.role),
        {
        businessName:
          options?.businessName ??
          payload.user?.app_metadata?.business_name ??
          payload.user?.user_metadata?.business_name,
        businessLocation:
          options?.businessLocation ??
          payload.user?.app_metadata?.business_location ??
          payload.user?.user_metadata?.business_location,
        },
      )
      return
    }

    // Cuando Supabase requiere confirmación por email, signUp puede devolver user pero sin session.
    // Evitamos llamar endpoints protegidos sin token y devolvemos un mensaje claro al usuario.
    throw new Error('Registro creado. Revisa tu correo para confirmar la cuenta antes de iniciar sesión.')
  }, [syncUserData])

  const loginWithOAuth = useCallback(async (provider: 'google' | 'facebook') => {
    if (!hasSupabaseEnv) {
      throw new Error('OAuth no está disponible en modo local. Usa email y contraseña.')
    }

    const redirectTo = `${window.location.origin}/auth/callback`

    const { error } = await getSupabaseBrowserClient().auth.signInWithOAuth({
      provider,
      options: { redirectTo },
    })

    if (error) throw new Error(error.message)
  }, [])

  const logout = useCallback(async () => {
    if (!hasSupabaseEnv) {
      saveLocalUser(null)
      setAuthState({ user: null, isAuthenticated: false })
      return
    }

    try {
      await fetchApi(AUTH_URL, '/auth/logout', { method: 'POST' })
    } catch {
      // El backend puede fallar si el token ya expiró — continuar igual
    }

    await getSupabaseBrowserClient().auth.signOut()
    saveLocalUser(null)
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
      await fetchApi(PROFILE_URL, '/profile', {
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

  const getAccessToken = useCallback(async (): Promise<string | null> => {
    if (!hasSupabaseEnv) return null
    const client = getSupabaseBrowserClient()
    const { data } = await client.auth.getSession()
    if (data.session?.access_token) return data.session.access_token
    const { data: refreshed } = await client.auth.refreshSession()
    return refreshed.session?.access_token ?? null
  }, [])

  return (
    <AuthContext.Provider value={{ ...authState, isAuthReady, login, loginWithOAuth, register, logout, updateUser, getAccessToken }}>
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
