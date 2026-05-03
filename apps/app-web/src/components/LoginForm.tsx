'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import { getSupabaseBrowserClient, hasSupabaseEnv } from '../lib/supabase'
import {
  Mail as FiMail,
  Lock as FiLock,
  Eye as FiEye,
  EyeOff as FiEyeOff,
  LogIn as FiLogIn,
  CircleAlert as FiAlertCircle,
  ArrowLeft,
  CheckCircle,
  Send,
} from 'lucide-react'

const INPUT_CLASS =
  'w-full rounded-xl border border-white/10 bg-[hsl(222,30%,13%)] py-3 pl-10 pr-4 text-sm text-white placeholder-slate-600 outline-none transition-colors hover:border-white/20 focus:border-[hsl(262,80%,60%)] focus:ring-1 focus:ring-[hsl(262,80%,60%)]/30'

export default function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { login } = useAuth()

  const [view, setView] = useState<'login' | 'forgot' | 'forgot-sent'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [resetEmail, setResetEmail] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)
    try {
      const role = await login(email, password)
      const next = searchParams.get('next')
      if (next && next.startsWith('/')) { router.push(next); return }
      router.push(role === 'locatario' ? '/locatario' : role === 'admin' ? '/admin' : '/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido al iniciar sesión')
    } finally {
      setIsLoading(false)
    }
  }

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)
    try {
      if (hasSupabaseEnv) {
        const supabase = getSupabaseBrowserClient()
        const { error: sbError } = await supabase.auth.resetPasswordForEmail(resetEmail, {
          redirectTo: `${window.location.origin}/auth/reset-password`,
        })
        if (sbError) throw sbError
      }
      setView('forgot-sent')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al enviar el correo')
    } finally {
      setIsLoading(false)
    }
  }

  const goToForgot = () => {
    setResetEmail(email)
    setError('')
    setView('forgot')
  }

  return (
    <AnimatePresence mode="wait">
      {view === 'login' && (
        <motion.form
          key="login"
          onSubmit={handleLogin}
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -16 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="space-y-5"
        >
          <div className="space-y-1">
            <h2 className="text-xl font-semibold text-white">Bienvenido de regreso</h2>
            <p className="text-sm text-slate-400">Ingresa tus credenciales para continuar.</p>
          </div>

          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.15 }}
                className="overflow-hidden"
              >
                <div className="flex items-start gap-2.5 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                  <FiAlertCircle size={16} className="mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-slate-300">Email</label>
            <div className="relative">
              <FiMail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                className={INPUT_CLASS}
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-slate-300">Contraseña</label>
              <button
                type="button"
                onClick={goToForgot}
                className="text-xs font-medium text-[hsl(262,80%,60%)] transition-colors hover:text-[hsl(262,80%,72%)]"
              >
                ¿Olvidaste tu contraseña?
              </button>
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

          <button
            type="submit"
            disabled={isLoading}
            className="group flex w-full items-center justify-center gap-2.5 rounded-xl bg-gradient-to-r from-[hsl(262,80%,58%)] to-[hsl(262,80%,48%)] py-3.5 text-sm font-semibold text-white shadow-lg shadow-purple-900/30 transition-all hover:-translate-y-0.5 hover:shadow-purple-900/50 disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            ) : (
              <FiLogIn size={17} className="transition-transform group-hover:translate-x-0.5" />
            )}
            {isLoading ? 'Iniciando sesión...' : 'Iniciar sesión'}
          </button>
        </motion.form>
      )}

      {view === 'forgot' && (
        <motion.form
          key="forgot"
          onSubmit={handleForgot}
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -16 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="space-y-5"
        >
          <button
            type="button"
            onClick={() => { setView('login'); setError('') }}
            className="flex items-center gap-1.5 text-sm text-slate-400 transition-colors hover:text-white"
          >
            <ArrowLeft size={14} /> Volver
          </button>

          <div className="space-y-1">
            <h2 className="text-xl font-semibold text-white">Recuperar contraseña</h2>
            <p className="text-sm text-slate-400">Te enviaremos un enlace para restablecer tu contraseña.</p>
          </div>

          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.15 }}
                className="overflow-hidden"
              >
                <div className="flex items-start gap-2.5 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                  <FiAlertCircle size={16} className="mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-slate-300">Email de tu cuenta</label>
            <div className="relative">
              <FiMail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
              <input
                type="email"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                placeholder="tu@email.com"
                className={INPUT_CLASS}
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[hsl(262,80%,60%)] py-3 text-sm font-semibold text-white shadow-lg shadow-purple-900/20 transition-all hover:-translate-y-0.5 hover:bg-[hsl(262,80%,65%)] disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            ) : (
              <Send size={15} />
            )}
            {isLoading ? 'Enviando...' : 'Enviar enlace de recuperación'}
          </button>
        </motion.form>
      )}

      {view === 'forgot-sent' && (
        <motion.div
          key="forgot-sent"
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="space-y-5 py-4 text-center"
        >
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15 ring-1 ring-emerald-500/30">
            <CheckCircle size={30} className="text-emerald-400" />
          </div>
          <div className="space-y-1.5">
            <h2 className="text-xl font-semibold text-white">Correo enviado</h2>
            <p className="text-sm text-slate-400">
              Si{' '}
              <span className="font-medium text-slate-200">{resetEmail}</span>{' '}
              tiene una cuenta, recibirás el enlace en los próximos minutos.
            </p>
            <p className="text-xs text-slate-500">Revisa también tu carpeta de spam.</p>
          </div>
          <button
            type="button"
            onClick={() => { setView('login'); setError('') }}
            className="mx-auto flex items-center gap-1.5 text-sm font-medium text-[hsl(262,80%,60%)] transition-colors hover:text-[hsl(262,80%,72%)]"
          >
            <ArrowLeft size={14} /> Volver al inicio de sesión
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
