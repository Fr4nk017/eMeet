'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '../context/AuthContext'
import {
  Mail as FiMail,
  Lock as FiLock,
  Eye as FiEye,
  EyeOff as FiEyeOff,
  LogIn as FiLogIn,
  CircleAlert as FiAlertCircle,
} from 'lucide-react'

export default function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { login } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      const role = await login(email, password)
      const next = searchParams.get('next')
      if (next && next.startsWith('/')) {
        router.push(next)
        return
      }
      router.push(role === 'locatario' ? '/locatario' : role === 'admin' ? '/admin' : '/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido al iniciar sesión')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-1">
        <h2 className="text-xl font-semibold text-white">Bienvenido de regreso</h2>
        <p className="text-sm text-slate-400">Ingresa tu correo y contraseña para continuar.</p>
        <p className="text-xs text-slate-500">
          Prueba con: <span className="text-slate-400">user@emeet.com</span>,{' '}
          <span className="text-slate-400">admin@emeet.com</span> o{' '}
          <span className="text-slate-400">locatario@emeet.com</span>
        </p>
      </div>

      {error && (
        <div className="flex items-start gap-2.5 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          <FiAlertCircle size={16} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Email */}
      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-slate-300">Email</label>
        <div className="relative">
          <FiMail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu@email.com"
            className="w-full rounded-xl border border-white/10 bg-[hsl(222,30%,13%)] py-3 pl-10 pr-4 text-sm text-white placeholder-slate-600 outline-none transition-colors hover:border-white/20 focus:border-[hsl(262,80%,60%)] focus:ring-1 focus:ring-[hsl(262,80%,60%)]/30"
            required
          />
        </div>
      </div>

      {/* Contraseña */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="block text-sm font-medium text-slate-300">Contraseña</label>
          <a href="#" className="text-xs font-medium text-[hsl(262,80%,60%)] transition-colors hover:text-[hsl(262,80%,70%)]">
            ¿Olvidaste tu contraseña?
          </a>
        </div>
        <div className="relative">
          <FiLock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
          <input
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full rounded-xl border border-white/10 bg-[hsl(222,30%,13%)] py-3 pl-10 pr-12 text-sm text-white placeholder-slate-600 outline-none transition-colors hover:border-white/20 focus:border-[hsl(262,80%,60%)] focus:ring-1 focus:ring-[hsl(262,80%,60%)]/30"
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 transition-colors hover:text-[hsl(262,80%,60%)]"
          >
            {showPassword ? <FiEyeOff size={16} /> : <FiEye size={16} />}
          </button>
        </div>
      </div>

      {/* Recordarme */}
      <label className="flex cursor-pointer items-center gap-2.5">
        <input type="checkbox" className="h-4 w-4 rounded accent-[hsl(262,80%,60%)]" />
        <span className="text-sm text-slate-400">Recordarme en este dispositivo</span>
      </label>

      {/* Botón submit */}
      <button
        type="submit"
        disabled={isLoading}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-[hsl(38,95%,55%)] py-3 text-sm font-semibold text-black shadow-lg shadow-amber-900/20 transition-all hover:-translate-y-0.5 hover:bg-[hsl(38,95%,60%)] hover:shadow-amber-900/30 disabled:cursor-not-allowed disabled:opacity-60 disabled:translate-y-0"
      >
        {isLoading ? (
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-black/30 border-t-black" />
        ) : (
          <FiLogIn size={18} />
        )}
        {isLoading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
      </button>
    </form>
  )
}
