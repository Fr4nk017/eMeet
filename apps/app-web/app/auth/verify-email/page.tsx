'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { FiMail, FiArrowLeft, FiRefreshCw, FiCheckCircle } from 'react-icons/fi'
import { getSupabaseBrowserClient } from '../../../src/lib/supabase'

const RESEND_COOLDOWN = 60

export default function VerifyEmailPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const email = searchParams.get('email') ?? ''

  const [countdown, setCountdown] = useState(RESEND_COOLDOWN)
  const [canResend, setCanResend] = useState(false)
  const [resendStatus, setResendStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')

  useEffect(() => {
    if (countdown <= 0) {
      setCanResend(true)
      return
    }
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000)
    return () => clearTimeout(timer)
  }, [countdown])

  const handleResend = useCallback(async () => {
    if (!email || !canResend) return
    setResendStatus('sending')
    try {
      const { error } = await getSupabaseBrowserClient().auth.resend({
        type: 'signup',
        email,
      })
      if (error) throw error
      setResendStatus('sent')
      setCanResend(false)
      setCountdown(RESEND_COOLDOWN)
    } catch {
      setResendStatus('error')
    }
  }, [email, canResend])

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(124,58,237,0.18),_transparent_30%),_radial-gradient(circle_at_bottom_right,_rgba(245,158,11,0.14),_transparent_25%),_hsl(222,47%,6%)] p-4">
      {/* Blobs decorativos */}
      <div className="pointer-events-none absolute inset-0 opacity-50">
        <div className="absolute left-1/2 top-0 h-96 w-96 -translate-x-1/2 rounded-full bg-white/5 blur-3xl" />
        <div className="absolute right-0 top-1/3 h-64 w-64 rounded-full bg-[hsl(262,80%,60%)]/10 blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 32 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="relative z-10 w-full max-w-md"
      >
        <div className="rounded-[2rem] border border-white/10 bg-[rgba(15,23,42,0.92)] p-8 shadow-2xl backdrop-blur-xl text-center">

          {/* Ícono animado */}
          <motion.div
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.15, type: 'spring', stiffness: 200 }}
            className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-[hsl(262,80%,60%)]/15 border border-[hsl(262,80%,60%)]/20"
          >
            <FiMail size={36} className="text-[hsl(262,80%,60%)]" />
          </motion.div>

          <h1 className="text-2xl font-semibold text-white mb-2">Revisa tu correo</h1>
          <p className="text-slate-400 text-sm mb-1">
            Enviamos un enlace de confirmación a:
          </p>
          <p className="text-white font-medium mb-6 break-all">
            {email || 'tu dirección de email'}
          </p>

          <div className="rounded-2xl bg-white/5 border border-white/8 p-4 mb-6 text-left space-y-2">
            <p className="text-xs text-slate-400 leading-relaxed">
              1. Abre el correo de <span className="text-white">eMeet</span>
            </p>
            <p className="text-xs text-slate-400 leading-relaxed">
              2. Haz clic en el botón <span className="text-white">&quot;Confirmar mi cuenta&quot;</span>
            </p>
            <p className="text-xs text-slate-400 leading-relaxed">
              3. Serás redirigido automáticamente para iniciar sesión
            </p>
          </div>

          {/* Estado del reenvío */}
          {resendStatus === 'sent' && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center justify-center gap-2 mb-4 text-green-400 text-sm"
            >
              <FiCheckCircle size={16} />
              Correo reenviado correctamente
            </motion.div>
          )}
          {resendStatus === 'error' && (
            <p className="mb-4 text-red-400 text-sm">
              No se pudo reenviar el correo. Intenta de nuevo.
            </p>
          )}

          {/* Botón reenviar */}
          <button
            onClick={handleResend}
            disabled={!canResend || resendStatus === 'sending'}
            className="w-full flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 py-3 text-sm font-medium text-white transition-all hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed mb-3"
          >
            <FiRefreshCw
              size={16}
              className={resendStatus === 'sending' ? 'animate-spin' : ''}
            />
            {resendStatus === 'sending'
              ? 'Enviando...'
              : canResend
              ? 'Reenviar correo'
              : `Reenviar en ${countdown}s`}
          </button>

          <button
            onClick={() => router.push('/auth')}
            className="w-full flex items-center justify-center gap-2 rounded-xl py-3 text-sm text-slate-400 hover:text-white transition-colors"
          >
            <FiArrowLeft size={16} />
            Volver al inicio de sesión
          </button>
        </div>

        <p className="mt-6 text-center text-xs text-slate-500">
          ¿No ves el correo? Revisa tu carpeta de spam.
        </p>
      </motion.div>
    </div>
  )
}
