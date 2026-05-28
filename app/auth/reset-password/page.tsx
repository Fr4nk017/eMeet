'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  FiLock, FiEye, FiEyeOff, FiCheck, FiX,
  FiArrowLeft, FiAlertCircle, FiCheckCircle, FiShield,
} from 'react-icons/fi'

const BACKEND_URL = (process.env.NEXT_PUBLIC_BACKEND_URL ?? '').trim().replace(/\/$/, '')

function getPasswordStrength(password: string): { score: number; label: string; color: string } {
  if (!password) return { score: 0, label: '', color: '' }
  let score = 0
  if (password.length >= 8) score++
  if (/[A-Z]/.test(password)) score++
  if (/[0-9]/.test(password)) score++
  if (/[^A-Za-z0-9]/.test(password)) score++
  const levels = [
    { score: 0, label: '', color: '' },
    { score: 1, label: 'Muy débil', color: 'bg-red-500' },
    { score: 2, label: 'Débil', color: 'bg-orange-400' },
    { score: 3, label: 'Buena', color: 'bg-yellow-400' },
    { score: 4, label: 'Fuerte', color: 'bg-green-500' },
  ]
  return levels[score]
}

type PageState = 'checking' | 'invalid' | 'ready' | 'loading' | 'success'

const inputBase =
  'w-full bg-[hsl(222,30%,16%)] border border-white/10 hover:border-[hsl(262,80%,60%)]/30 focus:border-[hsl(262,80%,60%)] outline-none py-3 rounded-xl text-white placeholder-slate-500 transition-colors'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [token, setToken] = useState('')
  const [pageState, setPageState] = useState<PageState>('checking')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    // Supabase includes tokens in the URL hash fragment after redirect
    const hash = window.location.hash.slice(1)
    const params = new URLSearchParams(hash)
    const accessToken = params.get('access_token')
    const type = params.get('type')

    if (!accessToken || type !== 'recovery') {
      setPageState('invalid')
      return
    }

    setToken(accessToken)
    setPageState('ready')
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.')
      return
    }

    setPageState('loading')

    try {
      const res = await fetch(`${BACKEND_URL}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword: password }),
      })

      const body = await res.json().catch(() => null) as { error?: string } | null

      if (!res.ok) {
        throw new Error(body?.error ?? 'Error al actualizar la contraseña.')
      }

      setPageState('success')
      setTimeout(() => router.push('/auth'), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al actualizar la contraseña.')
      setPageState('ready')
    }
  }

  const strength = getPasswordStrength(password)
  const passwordsMatch = confirmPassword.length > 0 && password === confirmPassword
  const passwordsMismatch = confirmPassword.length > 0 && password !== confirmPassword

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(124,58,237,0.18),_transparent_30%),_radial-gradient(circle_at_bottom_right,_rgba(245,158,11,0.14),_transparent_25%),_hsl(222,47%,6%)] p-4">
      <div className="pointer-events-none absolute inset-0 opacity-50">
        <div className="absolute left-1/2 top-0 h-96 w-96 -translate-x-1/2 rounded-full bg-white/5 blur-3xl" />
        <div className="absolute right-0 top-1/3 h-64 w-64 rounded-full bg-[hsl(262,80%,60%)]/10 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-72 w-72 rounded-full bg-[hsl(38,95%,55%)]/10 blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 32 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="relative z-10 w-full max-w-md"
      >
        <div className="rounded-[2rem] border border-white/10 bg-[rgba(15,23,42,0.92)] p-8 shadow-2xl backdrop-blur-xl">

          {pageState === 'checking' && <CheckingState />}
          {pageState === 'invalid' && <InvalidLinkState onBack={() => router.push('/auth')} />}
          {pageState === 'success' && <SuccessState />}
          {(pageState === 'ready' || pageState === 'loading') && (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => router.push('/auth')}
                  className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-400 transition-all hover:bg-white/10 hover:text-white"
                >
                  <FiArrowLeft size={18} />
                </button>

                <motion.div
                  initial={{ scale: 0.7, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
                  className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-[hsl(262,80%,60%)]/15 border border-[hsl(262,80%,60%)]/20"
                >
                  <FiShield size={22} className="text-[hsl(262,80%,60%)]" />
                </motion.div>

                <div>
                  <h1 className="text-xl font-semibold text-white">Nueva contraseña</h1>
                  <p className="text-sm text-slate-400">Elige una contraseña segura.</p>
                </div>
              </div>

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-300 text-sm"
                >
                  <FiAlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                  {error}
                </motion.div>
              )}

              {/* Nueva contraseña */}
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Nueva contraseña
                </label>
                <div className="relative">
                  <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    minLength={8}
                    className={`${inputBase} pl-10 pr-12`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[hsl(262,80%,60%)] transition-colors"
                  >
                    {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                  </button>
                </div>

                {password && (
                  <div className="mt-2 space-y-1">
                    <div className="flex gap-1">
                      {[1, 2, 3, 4].map((i) => (
                        <div
                          key={i}
                          className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                            i <= strength.score ? strength.color : 'bg-white/10'
                          }`}
                        />
                      ))}
                    </div>
                    {strength.label && (
                      <p className={`text-xs ${
                        strength.score <= 1 ? 'text-red-400' :
                        strength.score === 2 ? 'text-orange-400' :
                        strength.score === 3 ? 'text-yellow-400' : 'text-green-400'
                      }`}>{strength.label}</p>
                    )}
                  </div>
                )}

                <div className="mt-2 space-y-1">
                  <PasswordRule ok={password.length >= 8} text="Al menos 8 caracteres" />
                  <PasswordRule ok={/[A-Z]/.test(password)} text="Una letra mayúscula" />
                  <PasswordRule ok={/[a-z]/.test(password)} text="Una letra minúscula" />
                  <PasswordRule ok={/[0-9]/.test(password)} text="Un número" />
                </div>
              </div>

              {/* Confirmar contraseña */}
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Confirmar contraseña
                </label>
                <div className="relative">
                  <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className={`${inputBase} pl-10 pr-20 ${
                      passwordsMismatch ? 'border-red-500/60' :
                      passwordsMatch ? 'border-green-500/60' : ''
                    }`}
                  />
                  <div className="absolute right-10 top-1/2 -translate-y-1/2">
                    {passwordsMatch && <FiCheck size={16} className="text-green-400" />}
                    {passwordsMismatch && <FiX size={16} className="text-red-400" />}
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[hsl(262,80%,60%)] transition-colors"
                  >
                    {showConfirm ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                  </button>
                </div>
                {passwordsMismatch && (
                  <p className="mt-1 text-xs text-red-400">Las contraseñas no coinciden.</p>
                )}
              </div>

              <button
                type="submit"
                disabled={pageState === 'loading' || !passwordsMatch || strength.score < 3}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-[hsl(262,80%,60%)] py-3 font-semibold text-white transition-all hover:bg-[hsl(262,80%,60%)]/90 hover:-translate-y-px hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50"
              >
                {pageState === 'loading' ? (
                  <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                ) : (
                  <FiShield size={18} />
                )}
                {pageState === 'loading' ? 'Actualizando...' : 'Actualizar contraseña'}
              </button>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  )
}

