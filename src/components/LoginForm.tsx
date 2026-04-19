'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '../context/AuthContext'
import { FiMail, FiLock, FiEye, FiEyeOff, FiLogIn } from 'react-icons/fi'

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
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold text-white">Bienvenido de regreso</h2>
        <p className="text-sm text-slate-400">Ingresa tu correo y contraseña para continuar.</p>
        <p className="text-xs text-slate-500">Use emails de prueba: user@emeet.com, admin@emeet.com o locatario@emeet.com.</p>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-300 text-sm">
          {error}
        </div>
      )}

      {/* Email */}
      <div>
        <label className="block text-sm font-medium text-white mb-2">Email</label>
        <div className="relative">
          <FiMail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu@email.com"
            className="w-full bg-[hsl(222,30%,16%)] border border-white/10 hover:border-[hsl(262,80%,60%)]/30 focus:border-[hsl(262,80%,60%)] outline-none py-3 pl-10 pr-4 rounded-xl text-white placeholder-slate-500 transition-colors"
            required
          />
        </div>
      </div>

      {/* Contraseña */}
      <div>
        <label className="block text-sm font-medium text-white mb-2">Contraseña</label>
        <div className="relative">
          <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full bg-[hsl(222,30%,16%)] border border-white/10 hover:border-[hsl(262,80%,60%)]/30 focus:border-[hsl(262,80%,60%)] outline-none py-3 pl-10 pr-12 rounded-xl text-white placeholder-slate-500 transition-colors"
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[hsl(262,80%,60%)] transition-colors"
          >
            {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
          </button>
        </div>
      </div>

      {/* Recordar contraseña */}
      <div className="flex justify-between items-center">
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input type="checkbox" className="w-4 h-4 rounded accent-[hsl(262,80%,60%)]" />
          <span className="text-slate-300">Recordarme</span>
        </label>
        <a href="#" className="text-sm text-[hsl(262,80%,60%)] hover:text-[hsl(262,80%,60%)]/80 transition-colors">
          ¿Olvidaste tu contraseña?
        </a>
      </div>

      {/* Botón submit */}
      <button
        type="submit"
        disabled={isLoading}
        className="w-full bg-[hsl(38,95%,55%)] hover:bg-[hsl(38,95%,55%)]/95 disabled:opacity-50 disabled:cursor-not-allowed text-black font-semibold py-3 rounded-xl transition-all flex items-center justify-center gap-2 hover:translate-y-[-1px] hover:shadow-lg"
      >
        <FiLogIn size={20} />
        {isLoading ? 'Iniciando sesión...' : 'Inicia Sesión'}
      </button>
    </form>
  )
}
