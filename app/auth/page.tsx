'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { useAuth } from '../../src/context/AuthContext'

type Mode = 'login' | 'register'

export default function AuthRoutePage() {
  const { login, register, user, isAuthReady } = useAuth()
  const router = useRouter()

  const [mode, setMode] = useState<Mode>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (isAuthReady && user) {
      router.replace('/')
    }
  }, [isAuthReady, router, user])

  function validate(): boolean {
    setError('')
    if (!email.includes('@')) {
      setError('Ingresa un email válido.')
      return false
    }
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.')
      return false
    }
    if (mode === 'register' && name.trim().length < 2) {
      setError('Ingresa tu nombre completo.')
      return false
    }
    return true
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return

    setLoading(true)
    try {
      if (mode === 'login') {
        await login(email, password)
      } else {
        await register(name, email, password)
      }
      router.push('/')
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('Ocurrió un error. Intenta de nuevo.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-surface px-6">
      <motion.div
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-10 text-center"
      >
        <h1 className="text-5xl font-extrabold tracking-tight">
          <span className="text-white">e</span>
          <span className="text-primary">Meet</span>
        </h1>
        <p className="mt-2 text-sm text-muted">Descubre eventos cerca de ti</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
        className="w-full max-w-sm rounded-3xl bg-card p-6 shadow-2xl"
      >
        <div className="mb-6 flex rounded-xl bg-surface p-1">
          {(['login', 'register'] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => {
                setMode(m)
                setError('')
              }}
              className={`flex-1 rounded-lg py-2 text-sm font-semibold transition-all duration-200 ${
                mode === m ? 'bg-primary text-white shadow' : 'text-muted hover:text-white'
              }`}
            >
              {m === 'login' ? 'Iniciar sesión' : 'Registrarse'}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {mode === 'register' && (
            <div>
              <label className="mb-1 block text-xs text-muted">Nombre completo</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Tu nombre"
                autoComplete="name"
                className="w-full rounded-xl border border-white/10 bg-surface px-4 py-3 text-sm text-white placeholder-muted transition-colors focus:border-primary focus:outline-none"
              />
            </div>
          )}

          <div>
            <label className="mb-1 block text-xs text-muted">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@email.com"
              autoComplete="email"
              className="w-full rounded-xl border border-white/10 bg-surface px-4 py-3 text-sm text-white placeholder-muted transition-colors focus:border-primary focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs text-muted">Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              className="w-full rounded-xl border border-white/10 bg-surface px-4 py-3 text-sm text-white placeholder-muted transition-colors focus:border-primary focus:outline-none"
            />
          </div>

          {error && (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center text-xs text-red-400">
              {error}
            </motion.p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-2 w-full rounded-xl bg-primary py-3 font-semibold text-white transition-all duration-200 active:scale-95 hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? 'Cargando...' : mode === 'login' ? 'Entrar' : 'Crear cuenta'}
          </button>
        </form>
      </motion.div>

      <p className="mt-8 max-w-xs text-center text-xs text-muted/60">
        Al continuar aceptas nuestros <span className="cursor-pointer text-primary">Términos de uso</span> y{' '}
        <span className="cursor-pointer text-primary">Política de privacidad</span>.
      </p>
    </div>
  )
}
