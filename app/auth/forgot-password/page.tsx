'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { FiMail, FiArrowLeft, FiSend, FiCheckCircle, FiAlertCircle } from 'react-icons/fi'

const BACKEND_URL = (process.env.NEXT_PUBLIC_BACKEND_URL ?? '').trim().replace(/\/$/, '')

type Status = 'idle' | 'loading' | 'success'

export default function ForgotPasswordPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setStatus('loading')

    try {
      const res = await fetch(`${BACKEND_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      const body = await res.json().catch(() => null) as { error?: string } | null

      if (!res.ok) {
        throw new Error(body?.error ?? 'Error al procesar la solicitud.')
      }

      setStatus('success')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al enviar el correo.')
      setStatus('idle')
    }
  }

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

          {status === 'success' ? (
            <SuccessState email={email} onBack={() => router.push('/auth')} />
          ) : (
            <FormState
              email={email}
              onEmailChange={setEmail}
              onSubmit={handleSubmit}
              isLoading={status === 'loading'}
              error={error}
              onBack={() => router.push('/auth')}
            />
          )}
        </div>

        <p className="mt-6 text-center text-xs text-slate-500">
          ¿Recordaste tu contraseña?{' '}
          <button
            onClick={() => router.push('/auth')}
            className="text-[hsl(262,80%,60%)] hover:text-[hsl(262,80%,60%)]/80 transition-colors"
          >
            Volver al inicio de sesión
          </button>
        </p>
      </motion.div>
    </div>
  )
}

function FormState({
  email,
  onEmailChange,
  onSubmit,
  isLoading,
  error,
  onBack,
}: {
  email: string
  onEmailChange: (v: string) => void
  onSubmit: (e: React.FormEvent) => void
  isLoading: boolean
  error: string
  onBack: () => void
}) {
  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={onBack}
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
          <FiMail size={22} className="text-[hsl(262,80%,60%)]" />
        </motion.div>

        <div>
          <h1 className="text-xl font-semibold text-white">Recuperar contraseña</h1>
          <p className="text-sm text-slate-400">Te enviaremos un enlace de restablecimiento.</p>
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

      <div>
        <label className="block text-sm font-medium text-white mb-2">
          Correo electrónico
        </label>
        <div className="relative">
          <FiMail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="email"
            value={email}
            onChange={(e) => onEmailChange(e.target.value)}
            placeholder="tu@email.com"
            required
            className="w-full bg-[hsl(222,30%,16%)] border border-white/10 hover:border-[hsl(262,80%,60%)]/30 focus:border-[hsl(262,80%,60%)] outline-none py-3 pl-10 pr-4 rounded-xl text-white placeholder-slate-500 transition-colors"
          />
        </div>
        <p className="mt-2 text-xs text-slate-500">
          Recibirás un correo solo si esta dirección está registrada.
        </p>
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full flex items-center justify-center gap-2 rounded-xl bg-[hsl(262,80%,60%)] py-3 font-semibold text-white transition-all hover:bg-[hsl(262,80%,60%)]/90 hover:-translate-y-px hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isLoading ? (
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
        ) : (
          <FiSend size={18} />
        )}
        {isLoading ? 'Enviando...' : 'Enviar enlace de recuperación'}
      </button>
    </form>
  )
}

function SuccessState({ email, onBack }: { email: string; onBack: () => void }) {
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
        <h1 className="text-2xl font-semibold text-white mb-2">Revisa tu correo</h1>
        <p className="text-slate-400 text-sm mb-1">
          Si <span className="text-white font-medium">{email}</span> está registrado,
        </p>
        <p className="text-slate-400 text-sm">recibirás un enlace para restablecer tu contraseña.</p>
      </div>

      <div className="rounded-2xl border border-white/8 bg-white/5 p-4 text-left space-y-2">
        <p className="text-xs text-slate-400 leading-relaxed">
          1. Abre el correo de <span className="text-white">eMeet</span>
        </p>
        <p className="text-xs text-slate-400 leading-relaxed">
          2. Haz clic en <span className="text-white">&quot;Restablecer contraseña&quot;</span>
        </p>
        <p className="text-xs text-slate-400 leading-relaxed">
          3. Elige una nueva contraseña segura
        </p>
        <p className="text-xs text-slate-500 mt-1">
          ¿No ves el correo? Revisa tu carpeta de spam.
        </p>
      </div>

      <button
        onClick={onBack}
        className="w-full flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 py-3 text-sm text-slate-300 transition-all hover:bg-white/10 hover:text-white"
      >
        <FiArrowLeft size={16} />
        Volver al inicio de sesión
      </button>
    </div>
  )
}
