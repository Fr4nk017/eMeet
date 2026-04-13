'use client'

import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import type { ReactNode } from 'react'
import type { AuthState, User } from '../types'

// ─── Mock del usuario autenticado para desarrollo ────────────────────────────
const MOCK_USER: User = {
  id: 'user-1',
  name: 'Francisco López',
  email: 'francisco@emeet.cl',
  avatarUrl: 'https://i.pravatar.cc/150?img=11',
  bio: 'Amante de la música en vivo, el buen café y los eventos culturales.',
  interests: ['musica', 'gastronomia', 'networking', 'arte'],
  likedEvents: [],
  savedEvents: [],
  location: 'Providencia, Santiago',
}

// ─── Interfaz del contexto ───────────────────────────────────────────────────
interface AuthContextValue extends AuthState {
  isAuthReady: boolean
  login: (email: string, password: string) => Promise<void>
  register: (name: string, email: string, password: string) => Promise<void>
  logout: () => void
  updateUser: (data: Partial<User>) => void
}

const AUTH_STORAGE_KEY = 'emeet-auth'

// ─── Creación del contexto ───────────────────────────────────────────────────
const AuthContext = createContext<AuthContextValue | undefined>(undefined)

// ─── Provider ────────────────────────────────────────────────────────────────
export function AuthProvider({ children }: { children: ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
  })
  const [isAuthReady, setIsAuthReady] = useState(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(AUTH_STORAGE_KEY)
      if (!raw) {
        setIsAuthReady(true)
        return
      }

      const parsed = JSON.parse(raw) as { user?: User | null }
      if (parsed.user) {
        setAuthState({ user: parsed.user, isAuthenticated: true })
      }
    } catch {
      localStorage.removeItem(AUTH_STORAGE_KEY)
    } finally {
      setIsAuthReady(true)
    }
  }, [])

  useEffect(() => {
    if (!isAuthReady) return
    if (!authState.user || !authState.isAuthenticated) {
      localStorage.removeItem(AUTH_STORAGE_KEY)
      return
    }

    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ user: authState.user }))
  }, [authState, isAuthReady])

  /**
   * Simula un login contra la API.
   * En producción, aquí se haría el POST /auth/login.
   */
  const login = useCallback(async (_email: string, _password: string) => {
    // Simulamos delay de red
    await new Promise((r) => setTimeout(r, 800))
    setAuthState({ user: MOCK_USER, isAuthenticated: true })
  }, [])

  /**
   * Simula el registro de un nuevo usuario.
   * En producción, aquí se haría el POST /auth/register.
   */
  const register = useCallback(
    async (name: string, email: string, _password: string) => {
      await new Promise((r) => setTimeout(r, 800))
      const newUser: User = {
        ...MOCK_USER,
        id: `user-${Date.now()}`,
        name,
        email,
        likedEvents: [],
        savedEvents: [],
      }
      setAuthState({ user: newUser, isAuthenticated: true })
    },
    [],
  )

  const logout = useCallback(() => {
    setAuthState({ user: null, isAuthenticated: false })
  }, [])

  const updateUser = useCallback((data: Partial<User>) => {
    setAuthState((prev) =>
      prev.user ? { ...prev, user: { ...prev.user, ...data } } : prev,
    )
  }, [])

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
