'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FiArrowRight } from 'react-icons/fi'
import LoginForm from '../../src/components/LoginForm'
import SignUpForm from '../../src/components/SignUpForm'
import { useAuth } from '../../src/context/AuthContext'

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58Z" fill="#EA4335"/>
    </svg>
  )
}

function AppleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 814 1000" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76 0-103.7 40.8-165.9 40.8s-105-57.8-155.5-127.4C46 411.8 0 302.5 0 198.3 0 87.1 55.2 31.1 126.6 31.1c62.1 0 107.3 41.7 166.8 41.7 57.5 0 93.2-43 166.8-43 48.9 0 115.3 36.1 154.6 98.3 8.6-3.2 50.5-22.2 50.5-22.2 1.9-.6 31.9-11.6 31.9 21.1 0 0 2.5 44.5-17.5 67.6zM507 96.3c25.7-33.5 44.4-78.6 44.4-123.7 0-6.4-.6-12.8-1.3-18.5-42.2 1.3-93.5 28.5-124.3 65.6-24.4 28.5-47.1 73.7-47.1 119.5 0 6.9.6 13.8 1.3 15.9 2.5.3 6.5.9 10.4.9 38.7 0 87.3-25 116.6-59.7z"/>
    </svg>
  )
}

export default function AuthPage() {
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [oauthLoading, setOauthLoading] = useState<'google' | 'apple' | null>(null)
  const [oauthError, setOauthError] = useState('')
  const { loginWithGoogle, loginWithApple } = useAuth()

  const handleGoogle = async () => {
    setOauthError('')
    setOauthLoading('google')
    try {
      await loginWithGoogle()
    } catch {
      setOauthError('No se pudo conectar con Google. Intenta de nuevo.')
      setOauthLoading(null)
    }
  }

  const handleApple = async () => {
    setOauthError('')
    setOauthLoading('apple')
    try {
      await loginWithApple()
    } catch {
      setOauthError('No se pudo conectar con Apple. Intenta de nuevo.')
      setOauthLoading(null)
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(124,58,237,0.18),_transparent_30%),_radial-gradient(circle_at_bottom_right,_rgba(245,158,11,0.14),_transparent_25%),_hsl(222,47%,6%)] p-4">
      <div className="pointer-events-none absolute inset-0 opacity-50">
        <div className="absolute left-1/2 top-0 h-96 w-96 -translate-x-1/2 rounded-full bg-white/5 blur-3xl" />
        <div className="absolute right-0 top-1/3 h-64 w-64 rounded-full bg-[hsl(262,80%,60%)]/10 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-72 w-72 rounded-full bg-[hsl(38,95%,55%)]/10 blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-6xl">
        <div className="grid items-stretch gap-8 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="hidden flex-col justify-between rounded-[2rem] border border-white/10 bg-[rgba(15,23,42,0.88)] p-10 text-white shadow-2xl backdrop-blur-xl lg:flex">
            <div className="space-y-6">
              <div className="inline-flex h-16 w-16 items-center justify-center rounded-3xl bg-white/10 text-[hsl(262,80%,60%)] shadow-lg">
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

            <div className="space-y-4">
              <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
                <p className="text-sm text-slate-300">• Descubre lugares en Santiago con recomendaciones personalizadas.</p>
              </div>
              <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
                <p className="text-sm text-slate-300">• Regístrate como usuario o locatario y gestiona eventos desde el panel.</p>
              </div>
              <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
                <p className="text-sm text-slate-300">• Accede rápido con cuentas demo para probar la app.</p>
              </div>
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-[rgba(15,23,42,0.92)] p-6 shadow-2xl backdrop-blur-xl">
            <div className="flex flex-col gap-6">
              <div className="text-center lg:text-left">
                <p className="mb-3 text-sm font-semibold uppercase tracking-[0.35em] text-[hsl(262,80%,60%)]">Accede a eMeet</p>
                <h2 className="text-3xl font-semibold text-white">Inicia sesión o crea tu cuenta</h2>
                <p className="mt-3 text-slate-400">Usa tu cuenta demo para explorar eventos, salas y paneles según tu rol.</p>
              </div>

              {/* Tab selector horizontal */}
              <div className="grid grid-cols-2 gap-2 rounded-3xl bg-white/5 p-2">
                <button
                  onClick={() => setMode('login')}
                  className={`rounded-2xl py-3 text-sm font-semibold transition-all ${
                    mode === 'login' ? 'bg-[hsl(262,80%,60%)] text-white shadow-lg' : 'text-slate-300 hover:text-white'
                  }`}
                >
                  Inicia Sesión
                </button>
                <button
                  onClick={() => setMode('signup')}
                  className={`rounded-2xl py-3 text-sm font-semibold transition-all ${
                    mode === 'signup' ? 'bg-[hsl(262,80%,60%)] text-white shadow-lg' : 'text-slate-300 hover:text-white'
                  }`}
                >
                  Registrarse
                </button>
              </div>
            </div>

            <div className="mt-8 rounded-[1.5rem] bg-[rgba(255,255,255,0.04)] p-8 shadow-inner shadow-white/5">
              <AnimatePresence mode="wait">
                <motion.div
                  key={mode}
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -24 }}
                  transition={{ duration: 0.28, ease: 'easeOut' }}
                >
                  {mode === 'login' ? <LoginForm /> : <SignUpForm />}
                </motion.div>
              </AnimatePresence>

              <div className="my-6 flex items-center gap-4">
                <div className="h-px flex-1 bg-white/10" />
                <span className="text-xs text-slate-400">o continúa con</span>
                <div className="h-px flex-1 bg-white/10" />
              </div>

              {oauthError && (
                <p className="mb-3 text-center text-sm text-red-400">{oauthError}</p>
              )}

              <div className="space-y-3">
                <button
                  onClick={handleGoogle}
                  disabled={oauthLoading !== null}
                  className="flex w-full items-center justify-center gap-3 rounded-xl border border-white/10 bg-white/5 py-3 font-medium text-white transition-all hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {oauthLoading === 'google' ? (
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  ) : (
                    <GoogleIcon />
                  )}
                  Continuar con Google
                </button>
                <button
                  onClick={handleApple}
                  disabled={oauthLoading !== null}
                  className="flex w-full items-center justify-center gap-3 rounded-xl border border-white/10 bg-white/5 py-3 font-medium text-white transition-all hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {oauthLoading === 'apple' ? (
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  ) : (
                    <AppleIcon />
                  )}
                  Continuar con Apple
                </button>
              </div>

              <p className="mt-6 text-center text-sm text-slate-400">
                {mode === 'login' ? '¿No tienes cuenta?' : '¿Ya tienes cuenta?'}{' '}
                <button
                  onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
                  className="inline-flex items-center gap-1 font-medium text-[hsl(262,80%,60%)] hover:text-[hsl(262,80%,60%)]/80"
                >
                  {mode === 'login' ? 'Regístrate' : 'Inicia sesión'} <FiArrowRight size={14} />
                </button>
              </p>
            </div>
          </div>
        </div>

        <div className="mt-8 text-center text-xs text-slate-400">
          <p>Disponible en Santiago, Chile</p>
        </div>
      </div>
    </div>
  )
}
