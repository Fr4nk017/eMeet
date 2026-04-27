'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight as FiArrowRight, CircleAlert as FiAlertCircle } from 'lucide-react'
import LoginForm from '../../src/components/LoginForm'
import SignUpForm from '../../src/components/SignUpForm'
import { useAuth } from '../../src/context/AuthContext'

function GoogleIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" aria-hidden>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  )
}

function FacebookIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" aria-hidden>
      <path fill="#1877F2" d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  )
}

export default function AuthPage() {
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [oauthLoading, setOauthLoading] = useState<'google' | 'facebook' | null>(null)
  const [oauthError, setOauthError] = useState('')
  const { loginWithOAuth } = useAuth()

  const handleOAuth = async (provider: 'google' | 'facebook') => {
    setOauthError('')
    setOauthLoading(provider)
    try {
      await loginWithOAuth(provider)
    } catch (err) {
      setOauthError(err instanceof Error ? err.message : 'Error al iniciar sesión')
      setOauthLoading(null)
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(124,58,237,0.18),_transparent_30%),_radial-gradient(circle_at_bottom_right,_rgba(245,158,11,0.14),_transparent_25%),_hsl(222,47%,6%)] p-4">
      {/* Fondo decorativo */}
      <div className="pointer-events-none absolute inset-0 opacity-50">
        <div className="absolute left-1/2 top-0 h-96 w-96 -translate-x-1/2 rounded-full bg-white/5 blur-3xl" />
        <div className="absolute right-0 top-1/3 h-64 w-64 rounded-full bg-[hsl(262,80%,60%)]/10 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-72 w-72 rounded-full bg-[hsl(38,95%,55%)]/10 blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-6xl">
        <div className="grid items-stretch gap-8 lg:grid-cols-[1.05fr_0.95fr]">

          {/* Panel izquierdo - solo desktop */}
          <div className="hidden flex-col justify-between rounded-[2rem] border border-white/10 bg-[rgba(15,23,42,0.88)] p-10 text-white shadow-2xl backdrop-blur-xl lg:flex">
            <div className="space-y-6">
              <div className="inline-flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-[hsl(262,80%,60%)] to-[hsl(262,80%,45%)] shadow-lg shadow-purple-900/40">
                <span className="text-2xl">🎉</span>
              </div>
              <div>
                <p className="mb-3 text-xs font-semibold uppercase tracking-[0.35em] text-[hsl(262,80%,60%)]">eMeet</p>
                <h1 className="text-4xl font-semibold leading-tight">Tu acceso a eventos, bares y experiencias únicas.</h1>
              </div>
            </div>

            <div className="my-4 flex flex-grow items-center justify-center">
              <img
                src="/auth-map-illustration.svg"
                alt="Ilustración de mapa de eventos"
                className="h-auto w-full max-w-sm object-contain opacity-70"
              />
            </div>

            <div className="space-y-3">
              {[
                'Descubre lugares en Santiago con recomendaciones personalizadas.',
                'Regístrate como usuario o locatario y gestiona eventos desde el panel.',
                'Accede rápido con cuentas demo para probar la app.',
              ].map((text) => (
                <div key={text} className="flex items-start gap-3 rounded-2xl border border-white/8 bg-white/4 p-4">
                  <span className="mt-0.5 text-[hsl(262,80%,60%)]">✦</span>
                  <p className="text-sm text-slate-300">{text}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Panel derecho - formulario */}
          <div className="rounded-[2rem] border border-white/10 bg-[rgba(15,23,42,0.92)] p-6 shadow-2xl backdrop-blur-xl">
            <div className="flex flex-col gap-5">
              <div className="text-center lg:text-left">
                <p className="mb-2 text-sm font-semibold uppercase tracking-[0.35em] text-[hsl(262,80%,60%)]">Accede a eMeet</p>
                <h2 className="text-3xl font-semibold text-white">Inicia sesión o crea tu cuenta</h2>
                <p className="mt-2 text-sm text-slate-400">Usa tu cuenta demo o conéctate con Google o Facebook.</p>
              </div>

              {/* Tabs login/signup */}
              <div className="flex gap-1 rounded-2xl bg-white/5 p-1.5">
                {(['login', 'signup'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setMode(tab)}
                    className={`flex-1 rounded-xl py-2.5 text-sm font-semibold transition-all ${
                      mode === tab
                        ? 'bg-[hsl(262,80%,60%)] text-white shadow-lg shadow-purple-900/30'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {tab === 'login' ? 'Inicia Sesión' : 'Registrarse'}
                  </button>
                ))}
              </div>

              {/* OAuth buttons */}
              <div className="space-y-2.5">
                <button
                  onClick={() => handleOAuth('google')}
                  disabled={oauthLoading !== null}
                  className="group relative flex w-full items-center justify-center gap-3 overflow-hidden rounded-xl border border-white/12 bg-white/6 py-3 font-medium text-white transition-all hover:border-white/25 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {oauthLoading === 'google' ? (
                    <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  ) : (
                    <GoogleIcon />
                  )}
                  <span className="text-sm">Continuar con Google</span>
                </button>

                <button
                  onClick={() => handleOAuth('facebook')}
                  disabled={oauthLoading !== null}
                  className="group flex w-full items-center justify-center gap-3 rounded-xl border border-[#1877F2]/30 bg-[#1877F2]/8 py-3 font-medium text-white transition-all hover:border-[#1877F2]/50 hover:bg-[#1877F2]/15 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {oauthLoading === 'facebook' ? (
                    <span className="h-5 w-5 animate-spin rounded-full border-2 border-[#1877F2]/40 border-t-[#1877F2]" />
                  ) : (
                    <FacebookIcon />
                  )}
                  <span className="text-sm">Continuar con Facebook</span>
                </button>

                {oauthError && (
                  <div className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                    <FiAlertCircle size={16} className="shrink-0" />
                    {oauthError}
                  </div>
                )}
              </div>

              {/* Divisor */}
              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-white/10" />
                <span className="text-xs font-medium text-slate-500">o continúa con email</span>
                <div className="h-px flex-1 bg-white/10" />
              </div>
            </div>

            {/* Formulario */}
            <div className="mt-1 rounded-[1.5rem] bg-[rgba(255,255,255,0.03)] p-6 shadow-inner shadow-white/5">
              <AnimatePresence mode="wait">
                <motion.div
                  key={mode}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.25, ease: 'easeOut' }}
                >
                  {mode === 'login' ? <LoginForm /> : <SignUpForm />}
                </motion.div>
              </AnimatePresence>

              <p className="mt-6 text-center text-sm text-slate-400">
                {mode === 'login' ? '¿No tienes cuenta?' : '¿Ya tienes cuenta?'}{' '}
                <button
                  onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
                  className="inline-flex items-center gap-1 font-semibold text-[hsl(262,80%,60%)] transition-colors hover:text-[hsl(262,80%,70%)]"
                >
                  {mode === 'login' ? 'Regístrate' : 'Inicia sesión'} <FiArrowRight size={14} />
                </button>
              </p>
            </div>
          </div>
        </div>

        <div className="mt-8 text-center text-xs text-slate-500">
          <p>Disponible en Santiago, Chile &nbsp;·&nbsp; Versión demo</p>
        </div>
      </div>
    </div>
  )
}