function PasswordRule({ ok, text }: { ok: boolean; text: string }) {
  return (
    <div className={`flex items-center gap-2 text-xs transition-colors ${ok ? 'text-green-400' : 'text-slate-500'}`}>
      {ok ? <FiCheck size={12} /> : <FiX size={12} />}
      {text}
    </div>
  )
}

function CheckingState() {
  return (
    <div className="flex flex-col items-center gap-4 py-8">
      <span className="h-10 w-10 animate-spin rounded-full border-2 border-white/10 border-t-[hsl(262,80%,60%)]" />
      <p className="text-slate-400 text-sm">Verificando enlace...</p>
    </div>
  )
}

function InvalidLinkState({ onBack }: { onBack: () => void }) {
  return (
    <div className="space-y-6 text-center">
      <motion.div
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 180 }}
        className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-red-500/15 border border-red-500/20"
      >
        <FiAlertCircle size={36} className="text-red-400" />
      </motion.div>

      <div>
        <h1 className="text-2xl font-semibold text-white mb-2">Enlace inválido</h1>
        <p className="text-slate-400 text-sm">
          Este enlace de recuperación no es válido o ya expiró.
        </p>
      </div>

      <div className="rounded-2xl border border-white/8 bg-white/5 p-4 text-left space-y-1">
        <p className="text-xs text-slate-400">Los posibles motivos son:</p>
        <p className="text-xs text-slate-500">• El enlace ya fue utilizado anteriormente.</p>
        <p className="text-xs text-slate-500">• El enlace expiró (válido por 1 hora).</p>
        <p className="text-xs text-slate-500">• La URL fue copiada incorrectamente.</p>
      </div>

      <button
        onClick={onBack}
        className="w-full flex items-center justify-center gap-2 rounded-xl bg-[hsl(262,80%,60%)] py-3 font-semibold text-white transition-all hover:bg-[hsl(262,80%,60%)]/90"
      >
        <FiArrowLeft size={16} />
        Solicitar nuevo enlace
      </button>
    </div>
  )
}

function SuccessState() {
  return (
    <div className="space-y-6 text-center">
      <motion.div
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 180, delay: 0.1 }}
        className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-green-500/15 border border-green-500/20"
      >
        <FiCheckCircle size={36} className="text-green-400" />
      </motion.div>

      <div>
        <h1 className="text-2xl font-semibold text-white mb-2">¡Contraseña actualizada!</h1>
        <p className="text-slate-400 text-sm">
          Tu contraseña fue actualizada correctamente.
        </p>
        <p className="text-slate-500 text-xs mt-2">
          Redirigiendo al inicio de sesión en unos segundos...
        </p>
      </div>

      <div className="h-1 w-full overflow-hidden rounded-full bg-white/10">
        <motion.div
          initial={{ width: '0%' }}
          animate={{ width: '100%' }}
          transition={{ duration: 3, ease: 'linear' }}
          className="h-full rounded-full bg-green-500"
        />
      </div>
    </div>
  )
}
