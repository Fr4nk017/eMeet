'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Mail, ArrowLeft, RefreshCw, CheckCircle, LogIn } from 'lucide-react'
import { getSupabaseBrowserClient } from '../../../src/lib/supabase'

const RESEND_COOLDOWN = 60

const STEPS = [
  { label: 'Abre el correo de eMeet' },
  { label: 'Haz clic en «Confirmar mi cuenta»' },
  { label: 'Serás redirigido automáticamente' },
]

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
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(124,58,237,0.22),_transparent_35%),_radial-gradient(circle_at_bottom_right,_rgba(245,158,11,0.14),_transparent_30%),_hsl(222,47%,6%)] p-4">
      {/* Blobs decorativos */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-0 h-[480px] w-[480px] -translate-x-1/2 rounded-full bg-white/[0.03] blur-3xl" />
        <div className="absolute right-0 top-1/3 h-72 w-72 rounded-full bg-[hsl(262,80%,60%)]/10 blur-3xl" />
        <div className="absolute -left-16 bottom-1/4 h-64 w-64 rounded-full bg-amber-500/6 blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 28 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="relative z-10 w-full max-w-[420px]"
      >
        {/* Marca */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="mb-6 flex items-center justify-center gap-2"
        >
          <span className="text-xl font-bold tracking-tight text-white">eMeet</span>
        </motion.div>

        <div className="rounded-[2rem] border border-white/10 bg-[rgba(13,20,38,0.94)] p-8 shadow-2xl backdrop-blur-xl">

          {/* Ícono animado con ripple */}
          <div className="relative mx-auto mb-7 flex h-[76px] w-[76px] items-center justify-center">
            <span className="absolute inset-0 animate-ping rounded-3xl bg-[hsl(262,80%,60%)]/15" style={{ animationDuration: '2.2s' }} />
            <motion.div
              initial={{ scale: 0.65, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.12, type: 'spring', stiffness: 220, damping: 18 }}
              className="relative flex h-[76px] w-[76px] items-center justify-center rounded-3xl bg-[hsl(262,80%,60%)]/15 border border-[hsl(262,80%,60%)]/25 shadow-lg shadow-[hsl(262,80%,60%)]/10"
            >
              <Mail size={34} className="text-[hsl(262,80%,70%)]" />
            </motion.div>
          </div>

          <h1 className="mb-2 text-center text-2xl font-bold text-white">Revisa tu correo</h1>
          <p className="mb-4 text-center text-sm text-slate-400">
            Enviamos un enlace de confirmación a:
          </p>

          {/* Email badge */}
          <div className="mb-7 flex justify-center">
            <span className="inline-block max-w-full break-all rounded-full border border-[hsl(262,80%,60%)]/30 bg-[hsl(262,80%,60%)]/10 px-4 py-1.5 text-sm font-medium text-[hsl(262,80%,80%)]">
              {email || 'tu dirección de email'}
            </span>
          </div>

          {/* Pasos visuales */}
          <div className="mb-6 space-y-3">
            {STEPS.map(({ label }, i) => (
              <motion.div
                key={label}
                initial={{ opacity: 0, x: -14 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.18 + i * 0.09 }}
                className="flex items-center gap-3"
              >
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[hsl(262,80%,60%)]/25 bg-[hsl(262,80%,60%)]/10 text-xs font-bold text-[hsl(262,80%,75%)]">
                  {i + 1}
                </div>
                <p className="text-sm text-slate-300">{label}</p>
              </motion.div>
            ))}
          </div>

          {/* Spam hint */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.45 }}
            className="mb-6 flex items-start gap-2.5 rounded-xl border border-amber-400/20 bg-amber-400/5 px-3.5 py-2.5"
          >
            <span className="mt-px text-sm">📬</span>
            <p className="text-xs leading-5 text-amber-200/75">
              ¿No ves el correo? Revisa tu carpeta de <strong className="text-amber-200/90">spam</strong> o correo no deseado.
            </p>
          </motion.div>

          {/* Estado del reenvío */}
          <AnimatePresence mode="wait">
            {resendStatus === 'sent' && (
              <motion.div
                key="sent"
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mb-4 flex items-center justify-center gap-2 text-sm text-green-400"
              >
                <CheckCircle size={15} />
                Correo reenviado correctamente
              </motion.div>
            )}
            {resendStatus === 'error' && (
              <motion.p
                key="error"
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mb-4 text-center text-sm text-red-400"
              >
                No se pudo reenviar el correo. Intenta de nuevo.
              </motion.p>
            )}
          </AnimatePresence>

          {/* Botón reenviar */}
          <button
            onClick={handleResend}
            disabled={!canResend || resendStatus === 'sending'}
            className="mb-3 w-full flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 py-3 text-sm font-medium text-white transition-all hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <RefreshCw
              size={15}
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
            className="w-full flex items-center justify-center gap-2 rounded-xl py-3 text-sm text-slate-400 transition-colors hover:text-white"
          >
            <ArrowLeft size={15} />
            Volver al inicio de sesión
          </button>
        </div>

        {/* Footer hint */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-5 flex items-center justify-center gap-1.5 text-center text-xs text-slate-500"
        >
          <LogIn size={12} />
          Ya confirmaste tu cuenta?{' '}
          <button
            onClick={() => router.push('/auth')}
            className="font-medium text-slate-400 underline-offset-2 hover:text-white hover:underline transition-colors"
          >
            Inicia sesión
          </button>
        </motion.p>
      </motion.div>
    </div>
  )
}
